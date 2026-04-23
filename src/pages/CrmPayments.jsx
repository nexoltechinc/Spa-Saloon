import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { clearCrmToken } from '../config/crm';
import { crmCreate, crmList, crmUpdate } from '../config/crmApi';
import { fetchReceiptSettings, loadReceiptSettings } from '../config/receiptSettings';
import CrmShell from '../components/CrmShell';
import ReceiptPreviewPanel from '../components/ReceiptPreviewPanel';
import AwaitingCheckoutQueue from '../components/payments/AwaitingCheckoutQueue';
import PaymentRow from '../components/payments/PaymentRow';
import ReceiptWorkspacePanel from '../components/payments/ReceiptWorkspacePanel';
import { collectOptionValues } from './crmWorkspaceUtils';
import './CrmPayments.css';

const paymentSeed = [
  {
    id: 'PAY-9921',
    customerName: 'Eleanor Hebert',
    customerEmail: 'eleanor.hebert@example.com',
    branchName: 'West Hollywood',
    appointmentId: 'APT-4402',
    serviceName: 'Deep Tissue Massage',
    amountDue: 180,
    amountPaid: 180,
    balanceRemaining: 0,
    method: 'Cash',
    status: 'Paid',
    dueDate: '2026-04-15T23:00:00',
    paymentDate: '2026-04-15T10:12:00',
    recordedBy: 'Marcus',
    editedBy: 'Marcus',
    notes: 'Received at front desk.',
    receiptStatus: 'Issued',
    receiptNumber: 'RCT-00009921',
    receiptGeneratedAt: '2026-04-15T10:18:00',
  },
  {
    id: 'PAY-9923',
    customerName: 'Sienna Miller',
    customerEmail: 'sienna.miller@example.com',
    branchName: 'Downtown',
    appointmentId: 'APT-4408',
    serviceName: 'Full Body Scrub',
    amountDue: 150,
    amountPaid: 0,
    balanceRemaining: 150,
    method: 'Pending',
    status: 'Unpaid',
    dueDate: '2026-04-10T18:00:00',
    paymentDate: '2026-04-09T11:45:00',
    recordedBy: 'Elena',
    editedBy: 'Front Desk',
    notes: 'Awaiting customer to arrive at checkout.',
    receiptStatus: 'Not Issued',
    receiptNumber: '',
    receiptGeneratedAt: '',
  },
  {
    id: 'PAY-9924',
    customerName: 'Robert Black',
    customerEmail: 'robert.black@example.com',
    branchName: 'Beverly Hills',
    appointmentId: 'APT-4411',
    serviceName: 'Manicure Deluxe',
    amountDue: 95,
    amountPaid: 95,
    balanceRemaining: 0,
    method: 'Cash',
    status: 'Paid',
    dueDate: '2026-04-14T23:00:00',
    paymentDate: '2026-04-14T16:10:00',
    recordedBy: 'Sofia',
    editedBy: 'Sofia',
    notes: 'Fully settled at end of visit.',
    receiptStatus: 'Issued',
    receiptNumber: 'RCT-00009924',
    receiptGeneratedAt: '2026-04-14T16:13:00',
  },
];

const hiddenPaymentIds = new Set(['PAY-9922']);
const shouldHidePayment = (payment) => {
  const paymentId = String(payment?.id || payment?.paymentId || '').trim().toUpperCase();
  return hiddenPaymentIds.has(paymentId);
};
const visiblePaymentSeed = paymentSeed.filter((payment) => !shouldHidePayment(payment));

const completedAppointmentsSeed = [
  { id: 'CHK-7101', appointmentId: 'APT-4422', customerName: 'Maya Cortez', customerEmail: 'maya.cortez@example.com', branchName: 'West Hollywood', serviceName: 'Aromatherapy Steam Escape', amountDue: 225, completedAt: '2026-04-15T12:35:00', status: 'Completed' },
  { id: 'CHK-7102', appointmentId: 'APT-4423', customerName: 'Priya Singh', customerEmail: 'priya.singh@example.com', branchName: 'Beverly Hills', serviceName: 'Hydra Glow Infusion', amountDue: 185, completedAt: '2026-04-15T13:10:00', status: 'Completed' },
  { id: 'CHK-7103', appointmentId: 'APT-4424', customerName: 'Carla Kim', customerEmail: 'carla.kim@example.com', branchName: 'Downtown', serviceName: 'Wellness Intake Consultation', amountDue: 55, completedAt: '2026-04-15T13:45:00', status: 'Completed' },
];

const statusOptions = ['All Statuses', 'Paid', 'Partial', 'Unpaid', 'Overdue', 'Refunded', 'Cancelled'];
const methodOptions = [
  { label: 'All Methods', value: 'All Methods' },
  { label: 'Cash', value: 'Cash' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Card (Future-ready)', value: 'Card' },
  { label: 'Bank Transfer (Future-ready)', value: 'Bank Transfer' },
];
const dateOptions = ['Today', 'Last 7 Days', 'This Month'];
const serviceCatalogSeed = [
  { id: 'SRV-101', name: 'Signature Facial', price: 120 },
  { id: 'SRV-102', name: 'Deep Tissue Massage', price: 150 },
  { id: 'SRV-103', name: 'Aromatherapy Session', price: 135 },
  { id: 'SRV-104', name: 'Hot Stone Therapy', price: 160 },
  { id: 'SRV-105', name: 'Scalp Renewal Ritual', price: 95 },
  { id: 'SRV-106', name: 'Hydra Glow Infusion', price: 185 },
  { id: 'SRV-107', name: 'Aromatherapy Steam Escape', price: 225 },
  { id: 'SRV-108', name: 'Wellness Intake Consultation', price: 55 },
];

const parseMoney = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const numeric = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isNaN(numeric) ? 0 : numeric;
  }
  return 0;
};

