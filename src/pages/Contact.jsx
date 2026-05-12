import { useState } from 'react';
import { Link } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
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
  TriangleAlert,
} from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  BRAND_ADDRESS,
  BRAND_BOOKING_EMAIL,
  BRAND_BOOKING_PHONE,
  BRAND_CONTACT_EMAIL,
  BRAND_MAP_LINK,
  BRAND_PHONE,
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
  { value: 'Private Event', label: 'Private Event' },
  { value: 'Feedback', label: 'Feedback' },
];
const SUBJECT_VALUES = SUBJECT_OPTIONS.map((option) => option.value);

const OPENING_HOURS = [
  { day: 'Monday - Friday', hours: '10:00 AM - 8:00 PM' },
  { day: 'Saturday', hours: '10:00 AM - 7:00 PM' },
  { day: 'Sunday', hours: 'By Appointment' },
];

const INITIAL_FORM = {
  fullName: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
};

const contactSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Please enter your full name.'),
    email: z.string().trim().email('Enter a valid email address.'),
    phone: z.string().trim().optional().or(z.literal('')),
    subject: z
      .string()
      .trim()
      .min(1, 'Please choose a subject.')
      .refine((value) => SUBJECT_VALUES.includes(value), 'Please choose a subject.'),
    message: z.string().trim().min(20, 'Please share a few more details so we can help.'),
  })
  .superRefine((values, ctx) => {
    const phoneDigits = String(values.phone || '').replace(/[^\d]/g, '');

    if (values.phone && phoneDigits.length > 0 && phoneDigits.length < 7) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phone'],
        message: 'Enter a valid phone number, or leave this blank.',
      });
    }
  });

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
    branchName: 'West Hollywood',
    branch: 'West Hollywood',
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
    return 'We could not send your message right now. Please try again or contact us directly by phone or email.';
  }

  if (status >= 500 || code === 'CRM_SERVICE_UNAVAILABLE' || code === 'CRM_AUTH_SERVICE_UNAVAILABLE') {
    return 'Our message service is temporarily unavailable. Please try again shortly or contact us directly.';
  }

  if (status === 404 || status === 405) {
    return 'Our message service is temporarily unavailable. Please call or email us directly while we restore it.';
  }

  return String(error?.message || 'We could not send your message right now. Please try again.');
};

const contactDetails = [
  {
    label: 'Address',
    value: BRAND_ADDRESS,
    description: 'West Hollywood, California',
    href: BRAND_MAP_LINK,
    icon: MapPin,
    external: true,
  },
  {
    label: 'Phone Number',
    value: BRAND_PHONE,
    description: 'Front desk assistance',
    href: `tel:${BRAND_PHONE.replace(/[^\d+]/g, '')}`,
    icon: Phone,
  },
  {
    label: 'Booking Line',
    value: BRAND_BOOKING_PHONE,
    description: 'Appointments and reservations',
    href: `tel:${BRAND_BOOKING_PHONE.replace(/[^\d+]/g, '')}`,
    icon: CalendarDays,
  },
  {
    label: 'General Email',
    value: BRAND_CONTACT_EMAIL,
    description: 'Questions and general assistance',
    href: `mailto:${BRAND_CONTACT_EMAIL}`,
    icon: Mail,
  },
  {
    label: 'Reservation Email',
    value: BRAND_BOOKING_EMAIL,
    description: 'Booking requests and confirmations',
    href: `mailto:${BRAND_BOOKING_EMAIL}`,
    icon: Mail,
  },
];

const heroSummary = [
  {
    label: 'Front Desk',
    value: BRAND_PHONE,
    icon: Phone,
  },
  {
    label: 'Booking Line',
    value: BRAND_BOOKING_PHONE,
    icon: CalendarDays,
  },
  {
    label: 'Hours',
    value: 'Mon - Fri, 10 AM - 8 PM',
    icon: Clock3,
  },
  {
    label: 'Location',
    value: '8422 Melrose Ave',
    icon: MapPin,
  },
];

const quickActions = [
  {
    label: 'Call',
    description: BRAND_PHONE,
    icon: Phone,
    href: `tel:${BRAND_PHONE.replace(/[^\d+]/g, '')}`,
  },
  {
    label: 'Email',
    description: BRAND_CONTACT_EMAIL,
    icon: Mail,
    href: `mailto:${BRAND_CONTACT_EMAIL}`,
  },
  {
    label: 'Directions',
    description: 'Open Google Maps',
    icon: MapPin,
    href: BRAND_MAP_LINK,
    external: true,
  },
  {
    label: 'Book Appointment',
    description: 'Reserve your visit',
    icon: CalendarDays,
    to: '/booking',
  },
];

