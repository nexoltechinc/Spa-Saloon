import { Link, useLocation } from 'react-router-dom';
import './CrmSidebar.css';

const CrmSidebar = () => {
  const { pathname } = useLocation();
  const isActive = pathname === '/crm-login' || pathname.startsWith('/crm/');
  const label = pathname.startsWith('/crm/') && pathname !== '/crm-login' ? 'Open CRM' : 'Login to my CRM';
  const target = pathname.startsWith('/crm/') && pathname !== '/crm-login' ? '/crm/dashboard' : '/crm-login';

  return (
    <aside className="crm-sidebar-wrapper" aria-label="CRM quick access">
      <Link
        to={target}
        className={`crm-sidebar-link${isActive ? ' crm-sidebar-link-active' : ''}`}
      >
        {label}
      </Link>
    </aside>
  );
};

export default CrmSidebar;
