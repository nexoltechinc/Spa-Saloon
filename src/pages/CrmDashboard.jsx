import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearCrmToken } from '../config/crm';
import { crmList, crmUpdate } from '../config/crmApi';
import CrmShell from '../components/CrmShell';
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

const ACTIVE_DASHBOARD_ROLE = 'receptionist';

const WIDGET_ACCESS = {
  appointments: ['receptionist', 'manager', 'owner'],
  conciergeActions: ['receptionist', 'manager'],
  staffActivity: ['receptionist', 'manager', 'owner'],
  weeklySnapshot: ['receptionist', 'manager', 'owner'],
  financialOverview: ['manager', 'owner', 'receptionist'],
  alerts: ['receptionist', 'manager', 'owner'],
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
    branch: appointment.branch || appointment.location || 'Melrose Sanctuary',
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

const roleAllows = (widgetId) => {
  const allowed = WIDGET_ACCESS[widgetId] || [];
  return allowed.includes(ACTIVE_DASHBOARD_ROLE);
};

const CrmDashboard = () => {
  const navigate = useNavigate();
  const [selectedBranch, setSelectedBranch] = useState(TOP_BRANCHES[0]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [syncNotice, setSyncNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [appointments, setAppointments] = useState(dashboardSeed.appointments);
  const [customers, setCustomers] = useState(dashboardSeed.customers);
  const [leads, setLeads] = useState(dashboardSeed.leads);
  const [payments, setPayments] = useState(dashboardSeed.payments);
  const [services, setServices] = useState(dashboardSeed.services);
  const [staff, setStaff] = useState(dashboardSeed.staff);

  useEffect(() => {
    let mounted = true;

    const loadDashboardData = async () => {
      setIsLoading(true);
      setSyncNotice('');

      const [customersResult, servicesResult, staffResult, appointmentsResult, leadsResult, paymentsResult] = await Promise.allSettled([
        crmList('customers'),
        crmList('services'),
        crmList('staff'),
        crmList('appointments'),
        crmList('leads'),
        crmList('payments'),
      ]);

      if (!mounted) return;

      const failedModules = [];
      if (customersResult.status === 'rejected') failedModules.push('customers');
      if (servicesResult.status === 'rejected') failedModules.push('services');
      if (staffResult.status === 'rejected') failedModules.push('staff');
      if (appointmentsResult.status === 'rejected') failedModules.push('appointments');
      if (leadsResult.status === 'rejected') failedModules.push('leads');
      if (paymentsResult.status === 'rejected') failedModules.push('payments');

      const customersRaw = customersResult.status === 'fulfilled' ? customersResult.value : [];
      const servicesRaw = servicesResult.status === 'fulfilled' ? servicesResult.value : [];
      const staffRaw = staffResult.status === 'fulfilled' ? staffResult.value : [];
      const appointmentsRaw = appointmentsResult.status === 'fulfilled' ? appointmentsResult.value : [];
      const leadsRaw = leadsResult.status === 'fulfilled' ? leadsResult.value : [];
      const paymentsRaw = paymentsResult.status === 'fulfilled' ? paymentsResult.value : [];

      const normalizedCustomers = customersRaw.length > 0 ? customersRaw.map(normalizeCustomer) : dashboardSeed.customers;
      const normalizedServices = servicesRaw.length > 0 ? servicesRaw.map(normalizeService) : dashboardSeed.services;
      const normalizedStaff = staffRaw.length > 0 ? staffRaw.map(normalizeStaff) : dashboardSeed.staff;
      const normalizedLeads = leadsRaw.length > 0 ? leadsRaw.map(normalizeLead) : dashboardSeed.leads;
      const normalizedPayments = paymentsRaw.length > 0 ? paymentsRaw.map(normalizePayment) : dashboardSeed.payments;

      const customerLookup = new Map(normalizedCustomers.map((item) => [item.id, item]));
      const serviceLookup = new Map(normalizedServices.map((item) => [item.id, item]));
      const staffLookup = new Map(normalizedStaff.map((item) => [String(item.name).toLowerCase(), item]));

      const normalizedAppointments = appointmentsRaw.length > 0
        ? appointmentsRaw.map((appointment, index) =>
            normalizeAppointment(appointment, index, {
              customerLookup,
              serviceLookup,
              staffLookup,
            }))
        : dashboardSeed.appointments;

      setCustomers(normalizedCustomers);
      setServices(normalizedServices);
      setStaff(normalizedStaff);
      setAppointments(normalizedAppointments);
      setLeads(normalizedLeads);
      setPayments(normalizedPayments);

      if (failedModules.length > 0) {
        setSyncNotice(`Live sync is partial for: ${failedModules.join(', ')}. Fallback data is active for those modules.`);
      }

      setIsLoading(false);
    };

    void loadDashboardData();

    return () => {
      mounted = false;
    };
  }, []);

  const today = useMemo(() => new Date(), []);
  const nowMs = useMemo(() => today.getTime(), [today]);
  const todayKey = useMemo(() => toLocalDateKey(today), [today]);
  const yesterdayKey = useMemo(() => {
    const prior = new Date(today);
    prior.setDate(prior.getDate() - 1);
    return toLocalDateKey(prior);
  }, [today]);

  const branchFilteredAppointments = useMemo(() => {
    if (selectedBranch === 'All Branches') return appointments;
    return appointments.filter((item) => item.branch === selectedBranch);
  }, [appointments, selectedBranch]);

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
    leads,
    newLeadsToday,
    pendingPaymentAmount,
    pendingPayments.length,
    staff,
    staffOnDuty,
    todayAppointments,
    yesterdayAppointmentsCount,
  ]);

  const staffActivityRows = useMemo(() => {
    return staff
      .filter((member) => member.status === 'Active')
      .map((member) => {
        const assigned = todayAppointments.filter((appointment) =>
          appointment.staffName.toLowerCase() === member.name.toLowerCase(),
        );

        const remaining = assigned.filter((appointment) =>
          !['Completed', 'Cancelled', 'No Show'].includes(appointment.status),
        ).length;

        const nextAppointment = assigned
          .filter((appointment) => new Date(appointment.appointmentAt).getTime() >= nowMs)
          .sort((a, b) => new Date(a.appointmentAt).getTime() - new Date(b.appointmentAt).getTime())[0];

        const inProgress = assigned.some((appointment) => appointment.status === 'In Progress');
        const utilization = member.capacityToday > 0
          ? Math.min(100, Math.round((assigned.length / member.capacityToday) * 100))
          : 0;

        let liveState = member.availability;
        if (member.availability === 'On Leave') liveState = 'On Leave';
        else if (member.availability === 'Off Duty') liveState = 'Off Duty';
        else if (inProgress || member.availability === 'Busy') liveState = 'Busy';
        else if (member.availability === 'On Break') liveState = 'On Break';
        else liveState = 'Available';

        return {
          ...member,
          assignedCount: assigned.length,
          remaining,
          nextAppointmentLabel: nextAppointment ? formatTime(nextAppointment.appointmentAt) : 'No more today',
          utilization,
          liveState,
        };
      })
      .sort((left, right) => {
        const leftBusy = left.liveState === 'Busy' ? 0 : 1;
        const rightBusy = right.liveState === 'Busy' ? 0 : 1;
        return leftBusy - rightBusy;
      });
  }, [nowMs, staff, todayAppointments]);

  const weeklySnapshot = useMemo(() => {
    const reference = new Date();
    const dayOfWeek = reference.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(reference);
    monday.setDate(reference.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const days = Array.from({ length: 7 }).map((_, index) => {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + index);
      const dayKey = toLocalDateKey(dayDate);
      const count = appointments.filter((appointment) => toLocalDateKey(appointment.appointmentAt) === dayKey).length;
      return {
        key: dayKey,
        label: dayDate.toLocaleDateString('en-US', { weekday: 'short' }),
        count,
      };
    });

    const max = days.reduce((highest, day) => Math.max(highest, day.count), 0) || 1;

    return days.map((day) => ({
      ...day,
      density: Math.max(day.count > 0 ? 10 : 6, Math.round((day.count / max) * 100)),
      note: day.count >= Math.ceil(max * 0.75) ? 'Busy' : day.count <= 1 ? 'Available' : 'Steady',
    }));
  }, [appointments]);

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

  const notificationCount = alertsList.length;

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }),
    [],
  );

  const handleLogout = () => {
    clearCrmToken();
    navigate('/crm-login');
  };

  const patchAppointment = (appointmentId, patch) => {
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === appointmentId
          ? { ...appointment, ...patch }
          : appointment,
      ),
    );

    void crmUpdate('appointments', appointmentId, patch).catch(() => {
      setSyncNotice('Live update delayed. Appointment changes were applied locally and will sync when API is available.');
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
              value={selectedBranch}
              onChange={(event) => setSelectedBranch(event.target.value)}
            >
              {TOP_BRANCHES.map((branch) => (
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
            Isabella
          </button>
          <button type="button" className="crm-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </header>

        <section className="crm-welcome">
          <div>
            <h2>Good morning, Isabella</h2>
              <p>
                Front desk flow, settlement priorities, and guest service in one calm operational view.
              </p>
          </div>
          <div className="crm-welcome-meta">
            <span className="crm-role-pill">Receptionist view</span>
            <span className="crm-date-pill">{todayLabel}</span>
          </div>
        </section>

        {syncNotice ? <p className="crm-sync-note">{syncNotice}</p> : null}

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
          {roleAllows('appointments') ? (
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
                          onClick={() => patchAppointment(appointment.id, { status: 'Arrived' })}
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
            {roleAllows('conciergeActions') ? (
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

            {roleAllows('staffActivity') ? (
              <article className="crm-staff-card">
                <h3>Staff Activity</h3>
                {staffActivityRows.length === 0 ? (
                  <div className="crm-empty-mini">
                    <p>No staff activity available.</p>
                  </div>
                ) : (
                  <div className="crm-staff-list">
                    {staffActivityRows.map((member) => (
                      <article key={member.id} className="crm-staff-row">
                        <div className="crm-avatar">{member.name.slice(0, 1)}</div>
                        <div>
                          <p className="crm-staff-name">{member.name}</p>
                          <p className={`crm-staff-state crm-staff-state-${member.liveState.replace(/\s+/g, '-').toLowerCase()}`}>
                            {member.liveState}
                          </p>
                          <p className="crm-appointment-subline">
                            Next: {member.nextAppointmentLabel} - {member.remaining} remaining
                          </p>
                        </div>
                        <div className="crm-staff-workload">
                          <span>{member.assignedCount}/{member.capacityToday || 0}</span>
                          <em style={{ width: `${Math.max(8, member.utilization)}%` }} />
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </article>
            ) : null}

          </div>
        </section>

        <section className="crm-lower-grid">
          {roleAllows('weeklySnapshot') ? (
            <article className="crm-insight-card">
              <h3>Weekly Snapshot</h3>
              <div className="crm-weekly-list">
                {weeklySnapshot.map((day) => (
                  <article key={day.key} className="crm-weekly-row">
                    <div>
                      <p>{day.label}</p>
                      <span>{day.note}</span>
                    </div>
                    <strong>{day.count}</strong>
                    <em style={{ width: `${day.density}%` }} />
                  </article>
                ))}
              </div>
            </article>
          ) : null}

          {roleAllows('financialOverview') ? (
            <article className="crm-insight-card crm-insight-span-2">
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

          {roleAllows('alerts') ? (
            <article className="crm-insight-card">
              <h3>Alerts & Exceptions</h3>
              {alertsList.length === 0 ? (
                <div className="crm-empty-mini">
                  <p>No active exceptions right now.</p>
                </div>
              ) : (
                <div className="crm-alert-list">
                  {alertsList.map((alert) => (
                    <article key={alert.id} className={`crm-alert-row crm-alert-${alert.tone}`}>
                      <p>{alert.title}</p>
                      <span>{alert.detail}</span>
                    </article>
                  ))}
                </div>
              )}
            </article>
          ) : null}
        </section>
      </main>
    </CrmShell>
  );
};

export default CrmDashboard;