const formatMoney = (value) => `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDateTime = (value) => new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const toDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const toLocalInput = (value) => {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
};
const localInputToIso = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};
const deriveReceiptNumber = (paymentId) => `RCT-${String(paymentId || '').replace(/[^A-Za-z0-9]/g, '').slice(-8).padStart(8, '0').toUpperCase()}`;

const getDaysOverdue = (dueDate, balanceRemaining) => {
  if (balanceRemaining <= 0) return 0;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate || now);
  due.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86400000));
};

const getAgingBucket = (daysOverdue, balanceRemaining) => {
  if (balanceRemaining <= 0) return 'Current';
  if (daysOverdue === 0) return 'Due Today';
  if (daysOverdue <= 3) return '1-3 Days Overdue';
  if (daysOverdue <= 7) return '4-7 Days Overdue';
  return '8+ Days Overdue';
};

const normalizePayment = (payment, index = 0) => {
  const amountDue = parseMoney(payment.amountDue ?? payment.totalDue ?? payment.amount ?? payment.total ?? 0);
  const amountPaid = parseMoney(payment.amountPaid ?? payment.paidAmount ?? payment.amountReceived ?? 0);
  const balanceRemaining = payment.balanceRemaining !== undefined && payment.balanceRemaining !== null
    ? parseMoney(payment.balanceRemaining)
    : Math.max(amountDue - amountPaid, 0);
  const status = payment.status || payment.paymentStatus || (balanceRemaining <= 0 ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Unpaid');
  const dueDate = payment.dueDate || payment.paymentDate || payment.date || new Date().toISOString();
  const daysOverdue = getDaysOverdue(dueDate, balanceRemaining);
  const displayStatus = balanceRemaining > 0 && daysOverdue > 0 && !['Cancelled', 'Refunded'].includes(status) ? 'Overdue' : status;
  const receiptGenerated = Boolean(payment.receiptGenerated) || ['Issued', 'Generated'].includes(payment.receiptStatus);

  return {
    id: payment.id || payment.paymentId || `PAY-${9900 + index}`,
    customerName: payment.customerName || payment.customer || payment.name || 'Guest',
    customerEmail: payment.customerEmail || payment.email || '',
    customerId: payment.customerId || '',
    branchName: payment.branchName || payment.branch || payment.locationName || '',
    appointmentId: payment.appointmentId || payment.bookingId || payment.linkedAppointmentId || '',
    serviceName: payment.serviceName || payment.service || payment.treatment || 'Service',
    amountDue,
    amountPaid,
    balanceRemaining,
    method: payment.method || payment.paymentMethod || (amountPaid > 0 ? 'Cash' : 'Pending'),
    status,
    displayStatus,
    paymentDate: payment.paymentDate || payment.date || payment.createdAt || new Date().toISOString(),
    dueDate,
    daysOverdue,
    agingBucket: getAgingBucket(daysOverdue, balanceRemaining),
    recordedBy: payment.recordedBy || payment.cashier || payment.createdBy || 'Front Desk',
    editedBy: payment.editedBy || payment.updatedBy || payment.recordedBy || 'Front Desk',
    notes: payment.notes || payment.note || '',
    discountAmount: parseMoney(payment.discountAmount ?? payment.discount ?? 0),
    receiptStatus: payment.receiptStatus || payment.receipt || (receiptGenerated ? 'Issued' : 'Pending'),
    receiptGenerated,
    linkedReceiptId: payment.linkedReceiptId || payment.receiptId || '',
    receiptNumber: payment.receiptNumber || payment.receiptNo || (receiptGenerated ? deriveReceiptNumber(payment.id) : ''),
    receiptGeneratedAt: payment.receiptGeneratedAt || payment.issuedAt || '',
    receiptPrintedAt: payment.receiptPrintedAt || '',
    receiptEmailedAt: payment.receiptEmailedAt || '',
  };
};

const normalizeQueueItem = (appointment, index = 0) => ({
  id: appointment.id || appointment.appointmentId || `CHK-${index + 1}`,
  appointmentId: appointment.appointmentId || appointment.id || '',
  customerName: appointment.customerName || appointment.customer || 'Guest',
  customerEmail: appointment.customerEmail || appointment.email || '',
  branchName: appointment.branchName || appointment.branch || appointment.locationName || '',
  serviceName: appointment.serviceName || appointment.service || 'Service',
  amountDue: parseMoney(appointment.amountDue ?? appointment.totalDue ?? appointment.total ?? 0),
  completedAt: appointment.completedAt || appointment.dateTime || appointment.date || new Date().toISOString(),
  status: appointment.status || appointment.appointmentStatus || 'Completed',
});

const buildAwaitingQueue = (appointments, payments) => {
  const byAppointment = new Map();
  payments.forEach((payment) => {
    if (payment.appointmentId) byAppointment.set(payment.appointmentId, payment);
  });

  const queue = appointments
    .filter((appointment) => /completed|checked out|done/i.test(String(appointment.status || '')))
    .map((appointment) => {
      const linked = byAppointment.get(appointment.appointmentId);
      const amountDue = linked ? linked.amountDue : appointment.amountDue;
      const balanceRemaining = linked ? linked.balanceRemaining : amountDue;
      return {
        id: appointment.id,
        paymentId: linked?.id || '',
        appointmentId: appointment.appointmentId,
        customerName: linked?.customerName || appointment.customerName,
        customerEmail: linked?.customerEmail || appointment.customerEmail,
        branchName: linked?.branchName || appointment.branchName || '',
        serviceName: linked?.serviceName || appointment.serviceName,
        amountDue,
        balanceRemaining,
        completedAt: appointment.completedAt,
        statusLabel: linked?.displayStatus || 'Unpaid',
      };
    })
    .filter((entry) => entry.balanceRemaining > 0);

  payments
    .filter((payment) => payment.balanceRemaining > 0)
    .forEach((payment) => {
      if (queue.some((entry) => entry.paymentId === payment.id)) return;
      queue.push({
        id: `queue-${payment.id}`,
        paymentId: payment.id,
        appointmentId: payment.appointmentId,
        customerName: payment.customerName,
        customerEmail: payment.customerEmail,
        branchName: payment.branchName || '',
        serviceName: payment.serviceName,
        amountDue: payment.amountDue,
        balanceRemaining: payment.balanceRemaining,
        completedAt: payment.paymentDate,
        statusLabel: payment.displayStatus,
      });
    });

  return queue.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
};

const buildReceiptBranding = (settings = loadReceiptSettings()) => {
  const profile = settings.profile || {};
  return {
    tenantName: profile.businessName || 'Aura Spa & Wellness',
    tenantTagline: 'Premium Guest Receipt',
    receiptQuote: settings.receiptQuote || '',
  };
};

const buildReceiptPreview = (payment, branding) => ({
  id: payment.linkedReceiptId || `receipt-${payment.id.toLowerCase()}`,
  number: payment.receiptNumber || deriveReceiptNumber(payment.id),
  status: payment.receiptGenerated ? 'Issued' : 'Pending',
  statusTone: payment.receiptGenerated ? 'good' : 'warning',
  tenantName: branding.tenantName,
  tenantTagline: branding.tenantTagline,
  receiptQuote: branding.receiptQuote,
  paymentId: payment.id,
  issuedAt: payment.receiptGeneratedAt || new Date().toISOString(),
  customerName: payment.customerName,
  customerEmail: payment.customerEmail || '',
  appointmentId: payment.appointmentId,
  serviceName: payment.serviceName,
  method: payment.method,
  amountDue: payment.amountDue,
  amountPaid: payment.amountPaid,
  balanceRemaining: payment.balanceRemaining,
});

const buildDraftReceiptPreview = (draft, branding) => {
  const amountDue = parseMoney(draft.amountDue);
  const amountPaid = parseMoney(draft.amountPaid);
  return {
    id: 'receipt-draft',
    number: 'Draft Receipt',
    status: 'Preview',
    statusTone: 'warning',
    tenantName: branding.tenantName,
    tenantTagline: 'Receipt Entry Workspace',
    receiptQuote: branding.receiptQuote,
    paymentId: draft.sourcePaymentId || 'Pending',
    issuedAt: localInputToIso(draft.paymentDate),
    customerName: draft.customerName || 'Customer pending',
    customerEmail: draft.customerEmail || '',
    appointmentId: draft.appointmentId || '',
    serviceName: draft.serviceName || 'Service pending',
    method: draft.method || 'Cash',
    amountDue,
    amountPaid,
    balanceRemaining: Math.max(amountDue - amountPaid, 0),
  };
};

const CrmPayments = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [payments, setPayments] = useState(visiblePaymentSeed.map((payment, index) => normalizePayment(payment, index)));
  const [appointmentsQueue, setAppointmentsQueue] = useState(completedAppointmentsSeed.map(normalizeQueueItem));
  const [selectedPaymentId, setSelectedPaymentId] = useState(visiblePaymentSeed[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [methodFilter, setMethodFilter] = useState('All Methods');
  const [branchFilter, setBranchFilter] = useState('All Branches');
  const [cashierFilter, setCashierFilter] = useState('All Cashiers');
  const [receiptStatusFilter, setReceiptStatusFilter] = useState('All Receipt States');
  const [agingFilter, setAgingFilter] = useState('All Aging');
  const [dateFilter, setDateFilter] = useState('Today');
  const [todayOnly, setTodayOnly] = useState(false);
  const [linkedOnly, setLinkedOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [availableBranches, setAvailableBranches] = useState([]);
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [receiptNotice, setReceiptNotice] = useState('');
  const [receiptError, setReceiptError] = useState('');
  const [isReceiptBusy, setIsReceiptBusy] = useState(false);
  const [serviceCatalog, setServiceCatalog] = useState(serviceCatalogSeed);
  const [receiptBranding, setReceiptBranding] = useState(() => buildReceiptBranding());
  const [recordDraft, setRecordDraft] = useState({
    sourcePaymentId: '',
    customerName: '',
    customerEmail: '',
    appointmentId: '',
    branchName: '',
    serviceName: '',
    amountDue: '',
    amountPaid: '',
    method: 'Cash',
    paymentDate: toLocalInput(new Date()),
    notes: '',
    assignedTo: 'Front Desk',
  });

  useEffect(() => {
    let mounted = true;

    const loadPayments = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const [paymentsData, appointmentsData, servicesData, branchesData] = await Promise.all([
          crmList('payments').catch(() => []),
          crmList('appointments').catch(() => []),
          crmList('services').catch(() => []),
          crmList('branches').catch(() => []),
        ]);

        if (!mounted) return;

        const branchNames = new Set();
        const branchList = Array.isArray(branchesData) ? branchesData : [];
        branchList.forEach((branch) => {
          const name = branch?.name || branch?.branchName || branch?.locationName || branch?.title;
          if (name) branchNames.add(String(name).trim());
        });
        setAvailableBranches(Array.from(branchNames));

        const branchLookup = new Map(
          branchList
            .map((branch) => {
              const id = String(branch?.id || branch?._id || branch?.branchId || branch?.locationId || '').trim().toLowerCase();
              const name = String(branch?.name || branch?.branchName || branch?.locationName || branch?.title || '').trim();
              return id && name ? [id, name] : null;
            })
            .filter(Boolean),
        );

        const normalizedPayments = Array.isArray(paymentsData) && paymentsData.length > 0
          ? paymentsData
            .filter((payment) => !shouldHidePayment(payment))
            .map((payment, index) => normalizePayment(payment, index, branchLookup))
          : visiblePaymentSeed.map((payment, index) => normalizePayment(payment, index, branchLookup));

        const normalizedAppointments = Array.isArray(appointmentsData) && appointmentsData.length > 0
          ? appointmentsData.map((appointment, index) => normalizeQueueItem(appointment, index, branchLookup))
          : completedAppointmentsSeed.map((appointment, index) => normalizeQueueItem(appointment, index, branchLookup));

        const mergedCatalog = [...serviceCatalogSeed];
        if (Array.isArray(servicesData)) {
          servicesData.forEach((service, index) => {
            const normalized = { id: service.id || service._id || `SRV-${index + 1}`, name: service.name || service.serviceName || '', price: parseMoney(service.price ?? service.amount ?? 0) };
            if (!normalized.name) return;
            if (!mergedCatalog.some((item) => item.name.toLowerCase() === normalized.name.toLowerCase())) {
              mergedCatalog.push(normalized);
            }
          });
        }

        setPayments(normalizedPayments);
        setAppointmentsQueue(normalizedAppointments);
        setServiceCatalog(mergedCatalog);
        setSelectedPaymentId((current) => normalizedPayments.some((payment) => payment.id === current) ? current : normalizedPayments[0]?.id || '');
      } catch (error) {
        if (!mounted) return;
        setPayments(visiblePaymentSeed.map((payment, index) => normalizePayment(payment, index)));
        setAppointmentsQueue(completedAppointmentsSeed.map((appointment, index) => normalizeQueueItem(appointment, index)));
        setLoadError(error.message || 'Unable to load payments from the CRM API.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadPayments();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const refreshSettings = async () => {
      try {
        const settings = await fetchReceiptSettings();
        if (mounted) {
          setReceiptBranding(buildReceiptBranding(settings));
        }
      } catch {
        if (mounted) {
          setReceiptBranding(buildReceiptBranding());
        }
      }
    };

    void refreshSettings();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const incomingPaymentId = location.state?.selectedPaymentId || location.state?.receiptId;
    if (incomingPaymentId && !shouldHidePayment({ id: incomingPaymentId })) {
      setSelectedPaymentId(String(incomingPaymentId));
      setIsRecordOpen(Boolean(location.state?.openCheckout));
    }
  }, [location.state]);

  useEffect(() => {
    const refreshReceiptBranding = () => {
      setReceiptBranding(buildReceiptBranding());
    };

    window.addEventListener('focus', refreshReceiptBranding);
    window.addEventListener('storage', refreshReceiptBranding);
    return () => {
      window.removeEventListener('focus', refreshReceiptBranding);
      window.removeEventListener('storage', refreshReceiptBranding);
    };
  }, []);

  const awaitingCheckoutQueue = useMemo(() => buildAwaitingQueue(appointmentsQueue, payments), [appointmentsQueue, payments]);

  const branchOptions = useMemo(
    () => ['All Branches', ...collectOptionValues([...payments, ...appointmentsQueue, ...availableBranches.map((branchName) => ({ branchName }))], ['branchName'])],
    [appointmentsQueue, availableBranches, payments],
  );

  const cashierOptions = useMemo(
    () => ['All Cashiers', ...collectOptionValues(payments, ['recordedBy', 'editedBy'])],
    [payments],
  );

  const receiptStatusOptionsMemo = useMemo(
    () => ['All Receipt States', ...collectOptionValues(payments, ['receiptStatus'])],
    [payments],
  );

  const visiblePayments = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 6);

    return payments
      .filter((payment) => {
        const searchTarget = `${payment.id} ${payment.customerName} ${payment.appointmentId} ${payment.serviceName} ${payment.receiptNumber} ${payment.branchName} ${payment.recordedBy}`.toLowerCase();
        const matchesSearch = !searchTerm || searchTarget.includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All Statuses' || payment.displayStatus === statusFilter || payment.status === statusFilter;
        const matchesMethod = methodFilter === 'All Methods' || payment.method === methodFilter;
        const matchesBranch = branchFilter === 'All Branches' || payment.branchName === branchFilter;
        const matchesCashier = cashierFilter === 'All Cashiers' || payment.recordedBy === cashierFilter || payment.editedBy === cashierFilter;
        const matchesReceiptStatus = receiptStatusFilter === 'All Receipt States' || payment.receiptStatus === receiptStatusFilter;
        const matchesAging = agingFilter === 'All Aging' || payment.agingBucket === agingFilter;
        const date = new Date(payment.paymentDate);
        const matchesDate = todayOnly
          ? toDateKey(date) === toDateKey(now)
          : dateFilter === 'Today'
            ? toDateKey(date) === toDateKey(now)
            : dateFilter === 'Last 7 Days'
              ? date >= weekAgo
              : date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        const matchesLinked = !linkedOnly || Boolean(payment.appointmentId);
        const matchesOverdue = !overdueOnly || payment.displayStatus === 'Overdue';
        return matchesSearch && matchesStatus && matchesMethod && matchesBranch && matchesCashier && matchesReceiptStatus && matchesAging && matchesDate && matchesLinked && matchesOverdue;
      })
      .sort((left, right) => new Date(right.paymentDate) - new Date(left.paymentDate));
  }, [
    agingFilter,
    branchFilter,
    cashierFilter,
    dateFilter,
    linkedOnly,
    methodFilter,
    overdueOnly,
    payments,
    receiptStatusFilter,
    searchTerm,
    statusFilter,
    todayOnly,
  ]);

  const filteredAwaitingCheckoutQueue = useMemo(
    () => awaitingCheckoutQueue.filter((entry) => branchFilter === 'All Branches' || entry.branchName === branchFilter),
    [awaitingCheckoutQueue, branchFilter],
  );

  useEffect(() => {
    if (visiblePayments.length === 0) {
      setSelectedPaymentId('');
      return;
    }
    if (!visiblePayments.some((payment) => payment.id === selectedPaymentId)) {
      setSelectedPaymentId(visiblePayments[0].id);
    }
  }, [selectedPaymentId, visiblePayments]);

  const summaryCards = useMemo(() => {
    const todayPayments = visiblePayments.filter((payment) => toDateKey(payment.paymentDate) === toDateKey(new Date()));
    const cashCollectedToday = todayPayments.filter((payment) => payment.method === 'Cash').reduce((sum, payment) => sum + payment.amountPaid, 0);
    const unpaidTransactions = filteredAwaitingCheckoutQueue.filter((entry) => entry.balanceRemaining > 0).length;
    const partialBalances = visiblePayments.filter((payment) => payment.status === 'Partial' && payment.balanceRemaining > 0).length;
    const fullyPaidTransactions = visiblePayments.filter((payment) => payment.displayStatus === 'Paid').length;
    const overdueOutstanding = visiblePayments.filter((payment) => payment.displayStatus === 'Overdue').reduce((sum, payment) => sum + payment.balanceRemaining, 0);

    return [
      { label: 'Payments Recorded Today', value: String(todayPayments.length).padStart(2, '0'), subtext: 'Payment entries created today' },
      { label: 'Cash Collected Today', value: formatMoney(cashCollectedToday), subtext: 'Cash received in current day' },
      { label: 'Unpaid Transactions', value: String(unpaidTransactions).padStart(2, '0'), subtext: 'Completed visits awaiting checkout' },
      { label: 'Partial Balances', value: String(partialBalances).padStart(2, '0'), subtext: 'Customers with remaining balance' },
      { label: 'Fully Paid Transactions', value: String(fullyPaidTransactions).padStart(2, '0'), subtext: 'Settled payment records' },
      { label: 'Overdue Outstanding', value: formatMoney(overdueOutstanding), subtext: 'Unpaid balances past due', alert: true },
    ];
  }, [filteredAwaitingCheckoutQueue, visiblePayments]);

  const selectedPayment = useMemo(() => visiblePayments.find((payment) => payment.id === selectedPaymentId) || visiblePayments[0] || null, [selectedPaymentId, visiblePayments]);
  const recentPayments = useMemo(
    () => [...visiblePayments].sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)),
    [visiblePayments],
  );

  const recentReceipts = useMemo(() => recentPayments.filter((payment) => payment.receiptGenerated).map((payment) => ({
    id: payment.linkedReceiptId || payment.id,
    receiptNumber: payment.receiptNumber || deriveReceiptNumber(payment.id),
    customerName: payment.customerName,
    amountPaid: payment.amountPaid,
    receiptGeneratedAt: payment.receiptGeneratedAt || payment.paymentDate,
  })), [recentPayments]);

  const activeReceipt = useMemo(() => {
    if (isRecordOpen) return buildDraftReceiptPreview(recordDraft, receiptBranding);
    if (!selectedPayment) return null;
    return buildReceiptPreview(selectedPayment, receiptBranding);
  }, [isRecordOpen, recordDraft, receiptBranding, selectedPayment]);

  const draftAmountDueValue = parseMoney(recordDraft.amountDue);
  const draftAmountPaidValue = parseMoney(recordDraft.amountPaid);
  const draftRemainingBalanceValue = Math.max(draftAmountDueValue - draftAmountPaidValue, 0);

  const applyPaymentPatch = async (paymentId, patch) => {
    let nextPayment = null;
    setPayments((current) => current.map((entry, index) => {
      if (entry.id !== paymentId) return entry;
      nextPayment = normalizePayment({ ...entry, ...patch }, index);
      return nextPayment;
    }));

    if (nextPayment) {
      setSelectedPaymentId(nextPayment.id);
      try {
        await crmUpdate('payments', paymentId, patch);
      } catch {
        // Keep UI optimistic for front desk speed.
      }
    }

    return nextPayment;
  };

  const openCreateDrawer = (prefill = null) => {
    setSaveError('');
    setReceiptError('');
    setReceiptNotice('');

    if (prefill) {
      const matchedService = serviceCatalog.find((service) => service.name.toLowerCase() === String(prefill.serviceName || '').toLowerCase());
      setRecordDraft({
        sourcePaymentId: prefill.paymentId || '',
        customerName: prefill.customerName || '',
        customerEmail: prefill.customerEmail || '',
        appointmentId: prefill.appointmentId || '',
        branchName: prefill.branchName || (branchFilter !== 'All Branches' ? branchFilter : ''),
        serviceName: matchedService?.name || prefill.serviceName || '',
        amountDue: String(matchedService?.price || parseMoney(prefill.amountDue)),
        amountPaid: prefill.paymentId ? String(parseMoney(prefill.balanceRemaining || prefill.amountDue)) : '',
        method: 'Cash',
        paymentDate: toLocalInput(new Date()),
        notes: prefill.paymentId ? `Balance collection for ${prefill.paymentId}` : 'Checkout payment from completed visit.',
        assignedTo: 'Front Desk',
      });
    } else {
      setRecordDraft({
        sourcePaymentId: '',
        customerName: '',
        customerEmail: '',
        appointmentId: '',
        branchName: branchFilter !== 'All Branches' ? branchFilter : '',
        serviceName: '',
        amountDue: '',
        amountPaid: '',
        method: 'Cash',
        paymentDate: toLocalInput(new Date()),
        notes: '',
        assignedTo: 'Front Desk',
      });
    }

    setIsRecordOpen(true);
  };

  const handleServiceDraftChange = (serviceName) => {
    const matchedService = serviceCatalog.find((service) => service.name.toLowerCase() === serviceName.toLowerCase());
    setRecordDraft((draft) => ({ ...draft, serviceName, amountDue: matchedService ? String(matchedService.price) : draft.amountDue }));
  };

  const handleGenerateReceipt = async (payment) => {
    if (!payment) return null;
    setIsReceiptBusy(true);

    try {
      const updated = await applyPaymentPatch(payment.id, {
        receiptGenerated: true,
        receiptStatus: 'Issued',
        receiptGeneratedAt: new Date().toISOString(),
        receiptNumber: payment.receiptNumber || deriveReceiptNumber(payment.id),
        linkedReceiptId: payment.linkedReceiptId || `receipt-${payment.id.toLowerCase()}`,
      });
      setReceiptNotice('Receipt generated and ready for print, download, or email.');
      return updated || payment;
    } finally {
      setIsReceiptBusy(false);
    }
  };

  const handleReceiptAction = async (action, payment) => {
    if (!payment) return;
    setIsReceiptBusy(true);

    try {
      const updatedPayment = payment.receiptGenerated ? payment : await handleGenerateReceipt(payment);
      const next = updatedPayment || payment;
      const preview = buildReceiptPreview(next, receiptBranding);

      if (action === 'print') {
        const popup = window.open('', '_blank', 'width=760,height=900');
        if (!popup) {
          window.print();
        } else {
          popup.document.write(`<html><head><title>${preview.number}</title></head><body><h2>${preview.tenantName}</h2><p>Receipt ${preview.number}</p><p>Customer: ${preview.customerName}</p><p>Service: ${preview.serviceName}</p><p>Amount Paid: ${formatMoney(preview.amountPaid)}</p></body></html>`);
          popup.document.close();
          popup.focus();
          popup.print();
          popup.close();
        }
        await applyPaymentPatch(next.id, { receiptPrintedAt: new Date().toISOString(), editedBy: 'Front Desk' });
        setReceiptNotice('Receipt print action completed.');
        return;
      }

      if (action === 'download') {
        const lines = [`${preview.tenantName}`, `Receipt: ${preview.number}`, `Customer: ${preview.customerName}`, `Service: ${preview.serviceName}`, `Amount Due: ${formatMoney(preview.amountDue)}`, `Amount Paid: ${formatMoney(preview.amountPaid)}`, `Balance: ${formatMoney(preview.balanceRemaining)}`];
        const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${preview.number}.txt`;
        link.click();
        URL.revokeObjectURL(url);
        setReceiptNotice('Receipt downloaded.');
        return;
      }

      if (action === 'email') {
        const subject = encodeURIComponent(`${preview.tenantName} receipt ${preview.number}`);
        const body = encodeURIComponent(`Hi ${preview.customerName},\n\nThank you for visiting ${preview.tenantName}.\nReceipt: ${preview.number}\nService: ${preview.serviceName}\nAmount paid: ${formatMoney(preview.amountPaid)}\n`);
        const recipient = encodeURIComponent(preview.customerEmail || '');
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${recipient}&su=${subject}&body=${body}`;
        const popup = window.open(gmailUrl, '_blank', 'noopener,noreferrer');
        if (!popup) window.location.href = gmailUrl;
        await applyPaymentPatch(next.id, { receiptEmailedAt: new Date().toISOString(), editedBy: 'Front Desk' });
        setReceiptNotice('Gmail compose opened with receipt details.');
      }
    } finally {
      setIsReceiptBusy(false);
    }
  };

  const handleRecordSubmit = async (event) => {
    event.preventDefault();
    setSaveError('');
    setIsSaving(true);

    const amountPaid = parseMoney(recordDraft.amountPaid);
    if (amountPaid <= 0) {
      setSaveError('Amount paid must be greater than zero.');
      setIsSaving(false);
      return;
    }

    if (recordDraft.sourcePaymentId) {
      const source = payments.find((payment) => payment.id === recordDraft.sourcePaymentId);
      if (!source) {
        setSaveError('Source payment record not found.');
        setIsSaving(false);
        return;
      }

      const nextAmountPaid = source.amountPaid + amountPaid;
      const nextBalance = Math.max(source.amountDue - nextAmountPaid, 0);
      const updated = await applyPaymentPatch(source.id, {
        amountPaid: nextAmountPaid,
        balanceRemaining: nextBalance,
        status: nextBalance <= 0 ? 'Paid' : 'Partial',
        method: recordDraft.method || source.method,
        paymentDate: localInputToIso(recordDraft.paymentDate),
        editedBy: recordDraft.assignedTo || 'Front Desk',
        notes: recordDraft.notes || source.notes,
      });

      if (updated) {
        await handleReceiptAction('download', updated);
      }
      setIsRecordOpen(false);
      setIsSaving(false);
      return;
    }

    const service = serviceCatalog.find((entry) => entry.name.toLowerCase() === recordDraft.serviceName.toLowerCase());
    const amountDue = service ? parseMoney(service.price) : parseMoney(recordDraft.amountDue);
    if (!amountDue) {
      setSaveError('Select a valid service so amount due can be set correctly.');
      setIsSaving(false);
      return;
    }

    const balanceRemaining = Math.max(amountDue - amountPaid, 0);
    const status = balanceRemaining <= 0 ? 'Paid' : 'Partial';
      const payload = {
        customerName: recordDraft.customerName,
        customerEmail: recordDraft.customerEmail,
        appointmentId: recordDraft.appointmentId,
        branchName: recordDraft.branchName,
        serviceName: service?.name || recordDraft.serviceName,
        amountDue,
      amountPaid,
      balanceRemaining,
      method: recordDraft.method,
      status,
      dueDate: localInputToIso(recordDraft.paymentDate),
      paymentDate: localInputToIso(recordDraft.paymentDate),
      recordedBy: recordDraft.assignedTo || 'Front Desk',
      editedBy: recordDraft.assignedTo || 'Front Desk',
      notes: recordDraft.notes,
      receiptStatus: amountPaid > 0 ? 'Pending' : 'Not Issued',
    };

    try {
      const created = await crmCreate('payments', payload);
      const normalized = normalizePayment(created, payments.length);
      setPayments((current) => [normalized, ...current]);
      setSelectedPaymentId(normalized.id);
      setIsRecordOpen(false);
    } catch {
      const localPayment = normalizePayment({ id: `PAY-LOCAL-${Date.now()}`, ...payload }, payments.length);
      setPayments((current) => [localPayment, ...current]);
      setSelectedPaymentId(localPayment.id);
      setIsRecordOpen(false);
      setReceiptNotice('Payment endpoint unavailable, saved in local fallback mode.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRowAction = async (action, payment) => {
    if (!payment) return;

    if (action === 'viewPayment') {
      setSelectedPaymentId(payment.id);
      setIsRecordOpen(false);
      return;
    }
    if (action === 'openReceipt') {
      if (!payment.receiptGenerated) {
        await handleGenerateReceipt(payment);
      } else {
        setSelectedPaymentId(payment.id);
      }
      return;
    }
    if (action === 'recordBalance' || action === 'addPartial') {
      if (payment.balanceRemaining <= 0) {
        setReceiptNotice('No remaining balance for this payment.');
        return;
      }
      openCreateDrawer({
        paymentId: payment.id,
        customerName: payment.customerName,
        customerEmail: payment.customerEmail,
        appointmentId: payment.appointmentId,
        serviceName: payment.serviceName,
        amountDue: payment.balanceRemaining,
        balanceRemaining: action === 'recordBalance' ? payment.balanceRemaining : Math.max(10, Math.round(payment.balanceRemaining / 2)),
      });
      return;
    }
    if (action === 'markFullyPaid') {
      await applyPaymentPatch(payment.id, {
        amountPaid: payment.amountDue,
        balanceRemaining: 0,
        status: 'Paid',
        method: payment.method === 'Pending' ? 'Cash' : payment.method,
        editedBy: 'Front Desk',
      });
      return;
    }
    if (action === 'printReceipt') {
      await handleReceiptAction('print', payment);
      return;
    }
    if (action === 'emailReceipt') {
      await handleReceiptAction('email', payment);
      return;
    }
    if (action === 'openCustomer') {
      navigate('/crm/customers');
      return;
    }
    if (action === 'openAppointment') {
      navigate('/crm/appointments');
    }
  };

  const handleExportPayments = () => {
    const rows = [
      ['Payment ID', 'Customer', 'Branch', 'Appointment', 'Service', 'Amount Due', 'Amount Paid', 'Balance', 'Method', 'Status', 'Receipt Status', 'Aging', 'Date', 'Receipt', 'Recorded By'],
      ...visiblePayments.map((payment) => [
        payment.id,
        payment.customerName,
        payment.branchName || 'Unassigned',
        payment.appointmentId || 'Unlinked',
        payment.serviceName,
        payment.amountDue,
        payment.amountPaid,
        payment.balanceRemaining,
        payment.method,
        payment.displayStatus,
        payment.receiptStatus,
        payment.agingBucket,
        formatDateTime(payment.paymentDate),
        payment.receiptGenerated ? payment.receiptNumber : 'Pending',
        payment.recordedBy,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = () => {
    clearCrmToken();
    navigate('/crm-login');
  };

  return (
    <CrmShell shellClassName="crm-payments-shell">
      <main className="crm-payments-main">
        <header className="crm-payments-header">
          <div>
            <h1>Payment Management</h1>
            <p>Front-desk payment control and receipt workflow in one calm workspace.</p>
          </div>

          <div className="crm-payments-header-actions">
            <input
              type="search"
              className="crm-payments-search"
              placeholder="Search by customer, appointment, payment ID, or receipt..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <select className="crm-payments-date-select" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
              {dateOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <button type="button" className={`crm-payments-chip${todayOnly ? ' crm-payments-chip-active' : ''}`} onClick={() => setTodayOnly((value) => !value)}>
              Today Only
            </button>
            <button type="button" className="crm-payments-ghost-btn" onClick={() => document.getElementById('crm-payment-filters')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
              Filter
            </button>
            <button type="button" className="crm-payments-ghost-btn" onClick={handleExportPayments}>
              Export
            </button>
            <button type="button" className="crm-payments-primary-btn" onClick={() => openCreateDrawer()}>
              Record Payment
            </button>
            <button type="button" className="crm-payments-logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <section className="crm-payments-summary-grid">
          {summaryCards.map((card) => (
            <article key={card.label} className={`crm-payments-summary-card${card.alert ? ' crm-payments-summary-card-alert' : ''}`}>
              <p>{card.label}</p>
              <h2>{card.value}</h2>
              <span>{card.subtext}</span>
            </article>
          ))}
        </section>

        <section className="crm-payments-controls" id="crm-payment-filters">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {statusOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)}>
            {methodOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
            {branchOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select value={cashierFilter} onChange={(event) => setCashierFilter(event.target.value)}>
            {cashierOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select value={receiptStatusFilter} onChange={(event) => setReceiptStatusFilter(event.target.value)}>
            {receiptStatusOptionsMemo.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <button type="button" className={`crm-payments-chip${linkedOnly ? ' crm-payments-chip-active' : ''}`} onClick={() => setLinkedOnly((value) => !value)}>
            Linked Only
          </button>
          <button type="button" className={`crm-payments-chip${overdueOnly ? ' crm-payments-chip-active' : ''}`} onClick={() => setOverdueOnly((value) => !value)}>
            Overdue Balances
          </button>
          <div className="crm-payments-aging-strip" aria-label="Aging overview">
            <button type="button" className={`crm-payments-chip${agingFilter === 'All Aging' ? ' crm-payments-chip-active' : ''}`} onClick={() => setAgingFilter('All Aging')}>
              All Aging
            </button>
            <button type="button" className={`crm-payments-chip${agingFilter === 'Due Today' ? ' crm-payments-chip-active' : ''}`} onClick={() => setAgingFilter('Due Today')}>
              Due Today ({visiblePayments.filter((payment) => payment.agingBucket === 'Due Today').length})
            </button>
            <button type="button" className={`crm-payments-chip${agingFilter === '1-3 Days Overdue' ? ' crm-payments-chip-active' : ''}`} onClick={() => setAgingFilter('1-3 Days Overdue')}>
              1-3d ({visiblePayments.filter((payment) => payment.agingBucket === '1-3 Days Overdue').length})
            </button>
            <button type="button" className={`crm-payments-chip${agingFilter === '4-7 Days Overdue' ? ' crm-payments-chip-active' : ''}`} onClick={() => setAgingFilter('4-7 Days Overdue')}>
              4-7d ({visiblePayments.filter((payment) => payment.agingBucket === '4-7 Days Overdue').length})
            </button>
            <button type="button" className={`crm-payments-chip${agingFilter === '8+ Days Overdue' ? ' crm-payments-chip-active' : ''}`} onClick={() => setAgingFilter('8+ Days Overdue')}>
              8+d ({visiblePayments.filter((payment) => payment.agingBucket === '8+ Days Overdue').length})
            </button>
          </div>
        </section>

        <AwaitingCheckoutQueue
          items={filteredAwaitingCheckoutQueue}
          formatMoney={formatMoney}
          onRecordPayment={(item) => openCreateDrawer(item)}
          onOpenCheckout={() => navigate('/crm/appointments')}
          onGenerateReceipt={(item) => {
            if (item.paymentId) {
              const linked = payments.find((payment) => payment.id === item.paymentId);
              if (linked) {
                void handleReceiptAction('download', linked);
                return;
              }
            }
            openCreateDrawer(item);
          }}
        />

        <section className="crm-payments-content">
          <div className="crm-payments-left-column">
            <article className="crm-payments-table-card">
              <header className="crm-payments-table-head">
                <p>Payment ID</p>
                <p>Customer</p>
                <p>Appointment</p>
                <p>Service</p>
                <p>Amount Due</p>
                <p>Amount Paid</p>
                <p>Balance</p>
                <p>Method</p>
                <p>Status</p>
                <p>Date</p>
                <p>Receipt</p>
                <p>Actions</p>
              </header>

              {isLoading ? (
                <div className="crm-payments-empty">
                  <h3>Loading payments</h3>
                  <p>Fetching live payment, balance, and receipt records from your CRM backend.</p>
                </div>
              ) : visiblePayments.length === 0 ? (
                <div className="crm-payments-empty crm-payments-empty-smart">
                  <h3>No records match current filters</h3>
                  <p>Use quick actions below to continue checkout operations without leaving this page.</p>
                  <div className="crm-payments-empty-actions">
                    <button type="button" className="crm-payments-primary-btn" onClick={() => openCreateDrawer()}>
                      Record Payment
                    </button>
                    <button type="button" className="crm-payments-secondary-btn" onClick={() => navigate('/crm/appointments')}>
                      Open Checkout Queue
                    </button>
                  </div>
                  <div className="crm-payments-empty-grid">
                    <article>
                      <p>Awaiting Checkout</p>
                      <strong>{filteredAwaitingCheckoutQueue.length}</strong>
                      <span>{filteredAwaitingCheckoutQueue[0]?.customerName || 'No waiting customers right now.'}</span>
                    </article>
                    <article>
                      <p>Recent Payments</p>
                      <strong>{recentPayments.length}</strong>
                      <span>{recentPayments[0] ? `${recentPayments[0].customerName} - ${formatMoney(recentPayments[0].amountPaid)}` : 'No payment activity yet.'}</span>
                    </article>
                  </div>
                </div>
              ) : (
                <div className="crm-payments-table-body">
                  {visiblePayments.map((payment) => (
                    <PaymentRow
                      key={payment.id}
                      payment={payment}
                      active={selectedPayment?.id === payment.id}
                      formatMoney={formatMoney}
                      formatDateTime={formatDateTime}
                      onSelect={(entry) => {
                        setIsRecordOpen(false);
                        setSelectedPaymentId(entry.id);
                      }}
                      onAction={handleRowAction}
                    />
                  ))}
                </div>
              )}
            </article>

            <article className="crm-payments-recent-card">
              <header>
                <h3>Recent Payment Activity</h3>
                <p>Latest payment entries with receipt readiness and cashier visibility.</p>
              </header>
              <div className="crm-payments-recent-list">
                {recentPayments.slice(0, 6).map((payment) => (
                  <article key={`recent-${payment.id}`}>
                    <div>
                      <strong>{payment.customerName}</strong>
                      <span>{payment.id} - {payment.method}</span>
                    </div>
                    <div>
                      <p>{formatMoney(payment.amountPaid)}</p>
                      <span>{payment.receiptGenerated ? 'Receipt generated' : 'Receipt pending'}</span>
                    </div>
                    <div>
                      <p>{formatDateTime(payment.paymentDate)}</p>
                      <span>{payment.recordedBy}</span>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          </div>

          {isRecordOpen ? (
            <aside className="crm-payments-detail-card">
              <div className="crm-payments-detail-head">
                <p className="crm-payments-kicker">Receipt-first Entry</p>
                <h3>{recordDraft.sourcePaymentId ? 'Record Remaining Balance' : 'New Payment Entry'}</h3>
                <p>Capture full or partial payment and generate a receipt in one workflow.</p>
              </div>

              {saveError ? <p className="crm-payments-form-error">{saveError}</p> : null}

              <form className="crm-payments-form" onSubmit={handleRecordSubmit}>
                <label>Customer<input type="text" value={recordDraft.customerName} onChange={(event) => setRecordDraft((draft) => ({ ...draft, customerName: event.target.value }))} placeholder="Customer name" required /></label>
                <label>Customer Email<input type="email" value={recordDraft.customerEmail} onChange={(event) => setRecordDraft((draft) => ({ ...draft, customerEmail: event.target.value }))} placeholder="client@email.com" /></label>
                <label>Appointment ID<input type="text" value={recordDraft.appointmentId} onChange={(event) => setRecordDraft((draft) => ({ ...draft, appointmentId: event.target.value }))} placeholder="APT-0000" /></label>
                <label>Service / Visit<input type="text" value={recordDraft.serviceName} list="crm-payment-service-options" onChange={(event) => handleServiceDraftChange(event.target.value)} placeholder="Service name" required /></label>
                <datalist id="crm-payment-service-options">{serviceCatalog.map((service) => (<option key={service.id} value={service.name} label={`${service.name} (${formatMoney(service.price)})`} />))}</datalist>
                <p className="crm-payments-form-note">Cash is the primary method. Future-ready options are visible for upcoming POS support.</p>
                <div className="crm-payments-form-grid">
                  <label>Amount Due<input type="number" min="0" step="0.01" value={recordDraft.amountDue} onChange={(event) => setRecordDraft((draft) => ({ ...draft, amountDue: event.target.value }))} required /></label>
                  <label>Amount Paid Now<input type="number" min="0" step="0.01" value={recordDraft.amountPaid} onChange={(event) => setRecordDraft((draft) => ({ ...draft, amountPaid: event.target.value }))} required /></label>
                </div>
                <label>Remaining Balance<input type="number" value={draftRemainingBalanceValue.toFixed(2)} readOnly /></label>
                <label>Payment Method<select value={recordDraft.method} onChange={(event) => setRecordDraft((draft) => ({ ...draft, method: event.target.value }))}><option value="Cash">Cash (Primary)</option><option value="Card">Card (Future-ready)</option><option value="Bank Transfer">Bank Transfer (Future-ready)</option></select></label>
                <label>Payment Date<input type="datetime-local" value={recordDraft.paymentDate} onChange={(event) => setRecordDraft((draft) => ({ ...draft, paymentDate: event.target.value }))} /></label>
                <label>Assigned Handler<input type="text" value={recordDraft.assignedTo} onChange={(event) => setRecordDraft((draft) => ({ ...draft, assignedTo: event.target.value }))} placeholder="Front Desk" /></label>
                <label>Payment Note<textarea rows="3" value={recordDraft.notes} onChange={(event) => setRecordDraft((draft) => ({ ...draft, notes: event.target.value }))} placeholder="Add any payment context or internal note" /></label>

                {activeReceipt ? <ReceiptPreviewPanel receipt={activeReceipt} /> : null}

                <div className="crm-payments-form-actions">
                  <button type="button" className="crm-payments-ghost-btn" onClick={() => setIsRecordOpen(false)}>Cancel</button>
                  <button type="submit" className="crm-payments-primary-btn" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Payment & Continue Receipt'}</button>
                </div>
              </form>
            </aside>
          ) : (
            <ReceiptWorkspacePanel
              selectedPayment={selectedPayment}
              activeReceipt={activeReceipt}
              recentReceipts={recentReceipts}
              isReceiptBusy={isReceiptBusy}
              onGenerateReceipt={(payment) => { void handleGenerateReceipt(payment); }}
              onPrintReceipt={(receipt) => { if (receipt) void handleReceiptAction('print', receipt); }}
              onDownloadReceipt={(receipt) => { if (receipt) void handleReceiptAction('download', receipt); }}
              onEmailReceipt={(receipt) => { if (receipt) void handleReceiptAction('email', receipt); }}
              onOpenCustomer={() => navigate('/crm/customers')}
              onOpenAppointment={() => navigate('/crm/appointments')}
              onOpenReceiptHistory={() => navigate('/crm/receipts', { state: { receiptId: selectedPayment?.id || selectedPaymentId } })}
              onStartReceipt={() => openCreateDrawer()}
              receiptNotice={receiptNotice}
              receiptError={receiptError}
              loadError={loadError}
              formatDateTime={formatDateTime}
            />
          )}
        </section>

      </main>
    </CrmShell>
  );
};

export default CrmPayments;
