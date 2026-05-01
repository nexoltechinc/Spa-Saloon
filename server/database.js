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
  'users',
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

const normalizeDateOnly = (value, fallback = '') => {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString().slice(0, 10);
};

const normalizeTimeOnly = (value, fallback = '') => {
  if (!value) return fallback;
  const text = String(value).trim();
  if (!text) return fallback;

  if (/^\d{2}:\d{2}(:\d{2})?$/.test(text)) {
    return text.length === 5 ? `${text}:00` : text;
  }

  const date = new Date(`1970-01-01T${text}`);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString().slice(11, 19);
};

const normalizeJsonObject = (value, fallback = {}) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...fallback };
  }

  return { ...value };
};

const normalizeJsonArray = (value, fallback = []) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === null || value === undefined || value === '') {
    return [...fallback];
  }

  return [value];
};

const deriveCode = (value, fallback = 'BR') => {
  const raw = String(value || '').trim();
  const normalized = raw
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();

  return normalized || fallback;
};

const uniqueBy = (items) => [...new Set(items.filter(Boolean))];

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

  const keys = new Set([
    'status',
    'branch',
    'branchId',
    'branchName',
    'city',
    'manager',
    'managerName',
    'customerId',
    'customerName',
    'appointmentId',
    'serviceId',
    'serviceName',
    'staffId',
    'staffName',
    'ownerName',
    'email',
    'phone',
    'method',
    'paymentStatus',
    'receiptStatus',
    'receiptNumber',
    'priority',
    'role',
    'source',
    ...filterKeys,
  ]);

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
  'code',
  'name',
  'branchName',
  'managerName',
  'manager',
  'city',
  'address',
  'state',
  'phone',
  'email',
  'hours',
  'openingHours',
  'openingHoursJson',
  'opening_hours_json',
  'status',
  'active',
  'isActive',
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
  'branchId',
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
  'assignedToUserId',
  'branchName',
  'branch',
  'interestedServiceId',
  'interestedServiceName',
  'serviceInterest',
  'interestedService',
  'budget',
  'lastContactAt',
  'followUpAt',
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
  'branchId',
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
  'bookedByUserId',
  'branchName',
  'branch',
  'leadId',
  'appointmentAt',
  'appointmentDate',
  'startTime',
  'endTime',
  'dateTime',
  'durationMinutes',
  'status',
  'paymentStatus',
  'amountDue',
  'amountPaid',
  'balanceRemaining',
  'source',
  'bookingSource',
  'notes',
  'checkInAt',
  'completedAt',
  'cancelledAt',
  'publicBookingReference',
  'public_booking_reference',
  'metadata',
];

