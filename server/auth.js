import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto'
import { config } from './config.js'
import { findUserByEmail, upsertUser } from './db.js'

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7

const hashPassword = (password, salt = randomBytes(16).toString('hex')) => {
  const digest = pbkdf2Sync(String(password || ''), salt, 120000, 32, 'sha256').toString('hex')
  return `${salt}:${digest}`
}

const verifyPassword = (password, storedHash) => {
  const [salt, digest] = String(storedHash || '').split(':')
  if (!salt || !digest) return false

  const attempted = pbkdf2Sync(String(password || ''), salt, 120000, 32, 'sha256').toString('hex')
  const digestBuffer = Buffer.from(digest, 'hex')
  const attemptedBuffer = Buffer.from(attempted, 'hex')

  if (digestBuffer.length !== attemptedBuffer.length) return false

  return timingSafeEqual(digestBuffer, attemptedBuffer)
}

const signSession = (payload) => {
  const issuedAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString()
  const encodedPayload = Buffer.from(JSON.stringify({ ...payload, issuedAt, expiresAt })).toString('base64url')
  const signature = createHmac('sha256', config.authSecret).update(encodedPayload).digest('base64url')

  return `${encodedPayload}.${signature}`
}

const readBearerToken = (header) => {
  const raw = String(header || '').trim()
  if (!raw.toLowerCase().startsWith('bearer ')) return ''
  return raw.slice(7).trim()
}

const decodeSession = (token) => {
  const [encodedPayload, signature] = String(token || '').split('.')
  if (!encodedPayload || !signature) return null

  const expectedSignature = createHmac('sha256', config.authSecret).update(encodedPayload).digest('base64url')
  if (signature !== expectedSignature) return null

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))
    if (payload.expiresAt && Date.now() > Date.parse(payload.expiresAt)) return null
    return payload
  } catch {
    return null
  }
}

export const seedAdminAccount = async () => {
  await upsertUser({
    email: config.adminEmail,
    passwordHash: hashPassword(config.adminPassword),
    role: 'admin',
  })
}

export const loginWithCredentials = async ({ email, password }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const user = await findUserByEmail(normalizedEmail)

  if (!user || !verifyPassword(password, user.passwordHash)) {
    const error = new Error('Invalid CRM credentials.')
    error.statusCode = 401
    throw error
  }

  return {
    token: signSession({
      sub: user.email,
      email: user.email,
      role: user.role,
    }),
    user: {
      email: user.email,
      role: user.role,
    },
  }
}

export const verifyAuthToken = decodeSession

export const authMiddleware = (req, res, next) => {
  if (!config.requireAuth) {
    return next()
  }

  const token = readBearerToken(req.headers.authorization)
  const session = decodeSession(token)

  if (!session) {
    return res.status(401).json({ message: 'Missing or invalid CRM bearer token.' })
  }

  req.crmSession = session
  return next()
}
