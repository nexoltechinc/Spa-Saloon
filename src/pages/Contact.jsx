import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import {
  BRAND_ADDRESS,
  BRAND_BOOKING_EMAIL,
  BRAND_BOOKING_PHONE,
  BRAND_CONTACT_EMAIL,
  BRAND_MAP_LINK,
  BRAND_PHONE,
  BRAND_TAGLINE,
  SALON_NAME,
} from '../config/brand';
import { crmCreate } from '../config/crmApi';
import './Contact.css';

const heroImage = '/images/hero.png';
const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(BRAND_ADDRESS)}&output=embed`;

const SUBJECT_OPTIONS = [
  { value: 'General Inquiry', label: 'General Inquiry' },
  { value: 'Booking Assistance', label: 'Booking Assistance' },
  { value: 'Bridal Consultation', label: 'Bridal Consultation' },
  { value: 'Partnership', label: 'Partnership' },
  { value: 'Feedback', label: 'Feedback' },
];

const INITIAL_FORM = {
  fullName: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
};

const VALIDATION_KEYS = Object.keys(INITIAL_FORM);

const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const validateContactForm = (values) => {
  const errors = {};
  const fullName = String(values.fullName || '').trim();
  const email = String(values.email || '').trim();
  const phone = String(values.phone || '').trim();
  const subject = String(values.subject || '').trim();
  const message = String(values.message || '').trim();

  if (fullName.length < 2) {
    errors.fullName = 'Please enter your full name.';
  }

  if (!validateEmail(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!subject) {
    errors.subject = 'Choose a subject so we can route your message.';
  }

  if (phone && phone.replace(/[^\d]/g, '').length < 7) {
    errors.phone = 'Enter a valid phone number, or leave this blank.';
  }

  if (message.length < 20) {
    errors.message = 'Please share at least 20 characters so we can help.';
  }

  return errors;
};

const createLeadPayload = (values) => {
  const submittedAt = new Date().toISOString();

  return {
    fullName: values.fullName.trim(),
    name: values.fullName.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    source: 'Website Form',
    status: 'New',
    leadStatus: 'New',
    priority: 'Normal',
    ownerName: 'Front Desk',
    owner: 'Front Desk',
    assignedTo: 'Front Desk',
    branchName: 'Melrose Sanctuary',
    branch: 'Melrose Sanctuary',
    serviceInterest: values.subject,
    service: values.subject,
    budget: 0,
    estimatedValue: 0,
    notes: `${values.subject}\n\n${values.message.trim()}`,
    metadata: {
      leadSource: 'Website - Contact Form',
      submittedAt,
      page: 'Contact Us',
    },
  };
};

const getFriendlySubmitError = (error) => {
  const status = Number(error?.status || 0);
  const code = String(error?.code || '');

  if (status === 0 || code === 'CRM_NETWORK_UNAVAILABLE') {
    return 'The CRM service could not be reached. Please try again in a moment or use the direct contact options.';
  }

  if (status >= 500 || code === 'CRM_SERVICE_UNAVAILABLE' || code === 'CRM_AUTH_SERVICE_UNAVAILABLE') {
    return 'The CRM is temporarily unavailable. Your message has not been lost, but please try again shortly.';
  }

  if (status === 404 || status === 405) {
    return 'The CRM lead route was not available. Please use the phone or email options while we verify the API.';
  }

  return String(error?.message || 'We could not send your message right now. Please try again.');
};

const contactChannels = [
  {
    label: 'Directions',
    icon: MapPin,
    href: BRAND_MAP_LINK,
    description: 'Open Google Maps',
  },
  {
    label: 'Call Front Desk',
    icon: Phone,
    href: `tel:${BRAND_PHONE.replace(/[^\d+]/g, '')}`,
    description: BRAND_PHONE,
  },
  {
    label: 'General Email',
    icon: Mail,
    href: `mailto:${BRAND_CONTACT_EMAIL}`,
    description: BRAND_CONTACT_EMAIL,
  },
  {
    label: 'Booking Email',
    icon: CalendarDays,
    href: `mailto:${BRAND_BOOKING_EMAIL}`,
    description: BRAND_BOOKING_EMAIL,
  },
];

const contactPromises = [
  {
    label: 'Response time',
    value: '24 business hours',
    icon: Clock3,
  },
  {
    label: 'Lead routing',
    value: 'CRM connected',
    icon: ShieldCheck,
  },
  {
    label: 'Visit style',
    value: 'By reservation',
    icon: Sparkles,
  },
];

const Contact = () => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [touched, setTouched] = useState({});
  const [status, setStatus] = useState('idle');
  const [feedback, setFeedback] = useState('');
  const [successRecord, setSuccessRecord] = useState(null);

  const errors = validateContactForm(form);
  const submittedAtLabel = successRecord?.submittedAt
    ? new Date(successRecord.submittedAt).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (status !== 'idle') {
      setStatus('idle');
      setFeedback('');
    }
  };

  const handleBlur = (field) => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  const markAllTouched = () => {
    setTouched(VALIDATION_KEYS.reduce((acc, key) => ({ ...acc, [key]: true }), {}));
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setTouched({});
    setStatus('idle');
    setFeedback('');
    setSuccessRecord(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    markAllTouched();

    const nextErrors = validateContactForm(form);
    if (Object.keys(nextErrors).length > 0) {
      setStatus('error');
      setFeedback('Please review the highlighted fields and try again.');
      return;
    }

    setStatus('submitting');
    setFeedback('Sending your inquiry to the CRM...');

    try {
      const savedLead = await crmCreate('leads', createLeadPayload(form));
      const leadId = savedLead?.id || savedLead?.leadId || savedLead?._id || '';

      setSuccessRecord({
        leadId,
        subject: form.subject,
        submittedAt: new Date().toISOString(),
      });
      setStatus('success');
      setFeedback('');
      setForm(INITIAL_FORM);
      setTouched({});
    } catch (error) {
      setStatus('error');
      setFeedback(getFriendlySubmitError(error));
    }
  };

  const fieldState = (field) => {
    const shouldShow = (status === 'error' || touched[field]) && errors[field];
    return {
      hasError: Boolean(shouldShow),
      errorMessage: shouldShow ? errors[field] : '',
    };
  };

  return (
    <div className="contact-page">
      <section className="contact-hero">
        <div className="contact-hero-backdrop" aria-hidden="true">
          <img src={heroImage} alt="" className="contact-hero-image" loading="eager" />
        </div>
        <div className="contact-hero-overlay" aria-hidden="true" />

        <div className="container contact-hero-grid">
          <div className="contact-hero-copy">
            <p className="contact-kicker">Contact / Lead Capture</p>
            <h1>Start the conversation, and we will route it with care.</h1>
            <p className="contact-hero-intro">
              {BRAND_TAGLINE}. Send a note, and our front desk will capture it in the CRM with a
              calm, premium follow-up path.
            </p>

            <div className="contact-hero-actions">
              <a href={`tel:${BRAND_PHONE.replace(/[^\d+]/g, '')}`} className="contact-primary-link">
                Call Front Desk
                <Phone size={16} />
              </a>
              <a href={BRAND_MAP_LINK} target="_blank" rel="noreferrer" className="contact-secondary-link">
                Get Directions
                <ExternalLink size={16} />
              </a>
            </div>

            <div className="contact-hero-trust">
              {contactPromises.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.label}>
                    <Icon size={16} />
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="contact-hero-panel">
            <article className="contact-response-card">
              <span className="contact-response-kicker">
                <ShieldCheck size={14} />
                Trusted lead flow
              </span>
              <h2>Every inquiry is designed to feel secure and human.</h2>
              <p>
                Your submission travels into the CRM as a new lead with a clear source,
                timestamp, and routing details.
              </p>
            </article>

            <div className="contact-response-grid">
              <article>
                <span>Lead source</span>
                <strong>Website - Contact Form</strong>
              </article>
              <article>
                <span>Response window</span>
                <strong>24 business hours</strong>
              </article>
              <article>
                <span>Follow-up tone</span>
                <strong>Warm + private</strong>
              </article>
              <article>
                <span>Routing</span>
                <strong>Front desk + CRM</strong>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="contact-main">
        <div className="container contact-layout">
          <aside className="contact-info-rail">
            <article className="contact-card contact-card-primary">
              <p className="contact-section-kicker">Salon Details</p>
              <h2>Visit Hazel Beauty Saloon in West Hollywood.</h2>
              <p className="contact-copy">
                We keep the experience calm from the first call to the final follow-up.
              </p>

              <div className="contact-detail-list">
                <a href={BRAND_MAP_LINK} target="_blank" rel="noreferrer" className="contact-detail-row">
                  <MapPin size={18} />
                  <div>
                    <span>Address</span>
                    <strong>{BRAND_ADDRESS}</strong>
                  </div>
                  <ExternalLink size={14} />
                </a>
                <a href={`tel:${BRAND_PHONE.replace(/[^\d+]/g, '')}`} className="contact-detail-row">
                  <Phone size={18} />
                  <div>
                    <span>Front desk</span>
                    <strong>{BRAND_PHONE}</strong>
                  </div>
                  <ArrowRight size={14} />
                </a>
                <a href={`tel:${BRAND_BOOKING_PHONE.replace(/[^\d+]/g, '')}`} className="contact-detail-row">
                  <CalendarDays size={18} />
                  <div>
                    <span>Booking line</span>
                    <strong>{BRAND_BOOKING_PHONE}</strong>
                  </div>
                  <ArrowRight size={14} />
                </a>
                <a href={`mailto:${BRAND_CONTACT_EMAIL}`} className="contact-detail-row">
                  <Mail size={18} />
                  <div>
                    <span>General email</span>
                    <strong>{BRAND_CONTACT_EMAIL}</strong>
                  </div>
                  <ArrowRight size={14} />
                </a>
                <a href={`mailto:${BRAND_BOOKING_EMAIL}`} className="contact-detail-row">
                  <Mail size={18} />
                  <div>
                    <span>Reservations</span>
                    <strong>{BRAND_BOOKING_EMAIL}</strong>
                  </div>
                  <ArrowRight size={14} />
                </a>
              </div>
            </article>

            <article className="contact-card contact-map-card">
              <div className="contact-map-header">
                <div>
                  <p className="contact-section-kicker">Map</p>
                  <h3>Interactive location preview</h3>
                </div>
                <a href={BRAND_MAP_LINK} target="_blank" rel="noreferrer" className="contact-map-link">
                  Open in Maps
                </a>
              </div>
              <div className="contact-map-frame">
                <iframe
                  title="Hazel Beauty Saloon location map"
                  src={mapEmbedUrl}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
                <div className="contact-map-overlay">
                  <span>West Hollywood</span>
                  <strong>{BRAND_ADDRESS}</strong>
                  <p>Tap the map to explore directions, nearby streets, and travel time.</p>
                </div>
              </div>
            </article>

            <article className="contact-card contact-connect-card">
              <p className="contact-section-kicker">Connect</p>
              <h3>Fast actions for mobile and desktop.</h3>
              <div className="contact-channel-grid">
                {contactChannels.map((channel) => {
                  const Icon = channel.icon;

                  return (
                    <a key={channel.label} href={channel.href} className="contact-channel-tile" target={channel.href.startsWith('http') ? '_blank' : undefined} rel={channel.href.startsWith('http') ? 'noreferrer' : undefined}>
                      <Icon size={18} />
                      <div>
                        <strong>{channel.label}</strong>
                        <span>{channel.description}</span>
                      </div>
                    </a>
                  );
                })}
              </div>
              <div className="contact-privacy-note">
                <ShieldCheck size={16} />
                <span>Your details are used only for salon follow-up and CRM routing.</span>
              </div>
            </article>
          </aside>

          <article className="contact-form-card">
            {status === 'success' && successRecord ? (
              <div className="contact-success-state" aria-live="polite">
                <div className="contact-success-badge">
                  <CheckCircle2 size={24} />
                </div>
                <p className="contact-section-kicker">Inquiry received</p>
                <h2>Thank you for your inquiry.</h2>
                <p className="contact-copy">
                  We have received your message and will respond within 24 business hours. You
                  will also receive a confirmation email shortly.
                </p>

                <div className="contact-success-grid">
                  <article>
                    <span>Reference</span>
                    <strong>{successRecord.leadId || 'CRM lead created'}</strong>
                  </article>
                  <article>
                    <span>Subject</span>
                    <strong>{successRecord.subject}</strong>
                  </article>
                  <article>
                    <span>Submitted</span>
                    <strong>{submittedAtLabel || 'Just now'}</strong>
                  </article>
                  <article>
                    <span>Next step</span>
                    <strong>Front desk follow-up</strong>
                  </article>
                </div>

                <div className="contact-success-actions">
                  <button type="button" className="contact-secondary-button" onClick={resetForm}>
                    Send another inquiry
                  </button>
                  <Link to="/booking" className="contact-primary-link">
                    Explore booking
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            ) : (
              <form className="contact-form" onSubmit={handleSubmit} noValidate>
                <div className="contact-form-header">
                  <div>
                    <p className="contact-section-kicker">Send an inquiry</p>
                    <h2>Tell us what you need, and we will route it into the CRM.</h2>
                  </div>
                  <span className="contact-form-eta">
                    <Clock3 size={14} />
                    Typical response: 24 business hours
                  </span>
                </div>

                <div className="contact-form-trust">
                  <ShieldCheck size={16} />
                  <span>Secure submission, inline validation, and direct CRM lead capture.</span>
                </div>

                {feedback ? (
                  <div
                    className={`contact-alert ${status === 'error' ? 'contact-alert-error' : 'contact-alert-info'}`}
                    role={status === 'error' ? 'alert' : 'status'}
                    aria-live="polite"
                  >
                    {status === 'error' ? <TriangleAlert size={16} /> : <Sparkles size={16} />}
                    <span>{feedback}</span>
                  </div>
                ) : null}

                <div className="contact-form-grid">
                  <label className={`contact-field ${form.fullName ? 'is-filled' : ''} ${fieldState('fullName').hasError ? 'has-error' : ''}`}>
                    <input
                      id="contact-full-name"
                      type="text"
                      value={form.fullName}
                      onChange={(event) => updateField('fullName', event.target.value)}
                      onBlur={() => handleBlur('fullName')}
                      placeholder=" "
                      autoComplete="name"
                      required
                    />
                    <span>Full name</span>
                    {fieldState('fullName').errorMessage ? <small>{fieldState('fullName').errorMessage}</small> : null}
                  </label>

                  <label className={`contact-field ${form.email ? 'is-filled' : ''} ${fieldState('email').hasError ? 'has-error' : ''}`}>
                    <input
                      id="contact-email"
                      type="email"
                      value={form.email}
                      onChange={(event) => updateField('email', event.target.value)}
                      onBlur={() => handleBlur('email')}
                      placeholder=" "
                      autoComplete="email"
                      required
                    />
                    <span>Email address</span>
                    {fieldState('email').errorMessage ? <small>{fieldState('email').errorMessage}</small> : null}
                  </label>

                  <label className={`contact-field ${form.phone ? 'is-filled' : ''} ${fieldState('phone').hasError ? 'has-error' : ''}`}>
                    <input
                      id="contact-phone"
                      type="tel"
                      value={form.phone}
                      onChange={(event) => updateField('phone', event.target.value)}
                      onBlur={() => handleBlur('phone')}
                      placeholder=" "
                      autoComplete="tel"
                    />
                    <span>Phone number (optional)</span>
                    {fieldState('phone').errorMessage ? <small>{fieldState('phone').errorMessage}</small> : null}
                  </label>

                  <label className={`contact-field contact-field-select ${form.subject ? 'is-filled' : ''} ${fieldState('subject').hasError ? 'has-error' : ''}`}>
                    <select
                      id="contact-subject"
                      value={form.subject}
                      onChange={(event) => updateField('subject', event.target.value)}
                      onBlur={() => handleBlur('subject')}
                      required
                    >
                      <option value="" disabled>
                        Select a reason
                      </option>
                      {SUBJECT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span>Subject</span>
                    {fieldState('subject').errorMessage ? <small>{fieldState('subject').errorMessage}</small> : null}
                  </label>

                  <label className={`contact-field contact-field-textarea contact-field-full ${form.message ? 'is-filled' : ''} ${fieldState('message').hasError ? 'has-error' : ''}`}>
                    <textarea
                      id="contact-message"
                      value={form.message}
                      onChange={(event) => updateField('message', event.target.value)}
                      onBlur={() => handleBlur('message')}
                      placeholder=" "
                      rows="6"
                      required
                    />
                    <span>Message</span>
                    {fieldState('message').errorMessage ? <small>{fieldState('message').errorMessage}</small> : null}
                  </label>
                </div>

                <div className="contact-form-footer">
                  <p className="contact-form-note">
                    <ShieldCheck size={16} />
                    <span>
                      Lead source: Website - Contact Form. We will confirm receipt by email and
                      create a CRM record for follow-up.
                    </span>
                  </p>

                  <button type="submit" className="contact-submit-button" disabled={status === 'submitting'}>
                    <span>{status === 'submitting' ? 'Sending...' : 'Send Message'}</span>
                    <Send size={16} />
                  </button>
                </div>
              </form>
            )}
          </article>
        </div>
      </section>
    </div>
  );
};

export default Contact;
