import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { SALON_NAME } from '../config/brand';
import './Navbar.css';

const navItems = [
  { to: '/services', label: 'Services' },
  { to: '/sanctuaries', label: 'Sanctuaries' },
  { to: '/wellness', label: 'Wellness' },
  { to: '/contact', label: 'Contact' },
];

const Navbar = () => {
  const { pathname } = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const navClassName =
    pathname === '/' ? 'navbar navbar-home' : 'navbar navbar-solid';

  const getNavLinkClassName = ({ isActive }) =>
    isActive ? 'nav-link active' : 'nav-link';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <nav className={`${navClassName}${isScrolled ? ' navbar-scrolled' : ''}`}>
      <div className="container nav-container">
        <div className="nav-brand">
          <Link to="/" className="nav-logo">
            {SALON_NAME}
          </Link>
          <span className="nav-brand-subtitle">Luxury salon & spa</span>
        </div>
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
