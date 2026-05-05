import { NavLink } from 'react-router-dom';
import { CRM_NAV_ITEMS } from '../config/crmNav';
import { BRAND_TAGLINE, CRM_NAME, SALON_INITIALS, SALON_NAME } from '../config/brand';

const CrmShell = ({ shellClassName, children }) => {
  return (
    <div className={shellClassName}>
      <aside className="crm-shell-sidebar">
        <div className="crm-shell-brand" aria-label={CRM_NAME}>
          <div className="crm-shell-brand-emblem" aria-hidden="true">
            <span>{SALON_INITIALS}</span>
          </div>
          <div className="crm-shell-brand-copy">
            <strong className="crm-shell-brand-name">{SALON_NAME}</strong>
            <span className="crm-shell-brand-subtitle">CRM Workspace</span>
            <span className="crm-shell-brand-tagline">{BRAND_TAGLINE}</span>
          </div>
        </div>

        <nav className="crm-shell-menu" aria-label="CRM navigation">
          {CRM_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) =>
                `crm-shell-menu-item${isActive ? ' crm-shell-menu-item-active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {children}
    </div>
  );
};

export default CrmShell;
