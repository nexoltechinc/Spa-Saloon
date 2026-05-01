import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto'

const PBKDF2_ITERATIONS = 120000
const PBKDF2_KEY_LENGTH = 32
const PBKDF2_DIGEST = 'sha256'

export const hashPassword = (password, salt = randomBytes(16).toString('hex')) => {
  const digest = pbkdf2Sync(String(password || ''), salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, PBKDF2_DIGEST).toString('hex')
  return `${salt}:${digest}`
}

export const verifyPassword = (password, storedHash) => {
  const [salt, digest] = String(storedHash || '').split(':')
  if (!salt || !digest) return false

  const attempted = pbkdf2Sync(String(password || ''), salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, PBKDF2_DIGEST).toString('hex')
  const digestBuffer = Buffer.from(digest, 'hex')
  const attemptedBuffer = Buffer.from(attempted, 'hex')

  if (digestBuffer.length !== attemptedBuffer.length) return false

  return timingSafeEqual(digestBuffer, attemptedBuffer)
}
