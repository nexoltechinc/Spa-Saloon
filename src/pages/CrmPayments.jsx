import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearCrmToken } from '../config/crm';
import { crmCreate, crmList, crmUpdate } from '../config/crmApi';
import CrmShell from '../components/CrmShell';
import './CrmPayments.css';

const paymentSeed = [
  {
    id: 'PAY-9921',
    customerName: 'Eleanor Hebert',
    appointmentId: 'APT-4402',
    serviceName: 'Deep Tissue Massage',
    amountDue: 180,
    amountPaid: 180,
    balanceRemaining: 0,
    method: 'Cash',
    status: 'Paid',
    paymentDate: '2026-04-10T10:12:00',
    recordedBy: 'Marcus',
    notes: 'Received at front desk.',
    receiptStatus: 'Issued',
  },
  {
    id: 'PAY-9922',
    customerName: 'Julian Waters',
    appointmentId: 'APT-4403',
    serviceName: 'Aroma Facial',
    amountDue: 220,
    amountPaid: 110,
    balanceRemaining: 110,
    method: 'Cash',
    status: 'Partial',
    paymentDate: '2026-04-10T11:22:00',
    recordedBy: 'Isabella',
    notes: 'Partial payment until checkout.',
    receiptStatus: 'Pending',
  },
  {
    id: 'PAY-9923',
    customerName: 'Sienna Miller',
    appointmentId: 'APT-4408',
    serviceName: 'Full Body Scrub',
    amountDue: 150,
    amountPaid: 0,
    balanceRemaining: 150,
    method: 'Pending',
    status: 'Unpaid',
    paymentDate: '2026-04-10T11:45:00',
    recordedBy: 'Elena',
    notes: 'Awaiting customer to arrive at checkout.',
    receiptStatus: 'Not Issued',
  },
  {
    id: 'PAY-9924',
    customerName: 'Robert Black',
    appointmentId: 'APT-4411',
    serviceName: 'Manicure Deluxe',
    amountDue: 95,
    amountPaid: 95,
    balanceRemaining: 0,
    method: 'Cash',
    status: 'Paid',
    paymentDate: '2026-04-09T16:10:00',
    recordedBy: 'Sofia',
    notes: 'Fully settled at end of visit.',
    receiptStatus: 'Issued',
  },
];

const statusOptions = ['All Statuses', 'Paid', 'Partial', 'Unpaid', 'Refunded', 'Cancelled'];
const methodOptions = ['All Methods', 'Cash', 'Card', 'Bank Transfer', 'Wallet', 'Pending'];
const dateOptions = ['Today', 'This Week', 'This Month', 'Custom Range'];

const parseMoney = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const numeric = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isNaN(numeric) ? 0 : numeric;
  }
  return 0;
};

const formatMoney = (value) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

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

