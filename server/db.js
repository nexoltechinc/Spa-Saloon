import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { config } from './config.js'

export const RESOURCE_NAMES = [
  'appointments',
  'branches',
  'customers',
  'leads',
  'payments',
  'receipts',
  'reports',
  'services',
  'staff',
]

export const WRITABLE_RESOURCES = new Set(RESOURCE_NAMES.filter((resource) => resource !== 'reports'))

const pool = new Pool({
  connectionString: config.databaseUrl,
})

const ensureDatabaseUrl = () => {
  if (!config.databaseUrl) {
    const error = new Error('DATABASE_URL is required to start the CRM API.')
    error.statusCode = 500
    throw error
  }
}

const normalizeResource = (resource) => {
  const value = String(resource || '').trim().toLowerCase()

  if (!/^[a-z][a-z0-9_-]*$/.test(value) || !RESOURCE_NAMES.includes(value)) {
    const error = new Error(`Unknown CRM resource: ${resource}`)
    error.statusCode = 404
    throw error
  }

  return value
}

const ensureObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    const error = new Error('Request body must be a JSON object.')
    error.statusCode = 400
    throw error
  }

  return value
}

const stripReservedFields = (value) => {
  const payload = { ...ensureObject(value) }

  delete payload.id
  delete payload.resource
  delete payload.createdAt
  delete payload.updatedAt
  delete payload.created_at
  delete payload.updated_at

  return payload
}

const toRecordView = (row) => ({
  ...(row.data || {}),
  id: row.id,
  resource: row.resource,
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString(),
})

const asLower = (value) => String(value ?? '').trim().toLowerCase()

const applyQueryFilters = (records, query = {}) => {
  let result = [...records]
  const searchTerm = String(query.q || query.search || '').trim().toLowerCase()

  if (searchTerm) {
    result = result.filter((record) => JSON.stringify(record).toLowerCase().includes(searchTerm))
  }

  for (const key of ['status', 'branch', 'customerId', 'serviceId', 'serviceName', 'staffName', 'method', 'paymentStatus']) {
    const value = query[key]
    if (value === undefined || value === null || value === '') continue
    result = result.filter((record) => asLower(record[key]).includes(asLower(value)))
  }

  const limit = Number(query.limit)
  if (Number.isFinite(limit) && limit >= 0) {
    result = result.slice(0, limit)
  }

  return result
}

const countBy = (items, getKey) =>
  items.reduce((acc, item) => {
    const key = String(getKey(item) || '').trim()
    if (!key) return acc
    acc.set(key, (acc.get(key) || 0) + 1)
    return acc
  }, new Map())

const sumBy = (items, getValue) =>
  items.reduce((sum, item) => sum + Number(getValue(item) || 0), 0)

const formatDayName = (value) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
  })

