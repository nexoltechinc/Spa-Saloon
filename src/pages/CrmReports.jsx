import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearCrmToken } from '../config/crm';
import { crmList } from '../config/crmApi';
import { CRM_NAV_ITEMS } from '../config/crmNav';
import './CrmGenericModule.css';

const CrmReports = () => {
  const navigate = useNavigate();
  const [reportRows, setReportRows] = useState([
    { label: 'Revenue', value: '$18.4k' },
    { label: 'Bookings', value: '324' },
    { label: 'Repeat Rate', value: '68%' },
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadReports = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const data = await crmList('reports');
        if (!mounted) return;

        if (data.length > 0) {
          setReportRows(
            data.map((item, index) => ({
              label: item.label || item.metric || item.name || `Metric ${index + 1}`,
              value: item.value || item.amount || item.total || item.displayValue || '—',
            })),
          );
        }
      } catch (error) {
        if (!mounted) return;
        setLoadError(error.message || 'Unable to load reports from the CRM API.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadReports();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="crm-generic-shell">
      <aside className="crm-generic-sidebar">
        <div className="crm-generic-brand">
          <p>The Sanctuary</p>
          <span>Premium Wellness</span>
        </div>
        <nav className="crm-generic-menu">
          {CRM_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) =>
                `crm-generic-menu-item${isActive ? ' crm-generic-menu-item-active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button className="crm-generic-book-btn" type="button" onClick={() => navigate('/crm/appointments')}>
          New Booking
        </button>
      </aside>

      <main className="crm-generic-main">
        <header className="crm-generic-header">
          <div>
            <h1>Reports</h1>
            <p>Review operational performance, sales, and team utilization.</p>
          </div>
          <div className="crm-generic-actions">
            <button className="crm-generic-primary" type="button" onClick={() => navigate('/crm/payments')}>
              Export CSV
            </button>
            <button className="crm-generic-ghost" type="button" onClick={() => navigate('/crm/dashboard')}>
              Dashboard
            </button>
            <button className="crm-generic-ghost" type="button" onClick={() => {
              clearCrmToken();
              navigate('/crm-login');
            }}>
              Logout
            </button>
          </div>
        </header>

        <section className="crm-generic-grid">
          {reportRows.map((item) => (
            <article key={item.label} className="crm-generic-card">
              <p>{item.label}</p>
              <h2>{item.value}</h2>
            </article>
          ))}
        </section>

        {loadError ? (
          <section className="crm-generic-panel">
            <h2>CRM sync warning</h2>
            <p>{loadError}</p>
          </section>
        ) : null}

        <section className="crm-generic-panel">
          <h2>Report Overview</h2>
          <p>
            {isLoading
              ? 'Syncing report aggregates from the CRM backend...'
              : 'This dashboard is now reading live report data from the CRM API when available.'}
          </p>
        </section>
      </main>
    </div>
  );
};

export default CrmReports;
