import { NavLink } from 'react-router-dom';
import { CRM_NAV_ITEMS } from '../config/crmNav';

const CrmShell = ({ shellClassName, children }) => {
  return (
    <div className={shellClassName}>
      <aside className="crm-shell-sidebar">
        <div className="crm-shell-brand" aria-label="Aura Wellness CRM">
          <div className="crm-shell-brand-emblem" aria-hidden="true" />
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
