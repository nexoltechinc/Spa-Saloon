import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RequireCrmAuth from './components/RequireCrmAuth';
import Home from './pages/Home';
import Services from './pages/Services';
import Booking from './pages/Booking';
import Contact from './pages/Contact';
import CrmLogin from './pages/CrmLogin';
import CrmDashboard from './pages/CrmDashboard';
import CrmCustomers from './pages/CrmCustomers';
import CrmServices from './pages/CrmServices';
import CrmStaff from './pages/CrmStaff';
import CrmPayments from './pages/CrmPayments';
import CrmReceipts from './pages/CrmReceipts';
import CrmReports from './pages/CrmReports';
import CrmBranches from './pages/CrmBranches';
import CrmSettings from './pages/CrmSettings';

const Placeholder = ({ title }) => (
  <div style={{ paddingTop: '150px', textAlign: 'center', minHeight: '60vh' }}>
    <h2>{title} Page Coming Soon</h2>
  </div>
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
          <Route path="/crm-login" element={<CrmLogin />} />
        </Route>

        <Route
          path="/crm/dashboard"
          element={(
            <RequireCrmAuth>
              <CrmDashboard />
            </RequireCrmAuth>
          )}
        />
        <Route
          path="/crm/branches"
          element={(
            <RequireCrmAuth>
              <CrmBranches />
            </RequireCrmAuth>
          )}
        />
        <Route
          path="/crm/settings"
          element={(
            <RequireCrmAuth>
              <CrmSettings />
            </RequireCrmAuth>
          )}
        />
        <Route
          path="/crm/leads"
          element={(
            <RequireCrmAuth>
              <Navigate to="/crm/dashboard" replace />
            </RequireCrmAuth>
          )}
        />
        <Route
          path="/crm/inquiries"
          element={(
            <RequireCrmAuth>
              <Navigate to="/crm/dashboard" replace />
            </RequireCrmAuth>
          )}
        />
        <Route
          path="/crm/customers"
          element={(
            <RequireCrmAuth>
              <CrmCustomers />
            </RequireCrmAuth>
          )}
        />
        <Route
          path="/crm/appointments"
          element={(
            <RequireCrmAuth>
              <Navigate to="/crm/dashboard" replace />
            </RequireCrmAuth>
          )}
        />
        <Route
          path="/crm/services"
          element={(
            <RequireCrmAuth>
              <CrmServices />
            </RequireCrmAuth>
          )}
        />
        <Route
          path="/crm/staff"
          element={(
            <RequireCrmAuth>
              <CrmStaff />
            </RequireCrmAuth>
          )}
        />
        <Route
          path="/crm/payments"
          element={(
            <RequireCrmAuth>
              <CrmPayments />
            </RequireCrmAuth>
          )}
        />
        <Route
          path="/crm/receipts"
          element={(
            <RequireCrmAuth>
              <CrmReceipts />
            </RequireCrmAuth>
          )}
        />
        <Route
          path="/crm/receipt"
          element={(
            <RequireCrmAuth>
              <Navigate to="/crm/receipts" replace />
            </RequireCrmAuth>
          )}
        />
        <Route
          path="/crm/reports"
          element={(
            <RequireCrmAuth>
              <CrmReports />
            </RequireCrmAuth>
          )}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
