import { Link } from 'react-router-dom';
import { CalendarDays, Mail, MapPin, Phone } from 'lucide-react';
import {
  BRAND_ADDRESS,
  BRAND_BOOKING_EMAIL,
  BRAND_BOOKING_PHONE,
  BRAND_CONTACT_EMAIL,
  BRAND_MAP_LINK,
  BRAND_PHONE,
  BRAND_WHATSAPP_BOOKING_LINK,
  SALON_NAME,
} from '../config/brand';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const phoneHref = `tel:${BRAND_PHONE.replace(/[^\d+]/g, '')}`;
  const bookingPhoneHref = `tel:${BRAND_BOOKING_PHONE.replace(/[^\d+]/g, '')}`;

  return (
    <footer className="footer">
      <div className="container footer-container">
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            {SALON_NAME}
          </Link>
          <p className="footer-desc">
            Bridal, party, Eid, and everyday beauty services designed for Pakistani women who want
            a confident, graceful, and polished look.
          </p>
          <div className="footer-actions" aria-label="Quick contact actions">
            <a href={BRAND_MAP_LINK} target="_blank" rel="noreferrer" aria-label="Open the salon location">
              <MapPin size={18} />
              <span>Visit</span>
            </a>
            <a href={phoneHref} aria-label="Call the front desk">
              <Phone size={18} />
              <span>Call</span>
            </a>
            <a href={`mailto:${BRAND_CONTACT_EMAIL}`} aria-label="Email the salon">
              <Mail size={18} />
              <span>Email</span>
            </a>
            <a href={bookingPhoneHref} aria-label="Call the booking line">
              <CalendarDays size={18} />
              <span>Book</span>
            </a>
            <a href={BRAND_WHATSAPP_BOOKING_LINK} target="_blank" rel="noreferrer" aria-label="Book through WhatsApp">
              <Phone size={18} />
              <span>WhatsApp</span>
            </a>
          </div>
          <div className="footer-badges">
            <span>Ladies-friendly salon</span>
            <span>Lahore, Pakistan</span>
            <span>Bridal & party specialists</span>
          </div>
        </div>

        <div className="footer-column">
          <h4 className="footer-heading">Explore</h4>
          <div className="footer-links-group">
            <Link to="/services">Services</Link>
            <Link to="/packages">Packages &amp; Offers</Link>
            <Link to="/booking">Book Appointment</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/wellness">Wellness</Link>
          </div>
        </div>

        <div className="footer-column">
          <h4 className="footer-heading">Visit</h4>
          <div className="footer-links-group footer-contact">
            <p>{BRAND_ADDRESS}</p>
            <a href={phoneHref}>{BRAND_PHONE}</a>
            <a href={bookingPhoneHref}>{BRAND_BOOKING_PHONE}</a>
            <a href={`mailto:${BRAND_BOOKING_EMAIL}`}>{BRAND_BOOKING_EMAIL}</a>
            <a href={`mailto:${BRAND_CONTACT_EMAIL}`}>{BRAND_CONTACT_EMAIL}</a>
          </div>
        </div>

        <div className="footer-column">
          <h4 className="footer-heading">Support</h4>
          <div className="footer-links-group">
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/wellness-journal">Wellness Journal</Link>
            <Link to="/careers">Careers</Link>
            <Link to="/crm-login">Staff Login</Link>
          </div>
        </div>
      </div>

      <div className="container footer-bottom">
        <p className="footer-copyright">
          Copyright {currentYear} {SALON_NAME}. All rights reserved.
        </p>
        <p className="footer-bottom-note">Book by call or WhatsApp for bridal, event, or routine appointments.</p>
      </div>
    </footer>
  );
};

export default Footer;
