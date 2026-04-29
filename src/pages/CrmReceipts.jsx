import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearCrmToken } from '../config/crm';
import { crmList, crmUpdate } from '../config/crmApi';
import { fetchReceiptSettings, loadReceiptSettings } from '../config/receiptSettings';
import CrmShell from '../components/CrmShell';
import AwaitingCheckoutQueue from '../components/payments/AwaitingCheckoutQueue';
import ReceiptDeliveryPanel from '../components/receipts/ReceiptDeliveryPanel';
import ReceiptDocumentPreview from '../components/receipts/ReceiptDocumentPreview';
import {
  buildPrintableReceiptMarkup,
  buildReceiptBranding,
  buildReceiptPreview,
  deriveReceiptNumber,
  formatDateTime,
  formatMoney,
  normalizeKey,
  toDateKey,
} from '../components/receipts/receiptUtils';
import { collectOptionValues } from './crmWorkspaceUtils';
import './CrmPayments.css';
import './CrmReceipts.css';

const SERVICE_CATALOG_SEED = [
  { id: 'SRV-101', name: 'Signature Facial', price: 120 },
  { id: 'SRV-102', name: 'Deep Tissue Massage', price: 150 },
  { id: 'SRV-103', name: 'Aromatherapy Session', price: 135 },
  { id: 'SRV-104', name: 'Hot Stone Therapy', price: 160 },
  { id: 'SRV-105', name: 'Scalp Renewal Ritual', price: 95 },
  { id: 'SRV-106', name: 'Hydra Glow Infusion', price: 185 },
  { id: 'SRV-107', name: 'Aromatherapy Steam Escape', price: 225 },
  { id: 'SRV-108', name: 'Wellness Intake Consultation', price: 55 },
  { id: 'SRV-109', name: 'Retail Product', price: 42 },
  { id: 'SRV-110', name: 'Package Purchase', price: 320 },
];

const RECEIPT_SEED_PAYMENTS = [
  {
    id: 'PAY-9921',
    customerName: 'Eleanor Hebert',
    customerEmail: 'eleanor.hebert@example.com',
    customerPhone: '(323) 555-0108',
    customerId: 'C-1001',
    appointmentId: 'APT-4402',
    checkoutId: 'CHK-8801',
    branchName: 'West Hollywood',
    serviceName: 'Deep Tissue Massage',
    amountDue: 180,
    subtotal: 180,
    amountPaid: 180,
    balanceRemaining: 0,
    method: 'Cash',
    status: 'Paid',
    dueDate: '2026-04-15T23:00:00',
    paymentDate: '2026-04-15T10:12:00',
    recordedBy: 'Marcus',
    notes: 'Receipt printed and emailed after checkout.',
    receiptGenerated: true,
    receiptStatus: 'Generated',
    receiptNumber: 'RCT-00009921',
    receiptGeneratedAt: '2026-04-15T10:18:00',
    receiptPrintedAt: '2026-04-15T10:20:00',
    receiptDownloadedAt: '2026-04-15T10:21:00',
    receiptEmailedAt: '2026-04-15T10:25:00',
    lineItems: [
      { name: 'Deep Tissue Massage', category: 'Service', quantity: 1, unitPrice: 150, subtotal: 150 },
      { name: 'Aromatherapy Add-on', category: 'Add-on', quantity: 1, unitPrice: 30, subtotal: 30 },
    ],
  },
  {
    id: 'PAY-9922',
    customerName: 'Julian Waters',
    customerEmail: 'julian.waters@example.com',
    customerPhone: '(323) 555-0132',
    customerId: 'C-1002',
    appointmentId: 'APT-4403',
    checkoutId: 'CHK-8802',
    branchName: 'West Hollywood',
    serviceName: 'Aroma Facial',
    amountDue: 220,
    subtotal: 220,
    amountPaid: 110,
    balanceRemaining: 110,
    method: 'Cash',
    status: 'Partial',
    dueDate: '2026-04-13T18:00:00',
    paymentDate: '2026-04-12T11:22:00',
    recordedBy: 'Isabella',
    notes: 'Partial payment until checkout completes.',
    receiptGenerated: true,
    receiptStatus: 'Printed',
    receiptNumber: 'RCT-00009922',
    receiptGeneratedAt: '2026-04-12T11:30:00',
    receiptPrintedAt: '2026-04-12T11:34:00',
    lineItems: [
      { name: 'Aroma Facial', category: 'Service', quantity: 1, unitPrice: 220, subtotal: 220 },
    ],
  },
  {
    id: 'PAY-9923',
    customerName: 'Sienna Miller',
    customerEmail: 'sienna.miller@example.com',
    customerPhone: '(323) 555-0144',
    customerId: 'C-1003',
    appointmentId: 'APT-4408',
    checkoutId: 'CHK-8803',
    branchName: 'West Hollywood',
    serviceName: 'Full Body Scrub',
    amountDue: 150,
    subtotal: 150,
    amountPaid: 0,
    balanceRemaining: 150,
    method: 'Cash',
    status: 'Unpaid',
    dueDate: '2026-04-10T18:00:00',
    paymentDate: '2026-04-09T11:45:00',
    recordedBy: 'Elena',
    notes: 'Awaiting customer to return for checkout.',
    receiptGenerated: false,
    receiptStatus: 'Pending',
    receiptNumber: '',
    lineItems: [
      { name: 'Full Body Scrub', category: 'Service', quantity: 1, unitPrice: 150, subtotal: 150 },
    ],
  },
  {
    id: 'PAY-9924',
    customerName: 'Robert Black',
    customerEmail: 'robert.black@example.com',
    customerPhone: '(323) 555-0155',
    customerId: 'C-1004',
    appointmentId: 'APT-4411',
    checkoutId: 'CHK-8804',
    branchName: 'West Hollywood',
    serviceName: 'Manicure Deluxe',
    amountDue: 95,
    subtotal: 95,
    amountPaid: 95,
    balanceRemaining: 0,
    method: 'Cash',
    status: 'Paid',
    dueDate: '2026-04-14T23:00:00',
    paymentDate: '2026-04-14T16:10:00',
    recordedBy: 'Sofia',
    notes: 'Receipt printed in-store.',
    receiptGenerated: true,
    receiptStatus: 'Emailed',
    receiptNumber: 'RCT-00009924',
    receiptGeneratedAt: '2026-04-14T16:13:00',
    receiptPrintedAt: '2026-04-14T16:13:00',
    receiptEmailedAt: '2026-04-14T16:17:00',
    receiptDownloadedAt: '2026-04-14T16:18:00',
    lineItems: [
      { name: 'Manicure Deluxe', category: 'Service', quantity: 1, unitPrice: 95, subtotal: 95 },
    ],
  },
];

