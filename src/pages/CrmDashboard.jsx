import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearCrmToken, getCrmSession } from '../config/crm';
import { crmList, crmUpdate } from '../config/crmApi';
import CrmShell from '../components/CrmShell';
import CrmSyncBanner from '../components/CrmSyncBanner';
import './CrmDashboard.css';

const APPOINTMENT_STATUSES = [
  'Confirmed',
  'Awaiting Arrival',
  'Arrived',
  'In Progress',
  'Completed',
  'Cancelled',
  'No Show',
  'Payment Pending',
];

const TOP_BRANCHES = [
  'All Branches',
  'Melrose Sanctuary',
  'Downtown Loft',
  'Beverly Hills Retreat',
];

const DASHBOARD_ROLE_ALIASES = {
  admin: 'owner',
  owner: 'owner',
  manager: 'manager',
  supervisor: 'manager',
  receptionist: 'receptionist',
  frontdesk: 'receptionist',
  front_desk: 'receptionist',
};

const DASHBOARD_ROLE_LABELS = {
  owner: 'Owner',
  manager: 'Manager',
  receptionist: 'Receptionist',
};

const WIDGET_ACCESS = {
  appointments: ['receptionist', 'manager', 'owner'],
  conciergeActions: ['receptionist', 'manager', 'owner'],
  financialOverview: ['manager', 'owner', 'receptionist'],
};

