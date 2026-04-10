import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearCrmToken } from '../config/crm';
import { crmApiRequest, crmList, CRM_API_RESOURCES } from '../config/crmApi';
import CrmShell from '../components/CrmShell';
import './CrmDashboard.css';

const appointmentData = [
  {
    time: '10:00 AM',
    customer: 'Sarah Johnson',
    service: 'Deep Tissue Massage',
    staffRole: 'Therapist',
    staff: 'Marcus',
    status: 'In Progress',
    statusTone: 'warning',
  },
  {
    time: '11:30 AM',
    customer: 'Michael Chen',
    service: 'Hydrating Facial',
    staffRole: 'Aesthetician',
    staff: 'Elena',
    status: 'Confirmed',
    statusTone: 'neutral',
  },
  {
    time: '12:15 PM',
    customer: 'Emily Davis',
    service: 'Luxury Manicure',
    staffRole: 'Stylist',
    staff: 'Sofia',
    status: 'Arrived',
    statusTone: 'success',
  },
  {
    time: '02:00 PM',
    customer: 'David Wilson',
    service: 'Aromatherapy',
    staffRole: 'Therapist',
    staff: 'Marcus',
    status: 'Confirmed',
    statusTone: 'neutral',
  },
];

const kpiCards = [
  { title: 'Appointments', value: '25', trend: '+12%' },
  { title: 'Revenue', value: '$1,250', trend: '+$250' },
  { title: 'Pending', value: '3', trend: 'Due' },
  { title: 'New Leads', value: '5', trend: 'New' },
  { title: 'Active Staff', value: '8', trend: '8/12' },
  { title: 'Completed', value: '18', trend: 'Today' },
];

const staffData = [
  { name: 'Elena', status: 'Available', specialty: 'Facials' },
  { name: 'Marcus', status: 'In Session (45m left)', specialty: 'Massage' },
  { name: 'Sofia', status: 'Available', specialty: 'Nails' },
];

const quickActions = [
  { label: 'Add Booking', to: '/crm/appointments' },
  { label: 'Add Customer', to: '/crm/customers' },
  { label: 'Record Pay', to: '/crm/payments' },
  { label: 'Open POS', to: '/crm/payments' },
];

const parseCurrency = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (value && typeof value === 'object') {
    return parseCurrency(value.amount ?? value.total ?? value.value ?? value.displayValue ?? 0);
  }
  return 0;
};

