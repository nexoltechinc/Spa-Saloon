import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearCrmToken } from '../config/crm';
import { crmList } from '../config/crmApi';
import { CRM_NAV_ITEMS } from '../config/crmNav';
import './CrmGenericModule.css';

const paymentRows = [
  { customer: 'Isabella Thorne', method: 'Cash', amount: '$185.00', receipt: 'RC-1001', status: 'Recorded' },
  { customer: 'Julian Marc', method: 'Cash', amount: '$125.00', receipt: 'RC-1002', status: 'Recorded' },
  { customer: 'Elara Vance', method: 'Card', amount: '$310.00', receipt: 'RC-1003', status: 'Synced' },
];

const CrmPayments = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState(paymentRows);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadPayments = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const data = await crmList('payments');
        if (!mounted) return;

        if (data.length > 0) {
          setPayments(
            data.map((payment, index) => ({
              customer: payment.customer || payment.customerName || payment.name || `Customer ${index + 1}`,
              method: payment.method || payment.paymentMethod || 'Cash',
              amount: payment.amount || payment.total || '$0.00',
              receipt: payment.receipt || payment.receiptNumber || payment.id || `RC-${String(index + 1).padStart(4, '0')}`,
              status: payment.status || payment.paymentStatus || 'Recorded',
            })),
          );
        } else {
          setPayments(paymentRows);
        }
      } catch (error) {
        if (!mounted) return;
        setPayments(paymentRows);
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

  const summary = useMemo(() => ({
    totalCash: payments.reduce((sum, payment) => {
      const numeric = Number(String(payment.amount).replace(/[^0-9.-]/g, '')) || 0;
      return sum + numeric;
    }, 0),
    receipts: payments.length,
    pending: payments.filter((payment) => !['Recorded', 'Synced'].includes(payment.status)).length,
  }), [payments]);

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
            <h1>Payments</h1>
            <p>Track cash-on-hand payments, receipts, and checkout reconciliation.</p>
          </div>
          <div className="crm-generic-actions">
            <button className="crm-generic-primary" type="button" onClick={() => navigate('/crm/customers')}>
              Record Payment
            </button>
            <button className="crm-generic-ghost" type="button" onClick={() => navigate('/crm/reports')}>
              Export
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
          <article className="crm-generic-card">
            <p>Total Cash Today</p>
            <h2>${summary.totalCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
          </article>
          <article className="crm-generic-card">
            <p>Receipts Issued</p>
            <h2>{summary.receipts}</h2>
          </article>
          <article className="crm-generic-card">
            <p>Pending Checkout</p>
            <h2>{summary.pending}</h2>
          </article>
        </section>

        {loadError ? (
          <section className="crm-generic-panel">
            <h2>CRM sync warning</h2>
            <p>{loadError}</p>
          </section>
        ) : null}

        <section className="crm-generic-panel">
          <h2>Recent Transactions</h2>
          <div className="crm-generic-table">
            {isLoading ? (
              <div className="crm-generic-table-row">
                <span>Loading payments</span>
                <span>Syncing backend data</span>
                <span>-</span>
                <span>-</span>
                <span>-</span>
              </div>
            ) : payments.map((row) => (
              <div key={row.receipt} className="crm-generic-table-row">
                <span>{row.customer}</span>
                <span>{row.method}</span>
                <span>{row.amount}</span>
                <span>{row.receipt}</span>
                <span>{row.status}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default CrmPayments;
