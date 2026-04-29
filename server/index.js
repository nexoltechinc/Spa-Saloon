import { randomUUID } from 'node:crypto'
import cors from 'cors'
import express from 'express'
import { config } from './config.js'
import { authMiddleware, loginWithCredentials, loginWithDegradedFallback, seedAdminAccount } from './auth.js'
import {
  closeDatabase,
  createRecord,
  deleteRecord,
  ensureSchema,
  getRecord,
  getSettings,
  listRecords,
  saveSettings,
  updateRecord,
  RESOURCE_NAMES,
} from './db.js'

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next)
}

const app = express()

const runtime = {
  bootState: 'starting',
  bootMessage: 'CRM database is starting.',
  bootCode: 'CRM_DATABASE_STARTING',
  bootAttempts: 0,
  bootStartedAt: new Date().toISOString(),
  bootUpdatedAt: new Date().toISOString(),
  bootCompletedAt: null,
  lastError: null,
  shuttingDown: false,
}

let bootstrapTimer = null

const serializeBootError = (error) => ({
  message: error?.message || 'Unexpected CRM startup failure.',
  code: error?.code || null,
  statusCode: error?.statusCode || error?.status || null,
})

const classifyBootMessage = (error) => {
  if (!config.databaseUrl) {
    return 'DATABASE_URL is not configured. CRM login is unavailable until Postgres is set up.'
  }

  const message = String(error?.message || '')

  if (
    /administrative permissions/i.test(message) ||
    /must be started under an unprivileged user/i.test(message) ||
    /cannot run as a root user/i.test(message)
  ) {
    return 'Embedded Postgres cannot start from an elevated Windows shell. Open a standard user terminal or use Docker-backed Postgres.'
  }

  if (/ECONNREFUSED|EHOSTUNREACH|ENOTFOUND|timeout/i.test(message)) {
    return 'CRM Postgres is not reachable yet. The API will retry automatically.'
  }

  return 'CRM database startup failed. Check the server logs for details.'
}

const setRuntimeReady = () => {
  runtime.bootState = 'ready'
  runtime.bootMessage = 'CRM database connected.'
  runtime.bootCode = 'CRM_DATABASE_READY'
  runtime.bootUpdatedAt = new Date().toISOString()
  runtime.bootCompletedAt = runtime.bootCompletedAt || runtime.bootUpdatedAt
  runtime.lastError = null
}

const setRuntimeDegraded = (error) => {
  runtime.bootState = 'degraded'
  runtime.bootMessage = classifyBootMessage(error)
  runtime.bootCode = error?.code || 'CRM_DATABASE_UNAVAILABLE'
  runtime.bootUpdatedAt = new Date().toISOString()
  runtime.lastError = serializeBootError(error)
}

const scheduleBootstrapRetry = (delayMs = 10000) => {
  if (runtime.shuttingDown) {
    return
  }

  if (bootstrapTimer) {
    clearTimeout(bootstrapTimer)
  }

  bootstrapTimer = setTimeout(() => {
    void bootstrapDatabase()
  }, delayMs)
}

const bootstrapDatabase = async () => {
  if (runtime.shuttingDown) {
    return
  }

  runtime.bootAttempts += 1
  runtime.bootUpdatedAt = new Date().toISOString()

  try {
    await ensureSchema()
    await seedAdminAccount()
    setRuntimeReady()
    console.log('CRM database is ready.')
  } catch (error) {
    setRuntimeDegraded(error)
    console.error(error)
    scheduleBootstrapRetry(runtime.bootAttempts < 3 ? 3000 : 10000)
  }
}

const runtimeUnavailableResponse = (res, { statusCode = 503, code, message } = {}) => {
  return res.status(statusCode).json({
    code: code || runtime.bootCode,
    message: message || runtime.bootMessage,
    database: {
      state: runtime.bootState,
      attempts: runtime.bootAttempts,
      startedAt: runtime.bootStartedAt,
      updatedAt: runtime.bootUpdatedAt,
      completedAt: runtime.bootCompletedAt,
      lastError: runtime.lastError,
    },
  })
}

const normalizeBookingText = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback
  const text = String(value).trim()
  return text || fallback
}

const normalizeBookingDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

const sameBookingValue = (left, right) => normalizeBookingText(left).toLowerCase() === normalizeBookingText(right).toLowerCase()

const createBookingId = (prefix) => `${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`

const findExistingCustomerForBooking = async ({ customerId, customerName, customerEmail, phone }) => {
  const customers = await listRecords('customers')

  return customers.find((customer) => {
    if (customerId && sameBookingValue(customer.id, customerId)) return true

    const customerKeys = [
      customer.id,
      customer.customerId,
      customer.email,
      customer.customerEmail,
      customer.contactEmail,
      customer.phone,
      customer.contactPhone,
      customer.name,
      customer.fullName,
    ]

    if (customerEmail && customerKeys.slice(2, 5).some((value) => sameBookingValue(value, customerEmail))) return true
    if (phone && customerKeys.slice(5, 7).some((value) => sameBookingValue(value, phone))) return true
    if (customerName && customerKeys.slice(7).some((value) => sameBookingValue(value, customerName))) return true

    return false
  }) || null
}