const COMPLETED_APPOINTMENTS_SEED = [
  { id: 'CHK-7101', appointmentId: 'APT-4422', customerName: 'Maya Cortez', customerEmail: 'maya.cortez@example.com', serviceName: 'Aromatherapy Steam Escape', amountDue: 225, completedAt: '2026-04-15T12:35:00', status: 'Completed', branchName: 'West Hollywood' },
  { id: 'CHK-7102', appointmentId: 'APT-4423', customerName: 'Priya Singh', customerEmail: 'priya.singh@example.com', serviceName: 'Hydra Glow Infusion', amountDue: 185, completedAt: '2026-04-15T13:10:00', status: 'Completed', branchName: 'West Hollywood' },
  { id: 'CHK-7103', appointmentId: 'APT-4424', customerName: 'Carla Kim', customerEmail: 'carla.kim@example.com', serviceName: 'Wellness Intake Consultation', amountDue: 55, completedAt: '2026-04-15T13:45:00', status: 'Completed', branchName: 'West Hollywood' },
];

const dateOptions = ['Today', 'Last 7 Days', 'This Month'];
const statusOptions = [
  'All Statuses',
  'Generated',
  'Printed',
  'Emailed',
  'Downloaded',
  'Pending',
  'Partial',
  'Overdue',
  'Cancelled',
  'Void',
  'Refunded',
];
const deliveryOptions = ['All Delivery', 'Delivery Pending', 'Printed', 'Emailed', 'Downloaded'];

const normalizeCustomer = (customer = {}, index = 0) => ({
  id: customer.id || customer.customerId || `C-${index + 1}`,
  name: customer.name || customer.customerName || 'Guest',
  email: customer.email || customer.customerEmail || '',
  phone: customer.phone || customer.customerPhone || '',
  branchName: customer.branchName || '',
});

