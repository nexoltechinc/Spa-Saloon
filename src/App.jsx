import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import RequireCrmAuth from './components/RequireCrmAuth';
import Home from './pages/Home';
import Services from './pages/Services';
import About from './pages/About';
import Booking from './pages/Booking';
import Contact from './pages/Contact';
import { CRM_NAME, SALON_NAME } from './config/brand';

const CrmLogin = lazy(() => import('./pages/CrmLogin'));
const CrmDashboard = lazy(() => import('./pages/CrmDashboard'));
const CrmLeads = lazy(() => import('./pages/CrmLeads'));
const CrmAppointments = lazy(() => import('./pages/CrmAppointments'));
const CrmCustomers = lazy(() => import('./pages/CrmCustomers'));
const CrmServices = lazy(() => import('./pages/CrmServices'));
const CrmStaff = lazy(() => import('./pages/CrmStaff'));
const CrmPayments = lazy(() => import('./pages/CrmPayments'));
const CrmReceipts = lazy(() => import('./pages/CrmReceipts'));
const CrmReports = lazy(() => import('./pages/CrmReports'));
const CrmSettings = lazy(() => import('./pages/CrmSettings'));

const Placeholder = ({ title }) => (
  <div
    style={{
      minHeight: '60vh',
      display: 'grid',
      placeItems: 'center',
      padding: '8rem 1rem',
      textAlign: 'center',
    }}
  >
    <div style={{ maxWidth: '40rem' }}>
      <p
        style={{
          margin: 0,
          color: '#6d5b11',
          fontFamily: 'var(--font-accent)',
          fontSize: '0.72rem',
          fontWeight: 800,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
        }}
      >
        Coming soon
      </p>
      <h2
        style={{
          margin: '0.5rem 0 1rem',
          color: '#1f221d',
          fontFamily: 'var(--font-editorial)',
          fontSize: 'clamp(2rem, 4vw, 3.2rem)',
          fontStyle: 'italic',
          fontWeight: 500,
          letterSpacing: '-0.04em',
        }}
      >
        {title}
      </h2>
      <p
        style={{
          color: '#5b6357',
          fontFamily: 'var(--font-sans)',
          fontSize: '1rem',
          lineHeight: '1.85',
          margin: 0,
        }}
      >
        We're refining this page to match the rest of the Hazel Beauty Saloon experience. For
        now, the main services, booking, and contact paths are ready.
      </p>
    </div>
  </div>
);

const RouteFallback = ({ label }) => (
  <div style={{ minHeight: '42vh', display: 'grid', placeItems: 'center', padding: '6rem 1rem', textAlign: 'center' }}>
    <div>
      <p style={{ margin: 0, letterSpacing: '0.24em', textTransform: 'uppercase', fontSize: '0.72rem', color: '#8f7451' }}>
        {CRM_NAME}
      </p>
      <h2 style={{ margin: '0.45rem 0 0', fontFamily: 'var(--font-editorial)', fontSize: '2rem', color: '#2b241c' }}>
        {label}
      </h2>
    </div>
  </div>
);

const withCrmSuspense = (element, label) => (
  <RequireCrmAuth>
    <Suspense fallback={<RouteFallback label={label} />}>
      {element}
    </Suspense>
  </RequireCrmAuth>
);

const TitleManager = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = pathname.startsWith('/crm') || pathname === '/crm-login'
      ? CRM_NAME
      : `${SALON_NAME} | Luxury Salon & Spa`;
  }, [pathname]);

  return null;
};

function App() {
  return (
    <Router>
      <TitleManager />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/about" element={<About />} />
          <Route path="/sanctuaries" element={<Placeholder title="Sanctuaries" />} />
          <Route path="/wellness" element={<Placeholder title="Wellness" />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy-policy" element={<Placeholder title="Privacy Policy" />} />
          <Route path="/terms" element={<Placeholder title="Terms of Service" />} />
          <Route path="/wellness-journal" element={<Placeholder title="Wellness Journal" />} />
          <Route path="/careers" element={<Placeholder title="Careers" />} />
          <Route
            path="/crm-login"
            element={(
              <Suspense fallback={<RouteFallback label="Loading CRM login..." />}>
                <CrmLogin />
              </Suspense>
            )}
          />
        </Route>

        <Route path="/crm/dashboard" element={withCrmSuspense(<CrmDashboard />, 'Loading dashboard...')} />
        <Route
          path="/crm/branches"
          element={withCrmSuspense(<Navigate to="/crm/dashboard" replace />, 'Loading dashboard...')}
        />
        <Route path="/crm/settings" element={withCrmSuspense(<CrmSettings />, 'Loading settings...')} />
        <Route path="/crm/leads" element={withCrmSuspense(<CrmLeads />, 'Loading leads...')} />
        <Route path="/crm/inquiries" element={withCrmSuspense(<CrmLeads />, 'Loading leads...')} />
        <Route path="/crm/customers" element={withCrmSuspense(<CrmCustomers />, 'Loading customers...')} />
        <Route path="/crm/appointments" element={withCrmSuspense(<CrmAppointments />, 'Loading appointments...')} />
        <Route path="/crm/services" element={withCrmSuspense(<CrmServices />, 'Loading services...')} />
        <Route path="/crm/staff" element={withCrmSuspense(<CrmStaff />, 'Loading staff...')} />
        <Route path="/crm/payments" element={withCrmSuspense(<CrmPayments />, 'Loading payments...')} />
        <Route path="/crm/receipts" element={withCrmSuspense(<CrmReceipts />, 'Loading receipts...')} />
        <Route
          path="/crm/receipt"
          element={withCrmSuspense(<Navigate to="/crm/receipts" replace />, 'Loading receipts...')}
        />
        <Route path="/crm/reports" element={withCrmSuspense(<CrmReports />, 'Loading reports...')} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