const createPublicBooking = async (req, res) => {
  const body = req.body || {}
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ message: 'Request body must be a JSON object.' })
  }

  const customerName = normalizeBookingText(body.customerName ?? body.name ?? body.fullName)
  const customerEmail = normalizeBookingText(body.customerEmail ?? body.email)
  const phone = normalizeBookingText(body.phone ?? body.contactNumber)
  const serviceName = normalizeBookingText(body.serviceName ?? body.service ?? body.treatment)
  const staffName = normalizeBookingText(body.staffName ?? body.staff ?? body.therapist, 'Unassigned')
  const branchName = normalizeBookingText(body.branchName ?? body.branch)
  const appointmentAt = normalizeBookingDate(body.appointmentAt ?? body.dateTime ?? body.startAt)
  const customerId = normalizeBookingText(body.customerId)

  if (!customerName) {
    return res.status(400).json({ message: 'Customer name is required.' })
  }

  if (!serviceName) {
    return res.status(400).json({ message: 'Service name is required.' })
  }

  if (!appointmentAt) {
    return res.status(400).json({ message: 'Appointment date and time is required.' })
  }

  const durationMinutes = Math.max(15, Math.round(Number(body.durationMinutes ?? body.duration ?? 60) || 60))
  const amountDue = Math.max(0, Number(body.amountDue ?? body.totalDue ?? body.total ?? body.price ?? 0) || 0)
  const amountPaid = Math.max(0, Number(body.amountPaid ?? body.paidAmount ?? 0) || 0)
  const balanceRemaining = Math.max(amountDue - amountPaid, 0)
  const source = normalizeBookingText(body.source, 'Website Form')
  const bookingNoteText = normalizeBookingText(body.notes ?? body.message)
  const now = new Date().toISOString()
  const existingCustomer = await findExistingCustomerForBooking({ customerId, customerName, customerEmail, phone })
  const resolvedCustomerId = normalizeBookingText(existingCustomer?.id || customerId, createBookingId('CUS'))
  const appointmentPayload = {
    id: createBookingId('APT'),
    customerId: resolvedCustomerId,
    customerName,
    customerEmail,
    phone,
    serviceId: normalizeBookingText(body.serviceId ?? body.treatmentId),
    serviceName,
    staffId: normalizeBookingText(body.staffId),
    staffName,
    branchName,
    appointmentAt,
    durationMinutes,
    status: 'Confirmed',
    paymentStatus: balanceRemaining > 0 ? (amountPaid > 0 ? 'Partial' : 'Unpaid') : 'Paid',
    amountDue,
    amountPaid,
    balanceRemaining,
    source: 'Website',
    notes: normalizeBookingText(body.notes ?? body.message),
    checkInAt: '',
    completedAt: '',
    cancelledAt: '',
    metadata: {
      bookingSource: source,
      bookingChannel: 'Website',
    },
  }

  let createdAppointment = null

  try {
    createdAppointment = await createRecord('appointments', appointmentPayload)

    const appointmentSummary = {
      id: createdAppointment.id,
      dateTime: createdAppointment.appointmentAt,
      service: createdAppointment.serviceName,
      staff: createdAppointment.staffName,
      status: createdAppointment.status,
      branchName: createdAppointment.branchName,
    }

    const existingAppointmentHistory = Array.isArray(existingCustomer?.appointmentHistory) ? existingCustomer.appointmentHistory : []
    const existingTimeline = Array.isArray(existingCustomer?.activityTimeline) ? existingCustomer.activityTimeline : []
    const existingNotes = Array.isArray(existingCustomer?.notes) ? existingCustomer.notes : []
    const customerPayload = {
      id: resolvedCustomerId,
      fullName: customerName,
      name: customerName,
      email: customerEmail,
      phone,
      acquisitionSource: existingCustomer?.acquisitionSource || 'Website Form',
      source: existingCustomer?.source || 'Website Form',
      status: existingCustomer?.status || 'Active',
      segment: existingCustomer?.segment || 'New Customer',
      upcomingAppointment: appointmentSummary,
      appointmentHistory: [appointmentSummary, ...existingAppointmentHistory].slice(0, 20),
      activityTimeline: [
        {
          id: createBookingId('ACT'),
          type: 'Appointment Booked',
          at: now,
          actor: 'Website',
          channel: 'Website',
          outcome: 'Confirmed',
          summary: `Booked ${serviceName} for ${customerName}`,
        },
        ...existingTimeline,
      ].slice(0, 20),
      notes: bookingNoteText
        ? [
            {
              id: createBookingId('NOTE'),
              at: now,
              author: 'Website',
              text: bookingNoteText,
            },
            ...existingNotes,
          ].slice(0, 20)
        : existingNotes,
      lastVisit: existingCustomer?.lastVisit || '',
      visitCount: Number(existingCustomer?.visitCount ?? existingCustomer?.totalVisits ?? 0),
      totalSpend: Number(existingCustomer?.totalSpend ?? existingCustomer?.spend ?? 0),
      loyaltyPoints: Number(existingCustomer?.loyaltyPoints ?? 0),
      pendingBalance: Math.max(Number(existingCustomer?.pendingBalance ?? existingCustomer?.balance ?? 0), balanceRemaining),
      favoriteService: existingCustomer?.favoriteService || serviceName,
      favoriteStaff: existingCustomer?.favoriteStaff || staffName,
      preferredTimes: existingCustomer?.preferredTimes || 'Flexible',
      preferredChannel: existingCustomer?.preferredChannel || 'Website',
      sensitivities: existingCustomer?.sensitivities || 'None reported',
      membership: existingCustomer?.membership || 'None',
      preferences: Array.from(
        new Set([serviceName, ...(Array.isArray(existingCustomer?.preferences) ? existingCustomer.preferences : [])]),
      ).slice(0, 10),
      metadata: {
        ...(existingCustomer?.metadata || {}),
        bookedFromWebsite: true,
        bookingSource: source,
      },
    }

    const savedCustomer = existingCustomer
      ? await updateRecord('customers', existingCustomer.id, customerPayload)
      : await createRecord('customers', customerPayload)

    return res.status(201).json({
      customer: savedCustomer,
      appointment: createdAppointment,
    })
  } catch (error) {
    if (createdAppointment?.id) {
      await deleteRecord('appointments', createdAppointment.id).catch(() => {})
    }

    throw error
  }
}