const normalizeDashboardRole = (role) => {
  const value = String(role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return DASHBOARD_ROLE_ALIASES[value] || value || 'receptionist';
};

const formatRoleLabel = (role) => DASHBOARD_ROLE_LABELS[normalizeDashboardRole(role)] || 'CRM user';

const formatDisplayName = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';

  const localPart = text.split('@')[0].replace(/[._-]+/g, ' ').trim();
  if (!localPart) return '';

  return localPart
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

const describeDashboardLoadIssue = (resources = []) => {
  if (!resources.length) return '';

  const labels = resources.map((resource) =>
    String(resource || '')
      .replace(/_/g, ' ')
      .replace(/^\w/, (letter) => letter.toUpperCase()),
  );

  if (labels.length === 1) {
    return `Could not refresh ${labels[0]} from the CRM API. The dashboard is still showing the rest of the live data.`;
  }

  if (labels.length === 2) {
    return `Could not refresh ${labels[0]} and ${labels[1]} from the CRM API. The dashboard is still showing the rest of the live data.`;
  }

  return `Could not refresh ${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]} from the CRM API. The dashboard is still showing the rest of the live data.`;
};

const quickActions = [
  { label: 'Add Booking', to: '/crm/appointments' },
  { label: 'Add Customer', to: '/crm/customers' },
  { label: 'Record Payment', to: '/crm/payments' },
  { label: 'Open POS', to: '/crm/payments' },
  { label: 'New Customer', to: '/crm/customers' },
  { label: 'Walk-in Booking', to: '/crm/appointments' },
  { label: 'View Calendar', to: '/crm/appointments' },
];

const buildIsoAt = (dayOffset, clock) => {
  const date = new Date();
  const [hours, minutes] = String(clock || '09:00').split(':').map(Number);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(Number.isNaN(hours) ? 9 : hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);
  return date.toISOString();
};

const dashboardSeed = (() => {
  const services = [
    { id: 'SRV-101', name: 'Signature Facial', price: 120 },
    { id: 'SRV-102', name: 'Deep Tissue Massage', price: 150 },
    { id: 'SRV-103', name: 'Aromatherapy Session', price: 135 },
    { id: 'SRV-104', name: 'Hot Stone Therapy', price: 160 },
    { id: 'SRV-105', name: 'Hydra Glow Infusion', price: 185 },
  ];

  const customers = [
    { id: 'CUS-1001', name: 'Sarah Johnson', phone: '+1 (323) 555-1132', totalVisits: 6 },
    { id: 'CUS-1002', name: 'Michael Chen', phone: '+1 (323) 555-8188', totalVisits: 3 },
    { id: 'CUS-1003', name: 'Emily Davis', phone: '+1 (323) 555-6631', totalVisits: 2 },
    { id: 'CUS-1004', name: 'David Wilson', phone: '+1 (323) 555-4100', totalVisits: 5 },
    { id: 'CUS-1005', name: 'Nora Patel', phone: '+1 (323) 555-9012', totalVisits: 1 },
    { id: 'CUS-1006', name: 'Avery Brown', phone: '+1 (323) 555-2044', totalVisits: 4 },
  ];

  const staff = [
    {
      id: 'STF-201',
      name: 'Marcus',
      role: 'Therapist',
      availability: 'Busy',
      status: 'Active',
      onDutyToday: true,
      capacityToday: 5,
    },
    {
      id: 'STF-202',
      name: 'Elena',
      role: 'Aesthetician',
      availability: 'Available',
      status: 'Active',
      onDutyToday: true,
      capacityToday: 6,
    },
    {
      id: 'STF-203',
      name: 'Sofia',
      role: 'Stylist',
      availability: 'On Break',
      status: 'Active',
      onDutyToday: true,
      capacityToday: 4,
    },
    {
      id: 'STF-204',
      name: 'Luna',
      role: 'Nail Artist',
      availability: 'Off Duty',
      status: 'Active',
      onDutyToday: false,
      capacityToday: 3,
    },
    {
      id: 'STF-205',
      name: 'Noah',
      role: 'Therapist',
      availability: 'On Leave',
      status: 'Inactive',
      onDutyToday: false,
      capacityToday: 0,
    },
  ];

  const appointments = [
    {
      id: 'APT-6101',
      customerId: 'CUS-1001',
      serviceName: 'Deep Tissue Massage',
      staffName: 'Marcus',
      staffRole: 'Therapist',
      appointmentAt: buildIsoAt(0, '09:30'),
      durationMinutes: 75,
      status: 'In Progress',
      paymentStatus: 'Pending',
      branch: 'Melrose Sanctuary',
    },
    {
      id: 'APT-6102',
      customerId: 'CUS-1002',
      serviceName: 'Hydra Glow Infusion',
      staffName: 'Elena',
      staffRole: 'Aesthetician',
      appointmentAt: buildIsoAt(0, '10:45'),
      durationMinutes: 60,
      status: 'Awaiting Arrival',
      paymentStatus: 'Pending',
      branch: 'Melrose Sanctuary',
    },
    {
      id: 'APT-6103',
      customerId: 'CUS-1003',
      serviceName: 'Signature Facial',
      staffName: 'Elena',
      staffRole: 'Aesthetician',
      appointmentAt: buildIsoAt(0, '12:00'),
      durationMinutes: 60,
      status: 'Arrived',
      paymentStatus: 'Pending',
      branch: 'Melrose Sanctuary',
    },
    {
      id: 'APT-6104',
      customerId: 'CUS-1004',
      serviceName: 'Aromatherapy Session',
      staffName: 'Marcus',
      staffRole: 'Therapist',
      appointmentAt: buildIsoAt(0, '14:15'),
      durationMinutes: 60,
      status: 'Confirmed',
      paymentStatus: 'Pending',
      branch: 'Downtown Loft',
    },
    {
      id: 'APT-6105',
      customerId: 'CUS-1006',
      serviceName: 'Hot Stone Therapy',
      staffName: 'Sofia',
      staffRole: 'Stylist',
      appointmentAt: buildIsoAt(0, '16:00'),
      durationMinutes: 75,
      status: 'Completed',
      paymentStatus: 'Paid',
      branch: 'Melrose Sanctuary',
    },
    {
      id: 'APT-6106',
      customerId: 'CUS-1005',
      serviceName: 'Aromatherapy Session',
      staffName: 'Marcus',
      staffRole: 'Therapist',
      appointmentAt: buildIsoAt(0, '17:30'),
      durationMinutes: 45,
      status: 'Payment Pending',
      paymentStatus: 'Partial',
      branch: 'Melrose Sanctuary',
    },
    {
      id: 'APT-6099',
      customerId: 'CUS-1001',
      serviceName: 'Signature Facial',
      staffName: 'Elena',
      staffRole: 'Aesthetician',
      appointmentAt: buildIsoAt(-1, '15:00'),
      durationMinutes: 60,
      status: 'Completed',
      paymentStatus: 'Paid',
      branch: 'Melrose Sanctuary',
    },
    {
      id: 'APT-6094',
      customerId: 'CUS-1004',
      serviceName: 'Deep Tissue Massage',
      staffName: 'Marcus',
      staffRole: 'Therapist',
      appointmentAt: buildIsoAt(-2, '11:00'),
      durationMinutes: 60,
      status: 'No Show',
      paymentStatus: 'Unpaid',
      branch: 'Downtown Loft',
    },
    {
      id: 'APT-6111',
      customerId: 'CUS-1002',
      serviceName: 'Hot Stone Therapy',
      staffName: 'Marcus',
      staffRole: 'Therapist',
      appointmentAt: buildIsoAt(1, '10:30'),
      durationMinutes: 60,
      status: 'Confirmed',
      paymentStatus: 'Pending',
      branch: 'Melrose Sanctuary',
    },
    {
      id: 'APT-6114',
      customerId: 'CUS-1003',
      serviceName: 'Hydra Glow Infusion',
      staffName: 'Elena',
      staffRole: 'Aesthetician',
      appointmentAt: buildIsoAt(2, '13:00'),
      durationMinutes: 75,
      status: 'Confirmed',
      paymentStatus: 'Pending',
      branch: 'Beverly Hills Retreat',
    },
  ];

  const payments = [
    {
      id: 'PAY-8801',
      appointmentId: 'APT-6101',
      customerId: 'CUS-1001',
      serviceName: 'Deep Tissue Massage',
      method: 'Cash',
      amountDue: 150,
      amountPaid: 0,
      balanceRemaining: 150,
      discountApplied: 0,
      status: 'Pending',
      paymentDate: buildIsoAt(0, '09:40'),
    },
    {
      id: 'PAY-8802',
      appointmentId: 'APT-6105',
      customerId: 'CUS-1006',
      serviceName: 'Hot Stone Therapy',
      method: 'Cash',
      amountDue: 160,
      amountPaid: 160,
      balanceRemaining: 0,
      discountApplied: 0,
      status: 'Paid',
      paymentDate: buildIsoAt(0, '16:55'),
    },
    {
      id: 'PAY-8803',
      appointmentId: 'APT-6106',
      customerId: 'CUS-1005',
      serviceName: 'Aromatherapy Session',
      method: 'Cash',
      amountDue: 135,
      amountPaid: 80,
      balanceRemaining: 55,
      discountApplied: 10,
      status: 'Partial',
      paymentDate: buildIsoAt(0, '17:55'),
    },
    {
      id: 'PAY-8799',
      appointmentId: 'APT-6099',
      customerId: 'CUS-1001',
      serviceName: 'Signature Facial',
      method: 'Card',
      amountDue: 120,
      amountPaid: 120,
      balanceRemaining: 0,
      discountApplied: 0,
      status: 'Paid',
      paymentDate: buildIsoAt(-1, '16:20'),
    },
    {
      id: 'PAY-8795',
      appointmentId: 'APT-6094',
      customerId: 'CUS-1004',
      serviceName: 'Deep Tissue Massage',
      method: 'Pending',
      amountDue: 150,
      amountPaid: 0,
      balanceRemaining: 150,
      discountApplied: 0,
      status: 'Unpaid',
      paymentDate: buildIsoAt(-2, '12:00'),
    },
  ];

  const leads = [
    {
      id: 'LED-3001',
      name: 'Nadia Bloom',
      phone: '+1 (323) 555-2001',
      status: 'New',
      source: 'Website Form',
      serviceInterest: 'Hydra Glow Infusion',
      assignedStaff: 'Elena',
      createdAt: buildIsoAt(0, '08:10'),
    },
    {
      id: 'LED-3002',
      name: 'Omar Reed',
      phone: '+1 (323) 555-2002',
      status: 'Contacted',
      source: 'Inquiry Chatbot',
      serviceInterest: 'Deep Tissue Massage',
      assignedStaff: 'Marcus',
      createdAt: buildIsoAt(0, '09:20'),
    },
    {
      id: 'LED-3003',
      name: 'Iris Long',
      phone: '+1 (323) 555-2003',
      status: 'Booked',
      source: 'Instagram',
      serviceInterest: 'Signature Facial',
      assignedStaff: 'Elena',
      createdAt: buildIsoAt(-1, '14:00'),
    },
    {
      id: 'LED-3004',
      name: 'Mia Avery',
      phone: '+1 (323) 555-2004',
      status: 'Awaiting Response',
      source: 'Phone Inquiry',
      serviceInterest: 'Aromatherapy Session',
      assignedStaff: 'Unassigned',
      createdAt: buildIsoAt(-1, '11:40'),
    },
    {
      id: 'LED-3005',
      name: 'Leo Park',
      phone: '+1 (323) 555-2005',
      status: 'Lost',
      source: 'Walk-in',
      serviceInterest: 'Hot Stone Therapy',
      assignedStaff: 'Sofia',
      createdAt: buildIsoAt(-2, '13:30'),
    },
  ];

  return {
    appointments,
    customers,
    leads,
    payments,
    services,
    staff,
  };
})();

void dashboardSeed;

const parseMoney = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (value && typeof value === 'object') {
    return parseMoney(value.amount ?? value.total ?? value.value ?? 0);
  }
  return 0;
};

