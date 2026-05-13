import {
  ArrowRight,
  CalendarDays,
  Heart,
  Leaf,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BRAND_ADDRESS, BRAND_BOOKING_PHONE, BRAND_WHATSAPP_BOOKING_LINK, SALON_NAME } from '../config/brand';
import { resolveHazelImage } from '../config/serviceMedia';
import './About.css';

const aboutHeroBackdropImage = resolveHazelImage('facial-skin-care', 'about-hero-backdrop');
const aboutHeroPanelImage = resolveHazelImage('bridal-packages', 'about-hero-panel');
const BOOKING_ROUTE = '/booking';
const CONTACT_ROUTE = '/contact';

const experiencePoints = [
  {
    title: 'Ladies-friendly atmosphere',
    description:
      'Comfortable surroundings and respectful service standards help every guest feel at ease from the moment she arrives.',
  },
  {
    title: 'Event-focused guidance',
    description:
      'Our front desk helps with bridal timelines, event schedules, and service planning so your booking stays smooth.',
  },
  {
    title: 'Detail-led beauty care',
    description:
      'Every treatment is delivered with hygiene, precision, and finish quality suitable for Pakistani events and daily grooming.',
  },
];

const featureCards = [
  {
    icon: Sparkles,
    title: 'Bridal & Party Expertise',
    description: 'Specialized looks for Nikkah, Mehndi, Barat, Walima, engagement, and festive events.',
  },
  {
    icon: Leaf,
    title: 'Skin-Friendly Products',
    description: 'Product selections focused on comfort, tone matching, and long-wear makeup results.',
  },
  {
    icon: ShieldCheck,
    title: 'Clean & Hygienic Setup',
    description: 'Professional hygiene and organized tools for safe, trustworthy beauty care.',
  },
  {
    icon: Users,
    title: 'Ladies-Friendly Team',
    description: 'Warm, respectful, and helpful staff for both first-time and regular clients.',
  },
  {
    icon: Heart,
    title: 'Personalized Looks',
    description: 'Every service is adjusted to your skin tone, event type, and preferred style.',
  },
  {
    icon: CalendarDays,
    title: 'Easy WhatsApp Booking',
    description: 'Quick booking through call or WhatsApp with clear appointment support.',
  },
];

const values = [
  {
    title: 'Comfort',
    description: 'A ladies-friendly salon environment where you feel relaxed and respected.',
  },
  {
    title: 'Confidence',
    description: 'Looks that stay polished through your event so you feel beautiful and confident.',
  },
  {
    title: 'Care',
    description: 'Every interaction is guided by hygiene, professionalism, and personal attention.',
  },
];

const highlights = [
  {
    icon: MapPin,
    label: 'Location',
    value: 'Lahore, Pakistan',
  },
  {
    icon: CalendarDays,
    label: 'Reservations',
    value: 'Call / WhatsApp',
  },
  {
    icon: Star,
    label: 'Experience',
    value: 'Bridal to everyday care',
  },
];

