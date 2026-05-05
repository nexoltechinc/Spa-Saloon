import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RequireCrmAuth from './components/RequireCrmAuth';
import Home from './pages/Home';
import Services from './pages/Services';
import Booking from './pages/Booking';
import Contact from './pages/Contact';

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
  <div style={{ paddingTop: '150px', textAlign: 'center', minHeight: '60vh' }}>
    <h2>{title} Page Coming Soon</h2>
  </div>
);

const RouteFallback = ({ label }) => (
  <div style={{ minHeight: '42vh', display: 'grid', placeItems: 'center', padding: '6rem 1rem', textAlign: 'center' }}>
    <div>
      <p style={{ margin: 0, letterSpacing: '0.24em', textTransform: 'uppercase', fontSize: '0.72rem', color: '#8f7451' }}>
        Spa Saloon CRM
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

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/sanctuaries" element={<Placeholder title="Sanctuaries" />} />
          <Route path="/wellness" element={<Placeholder title="Wellness" />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/contact" element={<Contact />} />
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
