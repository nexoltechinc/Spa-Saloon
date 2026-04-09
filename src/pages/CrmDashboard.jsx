import { useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearCrmToken } from '../config/crm';
import { CRM_NAV_ITEMS } from '../config/crmNav';
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

const quickActions = ['Add Booking', 'Add Customer', 'Record Pay', 'Open POS'];

const CrmDashboard = () => {
  const navigate = useNavigate();

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

  return (
    <div className="crm-dashboard-shell">
      <aside className="crm-dashboard-sidebar">
        <div className="crm-brand-block">
          <p className="crm-brand-title">The Sanctuary</p>
          <p className="crm-brand-subtitle">Premium Wellness</p>
        </div>

        <nav className="crm-menu">
          {CRM_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) =>
                `crm-menu-item crm-menu-link${isActive ? ' crm-menu-item-active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button className="crm-book-now-btn" type="button" onClick={() => navigate('/crm/appointments')}>
          Book Now
        </button>
      </aside>

      <main className="crm-dashboard-main">
        <header className="crm-top-bar">
          <h1>Dashboard</h1>
          <input
            className="crm-search"
            placeholder="Search appointments..."
            type="search"
          />
          <div className="crm-top-meta">
            <button className="crm-link-btn" type="button" onClick={() => navigate('/crm/appointments')}>
              Branches
            </button>
            <button className="crm-link-btn" type="button" onClick={() => navigate('/crm/staff')}>
              Staffing
            </button>
            <button className="crm-link-btn" type="button" onClick={() => navigate('/crm/leads')}>
              Alerts
            </button>
            <button className="crm-link-btn" type="button" onClick={() => navigate('/crm/services')}>
              Settings
            </button>
            <button className="crm-quick-btn" type="button" onClick={() => navigate('/crm/customers')}>
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
                  <button key={action} type="button" className="crm-action-btn">
                    {action}
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
            <div className="crm-summary-row">
              <span>Credit Card</span>
              <strong>$890.00</strong>
            </div>
            <div className="crm-progress-line">
              <span style={{ width: '72%' }} />
            </div>
            <div className="crm-summary-row">
              <span>Cash</span>
              <strong>$360.00</strong>
            </div>
            <div className="crm-progress-line">
              <span style={{ width: '32%' }} />
            </div>
          </article>

          <article className="crm-summary-card">
            <h3>Sales Snapshot</h3>
            <div className="crm-summary-row">
              <span>Services</span>
              <strong>85%</strong>
            </div>
            <div className="crm-summary-row">
              <span>Products</span>
              <strong>15%</strong>
            </div>
            <div className="crm-ring-wrap">
              <div className="crm-ring">85%</div>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
};

export default CrmDashboard;