const formatMoney = (amount) =>
  `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const normalizePayment = (payment, index = 0) => ({
  method: payment.method || payment.paymentMethod || payment.tender || 'Cash',
  amount: parseCurrency(payment.amount ?? payment.total ?? payment.value ?? payment.displayValue ?? 0),
  receipt: payment.receipt || payment.receiptNumber || payment.id || `RC-${String(index + 1).padStart(4, '0')}`,
  status: payment.status || payment.paymentStatus || 'Recorded',
});

const extractPercent = (reports, names) => {
  if (!Array.isArray(reports)) return null;
  const match = reports.find((item) => {
    const label = String(item.label || item.metric || item.name || '').toLowerCase();
    return names.some((needle) => label.includes(needle));
  });

  if (!match) return null;
  const raw = match.percent ?? match.percentage ?? match.value ?? match.displayValue ?? match.amount ?? match.total;
  const numeric = parseCurrency(raw);
  if (String(raw).includes('%')) return Math.max(0, Math.min(100, Number(String(raw).replace(/[^0-9.-]/g, '')) || 0));
  if (numeric > 1 && numeric <= 100) return numeric;
  return null;
};

const normalizeReportsPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const candidate = payload.data || payload.items || payload.results || payload.records;
    if (Array.isArray(candidate)) return candidate;
    return [payload];
  }
  return [];
};

const CrmDashboard = () => {
  const navigate = useNavigate();
  const [paymentRows, setPaymentRows] = useState([]);
  const [paymentError, setPaymentError] = useState('');
  const [salesSnapshot, setSalesSnapshot] = useState({ services: 85, products: 15 });
  const [salesError, setSalesError] = useState('');

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }),
    [],
  );

  useEffect(() => {
    let mounted = true;

    const loadDashboardData = async () => {
      setPaymentError('');
      setSalesError('');

      try {
        const [payments, reports] = await Promise.all([
          crmList('payments'),
          crmApiRequest(CRM_API_RESOURCES.reports),
        ]);

        if (!mounted) return;

        const normalizedPayments = payments.map(normalizePayment);
        setPaymentRows(normalizedPayments);

        const methodTotals = normalizedPayments.reduce((acc, payment) => {
          acc[payment.method] = (acc[payment.method] || 0) + payment.amount;
          return acc;
        }, {});

        const topMethods = Object.entries(methodTotals)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2);

        const reportRows = normalizeReportsPayload(reports);
        const servicesPercent =
          extractPercent(reportRows, ['services']) ??
          extractPercent(reportRows, ['service']) ??
          null;
        const productsPercent =
          extractPercent(reportRows, ['products']) ??
          extractPercent(reportRows, ['product']) ??
          null;

        if (servicesPercent !== null || productsPercent !== null) {
          const services = servicesPercent ?? Math.max(0, 100 - (productsPercent || 0));
          const products = productsPercent ?? Math.max(0, 100 - services);
          setSalesSnapshot({ services, products });
        } else if (topMethods.length > 0) {
          const total = topMethods.reduce((sum, [, amount]) => sum + amount, 0);
          const services = total > 0 ? Math.round((topMethods[0][1] / total) * 100) : 0;
          setSalesSnapshot({ services, products: Math.max(0, 100 - services) });
        }
      } catch (error) {
        if (!mounted) return;
        setPaymentError(error.message || 'Unable to load payment data from the CRM API.');
        setSalesError(error.message || 'Unable to load sales snapshot data from the CRM API.');
      }
    };

    void loadDashboardData();

    return () => {
      mounted = false;
    };
  }, []);

  const paymentSummary = useMemo(() => {
    const totals = paymentRows.reduce((acc, payment) => {
      const method = payment.method || 'Cash';
      acc[method] = (acc[method] || 0) + payment.amount;
      return acc;
    }, {});

    const methods = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);

    return methods.length > 0
      ? methods
      : [
          ['Credit Card', 0],
          ['Cash', 0],
        ];
  }, [paymentRows]);

  const totalPaymentAmount = useMemo(
    () => paymentRows.reduce((sum, payment) => sum + payment.amount, 0),
    [paymentRows],
  );

  const handleLogout = () => {
    clearCrmToken();
    navigate('/crm-login');
  };

  return (
    <CrmShell
      shellClassName="crm-dashboard-shell"
    >
      <main className="crm-dashboard-main">
        <header className="crm-top-bar">
          <h1>Dashboard</h1>
          <input
            className="crm-search"
            placeholder="Search appointments..."
            type="search"
          />
          <div className="crm-top-meta">
            <button className="crm-link-btn" type="button" onClick={() => navigate('/crm/branches')}>
              Branches
            </button>
            <button className="crm-link-btn" type="button" onClick={() => navigate('/crm/staff')}>
              Staffing
            </button>
            <button className="crm-link-btn" type="button" onClick={() => navigate('/crm/leads')}>
              Alerts
            </button>
            <button className="crm-link-btn" type="button" onClick={() => navigate('/crm/settings')}>
              Settings
            </button>
            <button className="crm-quick-btn" type="button" onClick={() => navigate('/crm/appointments')}>
              Quick Action
            </button>
            <button className="crm-logout-btn" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <section className="crm-welcome">
          <h2>Good morning, Isabella!</h2>
          <p>
            Welcome back to your digital sanctuary. Here is a glance at today&apos;s flow and
            wellness metrics.
          </p>
          <span className="crm-date-pill">{todayLabel}</span>
        </section>

        <section className="crm-kpi-grid">
          {kpiCards.map((card) => (
            <article key={card.title} className="crm-kpi-card">
              <div className="crm-kpi-trend">{card.trend}</div>
              <p className="crm-kpi-value">{card.value}</p>
              <p className="crm-kpi-title">{card.title}</p>
            </article>
          ))}
        </section>

        <section className="crm-main-grid">
          <article className="crm-appointments-card">
            <div className="crm-section-head">
              <h3>Today&apos;s Appointments</h3>
              <button type="button" onClick={() => navigate('/crm/appointments')}>
                View Calendar
              </button>
            </div>

            <div className="crm-appointment-list">
              {appointmentData.map((item) => (
                <div key={`${item.customer}-${item.time}`} className="crm-appointment-row">
                  <p className="crm-appointment-time">{item.time}</p>
                  <div>
                    <p className="crm-appointment-customer">{item.customer}</p>
                    <p className="crm-appointment-subline">{item.service}</p>
                  </div>
                  <div>
                    <p className="crm-appointment-role">{item.staffRole}</p>
                    <p className="crm-appointment-subline">{item.staff}</p>
                  </div>
                  <span className={`crm-status-tag crm-status-${item.statusTone}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>

            <button className="crm-secondary-action" type="button" onClick={() => navigate('/crm/appointments')}>
              + Schedule New Slot
            </button>
          </article>

          <div className="crm-side-stack">
            <article className="crm-concierge-card">
              <h3>Concierge Actions</h3>
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

            <article className="crm-staff-card">
              <h3>Staff Activity</h3>
              <div className="crm-staff-list">
                {staffData.map((staff) => (
                  <div key={staff.name} className="crm-staff-row">
                    <div className="crm-avatar">{staff.name.slice(0, 1)}</div>
                    <div>
                      <p className="crm-staff-name">{staff.name}</p>
                      <p className="crm-appointment-subline">{staff.status}</p>
                    </div>
                    <p className="crm-staff-tag">{staff.specialty}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="crm-bottom-grid">
            <article className="crm-summary-card">
              <h3>Payment Methods</h3>
              {paymentSummary.map(([method, amount], index) => {
              const total = totalPaymentAmount || 1;
              const width = Math.max(8, Math.round((amount / total) * 100));
              return (
                <div key={method} className="crm-summary-method">
                  <div className="crm-summary-row">
                    <span>{method}</span>
                    <strong>{formatMoney(amount)}</strong>
                  </div>
                  <div className="crm-progress-line">
                    <span style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
              })}
              <p className="crm-summary-note">
                Total processed: {formatMoney(totalPaymentAmount)}
              </p>
            </article>

          <article className="crm-summary-card">
            <h3>Sales Snapshot</h3>
            <div className="crm-summary-row">
              <span>Services</span>
              <strong>{salesSnapshot.services}%</strong>
            </div>
            <div className="crm-summary-row">
              <span>Products</span>
              <strong>{salesSnapshot.products}%</strong>
            </div>
            <div className="crm-ring-wrap">
              <div className="crm-ring">{salesSnapshot.services}%</div>
            </div>
          </article>
        </section>
      </main>
    </CrmShell>
  );
};

export default CrmDashboard;
