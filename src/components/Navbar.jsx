import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { KeyRound, Menu, X } from 'lucide-react';
import { SALON_NAME } from '../config/brand';
import './Navbar.css';

const navItems = [
  { to: '/services', label: 'Services' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

const Navbar = () => {
  const { pathname } = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const scrollFrameRef = useRef(0);
  const navClassName =
    pathname === '/' ? 'navbar navbar-home' : 'navbar navbar-solid';

  const getNavLinkClassName = ({ isActive }) =>
    isActive ? 'nav-link active' : 'nav-link';

  useEffect(() => {
    const updateScrollState = () => {
      scrollFrameRef.current = 0;
      setIsScrolled(window.scrollY > 18);
    };

    const handleScroll = () => {
      if (scrollFrameRef.current) {
        return;
      }

      scrollFrameRef.current = window.requestAnimationFrame(updateScrollState);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (scrollFrameRef.current) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }

      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const toggleMobileMenu = () => setIsMobileMenuOpen((current) => !current);

  return (
    <header className={`${navClassName}${isScrolled ? ' navbar-scrolled navbar-compact' : ''}`}>
      <div className="container nav-container">
        <div className="nav-brand">
          <Link to="/" className="nav-logo">
            {SALON_NAME}
          </Link>
          <span className="nav-brand-subtitle">Luxury salon & spa</span>
        </div>
        <nav className="nav-links" aria-label="Primary navigation">
          <ul className="nav-links-list">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={getNavLinkClassName}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="nav-actions">
          <Link to="/crm-login" className="btn btn-secondary nav-staff-link">
            <KeyRound size={14} />
            <span>Staff Login</span>
          </Link>
          <button
            type="button"
            className="nav-menu-toggle"
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="nav-mobile-panel"
            onClick={toggleMobileMenu}
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            <span>{isMobileMenuOpen ? 'Close' : 'Menu'}</span>
          </button>
          <Link to="/booking" className="btn btn-primary nav-cta">Reserve Now</Link>
        </div>
      </div>
      <div className={`nav-mobile-layer${isMobileMenuOpen ? ' open' : ''}`} aria-hidden={!isMobileMenuOpen}>
        <button
          type="button"
          className="nav-mobile-backdrop"
          aria-label="Close navigation menu"
          onClick={closeMobileMenu}
        />

        <aside id="nav-mobile-panel" className="nav-mobile-panel" aria-label="Mobile navigation menu">
          <div className="nav-mobile-panel-head">
            <div>
              <span className="nav-mobile-kicker">Navigation</span>
              <strong>{SALON_NAME}</strong>
            </div>
            <button
              type="button"
              className="nav-mobile-close"
              aria-label="Close navigation menu"
              onClick={closeMobileMenu}
            >
              <X size={18} />
            </button>
          </div>

          <nav className="nav-mobile-links" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={getNavLinkClassName}
                onClick={closeMobileMenu}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="nav-mobile-footer">
            <Link to="/crm-login" className="btn btn-secondary nav-mobile-secondary-cta" onClick={closeMobileMenu}>
              <KeyRound size={14} />
              <span>Staff Login</span>
            </Link>
            <Link to="/booking" className="btn btn-primary nav-mobile-cta" onClick={closeMobileMenu}>
              Reserve Now
            </Link>
            <p>Calm, elegant access to the full Hazel Beauty Saloon experience.</p>
          </div>
        </aside>
      </div>
    </header>
  );
};

export default Navbar;
