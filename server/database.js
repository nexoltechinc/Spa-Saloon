import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { config } from './config.js';

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
];

export const WRITABLE_RESOURCES = new Set(RESOURCE_NAMES.filter((resource) => resource !== 'reports'));

const SETTINGS_ROW_ID = 'singleton';

const pool = new Pool({
  connectionString: config.databaseUrl,
});

const ensureDatabaseUrl = () => {
  if (!config.databaseUrl) {
    const error = new Error('DATABASE_URL is required to start the CRM API.');
    error.statusCode = 500;
    throw error;
  }
};

const ensureObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    const error = new Error('Request body must be a JSON object.');
    error.statusCode = 400;
    throw error;
  }

  return value;
};

const normalizeText = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return fallback;
};

const normalizeNumber = (value, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeDateString = (value, fallback = '') => {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
};

const toIso = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};

const toRecordView = (row) => ({
  ...(row.data || {}),
  id: row.id,
  resource: row.resource,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
});

const toObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return { ...value };
};

const stripReservedFields = (value) => {
  const payload = toObject(value);

  delete payload.id;
  delete payload.resource;
  delete payload.createdAt;
  delete payload.updatedAt;
  delete payload.created_at;
  delete payload.updated_at;

  return payload;
};

const asLower = (value) => String(value ?? '').trim().toLowerCase();

const applyQueryFilters = (records, query = {}, filterKeys = []) => {
  let result = [...records];
  const searchTerm = String(query.q || query.search || '').trim().toLowerCase();

  if (searchTerm) {
    result = result.filter((record) => JSON.stringify(record).toLowerCase().includes(searchTerm));
  }

  const keys = new Set(['status', 'branch', 'branchName', 'city', 'manager', 'managerName', 'customerId', 'serviceId', 'serviceName', 'staffName', 'ownerName', 'method', 'paymentStatus', 'priority', 'source', ...filterKeys]);

  for (const key of keys) {
    const value = query[key];
    if (value === undefined || value === null || value === '') continue;
    result = result.filter((record) => asLower(record[key]).includes(asLower(value)));
  }

  const limit = Number(query.limit);
  if (Number.isFinite(limit) && limit >= 0) {
    result = result.slice(0, limit);
  }

  return result;
};

const countBy = (items, getKey) =>
  items.reduce((acc, item) => {
    const key = String(getKey(item) || '').trim();
    if (!key) return acc;
    acc.set(key, (acc.get(key) || 0) + 1);
    return acc;
  }, new Map());

const sumBy = (items, getValue) =>
  items.reduce((sum, item) => sum + Number(getValue(item) || 0), 0);

const toDayKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

const formatDayName = (value) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
  });

const isValidObjectId = (value) => String(value || '').trim().length > 0;

const getMetadata = (source, reservedKeys) => {
  const metadata = {};
  const reserved = new Set(reservedKeys);

  for (const [key, value] of Object.entries(toObject(source))) {
    if (reserved.has(key)) continue;
    metadata[key] = value;
  }

  return metadata;
};

const branchReservedKeys = [
  'id',
  'resource',
  'createdAt',
  'updatedAt',
  'created_at',
  'updated_at',
  'name',
  'branchName',
  'managerName',
  'manager',
  'city',
  'state',
  'phone',
  'email',
  'hours',
  'status',
  'active',
  'rooms',
  'teamSize',
  'notes',
  'metadata',
];

const leadReservedKeys = [
  'id',
  'resource',
  'createdAt',
  'updatedAt',
  'created_at',
  'updated_at',
  'name',
  'fullName',
  'email',
  'phone',
  'source',
  'status',
  'priority',
  'ownerName',
  'owner',
  'assignedStaff',
  'assignedTo',
  'branchName',
  'branch',
  'serviceInterest',
  'budget',
  'lastContactAt',
  'nextFollowUpAt',
  'notes',
  'metadata',
];

const appointmentReservedKeys = [
  'id',
  'resource',
  'createdAt',
  'updatedAt',
  'created_at',
  'updated_at',
  'customerId',
  'clientId',
  'customerName',
  'customerEmail',
  'phone',
  'serviceId',
  'treatmentId',
  'serviceName',
  'service',
  'staffId',
  'assignedStaff',
  'staffName',
  'staff',
  'branchName',
  'branch',
  'appointmentAt',
  'dateTime',
  'durationMinutes',
  'status',
  'paymentStatus',
  'amountDue',
  'amountPaid',
  'balanceRemaining',
  'source',
  'notes',
  'checkInAt',
  'completedAt',
  'cancelledAt',
  'metadata',
];

const serviceReservedKeys = [
  'id',
  'resource',
  'createdAt',
  'updatedAt',
  'created_at',
  'updated_at',
  'name',
  'serviceName',
  'title',
  'category',
  'serviceCategory',
  'service_category',
  'duration',
  'durationMinutes',
  'duration_minutes',
  'price',
  'cost',
  'amount',
  'previousPrice',
  'previous_price',
  'priceReviewNeeded',
  'price_review_needed',
  'priceLastUpdated',
  'priceUpdatedAt',
  'price_updated_at',
  'priceUpdatedBy',
  'price_updated_by',
  'assignedStaff',
  'staff',
  'active',
  'isActive',
  'bookingVisible',
  'bookable',
  'posAvailable',
  'posVisible',
  'description',
  'summary',
  'note',
  'notes',
  'updatedBy',
  'editor',
  'bookingsWeek',
  'bookingsMonth',
  'revenueMonth',
  'lastBooked',
  'lastBookedAt',
  'lastBookingAt',
  'popularityRank',
  'packageReadiness',
  'metadata',
];

const normalizeBranchInput = (payload, existing = {}) => {
  const source = ensureObject(payload);
  const name = normalizeText(source.name ?? source.branchName ?? existing.name, normalizeText(existing.name));

  if (!name) {
    const error = new Error('Branch name is required.');
    error.statusCode = 400;
    throw error;
  }

  const status = normalizeText(source.status ?? existing.status, existing.status || 'Planning');
  const active = normalizeBoolean(source.active, existing.active ?? status === 'Open');

  return {
    name,
    branchName: name,
    managerName: normalizeText(source.managerName ?? source.manager ?? existing.managerName, existing.managerName || 'Unassigned'),
    city: normalizeText(source.city, existing.city || ''),
    state: normalizeText(source.state, existing.state || ''),
    phone: normalizeText(source.phone, existing.phone || ''),
    email: normalizeText(source.email, existing.email || ''),
    hours: normalizeText(source.hours, existing.hours || ''),
    status,
    active,
    rooms: Math.max(0, Math.round(normalizeNumber(source.rooms ?? existing.rooms, existing.rooms ?? 0))),
    teamSize: Math.max(0, Math.round(normalizeNumber(source.teamSize ?? source.team_size ?? existing.teamSize, existing.teamSize ?? 0))),
    notes: normalizeText(source.notes, existing.notes || ''),
    metadata: {
      ...(toObject(existing.metadata) || {}),
      ...getMetadata(source, branchReservedKeys),
    },
  };
};

const normalizeLeadInput = (payload, existing = {}) => {
  const source = ensureObject(payload);
  const fullName = normalizeText(source.fullName ?? source.name ?? existing.fullName, normalizeText(existing.fullName));

  if (!fullName) {
    const error = new Error('Lead name is required.');
    error.statusCode = 400;
    throw error;
  }

  return {
    fullName,
    name: fullName,
    email: normalizeText(source.email, existing.email || ''),
    phone: normalizeText(source.phone ?? source.contactNumber, existing.phone || ''),
    source: normalizeText(source.source ?? source.inquirySource, existing.source || 'Website Form'),
    status: normalizeText(source.status ?? source.leadStatus, existing.status || 'New'),
    priority: normalizeText(source.priority ?? source.followUpState, existing.priority || 'Normal'),
    ownerName: normalizeText(source.ownerName ?? source.owner ?? source.assignedStaff ?? source.assignedTo, existing.ownerName || 'Unassigned'),
    branchName: normalizeText(source.branchName ?? source.branch, existing.branchName || ''),
    serviceInterest: normalizeText(source.serviceInterest ?? source.service ?? source.requestedService, existing.serviceInterest || ''),
    budget: Math.max(0, normalizeNumber(source.budget ?? source.estimatedValue, existing.budget ?? 0)),
    lastContactAt: normalizeDateString(source.lastContactAt ?? source.last_contact_at, existing.lastContactAt || ''),
    nextFollowUpAt: normalizeDateString(source.nextFollowUpAt ?? source.next_follow_up_at, existing.nextFollowUpAt || ''),
    notes: normalizeText(source.notes, existing.notes || ''),
    metadata: {
      ...(toObject(existing.metadata) || {}),
      ...getMetadata(source, leadReservedKeys),
    },
  };
};

