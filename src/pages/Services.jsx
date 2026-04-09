import React from 'react';
import { Link } from 'react-router-dom';
import './Services.css';

const Services = () => {
  return (
    <div className="services-page">
      {/* Hero Section */}
      <section className="services-hero">
        <div className="services-hero-overlay"></div>
        <div className="container services-hero-content">
          <h1 className="services-hero-title">A World of<br/>Wellness</h1>
          <p className="services-hero-subtitle">
            Discover our curated selection of rituals, designed to restore<br/>
            your natural balance and elevate the spirit.
          </p>
        </div>
      </section>

      {/* Navigation Submenu */}
      <div className="services-nav-wrapper">
        <div className="container">
          <ul className="services-nav">
            <li><a href="#massages" className="active">MASSAGES</a></li>
            <li><a href="#facials">FACIALS</a></li>
            <li><a href="#body-rituals">BODY RITUALS</a></li>
            <li><a href="#wellness-journeys">WELLNESS JOURNEYS</a></li>
          </ul>
        </div>
      </div>

      {/* Services List */}
      <section className="services-list-section section-padding bg-soft-ivory">
        <div className="container">
          
          {/* Service 1 */}
          <div className="service-item" id="massages">
            <div className="service-image img-placeholder-massage"></div>
            <div className="service-details">
              <span className="text-accent">SIGNATURE THERAPY</span>
              <h2>Signature Deep Tissue<br/>Massage</h2>
              <p>
                A restorative journey using therapeutic oils and deep pressure
                techniques to release chronic tension and restore mobility. Our
                master therapists focus on realigning deeper layers of muscles
                and connective tissue.
              </p>
              <Link to="/booking" className="btn btn-primary">BOOK NOW</Link>
            </div>
            <div className="service-price-card glass">
              <span className="price">$180</span>
              <span className="duration">60 MINUTES</span>
            </div>
          </div>

          {/* Service 2 */}
          <div className="service-item reverse" id="facials">
            <div className="service-image img-placeholder-facial"></div>
            <div className="service-details">
              <span className="text-accent">SKIN RADIANCE</span>
              <h2>Luminous Botanical<br/>Facial</h2>
              <p>
                Experience the power of rare botanicals and cellular nutrients
                to reveal your skin's natural radiance. This bespoke treatment
                combines micro-exfoliation with a nutrient-rich mask to 
                illuminate your complexion.
              </p>
              <Link to="/booking" className="btn btn-primary">BOOK NOW</Link>
            </div>
            <div className="service-price-card glass pos-left">
              <span className="price">$150</span>
              <span className="duration">60 MINUTES</span>
            </div>
          </div>

          {/* Service 3 */}
          <div className="service-item" id="body-rituals">
            <div className="service-image img-placeholder-scrub"></div>
            <div className="service-details">
              <span className="text-accent">EXFOLIATION RITUAL</span>
              <h2>Himalayan Salt Body<br/>Scrub</h2>
              <p>
                A gentle exfoliation using mineral-rich Himalayan salts and
                organic jasmine oils to smooth and revitalize. This treatment
                improves circulation while leaving skin velvety soft and
                delicately scented.
              </p>
              <Link to="/booking" className="btn btn-primary">BOOK NOW</Link>
            </div>
            <div className="service-price-card glass">
              <span className="price">$120</span>
              <span className="duration">45 MINUTES</span>
            </div>
          </div>

        </div>
      </section>

      {/* Wellness Packages */}
      <section className="packages-section section-padding" id="wellness-journeys">
        <div className="container">
          <div className="text-center section-header">
            <span className="text-accent">EXTENDED EXPERIENCES</span>
            <h2>Wellness Packages</h2>
          </div>

          <div className="package-card">
            <div className="package-image img-placeholder-package"></div>
            <div className="package-content">
              <h3>The Sanctuary Escape</h3>
              <span className="package-duration">FULL DAY RITUAL • $550</span>
              <p>
                Our most comprehensive journey. Includes the Signature Deep Tissue 
                Massage, Luminous Facial, Himalayan Scrub, and a private healthy 
                lunch in the sanctuary gardens. Spend the day in complete disconnection.
              </p>
              <Link to="/booking" className="btn btn-outline" style={{marginTop: '1.5rem'}}>EXPLORE THIS RITUAL</Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Services;