const serviceReservedKeys = [
  'id',
  'resource',
  'createdAt',
  'updatedAt',
  'created_at',
  'updated_at',
  'branchId',
  'branchName',
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
  'discountPrice',
  'discount_price',
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
  'isBookable',
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

const _customerReservedKeys = [
  'id',
  'resource',
  'createdAt',
  'updatedAt',
  'created_at',
  'updated_at',
  'branchId',
  'branchName',
  'fullName',
  'name',
  'phone',
  'email',
  'gender',
  'dateOfBirth',
  'date_of_birth',
  'customerSource',
  'source',
  'notes',
  'notesJson',
  'loyaltyPoints',
  'totalSpent',
  'totalSpend',
  'lastVisitAt',
  'lastVisit',
  'isActive',
  'segment',
  'status',
  'membership',
  'visitCount',
  'pendingBalance',
  'favoriteService',
  'favoriteStaff',
  'preferredTimes',
  'preferredChannel',
  'sensitivities',
  'upcomingAppointment',
  'upcomingAppointmentJson',
  'appointmentHistory',
  'appointmentHistoryJson',
  'paymentHistory',
  'paymentHistoryJson',
  'activityTimeline',
  'activityTimelineJson',
  'preferences',
  'preferencesJson',
  'metadata',
];

const _staffReservedKeys = [
  'id',
  'resource',
  'createdAt',
  'updatedAt',
  'created_at',
  'updated_at',
  'branchId',
  'branchName',
  'fullName',
  'name',
  'role',
  'phone',
  'email',
  'employmentType',
  'shiftLabel',
  'bio',
  'isActive',
  'onDuty',
  'employmentStatus',
  'shiftStatus',
  'leaveStatus',
  'workingHours',
  'weeklyAvailability',
  'weeklyAvailabilityJson',
  'todaySchedule',
  'todayScheduleJson',
  'nextAppointment',
  'nextAppointmentJson',
  'appointmentsToday',
  'capacityToday',
  'appointmentsCompletedWeek',
  'notes',
  'services',
  'assignedServices',
  'metadata',
];

const _paymentReservedKeys = [
  'id',
  'resource',
  'createdAt',
  'updatedAt',
  'created_at',
  'updated_at',
  'branchId',
  'branchName',
  'appointmentId',
  'customerId',
  'customerName',
  'customerEmail',
  'serviceName',
  'amount',
  'amountDue',
  'amountPaid',
  'balanceRemaining',
  'method',
  'paymentMethod',
  'status',
  'paymentStatus',
  'paymentDate',
  'dueDate',
  'recordedByUserId',
  'recordedBy',
  'recordedByName',
  'editedBy',
  'editedByName',
  'notes',
  'referenceNumber',
  'receiptStatus',
  'receiptId',
  'receiptNumber',
  'receiptGeneratedAt',
  'receiptPrintedAt',
  'receiptDownloadedAt',
  'receiptEmailedAt',
  'metadata',
];

const _receiptReservedKeys = [
  'id',
  'resource',
  'createdAt',
  'updatedAt',
  'created_at',
  'updated_at',
  'branchId',
  'branchName',
  'paymentId',
  'appointmentId',
  'customerId',
  'issuedByUserId',
  'receiptNumber',
  'receiptStatus',
  'deliveryMethod',
  'issuedAt',
  'subtotal',
  'taxAmount',
  'discountAmount',
  'totalAmount',
  'customerName',
  'customerEmail',
  'customerPhone',
  'serviceName',
  'paymentMethod',
  'brandingSnapshot',
  'brandingSnapshotJson',
  'lineItems',
  'lineItemsJson',
  'notes',
  'metadata',
];

const _userReservedKeys = [
  'id',
  'resource',
  'createdAt',
  'updatedAt',
  'created_at',
  'updated_at',
  'fullName',
  'name',
  'email',
  'passwordHash',
  'role',
  'phone',
  'branchId',
  'isActive',
  'lastLoginAt',
  'metadata',
];

const _publicBookingReservedKeys = [
  'id',
  'resource',
  'createdAt',
  'updatedAt',
  'created_at',
  'updated_at',
  'branchId',
  'branchName',
  'fullName',
  'name',
  'phone',
  'email',
  'requestedServiceId',
  'requestedServiceName',
  'requestedDate',
  'requestedTime',
  'notes',
  'status',
  'convertedCustomerId',
  'convertedAppointmentId',
  'bookingSource',
  'referenceCode',
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
  const openingHoursJson = normalizeJsonArray(source.openingHoursJson ?? source.opening_hours_json ?? existing.openingHoursJson ?? existing.opening_hours_json, normalizeJsonArray(existing.openingHoursJson || existing.opening_hours_json || []));

  return {
    code: deriveCode(source.code ?? existing.code ?? name, existing.code || deriveCode(name, 'BR')),
    name,
    branchName: name,
    managerName: normalizeText(source.managerName ?? source.manager ?? existing.managerName, existing.managerName || 'Unassigned'),
    city: normalizeText(source.city, existing.city || ''),
    address: normalizeText(source.address, existing.address || ''),
    state: normalizeText(source.state, existing.state || ''),
    phone: normalizeText(source.phone, existing.phone || ''),
    email: normalizeText(source.email, existing.email || ''),
    hours: normalizeText(source.hours, existing.hours || ''),
    openingHoursJson,
    openingHours: openingHoursJson,
    status,
    active,
    isActive: active,
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
    branchId: normalizeText(source.branchId ?? source.branch_id ?? existing.branchId, existing.branchId || ''),
    fullName,
    name: fullName,
    email: normalizeText(source.email, existing.email || ''),
    phone: normalizeText(source.phone ?? source.contactNumber, existing.phone || ''),
    source: normalizeText(source.source ?? source.inquirySource, existing.source || 'Website Form'),
    status: normalizeText(source.status ?? source.leadStatus, existing.status || 'New'),
    priority: normalizeText(source.priority ?? source.followUpState, existing.priority || 'Normal'),
    ownerName: normalizeText(source.ownerName ?? source.owner ?? source.assignedStaff ?? source.assignedTo, existing.ownerName || 'Unassigned'),
    assignedToUserId: normalizeText(source.assignedToUserId ?? source.assigned_to_user_id, existing.assignedToUserId || ''),
    branchName: normalizeText(source.branchName ?? source.branch, existing.branchName || ''),
    interestedServiceId: normalizeText(source.interestedServiceId ?? source.interested_service_id, existing.interestedServiceId || ''),
    interestedServiceName: normalizeText(source.interestedServiceName ?? source.interested_service_name, existing.interestedServiceName || ''),
    serviceInterest: normalizeText(source.serviceInterest ?? source.service ?? source.requestedService, existing.serviceInterest || ''),
    interestedService: normalizeText(source.interestedService ?? source.serviceInterest ?? source.service ?? source.requestedService, existing.interestedService || existing.serviceInterest || ''),
    budget: Math.max(0, normalizeNumber(source.budget ?? source.estimatedValue, existing.budget ?? 0)),
    lastContactAt: normalizeDateString(source.lastContactAt ?? source.last_contact_at, existing.lastContactAt || ''),
    nextFollowUpAt: normalizeDateString(source.nextFollowUpAt ?? source.next_follow_up_at, existing.nextFollowUpAt || ''),
    followUpAt: normalizeDateString(source.followUpAt ?? source.follow_up_at ?? source.nextFollowUpAt, existing.followUpAt || existing.nextFollowUpAt || ''),
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
  const appointmentDate = normalizeDateOnly(source.appointmentDate ?? source.appointment_date ?? appointmentAt, existing.appointmentDate || '');
  const startTime = normalizeTimeOnly(source.startTime ?? source.start_time, existing.startTime || '');
  const endTime = normalizeTimeOnly(source.endTime ?? source.end_time, existing.endTime || '');

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
  const checkedIn = ['arrived', 'checked in', 'check in', 'in progress', 'inprogress'].includes(asLower(status));
  const checkInAt = checkedIn
    ? normalizeDateString(source.checkInAt ?? existing.checkInAt, new Date().toISOString())
    : normalizeDateString(source.checkInAt, existing.checkInAt || '');
  const completedAt = status === 'Completed'
    ? normalizeDateString(source.completedAt ?? existing.completedAt, new Date().toISOString())
    : normalizeDateString(source.completedAt, existing.completedAt || '');
  const cancelledAt = status === 'Cancelled'
    ? normalizeDateString(source.cancelledAt ?? existing.cancelledAt, new Date().toISOString())
    : normalizeDateString(source.cancelledAt, existing.cancelledAt || '');

  return {
    branchId: normalizeText(source.branchId ?? source.branch_id, existing.branchId || ''),
    customerId: normalizeText(source.customerId ?? source.clientId, existing.customerId || ''),
    customerName,
    customerEmail: normalizeText(source.customerEmail ?? source.email, existing.customerEmail || ''),
    phone: normalizeText(source.phone ?? source.contactNumber, existing.phone || ''),
    serviceId: normalizeText(source.serviceId ?? source.treatmentId, existing.serviceId || ''),
    serviceName,
    staffId: normalizeText(source.staffId, existing.staffId || ''),
    staffName: normalizeText(source.staffName ?? source.staff ?? source.assignedStaff ?? source.therapist, existing.staffName || 'Unassigned'),
    branchName: normalizeText(source.branchName ?? source.branch, existing.branchName || ''),
    leadId: normalizeText(source.leadId ?? source.lead_id, existing.leadId || ''),
    bookedByUserId: normalizeText(source.bookedByUserId ?? source.booked_by_user_id, existing.bookedByUserId || ''),
    appointmentAt,
    appointmentDate,
    startTime,
    endTime,
    durationMinutes: Math.max(0, Math.round(normalizeNumber(source.durationMinutes ?? source.duration, existing.durationMinutes ?? 60))),
    status,
    paymentStatus,
    amountDue,
    amountPaid,
    balanceRemaining,
    source: normalizeText(source.source, existing.source || 'CRM'),
    bookingSource: normalizeText(source.bookingSource ?? source.source, existing.bookingSource || existing.source || 'CRM'),
    notes: normalizeText(source.notes, existing.notes || ''),
    checkInAt,
    completedAt,
    cancelledAt,
    publicBookingReference: normalizeText(source.publicBookingReference ?? source.public_booking_reference, existing.publicBookingReference || ''),
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
  const discountPriceValue = source.discountPrice ?? source.discount_price ?? existing.discountPrice ?? existing.discount_price;
  const discountPrice = discountPriceValue === null || discountPriceValue === undefined || discountPriceValue === ''
    ? null
    : Math.max(0, normalizeNumber(discountPriceValue, normalizeNumber(existing.discountPrice ?? existing.discount_price ?? 0)));
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
  const _isActive = normalizeBoolean(source.isActive ?? source.active, existing.isActive ?? active);
  const isBookable = normalizeBoolean(source.isBookable ?? source.bookable ?? source.bookingVisible, existing.isBookable ?? existing.bookingVisible ?? true);
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
    branchId: normalizeText(source.branchId ?? source.branch_id, existing.branchId || ''),
    branchName: normalizeText(source.branchName ?? source.branch, existing.branchName || ''),
    name,
    serviceName: name,
    title: name,
    category,
    serviceCategory: category,
    duration,
    durationMinutes: duration,
    price,
    discountPrice,
    discount_price: discountPrice,
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
    isBookable,
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

const normalizeLabelList = (value, fallback = []) =>
  uniqueBy(
    normalizeJsonArray(value, fallback).map((item) => normalizeText(
      typeof item === 'object' && item !== null
        ? item.name ?? item.fullName ?? item.serviceName ?? item.title ?? item.label ?? item.id
        : item,
    )),
  ).filter(Boolean);

const normalizeCustomerInput = (payload, existing = {}) => {
  const source = ensureObject(payload);
  const fullName = normalizeText(source.fullName ?? source.name ?? source.customerName ?? existing.fullName, normalizeText(existing.fullName));

  if (!fullName) {
    const error = new Error('Customer name is required.');
    error.statusCode = 400;
    throw error;
  }

  const notesJson = normalizeJsonArray(
    source.notesJson ?? source.notes_json ?? (Array.isArray(source.notes) ? source.notes : undefined),
    normalizeJsonArray(existing.notesJson || existing.notes_json || []),
  ).map((entry, index) => {
    if (typeof entry === 'object' && entry !== null && !Array.isArray(entry)) {
      return {
        id: normalizeText(entry.id, `${fullName}-${index + 1}`),
        at: normalizeDateString(entry.at ?? entry.createdAt ?? entry.timestamp, toIso(existing.updatedAt) || new Date().toISOString()),
        author: normalizeText(entry.author ?? entry.createdBy, 'System'),
        text: normalizeText(entry.text ?? entry.note, ''),
      };
    }

    return {
      id: `${fullName}-${index + 1}`,
      at: new Date().toISOString(),
      author: 'System',
      text: normalizeText(entry, ''),
    };
  });

  const upcomingAppointment = normalizeJsonObject(source.upcomingAppointment ?? source.upcomingAppointmentJson ?? source.upcoming_appointment_json ?? existing.upcomingAppointment ?? existing.upcomingAppointmentJson);
  const appointmentHistory = normalizeJsonArray(source.appointmentHistory ?? source.appointmentHistoryJson ?? source.appointment_history_json, normalizeJsonArray(existing.appointmentHistory || existing.appointmentHistoryJson || []));
  const paymentHistory = normalizeJsonArray(source.paymentHistory ?? source.paymentHistoryJson ?? source.payment_history_json, normalizeJsonArray(existing.paymentHistory || existing.paymentHistoryJson || []));
  const activityTimeline = normalizeJsonArray(source.activityTimeline ?? source.activityTimelineJson ?? source.activity_timeline_json, normalizeJsonArray(existing.activityTimeline || existing.activityTimelineJson || []));
  const preferences = normalizeJsonArray(source.preferences ?? source.preferencesJson ?? source.preferences_json, normalizeJsonArray(existing.preferences || existing.preferencesJson || []));

  return {
    branchId: normalizeText(source.branchId ?? source.branch_id, existing.branchId || ''),
    branchName: normalizeText(source.branchName ?? source.branch, existing.branchName || ''),
    fullName,
    name: fullName,
    phone: normalizeText(source.phone ?? source.contactPhone, existing.phone || ''),
    email: normalizeText(source.email ?? source.customerEmail, existing.email || '').toLowerCase(),
    gender: normalizeText(source.gender, existing.gender || ''),
    dateOfBirth: normalizeDateOnly(source.dateOfBirth ?? source.date_of_birth, existing.dateOfBirth || ''),
    customerSource: normalizeText(source.customerSource ?? source.source ?? source.acquisitionSource, existing.customerSource || existing.source || 'Website Form'),
    source: normalizeText(source.source ?? source.customerSource ?? source.acquisitionSource, existing.source || 'Website Form'),
    notes: Array.isArray(source.notes) ? normalizeText(source.notesText, existing.notes || '') : normalizeText(source.notes ?? source.notesText, existing.notes || ''),
    notesJson,
    loyaltyPoints: Math.max(0, Math.round(normalizeNumber(source.loyaltyPoints ?? source.loyalty_points, existing.loyaltyPoints ?? 0))),
    totalSpent: Math.max(0, normalizeNumber(source.totalSpent ?? source.totalSpend ?? source.total_spent, existing.totalSpent ?? existing.totalSpent ?? 0)),
    totalSpend: Math.max(0, normalizeNumber(source.totalSpend ?? source.totalSpent ?? source.total_spent, existing.totalSpend ?? existing.totalSpent ?? 0)),
    lastVisitAt: normalizeDateString(source.lastVisitAt ?? source.lastVisit ?? source.last_visit_at, existing.lastVisitAt || existing.lastVisit || ''),
    isActive: normalizeBoolean(source.isActive ?? source.active, existing.isActive ?? true),
    segment: normalizeText(source.segment, existing.segment || 'New Customer'),
    status: normalizeText(source.status, existing.status || 'Active'),
    membership: normalizeText(source.membership, existing.membership || 'None'),
    visitCount: Math.max(0, Math.round(normalizeNumber(source.visitCount ?? source.visits, existing.visitCount ?? 0))),
    pendingBalance: Math.max(0, normalizeNumber(source.pendingBalance ?? source.balance, existing.pendingBalance ?? 0)),
    favoriteService: normalizeText(source.favoriteService ?? source.favouriteService, existing.favoriteService || ''),
    favoriteStaff: normalizeText(source.favoriteStaff ?? source.favouriteStaff, existing.favoriteStaff || ''),
    preferredTimes: normalizeText(source.preferredTimes, existing.preferredTimes || 'Flexible'),
    preferredChannel: normalizeText(source.preferredChannel, existing.preferredChannel || 'Website'),
    sensitivities: normalizeText(source.sensitivities, existing.sensitivities || 'None reported'),
    upcomingAppointment,
    appointmentHistory,
    paymentHistory,
    activityTimeline,
    preferences,
    metadata: {
      ...(toObject(existing.metadata) || {}),
      ...getMetadata(source, customerReservedKeys),
    },
  };
};

const normalizeStaffInput = (payload, existing = {}) => {
  const source = ensureObject(payload);
  const fullName = normalizeText(source.fullName ?? source.name ?? existing.fullName, normalizeText(existing.fullName));

  if (!fullName) {
    const error = new Error('Staff name is required.');
    error.statusCode = 400;
    throw error;
  }

  return {
    branchId: normalizeText(source.branchId ?? source.branch_id, existing.branchId || ''),
    branchName: normalizeText(source.branchName ?? source.branch, existing.branchName || ''),
    fullName,
    name: fullName,
    role: normalizeText(source.role, existing.role || 'Staff Member'),
    phone: normalizeText(source.phone, existing.phone || ''),
    email: normalizeText(source.email, existing.email || '').toLowerCase(),
    employmentType: normalizeText(source.employmentType ?? source.employment_type, existing.employmentType || 'Full-time'),
    shiftLabel: normalizeText(source.shiftLabel ?? source.shift_label, existing.shiftLabel || ''),
    bio: normalizeText(source.bio, existing.bio || ''),
    isActive: normalizeBoolean(source.isActive ?? source.active, existing.isActive ?? true),
    onDuty: normalizeBoolean(source.onDuty ?? source.on_duty, existing.onDuty ?? true),
    employmentStatus: normalizeText(source.employmentStatus ?? source.employment_status, existing.employmentStatus || 'Active'),
    shiftStatus: normalizeText(source.shiftStatus ?? source.shift_status, existing.shiftStatus || 'Available'),
    leaveStatus: normalizeText(source.leaveStatus ?? source.leave_status, existing.leaveStatus || 'None'),
    workingHours: normalizeText(source.workingHours ?? source.working_hours, existing.workingHours || '9:00 AM - 5:00 PM'),
    weeklyAvailability: normalizeJsonArray(
      source.weeklyAvailability ?? source.weeklyAvailabilityJson ?? source.weekly_availability_json,
      normalizeJsonArray(existing.weeklyAvailability || existing.weeklyAvailabilityJson || []),
    ),
    todaySchedule: normalizeJsonArray(
      source.todaySchedule ?? source.todayScheduleJson ?? source.today_schedule_json,
      normalizeJsonArray(existing.todaySchedule || existing.todayScheduleJson || []),
    ),
    nextAppointment: normalizeJsonObject(source.nextAppointment ?? source.nextAppointmentJson ?? source.next_appointment_json ?? existing.nextAppointment ?? existing.nextAppointmentJson),
    appointmentsToday: Math.max(0, Math.round(normalizeNumber(source.appointmentsToday ?? source.appointments_today, existing.appointmentsToday ?? 0))),
    capacityToday: Math.max(0, Math.round(normalizeNumber(source.capacityToday ?? source.capacity_today, existing.capacityToday ?? 0))),
    appointmentsCompletedWeek: Math.max(0, Math.round(normalizeNumber(source.appointmentsCompletedWeek ?? source.appointments_completed_week, existing.appointmentsCompletedWeek ?? 0))),
    notes: normalizeText(source.notes, existing.notes || ''),
    assignedServices: normalizeLabelList(source.assignedServices ?? source.services, existing.assignedServices || existing.services || []),
    services: normalizeLabelList(source.services ?? source.assignedServices, existing.services || existing.assignedServices || []),
    metadata: {
      ...(toObject(existing.metadata) || {}),
      ...getMetadata(source, staffReservedKeys),
    },
  };
};

const normalizePaymentInput = (payload, existing = {}) => {
  const source = ensureObject(payload);
  const amount = Math.max(0, normalizeNumber(source.amount ?? source.total ?? source.amountDue ?? existing.amount ?? existing.amountDue, existing.amount ?? 0));
  const amountDue = Math.max(0, normalizeNumber(source.amountDue ?? source.totalDue ?? source.total ?? amount, existing.amountDue ?? amount));
  const amountPaid = Math.max(0, normalizeNumber(source.amountPaid ?? source.paidAmount ?? existing.amountPaid, existing.amountPaid ?? amount));
  const balanceRemaining = source.balanceRemaining !== undefined
    ? Math.max(0, normalizeNumber(source.balanceRemaining, existing.balanceRemaining ?? 0))
    : Math.max(amountDue - amountPaid, 0);
  const paymentStatus = normalizeText(
    source.paymentStatus ?? source.status,
    existing.paymentStatus || (balanceRemaining > 0 ? (amountPaid > 0 ? 'Partial' : 'Unpaid') : 'Paid'),
  );

  return {
    branchId: normalizeText(source.branchId ?? source.branch_id, existing.branchId || ''),
    branchName: normalizeText(source.branchName ?? source.branch, existing.branchName || ''),
    appointmentId: normalizeText(source.appointmentId ?? source.appointment_id, existing.appointmentId || ''),
    customerId: normalizeText(source.customerId ?? source.customer_id, existing.customerId || ''),
    customerName: normalizeText(source.customerName ?? source.customer ?? existing.customerName, existing.customerName || ''),
    customerEmail: normalizeText(source.customerEmail ?? source.email, existing.customerEmail || '').toLowerCase(),
    serviceName: normalizeText(source.serviceName ?? source.service ?? existing.serviceName, existing.serviceName || ''),
    amount,
    amountDue,
    amountPaid,
    balanceRemaining,
    method: normalizeText(source.method ?? source.paymentMethod, existing.method || existing.paymentMethod || 'Cash'),
    paymentMethod: normalizeText(source.paymentMethod ?? source.method, existing.paymentMethod || existing.method || 'Cash'),
    status: paymentStatus,
    paymentStatus,
    paymentDate: normalizeDateString(source.paymentDate ?? source.payment_date, existing.paymentDate || new Date().toISOString()),
    dueDate: normalizeDateString(source.dueDate ?? source.due_date, existing.dueDate || ''),
    recordedByUserId: normalizeText(source.recordedByUserId ?? source.recorded_by_user_id, existing.recordedByUserId || ''),
    recordedBy: normalizeText(source.recordedBy ?? source.recordedByName ?? source.recorded_by_name, existing.recordedBy || existing.recordedByName || ''),
    recordedByName: normalizeText(source.recordedByName ?? source.recordedBy ?? source.recorded_by_name, existing.recordedByName || existing.recordedBy || ''),
    editedBy: normalizeText(source.editedBy ?? source.editedByName ?? source.edited_by_name, existing.editedBy || existing.editedByName || ''),
    editedByName: normalizeText(source.editedByName ?? source.editedBy ?? source.edited_by_name, existing.editedByName || existing.editedBy || ''),
    notes: normalizeText(source.notes, existing.notes || ''),
    referenceNumber: normalizeText(source.referenceNumber ?? source.reference_number, existing.referenceNumber || ''),
    receiptStatus: normalizeText(source.receiptStatus ?? source.receipt_status, existing.receiptStatus || 'Not Issued'),
    receiptId: normalizeText(source.receiptId ?? source.receipt_id, existing.receiptId || ''),
    receiptNumber: normalizeText(source.receiptNumber ?? source.receipt_number, existing.receiptNumber || ''),
    receiptGeneratedAt: normalizeDateString(source.receiptGeneratedAt ?? source.receipt_generated_at, existing.receiptGeneratedAt || ''),
    receiptPrintedAt: normalizeDateString(source.receiptPrintedAt ?? source.receipt_printed_at, existing.receiptPrintedAt || ''),
    receiptDownloadedAt: normalizeDateString(source.receiptDownloadedAt ?? source.receipt_downloaded_at, existing.receiptDownloadedAt || ''),
    receiptEmailedAt: normalizeDateString(source.receiptEmailedAt ?? source.receipt_emailed_at, existing.receiptEmailedAt || ''),
    metadata: {
      ...(toObject(existing.metadata) || {}),
      ...getMetadata(source, paymentReservedKeys),
    },
  };
};

const normalizeReceiptInput = (payload, existing = {}) => {
  const source = ensureObject(payload);
  const subtotal = Math.max(0, normalizeNumber(source.subtotal ?? source.amountDue ?? existing.subtotal, existing.subtotal ?? 0));
  const taxAmount = Math.max(0, normalizeNumber(source.taxAmount ?? source.tax_amount, existing.taxAmount ?? 0));
  const discountAmount = Math.max(0, normalizeNumber(source.discountAmount ?? source.discount_amount, existing.discountAmount ?? 0));
  const totalAmount = Math.max(0, normalizeNumber(source.totalAmount ?? source.total_amount ?? subtotal + taxAmount - discountAmount, existing.totalAmount ?? subtotal + taxAmount - discountAmount));

  return {
    branchId: normalizeText(source.branchId ?? source.branch_id, existing.branchId || ''),
    branchName: normalizeText(source.branchName ?? source.branch, existing.branchName || ''),
    paymentId: normalizeText(source.paymentId ?? source.payment_id, existing.paymentId || ''),
    appointmentId: normalizeText(source.appointmentId ?? source.appointment_id, existing.appointmentId || ''),
    customerId: normalizeText(source.customerId ?? source.customer_id, existing.customerId || ''),
    issuedByUserId: normalizeText(source.issuedByUserId ?? source.issued_by_user_id, existing.issuedByUserId || ''),
    receiptNumber: normalizeText(source.receiptNumber ?? source.receipt_number, existing.receiptNumber || `RCT-${randomUUID().slice(0, 8).toUpperCase()}`),
    receiptStatus: normalizeText(source.receiptStatus ?? source.receipt_status, existing.receiptStatus || 'Issued'),
    deliveryMethod: normalizeText(source.deliveryMethod ?? source.delivery_method, existing.deliveryMethod || 'Printed'),
    issuedAt: normalizeDateString(source.issuedAt ?? source.issued_at, existing.issuedAt || new Date().toISOString()),
    subtotal,
    taxAmount,
    discountAmount,
    totalAmount,
    customerName: normalizeText(source.customerName ?? source.customer ?? existing.customerName, existing.customerName || ''),
    customerEmail: normalizeText(source.customerEmail ?? source.email, existing.customerEmail || '').toLowerCase(),
    customerPhone: normalizeText(source.customerPhone ?? source.phone, existing.customerPhone || ''),
    serviceName: normalizeText(source.serviceName ?? source.service ?? existing.serviceName, existing.serviceName || ''),
    paymentMethod: normalizeText(source.paymentMethod ?? source.method, existing.paymentMethod || 'Cash'),
    brandingSnapshot: normalizeJsonObject(source.brandingSnapshot ?? source.brandingSnapshotJson ?? source.branding_snapshot_json ?? existing.brandingSnapshot ?? existing.brandingSnapshotJson),
    lineItems: normalizeJsonArray(source.lineItems ?? source.lineItemsJson ?? source.line_items_json, normalizeJsonArray(existing.lineItems || existing.lineItemsJson || [])),
    notes: normalizeText(source.notes, existing.notes || ''),
    metadata: {
      ...(toObject(existing.metadata) || {}),
      ...getMetadata(source, receiptReservedKeys),
    },
  };
};

const normalizeUserInput = (payload, existing = {}) => {
  const source = ensureObject(payload);
  const fullName = normalizeText(source.fullName ?? source.name, normalizeText(existing.fullName));
  const email = normalizeText(source.email, normalizeText(existing.email)).toLowerCase();
  const passwordHash = normalizeText(source.passwordHash ?? source.password_hash, normalizeText(existing.passwordHash));
  const password = normalizeText(source.password, '');

  if (!fullName) {
    const error = new Error('User full name is required.');
    error.statusCode = 400;
    throw error;
  }

  if (!email) {
    const error = new Error('User email is required.');
    error.statusCode = 400;
    throw error;
  }

  return {
    fullName,
    name: fullName,
    email,
    passwordHash: passwordHash || (password ? password : ''),
    password,
    role: normalizeText(source.role, existing.role || 'staff'),
    phone: normalizeText(source.phone, existing.phone || ''),
    branchId: normalizeText(source.branchId ?? source.branch_id, existing.branchId || ''),
    isActive: normalizeBoolean(source.isActive ?? source.active, existing.isActive ?? true),
    lastLoginAt: normalizeDateString(source.lastLoginAt ?? source.last_login_at, existing.lastLoginAt || ''),
    metadata: {
      ...(toObject(existing.metadata) || {}),
      ...getMetadata(source, userReservedKeys),
    },
  };
};

const normalizePublicBookingInput = (payload, existing = {}) => {
  const source = ensureObject(payload);
  const fullName = normalizeText(source.fullName ?? source.name ?? source.customerName ?? existing.fullName, normalizeText(existing.fullName));

  if (!fullName) {
    const error = new Error('Booking customer name is required.');
    error.statusCode = 400;
    throw error;
  }

  return {
    branchId: normalizeText(source.branchId ?? source.branch_id, existing.branchId || ''),
    branchName: normalizeText(source.branchName ?? source.branch, existing.branchName || ''),
    fullName,
    name: fullName,
    phone: normalizeText(source.phone ?? source.contactNumber, existing.phone || ''),
    email: normalizeText(source.email ?? source.customerEmail, existing.email || '').toLowerCase(),
    requestedServiceId: normalizeText(source.requestedServiceId ?? source.serviceId ?? source.treatmentId, existing.requestedServiceId || ''),
    requestedServiceName: normalizeText(source.requestedServiceName ?? source.serviceName ?? source.service ?? source.treatment, existing.requestedServiceName || ''),
    requestedDate: normalizeDateOnly(source.requestedDate ?? source.date ?? source.preferredDate, existing.requestedDate || ''),
    requestedTime: normalizeTimeOnly(source.requestedTime ?? source.time ?? source.preferredTime, existing.requestedTime || ''),
    notes: normalizeText(source.notes ?? source.message, existing.notes || ''),
    status: normalizeText(source.status, existing.status || 'Received'),
    convertedCustomerId: normalizeText(source.convertedCustomerId ?? source.converted_customer_id, existing.convertedCustomerId || ''),
    convertedAppointmentId: normalizeText(source.convertedAppointmentId ?? source.converted_appointment_id, existing.convertedAppointmentId || ''),
    bookingSource: normalizeText(source.bookingSource ?? source.source, existing.bookingSource || 'Website'),
    referenceCode: normalizeText(source.referenceCode ?? source.reference_code, existing.referenceCode || `PBK-${randomUUID().slice(0, 8).toUpperCase()}`),
    metadata: {
      ...(toObject(existing.metadata) || {}),
      ...getMetadata(source, publicBookingReservedKeys),
    },
  };
};

const lookupBranchByIdOrName = async (client, { id, branchId, branchName, name, code } = {}) => {
  const resolvedId = normalizeText(id || branchId);
  if (resolvedId) {
    const { rows } = await client.query(
      `
        SELECT id, code, name, city, address, state, phone, email, manager_name, hours, opening_hours_json, status, active, is_active, rooms, team_size, notes, metadata, created_at, updated_at
        FROM crm_branches
        WHERE id = $1
        LIMIT 1
      `,
      [resolvedId],
    );
    return rows[0] || null;
  }

  const resolvedName = normalizeText(branchName || name);
  const resolvedCode = normalizeText(code);
  if (!resolvedName && !resolvedCode) return null;

  const { rows } = await client.query(
    `
      SELECT id, code, name, city, address, state, phone, email, manager_name, hours, opening_hours_json, status, active, is_active, rooms, team_size, notes, metadata, created_at, updated_at
      FROM crm_branches
      WHERE ($1::text <> '' AND LOWER(name) = LOWER($1))
         OR ($2::text <> '' AND LOWER(code) = LOWER($2))
      LIMIT 1
    `,
    [resolvedName, resolvedCode],
  );

  return rows[0] || null;
};

const ensureBranchRecord = async (client, input = {}, { allowCreate = true } = {}) => {
  const source = ensureObject(input);
  const branch = await lookupBranchByIdOrName(client, source);
  if (branch) return branch;
  if (!allowCreate) return null;

  const name = normalizeText(source.branchName ?? source.name ?? source.branch);
  if (!name) return null;

  const id = normalizeText(source.branchId ?? source.id ?? `BR-${randomUUID().slice(0, 8).toUpperCase()}`);
  const code = normalizeText(source.code) || deriveCode(name, 'BR');
  const { rows } = await client.query(
    `
      INSERT INTO crm_branches (
        id, code, name, city, address, state, phone, email, manager_name, hours, opening_hours_json,
        status, active, is_active, rooms, team_size, notes, metadata, created_at, updated_at
      )
      VALUES ($1, $2, $3, '', '', '', '', '', 'Unassigned', '', '{}'::jsonb, 'Open', true, true, 0, 0, '', $4::jsonb, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        code = EXCLUDED.code,
        name = EXCLUDED.name,
        updated_at = EXCLUDED.updated_at
      RETURNING id, code, name, city, address, state, phone, email, manager_name, hours, opening_hours_json, status, active, is_active, rooms, team_size, notes, metadata, created_at, updated_at
    `,
    [id, code, name, JSON.stringify(normalizeJsonObject(source.metadata, { autoCreated: true }))],
  );

  return rows[0];
};

const lookupServiceByIdOrName = async (client, { id, serviceId, serviceName, name } = {}) => {
  const resolvedId = normalizeText(id || serviceId);
  if (resolvedId) {
    const { rows } = await client.query(
      `
        SELECT id, branch_id, branch_name, name, category, duration_minutes, price, discount_price, previous_price, price_review_needed, price_last_updated, price_updated_by, assigned_staff, active, is_active, booking_visible, bookable, pos_available, description, note, updated_by, bookings_week, bookings_month, revenue_month, last_booked, popularity_rank, package_readiness, metadata, created_at, updated_at
        FROM crm_services
        WHERE id = $1
        LIMIT 1
      `,
      [resolvedId],
    );
    return rows[0] || null;
  }

  const resolvedName = normalizeText(serviceName || name);
  if (!resolvedName) return null;

  const { rows } = await client.query(
    `
      SELECT id, branch_id, branch_name, name, category, duration_minutes, price, discount_price, previous_price, price_review_needed, price_last_updated, price_updated_by, assigned_staff, active, is_active, booking_visible, bookable, pos_available, description, note, updated_by, bookings_week, bookings_month, revenue_month, last_booked, popularity_rank, package_readiness, metadata, created_at, updated_at
      FROM crm_services
      WHERE LOWER(name) = LOWER($1)
      LIMIT 1
    `,
    [resolvedName],
  );

  return rows[0] || null;
};

const _ensureServiceRecord = async (client, input = {}, { allowCreate = true } = {}) => {
  const source = ensureObject(input);
  const service = await lookupServiceByIdOrName(client, source);
  if (service) return service;
  if (!allowCreate) return null;

  const name = normalizeText(source.serviceName ?? source.name ?? source.title);
  if (!name) return null;

  const branch = await ensureBranchRecord(client, source, { allowCreate: true });
  const id = normalizeText(source.serviceId ?? source.id ?? `SRV-${randomUUID().slice(0, 8).toUpperCase()}`);
  const now = new Date();
  const { rows } = await client.query(
    `
      INSERT INTO crm_services (
        id, branch_id, branch_name, name, category, duration_minutes, price, discount_price, previous_price,
        price_review_needed, price_last_updated, price_updated_by, assigned_staff, active, is_active,
        booking_visible, bookable, pos_available, description, note, updated_by, bookings_week,
        bookings_month, revenue_month, last_booked, popularity_rank, package_readiness, metadata,
        created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, 'General', 60, 0, NULL, 0, false, NOW(), 'System Sync', '[]'::jsonb, true, true,
        true, true, true, '', '', 'System Sync', 0, 0, 0, NULL, 9, '{}'::jsonb, $5::jsonb, $6, $6
      )
      ON CONFLICT (id) DO UPDATE SET
        branch_id = EXCLUDED.branch_id,
        branch_name = EXCLUDED.branch_name,
        name = EXCLUDED.name,
        updated_at = EXCLUDED.updated_at
      RETURNING id, branch_id, branch_name, name, category, duration_minutes, price, discount_price, previous_price, price_review_needed, price_last_updated, price_updated_by, assigned_staff, active, is_active, booking_visible, bookable, pos_available, description, note, updated_by, bookings_week, bookings_month, revenue_month, last_booked, popularity_rank, package_readiness, metadata, created_at, updated_at
    `,
    [id, branch?.id || null, branch?.name || '', name, JSON.stringify(normalizeJsonObject(source.metadata, { autoCreated: true })), now],
  );

  return rows[0];
};

const lookupStaffByIdOrName = async (client, { id, staffId, staffName, name } = {}) => {
  const resolvedId = normalizeText(id || staffId);
  if (resolvedId) {
    const { rows } = await client.query(
      `
        SELECT id, branch_id, branch_name, full_name, role, phone, email, employment_type, shift_label, bio, is_active, on_duty, employment_status, shift_status, leave_status, working_hours, weekly_availability_json, today_schedule_json, next_appointment_json, appointments_today, capacity_today, appointments_completed_week, notes, metadata, created_at, updated_at
        FROM crm_staff
        WHERE id = $1
        LIMIT 1
      `,
      [resolvedId],
    );
    return rows[0] || null;
  }

  const resolvedName = normalizeText(staffName || name);
  if (!resolvedName) return null;

  const { rows } = await client.query(
    `
      SELECT id, branch_id, branch_name, full_name, role, phone, email, employment_type, shift_label, bio, is_active, on_duty, employment_status, shift_status, leave_status, working_hours, weekly_availability_json, today_schedule_json, next_appointment_json, appointments_today, capacity_today, appointments_completed_week, notes, metadata, created_at, updated_at
      FROM crm_staff
      WHERE LOWER(full_name) = LOWER($1)
      LIMIT 1
    `,
    [resolvedName],
  );

  return rows[0] || null;
};

const _ensureStaffRecord = async (client, input = {}, { allowCreate = true } = {}) => {
  const source = ensureObject(input);
  const staff = await lookupStaffByIdOrName(client, source);
  if (staff) return staff;
  if (!allowCreate) return null;

  const name = normalizeText(source.staffName ?? source.fullName ?? source.name ?? source.staff);
  if (!name) return null;

  const branch = await ensureBranchRecord(client, source, { allowCreate: true });
  const id = normalizeText(source.staffId ?? source.id ?? `STF-${randomUUID().slice(0, 8).toUpperCase()}`);
  const now = new Date();
  const { rows } = await client.query(
    `
      INSERT INTO crm_staff (
        id, branch_id, branch_name, full_name, role, phone, email, employment_type, shift_label, bio,
        is_active, on_duty, employment_status, shift_status, leave_status, working_hours,
        weekly_availability_json, today_schedule_json, next_appointment_json, appointments_today,
        capacity_today, appointments_completed_week, notes, metadata, created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, 'Staff Member', '', '', 'Full-time', '', '', true, true, 'Active', 'Available', 'None',
        '9:00 AM - 5:00 PM', '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, 0, 0, 0, '', $5::jsonb, $6, $6
      )
      ON CONFLICT (id) DO UPDATE SET
        branch_id = EXCLUDED.branch_id,
        branch_name = EXCLUDED.branch_name,
        full_name = EXCLUDED.full_name,
        updated_at = EXCLUDED.updated_at
      RETURNING id, branch_id, branch_name, full_name, role, phone, email, employment_type, shift_label, bio, is_active, on_duty, employment_status, shift_status, leave_status, working_hours, weekly_availability_json, today_schedule_json, next_appointment_json, appointments_today, capacity_today, appointments_completed_week, notes, metadata, created_at, updated_at
    `,
    [id, branch?.id || null, branch?.name || '', name, JSON.stringify(normalizeJsonObject(source.metadata, { autoCreated: true })), now],
  );

  return rows[0];
};

const lookupCustomerByIdentity = async (client, { id, customerId, fullName, name, customerName, email, phone } = {}) => {
  const resolvedId = normalizeText(id || customerId);
  if (resolvedId) {
    const { rows } = await client.query(
      `
        SELECT id, branch_id, branch_name, full_name, phone, email, gender, date_of_birth, customer_source, notes, notes_json, loyalty_points, total_spent, last_visit_at, is_active, segment, status, membership, visit_count, pending_balance, favorite_service, favorite_staff, preferred_times, preferred_channel, sensitivities, upcoming_appointment_json, appointment_history_json, payment_history_json, activity_timeline_json, preferences_json, metadata, created_at, updated_at
        FROM crm_customers
        WHERE id = $1
        LIMIT 1
      `,
      [resolvedId],
    );
    return rows[0] || null;
  }

  const resolvedEmail = normalizeText(email).toLowerCase();
  const resolvedPhone = normalizeText(phone);
  const resolvedName = normalizeText(customerName || fullName || name);

  const { rows } = await client.query(
    `
      SELECT id, branch_id, branch_name, full_name, phone, email, gender, date_of_birth, customer_source, notes, notes_json, loyalty_points, total_spent, last_visit_at, is_active, segment, status, membership, visit_count, pending_balance, favorite_service, favorite_staff, preferred_times, preferred_channel, sensitivities, upcoming_appointment_json, appointment_history_json, payment_history_json, activity_timeline_json, preferences_json, metadata, created_at, updated_at
      FROM crm_customers
      WHERE ($1::text <> '' AND LOWER(email) = LOWER($1))
         OR ($2::text <> '' AND phone = $2)
         OR ($3::text <> '' AND LOWER(full_name) = LOWER($3))
      LIMIT 1
    `,
    [resolvedEmail, resolvedPhone, resolvedName],
  );

  return rows[0] || null;
};

const _ensureCustomerRecord = async (client, input = {}, { allowCreate = true } = {}) => {
  const source = ensureObject(input);
  const customer = await lookupCustomerByIdentity(client, source);
  if (customer) return customer;
  if (!allowCreate) return null;

  const fullName = normalizeText(source.customerName ?? source.fullName ?? source.name);
  if (!fullName) return null;

  const branch = await ensureBranchRecord(client, source, { allowCreate: true });
  const id = normalizeText(source.customerId ?? source.id ?? `CUS-${randomUUID().slice(0, 8).toUpperCase()}`);
  const now = new Date();
  const { rows } = await client.query(
    `
      INSERT INTO crm_customers (
        id, branch_id, branch_name, full_name, phone, email, gender, date_of_birth, customer_source, notes, notes_json,
        loyalty_points, total_spent, last_visit_at, is_active, segment, status, membership, visit_count, pending_balance,
        favorite_service, favorite_staff, preferred_times, preferred_channel, sensitivities, upcoming_appointment_json,
        appointment_history_json, payment_history_json, activity_timeline_json, preferences_json, metadata, created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, '', NULL, 'Website Form', '', '[]'::jsonb,
        0, 0, NULL, true, 'New Customer', 'Active', 'None', 0, 0,
        '', '', 'Flexible', 'Website', 'None reported', '{}'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, $7::jsonb, $8, $8
      )
      ON CONFLICT (id) DO UPDATE SET
        branch_id = EXCLUDED.branch_id,
        branch_name = EXCLUDED.branch_name,
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        updated_at = EXCLUDED.updated_at
      RETURNING id, branch_id, branch_name, full_name, phone, email, gender, date_of_birth, customer_source, notes, notes_json, loyalty_points, total_spent, last_visit_at, is_active, segment, status, membership, visit_count, pending_balance, favorite_service, favorite_staff, preferred_times, preferred_channel, sensitivities, upcoming_appointment_json, appointment_history_json, payment_history_json, activity_timeline_json, preferences_json, metadata, created_at, updated_at
    `,
    [
      id,
      branch?.id || null,
      branch?.name || '',
      fullName,
      normalizeText(source.phone || source.contactPhone),
      normalizeText(source.email || source.customerEmail).toLowerCase(),
      JSON.stringify(normalizeJsonObject(source.metadata, { autoCreated: true })),
      now,
    ],
  );

  return rows[0];
};

const _lookupUserByEmailOrId = async (client, { id, userId, email } = {}) => {
  const resolvedId = normalizeText(id || userId);
  if (resolvedId) {
    const { rows } = await client.query(
      `
        SELECT id, full_name, email, role, phone, branch_id, is_active, last_login_at, created_at, updated_at
        FROM crm_users
        WHERE id = $1
        LIMIT 1
      `,
      [resolvedId],
    );
    return rows[0] || null;
  }

  const resolvedEmail = normalizeText(email).toLowerCase();
  if (!resolvedEmail) return null;

  const { rows } = await client.query(
    `
      SELECT id, full_name, email, role, phone, branch_id, is_active, last_login_at, created_at, updated_at
      FROM crm_users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
    `,
    [resolvedEmail],
  );

  return rows[0] || null;
};

const _recordAuditLog = async (client, {
  actorUserId = null,
  branchId = null,
  entityType,
  entityId,
  action,
  oldValue = null,
  newValue = null,
}) => {
  await client.query(
    `
      INSERT INTO crm_audit_logs (
        id, actor_user_id, branch_id, entity_type, entity_id, action, old_value_json, new_value_json, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, NOW())
    `,
    [
      `AUD-${randomUUID().slice(0, 12).toUpperCase()}`,
      actorUserId || null,
      branchId || null,
      entityType,
      entityId,
      action,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
    ],
  );
};

const _refreshCustomerMetrics = async (client, customerId) => {
  if (!customerId) return;

  const [{ rows: appointmentRows }, { rows: paymentRows }] = await Promise.all([
    client.query(
      `
        SELECT COUNT(*)::int AS visit_count, MAX(COALESCE(completed_at, appointment_at)) AS last_visit_at
        FROM crm_appointments
        WHERE customer_id = $1
      `,
      [customerId],
    ),
    client.query(
      `
        SELECT COALESCE(SUM(amount_paid), 0)::numeric(12,2) AS total_spent, COALESCE(SUM(balance_remaining), 0)::numeric(12,2) AS pending_balance
        FROM crm_payments
        WHERE customer_id = $1
      `,
      [customerId],
    ),
  ]);

  const visitCount = Number(appointmentRows[0]?.visit_count || 0);
  const lastVisitAt = appointmentRows[0]?.last_visit_at || null;
  const totalSpent = Number(paymentRows[0]?.total_spent || 0);
  const pendingBalance = Number(paymentRows[0]?.pending_balance || 0);

  await client.query(
    `
      UPDATE crm_customers
      SET visit_count = $2,
          total_spent = $3,
          pending_balance = $4,
          last_visit_at = $5,
          updated_at = NOW()
      WHERE id = $1
    `,
    [customerId, visitCount, totalSpent, pendingBalance, lastVisitAt],
  );
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
      code: row.code,
      name: row.name,
      branchName: row.name,
      managerName: row.manager_name,
      manager: row.manager_name,
      city: row.city,
      address: row.address,
      state: row.state,
      phone: row.phone,
      email: row.email,
      hours: row.hours,
      openingHours: normalizeJsonArray(row.opening_hours_json),
      openingHoursJson: normalizeJsonArray(row.opening_hours_json),
      status: row.status,
      active: row.active,
      isActive: row.is_active ?? row.active,
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
      branchId: row.branch_id,
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
      assignedToUserId: row.assigned_to_user_id,
      branchName: row.branch_name,
      branch: row.branch_name,
      interestedServiceId: row.interested_service_id,
      interestedServiceName: row.interested_service_name,
      interestedService: row.interested_service_name,
      serviceInterest: row.service_interest,
      budget: Number(row.budget || 0),
      lastContactAt: toIso(row.last_contact_at),
      followUpAt: toIso(row.follow_up_at || row.next_follow_up_at),
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
      branchId: row.branch_id,
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
      appointmentDate: normalizeDateOnly(row.appointment_date || row.appointment_at),
      startTime: normalizeTimeOnly(row.start_time),
      endTime: normalizeTimeOnly(row.end_time),
      dateTime: toIso(row.appointment_at),
      durationMinutes: Number(row.duration_minutes || 0),
      status: row.status,
      appointmentStatus: row.status,
      paymentStatus: row.payment_status,
      amountDue: Number(row.amount_due || 0),
      amountPaid: Number(row.amount_paid || 0),
      balanceRemaining: Number(row.balance_remaining || 0),
      source: row.source,
      bookingSource: row.booking_source,
      notes: row.notes,
      checkInAt: toIso(row.check_in_at),
      completedAt: toIso(row.completed_at),
      cancelledAt: toIso(row.cancelled_at),
      leadId: row.lead_id,
      bookedByUserId: row.booked_by_user_id,
      publicBookingReference: row.public_booking_reference,
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
      branchId: row.branch_id,
      branchName: row.branch_name,
      name: row.name,
      serviceName: row.name,
      title: row.name,
      category: row.category,
      serviceCategory: row.category,
      duration: Number(row.duration_minutes || 0),
      durationMinutes: Number(row.duration_minutes || 0),
      price: Number(row.price || 0),
      discountPrice: row.discount_price === null || row.discount_price === undefined ? null : Number(row.discount_price || 0),
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
      isBookable: row.is_bookable ?? row.booking_visible,
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

const customerRowToView = (row) => {
  const metadata = toObject(row.metadata);
  const upcomingAppointment = normalizeJsonObject(row.upcoming_appointment_json);
  const appointmentHistory = normalizeJsonArray(row.appointment_history_json);
  const paymentHistory = normalizeJsonArray(row.payment_history_json);
  const activityTimeline = normalizeJsonArray(row.activity_timeline_json);
  const notes = normalizeJsonArray(
    row.notes_json,
    row.notes
      ? [
          {
            id: row.id,
            at: toIso(row.updated_at),
            author: 'System',
            text: row.notes,
          },
        ]
      : [],
  );
  const preferences = normalizeJsonArray(row.preferences_json);

  return {
    ...metadata,
    ...structuredView('customers', row, {
      branchId: row.branch_id,
      branchName: row.branch_name,
      fullName: row.full_name,
      name: row.full_name,
      phone: row.phone,
      email: row.email,
      gender: row.gender,
      dateOfBirth: normalizeDateOnly(row.date_of_birth),
      customerSource: row.customer_source,
      source: row.customer_source,
      notesText: row.notes,
      notes,
      loyaltyPoints: Number(row.loyalty_points || 0),
      totalSpent: Number(row.total_spent || 0),
      totalSpend: Number(row.total_spent || 0),
      lastVisitAt: toIso(row.last_visit_at),
      isActive: row.is_active,
      segment: row.segment,
      status: row.status,
      membership: row.membership,
      visitCount: Number(row.visit_count || 0),
      pendingBalance: Number(row.pending_balance || 0),
      favoriteService: row.favorite_service,
      favoriteStaff: row.favorite_staff,
      preferredTimes: row.preferred_times,
      preferredChannel: row.preferred_channel,
      sensitivities: row.sensitivities,
      upcomingAppointment,
      appointmentHistory,
      paymentHistory,
      activityTimeline,
      preferences,
      metadata,
    }),
  };
};

const staffRowToView = (row, services = []) => {
  const metadata = toObject(row.metadata);
  const weeklyAvailability = normalizeJsonArray(row.weekly_availability_json);
  const todaySchedule = normalizeJsonArray(row.today_schedule_json);
  const nextAppointment = normalizeJsonObject(row.next_appointment_json);

  return {
    ...metadata,
    ...structuredView('staff', row, {
      branchId: row.branch_id,
      branchName: row.branch_name,
      fullName: row.full_name,
      name: row.full_name,
      role: row.role,
      phone: row.phone,
      email: row.email,
      employmentType: row.employment_type,
      shiftLabel: row.shift_label,
      bio: row.bio,
      isActive: row.is_active,
      onDuty: row.on_duty,
      employmentStatus: row.employment_status,
      shiftStatus: row.shift_status,
      leaveStatus: row.leave_status,
      workingHours: row.working_hours,
      weeklyAvailability,
      weeklyAvailabilityJson: weeklyAvailability,
      todaySchedule,
      todayScheduleJson: todaySchedule,
      nextAppointment,
      nextAppointmentJson: nextAppointment,
      appointmentsToday: Number(row.appointments_today || 0),
      capacityToday: Number(row.capacity_today || 0),
      appointmentsCompletedWeek: Number(row.appointments_completed_week || 0),
      notes: row.notes,
      services,
      assignedServices: services,
      metadata,
    }),
  };
};

const paymentRowToView = (row) => {
  const metadata = toObject(row.metadata);
  const receiptGenerated = Boolean(row.receipt_id || row.receipt_number || ['issued', 'generated', 'printed', 'emailed', 'downloaded'].includes(asLower(row.receipt_status)));

  return {
    ...metadata,
    ...structuredView('payments', row, {
      branchId: row.branch_id,
      branchName: row.branch_name,
      appointmentId: row.appointment_id,
      customerId: row.customer_id,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      serviceName: row.service_name,
      amount: Number(row.amount || 0),
      amountDue: Number(row.amount_due || 0),
      amountPaid: Number(row.amount_paid || 0),
      balanceRemaining: Number(row.balance_remaining || 0),
      method: row.payment_method,
      paymentMethod: row.payment_method,
      status: row.payment_status,
      paymentStatus: row.payment_status,
      paymentDate: toIso(row.payment_date),
      dueDate: toIso(row.due_date),
      recordedByUserId: row.recorded_by_user_id,
      recordedBy: row.recorded_by_name,
      editedBy: row.edited_by_name,
      notes: row.notes,
      referenceNumber: row.reference_number,
      receiptStatus: row.receipt_status,
      receiptGenerated,
      linkedReceiptId: row.receipt_id,
      receiptNumber: row.receipt_number,
      receiptGeneratedAt: toIso(row.receipt_generated_at),
      receiptPrintedAt: toIso(row.receipt_printed_at),
      receiptDownloadedAt: toIso(row.receipt_downloaded_at),
      receiptEmailedAt: toIso(row.receipt_emailed_at),
      metadata,
    }),
  };
};

const receiptRowToView = (row) => {
  const metadata = toObject(row.metadata);

  return {
    ...metadata,
    ...structuredView('receipts', row, {
      branchId: row.branch_id,
      branchName: row.branch_name,
      paymentId: row.payment_id,
      appointmentId: row.appointment_id,
      customerId: row.customer_id,
      issuedByUserId: row.issued_by_user_id,
      receiptNumber: row.receipt_number,
      receiptStatus: row.receipt_status,
      deliveryMethod: row.delivery_method,
      issuedAt: toIso(row.issued_at),
      subtotal: Number(row.subtotal || 0),
      taxAmount: Number(row.tax_amount || 0),
      discountAmount: Number(row.discount_amount || 0),
      totalAmount: Number(row.total_amount || 0),
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
      serviceName: row.service_name,
      paymentMethod: row.payment_method,
      brandingSnapshot: normalizeJsonObject(row.branding_snapshot_json),
      lineItems: normalizeJsonArray(row.line_items_json),
      notes: row.notes,
      metadata,
    }),
  };
};

const userRowToView = (row) => ({
  resource: 'users',
  id: row.id,
  fullName: row.full_name,
  name: row.full_name,
  email: row.email,
  role: row.role,
  phone: row.phone,
  branchId: row.branch_id,
  isActive: row.is_active,
  lastLoginAt: toIso(row.last_login_at),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
});

const _publicBookingRowToView = (row) => ({
  resource: 'public-bookings',
  id: row.id,
  branchId: row.branch_id,
  branchName: row.branch_name,
  fullName: row.full_name,
  phone: row.phone,
  email: row.email,
  requestedServiceId: row.requested_service_id,
  requestedServiceName: row.requested_service_name,
  requestedDate: normalizeDateOnly(row.requested_date),
  requestedTime: normalizeTimeOnly(row.requested_time),
  notes: row.notes,
  status: row.status,
  convertedCustomerId: row.converted_customer_id,
  convertedAppointmentId: row.converted_appointment_id,
  bookingSource: row.booking_source,
  referenceCode: row.reference_code,
  metadata: toObject(row.metadata),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
});

const SETTINGS_GROUPS = ['profile', 'regionalDefaults', 'operatingHours', 'specialHours', 'bookingRules', 'communication', 'branding'];

const settingsRowKey = (branchId, settingsGroup) => `${branchId || 'global'}:${settingsGroup}`;

const settingsRowsToDocument = (rows = []) => {
  const orderedRows = rows
    .filter((row) => row && row.is_active !== false)
    .sort((left, right) => {
      const leftScope = left.branch_id ? 1 : 0;
      const rightScope = right.branch_id ? 1 : 0;
      return leftScope - rightScope;
    });

  if (!orderedRows.length) {
    return normalizeSettingsDocument({});
  }

  const hasGroupedRows = orderedRows.some((row) => normalizeText(row.settings_group || row.settings_key));
  if (!hasGroupedRows) {
    const legacyRow = orderedRows[0];
    return normalizeSettingsDocument(legacyRow.data || legacyRow.settings_value_json || {});
  }

  const document = {};
  for (const row of orderedRows) {
    const group = normalizeText(row.settings_group || row.settings_key);
    if (!group) continue;
    document[group] = normalizeJsonObject(row.settings_value_json || row.data || {});
  }

  return normalizeSettingsDocument(document);
};

const settingsDocumentToRows = (payload, branchId = null) => {
  const normalized = normalizeSettingsDocument(payload);
  return SETTINGS_GROUPS.map((group) => ({
    id: settingsRowKey(branchId, group),
    branch_id: branchId || null,
    settings_key: group,
    settings_group: group,
    settings_value_json: normalized[group],
    data: normalized[group],
    is_active: true,
  }));
};

const settingsRowToView = (row) => ({
  ...normalizeSettingsDocument(row.data || row.settings_value_json || {}),
  id: row.id,
  branchId: row.branch_id,
  settingsKey: row.settings_key,
  settingsGroup: row.settings_group,
  settingsValueJson: normalizeJsonObject(row.settings_value_json || row.data || {}),
  resource: 'settings',
  updatedAt: toIso(row.updated_at),
  createdAt: toIso(row.created_at),
});

const loadStaffServiceNames = async (staffIds = []) => {
  const ids = uniqueBy(staffIds.map((value) => normalizeText(value)));
  if (!ids.length) return new Map();

  const { rows } = await pool.query(
    `
      SELECT ss.staff_id, s.name AS service_name
      FROM crm_staff_services ss
      JOIN crm_services s ON s.id = ss.service_id
      WHERE ss.staff_id = ANY($1::text[])
      ORDER BY s.name ASC
    `,
    [ids],
  );

  const map = new Map();
  for (const row of rows) {
    const serviceList = map.get(row.staff_id) || [];
    serviceList.push(row.service_name);
    map.set(row.staff_id, serviceList);
  }

  return map;
};

const loadServiceStaffNames = async (serviceIds = []) => {
  const ids = uniqueBy(serviceIds.map((value) => normalizeText(value)));
  if (!ids.length) return new Map();

  const { rows } = await pool.query(
    `
      SELECT ss.service_id, st.full_name AS staff_name
      FROM crm_staff_services ss
      JOIN crm_staff st ON st.id = ss.staff_id
      WHERE ss.service_id = ANY($1::text[])
      ORDER BY st.full_name ASC
    `,
    [ids],
  );

  const map = new Map();
  for (const row of rows) {
    const staffList = map.get(row.service_id) || [];
    staffList.push(row.staff_name);
    map.set(row.service_id, staffList);
  }

  return map;
};

const resolveServiceIds = async (client, assignments = []) => {
  const values = normalizeLabelList(assignments);
  if (!values.length) return [];

  const ids = [];
  for (const value of values) {
    const record = isValidObjectId(value)
      ? await lookupServiceByIdOrName(client, { id: value, serviceId: value })
      : await lookupServiceByIdOrName(client, { serviceName: value, name: value });

    if (record?.id) {
      ids.push(record.id);
    }
  }

  return uniqueBy(ids);
};

const resolveStaffIds = async (client, assignments = []) => {
  const values = normalizeLabelList(assignments);
  if (!values.length) return [];

  const ids = [];
  for (const value of values) {
    const record = isValidObjectId(value)
      ? await lookupStaffByIdOrName(client, { id: value, staffId: value })
      : await lookupStaffByIdOrName(client, { staffName: value, name: value });

    if (record?.id) {
      ids.push(record.id);
    }
  }

  return uniqueBy(ids);
};

const syncStaffServiceAssignments = async (client, staffId, assignments = []) => {
  const serviceIds = await resolveServiceIds(client, assignments);
  await client.query('DELETE FROM crm_staff_services WHERE staff_id = $1', [staffId]);

  if (!serviceIds.length) {
    return [];
  }

  await client.query(
    `
      INSERT INTO crm_staff_services (id, staff_id, service_id, created_at)
      SELECT $1 || '-' || service_id, $1, service_id, NOW()
      FROM UNNEST($2::text[]) AS service_id
      ON CONFLICT (staff_id, service_id) DO NOTHING
    `,
    [staffId, serviceIds],
  );

  return serviceIds;
};

const syncServiceStaffAssignments = async (client, serviceId, assignments = []) => {
  const staffIds = await resolveStaffIds(client, assignments);
  await client.query('DELETE FROM crm_staff_services WHERE service_id = $1', [serviceId]);

  if (!staffIds.length) {
    return [];
  }

  await client.query(
    `
      INSERT INTO crm_staff_services (id, staff_id, service_id, created_at)
      SELECT service_id || '-' || $1, staff_id, $1, NOW()
      FROM UNNEST($2::text[]) AS staff_id
      ON CONFLICT (staff_id, service_id) DO NOTHING
    `,
    [serviceId, staffIds],
  );

  return staffIds;
};

const structuredFilterKeys = {
  branches: ['name', 'branchName', 'code', 'manager', 'managerName', 'city', 'state', 'hours'],
  leads: ['fullName', 'name', 'ownerName', 'owner', 'source', 'priority', 'branchName', 'branchId', 'serviceInterest', 'interestedServiceName'],
  appointments: ['customerName', 'serviceName', 'staffName', 'branchName', 'branchId', 'paymentStatus', 'source', 'bookingSource'],
  services: ['name', 'serviceName', 'title', 'category', 'serviceCategory', 'assignedStaff', 'note', 'branchName'],
  customers: ['fullName', 'name', 'email', 'phone', 'segment', 'status', 'branchName', 'favoriteService', 'favoriteStaff'],
  staff: ['fullName', 'name', 'role', 'branchName', 'employmentStatus', 'shiftStatus', 'leaveStatus', 'services'],
  payments: ['customerName', 'serviceName', 'branchName', 'status', 'paymentStatus', 'receiptStatus', 'method', 'recordedBy'],
  receipts: ['receiptNumber', 'customerName', 'serviceName', 'branchName', 'receiptStatus', 'paymentStatus', 'deliveryMethod'],
  users: ['fullName', 'name', 'email', 'role', 'branchId'],
};

const listStructuredRows = async (resource, query = {}) => {
  if (resource === 'branches') {
    const { rows } = await pool.query(`
      SELECT id, code, name, manager_name, city, address, state, phone, email, hours, opening_hours_json, status, active, is_active, rooms, team_size, notes, metadata, created_at, updated_at
      FROM crm_branches
      ORDER BY updated_at DESC, created_at DESC
    `);
    return applyQueryFilters(rows.map(branchRowToView), query, structuredFilterKeys.branches);
  }

  if (resource === 'leads') {
    const { rows } = await pool.query(`
      SELECT id, branch_id, full_name, email, phone, source, status, priority, owner_name, assigned_to_user_id, branch_name, interested_service_id, interested_service_name, service_interest, budget, last_contact_at, follow_up_at, next_follow_up_at, notes, metadata, created_at, updated_at
      FROM crm_leads
      ORDER BY updated_at DESC, created_at DESC
    `);
    return applyQueryFilters(rows.map(leadRowToView), query, structuredFilterKeys.leads);
  }

  if (resource === 'appointments') {
    const { rows } = await pool.query(`
      SELECT id, branch_id, lead_id, customer_id, booked_by_user_id, customer_name, customer_email, phone, service_id, service_name, staff_id, staff_name, branch_name, appointment_date, start_time, end_time, appointment_at, duration_minutes, status, payment_status, booking_source, source, public_booking_reference, amount_due, amount_paid, balance_remaining, notes, check_in_at, completed_at, cancelled_at, metadata, created_at, updated_at
      FROM crm_appointments
      ORDER BY appointment_at DESC, updated_at DESC, created_at DESC
    `);
    return applyQueryFilters(rows.map(appointmentRowToView), query, structuredFilterKeys.appointments);
  }

  if (resource === 'services') {
    const { rows } = await pool.query(`
      SELECT id, branch_id, branch_name, name, category, duration_minutes, price, discount_price, previous_price, price_review_needed, price_last_updated, price_updated_by, assigned_staff, active, is_active, is_bookable, booking_visible, bookable, pos_available, description, note, updated_by, bookings_week, bookings_month, revenue_month, last_booked, popularity_rank, package_readiness, metadata, created_at, updated_at
      FROM crm_services
      ORDER BY updated_at DESC, created_at DESC
    `);
    const assignments = await loadServiceStaffNames(rows.map((row) => row.id));
    return applyQueryFilters(rows.map((row) => serviceRowToView(row, assignments.get(row.id) || [])), query, structuredFilterKeys.services);
  }

  if (resource === 'customers') {
    const { rows } = await pool.query(`
      SELECT id, branch_id, branch_name, full_name, phone, email, gender, date_of_birth, customer_source, notes, notes_json, loyalty_points, total_spent, last_visit_at, is_active, segment, status, membership, visit_count, pending_balance, favorite_service, favorite_staff, preferred_times, preferred_channel, sensitivities, upcoming_appointment_json, appointment_history_json, payment_history_json, activity_timeline_json, preferences_json, metadata, created_at, updated_at
      FROM crm_customers
      ORDER BY updated_at DESC, created_at DESC
    `);
    return applyQueryFilters(rows.map(customerRowToView), query, structuredFilterKeys.customers);
  }

  if (resource === 'staff') {
    const { rows } = await pool.query(`
      SELECT id, branch_id, branch_name, full_name, role, phone, email, employment_type, shift_label, bio, is_active, on_duty, employment_status, shift_status, leave_status, working_hours, weekly_availability_json, today_schedule_json, next_appointment_json, appointments_today, capacity_today, appointments_completed_week, notes, metadata, created_at, updated_at
      FROM crm_staff
      ORDER BY updated_at DESC, created_at DESC
    `);
    const assignments = await loadStaffServiceNames(rows.map((row) => row.id));
    return applyQueryFilters(rows.map((row) => staffRowToView(row, assignments.get(row.id) || [])), query, structuredFilterKeys.staff);
  }

  if (resource === 'payments') {
    const { rows } = await pool.query(`
      SELECT id, branch_id, branch_name, appointment_id, customer_id, customer_name, customer_email, service_name, amount, amount_due, amount_paid, balance_remaining, payment_method, payment_status, payment_date, due_date, recorded_by_user_id, recorded_by_name, edited_by_name, notes, reference_number, receipt_status, receipt_id, receipt_number, receipt_generated_at, receipt_printed_at, receipt_downloaded_at, receipt_emailed_at, metadata, created_at, updated_at
      FROM crm_payments
      ORDER BY payment_date DESC, updated_at DESC, created_at DESC
    `);
    return applyQueryFilters(rows.map(paymentRowToView), query, structuredFilterKeys.payments);
  }

  if (resource === 'receipts') {
    const { rows } = await pool.query(`
      SELECT id, branch_id, branch_name, payment_id, appointment_id, customer_id, issued_by_user_id, receipt_number, receipt_status, delivery_method, issued_at, subtotal, tax_amount, discount_amount, total_amount, customer_name, customer_email, customer_phone, service_name, payment_method, branding_snapshot_json, line_items_json, notes, metadata, created_at, updated_at
      FROM crm_receipts
      ORDER BY issued_at DESC, updated_at DESC, created_at DESC
    `);
    return applyQueryFilters(rows.map(receiptRowToView), query, structuredFilterKeys.receipts);
  }

  if (resource === 'users') {
    const { rows } = await pool.query(`
      SELECT id, full_name, email, role, phone, branch_id, is_active, last_login_at, created_at, updated_at
      FROM crm_users
      ORDER BY updated_at DESC, created_at DESC
    `);
    return applyQueryFilters(rows.map(userRowToView), query, structuredFilterKeys.users);
  }

  return [];
};

const getStructuredRecord = async (resource, id) => {
  if (!isValidObjectId(id)) return null;

  if (resource === 'branches') {
    const { rows } = await pool.query(
      `
        SELECT id, code, name, manager_name, city, address, state, phone, email, hours, opening_hours_json, status, active, is_active, rooms, team_size, notes, metadata, created_at, updated_at
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
        SELECT id, branch_id, full_name, email, phone, source, status, priority, owner_name, assigned_to_user_id, branch_name, interested_service_id, interested_service_name, service_interest, budget, last_contact_at, follow_up_at, next_follow_up_at, notes, metadata, created_at, updated_at
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
        SELECT id, branch_id, lead_id, customer_id, booked_by_user_id, customer_name, customer_email, phone, service_id, service_name, staff_id, staff_name, branch_name, appointment_date, start_time, end_time, appointment_at, duration_minutes, status, payment_status, booking_source, source, public_booking_reference, amount_due, amount_paid, balance_remaining, notes, check_in_at, completed_at, cancelled_at, metadata, created_at, updated_at
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
        SELECT id, branch_id, branch_name, name, category, duration_minutes, price, discount_price, previous_price, price_review_needed, price_last_updated, price_updated_by, assigned_staff, active, is_active, is_bookable, booking_visible, bookable, pos_available, description, note, updated_by, bookings_week, bookings_month, revenue_month, last_booked, popularity_rank, package_readiness, metadata, created_at, updated_at
        FROM crm_services
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );
    if (!rows[0]) return null;
    const assignments = await loadServiceStaffNames([rows[0].id]);
    return serviceRowToView(rows[0], assignments.get(rows[0].id) || []);
  }

  if (resource === 'customers') {
    const { rows } = await pool.query(
      `
        SELECT id, branch_id, branch_name, full_name, phone, email, gender, date_of_birth, customer_source, notes, notes_json, loyalty_points, total_spent, last_visit_at, is_active, segment, status, membership, visit_count, pending_balance, favorite_service, favorite_staff, preferred_times, preferred_channel, sensitivities, upcoming_appointment_json, appointment_history_json, payment_history_json, activity_timeline_json, preferences_json, metadata, created_at, updated_at
        FROM crm_customers
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );
    return rows[0] ? customerRowToView(rows[0]) : null;
  }

  if (resource === 'staff') {
    const { rows } = await pool.query(
      `
        SELECT id, branch_id, branch_name, full_name, role, phone, email, employment_type, shift_label, bio, is_active, on_duty, employment_status, shift_status, leave_status, working_hours, weekly_availability_json, today_schedule_json, next_appointment_json, appointments_today, capacity_today, appointments_completed_week, notes, metadata, created_at, updated_at
        FROM crm_staff
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );
    if (!rows[0]) return null;
    const assignments = await loadStaffServiceNames([rows[0].id]);
    return staffRowToView(rows[0], assignments.get(rows[0].id) || []);
  }

  if (resource === 'payments') {
    const { rows } = await pool.query(
      `
        SELECT id, branch_id, branch_name, appointment_id, customer_id, customer_name, customer_email, service_name, amount, amount_due, amount_paid, balance_remaining, payment_method, payment_status, payment_date, due_date, recorded_by_user_id, recorded_by_name, edited_by_name, notes, reference_number, receipt_status, receipt_id, receipt_number, receipt_generated_at, receipt_printed_at, receipt_downloaded_at, receipt_emailed_at, metadata, created_at, updated_at
        FROM crm_payments
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );
    return rows[0] ? paymentRowToView(rows[0]) : null;
  }

  if (resource === 'receipts') {
    const { rows } = await pool.query(
      `
        SELECT id, branch_id, branch_name, payment_id, appointment_id, customer_id, issued_by_user_id, receipt_number, receipt_status, delivery_method, issued_at, subtotal, tax_amount, discount_amount, total_amount, customer_name, customer_email, customer_phone, service_name, payment_method, branding_snapshot_json, line_items_json, notes, metadata, created_at, updated_at
        FROM crm_receipts
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );
    return rows[0] ? receiptRowToView(rows[0]) : null;
  }

  if (resource === 'users') {
    const { rows } = await pool.query(
      `
        SELECT id, full_name, email, role, phone, branch_id, is_active, last_login_at, created_at, updated_at
        FROM crm_users
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );
    return rows[0] ? userRowToView(rows[0]) : null;
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
          id, code, name, manager_name, city, address, state, phone, email, hours, opening_hours_json, status, active, is_active, rooms, team_size, notes, metadata, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14, $15, $16, $17, $18::jsonb, $19, $20)
        ON CONFLICT (id) DO UPDATE SET
          code = EXCLUDED.code,
          name = EXCLUDED.name,
          manager_name = EXCLUDED.manager_name,
          city = EXCLUDED.city,
          address = EXCLUDED.address,
          state = EXCLUDED.state,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          hours = EXCLUDED.hours,
          opening_hours_json = EXCLUDED.opening_hours_json,
          status = EXCLUDED.status,
          active = EXCLUDED.active,
          is_active = EXCLUDED.is_active,
          rooms = EXCLUDED.rooms,
          team_size = EXCLUDED.team_size,
          notes = EXCLUDED.notes,
          metadata = EXCLUDED.metadata,
          updated_at = EXCLUDED.updated_at
        RETURNING id, code, name, manager_name, city, address, state, phone, email, hours, opening_hours_json, status, active, is_active, rooms, team_size, notes, metadata, created_at, updated_at
      `,
      [
        id,
        normalized.code,
        normalized.name,
        normalized.managerName,
        normalized.city,
        normalized.address,
        normalized.state,
        normalized.phone,
        normalized.email,
        normalized.hours,
        JSON.stringify(normalized.openingHoursJson),
        normalized.status,
        normalized.active,
        normalized.isActive,
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
