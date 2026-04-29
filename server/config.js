import 'dotenv/config'

const toNumber = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const parseCorsOrigins = (value) => {
  const raw = String(value || '').trim()

  if (!raw || raw === '*') {
    return '*'
  }

  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export const config = {
  port: toNumber(process.env.PORT, 3001),
  databaseUrl: process.env.DATABASE_URL || '',
  authSecret: process.env.CRM_AUTH_SECRET || 'spa-saloon-dev-secret',
  adminEmail: process.env.CRM_ADMIN_EMAIL || 'admin@spa.local',
  adminPassword: process.env.CRM_ADMIN_PASSWORD || 'ChangeMe123!',
  requireAuth: String(process.env.CRM_REQUIRE_AUTH || '').toLowerCase() === 'true',
  allowDegradedLogin: String(process.env.CRM_ALLOW_DEGRADED_LOGIN ?? 'true').toLowerCase() !== 'false',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
}
