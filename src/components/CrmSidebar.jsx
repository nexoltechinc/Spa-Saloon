import { Link, useLocation } from 'react-router-dom';
import './CrmSidebar.css';

const CrmSidebar = () => {
  const { pathname } = useLocation();
  const isCrmWorkspace = pathname.startsWith('/crm/') && pathname !== '/crm-login';

  if (!isCrmWorkspace) {
    return null;
  }

  return (
    <aside className="crm-sidebar-wrapper" aria-label="CRM quick access">
      <Link
        to="/crm/dashboard"
        className="crm-sidebar-link crm-sidebar-link-active"
      >
        Open CRM
      </Link>
    </aside>
  );
};

export default CrmSidebar;
