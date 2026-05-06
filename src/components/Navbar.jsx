import { Link, NavLink, useLocation } from 'react-router-dom';
import { SALON_NAME } from '../config/brand';
import './Navbar.css';

const navItems = [
  { to: '/services', label: 'Services' },
  { to: '/sanctuaries', label: 'Sanctuaries' },
  { to: '/wellness', label: 'Wellness' },
  { to: '/booking', label: 'Booking' },
  { to: '/contact', label: 'Contact' },
  { to: '/crm-login', label: 'CRM Login' },
];

const Navbar = () => {
  const { pathname } = useLocation();
  const navClassName =
    pathname === '/' ? 'navbar navbar-home' : 'navbar navbar-solid';

  const getNavLinkClassName = ({ isActive }) =>
    isActive ? 'nav-link active' : 'nav-link';

  return (
    <nav className={navClassName}>
      <div className="container nav-container">
        <Link to="/" className="nav-logo">
          {SALON_NAME}
        </Link>
        <div className="nav-links">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={getNavLinkClassName}>
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="nav-actions">
          <Link to="/booking" className="btn btn-primary nav-cta">Reserve Now</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
