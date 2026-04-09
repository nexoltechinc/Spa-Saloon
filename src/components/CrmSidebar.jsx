import { Link, useLocation } from 'react-router-dom';
import './CrmSidebar.css';

const CrmSidebar = () => {
  const { pathname } = useLocation();
  const isActive = pathname === '/crm-login';

  return (
    <aside className="crm-sidebar-wrapper" aria-label="CRM quick access">
      <Link
        to="/crm-login"
        className={`crm-sidebar-link${isActive ? ' crm-sidebar-link-active' : ''}`}
      >
        Login to my CRM
      </Link>
    </aside>
  );
};

export default CrmSidebar;