const normalizeAppointmentInput = (payload, existing = {}) => {
  const source = ensureObject(payload);
  const customerName = normalizeText(source.customerName ?? source.customer ?? existing.customerName, normalizeText(existing.customerName));
  const serviceName = normalizeText(source.serviceName ?? source.service ?? source.treatment, normalizeText(existing.serviceName));
  const appointmentAt = normalizeDateString(source.appointmentAt ?? source.dateTime ?? source.startAt, existing.appointmentAt || '');

  if (!customerName) {
    const error = new Error('Appointment customer name is required.');
    error.statusCode = 400;
    throw error;
  }

  if (!serviceName) {
    const error = new Error('Appointment service name is required.');
    error.statusCode = 400;
    throw error;
  }

  if (!appointmentAt) {
    const error = new Error('Appointment date/time is required.');
    error.statusCode = 400;
    throw error;
  }

  const amountDue = Math.max(0, normalizeNumber(source.amountDue ?? source.totalDue ?? source.total, existing.amountDue ?? 0));
  const amountPaid = Math.max(0, normalizeNumber(source.amountPaid ?? source.paidAmount, existing.amountPaid ?? 0));
  const balanceRemaining = source.balanceRemaining !== undefined
    ? Math.max(0, normalizeNumber(source.balanceRemaining, existing.balanceRemaining ?? 0))
    : Math.max(amountDue - amountPaid, 0);
  const status = normalizeText(source.status ?? source.appointmentStatus, existing.status || 'Confirmed');
  const paymentStatus = normalizeText(source.paymentStatus, existing.paymentStatus || (balanceRemaining > 0 ? (amountPaid > 0 ? 'Partial' : 'Unpaid') : 'Paid'));
  const completedAt = status === 'Completed'
    ? normalizeDateString(source.completedAt ?? existing.completedAt, new Date().toISOString())
    : normalizeDateString(source.completedAt, existing.completedAt || '');
  const cancelledAt = status === 'Cancelled'
    ? normalizeDateString(source.cancelledAt ?? existing.cancelledAt, new Date().toISOString())
    : normalizeDateString(source.cancelledAt, existing.cancelledAt || '');

  return {
    customerId: normalizeText(source.customerId ?? source.clientId, existing.customerId || ''),
    customerName,
    customerEmail: normalizeText(source.customerEmail ?? source.email, existing.customerEmail || ''),
    phone: normalizeText(source.phone ?? source.contactNumber, existing.phone || ''),
    serviceId: normalizeText(source.serviceId ?? source.treatmentId, existing.serviceId || ''),
    serviceName,
    staffId: normalizeText(source.staffId, existing.staffId || ''),
    staffName: normalizeText(source.staffName ?? source.staff ?? source.assignedStaff ?? source.therapist, existing.staffName || 'Unassigned'),
    branchName: normalizeText(source.branchName ?? source.branch, existing.branchName || ''),
    appointmentAt,
    durationMinutes: Math.max(0, Math.round(normalizeNumber(source.durationMinutes ?? source.duration, existing.durationMinutes ?? 60))),
    status,
    paymentStatus,
    amountDue,
    amountPaid,
    balanceRemaining,
    source: normalizeText(source.source, existing.source || 'CRM'),
    notes: normalizeText(source.notes, existing.notes || ''),
    checkInAt: normalizeDateString(source.checkInAt, existing.checkInAt || ''),
    completedAt,
    cancelledAt,
    metadata: {
      ...(toObject(existing.metadata) || {}),
      ...getMetadata(source, appointmentReservedKeys),
    },
  };
};

const normalizeServiceInput = (payload, existing = {}) => {
  const source = ensureObject(payload);
  const name = normalizeText(source.name ?? source.serviceName ?? source.title, normalizeText(existing.name));

  if (!name) {
    const error = new Error('Service name is required.');
    error.statusCode = 400;
    throw error;
  }

  const category = normalizeText(source.category ?? source.serviceCategory ?? source.service_category, existing.category || 'General');
  const duration = Math.max(0, Math.round(normalizeNumber(source.duration ?? source.durationMinutes ?? source.duration_minutes, existing.duration ?? 60)));
  const price = Math.max(0, normalizeNumber(source.price ?? source.cost ?? source.amount, existing.price ?? 0));
  const previousPrice = Math.max(0, normalizeNumber(source.previousPrice ?? source.previous_price, existing.previousPrice ?? price));
  const priceReviewNeeded = normalizeBoolean(source.priceReviewNeeded ?? source.price_review_needed, existing.priceReviewNeeded ?? false);
  const priceLastUpdated = normalizeDateString(
    source.priceLastUpdated ?? source.priceUpdatedAt ?? source.price_updated_at,
    existing.priceLastUpdated || new Date().toISOString(),
  );
  const priceUpdatedBy = normalizeText(source.priceUpdatedBy ?? source.price_updated_by ?? source.updatedBy ?? source.editor, existing.priceUpdatedBy || existing.updatedBy || 'System Sync');
  const rawAssignedStaff = Array.isArray(source.assignedStaff)
    ? source.assignedStaff
    : Array.isArray(source.staff)
      ? source.staff
      : typeof source.assignedStaff === 'string'
        ? source.assignedStaff.split(',').map((item) => item.trim()).filter(Boolean)
        : typeof source.staff === 'string'
          ? source.staff.split(',').map((item) => item.trim()).filter(Boolean)
          : Array.isArray(existing.assignedStaff)
            ? existing.assignedStaff
            : [];
  const assignedStaff = rawAssignedStaff.map((item) => normalizeText(item)).filter(Boolean);
  const active = normalizeBoolean(source.active ?? source.isActive, existing.active ?? true);
  const bookingVisible = normalizeBoolean(source.bookingVisible ?? source.bookable, existing.bookingVisible ?? true);
  const posAvailable = normalizeBoolean(source.posAvailable ?? source.posVisible, existing.posAvailable ?? true);
  const description = normalizeText(source.description ?? source.summary, existing.description || '');
  const note = normalizeText(source.note ?? source.notes, existing.note || '');
  const updatedBy = normalizeText(source.updatedBy ?? source.editor, existing.updatedBy || 'System Sync');
  const bookingsWeek = Math.max(0, Math.round(normalizeNumber(source.bookingsWeek, existing.bookingsWeek ?? 0)));
  const bookingsMonth = Math.max(0, Math.round(normalizeNumber(source.bookingsMonth, existing.bookingsMonth ?? 0)));
  const revenueMonth = Math.max(0, normalizeNumber(source.revenueMonth, existing.revenueMonth ?? bookingsMonth * price));
  const lastBooked = normalizeDateString(source.lastBooked ?? source.lastBookedAt ?? source.lastBookingAt, existing.lastBooked || '');
  const popularityRank = Math.max(1, Math.round(normalizeNumber(source.popularityRank, existing.popularityRank ?? 9)));
  const packageReadiness = {
    ...(toObject(existing.packageReadiness) || {}),
    ...toObject(source.packageReadiness),
  };

  return {
    name,
    serviceName: name,
    title: name,
    category,
    serviceCategory: category,
    duration,
    durationMinutes: duration,
    price,
    cost: price,
    amount: price,
    previousPrice,
    priceReviewNeeded,
    priceLastUpdated,
    priceUpdatedBy,
    assignedStaff,
    staff: assignedStaff,
    active,
    isActive: active,
    bookingVisible,
    bookable: bookingVisible,
    posAvailable,
    posVisible: posAvailable,
    description,
    summary: description,
    note,
    notes: note,
    updatedBy,
    editor: updatedBy,
    bookingsWeek,
    bookingsMonth,
    revenueMonth,
    lastBooked,
    lastBookedAt: lastBooked,
    lastBookingAt: lastBooked,
    popularityRank,
    packageReadiness,
    metadata: {
      ...(toObject(existing.metadata) || {}),
      ...getMetadata(source, serviceReservedKeys),
    },
  };
};

const normalizeSettingsDocument = (payload) => {
  const source = ensureObject(payload);
  const profile = toObject(source.profile);
  const regionalDefaults = toObject(source.regionalDefaults);
  const operatingHours = Array.isArray(source.operatingHours) ? source.operatingHours : [];
  const specialHours = Array.isArray(source.specialHours) ? source.specialHours : [];
  const bookingRules = toObject(source.bookingRules);
  const communication = toObject(source.communication);
  const branding = toObject(source.branding);

  return {
    profile,
    regionalDefaults,
    operatingHours,
    specialHours,
    bookingRules,
    communication,
    branding,
    receiptQuote: normalizeText(source.receiptQuote ?? branding.receiptHeaderQuote, ''),
    receiptFooterText: normalizeText(source.receiptFooterText ?? branding.receiptFooterText, ''),
    brandingLayout: normalizeText(source.brandingLayout ?? branding.logoPlacement, 'centered'),
    includeSocialHandles: normalizeBoolean(source.includeSocialHandles ?? branding.includeSocialHandles, false),
  };
};