const toDayKey = (value) => {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export const ensureSchema = async () => {
  ensureDatabaseUrl()

  await pool.query('SELECT 1')

  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_records (
      resource text NOT NULL,
      id text NOT NULL,
      data jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY (resource, id)
    )
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS crm_records_resource_updated_idx
    ON crm_records (resource, updated_at DESC)
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_users (
      email text PRIMARY KEY,
      password_hash text NOT NULL,
      role text NOT NULL DEFAULT 'admin',
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `)
}

export const closeDatabase = async () => {
  await pool.end()
}

export const upsertUser = async ({ email, passwordHash, role = 'admin' }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase()

  if (!normalizedEmail) {
    const error = new Error('User email is required.')
    error.statusCode = 400
    throw error
  }

  const { rows } = await pool.query(
    `
      INSERT INTO crm_users (email, password_hash, role, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role,
            updated_at = EXCLUDED.updated_at
      RETURNING email, password_hash AS "passwordHash", role, created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [normalizedEmail, passwordHash, role],
  )

  return rows[0]
}

export const findUserByEmail = async (email) => {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail) return null

  const { rows } = await pool.query(
    `
      SELECT
        email,
        password_hash AS "passwordHash",
        role,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM crm_users
      WHERE email = $1
      LIMIT 1
    `,
    [normalizedEmail],
  )

  return rows[0] || null
}

export const listRecords = async (resource, query = {}) => {
  const normalizedResource = normalizeResource(resource)

  if (normalizedResource === 'reports') {
    return buildReportRows()
  }

  const { rows } = await pool.query(
    `
      SELECT resource, id, data, created_at, updated_at
      FROM crm_records
      WHERE resource = $1
      ORDER BY updated_at DESC, created_at DESC
    `,
    [normalizedResource],
  )

  return applyQueryFilters(rows.map(toRecordView), query)
}

export const getRecord = async (resource, id) => {
  const normalizedResource = normalizeResource(resource)

  if (normalizedResource === 'reports') {
    const rows = await buildReportRows()
    return rows.find((row) => row.id === id) || null
  }

  const { rows } = await pool.query(
    `
      SELECT resource, id, data, created_at, updated_at
      FROM crm_records
      WHERE resource = $1 AND id = $2
      LIMIT 1
    `,
    [normalizedResource, id],
  )

  return rows[0] ? toRecordView(rows[0]) : null
}

export const createRecord = async (resource, payload) => {
  const normalizedResource = normalizeResource(resource)

  if (!WRITABLE_RESOURCES.has(normalizedResource)) {
    const error = new Error(`The ${normalizedResource} resource is read-only.`)
    error.statusCode = 405
    throw error
  }

  const body = stripReservedFields(payload)
  const id = String(payload?.id || '').trim() || randomUUID()
  const now = new Date()

  const { rows } = await pool.query(
    `
      INSERT INTO crm_records (resource, id, data, created_at, updated_at)
      VALUES ($1, $2, $3::jsonb, $4, $5)
      ON CONFLICT (resource, id) DO UPDATE
        SET data = EXCLUDED.data,
            updated_at = EXCLUDED.updated_at
      RETURNING resource, id, data, created_at, updated_at
    `,
    [normalizedResource, id, JSON.stringify(body), now, now],
  )

  return toRecordView(rows[0])
}

export const updateRecord = async (resource, id, patch) => {
  const normalizedResource = normalizeResource(resource)

  if (!WRITABLE_RESOURCES.has(normalizedResource)) {
    const error = new Error(`The ${normalizedResource} resource is read-only.`)
    error.statusCode = 405
    throw error
  }

  const current = await getRecord(normalizedResource, id)
  if (!current) {
    const error = new Error(`${normalizedResource} record not found.`)
    error.statusCode = 404
    throw error
  }

  const merged = {
    ...stripReservedFields(current),
    ...stripReservedFields(patch),
  }

  const now = new Date()

  const { rows } = await pool.query(
    `
      INSERT INTO crm_records (resource, id, data, created_at, updated_at)
      VALUES ($1, $2, $3::jsonb, $4, $5)
      ON CONFLICT (resource, id) DO UPDATE
        SET data = EXCLUDED.data,
            updated_at = EXCLUDED.updated_at
      RETURNING resource, id, data, created_at, updated_at
    `,
    [normalizedResource, id, JSON.stringify(merged), new Date(current.createdAt), now],
  )

  return toRecordView(rows[0])
}

export const deleteRecord = async (resource, id) => {
  const normalizedResource = normalizeResource(resource)

  if (!WRITABLE_RESOURCES.has(normalizedResource)) {
    const error = new Error(`The ${normalizedResource} resource is read-only.`)
    error.statusCode = 405
    throw error
  }

  const { rowCount } = await pool.query(
    `
      DELETE FROM crm_records
      WHERE resource = $1 AND id = $2
    `,
    [normalizedResource, id],
  )

  if (rowCount === 0) {
    const error = new Error(`${normalizedResource} record not found.`)
    error.statusCode = 404
    throw error
  }
}

export const buildReportRows = async () => {
  const [appointments, payments, customers, services, staff, leads] = await Promise.all([
    listRecords('appointments'),
    listRecords('payments'),
    listRecords('customers'),
    listRecords('services'),
    listRecords('staff'),
    listRecords('leads'),
  ])

  const hasData = [appointments, payments, customers, services, staff, leads].some((collection) => collection.length > 0)
  if (!hasData) {
    return []
  }

  const totalSales = sumBy(payments, (payment) => payment.amountPaid ?? payment.totalPaid ?? payment.amountDue ?? payment.total ?? 0)
  const totalAppointments = appointments.length
  const completedAppointments = appointments.filter((appointment) => asLower(appointment.status) === 'completed').length
  const pendingPayments = payments.filter((payment) => Number(payment.balanceRemaining ?? payment.balance ?? 0) > 0).length
  const cashCollected = sumBy(
    payments.filter((payment) => asLower(payment.method) === 'cash'),
    (payment) => payment.amountPaid ?? payment.totalPaid ?? 0,
  )
  const averageBillValue = payments.length
    ? Math.round(sumBy(payments, (payment) => payment.amountDue ?? payment.totalDue ?? payment.amountPaid ?? 0) / payments.length)
    : 0
  const repeatCustomers = customers.length
    ? Math.round(
        (customers.filter((customer) => Number(customer.totalVisits ?? customer.visits ?? 0) > 1).length / customers.length) * 100,
      )
    : 0
  const overduePayments = sumBy(
    payments.filter((payment) => Number(payment.balanceRemaining ?? payment.balance ?? 0) > 0),
    (payment) => payment.balanceRemaining ?? payment.balance ?? 0,
  )
  const partialPayments = payments.filter(
    (payment) => asLower(payment.status) === 'partial' || (Number(payment.amountPaid ?? 0) > 0 && Number(payment.balanceRemaining ?? payment.balance ?? 0) > 0),
  ).length
  const receipts = payments.length
  const serviceCount = services.length
  const newCustomers = customers.filter((customer) => Number(customer.totalVisits ?? customer.visits ?? 0) <= 1).length
  const inactiveCustomers = customers.filter((customer) => {
    if (asLower(customer.status).includes('inactive')) return true
    return customer.active === false || Number(customer.totalVisits ?? customer.visits ?? 0) === 0
  }).length
  const completionRate = totalAppointments ? Math.round((completedAppointments / totalAppointments) * 100) : 0

  const serviceCounts = countBy(appointments, (appointment) => appointment.serviceName || appointment.service || appointment.treatment || 'Unknown Service')
  const staffCounts = countBy(appointments, (appointment) => appointment.staffName || appointment.assignedStaff || appointment.staff || 'Unassigned')
  const salesByDay = new Map()

  payments.forEach((payment) => {
    const paymentDate = payment.paymentDate || payment.createdAt || payment.updatedAt
    const dayKey = toDayKey(paymentDate)
    if (!dayKey) return
    salesByDay.set(dayKey, (salesByDay.get(dayKey) || 0) + Number(payment.amountPaid ?? payment.totalPaid ?? 0))
  })

  let highestSalesDay = 'No sales data'
  let highestSalesTotal = 0
  for (const [dayKey, total] of salesByDay.entries()) {
    if (total >= highestSalesTotal) {
      highestSalesTotal = total
      highestSalesDay = formatDayName(dayKey)
    }
  }

  const topServiceEntry = [...serviceCounts.entries()].sort((left, right) => right[1] - left[1])[0]
  const topStaffEntry = [...staffCounts.entries()].sort((left, right) => right[1] - left[1])[0]

  return [
    { id: 'report-total-sales', label: 'Total Sales', value: totalSales, amount: totalSales, total: totalSales },
    { id: 'report-appointments', label: 'Appointments', value: totalAppointments, count: totalAppointments },
    { id: 'report-completed', label: 'Completed', value: completedAppointments, count: completedAppointments },
    { id: 'report-pending-payments', label: 'Pending Payments', value: pendingPayments, count: pendingPayments },
    { id: 'report-cash-collected', label: 'Cash Collected', value: cashCollected, amount: cashCollected },
    { id: 'report-average-bill', label: 'Average Bill Value', value: averageBillValue, amount: averageBillValue },
    { id: 'report-repeat-customers', label: 'Repeat Customers', value: repeatCustomers, count: repeatCustomers },
    { id: 'report-new-customers', label: 'New Customers', value: newCustomers, count: newCustomers },
    { id: 'report-inactive-customers', label: 'Inactive Customers', value: inactiveCustomers, count: inactiveCustomers },
    { id: 'report-overdue-payments', label: 'Overdue Payments', value: overduePayments, amount: overduePayments },
    { id: 'report-partial-payments', label: 'Partial Payments', value: partialPayments, count: partialPayments },
    { id: 'report-receipts', label: 'Receipts', value: receipts, count: receipts },
    { id: 'report-service-count', label: 'Service Count', value: serviceCount, count: serviceCount },
    { id: 'report-completion-rate', label: 'Completion Rate', value: completionRate, count: completionRate },
    {
      id: 'report-top-service',
      label: 'Top Service',
      value: topServiceEntry ? topServiceEntry[0] : services[0]?.name || 'No service data',
    },
    {
      id: 'report-top-staff',
      label: 'Top Staff Member',
      value: topStaffEntry ? topStaffEntry[0] : staff[0]?.name || 'No staff data',
    },
    { id: 'report-highest-sales-day', label: 'Highest Sales Day', value: highestSalesDay },
    { id: 'report-highest-sales-total', label: 'Highest Sales Total', value: highestSalesTotal, amount: highestSalesTotal },
  ]
}
