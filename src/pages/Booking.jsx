import React from 'react';
import './Booking.css';

const Booking = () => {
  return (
    <div className="booking-page">
      <div className="booking-header section-padding text-center">
        <h1>Schedule Your Escape</h1>
        <p className="booking-subtitle">
          Begin your personalized journey into stillness. Our therapists await to curate an<br/>
          experience that honors your body's unique rhythm.
        </p>
      </div>

      <section className="booking-section container">
        <div className="booking-widget">
          {/* Progress Steps */}
          <div className="booking-steps">
            <div className="step active">
              <div className="step-circle">1</div>
              <span>SELECT SERVICE</span>
            </div>
            <div className="step-line"></div>
            <div className="step">
              <div className="step-circle">2</div>
              <span>CHOOSE DATE</span>
            </div>
            <div className="step-line"></div>
            <div className="step">
              <div className="step-circle">3</div>
              <span>GUEST DETAILS</span>
            </div>
            <div className="step-line"></div>
            <div className="step">
              <div className="step-circle">4</div>
              <span>CONFIRMATION</span>
            </div>
          </div>

          <div className="booking-grid">
            {/* Left Column - Service Selection */}
            <div className="booking-left">
              <h3 className="booking-heading">Curated Treatments</h3>
              <p className="booking-desc">Select the healing modality that resonates with your current state of being.</p>
              
              <div className="service-options">
                <label className="service-radio active">
                  <div className="radio-content">
                    <h4>Signature Massage</h4>
                    <p>A bespoke blend of Swedish and deep tissue techniques using warming botanical oils.</p>
                    <div className="service-meta">
                      <span>90 MINUTES</span>
                      <span>$240</span>
                    </div>
                  </div>
                  <div className="radio-circle checked"></div>
                </label>

                <label className="service-radio">
                  <div className="radio-content">
                    <h4>Botanical Facial</h4>
                    <p>Organic herbal infusions and facial reflexology to restore your natural luminosity.</p>
                    <div className="service-meta">
                      <span>60 MINUTES</span>
                      <span>$185</span>
                    </div>
                  </div>
                  <div className="radio-circle"></div>
                </label>

                <label className="service-radio">
                  <div className="radio-content">
                    <h4>Himalayan Salt Scrub</h4>
                    <p>Detoxifying mineral salts combined with citrus essences for full-body renewal.</p>
                    <div className="service-meta">
                      <span>75 MINUTES</span>
                      <span>$210</span>
                    </div>
                  </div>
                  <div className="radio-circle"></div>
                </label>
              </div>
            </div>

            {/* Right Column - Date/Time & Summary */}
            <div className="booking-right">
              <h3 className="booking-heading">Select a Window of Peace</h3>
              <div className="calendar-placeholder">
                <div className="calendar-mockup">
                  <div className="calendar-header">
                    <span>&lt;</span>
                    <strong>November 2024</strong>
                    <span>&gt;</span>
                  </div>
                  <div className="calendar-days">
                    <span>SU</span><span>MO</span><span>TU</span><span>WE</span><span>TH</span><span>FR</span><span>SA</span>
                  </div>
                  <div className="calendar-dates">
                    <span className="fade">29</span><span className="fade">30</span><span className="fade">31</span>
                    <span>1</span><span>2</span><span>3</span><span>4</span>
                    <span>5</span><span>6</span><span>7</span><span>8</span><span className="selected">9</span><span>10</span><span>11</span>
                  </div>
                </div>
                
                <div className="time-slots">
                  <span className="time-heading">AVAILABLE TIMES</span>
                  <div className="slots">
                    <button className="slot">09:00 AM</button>
                    <button className="slot active">11:30 AM</button>
                    <button className="slot">02:00 PM</button>
                    <button className="slot">04:30 PM</button>
                  </div>
                </div>
              </div>

              {/* Summary Card */}
              <div className="booking-summary">
                <h4 className="summary-title">Booking Summary</h4>
                <div className="summary-row">
                  <span>Signature Massage</span>
                  <span>$240.00</span>
                </div>
                <div className="summary-row">
                  <span>Saturday, Nov 9</span>
                  <span>11:30 AM</span>
                </div>
                <div className="summary-total">
                  <span>Total</span>
                  <span className="total-price">$240.00</span>
                </div>
                <button className="btn btn-primary w-100">CONTINUE TO GUEST DETAILS</button>
                <div className="trust-badges">
                  <span>SECURE BOOKING</span>
                  <span>EXPERT THERAPISTS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Area */}
      <section className="booking-philosophy container section-padding">
        <div className="booking-philosophy-grid">
          <div className="philosophy-img bg-placeholder-interior"></div>
          <div className="philosophy-text-content">
            <h2>A Sanctuary Designed<br/>Around Your Breath</h2>
            <p>
              In the heart of the city, we have built a haven where time
              dissolves. Each booking is a commitment to yourself, a promise
              of restoration, and a step toward effortless clarity.
            </p>
            <div className="stats-grid">
              <div className="stat">
                <h3>98%</h3>
                <span>RENEWAL SUCCESS RATE</span>
              </div>
              <div className="stat">
                <h3>Exclusive</h3>
                <span>PRIVATE SUITE ACCESS</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Booking;