const structuredView = (resource, row, extra = {}) => ({
  resource,
  id: row.id,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
  ...extra,
});

const branchRowToView = (row) => {
  const metadata = toObject(row.metadata);
  return {
    ...metadata,
    ...structuredView('branches', row, {
      name: row.name,
      branchName: row.name,
      managerName: row.manager_name,
      manager: row.manager_name,
      city: row.city,
      state: row.state,
      phone: row.phone,
      email: row.email,
      hours: row.hours,
      status: row.status,
      active: row.active,
      rooms: Number(row.rooms || 0),
      teamSize: Number(row.team_size || 0),
      notes: row.notes,
      metadata,
    }),
  };
};

const leadRowToView = (row) => {
  const metadata = toObject(row.metadata);
  return {
    ...metadata,
    ...structuredView('leads', row, {
      fullName: row.full_name,
      name: row.full_name,
      email: row.email,
      phone: row.phone,
      source: row.source,
      status: row.status,
      leadStatus: row.status,
      priority: row.priority,
      ownerName: row.owner_name,
      owner: row.owner_name,
      assignedStaff: row.owner_name,
      assignedTo: row.owner_name,
      branchName: row.branch_name,
      branch: row.branch_name,
      serviceInterest: row.service_interest,
      budget: Number(row.budget || 0),
      lastContactAt: toIso(row.last_contact_at),
      nextFollowUpAt: toIso(row.next_follow_up_at),
      notes: row.notes,
      metadata,
    }),
  };
};

const appointmentRowToView = (row) => {
  const metadata = toObject(row.metadata);
  return {
    ...metadata,
    ...structuredView('appointments', row, {
      customerId: row.customer_id,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      phone: row.phone,
      serviceId: row.service_id,
      serviceName: row.service_name,
      service: row.service_name,
      staffId: row.staff_id,
      staffName: row.staff_name,
      staff: row.staff_name,
      branchName: row.branch_name,
      branch: row.branch_name,
      appointmentAt: toIso(row.appointment_at),
      dateTime: toIso(row.appointment_at),
      durationMinutes: Number(row.duration_minutes || 0),
      status: row.status,
      appointmentStatus: row.status,
      paymentStatus: row.payment_status,
      amountDue: Number(row.amount_due || 0),
      amountPaid: Number(row.amount_paid || 0),
      balanceRemaining: Number(row.balance_remaining || 0),
      source: row.source,
      notes: row.notes,
      checkInAt: toIso(row.check_in_at),
      completedAt: toIso(row.completed_at),
      cancelledAt: toIso(row.cancelled_at),
      metadata,
    }),
  };
};

const serviceRowToView = (row) => {
  const metadata = toObject(row.metadata);
  const assignedStaff = Array.isArray(row.assigned_staff) ? row.assigned_staff : [];
  return {
    ...metadata,
    ...structuredView('services', row, {
      name: row.name,
      serviceName: row.name,
      title: row.name,
      category: row.category,
      serviceCategory: row.category,
      duration: Number(row.duration_minutes || 0),
      durationMinutes: Number(row.duration_minutes || 0),
      price: Number(row.price || 0),
      cost: Number(row.price || 0),
      amount: Number(row.price || 0),
      previousPrice: Number(row.previous_price || 0),
      priceReviewNeeded: row.price_review_needed,
      priceLastUpdated: toIso(row.price_last_updated),
      priceUpdatedBy: row.price_updated_by,
      assignedStaff,
      staff: assignedStaff,
      active: row.active,
      isActive: row.active,
      bookingVisible: row.booking_visible,
      bookable: row.booking_visible,
      posAvailable: row.pos_available,
      posVisible: row.pos_available,
      description: row.description,
      summary: row.description,
      note: row.note,
      notes: row.note,
      updatedBy: row.updated_by,
      editor: row.updated_by,
      bookingsWeek: Number(row.bookings_week || 0),
      bookingsMonth: Number(row.bookings_month || 0),
      revenueMonth: Number(row.revenue_month || 0),
      lastBooked: toIso(row.last_booked),
      lastBookedAt: toIso(row.last_booked),
      lastBookingAt: toIso(row.last_booked),
      popularityRank: Number(row.popularity_rank || 0),
      packageReadiness: toObject(row.package_readiness),
      metadata,
    }),
  };
};

const settingsRowToView = (row) => ({
  ...normalizeSettingsDocument(row.data || {}),
  id: row.id,
  resource: 'settings',
  updatedAt: toIso(row.updated_at),
  createdAt: toIso(row.created_at),
});

const structuredFilterKeys = {
  branches: ['name', 'branchName', 'manager', 'managerName', 'city', 'state', 'hours'],
  leads: ['fullName', 'name', 'ownerName', 'owner', 'source', 'priority', 'branchName', 'serviceInterest'],
  appointments: ['customerName', 'serviceName', 'staffName', 'branchName', 'paymentStatus', 'source'],
  services: ['name', 'serviceName', 'title', 'category', 'serviceCategory', 'assignedStaff', 'note'],
};

const listStructuredRows = async (resource, query = {}) => {
  if (resource === 'branches') {
    const { rows } = await pool.query(`
      SELECT id, name, manager_name, city, state, phone, email, hours, status, active, rooms, team_size, notes, metadata, created_at, updated_at
      FROM crm_branches
      ORDER BY updated_at DESC, created_at DESC
    `);
    return applyQueryFilters(rows.map(branchRowToView), query, structuredFilterKeys.branches);
  }

  if (resource === 'leads') {
    const { rows } = await pool.query(`
      SELECT id, full_name, email, phone, source, status, priority, owner_name, branch_name, service_interest, budget, last_contact_at, next_follow_up_at, notes, metadata, created_at, updated_at
      FROM crm_leads
      ORDER BY updated_at DESC, created_at DESC
    `);
    return applyQueryFilters(rows.map(leadRowToView), query, structuredFilterKeys.leads);
  }

  if (resource === 'appointments') {
    const { rows } = await pool.query(`
      SELECT id, customer_id, customer_name, customer_email, phone, service_id, service_name, staff_id, staff_name, branch_name, appointment_at, duration_minutes, status, payment_status, amount_due, amount_paid, balance_remaining, source, notes, check_in_at, completed_at, cancelled_at, metadata, created_at, updated_at
      FROM crm_appointments
      ORDER BY appointment_at DESC, updated_at DESC, created_at DESC
    `);
    return applyQueryFilters(rows.map(appointmentRowToView), query, structuredFilterKeys.appointments);
  }

  if (resource === 'services') {
    const { rows } = await pool.query(`
      SELECT id, name, category, duration_minutes, price, previous_price, price_review_needed, price_last_updated, price_updated_by, assigned_staff, active, booking_visible, pos_available, description, note, updated_by, bookings_week, bookings_month, revenue_month, last_booked, popularity_rank, package_readiness, metadata, created_at, updated_at
      FROM crm_services
      ORDER BY updated_at DESC, created_at DESC
    `);
    return applyQueryFilters(rows.map(serviceRowToView), query, structuredFilterKeys.services);
  }

  return [];
};

const getStructuredRecord = async (resource, id) => {
  if (!isValidObjectId(id)) return null;

  if (resource === 'branches') {
    const { rows } = await pool.query(
      `
        SELECT id, name, manager_name, city, state, phone, email, hours, status, active, rooms, team_size, notes, metadata, created_at, updated_at
        FROM crm_branches
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );
    return rows[0] ? branchRowToView(rows[0]) : null;
  }

  if (resource === 'leads') {
    const { rows } = await pool.query(
      `
        SELECT id, full_name, email, phone, source, status, priority, owner_name, branch_name, service_interest, budget, last_contact_at, next_follow_up_at, notes, metadata, created_at, updated_at
        FROM crm_leads
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );
    return rows[0] ? leadRowToView(rows[0]) : null;
  }

  if (resource === 'appointments') {
    const { rows } = await pool.query(
      `
        SELECT id, customer_id, customer_name, customer_email, phone, service_id, service_name, staff_id, staff_name, branch_name, appointment_at, duration_minutes, status, payment_status, amount_due, amount_paid, balance_remaining, source, notes, check_in_at, completed_at, cancelled_at, metadata, created_at, updated_at
        FROM crm_appointments
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );
    return rows[0] ? appointmentRowToView(rows[0]) : null;
  }

  if (resource === 'services') {
    const { rows } = await pool.query(
      `
        SELECT id, name, category, duration_minutes, price, previous_price, price_review_needed, price_last_updated, price_updated_by, assigned_staff, active, booking_visible, pos_available, description, note, updated_by, bookings_week, bookings_month, revenue_month, last_booked, popularity_rank, package_readiness, metadata, created_at, updated_at
        FROM crm_services
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );
    return rows[0] ? serviceRowToView(rows[0]) : null;
  }

  return null;
};

