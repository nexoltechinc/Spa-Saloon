import cors from 'cors'
import express from 'express'
import { config } from './config.js'
import { authMiddleware, loginWithCredentials, seedAdminAccount } from './auth.js'
import {
  closeDatabase,
  createRecord,
  deleteRecord,
  ensureSchema,
  getRecord,
  listRecords,
  updateRecord,
  RESOURCE_NAMES,
} from './db.js'

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next)
}

const app = express()

app.use(
  cors({
    origin: config.corsOrigins,
  }),
)
app.use(express.json({ limit: '1mb' }))

app.get(
  '/api/crm/health',
  asyncHandler(async (req, res) => {
    res.json({
      ok: true,
      database: 'connected',
      resources: RESOURCE_NAMES,
      timestamp: new Date().toISOString(),
    })
  }),
)

app.post(
  '/api/crm/auth/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {}
    const session = await loginWithCredentials({ email, password })
    res.json(session)
  }),
)

app.use('/api/crm', authMiddleware)

app.get(
  '/api/crm/:resource',
  asyncHandler(async (req, res) => {
    const records = await listRecords(req.params.resource, req.query)
    res.json(records)
  }),
)

app.get(
  '/api/crm/:resource/:id',
  asyncHandler(async (req, res) => {
    const record = await getRecord(req.params.resource, req.params.id)
    if (!record) {
      return res.status(404).json({ message: `${req.params.resource} record not found.` })
    }

    return res.json(record)
  }),
)

app.post(
  '/api/crm/:resource',
  asyncHandler(async (req, res) => {
    const record = await createRecord(req.params.resource, req.body)
    res.status(201).json(record)
  }),
)

app.patch(
  '/api/crm/:resource/:id',
  asyncHandler(async (req, res) => {
    const record = await updateRecord(req.params.resource, req.params.id, req.body)
    res.json(record)
  }),
)

app.delete(
  '/api/crm/:resource/:id',
  asyncHandler(async (req, res) => {
    await deleteRecord(req.params.resource, req.params.id)
    res.status(204).end()
  }),
)

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' })
})

app.use((error, req, res, next) => {
  void next

  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ message: 'Invalid JSON body.' })
  }

  const statusCode = error.statusCode || error.status || 500
  const message = error.message || 'Unexpected CRM API error.'

  if (statusCode >= 500) {
    console.error(error)
  }

  return res.status(statusCode).json({ message })
})

const start = async () => {
  try {
    await ensureSchema()
    await seedAdminAccount()

    const server = app.listen(config.port, () => {
      console.log(`CRM API listening on http://localhost:${config.port}`)
    })

    const shutdown = async () => {
      server.close()
      await closeDatabase()
      process.exit(0)
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

await start()