const normalizeAppointment = (appointment = {}, index = 0) => ({
  id: appointment.id || appointment.appointmentId || `APT-${index + 1}`,
  appointmentId: appointment.appointmentId || appointment.id || `APT-${index + 1}`,
  checkoutId: appointment.checkoutId || appointment.checkoutNumber || '',
  customerName: appointment.customerName || appointment.customer || 'Guest',
  customerEmail: appointment.customerEmail || appointment.email || '',
  serviceName: appointment.serviceName || appointment.service || 'Service',
  amountDue: Number(appointment.amountDue ?? appointment.totalDue ?? appointment.total ?? 0),
  completedAt: appointment.completedAt || appointment.dateTime || appointment.date || new Date().toISOString(),
  status: appointment.status || appointment.appointmentStatus || 'Completed',
  branchName: appointment.branchName || '',
});

const normalizeService = (service = {}, index = 0) => ({
  id: service.id || service._id || `SRV-${index + 1}`,
  name: service.name || service.serviceName || '',
  price: Number(service.price ?? service.amount ?? 0),
});

const NORMALIZE_QUEUE_ITEM = (appointment = {}, index = 0) => ({
  id: appointment.id || appointment.appointmentId || `CHK-${index + 1}`,
  appointmentId: appointment.appointmentId || appointment.id || '',
  customerName: appointment.customerName || appointment.customer || 'Guest',
  customerEmail: appointment.customerEmail || appointment.email || '',
  serviceName: appointment.serviceName || appointment.service || 'Service',
  amountDue: Number(appointment.amountDue ?? appointment.totalDue ?? appointment.total ?? 0),
  completedAt: appointment.completedAt || appointment.dateTime || appointment.date || new Date().toISOString(),
  status: appointment.status || appointment.appointmentStatus || 'Completed',
  branchName: appointment.branchName || '',
});

const buildAwaitingQueue = (appointments, payments) => {
  const byAppointment = new Map();
  payments.forEach((payment) => {
    if (payment.appointmentId) {
      byAppointment.set(payment.appointmentId, payment);
    }
  });

  const queue = appointments
    .filter((appointment) => /completed|checked out|done/i.test(String(appointment.status || '')))
    .map((appointment) => {
      const linked = byAppointment.get(appointment.appointmentId);
      const amountDue = linked?.amountDue ?? appointment.amountDue;
      const balanceRemaining = linked ? linked.balanceRemaining : amountDue;

      return {
        id: appointment.id,
        paymentId: linked?.id || '',
        appointmentId: appointment.appointmentId,
        customerName: linked?.customerName || appointment.customerName,
        customerEmail: linked?.customerEmail || appointment.customerEmail,
        serviceName: linked?.serviceName || appointment.serviceName,
        amountDue,
        balanceRemaining,
        completedAt: appointment.completedAt,
        statusLabel: linked?.paymentStatus || linked?.receiptStatus || 'Unpaid',
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
        serviceName: payment.serviceName,
        amountDue: payment.amountDue,
        balanceRemaining: payment.balanceRemaining,
        completedAt: payment.paymentDate,
        statusLabel: payment.paymentStatus || payment.receiptStatus || 'Pending',
      });
    });

  return queue.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
};

const openReceiptWindow = (receipt, autoPrint = true) => {
  const popup = window.open('', '_blank', 'width=860,height=980');
  if (!popup) return false;

  popup.document.open();
  popup.document.write(buildPrintableReceiptMarkup(receipt));
  popup.document.close();
  popup.focus();

  if (autoPrint) {
    window.setTimeout(() => {
      popup.print();
    }, 260);
  }

  return true;
};