const upsertStructuredRecord = async (resource, payload, existing = null) => {
  const id = normalizeText(payload?.id || existing?.id || randomUUID());
  const now = new Date();

  if (resource === 'branches') {
    const normalized = normalizeBranchInput(payload, existing || {});
    const { rows } = await pool.query(
      `
        INSERT INTO crm_branches (
          id, name, manager_name, city, state, phone, email, hours, status, active, rooms, team_size, notes, metadata, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, $16)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          manager_name = EXCLUDED.manager_name,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          hours = EXCLUDED.hours,
          status = EXCLUDED.status,
          active = EXCLUDED.active,
          rooms = EXCLUDED.rooms,
          team_size = EXCLUDED.team_size,
          notes = EXCLUDED.notes,
          metadata = EXCLUDED.metadata,
          updated_at = EXCLUDED.updated_at
        RETURNING id, name, manager_name, city, state, phone, email, hours, status, active, rooms, team_size, notes, metadata, created_at, updated_at
      `,
      [
        id,
        normalized.name,
        normalized.managerName,
        normalized.city,
        normalized.state,
        normalized.phone,
        normalized.email,
        normalized.hours,
        normalized.status,
        normalized.active,
        normalized.rooms,
        normalized.teamSize,
        normalized.notes,
        JSON.stringify(normalized.metadata),
        existing?.createdAt ? new Date(existing.createdAt) : now,
        now,
      ],
    );
    return branchRowToView(rows[0]);
  }

  if (resource === 'leads') {
    const normalized = normalizeLeadInput(payload, existing || {});
    const { rows } = await pool.query(
      `
        INSERT INTO crm_leads (
          id, full_name, email, phone, source, status, priority, owner_name, branch_name, service_interest, budget, last_contact_at, next_follow_up_at, notes, metadata, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULLIF($12, '')::timestamptz, NULLIF($13, '')::timestamptz, $14, $15::jsonb, $16, $17)
        ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          source = EXCLUDED.source,
          status = EXCLUDED.status,
          priority = EXCLUDED.priority,
          owner_name = EXCLUDED.owner_name,
          branch_name = EXCLUDED.branch_name,
          service_interest = EXCLUDED.service_interest,
          budget = EXCLUDED.budget,
          last_contact_at = EXCLUDED.last_contact_at,
          next_follow_up_at = EXCLUDED.next_follow_up_at,
          notes = EXCLUDED.notes,
          metadata = EXCLUDED.metadata,
          updated_at = EXCLUDED.updated_at
        RETURNING id, full_name, email, phone, source, status, priority, owner_name, branch_name, service_interest, budget, last_contact_at, next_follow_up_at, notes, metadata, created_at, updated_at
      `,
      [
        id,
        normalized.fullName,
        normalized.email,
        normalized.phone,
        normalized.source,
        normalized.status,
        normalized.priority,
        normalized.ownerName,
        normalized.branchName,
        normalized.serviceInterest,
        normalized.budget,
        normalized.lastContactAt,
        normalized.nextFollowUpAt,
        normalized.notes,
        JSON.stringify(normalized.metadata),
        existing?.createdAt ? new Date(existing.createdAt) : now,
        now,
      ],
    );
    return leadRowToView(rows[0]);
  }

  if (resource === 'appointments') {
    const normalized = normalizeAppointmentInput(payload, existing || {});
    const { rows } = await pool.query(
      `
        INSERT INTO crm_appointments (
          id, customer_id, customer_name, customer_email, phone, service_id, service_name, staff_id, staff_name, branch_name, appointment_at, duration_minutes, status, payment_status, amount_due, amount_paid, balance_remaining, source, notes, check_in_at, completed_at, cancelled_at, metadata, created_at, updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::timestamptz, $12, $13, $14, $15, $16, $17, $18, $19,
          NULLIF($20, '')::timestamptz, NULLIF($21, '')::timestamptz, NULLIF($22, '')::timestamptz, $23::jsonb, $24, $25
        )
        ON CONFLICT (id) DO UPDATE SET
          customer_id = EXCLUDED.customer_id,
          customer_name = EXCLUDED.customer_name,
          customer_email = EXCLUDED.customer_email,
          phone = EXCLUDED.phone,
          service_id = EXCLUDED.service_id,
          service_name = EXCLUDED.service_name,
          staff_id = EXCLUDED.staff_id,
          staff_name = EXCLUDED.staff_name,
          branch_name = EXCLUDED.branch_name,
          appointment_at = EXCLUDED.appointment_at,
          duration_minutes = EXCLUDED.duration_minutes,
          status = EXCLUDED.status,
          payment_status = EXCLUDED.payment_status,
          amount_due = EXCLUDED.amount_due,
          amount_paid = EXCLUDED.amount_paid,
          balance_remaining = EXCLUDED.balance_remaining,
          source = EXCLUDED.source,
          notes = EXCLUDED.notes,
          check_in_at = EXCLUDED.check_in_at,
          completed_at = EXCLUDED.completed_at,
          cancelled_at = EXCLUDED.cancelled_at,
          metadata = EXCLUDED.metadata,
          updated_at = EXCLUDED.updated_at
        RETURNING id, customer_id, customer_name, customer_email, phone, service_id, service_name, staff_id, staff_name, branch_name, appointment_at, duration_minutes, status, payment_status, amount_due, amount_paid, balance_remaining, source, notes, check_in_at, completed_at, cancelled_at, metadata, created_at, updated_at
      `,
      [
        id,
        normalized.customerId,
        normalized.customerName,
        normalized.customerEmail,
        normalized.phone,
        normalized.serviceId,
        normalized.serviceName,
        normalized.staffId,
        normalized.staffName,
        normalized.branchName,
        normalized.appointmentAt,
        normalized.durationMinutes,
        normalized.status,
        normalized.paymentStatus,
        normalized.amountDue,
        normalized.amountPaid,
        normalized.balanceRemaining,
        normalized.source,
        normalized.notes,
        normalized.checkInAt,
        normalized.completedAt,
        normalized.cancelledAt,
        JSON.stringify(normalized.metadata),
        existing?.createdAt ? new Date(existing.createdAt) : now,
        now,
      ],
    );
    const record = appointmentRowToView(rows[0]);
    if (record.status === 'Completed' && !record.completedAt) {
      return {
        ...record,
        completedAt: now.toISOString(),
      };
    }
    if (record.status === 'Cancelled' && !record.cancelledAt) {
      return {
        ...record,
        cancelledAt: now.toISOString(),
      };
    }
    return record;
  }

  if (resource === 'services') {
    const normalized = normalizeServiceInput(payload, existing || {});
    const { rows } = await pool.query(
      `
        INSERT INTO crm_services (
          id, name, category, duration_minutes, price, previous_price, price_review_needed, price_last_updated, price_updated_by, assigned_staff, active, booking_visible, pos_available, description, note, updated_by, bookings_week, bookings_month, revenue_month, last_booked, popularity_rank, package_readiness, metadata, created_at, updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9, $10::jsonb, $11, $12, $13, $14, $15, $16, $17, $18, $19, NULLIF($20, '')::timestamptz, $21, $22::jsonb, $23::jsonb, $24, $25
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          duration_minutes = EXCLUDED.duration_minutes,
          price = EXCLUDED.price,
          previous_price = EXCLUDED.previous_price,
          price_review_needed = EXCLUDED.price_review_needed,
          price_last_updated = EXCLUDED.price_last_updated,
          price_updated_by = EXCLUDED.price_updated_by,
          assigned_staff = EXCLUDED.assigned_staff,
          active = EXCLUDED.active,
          booking_visible = EXCLUDED.booking_visible,
          pos_available = EXCLUDED.pos_available,
          description = EXCLUDED.description,
          note = EXCLUDED.note,
          updated_by = EXCLUDED.updated_by,
          bookings_week = EXCLUDED.bookings_week,
          bookings_month = EXCLUDED.bookings_month,
          revenue_month = EXCLUDED.revenue_month,
          last_booked = EXCLUDED.last_booked,
          popularity_rank = EXCLUDED.popularity_rank,
          package_readiness = EXCLUDED.package_readiness,
          metadata = EXCLUDED.metadata,
          updated_at = EXCLUDED.updated_at
        RETURNING id, name, category, duration_minutes, price, previous_price, price_review_needed, price_last_updated, price_updated_by, assigned_staff, active, booking_visible, pos_available, description, note, updated_by, bookings_week, bookings_month, revenue_month, last_booked, popularity_rank, package_readiness, metadata, created_at, updated_at
      `,
      [
        id,
        normalized.name,
        normalized.category,
        normalized.duration,
        normalized.price,
        normalized.previousPrice,
        normalized.priceReviewNeeded,
        normalized.priceLastUpdated,
        normalized.priceUpdatedBy,
        JSON.stringify(normalized.assignedStaff),
        normalized.active,
        normalized.bookingVisible,
        normalized.posAvailable,
        normalized.description,
        normalized.note,
        normalized.updatedBy,
        normalized.bookingsWeek,
        normalized.bookingsMonth,
        normalized.revenueMonth,
        normalized.lastBooked,
        normalized.popularityRank,
        JSON.stringify(normalized.packageReadiness),
        JSON.stringify(normalized.metadata),
        existing?.createdAt ? new Date(existing.createdAt) : now,
        now,
      ],
    );
    return serviceRowToView(rows[0]);
  }

  const error = new Error(`Unsupported structured resource: ${resource}`);
  error.statusCode = 404;
  throw error;
};

