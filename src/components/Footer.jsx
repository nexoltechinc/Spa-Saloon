import { Link } from 'react-router-dom';
import { Globe, Mail, Send } from 'lucide-react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container footer-container">
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            Ethereal Sanctuary
          </Link>
          <p className="footer-desc">
            Your destination for holistic rejuvenation and refined wellness
            experiences since 1994.
          </p>
          <div className="footer-socials">
            <a href="#" aria-label="Discover our world">
              <Globe size={18} />
            </a>
            <a href="#" aria-label="Share with us">
              <Send size={18} />
            </a>
            <a href="#" aria-label="Email us">
              <Mail size={18} />
            </a>
          </div>
        </div>

        <div className="footer-nav">
          <div className="footer-links-group">
            <h4 className="footer-heading">Navigation</h4>
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/wellness-journal">Wellness Journal</Link>
            <Link to="/careers">Careers</Link>
          </div>
        </div>

        <div className="footer-links-group footer-contact">
          <h4 className="footer-heading">The Sanctuary</h4>
          <p>
            1200 Serenity Path,
            <br />
            Coastal Valley, CA 90210
          </p>
          <p>T: +1 (800) 555-ETHEREAL</p>
          <p>E: concierge@ethereal.spa</p>
          <p className="footer-copyright">
            Copyright 2024 Ethereal Sanctuary. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