const About = () => (
  <div className="about-page">
    <section className="about-hero">
      <div className="about-hero-backdrop" aria-hidden="true">
        <img
          src={aboutHeroBackdropImage}
          alt=""
          className="about-hero-image"
          loading="eager"
        />
      </div>
      <div className="about-hero-overlay" aria-hidden="true" />

      <div className="container about-hero-grid">
        <div className="about-hero-copy">
          <p className="about-kicker">About Us</p>
          <h1>About Hazel Beauty Saloon</h1>
          <p className="about-hero-intro">
            A premium ladies salon in Pakistan for bridal beauty, party glam, and everyday grooming.
          </p>

          <div className="about-hero-actions">
            <Link to={BOOKING_ROUTE} className="about-primary-link">
              Book Appointment
              <CalendarDays size={16} />
            </Link>
            <Link to={CONTACT_ROUTE} className="about-secondary-link">
              Contact Us
              <ArrowRight size={16} />
            </Link>
          </div>

          <p className="about-hero-note">
            Whether you are preparing for Nikkah, Mehndi, Barat, Walima, Eid, or regular self-care,
            our team is here to make the experience smooth and reliable.
          </p>
        </div>

        <aside className="about-hero-panel">
          <div className="about-hero-panel-media">
            <img
              src={aboutHeroPanelImage}
              alt="Bridal beauty service photograph from Hazel Beauty Saloon"
              className="about-hero-panel-image"
              loading="eager"
            />
            <article className="about-hero-card">
              <span>Hazel Beauty Saloon</span>
              <strong>Trusted beauty care in Lahore.</strong>
              <p>
                Bridal-ready looks, skin-focused care, and ladies-friendly service standards.
              </p>
            </article>
          </div>

          <div className="about-hero-highlights">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.label} className="about-hero-highlight">
                  <Icon size={18} />
                  <div>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                </article>
              );
            })}
          </div>
        </aside>
      </div>
    </section>

    <section className="about-story section-padding">
      <div className="container about-story-grid">
        <div className="about-section-header">
          <p className="about-section-kicker">Our Story</p>
          <h2>Beauty care that understands local occasions.</h2>
          <p className="about-section-lead">
            At Hazel Beauty Saloon, we believe every woman deserves a look that suits her event,
            personality, and skin tone. We support bridal and party services as well as regular
            beauty maintenance.
          </p>
        </div>

        <article className="about-story-card">
          <p>
            We focus on professional beauticians, clean surroundings, and dependable appointment
            support so every visit feels comfortable from booking to final touch-up.
          </p>
          <div className="about-story-meta">
            <span>{SALON_NAME}</span>
            <strong>{BRAND_ADDRESS}</strong>
          </div>
        </article>
      </div>
    </section>

    <section className="about-experience">
      <div className="container about-experience-grid">
        <div className="about-section-header">
          <p className="about-section-kicker">Guest Experience</p>
          <h2>A salon experience made for Pakistani women.</h2>
          <p className="about-section-lead">
            From first inquiry to final mirror check, every step is designed to feel clear,
            friendly, and event-ready.
          </p>
          <p className="about-section-copy">
            We keep service flow organized so you can focus on your function, not last-minute salon stress.
          </p>
        </div>

        <div className="about-experience-list">
          {experiencePoints.map((item) => (
            <article key={item.title} className="about-experience-card">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="about-features section-padding">
      <div className="container">
        <div className="about-section-header about-section-header-centered">
          <p className="about-section-kicker">Why Choose Us</p>
          <h2>Trusted for bridal, event, and routine beauty services.</h2>
          <p className="about-section-lead">
            Every detail is intended to deliver confidence, comfort, and reliable finishing quality.
          </p>
        </div>

        <div className="about-feature-grid">
          {featureCards.map((card) => {
            const Icon = card.icon;

            return (
              <article key={card.title} className="about-feature-card">
                <div className="about-feature-icon">
                  <Icon size={20} />
                </div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>

    <section className="about-values">
      <div className="container">
        <div className="about-section-header about-section-header-centered">
          <p className="about-section-kicker">What We Care About</p>
          <h2>Comfort, confidence, and trust.</h2>
        </div>

        <div className="about-values-grid">
          {values.map((value) => (
            <article key={value.title} className="about-value-card">
              <h3>{value.title}</h3>
              <p>{value.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="about-team section-padding">
      <div className="container about-team-card">
        <div className="about-team-copy">
          <p className="about-section-kicker">Experienced Beauty Professionals</p>
          <h2>Skilled service, delivered with warmth and professionalism.</h2>
          <p className="about-section-lead">
            Our team focuses on bridal finishing, party glam, facial glow, and everyday grooming in
            a clean, ladies-friendly setting.
          </p>
        </div>

        <div className="about-team-aside">
          <span>Booking support</span>
          <strong>{BRAND_BOOKING_PHONE}</strong>
          <a href={BRAND_WHATSAPP_BOOKING_LINK} target="_blank" rel="noreferrer">Call / WhatsApp now</a>
        </div>
      </div>
    </section>

    <section className="about-cta">
      <div className="container about-cta-card">
        <div className="about-cta-copy">
          <p className="about-section-kicker about-section-kicker-light">Ready to visit Hazel Beauty Saloon?</p>
          <h2>Book your appointment today for bridal, party, or everyday beauty care.</h2>
          <p>
            Share your event details and let our team guide you to the right service package.
          </p>
        </div>

        <div className="about-cta-actions">
          <Link to={BOOKING_ROUTE} className="about-primary-link">
            Book Appointment
            <CalendarDays size={16} />
          </Link>
          <Link to={CONTACT_ROUTE} className="about-secondary-link about-secondary-link-light">
            Contact Us
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  </div>
);

export default About;
