import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearCrmToken } from '../config/crm';
import { crmCreate, crmDelete, crmList, crmUpdate } from '../config/crmApi';
import CrmShell from '../components/CrmShell';
import './CrmCustomers.css';

const ROLE_VIEW = 'receptionist';

const SEGMENT_OPTIONS = [
  'New Customer',
  'Repeat Customer',
  'VIP',
  'High Value',
  'Needs Attention',
  'Rebook Soon',
  'Inactive',
  'At Risk',
  'Returning After Gap',
];

const TYPE_FILTERS = ['All Segments', ...SEGMENT_OPTIONS];
const SOURCE_FILTERS = ['All Sources', 'Website Form', 'Walk-In', 'Instagram', 'Google', 'Referral', 'Chatbot', 'Phone Inquiry'];
const SPEND_FILTERS = ['Any Spend', 'Above $500', 'Above $1000', 'Above $3000'];
const ACTIVITY_FILTERS = ['All Activity', 'Rebook Soon', 'At Risk', 'Upcoming Today'];

let customerIdCounter = 1300;
let appointmentIdCounter = 7200;
let paymentIdCounter = 8600;
let receiptCounter = 15000;
let timelineEventCounter = 5000;
let noteIdCounter = 4000;

const createCustomerId = () => {
  customerIdCounter += 1;
  return `C-${customerIdCounter}`;
};

const createAppointmentId = () => {
  appointmentIdCounter += 1;
  return `APT-${appointmentIdCounter}`;
};

const createPaymentId = () => {
  paymentIdCounter += 1;
  return `PAY-${paymentIdCounter}`;
};

const createReceiptNo = () => {
  receiptCounter += 1;
  return `RCPT-${receiptCounter}`;
};

const createTimelineId = () => {
  timelineEventCounter += 1;
  return `ACT-${timelineEventCounter}`;
};

const createNoteId = () => {
  noteIdCounter += 1;
  return `NOTE-${noteIdCounter}`;
};