const formatMoney = (amount) =>
  `$${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const toLocalDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

const formatTime = (value) =>
  new Date(value).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

const normalizeCustomer = (customer, index = 0) => ({
  id: customer.id || customer._id || customer.customerId || `customer-${index + 1}`,
  name: customer.name || customer.customerName || customer.fullName || 'Guest',
  phone: customer.phone || customer.contactNumber || customer.mobile || '',
  totalVisits: Number(customer.totalVisits ?? customer.visits ?? 0),
});

const normalizeService = (service, index = 0) => ({
  id: service.id || service._id || service.serviceId || `service-${index + 1}`,
  name: service.name || service.serviceName || service.title || 'Service',
  price: parseMoney(service.price ?? service.cost ?? service.amount ?? 0),
});

const normalizeLeadStatus = (status) => {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'new') return 'New';
  if (value === 'contacted') return 'Contacted';
  if (value === 'booked') return 'Booked';
  if (value === 'lost') return 'Lost';
  if (value === 'awaiting response' || value === 'pending') return 'Awaiting Response';
  return 'New';
};

const normalizeLead = (lead, index = 0) => ({
  id: lead.id || lead._id || lead.leadId || `lead-${index + 1}`,
  name: lead.name || lead.customerName || lead.fullName || 'Untitled Lead',
  phone: lead.phone || lead.contactNumber || '',
  status: normalizeLeadStatus(lead.status || lead.leadStatus),
  source: lead.source || lead.inquirySource || 'Website Form',
  serviceInterest: lead.serviceInterest || lead.service || lead.requestedService || 'General Inquiry',
  assignedStaff: lead.assignedStaff || lead.assignedTo || 'Unassigned',
  createdAt: lead.createdAt || lead.created_at || new Date().toISOString(),
});

const normalizePaymentStatus = (status, balanceRemaining, amountPaid) => {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'paid') return 'Paid';
  if (value === 'partial') return 'Partial';
  if (value === 'refunded') return 'Refunded';
  if (value === 'pending') return 'Pending';
  if (value === 'unpaid') return 'Unpaid';
  if (balanceRemaining > 0 && amountPaid > 0) return 'Partial';
  if (balanceRemaining > 0) return 'Pending';
  return 'Paid';
};

const normalizePayment = (payment, index = 0) => {
  const amountDue = parseMoney(payment.amountDue ?? payment.totalDue ?? payment.amount ?? payment.total ?? 0);
  const amountPaid = parseMoney(payment.amountPaid ?? payment.paidAmount ?? payment.amountReceived ?? 0);
  const balanceRemaining =
    payment.balanceRemaining !== undefined && payment.balanceRemaining !== null
      ? parseMoney(payment.balanceRemaining)
      : Math.max(amountDue - amountPaid, 0);

  return {
    id: payment.id || payment._id || payment.paymentId || `payment-${index + 1}`,
    appointmentId: payment.appointmentId || payment.bookingId || '',
    customerId: payment.customerId || payment.clientId || '',
    serviceName: payment.serviceName || payment.service || 'Service',
    method: payment.method || payment.paymentMethod || 'Cash',
    amountDue,
    amountPaid,
    balanceRemaining,
    discountApplied: parseMoney(payment.discountApplied ?? payment.discount ?? 0),
    paymentDate: payment.paymentDate || payment.date || payment.createdAt || new Date().toISOString(),
    status: normalizePaymentStatus(payment.status || payment.paymentStatus, balanceRemaining, amountPaid),
  };
};

const normalizeStaff = (staff, index = 0) => ({
  id: staff.id || staff._id || staff.staffId || `staff-${index + 1}`,
  name: staff.name || staff.fullName || 'Staff',
  role: staff.role || staff.position || 'Staff Member',
  availability: staff.availability || staff.currentAvailability || 'Available',
  status: staff.status || (staff.active === false ? 'Inactive' : 'Active'),
  onDutyToday: Boolean(staff.onDutyToday ?? staff.onDuty ?? staff.status === 'Active'),
  capacityToday: Number(staff.capacityToday ?? staff.dailyCapacity ?? staff.capacity ?? 0),
});

const normalizeBranch = (branch, index = 0) => ({
  id: branch.id || branch._id || branch.branchId || `branch-${index + 1}`,
  name: branch.name || branch.branchName || `Branch ${index + 1}`,
  status: branch.status || (branch.active === false ? 'Closed' : 'Open'),
  active: Boolean(branch.active ?? String(branch.status || '').toLowerCase() === 'open'),
});

const normalizeAppointmentStatus = (status, paymentStatus) => {
  const value = String(status || '').trim().toLowerCase();
  let normalized = 'Confirmed';

  if (value === 'confirmed') normalized = 'Confirmed';
  else if (value === 'awaiting arrival' || value === 'pending') normalized = 'Awaiting Arrival';
  else if (value === 'arrived' || value === 'checked in' || value === 'check in') normalized = 'Arrived';
  else if (value === 'in progress' || value === 'inprogress') normalized = 'In Progress';
  if (value === 'completed' || value === 'done') {
    normalized = String(paymentStatus || '').toLowerCase() === 'paid' ? 'Completed' : 'Payment Pending';
  }
  else if (value === 'cancelled' || value === 'canceled') normalized = 'Cancelled';
  else if (value === 'no show' || value === 'noshow') normalized = 'No Show';
  else if (value === 'payment pending') normalized = 'Payment Pending';

  return APPOINTMENT_STATUSES.includes(normalized) ? normalized : 'Confirmed';
};

const parseDuration = (durationRaw, startValue, endValue) => {
  const direct = Number(durationRaw);
  if (!Number.isNaN(direct) && direct > 0) return direct;

  if (startValue && endValue) {
    const start = new Date(startValue);
    const end = new Date(endValue);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start) {
      return Math.round((end.getTime() - start.getTime()) / 60000);
    }
  }

  return 60;
};

const normalizeAppointment = (appointment, index = 0, { customerLookup, serviceLookup, staffLookup } = {}) => {
  const customerId = appointment.customerId || appointment.clientId || appointment.customer || '';
  const customer = customerLookup?.get(customerId);
  const staffNameRaw = appointment.staffName || appointment.staff || appointment.assignedStaff || appointment.therapist || '';
  const staff = staffLookup?.get(staffNameRaw.toLowerCase());
  const serviceId = appointment.serviceId || appointment.treatmentId || '';
  const service = serviceLookup?.get(serviceId);
  const appointmentAt =
    appointment.appointmentAt ||
    appointment.dateTime ||
    appointment.start ||
    appointment.startTime ||
    appointment.createdAt ||
    new Date().toISOString();
  const paymentStatus = normalizePaymentStatus(
    appointment.paymentStatus || appointment.payment || 'Pending',
    parseMoney(appointment.balanceRemaining ?? 0),
    parseMoney(appointment.amountPaid ?? 0),
  );
  const status = normalizeAppointmentStatus(appointment.status || appointment.appointmentStatus, paymentStatus);

  return {
    id: appointment.id || appointment._id || appointment.appointmentId || `appointment-${index + 1}`,
    customerId,
    customerName: customer?.name || appointment.customerName || appointment.customer || 'Guest',
    phone: customer?.phone || appointment.phone || appointment.contactNumber || '',
    serviceName: service?.name || appointment.serviceName || appointment.service || appointment.treatment || 'Service',
    staffName: staff?.name || staffNameRaw || 'Unassigned',
    staffRole: appointment.staffRole || staff?.role || appointment.role || 'Therapist',
    appointmentAt,
    durationMinutes: parseDuration(
      appointment.durationMinutes || appointment.duration,
      appointmentAt,
      appointment.end || appointment.endTime,
    ),
    status,
    paymentStatus,
    branch: appointment.branchName || appointment.branch || appointment.location || 'Melrose Sanctuary',
  };
};

const appointmentStatusTone = (status) => {
  switch (status) {
    case 'In Progress':
      return 'warning';
    case 'Arrived':
      return 'success';
    case 'Completed':
      return 'good';
    case 'Payment Pending':
      return 'alert';
    case 'Cancelled':
    case 'No Show':
      return 'muted';
    case 'Awaiting Arrival':
      return 'neutral';
    default:
      return 'neutral';
  }
};

const paymentStatusTone = (status) => {
  switch (String(status || '').toLowerCase()) {
    case 'paid':
      return 'good';
    case 'partial':
      return 'warning';
    case 'pending':
    case 'unpaid':
      return 'alert';
    default:
      return 'neutral';
  }
};

const toPhoneHref = (phone) => `tel:${String(phone || '').replace(/[^0-9+]/g, '')}`;

const roleAllows = (widgetId, role) => {
  const allowed = WIDGET_ACCESS[widgetId] || [];
  return allowed.includes(normalizeDashboardRole(role));
};

const CrmDashboard = () => {
  const navigate = useNavigate();
  const dashboardSession = getCrmSession();
  const dashboardRole = normalizeDashboardRole(dashboardSession?.role);
  const dashboardRoleLabel = formatRoleLabel(dashboardRole);
  const dashboardUserLabel = formatDisplayName(dashboardSession?.email || dashboardSession?.sub) || dashboardRoleLabel;
  const [selectedBranch, setSelectedBranch] = useState(TOP_BRANCHES[0]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [syncNotice, setSyncNotice] = useState('');
  const [now, setNow] = useState(() => new Date());

  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [payments, setPayments] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadDashboardData = async () => {
      setIsLoading(true);

      setSyncNotice('');

      const resourceRequests = [
        { key: 'customers', request: crmList('customers') },
        { key: 'services', request: crmList('services') },
        { key: 'staff', request: crmList('staff') },
        { key: 'appointments', request: crmList('appointments') },
        { key: 'leads', request: crmList('leads') },
        { key: 'payments', request: crmList('payments') },
        { key: 'branches', request: crmList('branches') },
      ];

      const results = await Promise.allSettled(resourceRequests.map((entry) => entry.request));

      if (!mounted) return;

      const customersRaw = results[0].status === 'fulfilled' ? results[0].value : [];
      const servicesRaw = results[1].status === 'fulfilled' ? results[1].value : [];
      const staffRaw = results[2].status === 'fulfilled' ? results[2].value : [];
      const appointmentsRaw = results[3].status === 'fulfilled' ? results[3].value : [];
      const leadsRaw = results[4].status === 'fulfilled' ? results[4].value : [];
      const paymentsRaw = results[5].status === 'fulfilled' ? results[5].value : [];
      const branchesRaw = results[6].status === 'fulfilled' ? results[6].value : [];

      const failedResources = results
        .map((result, index) => (result.status === 'rejected' ? resourceRequests[index].key : ''))
        .filter(Boolean);

      const normalizedCustomers = customersRaw.map(normalizeCustomer);
      const normalizedServices = servicesRaw.map(normalizeService);
      const normalizedStaff = staffRaw.map(normalizeStaff);
      const normalizedLeads = leadsRaw.map(normalizeLead);
      const normalizedPayments = paymentsRaw.map(normalizePayment);
      const normalizedBranches = branchesRaw.map(normalizeBranch);

      const customerLookup = new Map(normalizedCustomers.map((item) => [item.id, item]));
      const serviceLookup = new Map(normalizedServices.map((item) => [item.id, item]));
      const staffLookup = new Map(normalizedStaff.map((item) => [String(item.name).toLowerCase(), item]));

      const normalizedAppointments = appointmentsRaw.map((appointment, index) =>
        normalizeAppointment(appointment, index, {
          customerLookup,
          serviceLookup,
          staffLookup,
        }),
      );

      setCustomers(normalizedCustomers);
      setServices(normalizedServices);
      setStaff(normalizedStaff);
      setBranches(normalizedBranches);
      setAppointments(normalizedAppointments);
      setLeads(normalizedLeads);
      setPayments(normalizedPayments);
      setSyncNotice(describeDashboardLoadIssue(failedResources));

      setIsLoading(false);
    };

    void loadDashboardData();

    return () => {
      mounted = false;
    };
  }, []);

  const branchOptions = useMemo(() => {
    const names = [
      ...TOP_BRANCHES.slice(1),
      ...branches.map((branch) => branch.name),
      ...appointments.map((appointment) => appointment.branch),
    ].filter(Boolean);

    return [TOP_BRANCHES[0], ...new Set(names)];
  }, [appointments, branches]);
  const activeBranch = branchOptions.includes(selectedBranch) ? selectedBranch : TOP_BRANCHES[0];

  const today = now;
  const nowMs = now.getTime();
  const todayKey = useMemo(() => toLocalDateKey(today), [today]);
  const yesterdayKey = useMemo(() => {
    const prior = new Date(today);
    prior.setDate(prior.getDate() - 1);
    return toLocalDateKey(prior);
  }, [today]);

  const branchFilteredAppointments = useMemo(() => {
    if (activeBranch === 'All Branches') return appointments;
    return appointments.filter((item) => item.branch === activeBranch);
  }, [appointments, activeBranch]);

  const todayAppointments = useMemo(() => {
    return branchFilteredAppointments
      .filter((item) => toLocalDateKey(item.appointmentAt) === todayKey)
      .sort((a, b) => new Date(a.appointmentAt).getTime() - new Date(b.appointmentAt).getTime());
  }, [branchFilteredAppointments, todayKey]);

  const yesterdayAppointmentsCount = useMemo(() => {
    return branchFilteredAppointments.filter((item) => toLocalDateKey(item.appointmentAt) === yesterdayKey).length;
  }, [branchFilteredAppointments, yesterdayKey]);

  const filteredTodayAppointments = useMemo(() => {
    if (!globalSearch.trim()) return todayAppointments;
    const term = globalSearch.trim().toLowerCase();
    return todayAppointments.filter((item) => {
      const haystack = `${item.customerName} ${item.serviceName} ${item.staffName} ${item.phone} ${item.id}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [globalSearch, todayAppointments]);

  const appointmentsWithLateInfo = useMemo(() => {
    return filteredTodayAppointments.map((item) => {
      const startedMs = new Date(item.appointmentAt).getTime();
      const lateMinutes = item.status === 'Awaiting Arrival' && startedMs < nowMs
        ? Math.max(0, Math.round((nowMs - startedMs) / 60000))
        : 0;
      return { ...item, lateMinutes };
    });
  }, [filteredTodayAppointments, nowMs]);

  const todayPayments = useMemo(() => {
    return payments.filter((payment) => toLocalDateKey(payment.paymentDate) === todayKey);
  }, [payments, todayKey]);

  const cashCollectedToday = useMemo(() => {
    return todayPayments
      .filter((payment) => String(payment.method).toLowerCase() === 'cash')
      .reduce((sum, payment) => sum + payment.amountPaid, 0);
  }, [todayPayments]);

  const cardCollectedToday = useMemo(() => {
    return todayPayments
      .filter((payment) => String(payment.method).toLowerCase() === 'card')
      .reduce((sum, payment) => sum + payment.amountPaid, 0);
  }, [todayPayments]);

  const pendingPayments = useMemo(() => {
    return payments.filter((payment) => payment.balanceRemaining > 0);
  }, [payments]);

  const pendingPaymentAmount = useMemo(() => {
    return pendingPayments.reduce((sum, payment) => sum + payment.balanceRemaining, 0);
  }, [pendingPayments]);

  const partialPaymentsCount = useMemo(() => {
    return payments.filter((payment) => payment.status === 'Partial' || (payment.amountPaid > 0 && payment.balanceRemaining > 0)).length;
  }, [payments]);

  const discountsAppliedToday = useMemo(() => {
    return todayPayments.reduce((sum, payment) => sum + payment.discountApplied, 0);
  }, [todayPayments]);

  const openingCash = 500;
  const closingCashEstimate = openingCash + cashCollectedToday;

  const newLeadsToday = useMemo(() => {
    return leads.filter((lead) => toLocalDateKey(lead.createdAt) === todayKey).length;
  }, [leads, todayKey]);

  const completedAppointments = useMemo(() => {
    return todayAppointments.filter((item) => item.status === 'Completed').length;
  }, [todayAppointments]);

  const staffOnDuty = useMemo(() => {
    return staff.filter((member) => member.onDutyToday && member.status === 'Active').length;
  }, [staff]);

  const globalSearchMatches = useMemo(() => {
    if (!globalSearch.trim()) return null;
    const term = globalSearch.trim().toLowerCase();

    const appointmentCount = appointments.filter((item) =>
      `${item.id} ${item.customerName} ${item.serviceName} ${item.staffName}`.toLowerCase().includes(term),
    ).length;

    const leadCount = leads.filter((lead) =>
      `${lead.name} ${lead.source} ${lead.serviceInterest}`.toLowerCase().includes(term),
    ).length;

    const customerCount = customers.filter((customer) =>
      `${customer.name} ${customer.phone}`.toLowerCase().includes(term),
    ).length;

    return {
      appointments: appointmentCount,
      inquiries: leadCount,
      leads: leadCount,
      customers: customerCount,
      total: appointmentCount + leadCount + customerCount,
    };
  }, [appointments, customers, globalSearch, leads]);

  const kpiCards = useMemo(() => {
    if (isLoading) {
      return [
        {
          title: "Today's Appointments",
          value: '—',
          subtext: 'Loading live schedule...',
          trend: 'Syncing',
        },
        {
          title: 'Cash Collected Today',
          value: '—',
          subtext: 'Loading payment ledger...',
          trend: 'Syncing',
        },
        {
          title: 'Pending Payments',
          value: '—',
          subtext: 'Loading payment balances...',
          trend: 'Syncing',
        },
        {
          title: 'New Inquiries Today',
          value: '—',
          subtext: 'Loading lead pipeline...',
          trend: 'Syncing',
        },
        {
          title: 'Staff On Duty',
          value: '—',
          subtext: 'Loading staff status...',
          trend: 'Syncing',
        },
        {
          title: 'Completed Appointments',
          value: '—',
          subtext: 'Loading completion status...',
          trend: 'Syncing',
        },
      ];
    }

    const appointmentDelta = todayAppointments.length - yesterdayAppointmentsCount;
    const appointmentTrend = appointmentDelta === 0
      ? 'No change vs yesterday'
      : `${appointmentDelta > 0 ? '+' : ''}${appointmentDelta} vs yesterday`;

    return [
      {
        title: "Today's Appointments",
        value: String(todayAppointments.length).padStart(2, '0'),
        subtext: appointmentTrend,
        trend: appointmentDelta >= 0 ? 'Up' : 'Down',
      },
      {
        title: 'Cash Collected Today',
        value: formatMoney(cashCollectedToday),
        subtext: `${formatMoney(cardCollectedToday)} card (future-ready)`,
        trend: 'Cash',
      },
      {
        title: 'Pending Payments',
        value: String(pendingPayments.length).padStart(2, '0'),
        subtext: `${formatMoney(pendingPaymentAmount)} outstanding`,
        trend: 'Due',
      },
      {
        title: 'New Inquiries Today',
        value: String(newLeadsToday).padStart(2, '0'),
        subtext: `${leads.filter((lead) => lead.status === 'Awaiting Response').length} awaiting response`,
        trend: 'Inquiry',
      },
      {
        title: 'Staff On Duty',
        value: `${staffOnDuty}/${staff.filter((member) => member.status === 'Active').length}`,
        subtext: `${staff.filter((member) => member.availability === 'Available').length} available now`,
        trend: 'Live',
      },
      {
        title: 'Completed Appointments',
        value: String(completedAppointments).padStart(2, '0'),
        subtext: `${todayAppointments.filter((item) => item.status === 'Payment Pending').length} payment alerts`,
        trend: 'Done',
      },
    ];
  }, [
    cardCollectedToday,
    cashCollectedToday,
    completedAppointments,
    isLoading,
    leads,
    newLeadsToday,
    pendingPaymentAmount,
    pendingPayments.length,
    staff,
    staffOnDuty,
    todayAppointments,
    yesterdayAppointmentsCount,
  ]);

  const alertsList = useMemo(() => {
    const list = [];

    appointments.forEach((appointment) => {
      const timeMs = new Date(appointment.appointmentAt).getTime();
      if (appointment.status === 'Awaiting Arrival' && timeMs < nowMs) {
        const minutes = Math.round((nowMs - timeMs) / 60000);
        if (minutes >= 10) {
          list.push({
            id: `alert-late-${appointment.id}`,
            title: 'Late arrival',
            detail: `${appointment.customerName} is ${minutes}m late`,
            tone: 'warning',
          });
        }
      }
    });

    if (pendingPayments.some((payment) => payment.balanceRemaining > 0)) {
      list.push({
        id: 'alert-pending-payment',
        title: 'Overdue balances',
        detail: `${pendingPayments.length} payments need settlement`,
        tone: 'warning',
      });
    }

    const unavailableStaff = staff.filter((member) => ['On Leave', 'Off Duty'].includes(member.availability));
    if (unavailableStaff.length > 0) {
      list.push({
        id: 'alert-staff-unavailable',
        title: 'Staff unavailable',
        detail: `${unavailableStaff.length} staff currently unavailable`,
        tone: 'muted',
      });
    }

    return list.slice(0, 6);
  }, [appointments, nowMs, pendingPayments, staff]);

  const topServicesToday = useMemo(() => {
    const grouped = todayAppointments.reduce((acc, appointment) => {
      const key = appointment.serviceName;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
  }, [todayAppointments]);

  const notificationCount = alertsList.length + (syncNotice ? 1 : 0);

  const todayLabel = useMemo(
    () =>
      now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }),
    [now],
  );

  const handleLogout = () => {
    clearCrmToken();
    navigate('/crm-login');
  };

  const patchAppointment = (appointmentId, patch) => {
    let previousAppointment = null;

    setAppointments((current) =>
      current.map((appointment) => {
        if (appointment.id !== appointmentId) {
          return appointment;
        }

        previousAppointment = appointment;
        return { ...appointment, ...patch };
      }),
    );

    void crmUpdate('appointments', appointmentId, patch).catch((error) => {
      if (previousAppointment) {
        setAppointments((current) =>
          current.map((appointment) => (appointment.id === appointmentId ? previousAppointment : appointment)),
        );
      }

      setSyncNotice(
        error?.message
          ? `Could not save that appointment update: ${error.message}`
          : 'Could not save that appointment update. The dashboard was restored locally.',
      );
    });
  };

  return (
    <CrmShell shellClassName="crm-dashboard-shell">
      <main className="crm-dashboard-main">
        <header className="crm-top-bar">
          <div className="crm-top-identity">
            <h1>Dashboard</h1>
            <p>Operational control center</p>
          </div>

          <div className="crm-top-search-wrap">
            <input
              className="crm-search"
              placeholder="Search customers, appointments, inquiries..."
              type="search"
              value={globalSearch}
              onChange={(event) => setGlobalSearch(event.target.value)}
              aria-label="Global CRM search"
            />
            {globalSearchMatches ? (
              <p className="crm-search-meta">
                {globalSearchMatches.total} matches: {globalSearchMatches.customers} customers, {globalSearchMatches.appointments} appointments, {globalSearchMatches.inquiries} inquiries
              </p>
            ) : (
              <p className="crm-search-meta">Global search is ready for customers, appointments, and inquiry records.</p>
            )}
          </div>

          <label className="crm-branch-picker" htmlFor="dashboard-branch">
            <span>Branch</span>
            <select
              id="dashboard-branch"
              value={activeBranch}
              onChange={(event) => setSelectedBranch(event.target.value)}
            >
              {branchOptions.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </label>

          <button type="button" className="crm-icon-btn" onClick={() => navigate('/crm/customers')}>
            Alerts
            {notificationCount > 0 ? <span>{notificationCount}</span> : null}
          </button>

          <button type="button" className="crm-profile-btn" onClick={() => navigate('/crm/settings')}>
            {dashboardUserLabel}
          </button>
          <button type="button" className="crm-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </header>

        {syncNotice ? <CrmSyncBanner message={syncNotice} /> : null}

        <section className="crm-welcome">
          <div>
            <h2>Good morning, {dashboardUserLabel}</h2>
            <p>
              Front desk flow, settlement priorities, and guest service in one calm operational view.
            </p>
          </div>
          <div className="crm-welcome-meta">
            <span className="crm-role-pill">{dashboardRoleLabel} view</span>
            <span className="crm-date-pill">{todayLabel}</span>
          </div>
        </section>

        <section className="crm-kpi-grid" aria-label="Dashboard KPIs">
          {kpiCards.map((card) => (
            <article key={card.title} className="crm-kpi-card">
              <div className="crm-kpi-meta">{card.trend}</div>
              <p className="crm-kpi-value">{card.value}</p>
              <p className="crm-kpi-title">{card.title}</p>
              <p className="crm-kpi-subtext">{card.subtext}</p>
            </article>
          ))}
        </section>

        <section className="crm-main-grid">
          {roleAllows('appointments', dashboardRole) ? (
            <article className="crm-appointments-card">
              <div className="crm-section-head">
                <div>
                  <h3>Today&apos;s Appointments</h3>
                  <p>Operational queue with payment and arrival context.</p>
                </div>
                <button type="button" onClick={() => navigate('/crm/appointments')}>
                  View Calendar
                </button>
              </div>

              <div className="crm-appointment-head-row">
                <p>Time</p>
                <p>Guest & Service</p>
                <p>Assigned Staff</p>
                <p>Status</p>
                <p>Actions</p>
              </div>

              {isLoading ? (
                <div className="crm-empty-state">
                  <h4>Loading appointments</h4>
                  <p>Pulling live schedule and payment context from CRM modules.</p>
                </div>
              ) : appointmentsWithLateInfo.length === 0 ? (
                <div className="crm-empty-state">
                  <h4>No appointments in this view</h4>
                  <p>Try another branch or reset search to restore today&apos;s queue.</p>
                </div>
              ) : (
                <div className="crm-appointment-list">
                  {appointmentsWithLateInfo.map((appointment) => (
                    <article key={appointment.id} className="crm-appointment-row">
                      <div className="crm-appointment-time-wrap">
                        <p className="crm-appointment-time">{formatTime(appointment.appointmentAt)}</p>
                        <span>{appointment.durationMinutes}m</span>
                      </div>

                      <div>
                        <p className="crm-appointment-customer">{appointment.customerName}</p>
                        <p className="crm-appointment-subline">{appointment.serviceName}</p>
                        {appointment.phone ? (
                          <a className="crm-phone-link" href={toPhoneHref(appointment.phone)}>
                            {appointment.phone}
                          </a>
                        ) : (
                          <p className="crm-appointment-subline">Phone not added</p>
                        )}
                      </div>

                      <div>
                        <p className="crm-appointment-role">{appointment.staffName}</p>
                        <p className="crm-appointment-subline">{appointment.staffRole}</p>
                      </div>

                      <div className="crm-appointment-status-stack">
                        <span className={`crm-status-tag crm-status-${appointmentStatusTone(appointment.status)}`}>
                          {appointment.status}
                        </span>
                        <span className={`crm-status-tag crm-status-payment-${paymentStatusTone(appointment.paymentStatus)}`}>
                          Payment: {appointment.paymentStatus}
                        </span>
                        {appointment.lateMinutes > 0 ? (
                          <span className="crm-late-pill">Late {appointment.lateMinutes}m</span>
                        ) : null}
                      </div>

                      <div className="crm-row-actions">
                        <button type="button" onClick={() => navigate('/crm/appointments')}>
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => patchAppointment(appointment.id, { status: 'Arrived', checkInAt: new Date().toISOString() })}
                          disabled={['Arrived', 'In Progress', 'Completed', 'Cancelled', 'No Show', 'Payment Pending'].includes(appointment.status)}
                        >
                          Check In
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            patchAppointment(appointment.id, {
                              status: appointment.paymentStatus === 'Paid' ? 'Completed' : 'Payment Pending',
                            })}
                          disabled={['Completed', 'Cancelled', 'No Show', 'Payment Pending'].includes(appointment.status)}
                        >
                          Complete
                        </button>
                        <button type="button" onClick={() => navigate('/crm/payments')}>
                          Record Payment
                        </button>
                        <button type="button" onClick={() => navigate('/crm/customers')}>
                          Open Customer
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <button className="crm-secondary-action" type="button" onClick={() => navigate('/crm/appointments')}>
                + Schedule New Slot
              </button>
            </article>
          ) : null}

          <div className="crm-side-stack">
            {roleAllows('conciergeActions', dashboardRole) ? (
              <article className="crm-concierge-card">
                <h3>Front Desk Actions</h3>
                <div className="crm-action-grid">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      className="crm-action-btn"
                      onClick={() => navigate(action.to)}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </article>
            ) : null}
          </div>
        </section>

        <section className="crm-lower-grid">
          {roleAllows('financialOverview', dashboardRole) ? (
            <article className="crm-insight-card">
              <h3>Cash Flow Snapshot</h3>
              <div className="crm-finance-grid">
                <div className="crm-finance-metric">
                  <p>Cash Collected Today</p>
                  <strong>{formatMoney(cashCollectedToday)}</strong>
                </div>
                <div className="crm-finance-metric">
                  <p>Pending Payments</p>
                  <strong>{formatMoney(pendingPaymentAmount)}</strong>
                </div>
                <div className="crm-finance-metric">
                  <p>Partial Payments</p>
                  <strong>{String(partialPaymentsCount).padStart(2, '0')}</strong>
                </div>
                <div className="crm-finance-metric">
                  <p>Discounts Applied</p>
                  <strong>{formatMoney(discountsAppliedToday)}</strong>
                </div>
                <div className="crm-finance-metric">
                  <p>Closing Cash Estimate</p>
                  <strong>{formatMoney(closingCashEstimate)}</strong>
                </div>
              </div>

              <div className="crm-finance-subgrid">
                <article>
                  <p className="crm-appointment-subline">Payment Mix (MVP)</p>
                  <div className="crm-payment-mix-row">
                    <span>Cash</span>
                    <strong>{formatMoney(cashCollectedToday)}</strong>
                  </div>
                  <div className="crm-payment-mix-row">
                    <span>Card</span>
                    <strong>{formatMoney(cardCollectedToday)}</strong>
                  </div>
                  <p className="crm-mix-note">
                    Card is optional and remains future-ready for branches still operating cash-first.
                  </p>
                  <p className="crm-mix-note">
                    Active services in catalog: {services.length}
                  </p>
                </article>

                <article>
                  <p className="crm-appointment-subline">Top Services Today</p>
                  {topServicesToday.length === 0 ? (
                    <p className="crm-mix-note">No completed service volume yet.</p>
                  ) : (
                    topServicesToday.map((service) => (
                      <div key={service.name} className="crm-payment-mix-row">
                        <span>{service.name}</span>
                        <strong>{service.count} bookings</strong>
                      </div>
                    ))
                  )}
                </article>
              </div>
            </article>
          ) : null}

        </section>
      </main>
    </CrmShell>
  );
};

export default CrmDashboard;
