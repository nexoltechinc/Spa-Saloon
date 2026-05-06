import React from 'react';
import { Camera, Mail, MapPin, MessageCircle, Phone, Users } from 'lucide-react';
import { BRAND_ADDRESS, BRAND_CONTACT_EMAIL, BRAND_PHONE, BRAND_TAGLINE, SALON_NAME } from '../config/brand';
import './Contact.css';

const Contact = () => {
  return (
    <div className="contact-page">
      {/* Hero Section */}
      <section className="contact-hero">
        <div className="contact-hero-overlay"></div>
        <div className="container contact-hero-content text-center">
          <h1 className="contact-hero-title">{SALON_NAME}</h1>
          <p className="contact-hero-subtitle">
            <i>{BRAND_TAGLINE}</i>
          </p>
        </div>
      </section>

      {/* Info & Form Section */}
      <section className="contact-section section-padding">
        <div className="container contact-grid">
          
          {/* Left Column - Contact Info */}
          <div className="contact-info">
            <div className="info-block">
              <span className="info-badge">LOCATION</span>
              <div className="info-item">
                <MapPin size={18} className="icon" />
                <p>{BRAND_ADDRESS}</p>
              </div>
              <div className="info-item">
                <Phone size={18} className="icon" />
                <p>{BRAND_PHONE}</p>
              </div>
              <div className="info-item">
                <Mail size={18} className="icon" />
                <p>{BRAND_CONTACT_EMAIL}</p>
              </div>
            </div>

            <div className="info-block">
              <span className="info-badge">HOURS</span>
              <div className="hours-row">
                <span>Monday — Sunday</span>
                <strong>9am — 9pm</strong>
              </div>
            </div>

            <div className="info-block">
              <span className="info-badge">CONNECT</span>
              <div className="social-icons">
                <a href="#" className="social-circle"><Camera size={16} /></a>
                <a href="#" className="social-circle"><MessageCircle size={16} /></a>
                <a href="#" className="social-circle"><Users size={16} /></a>
              </div>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="contact-form-wrapper glass">
            <h3 className="form-title">Send an Inquiry</h3>
            <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
              <div className="form-row">
                <div className="form-group">
                  <label>NAME</label>
                  <input type="text" placeholder="Your Name" />
                </div>
                <div className="form-group">
                  <label>EMAIL</label>
                  <input type="email" placeholder="email@address.com" />
                </div>
              </div>
              <div className="form-group">
                <label>SUBJECT</label>
                <input type="text" placeholder="How can we assist you?" />
              </div>
              <div className="form-group">
                <label>MESSAGE</label>
                <textarea placeholder="Your message here..." rows="5"></textarea>
              </div>
              <button type="submit" className="btn btn-primary submit-btn">SEND MESSAGE <span className="arrow">→</span></button>
            </form>
          </div>

        </div>
      </section>

      {/* Map Area */}
      <section className="map-section">
        <div className="map-placeholder">
          {/* Mock Map Background */}
            <div className="map-pin glass">
              <div className="pin-icon">
               <MapPin size={24} color="#D4AF37"/>
              </div>
              <div>
                <h4>{SALON_NAME}</h4>
                <span>{BRAND_TAGLINE}</span>
              </div>
            </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