const shiftIso = (days, hour = 10, minute = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const toDateKey = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const addDaysToIso = (value, days, hour = 10, minute = 0) => {
  const base = value ? new Date(value) : new Date();
  base.setDate(base.getDate() + days);
  base.setHours(hour, minute, 0, 0);
  return base.toISOString();
};

const daysSince = (value) => {
  if (!value) return null;
  const diff = Date.now() - new Date(value).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatCurrency = (amount = 0) => `$${Number(amount).toLocaleString()}`;

const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

const downloadCsv = (filename, rows) => {
  const csv = rows.map((row) => row.map((cell) => escapeCsv(cell)).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const toLocalInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const tzOffset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - tzOffset * 60000);
  return local.toISOString().slice(0, 16);
};

const localInputToIso = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const getChurnSignal = (days) => {
  if (days === null) return 'No Visit Data';
  if (days >= 90) return 'At Risk';
  if (days >= 60) return 'Inactive Risk';
  if (days >= 30) return 'No Recent Visit';
  return 'Active';
};

const getRecommendedRebookDays = (favoriteService = '') => {
  const value = favoriteService.toLowerCase();
  if (value.includes('facial')) return 28;
  if (value.includes('massage') || value.includes('stone') || value.includes('aroma')) return 21;
  if (value.includes('nail')) return 18;
  return 30;
};

const normalizePaymentEntry = (entry, index = 0) => ({
  id: entry.id || entry.paymentId || `PAY-LEGACY-${index + 1}`,
  date: entry.date || entry.paymentDate || shiftIso(-index - 3, 11, 0),
  amount: Number(entry.amount ?? entry.total ?? entry.amountPaid ?? 0),
  method: entry.method || entry.paymentMethod || 'Cash',
  service: entry.service || entry.serviceName || 'Service',
  receiptNo: entry.receiptNo || entry.receiptNumber || '',
  status: entry.status || 'Paid',
});

const normalizeAppointmentEntry = (entry, index = 0) => ({
  id: entry.id || entry.appointmentId || `APT-H-${index + 1}`,
  dateTime: entry.dateTime || entry.start || entry.date || shiftIso(-index - 4, 10, 0),
  service: entry.service || entry.serviceName || 'Service',
  staff: entry.staff || entry.therapist || 'Unassigned',
  status: entry.status || 'Completed',
});

const normalizeTimelineEntry = (entry, index = 0) => ({
  id: entry.id || `ACT-LEGACY-${index + 1}`,
  type: entry.type || 'Activity',
  at: entry.at || entry.date || shiftIso(-index - 2, 10, 15),
  actor: entry.actor || entry.by || 'Front Desk',
  channel: entry.channel || 'CRM',
  outcome: entry.outcome || 'Updated',
  summary: entry.summary || entry.note || 'Activity updated',
});

const normalizeNoteEntry = (entry, index = 0) => ({
  id: entry.id || `NOTE-LEGACY-${index + 1}`,
  at: entry.at || entry.date || shiftIso(-index - 3, 9, 30),
  author: entry.author || entry.by || 'Front Desk',
  text: entry.text || entry.note || '',
});

const hiddenCustomerIdentifiers = new Set([
  'c-1190',
  'isabella thorne',
  'isabella.thorne@example.com',
]);

const shouldHideCustomer = (customer) => {
  const values = [customer?.id, customer?.customerId, customer?.name, customer?.fullName, customer?.email, customer?.contactEmail]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());

  return values.some((value) => hiddenCustomerIdentifiers.has(value));
};

const customerSeed = [
  {
    id: 'C-1144',
    name: 'Julian Marc',
    phone: '+1 (555) 012-4433',
    email: 'julian.marc@example.com',
    segment: 'Repeat Customer',
    status: 'Active',
    acquisitionSource: 'Instagram',
    createdAt: shiftIso(-180, 10, 10),
    lastVisit: shiftIso(-27, 15, 10),
    visitCount: 8,
    totalSpend: 1190,
    loyaltyPoints: 410,
    favoriteService: 'Swedish Massage',
    favoriteStaff: 'Marcus',
    preferredTimes: 'Late afternoons',
    preferredChannel: 'Phone',
    sensitivities: 'None reported',
    upcomingAppointment: null,
    pendingBalance: 45,
    paymentHistory: [
      { id: 'PAY-7920', date: shiftIso(-27, 16, 5), amount: 125, method: 'Cash', service: 'Swedish Massage', receiptNo: 'RCPT-13820', status: 'Paid' },
      { id: 'PAY-7611', date: shiftIso(-78, 16, 10), amount: 165, method: 'Cash', service: 'Hot Stone Therapy', receiptNo: 'RCPT-13511', status: 'Partial' },
    ],
    appointmentHistory: [
      { id: 'APT-H-1111', dateTime: shiftIso(-27, 15, 0), service: 'Swedish Massage', staff: 'Marcus', status: 'Completed' },
      { id: 'APT-H-1112', dateTime: shiftIso(-78, 15, 30), service: 'Hot Stone Therapy', staff: 'Marcus', status: 'Completed' },
    ],
    activityTimeline: [
      { id: 'ACT-1101', type: 'Check-in Logged', at: shiftIso(-22, 12, 40), actor: 'Marcus', channel: 'Phone', outcome: 'No response', summary: 'Call attempted, voicemail left' },
      { id: 'ACT-1102', type: 'Payment Recorded', at: shiftIso(-27, 16, 5), actor: 'Front Desk', channel: 'POS', outcome: 'Paid', summary: 'Cash payment completed at checkout' },
    ],
    notes: [
      { id: 'NOTE-111', at: shiftIso(-20, 11, 10), author: 'Marcus', text: 'Good candidate for recovery package upsell.' },
    ],
    noShowCount: 1,
    cancellationCount: 0,
    membership: 'None',
    preferences: ['Swedish Massage'],
  },
  {
    id: 'C-1087',
    name: 'Elara Vance',
    phone: '+1 (555) 012-7722',
    email: 'elara.vance@example.com',
    segment: 'High Value',
    status: 'Active',
    acquisitionSource: 'Google',
    createdAt: shiftIso(-420, 9, 30),
    lastVisit: shiftIso(-15, 10, 45),
    visitCount: 42,
    totalSpend: 9210,
    loyaltyPoints: 2104,
    favoriteService: 'Hot Stone Therapy',
    favoriteStaff: 'Elena',
    preferredTimes: 'Mid-morning',
    preferredChannel: 'Email',
    sensitivities: 'Avoid peppermint products',
    upcomingAppointment: { id: 'APT-2188', dateTime: shiftIso(8, 11, 0), service: 'Deluxe Facial', staff: 'Elena', status: 'Confirmed' },
    pendingBalance: 0,
    paymentHistory: [
      { id: 'PAY-7500', date: shiftIso(-15, 12, 15), amount: 275, method: 'Cash', service: 'Hot Stone Therapy', receiptNo: 'RCPT-13400', status: 'Paid' },
      { id: 'PAY-7420', date: shiftIso(-38, 11, 28), amount: 310, method: 'Card', service: 'Deluxe Facial', receiptNo: 'RCPT-13320', status: 'Paid' },
    ],
    appointmentHistory: [
      { id: 'APT-H-1211', dateTime: shiftIso(-15, 10, 30), service: 'Hot Stone Therapy', staff: 'Elena', status: 'Completed' },
      { id: 'APT-H-1212', dateTime: shiftIso(-38, 11, 0), service: 'Deluxe Facial', staff: 'Elena', status: 'Completed' },
    ],
    activityTimeline: [
      { id: 'ACT-1201', type: 'Appointment Booked', at: shiftIso(-3, 10, 16), actor: 'Front Desk', channel: 'CRM', outcome: 'Confirmed', summary: 'Booked Deluxe Facial for next week' },
      { id: 'ACT-1202', type: 'Check-in Logged', at: shiftIso(-4, 9, 0), actor: 'Elena', channel: 'Email', outcome: 'Awaiting reply', summary: 'Birthday package details sent' },
    ],
    notes: [
      { id: 'NOTE-121', at: shiftIso(-15, 13, 0), author: 'Elena', text: 'Long-term client. Birthday package in May.' },
    ],
    noShowCount: 0,
    cancellationCount: 2,
    membership: 'Platinum Ritual',
    preferences: ['Hot Stone Therapy', 'Deluxe Facial'],
  },
  {
    id: 'C-1012',
    name: 'Arthur Penhaligon',
    phone: '+1 (555) 012-1100',
    email: 'arthur.penhaligon@example.com',
    segment: 'Inactive',
    status: 'Dormant',
    acquisitionSource: 'Walk-In',
    createdAt: shiftIso(-780, 10, 0),
    lastVisit: shiftIso(-183, 13, 40),
    visitCount: 2,
    totalSpend: 260,
    loyaltyPoints: 55,
    favoriteService: 'Reflexology',
    favoriteStaff: 'Unassigned',
    preferredTimes: 'N/A',
    preferredChannel: 'Phone',
    sensitivities: 'None reported',
    upcomingAppointment: null,
    pendingBalance: 0,
    paymentHistory: [
      { id: 'PAY-6120', date: shiftIso(-183, 14, 5), amount: 130, method: 'Cash', service: 'Reflexology', receiptNo: 'RCPT-12620', status: 'Paid' },
      { id: 'PAY-6088', date: shiftIso(-199, 13, 35), amount: 130, method: 'Cash', service: 'Reflexology', receiptNo: 'RCPT-12588', status: 'Paid' },
    ],
    appointmentHistory: [
      { id: 'APT-H-1411', dateTime: shiftIso(-183, 13, 0), service: 'Reflexology', staff: 'Sofia', status: 'Completed' },
      { id: 'APT-H-1412', dateTime: shiftIso(-199, 12, 45), service: 'Reflexology', staff: 'Sofia', status: 'Completed' },
    ],
    activityTimeline: [
      { id: 'ACT-1401', type: 'Check-in Logged', at: shiftIso(-92, 11, 0), actor: 'Front Desk', channel: 'Phone', outcome: 'No answer', summary: 'Win-back call not answered' },
      { id: 'ACT-1402', type: 'Appointment Completed', at: shiftIso(-183, 14, 0), actor: 'Sofia', channel: 'CRM', outcome: 'Completed', summary: 'Last recorded visit completed' },
    ],
    notes: [
      { id: 'NOTE-141', at: shiftIso(-92, 11, 40), author: 'Front Desk', text: 'No visits for 6+ months. Add to win-back campaign.' },
    ],
    noShowCount: 2,
    cancellationCount: 1,
    membership: 'None',
    preferences: ['Reflexology'],
  },
];

const normalizeCustomer = (customer, index = 0) => {
  const rawPreferences = Array.isArray(customer.preferences) ? customer.preferences : customer.favoriteService ? [customer.favoriteService] : ['General Wellness'];

  const appointmentHistory = (Array.isArray(customer.appointmentHistory) ? customer.appointmentHistory : [])
    .map(normalizeAppointmentEntry)
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

  const paymentHistory = (Array.isArray(customer.paymentHistory) ? customer.paymentHistory : [])
    .map(normalizePaymentEntry)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const timeline = (Array.isArray(customer.activityTimeline) ? customer.activityTimeline : [])
    .map(normalizeTimelineEntry)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const notes = (Array.isArray(customer.notes) ? customer.notes : [])
    .map(normalizeNoteEntry)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const nextAppointment = customer.upcomingAppointment
    ? normalizeAppointmentEntry(customer.upcomingAppointment)
    : customer.nextAppointment
      ? normalizeAppointmentEntry({
          dateTime: customer.nextAppointment,
          service: customer.favoriteService || rawPreferences[0] || 'Service',
          staff: customer.favoriteStaff || customer.preferredStaff || 'Unassigned',
          status: 'Confirmed',
        })
      : null;

  const segmentValue = customer.segment || customer.tag || customer.customerType || 'Repeat Customer';
  const segment = segmentValue === 'Rebooking Due'
    ? 'Rebook Soon'
    : segmentValue;
  const visitCount = Number(customer.visitCount ?? customer.totalVisits ?? customer.visits ?? 0);
  const totalSpend = Number(customer.totalSpend ?? customer.lifetimeSpend ?? 0);
  const loyaltyPoints = Number(customer.loyaltyPoints ?? customer.points ?? 0);

  return {
    id: customer.id || customer._id || customer.customerId || `customer-${index + 1}`,
    name: customer.name || customer.fullName || customer.customerName || 'Untitled Customer',
    phone: customer.phone || customer.mobile || customer.contactNumber || '',
    email: customer.email || customer.contactEmail || '',
    segment,
    status: customer.status || customer.accountStatus || (segment === 'Inactive' ? 'Dormant' : 'Active'),
    acquisitionSource: customer.acquisitionSource || customer.source || 'Website Form',
    createdAt: customer.createdAt || customer.created_at || shiftIso(-20, 10, 0),
    lastVisit: customer.lastVisit || customer.lastVisitDate || '',
    visitCount,
    totalSpend,
    loyaltyPoints,
    favoriteService: customer.favoriteService || rawPreferences[0] || 'General Wellness',
    favoriteStaff: customer.favoriteStaff || customer.preferredStaff || 'Unassigned',
    preferredTimes: customer.preferredTimes || customer.preferredTime || 'Flexible',
    preferredChannel: customer.preferredChannel || 'Phone',
    sensitivities: customer.sensitivities || customer.allergies || 'None reported',
    upcomingAppointment: nextAppointment,
    pendingBalance: Number(customer.pendingBalance ?? customer.balance ?? 0),
    paymentHistory,
    appointmentHistory,
    activityTimeline: timeline,
    notes,
    noShowCount: Number(customer.noShowCount ?? 0),
    cancellationCount: Number(customer.cancellationCount ?? 0),
    membership: customer.membership || 'None',
    preferences: rawPreferences,
  };
};

const CrmCustomers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState(customerSeed.map(normalizeCustomer));
  const [searchTerm, setSearchTerm] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('All Segments');
  const [sourceFilter, setSourceFilter] = useState('All Sources');
  const [spendFilter, setSpendFilter] = useState('Any Spend');
  const [activityFilter, setActivityFilter] = useState('All Activity');
  const [vipOnly, setVipOnly] = useState(false);
  const [inactiveRiskOnly, setInactiveRiskOnly] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerSeed[0]?.id || '');
  const [workspaceTab, setWorkspaceTab] = useState('activity');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadCustomers = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const data = await crmList('customers');
        if (!mounted) return;
        const normalized = (data.length > 0 ? data : customerSeed)
          .map(normalizeCustomer)
          .filter((entry) => !shouldHideCustomer(entry));
        setCustomers(normalized);
        setSelectedCustomerId((current) => (normalized.some((entry) => entry.id === current) ? current : normalized[0]?.id || ''));
      } catch (error) {
        if (!mounted) return;
        setCustomers(customerSeed.map(normalizeCustomer).filter((entry) => !shouldHideCustomer(entry)));
        setLoadError(error.message || 'Live customer sync unavailable. Showing fallback CRM records.');
        setSelectedCustomerId(customerSeed.map(normalizeCustomer).filter((entry) => !shouldHideCustomer(entry))[0]?.id || '');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadCustomers();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredCustomers = useMemo(() => {
    const todayKey = toDateKey(new Date());

    return customers.filter((customer) => {
      const text = `${customer.name} ${customer.phone} ${customer.email} ${customer.segment} ${customer.favoriteService} ${customer.favoriteStaff}`.toLowerCase();
      const matchesSearch = !searchTerm || text.includes(searchTerm.trim().toLowerCase());

      const matchesSegment = segmentFilter === 'All Segments' || customer.segment === segmentFilter;
      const matchesSource = sourceFilter === 'All Sources' || customer.acquisitionSource === sourceFilter;

      const matchesSpend = (() => {
        if (spendFilter === 'Any Spend') return true;
        if (spendFilter === 'Above $500') return customer.totalSpend > 500;
        if (spendFilter === 'Above $1000') return customer.totalSpend > 1000;
        if (spendFilter === 'Above $3000') return customer.totalSpend > 3000;
        return true;
      })();

      const days = daysSince(customer.lastVisit);
      const churnSignal = getChurnSignal(days);
      const recommendedRebookDays = getRecommendedRebookDays(customer.favoriteService);
      const rebookingDue = !customer.upcomingAppointment && days !== null && days >= recommendedRebookDays;
      const isUpcomingToday = customer.upcomingAppointment ? toDateKey(customer.upcomingAppointment.dateTime) === todayKey : false;

      const matchesActivity = (() => {
        if (activityFilter === 'All Activity') return true;
        if (activityFilter === 'Rebook Soon') return rebookingDue;
        if (activityFilter === 'At Risk') return churnSignal === 'At Risk' || churnSignal === 'Inactive Risk';
        if (activityFilter === 'Upcoming Today') return isUpcomingToday;
        return true;
      })();

      const matchesVip = !vipOnly || /vip|high value/i.test(customer.segment);
      const matchesInactiveRisk = !inactiveRiskOnly || churnSignal === 'At Risk' || churnSignal === 'Inactive Risk' || /inactive|at risk/i.test(customer.segment);

      return matchesSearch && matchesSegment && matchesSource && matchesSpend && matchesActivity && matchesVip && matchesInactiveRisk;
    });
  }, [activityFilter, customers, inactiveRiskOnly, searchTerm, segmentFilter, sourceFilter, spendFilter, vipOnly]);

  useEffect(() => {
    if (filteredCustomers.length === 0) return;
    if (!filteredCustomers.some((customer) => customer.id === selectedCustomerId)) {
      setSelectedCustomerId(filteredCustomers[0].id);
    }
  }, [filteredCustomers, selectedCustomerId]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) || filteredCustomers[0] || customers[0] || null,
    [customers, filteredCustomers, selectedCustomerId],
  );

  const summaryCards = useMemo(() => {
    const all = customers;
    const todayKey = toDateKey(new Date());
    const vipCount = all.filter((customer) => /vip|high value/i.test(customer.segment)).length;
    const rebookSoonCount = all.filter((customer) => {
      const days = daysSince(customer.lastVisit);
      const recommendedRebookDays = getRecommendedRebookDays(customer.favoriteService);
      return !customer.upcomingAppointment && days !== null && days >= recommendedRebookDays;
    }).length;
    const atRiskCount = all.filter((customer) => {
      const signal = getChurnSignal(daysSince(customer.lastVisit));
      return signal === 'At Risk' || signal === 'Inactive Risk';
    }).length;
    const upcomingTodayCount = all.filter(
      (customer) => customer.upcomingAppointment && toDateKey(customer.upcomingAppointment.dateTime) === todayKey,
    ).length;
    const pendingBalanceTotal = all.reduce((total, customer) => total + Number(customer.pendingBalance || 0), 0);

    return [
      {
        label: 'Total Profiles',
        value: all.length.toLocaleString(),
        subtext: `${filteredCustomers.length.toLocaleString()} visible with filters`,
      },
      {
        label: 'VIP + High Value',
        value: vipCount.toLocaleString(),
        subtext: 'Priority relationship segment',
      },
      {
        label: 'Rebook Soon',
        value: rebookSoonCount.toLocaleString(),
        subtext: 'Customers due for another visit',
      },
      {
        label: 'At-Risk Profiles',
        value: atRiskCount.toLocaleString(),
        subtext: 'No recent visits or churn signal',
      },
      {
        label: 'Upcoming Today',
        value: upcomingTodayCount.toLocaleString(),
        subtext: 'Appointments scheduled for today',
      },
      {
        label: 'Pending Balance',
        value: formatCurrency(pendingBalanceTotal),
        subtext: 'Outstanding payment across customers',
      },
    ];
  }, [customers, filteredCustomers.length]);

  const updateCustomerInState = (customerId, updater) => {
    setCustomers((list) => list.map((customer) => (customer.id === customerId ? updater(customer) : customer)));
  };

  const handleSegmentUpdate = (customerId, segment) => {
    updateCustomerInState(customerId, (customer) => ({
      ...customer,
      segment,
      status: segment === 'Inactive' ? 'Dormant' : customer.status,
    }));

    void crmUpdate('customers', customerId, {
      segment,
      tag: segment,
      customerType: segment,
      status: segment === 'Inactive' ? 'Dormant' : 'Active',
    }).catch((error) => {
      setLoadError(error.message || 'Customer segment update failed.');
    });
  };

  const handleQuickCreateCustomer = async () => {
    const name = window.prompt('Customer name');
    if (!name) return;

    const phone = window.prompt('Phone number', '') || '';
    const email = window.prompt('Email address', '') || '';
    const segment = window.prompt('Segment', 'Repeat Customer') || 'Repeat Customer';
    const acquisitionSource = window.prompt('Acquisition source', 'Walk-In') || 'Walk-In';
    const nowIso = new Date().toISOString();

    const draftCustomer = {
      id: createCustomerId(),
      name,
      phone,
      email,
      segment,
      status: segment === 'Inactive' ? 'Dormant' : 'Active',
      acquisitionSource,
      createdAt: nowIso,
      lastVisit: '',
      visitCount: 0,
      totalSpend: 0,
      loyaltyPoints: 0,
      favoriteService: 'General Wellness',
      favoriteStaff: 'Unassigned',
      preferredTimes: 'Flexible',
      preferredChannel: 'Phone',
      sensitivities: 'None reported',
      upcomingAppointment: null,
      pendingBalance: 0,
      paymentHistory: [],
      appointmentHistory: [],
      activityTimeline: [
        {
          id: createTimelineId(),
          type: 'Customer Created',
          at: nowIso,
          actor: 'Front Desk',
          channel: 'CRM',
          outcome: 'Created',
          summary: 'Profile created from quick add',
        },
      ],
      notes: [
        {
          id: createNoteId(),
          at: nowIso,
          author: 'Front Desk',
          text: 'Created from CRM quick add',
        },
      ],
      noShowCount: 0,
      cancellationCount: 0,
      membership: 'None',
      preferences: ['General Wellness'],
    };

    try {
      const created = await crmCreate('customers', draftCustomer);
      const normalized = normalizeCustomer(created && typeof created === 'object' ? created : draftCustomer, customers.length);
      setCustomers((current) => [normalized, ...current]);
      setSelectedCustomerId(normalized.id);
    } catch (error) {
      const fallback = normalizeCustomer(draftCustomer, customers.length);
      setCustomers((current) => [fallback, ...current]);
      setSelectedCustomerId(fallback.id);
      setLoadError(`${error.message || 'Customer sync failed.'} Added locally for now.`);
    }
  };

  const handleExportCustomers = () => {
    const rows = [
      ['Customer ID', 'Name', 'Phone', 'Email', 'Segment', 'Source', 'Status', 'Visits', 'Spend', 'Loyalty Points', 'Pending Balance'],
      ...filteredCustomers.map((customer) => [
        customer.id,
        customer.name,
        customer.phone,
        customer.email,
        customer.segment,
        customer.acquisitionSource,
        customer.status,
        customer.visitCount,
        customer.totalSpend,
        customer.loyaltyPoints,
        customer.pendingBalance,
      ]),
    ];
    downloadCsv(`customers-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const handleBookAppointment = () => {
    if (!selectedCustomer) return;

    const service = window.prompt('Service name', selectedCustomer.favoriteService || selectedCustomer.preferences[0] || 'Signature Facial') || 'Signature Facial';
    const staff = window.prompt('Staff member', selectedCustomer.favoriteStaff || 'Unassigned') || 'Unassigned';
    const defaultDateTime = toLocalInput(addDaysToIso(new Date().toISOString(), 1, 10, 0));
    const inputDateTime = window.prompt('Appointment date/time (YYYY-MM-DDTHH:MM)', defaultDateTime) || defaultDateTime;
    const dateTime = localInputToIso(inputDateTime) || addDaysToIso(new Date().toISOString(), 1, 10, 0);

    const appointmentEntry = {
      id: createAppointmentId(),
      dateTime,
      service,
      staff,
      status: 'Confirmed',
    };

    const timelineEntry = {
      id: createTimelineId(),
      type: 'Appointment Booked',
      at: new Date().toISOString(),
      actor: 'Front Desk',
      channel: 'CRM',
      outcome: 'Confirmed',
      summary: `Booked ${service} for ${formatDateTime(dateTime)}`,
    };
    const customerPatch = {
      upcomingAppointment: appointmentEntry,
      appointmentHistory: [appointmentEntry, ...selectedCustomer.appointmentHistory].sort(
        (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime(),
      ),
      activityTimeline: [timelineEntry, ...selectedCustomer.activityTimeline],
    };

    updateCustomerInState(selectedCustomer.id, (customer) => ({
      ...customer,
      ...customerPatch,
    }));

    void (async () => {
      let createdAppointment = null;
      try {
        createdAppointment = await crmCreate('appointments', {
          id: appointmentEntry.id,
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          phone: selectedCustomer.phone,
          serviceName: service,
          staffName: staff,
          appointmentAt: dateTime,
          durationMinutes: 60,
          status: 'Confirmed',
          paymentStatus: 'Pending',
          amountDue: 0,
          amountPaid: 0,
          balanceRemaining: 0,
          source: 'CRM',
          notes: `Booked from customer profile ${selectedCustomer.id}`,
        });

        const persistedAppointment = normalizeAppointmentEntry(createdAppointment, 0);
        const persistedCustomer = await crmUpdate('customers', selectedCustomer.id, {
          ...customerPatch,
          upcomingAppointment: persistedAppointment,
          appointmentHistory: [persistedAppointment, ...selectedCustomer.appointmentHistory].sort(
            (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime(),
          ),
          activityTimeline: [
            {
              ...timelineEntry,
              summary: `Booked ${persistedAppointment.service} for ${formatDateTime(persistedAppointment.dateTime)}`,
            },
            ...selectedCustomer.activityTimeline,
          ],
        });

        updateCustomerInState(selectedCustomer.id, () => normalizeCustomer(persistedCustomer));
      } catch (error) {
        if (createdAppointment?.id) {
          await crmDelete('appointments', createdAppointment.id).catch(() => {});
        }
        setLoadError(error.message || 'Customer booking failed.');
      }
    })();
  };

  const handleRecordPayment = () => {
    if (!selectedCustomer) return;

    const amountRaw = window.prompt('Payment amount', '120');
    if (!amountRaw) return;
    const amount = Number(amountRaw);
    if (Number.isNaN(amount) || amount <= 0) {
      setLoadError('Payment amount must be a positive number.');
      return;
    }

    const method = window.prompt('Payment method', 'Cash') || 'Cash';
    const service = selectedCustomer.upcomingAppointment?.service || selectedCustomer.favoriteService || 'Service';
    const recordedAt = new Date().toISOString();
    const paymentEntry = {
      id: createPaymentId(),
      date: recordedAt,
      amount,
      method,
      service,
      receiptNo: createReceiptNo(),
      status: 'Paid',
    };

    const timelineEntry = {
      id: createTimelineId(),
      type: 'Payment Recorded',
      at: recordedAt,
      actor: 'Front Desk',
      channel: 'POS',
      outcome: 'Paid',
      summary: `${formatCurrency(amount)} recorded via ${method}`,
    };
    const updatedSpend = Number(selectedCustomer.totalSpend || 0) + amount;
    const updatedLoyaltyPoints = Number(selectedCustomer.loyaltyPoints || 0) + Math.max(1, Math.round(amount));
    const customerPatch = {
      pendingBalance: Math.max(0, Number(selectedCustomer.pendingBalance || 0) - amount),
      totalSpend: updatedSpend,
      loyaltyPoints: updatedLoyaltyPoints,
      paymentHistory: [paymentEntry, ...selectedCustomer.paymentHistory].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
      activityTimeline: [timelineEntry, ...selectedCustomer.activityTimeline],
    };

    updateCustomerInState(selectedCustomer.id, (customer) => ({
      ...customer,
      ...customerPatch,
    }));

    void (async () => {
      let createdPayment = null;
      try {
        createdPayment = await crmCreate('payments', {
          id: paymentEntry.id,
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          serviceName: service,
          amountDue: amount,
          amountPaid: amount,
          balanceRemaining: 0,
          method,
          status: 'Paid',
          paymentDate: recordedAt,
          recordedBy: 'Front Desk',
          receiptNo: paymentEntry.receiptNo,
          notes: `Recorded from customer profile ${selectedCustomer.id}`,
        });

        const persistedPayment = normalizePaymentEntry({
          ...paymentEntry,
          id: createdPayment?.id || paymentEntry.id,
          paymentDate: createdPayment?.paymentDate || recordedAt,
          status: createdPayment?.status || 'Paid',
        });

        const persistedCustomer = await crmUpdate('customers', selectedCustomer.id, {
          ...customerPatch,
          paymentHistory: [persistedPayment, ...selectedCustomer.paymentHistory].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          ),
          activityTimeline: [
            {
              ...timelineEntry,
              summary: `${formatCurrency(amount)} recorded via ${method}`,
            },
            ...selectedCustomer.activityTimeline,
          ],
        });

        updateCustomerInState(selectedCustomer.id, () => normalizeCustomer(persistedCustomer));
      } catch (error) {
        if (createdPayment?.id) {
          await crmDelete('payments', createdPayment.id).catch(() => {});
        }
        setLoadError(error.message || 'Customer payment failed.');
      }
    })();
  };

  const handleLogout = () => {
    clearCrmToken();
    navigate('/crm-login');
  };

  const workspaceTitle = useMemo(() => {
    if (workspaceTab === 'appointments') return 'Appointment History';
    if (workspaceTab === 'payments') return 'Payment / Receipt History';
    if (workspaceTab === 'notes') return 'Internal Notes';
    return 'Activity Timeline';
  }, [workspaceTab]);

  const workspaceHistoryItems = useMemo(() => {
    if (!selectedCustomer) return [];

    if (workspaceTab === 'payments') {
      return selectedCustomer.paymentHistory.map((item) => ({
        id: item.id,
        top: formatDateTime(item.date),
        primary: `${formatCurrency(item.amount)} | ${item.method}`,
        detail: item.service,
        badge: item.status,
      }));
    }

    if (workspaceTab === 'appointments') {
      return selectedCustomer.appointmentHistory.map((item) => ({
        id: item.id,
        top: formatDateTime(item.dateTime),
        primary: item.service,
        detail: item.staff,
        badge: item.status,
      }));
    }

    if (workspaceTab === 'notes') {
      return selectedCustomer.notes.map((item) => ({
        id: item.id,
        top: formatDateTime(item.at),
        primary: item.author,
        detail: item.text,
        badge: 'Note',
      }));
    }

    return selectedCustomer.activityTimeline.map((item) => ({
      id: item.id,
      top: formatDateTime(item.at),
      primary: item.type,
      detail: item.summary,
      badge: `${item.actor} | ${item.channel}`,
    }));
  }, [selectedCustomer, workspaceTab]);

  const workspaceEmptyCopy = useMemo(() => {
    if (workspaceTab === 'payments') return 'No payment history yet.';
    if (workspaceTab === 'appointments') return 'No appointment history yet.';
    if (workspaceTab === 'notes') return 'No notes saved yet.';
    return 'No timeline activity yet.';
  }, [workspaceTab]);

  return (
    <CrmShell shellClassName="crm-customers-shell">
      <main className="crm-customers-main">
        <header className="crm-customers-header">
          <div>
            <h1>Customers</h1>
            <p>Manage client records, service behavior, payment history, and retention actions in one place.</p>
            {loadError ? <p className="crm-info-copy">{loadError}</p> : null}
          </div>

          <div className="crm-customers-header-actions">
            <input
              type="search"
              placeholder="Search by name, phone, email, or segment..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <button type="button" className="crm-customers-ghost-btn" onClick={handleExportCustomers}>
              Export
            </button>
            <button type="button" className="crm-customers-primary-btn" onClick={handleQuickCreateCustomer}>
              Add New Customer
            </button>
            <button type="button" className="crm-customers-logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <section className="crm-customers-summary">
          {summaryCards.map((card) => (
            <article key={card.label} className="crm-customers-summary-card">
              <p>{card.label}</p>
              <h2>{card.value}</h2>
              <span>{card.subtext}</span>
            </article>
          ))}
        </section>

        <section className="crm-customers-filter-bar">
          <select value={segmentFilter} onChange={(event) => setSegmentFilter(event.target.value)}>
            {TYPE_FILTERS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
            {SOURCE_FILTERS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select value={spendFilter} onChange={(event) => setSpendFilter(event.target.value)}>
            {SPEND_FILTERS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select value={activityFilter} onChange={(event) => setActivityFilter(event.target.value)}>
            {ACTIVITY_FILTERS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <button
            type="button"
            className={`crm-customers-chip${vipOnly ? ' crm-customers-chip-active' : ''}`}
            onClick={() => setVipOnly((value) => !value)}
          >
            VIP Only
          </button>
          <button
            type="button"
            className={`crm-customers-chip${inactiveRiskOnly ? ' crm-customers-chip-active' : ''}`}
            onClick={() => setInactiveRiskOnly((value) => !value)}
          >
            Inactive Risk
          </button>
        </section>

        <section className="crm-customers-content">
          <article className="crm-customers-table-card">
            <header>
              <p>Guest</p>
              <p>Last Visit</p>
              <p>Next Appt</p>
              <p>Visits</p>
              <p>Spend</p>
              <p>Segment</p>
            </header>
            {isLoading ? (
              <div className="crm-customers-empty">
                <h3>Loading customers</h3>
                <p>Fetching the latest client records from the CRM backend.</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="crm-customers-empty">
                <h3>No customers found</h3>
                <p>Try removing a filter or add a new customer profile.</p>
              </div>
              ) : (
                <div className="crm-customers-table-body">
                  {filteredCustomers.map((customer) => {
                    const isSelected = selectedCustomer?.id === customer.id;
                    return (
                    <button
                      type="button"
                      key={customer.id}
                      className={`crm-customer-row${isSelected ? ' crm-customer-row-active' : ''}`}
                      onClick={() => {
                        setSelectedCustomerId(customer.id);
                        setWorkspaceTab('activity');
                      }}
                    >
                      <div className="crm-customer-row-main">
                        <p className="crm-customer-name">
                          <span className="crm-customer-name-text">{customer.name}</span>
                          <span>{customer.segment}</span>
                        </p>
                        <div className="crm-customer-row-contact">
                          <p className="crm-customer-sub">{customer.phone || '-'}</p>
                          <p className="crm-customer-sub">{customer.email || '-'}</p>
                        </div>
                      </div>
                      <p className="crm-customer-row-cell crm-customer-row-date">{formatDate(customer.lastVisit)}</p>
                      <p className="crm-customer-row-cell crm-customer-row-date">{formatDateTime(customer.upcomingAppointment?.dateTime)}</p>
                      <p className="crm-customer-row-cell crm-customer-row-stat">{customer.visitCount}</p>
                      <p className="crm-customer-row-cell crm-customer-row-money">{formatCurrency(customer.totalSpend)}</p>
                      <div className="crm-customer-row-select-wrap">
                        <select
                          value={customer.segment}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => handleSegmentUpdate(customer.id, event.target.value)}
                        >
                          {TYPE_FILTERS.filter((option) => option !== 'All Segments').map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </article>

          <aside className="crm-customer-detail">
            {selectedCustomer ? (
              <>
                <div className="crm-customer-profile">
                  <div className="crm-customer-avatar">
                    {selectedCustomer.name
                      .split(' ')
                      .slice(0, 2)
                      .map((word) => word[0] || '')
                      .join('')
                      .toUpperCase()}
                  </div>
                  <h3>{selectedCustomer.name}</h3>
                  <span>
                    {selectedCustomer.segment} | {getChurnSignal(daysSince(selectedCustomer.lastVisit))}
                  </span>
                  <p>{selectedCustomer.sensitivities}</p>
                </div>

                <div className="crm-customer-metrics">
                  <article>
                    <p>Lifetime Spend</p>
                    <strong>{formatCurrency(selectedCustomer.totalSpend)}</strong>
                  </article>
                  <article>
                    <p>Loyalty Points</p>
                    <strong>{selectedCustomer.loyaltyPoints.toLocaleString()}</strong>
                  </article>
                </div>

                <div className="crm-customer-info-block">
                  <p className="crm-info-title">Service Preferences</p>
                  <div className="crm-chip-row">
                    {selectedCustomer.preferences.map((pref) => (
                      <span key={pref}>{pref}</span>
                    ))}
                  </div>
                  <p className="crm-info-title">Preferred Staff</p>
                  <p className="crm-info-copy">{selectedCustomer.favoriteStaff}</p>
                  <p className="crm-info-title">Preferred Times</p>
                  <p className="crm-info-copy">{selectedCustomer.preferredTimes}</p>
                </div>

                <div className="crm-customer-actions crm-customer-primary-actions">
                  <button type="button" className="crm-customers-primary-btn" onClick={handleBookAppointment}>
                    Book Appointment
                  </button>
                  <button type="button" className="crm-customers-secondary-btn" onClick={handleRecordPayment}>
                    Record Payment
                  </button>
                </div>

                <div className="crm-customer-actions crm-customer-tab-actions">
                  <button
                    type="button"
                    className={workspaceTab === 'activity' ? 'crm-customers-secondary-btn' : 'crm-customers-ghost-btn'}
                    onClick={() => setWorkspaceTab('activity')}
                  >
                    Activity
                  </button>
                  <button
                    type="button"
                    className={workspaceTab === 'appointments' ? 'crm-customers-secondary-btn' : 'crm-customers-ghost-btn'}
                    onClick={() => setWorkspaceTab('appointments')}
                  >
                    Appointments
                  </button>
                  <button
                    type="button"
                    className={workspaceTab === 'payments' ? 'crm-customers-secondary-btn' : 'crm-customers-ghost-btn'}
                    onClick={() => setWorkspaceTab('payments')}
                  >
                    Payments
                  </button>
                  <button
                    type="button"
                    className={workspaceTab === 'notes' ? 'crm-customers-secondary-btn' : 'crm-customers-ghost-btn'}
                    onClick={() => setWorkspaceTab('notes')}
                  >
                    Notes
                  </button>
                </div>

                <div className="crm-customer-history">
                  <p className="crm-info-title">{workspaceTitle}</p>
                  {workspaceHistoryItems.length > 0 ? (
                    <ul className="crm-customer-history-list">
                      {workspaceHistoryItems.map((historyItem) => (
                        <li key={historyItem.id} className="crm-customer-history-item">
                          <div className="crm-customer-history-top">
                            <span>{historyItem.top}</span>
                            <span className="crm-customer-history-badge">{historyItem.badge}</span>
                          </div>
                          <strong>{historyItem.primary}</strong>
                          <p>{historyItem.detail}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="crm-customer-history-empty">{workspaceEmptyCopy}</div>
                  )}
                  <p className="crm-info-copy crm-customer-balance">
                    Pending balance: {formatCurrency(selectedCustomer.pendingBalance)}
                  </p>
                </div>
              </>
            ) : (
              <div className="crm-customers-empty">
                <h3>Select a customer</h3>
                <p>Choose a row to open profile intelligence and quick actions.</p>
              </div>
            )}
          </aside>
        </section>
      </main>
    </CrmShell>
  );
};

export default CrmCustomers;