const blockWhileBooting = (req, res, next) => {
  if (runtime.bootState === 'ready') {
    return next()
  }

  if (req.method === 'OPTIONS') {
    return next()
  }

  return runtimeUnavailableResponse(res, {
    statusCode: 503,
    code: runtime.bootCode === 'CRM_DATABASE_STARTING' ? 'CRM_AUTH_BOOTING' : runtime.bootCode,
  })
}

app.use(
  cors({
    origin: config.corsOrigins,
  }),
)
app.use(express.json({ limit: '1mb' }))

app.get(
  '/api/crm/health',
  asyncHandler(async (req, res) => {
    res.status(runtime.bootState === 'ready' ? 200 : 503).json({
      ok: runtime.bootState === 'ready',
      ready: runtime.bootState === 'ready',
      database: {
        state: runtime.bootState,
        message: runtime.bootMessage,
        attempts: runtime.bootAttempts,
        startedAt: runtime.bootStartedAt,
        updatedAt: runtime.bootUpdatedAt,
        completedAt: runtime.bootCompletedAt,
        lastError: runtime.lastError,
      },
      resources: RESOURCE_NAMES,
      timestamp: new Date().toISOString(),
    })
  }),
)

app.post(
  '/api/crm/auth/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {}

    if (runtime.bootState !== 'ready') {
      if (!config.allowDegradedLogin) {
        return runtimeUnavailableResponse(res, {
          statusCode: 503,
          code: runtime.bootCode === 'CRM_DATABASE_STARTING' ? 'CRM_AUTH_BOOTING' : 'CRM_AUTH_SERVICE_UNAVAILABLE',
        })
      }

      const session = loginWithDegradedFallback({ email, password })
      return res.json({
        ...session,
        warning: 'Signed in with degraded backend mode. Start Postgres to enable full CRM persistence.',
      })
    }

    const session = await loginWithCredentials({ email, password })
    res.json(session)
  }),
)

app.post('/api/bookings', asyncHandler(createPublicBooking))
app.post('/api/public/bookings', asyncHandler(createPublicBooking))

app.use('/api/crm', blockWhileBooting)
app.use('/api/crm', authMiddleware)

app.get(
  '/api/crm/settings',
  asyncHandler(async (req, res) => {
    const settings = await getSettings()
    res.json(settings)
  }),
)

app.put(
  '/api/crm/settings',
  asyncHandler(async (req, res) => {
    const settings = await saveSettings(req.body)
    res.json(settings)
  }),
)

app.patch(
  '/api/crm/settings',
  asyncHandler(async (req, res) => {
    const settings = await saveSettings(req.body)
    res.json(settings)
  }),
)

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
  const code = error.code || null

  if (statusCode >= 500) {
    console.error(error)
  }

  return res.status(statusCode).json({ message, code })
})

const start = async () => {
  try {
    const server = app.listen(config.port, () => {
      console.log(`CRM API listening on http://localhost:${config.port}`)
    })

    void bootstrapDatabase()

    const shutdown = async () => {
      runtime.shuttingDown = true
      if (bootstrapTimer) {
        clearTimeout(bootstrapTimer)
      }
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