const deleteStructuredRecord = async (resource, id) => {
  if (resource === 'branches') {
    const { rowCount } = await pool.query('DELETE FROM crm_branches WHERE id = $1', [id]);
    return rowCount;
  }

  if (resource === 'leads') {
    const { rowCount } = await pool.query('DELETE FROM crm_leads WHERE id = $1', [id]);
    return rowCount;
  }

  if (resource === 'appointments') {
    const { rowCount } = await pool.query('DELETE FROM crm_appointments WHERE id = $1', [id]);
    return rowCount;
  }

  if (resource === 'services') {
    const { rowCount } = await pool.query('DELETE FROM crm_services WHERE id = $1', [id]);
    return rowCount;
  }

  return 0;
};

const migrateStructuredRecords = async (client) => {
  await client.query(`
    INSERT INTO crm_branches (
      id, name, manager_name, city, state, phone, email, hours, status, active, rooms, team_size, notes, metadata, created_at, updated_at
    )
    SELECT
      id,
      COALESCE(NULLIF(data->>'name', ''), NULLIF(data->>'branchName', ''), 'Untitled Branch'),
      COALESCE(NULLIF(data->>'managerName', ''), NULLIF(data->>'manager', ''), 'Unassigned'),
      COALESCE(NULLIF(data->>'city', ''), ''),
      COALESCE(NULLIF(data->>'state', ''), ''),
      COALESCE(NULLIF(data->>'phone', ''), ''),
      COALESCE(NULLIF(data->>'email', ''), ''),
      COALESCE(NULLIF(data->>'hours', ''), ''),
      COALESCE(NULLIF(data->>'status', ''), 'Planning'),
      COALESCE((data->>'active')::boolean, false),
      CASE
        WHEN NULLIF(data->>'rooms', '') ~ '^[0-9]+$' THEN (data->>'rooms')::integer
        ELSE 0
      END,
      CASE
        WHEN NULLIF(data->>'teamSize', '') ~ '^[0-9]+$' THEN (data->>'teamSize')::integer
        ELSE 0
      END,
      COALESCE(NULLIF(data->>'notes', ''), ''),
      COALESCE(
        data
          - 'name' - 'branchName' - 'managerName' - 'manager' - 'city' - 'state' - 'phone' - 'email' - 'hours'
          - 'status' - 'active' - 'rooms' - 'teamSize' - 'notes',
        '{}'::jsonb
      ),
      created_at,
      updated_at
    FROM crm_records
    WHERE resource = 'branches'
    ON CONFLICT (id) DO NOTHING
  `);

  await client.query(`
    INSERT INTO crm_leads (
      id, full_name, email, phone, source, status, priority, owner_name, branch_name, service_interest, budget, last_contact_at, next_follow_up_at, notes, metadata, created_at, updated_at
    )
    SELECT
      id,
      COALESCE(NULLIF(data->>'fullName', ''), NULLIF(data->>'name', ''), 'Untitled Lead'),
      COALESCE(NULLIF(data->>'email', ''), ''),
      COALESCE(NULLIF(data->>'phone', ''), NULLIF(data->>'contactNumber', ''), ''),
      COALESCE(NULLIF(data->>'source', ''), NULLIF(data->>'inquirySource', ''), 'Website Form'),
      COALESCE(NULLIF(data->>'status', ''), NULLIF(data->>'leadStatus', ''), 'New'),
      COALESCE(NULLIF(data->>'priority', ''), 'Normal'),
      COALESCE(NULLIF(data->>'ownerName', ''), NULLIF(data->>'owner', ''), NULLIF(data->>'assignedTo', ''), 'Unassigned'),
      COALESCE(NULLIF(data->>'branchName', ''), NULLIF(data->>'branch', ''), ''),
      COALESCE(NULLIF(data->>'serviceInterest', ''), NULLIF(data->>'service', ''), ''),
      COALESCE(NULLIF(data->>'budget', '')::numeric, 0),
      NULLIF(COALESCE(data->>'lastContactAt', data->>'last_contact_at', ''), '')::timestamptz,
      NULLIF(COALESCE(data->>'nextFollowUpAt', data->>'next_follow_up_at', ''), '')::timestamptz,
      COALESCE(NULLIF(data->>'notes', ''), ''),
      COALESCE(
        data
          - 'fullName' - 'name' - 'email' - 'phone' - 'contactNumber' - 'source' - 'inquirySource' - 'status'
          - 'leadStatus' - 'priority' - 'ownerName' - 'owner' - 'assignedTo' - 'branchName' - 'branch'
          - 'serviceInterest' - 'service' - 'budget' - 'lastContactAt' - 'last_contact_at'
          - 'nextFollowUpAt' - 'next_follow_up_at' - 'notes',
        '{}'::jsonb
      ),
      created_at,
      updated_at
    FROM crm_records
    WHERE resource = 'leads'
    ON CONFLICT (id) DO NOTHING
  `);

  await client.query(`
    INSERT INTO crm_appointments (
      id, customer_id, customer_name, customer_email, phone, service_id, service_name, staff_id, staff_name, branch_name, appointment_at, duration_minutes, status, payment_status, amount_due, amount_paid, balance_remaining, source, notes, check_in_at, completed_at, cancelled_at, metadata, created_at, updated_at
    )
    SELECT
      id,
      COALESCE(NULLIF(data->>'customerId', ''), NULLIF(data->>'clientId', ''), ''),
      COALESCE(NULLIF(data->>'customerName', ''), NULLIF(data->>'customer', ''), 'Guest'),
      COALESCE(NULLIF(data->>'customerEmail', ''), NULLIF(data->>'email', ''), ''),
      COALESCE(NULLIF(data->>'phone', ''), NULLIF(data->>'contactNumber', ''), ''),
      COALESCE(NULLIF(data->>'serviceId', ''), NULLIF(data->>'treatmentId', ''), ''),
      COALESCE(NULLIF(data->>'serviceName', ''), NULLIF(data->>'service', ''), 'Service'),
      COALESCE(NULLIF(data->>'staffId', ''), ''),
      COALESCE(NULLIF(data->>'staffName', ''), NULLIF(data->>'staff', ''), NULLIF(data->>'assignedStaff', ''), 'Unassigned'),
      COALESCE(NULLIF(data->>'branchName', ''), NULLIF(data->>'branch', ''), ''),
      COALESCE(NULLIF(COALESCE(data->>'appointmentAt', data->>'dateTime', data->>'startAt', ''), '')::timestamptz, NOW()),
      COALESCE(NULLIF(data->>'durationMinutes', '')::integer, 60),
      COALESCE(NULLIF(data->>'status', ''), NULLIF(data->>'appointmentStatus', ''), 'Confirmed'),
      COALESCE(NULLIF(data->>'paymentStatus', ''), CASE WHEN COALESCE(NULLIF(data->>'balanceRemaining', '')::numeric, 0) > 0 THEN 'Unpaid' ELSE 'Paid' END),
      COALESCE(NULLIF(data->>'amountDue', '')::numeric, 0),
      COALESCE(NULLIF(data->>'amountPaid', '')::numeric, 0),
      COALESCE(NULLIF(data->>'balanceRemaining', '')::numeric, 0),
      COALESCE(NULLIF(data->>'source', ''), 'CRM'),
      COALESCE(NULLIF(data->>'notes', ''), ''),
      NULLIF(COALESCE(data->>'checkInAt', data->>'check_in_at', ''), '')::timestamptz,
      NULLIF(COALESCE(data->>'completedAt', data->>'completed_at', ''), '')::timestamptz,
      NULLIF(COALESCE(data->>'cancelledAt', data->>'cancelled_at', ''), '')::timestamptz,
      COALESCE(
        data
          - 'customerId' - 'clientId' - 'customerName' - 'customer' - 'customerEmail' - 'email' - 'phone'
          - 'serviceId' - 'treatmentId' - 'serviceName' - 'service' - 'staffId' - 'staffName' - 'staff'
          - 'assignedStaff' - 'branchName' - 'branch' - 'appointmentAt' - 'dateTime' - 'startAt'
          - 'durationMinutes' - 'status' - 'appointmentStatus' - 'paymentStatus' - 'amountDue'
          - 'amountPaid' - 'balanceRemaining' - 'source' - 'notes' - 'checkInAt' - 'check_in_at'
          - 'completedAt' - 'completed_at' - 'cancelledAt' - 'cancelled_at',
        '{}'::jsonb
      ),
      created_at,
      updated_at
    FROM crm_records
    WHERE resource = 'appointments'
    ON CONFLICT (id) DO NOTHING
  `);

  await client.query(`
    INSERT INTO crm_services (
      id, name, category, duration_minutes, price, previous_price, price_review_needed, price_last_updated, price_updated_by, assigned_staff, active, booking_visible, pos_available, description, note, updated_by, bookings_week, bookings_month, revenue_month, last_booked, popularity_rank, package_readiness, metadata, created_at, updated_at
    )
    SELECT
      id,
      COALESCE(NULLIF(data->>'name', ''), NULLIF(data->>'serviceName', ''), NULLIF(data->>'title', ''), 'Untitled Service'),
      COALESCE(NULLIF(data->>'category', ''), NULLIF(data->>'serviceCategory', ''), NULLIF(data->>'service_category', ''), 'General'),
      COALESCE(NULLIF(data->>'durationMinutes', '')::integer, NULLIF(data->>'duration', '')::integer, 60),
      COALESCE(NULLIF(data->>'price', '')::numeric, NULLIF(data->>'amount', '')::numeric, NULLIF(data->>'cost', '')::numeric, 0),
      COALESCE(NULLIF(data->>'previousPrice', '')::numeric, NULLIF(data->>'previous_price', '')::numeric, COALESCE(NULLIF(data->>'price', '')::numeric, NULLIF(data->>'amount', '')::numeric, 0)),
      COALESCE(NULLIF(data->>'priceReviewNeeded', '')::boolean, NULLIF(data->>'price_review_needed', '')::boolean, false),
      NULLIF(COALESCE(data->>'priceLastUpdated', data->>'priceUpdatedAt', data->>'price_updated_at', ''), '')::timestamptz,
      COALESCE(NULLIF(data->>'priceUpdatedBy', ''), NULLIF(data->>'price_updated_by', ''), NULLIF(data->>'updatedBy', ''), 'System Sync'),
      COALESCE(NULLIF(data->>'assignedStaff', ''), NULLIF(data->>'staff', ''), '[]')::jsonb,
      COALESCE(NULLIF(data->>'active', '')::boolean, NULLIF(data->>'isActive', '')::boolean, true),
      COALESCE(NULLIF(data->>'bookingVisible', '')::boolean, NULLIF(data->>'bookable', '')::boolean, true),
      COALESCE(NULLIF(data->>'posAvailable', '')::boolean, NULLIF(data->>'posVisible', '')::boolean, true),
      COALESCE(NULLIF(data->>'description', ''), NULLIF(data->>'summary', ''), ''),
      COALESCE(NULLIF(data->>'note', ''), NULLIF(data->>'notes', ''), ''),
      COALESCE(NULLIF(data->>'updatedBy', ''), NULLIF(data->>'editor', ''), 'System Sync'),
      COALESCE(NULLIF(data->>'bookingsWeek', '')::integer, 0),
      COALESCE(NULLIF(data->>'bookingsMonth', '')::integer, 0),
      COALESCE(NULLIF(data->>'revenueMonth', '')::numeric, 0),
      NULLIF(COALESCE(data->>'lastBooked', data->>'lastBookedAt', data->>'lastBookingAt', ''), '')::timestamptz,
      COALESCE(NULLIF(data->>'popularityRank', '')::integer, 9),
      COALESCE(NULLIF(data->>'packageReadiness', '')::jsonb, '{}'::jsonb),
      COALESCE(
        data
          - 'name' - 'serviceName' - 'title' - 'category' - 'serviceCategory' - 'service_category' - 'duration'
          - 'durationMinutes' - 'duration_minutes' - 'price' - 'cost' - 'amount' - 'previousPrice' - 'previous_price'
          - 'priceReviewNeeded' - 'price_review_needed' - 'priceLastUpdated' - 'priceUpdatedAt' - 'price_updated_at'
          - 'priceUpdatedBy' - 'price_updated_by' - 'assignedStaff' - 'staff' - 'active' - 'isActive'
          - 'bookingVisible' - 'bookable' - 'posAvailable' - 'posVisible' - 'description' - 'summary'
          - 'note' - 'notes' - 'updatedBy' - 'editor' - 'bookingsWeek' - 'bookingsMonth' - 'revenueMonth'
          - 'lastBooked' - 'lastBookedAt' - 'lastBookingAt' - 'popularityRank' - 'packageReadiness',
        '{}'::jsonb
      ),
      created_at,
      updated_at
    FROM crm_records
    WHERE resource = 'services'
    ON CONFLICT (id) DO NOTHING
  `);
};