const normalizePayment = (payment, index = 0) => {
  const amountDue = parseMoney(payment.amountDue ?? payment.totalDue ?? payment.amount ?? payment.total ?? 0);
  const amountPaid = parseMoney(payment.amountPaid ?? payment.paidAmount ?? payment.amountReceived ?? 0);
  const balanceRemaining =
    payment.balanceRemaining !== undefined && payment.balanceRemaining !== null
      ? parseMoney(payment.balanceRemaining)
      : Math.max(amountDue - amountPaid, 0);
  const status =
    payment.status ||
    payment.paymentStatus ||
    (balanceRemaining <= 0 && amountDue > 0 ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Unpaid');

  return {
    id: payment.id || payment.paymentId || payment.receiptId || `PAY-${9900 + index}`,
    customerName: payment.customerName || payment.customer || payment.name || 'Guest',
    customerId: payment.customerId || '',
    appointmentId: payment.appointmentId || payment.bookingId || payment.linkedAppointmentId || '',
    serviceName: payment.serviceName || payment.service || payment.treatment || 'Service',
    amountDue,
    amountPaid,
    balanceRemaining,
    method: payment.method || payment.paymentMethod || 'Cash',
    status,
    paymentDate: payment.paymentDate || payment.date || payment.createdAt || new Date().toISOString(),
    recordedBy: payment.recordedBy || payment.cashier || payment.createdBy || 'Front Desk',
    notes: payment.notes || payment.note || '',
    receiptStatus: payment.receiptStatus || payment.receipt || 'Not Issued',
    linkedReceiptId: payment.linkedReceiptId || payment.receiptId || '',
  };
};

const toneForStatus = (status) => {
  switch (status) {
    case 'Paid':
      return 'good';
    case 'Partial':
      return 'warning';
    case 'Unpaid':
      return 'alert';
    case 'Refunded':
      return 'muted';
    case 'Cancelled':
      return 'muted';
    default:
      return 'neutral';
  }
};

const CrmPayments = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState(paymentSeed);
  const [selectedPaymentId, setSelectedPaymentId] = useState(paymentSeed[0].id);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [methodFilter, setMethodFilter] = useState('All Methods');
  const [dateFilter, setDateFilter] = useState('Today');
  const [linkedOnly, setLinkedOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [recordDraft, setRecordDraft] = useState({
    customerName: '',
    appointmentId: '',
    serviceName: '',
    amountDue: '',
    amountPaid: '',
    method: 'Cash',
    paymentDate: new Date().toISOString().slice(0, 16),
    notes: '',
  });

  useEffect(() => {
    let mounted = true;

    const loadPayments = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const [paymentsData, customersData, appointmentsData] = await Promise.all([
          crmList('payments').catch(() => []),
          crmList('customers').catch(() => []),
          crmList('appointments').catch(() => []),
        ]);

        if (!mounted) return;

        const customerLookup = new Map(
          customersData.map((customer) => [
            customer.id || customer.customerId || customer._id,
            customer.name || customer.customerName || customer.fullName,
          ]),
        );

        const appointmentLookup = new Map(
          appointmentsData.map((appointment) => [
            appointment.id || appointment.appointmentId || appointment._id,
            appointment,
          ]),
        );

        const normalized = paymentsData.length > 0
          ? paymentsData.map((payment, index) => {
              const entry = normalizePayment(payment, index);
              const linkedAppointment = appointmentLookup.get(entry.appointmentId);
              const linkedCustomerName = customerLookup.get(entry.customerId);

              return {
                ...entry,
                customerName: linkedCustomerName || entry.customerName,
                appointmentId: entry.appointmentId || linkedAppointment?.id || linkedAppointment?.appointmentId || '',
                serviceName: entry.serviceName || linkedAppointment?.service || linkedAppointment?.serviceName || 'Service',
              };
            })
          : paymentSeed;

        setPayments(normalized);
        setSelectedPaymentId((current) => (normalized.some((payment) => payment.id === current) ? current : normalized[0]?.id || ''));
      } catch (error) {
        if (!mounted) return;
        setPayments(paymentSeed);
        setLoadError(error.message || 'Unable to load payments from the CRM API.');
        setSelectedPaymentId(paymentSeed[0]?.id || '');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadPayments();

    return () => {
      mounted = false;
    };
  }, []);

  const summaryCards = useMemo(() => {
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    const todayPayments = payments.filter((payment) => payment.paymentDate.slice(0, 10) === todayKey);
    const cashCollectedToday = todayPayments
      .filter((payment) => payment.method === 'Cash')
      .reduce((sum, payment) => sum + payment.amountPaid, 0);
    const pendingPayments = payments.filter((payment) => payment.status === 'Unpaid').length;
    const partialPayments = payments.filter((payment) => payment.status === 'Partial').length;
    const completedPayments = payments.filter((payment) => payment.status === 'Paid').length;
    const overdueBalances = payments
      .filter((payment) => payment.balanceRemaining > 0 && payment.status !== 'Paid')
      .reduce((sum, payment) => sum + payment.balanceRemaining, 0);

    return [
      { label: "Today's Payments", value: String(todayPayments.length).padStart(2, '0'), subtext: '+2 from yesterday' },
      { label: 'Cash Collected Today', value: formatMoney(cashCollectedToday), subtext: 'Cash on hand' },
      { label: 'Pending Payments', value: String(pendingPayments).padStart(2, '0'), subtext: 'Waiting' },
      { label: 'Partial Payments', value: String(partialPayments).padStart(2, '0'), subtext: 'In review' },
      { label: 'Completed Records', value: String(completedPayments).padStart(2, '0'), subtext: 'Fully paid' },
      { label: 'Overdue Balances', value: formatMoney(overdueBalances), subtext: 'Needs follow-up', alert: true },
    ];
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(today.getMonth() - 1);

    return payments.filter((payment) => {
      const searchTarget = `${payment.id} ${payment.customerName} ${payment.appointmentId} ${payment.serviceName}`.toLowerCase();
      const matchesSearch = !searchTerm || searchTarget.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All Statuses' || payment.status === statusFilter;
      const matchesMethod = methodFilter === 'All Methods' || payment.method === methodFilter;
      const paymentDate = new Date(payment.paymentDate);
      const matchesDate =
        dateFilter === 'Today'
          ? paymentDate.toISOString().slice(0, 10) === todayKey
          : dateFilter === 'This Week'
            ? paymentDate >= weekAgo
            : dateFilter === 'This Month'
              ? paymentDate >= monthAgo
              : true;
      const matchesLinked = !linkedOnly || Boolean(payment.appointmentId);
      const matchesOverdue = !overdueOnly || payment.balanceRemaining > 0;

      return matchesSearch && matchesStatus && matchesMethod && matchesDate && matchesLinked && matchesOverdue;
    });
  }, [dateFilter, linkedOnly, methodFilter, overdueOnly, payments, searchTerm, statusFilter]);

  const selectedPayment = useMemo(() => {
    return filteredPayments.find((payment) => payment.id === selectedPaymentId) || filteredPayments[0] || null;
  }, [filteredPayments, selectedPaymentId]);

  const dailyCashSnapshot = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayPayments = payments.filter((payment) => payment.paymentDate.slice(0, 10) === today);
    const openingCash = 500;
    const paymentsReceivedToday = todayPayments.reduce((sum, payment) => sum + payment.amountPaid, 0);
    const totalCashCollected = todayPayments
      .filter((payment) => payment.method === 'Cash')
      .reduce((sum, payment) => sum + payment.amountPaid, 0);
    const partialBalancesOutstanding = payments
      .filter((payment) => payment.balanceRemaining > 0)
      .reduce((sum, payment) => sum + payment.balanceRemaining, 0);
    const closingCashEstimate = openingCash + totalCashCollected;

    return [
      { label: 'Opening Cash', value: formatMoney(openingCash) },
      { label: 'Payments Received', value: formatMoney(paymentsReceivedToday) },
      { label: 'Total Cash', value: formatMoney(totalCashCollected) },
      { label: 'Outstanding', value: formatMoney(partialBalancesOutstanding) },
      { label: 'Closing Estimate', value: formatMoney(closingCashEstimate) },
    ];
  }, [payments]);

  const handleLogout = () => {
    clearCrmToken();
    navigate('/crm-login');
  };

  const handleStatusPatch = async (paymentId, nextStatus, extra = {}) => {
    setPayments((current) =>
      current.map((payment) =>
        payment.id === paymentId
          ? { ...payment, status: nextStatus, ...extra }
          : payment,
      ),
    );

    try {
      await crmUpdate('payments', paymentId, { status: nextStatus, ...extra });
    } catch (error) {
      setLoadError(error.message || 'Unable to update payment.');
    }
  };

  const openCreateDrawer = () => {
    setSaveError('');
    setRecordDraft({
      customerName: '',
      appointmentId: '',
      serviceName: '',
      amountDue: '',
      amountPaid: '',
      method: 'Cash',
      paymentDate: new Date().toISOString().slice(0, 16),
      notes: '',
    });
    setIsRecordOpen(true);
  };

  const handleExportPayments = () => {
    const rows = [
      ['Payment ID', 'Customer', 'Appointment', 'Service', 'Amount Due', 'Amount Paid', 'Balance', 'Status', 'Method', 'Date'],
      ...filteredPayments.map((payment) => [
        payment.id,
        payment.customerName,
        payment.appointmentId || 'Unlinked',
        payment.serviceName,
        payment.amountDue,
        payment.amountPaid,
        payment.balanceRemaining,
        payment.status,
        payment.method,
        formatDate(payment.paymentDate),
      ]),
    ];

    downloadCsv(`payments-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const handleRecordSubmit = async (event) => {
    event.preventDefault();
    setSaveError('');
    setIsSaving(true);

    try {
      const amountDue = parseMoney(recordDraft.amountDue);
      const amountPaid = parseMoney(recordDraft.amountPaid);
      const balanceRemaining = Math.max(amountDue - amountPaid, 0);
      const status = balanceRemaining <= 0 ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Unpaid';

      const payload = {
        customerName: recordDraft.customerName,
        appointmentId: recordDraft.appointmentId,
        serviceName: recordDraft.serviceName,
        amountDue,
        amountPaid,
        balanceRemaining,
        method: recordDraft.method,
        status,
        paymentDate: new Date(recordDraft.paymentDate).toISOString(),
        recordedBy: 'Front Desk',
        notes: recordDraft.notes,
        receiptStatus: amountPaid > 0 ? 'Pending' : 'Not Issued',
      };

      const created = await crmCreate('payments', payload);
      const normalized = normalizePayment(created, payments.length);
      setPayments((current) => [normalized, ...current]);
      setSelectedPaymentId(normalized.id);
      setIsRecordOpen(false);
    } catch (error) {
      setSaveError(error.message || 'Unable to record payment.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <CrmShell
      shellClassName="crm-payments-shell"
    >
      <main className="crm-payments-main">
        <header className="crm-payments-header">
          <div>
            <h1>Payment Management</h1>
            <p>Refining the financial flow of your sanctuary.</p>
          </div>

          <div className="crm-payments-header-actions">
            <input
              type="search"
              className="crm-payments-search"
              placeholder="Search customer, appointment, or payment ID..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <button type="button" className="crm-payments-ghost-btn" onClick={() => document.getElementById('crm-payment-filters')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
              Filter
            </button>
            <button type="button" className="crm-payments-ghost-btn" onClick={handleExportPayments}>
              Export
            </button>
            <button type="button" className="crm-payments-primary-btn" onClick={openCreateDrawer}>
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
              <option key={option}>{option}</option>
            ))}
          </select>
          <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
            {dateOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <button
            type="button"
            className={`crm-payments-chip${linkedOnly ? ' crm-payments-chip-active' : ''}`}
            onClick={() => setLinkedOnly((value) => !value)}
          >
            Linked Only
          </button>
          <button
            type="button"
            className={`crm-payments-chip${overdueOnly ? ' crm-payments-chip-active' : ''}`}
            onClick={() => setOverdueOnly((value) => !value)}
          >
            Overdue Balances
          </button>
        </section>

        <section className="crm-payments-content">
          <article className="crm-payments-table-card">
            <header className="crm-payments-table-head">
              <p>Payment ID</p>
              <p>Customer</p>
              <p>Appointment</p>
              <p>Service</p>
              <p>Amount Due</p>
              <p>Amount Paid</p>
              <p>Status</p>
              <p>Method</p>
              <p>Date</p>
            </header>

            {isLoading ? (
              <div className="crm-payments-empty">
                <h3>Loading payments</h3>
                <p>Fetching the latest payment records from the CRM backend.</p>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="crm-payments-empty">
                <h3>No payment records</h3>
                <p>Try changing the filters or record a new payment to get started.</p>
                <button type="button" className="crm-payments-primary-btn" onClick={openCreateDrawer}>
                  Record Payment
                </button>
              </div>
            ) : (
              <div className="crm-payments-table-body">
                {filteredPayments.map((payment) => {
                  const active = selectedPayment?.id === payment.id;
                  return (
                    <button
                      key={payment.id}
                      type="button"
                      className={`crm-payment-row${active ? ' crm-payment-row-active' : ''}`}
                      onClick={() => setSelectedPaymentId(payment.id)}
                    >
                      <p className="crm-payment-id">{payment.id}</p>
                      <div>
                        <p className="crm-payment-name">{payment.customerName}</p>
                        <p className="crm-payment-sub">{payment.appointmentId || 'Unlinked appointment'}</p>
                      </div>
                      <div>
                        <p className="crm-payment-service">{payment.serviceName}</p>
                        <p className="crm-payment-sub">{payment.notes || 'Cash-on-hand checkout'}</p>
                      </div>
                      <p className="crm-payment-amount">{formatMoney(payment.amountDue)}</p>
                      <p className="crm-payment-amount">{formatMoney(payment.amountPaid)}</p>
                      <span className={`crm-payment-pill crm-payment-pill-${toneForStatus(payment.status)}`}>
                        {payment.status}
                      </span>
                      <p className="crm-payment-method">{payment.method}</p>
                      <p className="crm-payment-date">{formatDate(payment.paymentDate)}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </article>

          <aside className="crm-payments-detail-card">
            {isRecordOpen ? (
              <>
                <div className="crm-payments-detail-head">
                  <p className="crm-payments-kicker">Record Payment</p>
                  <h3>Fast payment entry</h3>
                  <p>Capture a payment in one clean flow and keep the cash balance accurate.</p>
                </div>

                <form className="crm-payments-form" onSubmit={handleRecordSubmit}>
                  <label>
                    Customer
                    <input
                      type="text"
                      value={recordDraft.customerName}
                      onChange={(event) => setRecordDraft((draft) => ({ ...draft, customerName: event.target.value }))}
                      placeholder="Customer name"
                      required
                    />
                  </label>
                  <label>
                    Appointment ID
                    <input
                      type="text"
                      value={recordDraft.appointmentId}
                      onChange={(event) => setRecordDraft((draft) => ({ ...draft, appointmentId: event.target.value }))}
                      placeholder="APT-0000"
                    />
                  </label>
                  <label>
                    Service / Visit
                    <input
                      type="text"
                      value={recordDraft.serviceName}
                      onChange={(event) => setRecordDraft((draft) => ({ ...draft, serviceName: event.target.value }))}
                      placeholder="Service name"
                      required
                    />
                  </label>
                  <div className="crm-payments-form-grid">
                    <label>
                      Amount Due
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={recordDraft.amountDue}
                        onChange={(event) => setRecordDraft((draft) => ({ ...draft, amountDue: event.target.value }))}
                        required
                      />
                    </label>
                    <label>
                      Amount Paid
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={recordDraft.amountPaid}
                        onChange={(event) => setRecordDraft((draft) => ({ ...draft, amountPaid: event.target.value }))}
                        required
                      />
                    </label>
                  </div>
                  <label>
                    Payment Method
                    <select
                      value={recordDraft.method}
                      onChange={(event) => setRecordDraft((draft) => ({ ...draft, method: event.target.value }))}
                    >
                      <option>Cash</option>
                      <option>Card</option>
                      <option>Bank Transfer</option>
                      <option>Wallet</option>
                    </select>
                  </label>
                  <label>
                    Payment Date
                    <input
                      type="datetime-local"
                      value={recordDraft.paymentDate}
                      onChange={(event) => setRecordDraft((draft) => ({ ...draft, paymentDate: event.target.value }))}
                    />
                  </label>
                  <label>
                    Notes
                    <textarea
                      rows="3"
                      value={recordDraft.notes}
                      onChange={(event) => setRecordDraft((draft) => ({ ...draft, notes: event.target.value }))}
                      placeholder="Optional payment note"
                    />
                  </label>

                  {saveError ? <p className="crm-payments-form-error">{saveError}</p> : null}

                  <div className="crm-payments-form-actions">
                    <button type="button" className="crm-payments-ghost-btn" onClick={() => setIsRecordOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="crm-payments-primary-btn" disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Payment'}
                    </button>
                  </div>
                </form>
              </>
            ) : selectedPayment ? (
              <>
                <div className="crm-payments-detail-head">
                  <p className="crm-payments-kicker">Payment Detail</p>
                  <h3>{selectedPayment.customerName}</h3>
                  <p>{selectedPayment.id}</p>
                </div>

                <div className="crm-payments-client-chip">
                  <div className="crm-payments-avatar">{selectedPayment.customerName.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <strong>{selectedPayment.customerName}</strong>
                    <p>{selectedPayment.receiptStatus}</p>
                  </div>
                </div>

                <div className="crm-payments-info-grid">
                  <div>
                    <p>Linked Appointment</p>
                    <strong>{selectedPayment.appointmentId || 'Unlinked'}</strong>
                  </div>
                  <div>
                    <p>Service</p>
                    <strong>{selectedPayment.serviceName}</strong>
                  </div>
                  <div>
                    <p>Amount Due</p>
                    <strong>{formatMoney(selectedPayment.amountDue)}</strong>
                  </div>
                  <div>
                    <p>Amount Paid</p>
                    <strong>{formatMoney(selectedPayment.amountPaid)}</strong>
                  </div>
                  <div>
                    <p>Balance</p>
                    <strong>{formatMoney(selectedPayment.balanceRemaining)}</strong>
                  </div>
                  <div>
                    <p>Method</p>
                    <strong>{selectedPayment.method}</strong>
                  </div>
                  <div>
                    <p>Recorded By</p>
                    <strong>{selectedPayment.recordedBy}</strong>
                  </div>
                  <div>
                    <p>Date</p>
                    <strong>{formatDate(selectedPayment.paymentDate)}</strong>
                  </div>
                </div>

                <div className={`crm-payment-status-banner crm-payment-status-${toneForStatus(selectedPayment.status)}`}>
                  {selectedPayment.status === 'Paid'
                    ? 'Fully settled and ready for receipt follow-up.'
                    : selectedPayment.status === 'Partial'
                      ? 'Partial balance remains open and needs settlement.'
                      : 'Payment still needs front-desk attention.'}
                </div>

                <div className="crm-payments-note-card">
                  <p>Notes</p>
                  <span>{selectedPayment.notes || 'No payment note recorded.'}</span>
                </div>

                <div className="crm-payments-actions">
                  <button type="button" className="crm-payments-primary-btn" onClick={() => handleStatusPatch(selectedPayment.id, 'Paid', { amountPaid: selectedPayment.amountDue, balanceRemaining: 0 })}>
                    Mark Paid
                  </button>
                  <button type="button" className="crm-payments-secondary-btn" onClick={() => handleStatusPatch(selectedPayment.id, selectedPayment.status, { receiptStatus: 'Issued' })}>
                    Generate Receipt
                  </button>
                  <button type="button" className="crm-payments-secondary-btn" onClick={() => navigate('/crm/customers')}>
                    Open Customer
                  </button>
                  <button type="button" className="crm-payments-ghost-btn" onClick={() => navigate('/crm/appointments')}>
                    Open Appointment
                  </button>
                </div>
              </>
            ) : (
              <div className="crm-payments-empty">
                <h3>Select a payment</h3>
                <p>Choose a row to review settlement status and receipt actions.</p>
              </div>
            )}
          </aside>
        </section>

        <section className="crm-payments-cash-snapshot">
          <h3>Daily Cash Snapshot</h3>
          <div className="crm-payments-cash-grid">
            {dailyCashSnapshot.map((item) => (
              <article key={item.label} className="crm-payments-cash-card">
                <p>{item.label}</p>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </section>
      </main>
    </CrmShell>
  );
};

export default CrmPayments;