const Contact = () => {
  const [successRecord, setSuccessRecord] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: INITIAL_FORM,
    mode: 'onTouched',
    reValidateMode: 'onChange',
  });

  const [fullNameValue, emailValue, phoneValue, subjectValue, messageValue] = useWatch({
    control,
    name: ['fullName', 'email', 'phone', 'subject', 'message'],
  });
  const submittedAtLabel = successRecord?.submittedAt
    ? new Date(successRecord.submittedAt).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

  const resetForm = () => {
    reset(INITIAL_FORM);
    setSuccessRecord(null);
    setSubmitError('');
  };

  const onValidSubmit = async (values) => {
    setSubmitError('');

    try {
      const submission = crmCreate('leads', createLeadPayload(values));
      toast.promise(submission, {
        loading: 'Sending your message...',
        success: 'Your message has been sent. Our front desk team will be in touch soon.',
        error: (error) => getFriendlySubmitError(error),
      });

      const savedLead = await submission;
      const leadId = savedLead?.id || savedLead?.leadId || savedLead?._id || '';

      setSuccessRecord({
        reference: leadId || 'Message received',
        subject: values.subject,
        submittedAt: new Date().toISOString(),
      });
      reset(INITIAL_FORM);
    } catch (error) {
      const message = getFriendlySubmitError(error);
      setSubmitError(message);
    }
  };

  const onInvalidSubmit = () => {
    const message = 'Please review the highlighted fields and try again.';
    setSubmitError(message);
    toast.error(message);
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
            <p className="contact-kicker">Contact</p>
            <h1>Get in Touch</h1>
            <p className="contact-hero-intro">
              Have a question or ready to book your visit? Our front desk team is here to help.
            </p>

            <div className="contact-hero-actions">
              <a href={`tel:${BRAND_PHONE.replace(/[^\d+]/g, '')}`} className="contact-primary-link">
                Call Now
                <Phone size={16} />
              </a>
              <a href={BRAND_MAP_LINK} target="_blank" rel="noreferrer" className="contact-secondary-link">
                Get Directions
                <ExternalLink size={16} />
              </a>
            </div>

            <p className="contact-hero-note">
              Prefer to write to us? Send a message below and we will get back to you as soon as
              possible.
            </p>
          </div>

          <div className="contact-hero-panel">
            <p className="contact-section-kicker">Front Desk</p>
            <h2>Simple ways to reach us.</h2>
            <p>
              Call, email, or visit us in West Hollywood. We are happy to help with bookings,
              questions, and directions.
            </p>

            <div className="contact-hero-summary">
              {heroSummary.map((item) => {
                const Icon = item.icon;

                return (
                  <article key={item.label} className="contact-hero-summary-item">
                    <Icon size={16} />
                    <div>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="contact-main">
        <div className="container contact-layout">
          <aside className="contact-info-rail">
            <article className="contact-card contact-card-primary">
              <p className="contact-section-kicker">Contact Information</p>
              <h2>Visit, call, or email.</h2>
              <p className="contact-copy">
                Choose the option that feels easiest for you. We are here to help with visits,
                reservations, and general questions.
              </p>

              <div className="contact-info-grid">
                {contactDetails.map((item) => {
                  const Icon = item.icon;

                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      className="contact-info-card"
                      target={item.external ? '_blank' : undefined}
                      rel={item.external ? 'noreferrer' : undefined}
                    >
                      <div className="contact-info-card-icon">
                        <Icon size={18} />
                      </div>
                      <div className="contact-info-card-copy">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                        <p>{item.description}</p>
                      </div>
                      {item.external ? <ExternalLink size={14} /> : <ArrowRight size={14} />}
                    </a>
                  );
                })}
              </div>
            </article>

            <article className="contact-card contact-hours-card">
              <p className="contact-section-kicker">Opening Hours</p>
              <h3>When we&rsquo;re available</h3>

              <div className="contact-hours-list">
                {OPENING_HOURS.map((item) => (
                  <div key={item.day} className="contact-hours-row">
                    <span>{item.day}</span>
                    <strong>{item.hours}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="contact-card contact-connect-card">
              <p className="contact-section-kicker">Quick Actions</p>
              <h3>Reach us in one tap.</h3>

              <div className="contact-channel-grid">
                {quickActions.map((action) => {
                  const Icon = action.icon;

                  if (action.to) {
                    return (
                      <Link key={action.label} to={action.to} className="contact-channel-tile">
                        <Icon size={18} />
                        <div>
                          <strong>{action.label}</strong>
                          <span>{action.description}</span>
                        </div>
                      </Link>
                    );
                  }

                  return (
                    <a
                      key={action.label}
                      href={action.href}
                      className="contact-channel-tile"
                      target={action.external ? '_blank' : undefined}
                      rel={action.external ? 'noreferrer' : undefined}
                    >
                      <Icon size={18} />
                      <div>
                        <strong>{action.label}</strong>
                        <span>{action.description}</span>
                      </div>
                    </a>
                  );
                })}
              </div>
            </article>
          </aside>

          <div className="contact-content-column">
            <article className="contact-form-card">
              {successRecord ? (
                <div className="contact-success-state" aria-live="polite">
                  <div className="contact-success-badge">
                    <CheckCircle2 size={24} />
                  </div>
                  <p className="contact-section-kicker">Message received</p>
                  <h2>Thank you for reaching out.</h2>
                  <p className="contact-copy">
                    We have received your message and will get back to you as soon as possible.
                  </p>

                  <div className="contact-success-grid">
                    <article>
                      <span>Reference</span>
                      <strong>{successRecord.reference}</strong>
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
                      <span>Next Step</span>
                      <strong>Our front desk team will reply soon.</strong>
                    </article>
                  </div>

                  <div className="contact-success-actions">
                    <button type="button" className="contact-secondary-button" onClick={resetForm}>
                      Send another message
                    </button>
                    <Link to="/booking" className="contact-primary-link">
                      Book Appointment
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              ) : (
                <form className="contact-form" onSubmit={handleSubmit(onValidSubmit, onInvalidSubmit)} noValidate>
                  <div className="contact-form-header">
                    <div>
                      <p className="contact-section-kicker">Inquiry Form</p>
                      <h2>Send a Message</h2>
                    </div>
                    <span className="contact-form-eta">
                      <Clock3 size={14} />
                      We usually reply within one business day
                    </span>
                  </div>

                  <p className="contact-form-intro">
                    Have a question about appointments, services, or a special occasion? Send us a
                    note and our team will be glad to help.
                  </p>

                  <div className="contact-form-trust">
                    <ShieldCheck size={16} />
                    <span>Your message is private. We&rsquo;ll get back to you as soon as possible.</span>
                  </div>

                  {submitError ? (
                    <div className="contact-alert contact-alert-error" role="alert" aria-live="assertive">
                      <TriangleAlert size={16} />
                      <span>{submitError}</span>
                    </div>
                  ) : null}

                  <div className="contact-form-grid">
                    <label className={`contact-field ${fullNameValue ? 'is-filled' : ''} ${errors.fullName ? 'has-error' : ''}`}>
                      <input
                        id="contact-full-name"
                        type="text"
                        placeholder=" "
                        autoComplete="name"
                        {...register('fullName')}
                      />
                      <span>Full Name</span>
                      {errors.fullName ? <small>{errors.fullName.message}</small> : null}
                    </label>

                    <label className={`contact-field ${emailValue ? 'is-filled' : ''} ${errors.email ? 'has-error' : ''}`}>
                      <input
                        id="contact-email"
                        type="email"
                        placeholder=" "
                        autoComplete="email"
                        {...register('email')}
                      />
                      <span>Email Address</span>
                      {errors.email ? <small>{errors.email.message}</small> : null}
                    </label>

                    <label className={`contact-field ${phoneValue ? 'is-filled' : ''} ${errors.phone ? 'has-error' : ''}`}>
                      <input
                        id="contact-phone"
                        type="tel"
                        placeholder=" "
                        autoComplete="tel"
                        {...register('phone')}
                      />
                      <span>Phone Number</span>
                      {errors.phone ? <small>{errors.phone.message}</small> : null}
                    </label>

                    <label className={`contact-field contact-field-select ${subjectValue ? 'is-filled' : ''} ${errors.subject ? 'has-error' : ''}`}>
                      <select id="contact-subject" {...register('subject')}>
                        <option value="" disabled>
                          Select a subject
                        </option>
                        {SUBJECT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <span>Subject</span>
                      {errors.subject ? <small>{errors.subject.message}</small> : null}
                    </label>

                    <label className={`contact-field contact-field-textarea contact-field-full ${messageValue ? 'is-filled' : ''} ${errors.message ? 'has-error' : ''}`}>
                      <textarea
                        id="contact-message"
                        placeholder=" "
                        rows="6"
                        {...register('message')}
                      />
                      <span>Message</span>
                      {errors.message ? <small>{errors.message.message}</small> : null}
                    </label>
                  </div>

                  <div className="contact-form-footer">
                    <p className="contact-form-note">
                      <ShieldCheck size={16} />
                      <span>Your message is private. We&rsquo;ll get back to you as soon as possible.</span>
                    </p>

                    <button type="submit" className="contact-submit-button" disabled={isSubmitting}>
                      <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
                      <Send size={16} />
                    </button>
                  </div>
                </form>
              )}
            </article>

            <article className="contact-card contact-map-card">
              <div className="contact-map-header">
                <div>
                  <p className="contact-section-kicker">Location</p>
                  <h3>Find us in West Hollywood.</h3>
                </div>
                <a href={BRAND_MAP_LINK} target="_blank" rel="noreferrer" className="contact-map-link">
                  Open in Google Maps
                </a>
              </div>

              <p className="contact-copy contact-map-copy">
                {SALON_NAME}
                <br />
                {BRAND_ADDRESS}
              </p>

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
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