const MIGRATIONS = [
  {
    id: '001_core_schema',
    up: async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS crm_records (
          resource text NOT NULL,
          id text NOT NULL,
          data jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW(),
          PRIMARY KEY (resource, id)
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS crm_records_resource_updated_idx
        ON crm_records (resource, updated_at DESC)
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS crm_users (
          email text PRIMARY KEY,
          password_hash text NOT NULL,
          role text NOT NULL DEFAULT 'admin',
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS crm_branches (
          id text PRIMARY KEY,
          name text NOT NULL,
          manager_name text NOT NULL DEFAULT '',
          city text NOT NULL DEFAULT '',
          state text NOT NULL DEFAULT '',
          phone text NOT NULL DEFAULT '',
          email text NOT NULL DEFAULT '',
          hours text NOT NULL DEFAULT '',
          status text NOT NULL DEFAULT 'Planning',
          active boolean NOT NULL DEFAULT false,
          rooms integer NOT NULL DEFAULT 0,
          team_size integer NOT NULL DEFAULT 0,
          notes text NOT NULL DEFAULT '',
          metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS crm_branches_updated_idx
        ON crm_branches (updated_at DESC)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS crm_branches_status_idx
        ON crm_branches (status)
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS crm_leads (
          id text PRIMARY KEY,
          full_name text NOT NULL,
          email text NOT NULL DEFAULT '',
          phone text NOT NULL DEFAULT '',
          source text NOT NULL DEFAULT 'Website Form',
          status text NOT NULL DEFAULT 'New',
          priority text NOT NULL DEFAULT 'Normal',
          owner_name text NOT NULL DEFAULT 'Unassigned',
          branch_name text NOT NULL DEFAULT '',
          service_interest text NOT NULL DEFAULT '',
          budget numeric(12,2) NOT NULL DEFAULT 0,
          last_contact_at timestamptz NULL,
          next_follow_up_at timestamptz NULL,
          notes text NOT NULL DEFAULT '',
          metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS crm_leads_updated_idx
        ON crm_leads (updated_at DESC)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS crm_leads_status_idx
        ON crm_leads (status)
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS crm_appointments (
          id text PRIMARY KEY,
          customer_id text NOT NULL DEFAULT '',
          customer_name text NOT NULL,
          customer_email text NOT NULL DEFAULT '',
          phone text NOT NULL DEFAULT '',
          service_id text NOT NULL DEFAULT '',
          service_name text NOT NULL,
          staff_id text NOT NULL DEFAULT '',
          staff_name text NOT NULL DEFAULT 'Unassigned',
          branch_name text NOT NULL DEFAULT '',
          appointment_at timestamptz NOT NULL,
          duration_minutes integer NOT NULL DEFAULT 60,
          status text NOT NULL DEFAULT 'Confirmed',
          payment_status text NOT NULL DEFAULT 'Unpaid',
          amount_due numeric(12,2) NOT NULL DEFAULT 0,
          amount_paid numeric(12,2) NOT NULL DEFAULT 0,
          balance_remaining numeric(12,2) NOT NULL DEFAULT 0,
          source text NOT NULL DEFAULT 'CRM',
          notes text NOT NULL DEFAULT '',
          check_in_at timestamptz NULL,
          completed_at timestamptz NULL,
          cancelled_at timestamptz NULL,
          metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS crm_appointments_at_idx
        ON crm_appointments (appointment_at DESC)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS crm_appointments_status_idx
        ON crm_appointments (status)
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS crm_services (
          id text PRIMARY KEY,
          name text NOT NULL,
          category text NOT NULL DEFAULT 'General',
          duration_minutes integer NOT NULL DEFAULT 60,
          price numeric(12,2) NOT NULL DEFAULT 0,
          previous_price numeric(12,2) NOT NULL DEFAULT 0,
          price_review_needed boolean NOT NULL DEFAULT false,
          price_last_updated timestamptz NOT NULL DEFAULT NOW(),
          price_updated_by text NOT NULL DEFAULT 'System Sync',
          assigned_staff jsonb NOT NULL DEFAULT '[]'::jsonb,
          active boolean NOT NULL DEFAULT true,
          booking_visible boolean NOT NULL DEFAULT true,
          pos_available boolean NOT NULL DEFAULT true,
          description text NOT NULL DEFAULT '',
          note text NOT NULL DEFAULT '',
          updated_by text NOT NULL DEFAULT 'System Sync',
          bookings_week integer NOT NULL DEFAULT 0,
          bookings_month integer NOT NULL DEFAULT 0,
          revenue_month numeric(12,2) NOT NULL DEFAULT 0,
          last_booked timestamptz NULL,
          popularity_rank integer NOT NULL DEFAULT 9,
          package_readiness jsonb NOT NULL DEFAULT '{}'::jsonb,
          metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS crm_services_updated_idx
        ON crm_services (updated_at DESC)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS crm_services_category_idx
        ON crm_services (category)
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS crm_settings (
          id text PRIMARY KEY,
          data jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW()
        )
      `);
    },
  },
  {
    id: '002_seed_settings',
    up: async (client) => {
      await client.query(
        `
          INSERT INTO crm_settings (id, data)
          VALUES ($1, $2::jsonb)
          ON CONFLICT (id) DO NOTHING
        `,
        [SETTINGS_ROW_ID, '{}'],
      );
    },
  },
  {
    id: '003_backfill_structured_resources',
    up: async (client) => {
      await migrateStructuredRecords(client);
    },
  },
  {
    id: '004_services_structured',
    up: async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS crm_services (
          id text PRIMARY KEY,
          name text NOT NULL,
          category text NOT NULL DEFAULT 'General',
          duration_minutes integer NOT NULL DEFAULT 60,
          price numeric(12,2) NOT NULL DEFAULT 0,
          previous_price numeric(12,2) NOT NULL DEFAULT 0,
          price_review_needed boolean NOT NULL DEFAULT false,
          price_last_updated timestamptz NOT NULL DEFAULT NOW(),
          price_updated_by text NOT NULL DEFAULT 'System Sync',
          assigned_staff jsonb NOT NULL DEFAULT '[]'::jsonb,
          active boolean NOT NULL DEFAULT true,
          booking_visible boolean NOT NULL DEFAULT true,
          pos_available boolean NOT NULL DEFAULT true,
          description text NOT NULL DEFAULT '',
          note text NOT NULL DEFAULT '',
          updated_by text NOT NULL DEFAULT 'System Sync',
          bookings_week integer NOT NULL DEFAULT 0,
          bookings_month integer NOT NULL DEFAULT 0,
          revenue_month numeric(12,2) NOT NULL DEFAULT 0,
          last_booked timestamptz NULL,
          popularity_rank integer NOT NULL DEFAULT 9,
          package_readiness jsonb NOT NULL DEFAULT '{}'::jsonb,
          metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS crm_services_updated_idx
        ON crm_services (updated_at DESC)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS crm_services_category_idx
        ON crm_services (category)
      `);

      await migrateStructuredRecords(client);
    },
  },
];

const runMigrations = async (client) => {
  const { rows } = await client.query('SELECT id FROM schema_migrations ORDER BY id');
  const applied = new Set(rows.map((row) => row.id));

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;

    await client.query('BEGIN');
    try {
      await migration.up(client);
      await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [migration.id]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
};

export const ensureSchema = async () => {
  ensureDatabaseUrl();

  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT NOW()
      )
    `);
    await runMigrations(client);
  } finally {
    client.release();
  }
};

export const closeDatabase = async () => {
  await pool.end();
};

export const upsertUser = async ({ email, passwordHash, role = 'admin' }) => {
  const normalizedEmail = normalizeText(email).toLowerCase();

  if (!normalizedEmail) {
    const error = new Error('User email is required.');
    error.statusCode = 400;
    throw error;
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
  );

  return rows[0];
};

export const findUserByEmail = async (email) => {
  const normalizedEmail = normalizeText(email).toLowerCase();
  if (!normalizedEmail) return null;

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
  );

  return rows[0] || null;
};

const listGenericRecords = async (resource, query = {}) => {
  const { rows } = await pool.query(
    `
      SELECT resource, id, data, created_at, updated_at
      FROM crm_records
      WHERE resource = $1
      ORDER BY updated_at DESC, created_at DESC
    `,
    [resource],
  );

  return applyQueryFilters(rows.map(toRecordView), query);
};

const getGenericRecord = async (resource, id) => {
  const { rows } = await pool.query(
    `
      SELECT resource, id, data, created_at, updated_at
      FROM crm_records
      WHERE resource = $1 AND id = $2
      LIMIT 1
    `,
    [resource, id],
  );

  return rows[0] ? toRecordView(rows[0]) : null;
};

const upsertGenericRecord = async (resource, payload, existing = null) => {
  const body = stripReservedFields(payload);
  const id = normalizeText(payload?.id || existing?.id || randomUUID());
  const createdAt = existing?.createdAt ? new Date(existing.createdAt) : new Date();
  const now = new Date();

  const { rows } = await pool.query(
    `
      INSERT INTO crm_records (resource, id, data, created_at, updated_at)
      VALUES ($1, $2, $3::jsonb, $4, $5)
      ON CONFLICT (resource, id) DO UPDATE
        SET data = EXCLUDED.data,
            updated_at = EXCLUDED.updated_at
      RETURNING resource, id, data, created_at, updated_at
    `,
    [resource, id, JSON.stringify(body), createdAt, now],
  );

  return toRecordView(rows[0]);
};

const deleteGenericRecord = async (resource, id) => {
  const { rowCount } = await pool.query(
    `
      DELETE FROM crm_records
      WHERE resource = $1 AND id = $2
    `,
    [resource, id],
  );

  return rowCount;
};

export const listRecords = async (resource, query = {}) => {
  const normalizedResource = normalizeText(resource).toLowerCase();

  if (normalizedResource === 'reports') {
    return buildReportRows();
  }

  if (['appointments', 'branches', 'leads', 'services'].includes(normalizedResource)) {
    return listStructuredRows(normalizedResource, query);
  }

  if (!RESOURCE_NAMES.includes(normalizedResource)) {
    const error = new Error(`Unknown CRM resource: ${resource}`);
    error.statusCode = 404;
    throw error;
  }

  return listGenericRecords(normalizedResource, query);
};

export const getRecord = async (resource, id) => {
  const normalizedResource = normalizeText(resource).toLowerCase();

  if (normalizedResource === 'reports') {
    const rows = await buildReportRows();
    return rows.find((row) => row.id === id) || null;
  }

  if (['appointments', 'branches', 'leads', 'services'].includes(normalizedResource)) {
    return getStructuredRecord(normalizedResource, id);
  }

  if (!RESOURCE_NAMES.includes(normalizedResource)) {
    const error = new Error(`Unknown CRM resource: ${resource}`);
    error.statusCode = 404;
    throw error;
  }

  return getGenericRecord(normalizedResource, id);
};

export const createRecord = async (resource, payload) => {
  const normalizedResource = normalizeText(resource).toLowerCase();

  if (!WRITABLE_RESOURCES.has(normalizedResource)) {
    const error = new Error(`The ${normalizedResource} resource is read-only.`);
    error.statusCode = 405;
    throw error;
  }

  if (['appointments', 'branches', 'leads', 'services'].includes(normalizedResource)) {
    return upsertStructuredRecord(normalizedResource, payload);
  }

  return upsertGenericRecord(normalizedResource, payload);
};

export const updateRecord = async (resource, id, patch) => {
  const normalizedResource = normalizeText(resource).toLowerCase();

  if (!WRITABLE_RESOURCES.has(normalizedResource)) {
    const error = new Error(`The ${normalizedResource} resource is read-only.`);
    error.statusCode = 405;
    throw error;
  }

  if (['appointments', 'branches', 'leads', 'services'].includes(normalizedResource)) {
    const current = await getStructuredRecord(normalizedResource, id);
    if (!current) {
      const error = new Error(`${normalizedResource} record not found.`);
      error.statusCode = 404;
      throw error;
    }
    return upsertStructuredRecord(normalizedResource, { ...current, ...patch, id }, current);
  }

  const current = await getGenericRecord(normalizedResource, id);
  if (!current) {
    const error = new Error(`${normalizedResource} record not found.`);
    error.statusCode = 404;
    throw error;
  }

  const merged = {
    ...stripReservedFields(current),
    ...stripReservedFields(patch),
  };

  return upsertGenericRecord(normalizedResource, { ...merged, id }, current);
};

export const deleteRecord = async (resource, id) => {
  const normalizedResource = normalizeText(resource).toLowerCase();

  if (!WRITABLE_RESOURCES.has(normalizedResource)) {
    const error = new Error(`The ${normalizedResource} resource is read-only.`);
    error.statusCode = 405;
    throw error;
  }

  const rowCount = ['appointments', 'branches', 'leads', 'services'].includes(normalizedResource)
    ? await deleteStructuredRecord(normalizedResource, id)
    : await deleteGenericRecord(normalizedResource, id);

  if (rowCount === 0) {
    const error = new Error(`${normalizedResource} record not found.`);
    error.statusCode = 404;
    throw error;
  }
};

export const getSettings = async () => {
  const { rows } = await pool.query(
    `
      SELECT id, data, created_at, updated_at
      FROM crm_settings
      WHERE id = $1
      LIMIT 1
    `,
    [SETTINGS_ROW_ID],
  );

  if (!rows[0]) {
    return saveSettings({});
  }

  return settingsRowToView(rows[0]);
};

export const saveSettings = async (payload) => {
  const normalized = normalizeSettingsDocument(payload);
  const now = new Date();

  const { rows } = await pool.query(
    `
      INSERT INTO crm_settings (id, data, created_at, updated_at)
      VALUES ($1, $2::jsonb, $3, $4)
      ON CONFLICT (id) DO UPDATE
        SET data = EXCLUDED.data,
            updated_at = EXCLUDED.updated_at
      RETURNING id, data, created_at, updated_at
    `,
    [SETTINGS_ROW_ID, JSON.stringify(normalized), now, now],
  );

  return settingsRowToView(rows[0]);
};

export const buildReportRows = async () => {
  const [appointments, payments, customers, services, staff, leads, branches] = await Promise.all([
    listRecords('appointments'),
    listRecords('payments'),
    listRecords('customers'),
    listRecords('services'),
    listRecords('staff'),
    listRecords('leads'),
    listRecords('branches'),
  ]);

    const totalSales = sumBy(payments, (payment) => payment.amountPaid ?? payment.totalPaid ?? payment.amountDue ?? payment.total ?? 0);
  const totalAppointments = appointments.length;
  const completedAppointments = appointments.filter((appointment) => asLower(appointment.status) === 'completed').length;
  const cancelledAppointments = appointments.filter((appointment) => asLower(appointment.status).includes('cancel')).length;
  const pendingPayments = payments.filter((payment) => Number(payment.balanceRemaining ?? payment.balance ?? 0) > 0).length;
  const cashCollected = sumBy(
    payments.filter((payment) => asLower(payment.method) === 'cash'),
    (payment) => payment.amountPaid ?? payment.totalPaid ?? 0,
  );
  const averageBillValue = payments.length
    ? Math.round(sumBy(payments, (payment) => payment.amountDue ?? payment.totalDue ?? payment.amountPaid ?? 0) / payments.length)
    : 0;
  const repeatCustomers = customers.length
    ? Math.round(
        (customers.filter((customer) => Number(customer.totalVisits ?? customer.visits ?? 0) > 1).length / customers.length) * 100,
      )
    : 0;
  const overduePayments = sumBy(
    payments.filter((payment) => Number(payment.balanceRemaining ?? payment.balance ?? 0) > 0),
    (payment) => payment.balanceRemaining ?? payment.balance ?? 0,
  );
  const partialPayments = payments.filter(
    (payment) => asLower(payment.status) === 'partial' || (Number(payment.amountPaid ?? 0) > 0 && Number(payment.balanceRemaining ?? payment.balance ?? 0) > 0),
  ).length;
  const receipts = payments.length;
  const serviceCount = services.length;
  const newCustomers = customers.filter((customer) => Number(customer.totalVisits ?? customer.visits ?? 0) <= 1).length;
  const inactiveCustomers = customers.filter((customer) => {
    if (asLower(customer.status).includes('inactive')) return true;
    return customer.active === false || Number(customer.totalVisits ?? customer.visits ?? 0) === 0;
  }).length;
  const completionRate = totalAppointments ? Math.round((completedAppointments / totalAppointments) * 100) : 0;

  const serviceCounts = countBy(appointments, (appointment) => appointment.serviceName || appointment.service || appointment.treatment || 'Unknown Service');
  const staffCounts = countBy(appointments, (appointment) => appointment.staffName || appointment.assignedStaff || appointment.staff || 'Unassigned');
  const branchCounts = countBy(appointments, (appointment) => appointment.branchName || appointment.branch || 'Main Branch');
  const leadSources = countBy(leads, (lead) => lead.source || 'Unknown');
  const openLeads = leads.filter((lead) => !['booked', 'lost'].includes(asLower(lead.status))).length;
  const bookedLeads = leads.filter((lead) => asLower(lead.status) === 'booked').length;
  const leadConversionRate = leads.length ? Math.round((bookedLeads / leads.length) * 100) : 0;
  const activeBranches = branches.filter((branch) => branch.active !== false && !['closed', 'inactive'].includes(asLower(branch.status))).length;

  const salesByDay = new Map();

  payments.forEach((payment) => {
    const paymentDate = payment.paymentDate || payment.createdAt || payment.updatedAt;
    const dayKey = toDayKey(paymentDate);
    if (!dayKey) return;
    salesByDay.set(dayKey, (salesByDay.get(dayKey) || 0) + Number(payment.amountPaid ?? payment.totalPaid ?? 0));
  });

  let highestSalesDay = 'No sales data';
  let highestSalesTotal = 0;
  for (const [dayKey, total] of salesByDay.entries()) {
    if (total >= highestSalesTotal) {
      highestSalesTotal = total;
      highestSalesDay = formatDayName(dayKey);
    }
  }

  const topServiceEntry = [...serviceCounts.entries()].sort((left, right) => right[1] - left[1])[0];
  const topStaffEntry = [...staffCounts.entries()].sort((left, right) => right[1] - left[1])[0];
  const topBranchEntry = [...branchCounts.entries()].sort((left, right) => right[1] - left[1])[0];
  const topLeadSourceEntry = [...leadSources.entries()].sort((left, right) => right[1] - left[1])[0];

  return [
    { id: 'report-total-sales', label: 'Total Sales', value: totalSales, amount: totalSales, total: totalSales },
    { id: 'report-appointments', label: 'Appointments', value: totalAppointments, count: totalAppointments },
    { id: 'report-completed', label: 'Completed', value: completedAppointments, count: completedAppointments },
    { id: 'report-cancelled', label: 'Cancelled', value: cancelledAppointments, count: cancelledAppointments },
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
    { id: 'report-active-branches', label: 'Active Branches', value: activeBranches, count: activeBranches },
    { id: 'report-open-leads', label: 'Open Leads', value: openLeads, count: openLeads },
    { id: 'report-conversion-rate', label: 'Lead Conversion Rate', value: leadConversionRate, count: leadConversionRate },
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
    {
      id: 'report-top-branch',
      label: 'Top Branch',
      value: topBranchEntry ? topBranchEntry[0] : branches[0]?.name || 'No branch data',
    },
    {
      id: 'report-top-source',
      label: 'Top Lead Source',
      value: topLeadSourceEntry ? topLeadSourceEntry[0] : leads[0]?.source || 'No lead data',
    },
    { id: 'report-highest-sales-day', label: 'Highest Sales Day', value: highestSalesDay },
    { id: 'report-highest-sales-total', label: 'Highest Sales Total', value: highestSalesTotal, amount: highestSalesTotal },
  ];
};