const CrmReceipts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [payments, setPayments] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [serviceCatalog, setServiceCatalog] = useState([]);
  const [receiptBranding, setReceiptBranding] = useState(() => buildReceiptBranding(loadReceiptSettings()));
  const [selectedReceiptId, setSelectedReceiptId] = useState(
    location.state?.receiptId || location.state?.selectedPaymentId || '',
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('Today');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [deliveryFilter, setDeliveryFilter] = useState('All Delivery');
  const [branchFilter, setBranchFilter] = useState('All Branches');
  const [todayOnly, setTodayOnly] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const [paymentsResult, appointmentsResult, customersResult, servicesResult] = await Promise.allSettled([
          crmList('payments'),
          crmList('appointments'),
          crmList('customers'),
          crmList('services'),
        ]);

        if (!mounted) return;

        const paymentsData = paymentsResult.status === 'fulfilled' && Array.isArray(paymentsResult.value) ? paymentsResult.value : [];
        const appointmentsData = appointmentsResult.status === 'fulfilled' && Array.isArray(appointmentsResult.value) ? appointmentsResult.value : [];
        const customersData = customersResult.status === 'fulfilled' && Array.isArray(customersResult.value) ? customersResult.value : [];
        const servicesData = servicesResult.status === 'fulfilled' && Array.isArray(servicesResult.value) ? servicesResult.value : [];
        const syncIssues = [];

        if (paymentsResult.status === 'rejected') syncIssues.push(`payments: ${paymentsResult.reason?.message || 'unavailable'}`);
        if (appointmentsResult.status === 'rejected') syncIssues.push(`appointments: ${appointmentsResult.reason?.message || 'unavailable'}`);
        if (customersResult.status === 'rejected') syncIssues.push(`customers: ${customersResult.reason?.message || 'unavailable'}`);
        if (servicesResult.status === 'rejected') syncIssues.push(`services: ${servicesResult.reason?.message || 'unavailable'}`);

        const mergedPayments = paymentsData.map((payment) => payment);
        const mergedAppointments = appointmentsData.map((appointment, index) => normalizeAppointment(appointment, index));
        const mergedCustomers = customersData.map((customer, index) => normalizeCustomer(customer, index));
        const mergedServices = servicesData.map((service, index) => normalizeService(service, index));

        setPayments(mergedPayments);
        setAppointments(mergedAppointments);
        setCustomers(mergedCustomers);
        setServiceCatalog(mergedServices);
        setSelectedReceiptId((current) => current || mergedPayments[0]?.id || '');
        setLoadError(syncIssues.length > 0 ? `CRM sync is partial. ${syncIssues.join(' | ')}` : '');
      } catch (fetchError) {
        if (!mounted) return;
        setPayments([]);
        setAppointments([]);
        setCustomers([]);
        setServiceCatalog([]);
        setLoadError(fetchError.message || 'Unable to load receipt data from the CRM API.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadData();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const refreshBranding = async () => {
      try {
        const settings = await fetchReceiptSettings();
        if (mounted) {
          setReceiptBranding(buildReceiptBranding(settings));
        }
      } catch {
        if (mounted) {
          setReceiptBranding(buildReceiptBranding(loadReceiptSettings()));
        }
      }
    };

    void refreshBranding();

    const handleFocus = () => {
      void refreshBranding();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      mounted = false;
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    const incomingReceiptId = location.state?.receiptId || location.state?.selectedPaymentId;
    if (incomingReceiptId) {
      setSelectedReceiptId(String(incomingReceiptId));
    }
  }, [location.state]);

  const customerById = useMemo(() => new Map(customers.map((customer) => [customer.id, customer])), [customers]);
  const customerByName = useMemo(
    () => new Map(customers.map((customer) => [normalizeKey(customer.name), customer])),
    [customers],
  );
  const appointmentById = useMemo(
    () => new Map(appointments.map((appointment) => [appointment.id || appointment.appointmentId, appointment])),
    [appointments],
  );
  const lookups = useMemo(
    () => ({
      customerById,
      customerByName,
      appointmentById,
      serviceCatalog,
    }),
    [appointmentById, customerById, customerByName, serviceCatalog],
  );

  const receiptRecords = useMemo(
    () => payments.map((payment) => buildReceiptPreview(payment, lookups, receiptBranding)),
    [lookups, payments, receiptBranding],
  );

  const orderedReceipts = useMemo(
    () =>
      [...receiptRecords].sort(
        (a, b) => new Date(b.issuedAt || b.paymentDate) - new Date(a.issuedAt || a.paymentDate),
      ),
    [receiptRecords],
  );

  useEffect(() => {
    if (orderedReceipts.length === 0) return;
    const exists = orderedReceipts.some((receipt) => receipt.id === selectedReceiptId);
    if (!selectedReceiptId || !exists) {
      setSelectedReceiptId(orderedReceipts[0].id);
    }
  }, [orderedReceipts, selectedReceiptId]);

  const selectedReceipt = useMemo(
    () =>
      orderedReceipts.find((receipt) => receipt.id === selectedReceiptId) ||
      orderedReceipts.find((receipt) => receipt.receiptStatus !== 'Pending') ||
      orderedReceipts[0] ||
      null,
    [orderedReceipts, selectedReceiptId],
  );

  useEffect(() => {
    setRecipientEmail(selectedReceipt?.customerEmail || '');
    setError('');
    setNotice('');
  }, [selectedReceipt?.customerEmail, selectedReceipt?.id]);

  const todayKey = toDateKey(new Date());

  const dateScopedReceipts = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 6);

    return orderedReceipts.filter((receipt) => {
      const receiptDate = new Date(receipt.issuedAt || receipt.paymentDate || now);
      const matchesDate = todayOnly
        ? toDateKey(receiptDate) === todayKey
        : dateFilter === 'Today'
          ? toDateKey(receiptDate) === todayKey
          : dateFilter === 'Last 7 Days'
            ? receiptDate >= weekAgo
            : receiptDate.getMonth() === now.getMonth() && receiptDate.getFullYear() === now.getFullYear();

      return matchesDate;
    });
  }, [dateFilter, orderedReceipts, todayKey, todayOnly]);

  const visibleReceipts = useMemo(() => {
    return dateScopedReceipts.filter((receipt) => {
      const searchTarget = [
        receipt.receiptNumber,
        receipt.paymentId,
        receipt.checkoutId,
        receipt.appointmentId,
        receipt.customerName,
        receipt.businessName,
        receipt.method,
        receipt.receiptStatus,
        receipt.paymentStatus,
        ...(receipt.lineItems || []).map((item) => item.name),
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch = !searchTerm || searchTarget.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All Statuses' || receipt.receiptStatus === statusFilter || receipt.paymentStatus === statusFilter;
      const matchesBranch = branchFilter === 'All Branches' || receipt.branchName === branchFilter;
      const matchesDelivery =
        deliveryFilter === 'All Delivery'
          || (deliveryFilter === 'Delivery Pending' && receipt.receiptStatus === 'Pending')
          || (deliveryFilter === 'Printed' && Boolean(receipt.printedAt))
          || (deliveryFilter === 'Emailed' && Boolean(receipt.emailedAt))
          || (deliveryFilter === 'Downloaded' && Boolean(receipt.downloadedAt));

      return matchesSearch && matchesStatus && matchesBranch && matchesDelivery;
    });
  }, [branchFilter, dateScopedReceipts, deliveryFilter, searchTerm, statusFilter]);

  const branchOptions = useMemo(
    () => ['All Branches', ...collectOptionValues([...payments, ...appointments, ...customers], ['branchName'])],
    [appointments, customers, payments],
  );

  const summaryCards = useMemo(() => {
    const generatedToday = visibleReceipts.filter((receipt) => toDateKey(receipt.issuedAt || receipt.paymentDate) === todayKey).length;
    const printedToday = visibleReceipts.filter((receipt) => toDateKey(receipt.printedAt) === todayKey).length;
    const emailedToday = visibleReceipts.filter((receipt) => toDateKey(receipt.emailedAt) === todayKey).length;
    const pendingReceipts = visibleReceipts.filter((receipt) => receipt.receiptStatus === 'Pending').length;
    const partialBalances = visibleReceipts.filter((receipt) => receipt.balanceRemaining > 0 && receipt.amountReceived > 0).length;
    const overdueOutstanding = visibleReceipts
      .filter((receipt) => receipt.balanceRemaining > 0 && receipt.daysOverdue > 0)
      .reduce((sum, receipt) => sum + receipt.balanceRemaining, 0);

    return [
      { label: 'Receipts Generated', value: String(generatedToday).padStart(2, '0'), subtext: 'Finalized in this date range' },
      { label: 'Printed Today', value: String(printedToday).padStart(2, '0'), subtext: 'Receipts sent to the printer' },
      { label: 'Emailed Today', value: String(emailedToday).padStart(2, '0'), subtext: 'Customer deliveries completed' },
      { label: 'Receipt Pending', value: String(pendingReceipts).padStart(2, '0'), subtext: 'Need generation or delivery' },
      { label: 'Partial Balances', value: String(partialBalances).padStart(2, '0'), subtext: 'Receipt totals not fully settled' },
      { label: 'Overdue Outstanding', value: formatMoney(overdueOutstanding), subtext: 'Balances past due', alert: true },
    ];
  }, [todayKey, visibleReceipts]);

  const awaitingCheckoutQueue = useMemo(() => buildAwaitingQueue(appointments, payments), [appointments, payments]);

  const recordReceiptPatch = async (paymentId, patch) => {
    const previousPayment = payments.find((payment) => payment.id === paymentId);
    let nextPayment = null;

    setPayments((current) =>
      current.map((payment) => {
        if (payment.id !== paymentId) return payment;
        nextPayment = {
          ...payment,
          ...patch,
        };
        return nextPayment;
      }),
    );

    if (nextPayment) {
      try {
        await crmUpdate('payments', paymentId, patch);
      } catch (error) {
        if (previousPayment) {
          setPayments((current) => current.map((payment) => (payment.id === paymentId ? previousPayment : payment)));
        }
        setError(error.message || 'Unable to update receipt.');
        setLoadError(error.message || 'Unable to update receipt.');
        return null;
      }
    }

    return nextPayment;
  };

  const handleGenerateReceipt = async (receipt) => {
    if (!receipt) return null;
    setIsBusy(true);
    setError('');

    try {
      const payment = await recordReceiptPatch(receipt.paymentId, {
        receiptGenerated: true,
        receiptStatus: 'Generated',
        receiptGeneratedAt: new Date().toISOString(),
        receiptNumber: receipt.receiptNumber || deriveReceiptNumber(receipt.paymentId),
        linkedReceiptId: receipt.receiptId || `receipt-${String(receipt.paymentId || Date.now()).toLowerCase()}`,
      });
      if (!payment) return null;
      setNotice('Receipt generated and ready for preview, print, download, or email.');
      return payment;
    } finally {
      setIsBusy(false);
    }
  };

  const handleReceiptAction = async (action, receipt) => {
    if (!receipt) return;
    setIsBusy(true);
    setError('');

    try {
      const sourcePayment = payments.find((payment) => payment.id === receipt.paymentId) || receipt;
      const generatedPayment = receipt.receiptStatus === 'Pending' || !receipt.receiptNumber
        ? await handleGenerateReceipt(receipt)
        : sourcePayment;
      if (!generatedPayment) return;
      const receiptToUse = buildReceiptPreview(generatedPayment || sourcePayment, lookups, receiptBranding);

      if (action === 'print') {
        const success = openReceiptWindow(receiptToUse, true);
        if (!success) {
          setError('Popup blocked. Allow popups to print the receipt.');
          return;
        }

        const patched = await recordReceiptPatch(receiptToUse.paymentId, {
          receiptStatus: 'Printed',
          receiptPrintedAt: new Date().toISOString(),
        });
        if (!patched) return;
        setNotice('Receipt sent to the printer.');
        return;
      }

      if (action === 'download') {
        const success = openReceiptWindow(receiptToUse, true);
        if (!success) {
          setError('Popup blocked. Allow popups to download the receipt as PDF.');
          return;
        }

        const patched = await recordReceiptPatch(receiptToUse.paymentId, {
          receiptStatus: 'Downloaded',
          receiptDownloadedAt: new Date().toISOString(),
        });
        if (!patched) return;
        setNotice('Receipt opened in the browser print flow for PDF download.');
        return;
      }

      if (action === 'email') {
        const targetEmail = recipientEmail || receiptToUse.customerEmail;
        if (!targetEmail) {
          setError('Add a recipient email before emailing the receipt.');
          return;
        }

        const subject = encodeURIComponent(`${receiptToUse.businessName} receipt ${receiptToUse.receiptNumber}`);
        const body = encodeURIComponent(
          `Hi ${receiptToUse.customerName},\n\n` +
            `Thank you for visiting ${receiptToUse.businessName}.\n` +
            `Receipt: ${receiptToUse.receiptNumber}\n` +
            `Payment ID: ${receiptToUse.paymentId}\n` +
            `Total: ${formatMoney(receiptToUse.totalAmount)}\n` +
            `Received: ${formatMoney(receiptToUse.amountReceived)}\n` +
            `Balance: ${formatMoney(receiptToUse.balanceRemaining)}\n\n` +
            `${receiptToUse.receiptQuote || ''}\n`,
        );

        const mailtoUrl = `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent(targetEmail)}&su=${subject}&body=${body}`;
        const popup = window.open(mailtoUrl, '_blank', 'noopener,noreferrer');
        if (!popup) window.location.href = mailtoUrl;

        const patched = await recordReceiptPatch(receiptToUse.paymentId, {
          receiptStatus: 'Emailed',
          receiptEmailedAt: new Date().toISOString(),
        });
        if (!patched) return;
        setNotice('Receipt email draft opened with the selected recipient.');
        return;
      }

      if (action === 'regenerate') {
        const patched = await recordReceiptPatch(receiptToUse.paymentId, {
          receiptGenerated: true,
          receiptStatus: 'Generated',
          receiptGeneratedAt: new Date().toISOString(),
          receiptNumber: receiptToUse.receiptNumber,
        });
        if (!patched) return;
        setNotice('Receipt re-synced from the payment record.');
        return;
      }

      if (action === 'openPayment') {
        navigate('/crm/payments', { state: { selectedPaymentId: receiptToUse.paymentId } });
        return;
      }

      if (action === 'openCheckout') {
        navigate('/crm/appointments', { state: { selectedAppointmentId: receiptToUse.appointmentId } });
        return;
      }

      if (action === 'openCustomer') {
        navigate('/crm/customers', { state: { selectedCustomerId: receiptToUse.customerId || receiptToUse.customerName } });
        return;
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleOpenLatest = () => {
    if (orderedReceipts[0]) {
      setSelectedReceiptId(orderedReceipts[0].id);
      return;
    }

    navigate('/crm/payments');
  };

  const handleLogout = () => {
    clearCrmToken();
    navigate('/crm-login');
  };

  const selectedReceiptDeliveryEmail = recipientEmail || selectedReceipt?.customerEmail || '';
  const receiptPreview = selectedReceipt;
  const emptyStateReceiptCount = orderedReceipts.filter((receipt) => receipt.receiptStatus === 'Pending').length;

  return (
    <CrmShell shellClassName="crm-receipts-shell">
      <main className="crm-receipts-main">
        <header className="crm-receipts-header">
          <div className="crm-receipts-header-copy">
            <p className="crm-receipts-kicker">Receipt Preview &amp; Delivery</p>
            <h1>Receipt</h1>
            <p className="crm-receipts-helper">
              Review a customer-facing receipt, send it by email, print or download it, and keep every receipt linked to the payment and appointment that created it.
            </p>

            <div className="crm-receipts-header-meta">
              <span className="crm-receipts-header-pill">Receipt #{receiptPreview?.receiptNumber || 'Pending'}</span>
              <span className="crm-receipts-header-pill">{receiptPreview?.issuedAt ? formatDateTime(receiptPreview.issuedAt) : 'Not generated yet'}</span>
              <span className="crm-receipts-header-pill">{receiptPreview?.receiptStatus || 'Pending'}</span>
            </div>
          </div>

          <div className="crm-receipts-header-actions">
            <button type="button" className="crm-payments-primary-btn" onClick={() => handleReceiptAction('print', receiptPreview)} disabled={!receiptPreview || isBusy}>
              Print Receipt
            </button>
            <button type="button" className="crm-payments-secondary-btn" onClick={() => handleReceiptAction('download', receiptPreview)} disabled={!receiptPreview || isBusy}>
              Download PDF
            </button>
            <button type="button" className="crm-payments-primary-btn" onClick={() => handleReceiptAction('email', receiptPreview)} disabled={!receiptPreview || isBusy}>
              Email Receipt
            </button>
            <button type="button" className="crm-payments-ghost-btn" onClick={() => navigate('/crm/payments')}>
              Back to Checkout
            </button>
            <button type="button" className="crm-payments-ghost-btn" onClick={() => handleReceiptAction('openPayment', receiptPreview)}>
              Open Payment
            </button>
            <button type="button" className="crm-payments-ghost-btn" onClick={() => handleReceiptAction('openCustomer', receiptPreview)}>
              Open Customer
            </button>
            <button type="button" className="crm-payments-logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <section className="crm-receipts-controls" aria-label="Receipt filters">
          <input
            type="search"
            className="crm-receipts-search"
            placeholder="Search by customer, payment ID, receipt number, appointment, or checkout..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <select className="crm-receipts-select" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
            {dateOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select className="crm-receipts-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {statusOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select className="crm-receipts-select" value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
            {branchOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select className="crm-receipts-select" value={deliveryFilter} onChange={(event) => setDeliveryFilter(event.target.value)}>
            {deliveryOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <button
            type="button"
            className={`crm-receipts-chip${todayOnly ? ' crm-receipts-chip-active' : ''}`}
            onClick={() => setTodayOnly((current) => !current)}
          >
            Today Only
          </button>
          <button type="button" className="crm-receipts-chip" onClick={() => navigate('/crm/payments')}>
            Open Payments
          </button>
          <button type="button" className="crm-receipts-chip" onClick={handleOpenLatest}>
            Open Latest Receipt
          </button>
        </section>

        <section className="crm-receipts-summary-grid-shell">
          {summaryCards.map((card) => (
            <article key={card.label} className={`crm-receipts-kpi-card${card.alert ? ' crm-receipts-kpi-card-alert' : ''}`}>
              <p>{card.label}</p>
              <strong>{card.value}</strong>
              <span>{card.subtext}</span>
            </article>
          ))}
        </section>

        {loadError ? <p className="crm-receipts-inline-error">{loadError}</p> : null}
        {notice ? <p className="crm-receipts-notice">{notice}</p> : null}
        {error ? <p className="crm-receipts-error">{error}</p> : null}

        <section className="crm-receipts-workspace">
          <div className="crm-receipts-preview-column">
            {isLoading ? (
              <div className="crm-receipts-loading-card">
                <div className="crm-receipts-loading-line crm-receipts-loading-line-lg" />
                <div className="crm-receipts-loading-line" />
                <div className="crm-receipts-loading-grid">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="crm-receipts-loading-line crm-receipts-loading-line-md" />
                <div className="crm-receipts-loading-line" />
              </div>
            ) : receiptPreview ? (
              <ReceiptDocumentPreview receipt={receiptPreview} formatDateTime={formatDateTime} />
            ) : (
              <article className="crm-receipts-empty-state">
                <p className="crm-receipts-kicker">Receipt-first workflow ready</p>
                <h3>No receipt selected yet</h3>
                <p>
                  Pick a receipt from the archive below or open the most recent payment to preview, print, download, or email the receipt without leaving this workspace.
                </p>
                <div className="crm-receipts-empty-actions">
                  <button type="button" className="crm-payments-primary-btn" onClick={handleOpenLatest}>
                    Open Latest Receipt
                  </button>
                  <button type="button" className="crm-payments-secondary-btn" onClick={() => navigate('/crm/payments')}>
                    Go to Checkout
                  </button>
                </div>
                <div className="crm-receipts-empty-grid">
                  <article>
                    <p>Pending Receipts</p>
                    <strong>{emptyStateReceiptCount}</strong>
                    <span>Need generation or delivery.</span>
                  </article>
                  <article>
                    <p>Checkout Queue</p>
                    <strong>{awaitingCheckoutQueue.length}</strong>
                    <span>Completed visits awaiting payment.</span>
                  </article>
                  <article>
                    <p>Archive Records</p>
                    <strong>{orderedReceipts.length}</strong>
                    <span>Receipt history in the current workspace.</span>
                  </article>
                </div>
              </article>
            )}
          </div>

          <aside className="crm-receipts-rail">
            <ReceiptDeliveryPanel
              receipt={receiptPreview}
              recipientEmail={selectedReceiptDeliveryEmail}
              onRecipientEmailChange={setRecipientEmail}
              onGenerateReceipt={(receipt) => {
                void handleGenerateReceipt(receipt || receiptPreview);
              }}
              onRegenerateReceipt={(receipt) => {
                void handleReceiptAction('regenerate', receipt || receiptPreview);
              }}
              onPrintReceipt={(receipt) => {
                void handleReceiptAction('print', receipt || receiptPreview);
              }}
              onDownloadReceipt={(receipt) => {
                void handleReceiptAction('download', receipt || receiptPreview);
              }}
              onEmailReceipt={(receipt) => {
                void handleReceiptAction('email', receipt || receiptPreview);
              }}
              onOpenPayment={(receipt) => {
                void handleReceiptAction('openPayment', receipt || receiptPreview);
              }}
              onOpenCheckout={() => navigate('/crm/payments')}
              onOpenCustomer={(receipt) => {
                void handleReceiptAction('openCustomer', receipt || receiptPreview);
              }}
              isBusy={isBusy}
              formatDateTime={formatDateTime}
            />
          </aside>
        </section>

        <section className="crm-receipts-bottom-grid">
          <AwaitingCheckoutQueue
            items={awaitingCheckoutQueue}
            formatMoney={formatMoney}
            onRecordPayment={(item) => navigate('/crm/payments', { state: { selectedPaymentId: item.paymentId || item.id } })}
            onOpenCheckout={() => navigate('/crm/payments')}
            onGenerateReceipt={(item) => {
              const linkedPayment = payments.find((payment) => payment.id === item.paymentId);
              if (linkedPayment) {
                void handleReceiptAction('download', buildReceiptPreview(linkedPayment, lookups, receiptBranding));
                return;
              }
              handleOpenLatest();
            }}
          />
        </section>
      </main>
    </CrmShell>
  );
};

export default CrmReceipts;
