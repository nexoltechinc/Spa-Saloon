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
import { BRAND_ADDRESS, BRAND_BOOKING_PHONE, SALON_NAME } from '../config/brand';
import { resolveHazelImage } from '../config/serviceMedia';
import './About.css';

const aboutHeroBackdropImage = resolveHazelImage('facial-skin-care', 'about-hero-backdrop');
const aboutHeroPanelImage = resolveHazelImage('bridal-packages', 'about-hero-panel');
const BOOKING_ROUTE = '/booking';
const CONTACT_ROUTE = '/contact';

const experiencePoints = [
  {
    title: 'A calm atmosphere',
    description:
      'Soft lighting, comfortable surroundings, and an unhurried pace help each appointment feel restorative from the moment you arrive.',
  },
  {
    title: 'Thoughtful support',
    description:
      'Our front desk and service team make booking, arrival, and aftercare feel clear, warm, and easy to follow.',
  },
  {
    title: 'Detail-led beauty care',
    description:
      'Every treatment is delivered with care, cleanliness, and attention to the details that make the experience feel polished.',
  },
];

const featureCards = [
  {
    icon: Sparkles,
    title: 'Professional Beauty Care',
    description: 'Thoughtful treatments delivered with precision, comfort, and a polished finish.',
  },
  {
    icon: Leaf,
    title: 'Relaxing Environment',
    description: 'A warm, peaceful setting designed to help guests settle in and feel at ease.',
  },
  {
    icon: ShieldCheck,
    title: 'Hygienic Tools & Clean Setup',
    description: 'Cleanliness, organization, and professional care standards guide every appointment.',
  },
  {
    icon: Users,
    title: 'Friendly Staff',
    description: 'Helpful guidance and a welcoming tone make every visit feel personal and comfortable.',
  },
  {
    icon: Heart,
    title: 'Personalized Service',
    description: 'Recommendations and treatments are shaped around what feels right for each guest.',
  },
  {
    icon: CalendarDays,
    title: 'Easy Booking Experience',
    description: 'Simple reservation paths make it easy to plan your visit with confidence.',
  },
];

const values = [
  {
    title: 'Comfort',
    description: 'We create a setting that feels calm, welcoming, and easy to settle into.',
  },
  {
    title: 'Confidence',
    description: 'Our goal is for every guest to leave feeling refreshed, cared for, and assured.',
  },
  {
    title: 'Care',
    description: 'Every interaction is guided by warmth, cleanliness, and careful attention to detail.',
  },
];

const highlights = [
  {
    icon: MapPin,
    label: 'Location',
    value: 'West Hollywood',
  },
  {
    icon: CalendarDays,
    label: 'Reservations',
    value: 'By booking',
  },
  {
    icon: Star,
    label: 'Experience',
    value: 'Calm and polished',
  },
];

const bookingPhoneHref = `tel:${BRAND_BOOKING_PHONE.replace(/[^\d+]/g, '')}`;

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
            A calm beauty and wellness space designed for comfort, care, and confidence.
          </p>

          <div className="about-hero-actions">
            <Link to={BOOKING_ROUTE} className="about-primary-link">
              Reserve Now
              <CalendarDays size={16} />
            </Link>
            <Link to={CONTACT_ROUTE} className="about-secondary-link">
              Contact Us
              <ArrowRight size={16} />
            </Link>
          </div>

          <p className="about-hero-note">
            Whether you are planning a beauty treatment or a quiet reset, our team is here to make
            the visit feel smooth and welcoming.
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
              <strong>Calm beauty care in West Hollywood.</strong>
              <p>
                Comfortable surroundings, careful service, and a warm welcome for every guest.
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
          <h2>Beauty care that feels personal.</h2>
          <p className="about-section-lead">
            At Hazel Beauty Saloon, we believe beauty care should feel personal, relaxing, and
            effortless. Our salon is designed to give every visitor a calm and comfortable
            experience, whether they are visiting for a quick refresh, a beauty treatment, or a
            complete self-care session.
          </p>
        </div>

        <article className="about-story-card">
          <p>
            We focus on thoughtful service, clean surroundings, and a pace that gives every guest
            room to settle in. The goal is simple: help you feel looked after from booking to
            finish.
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
          <h2>A Salon Experience Made for You</h2>
          <p className="about-section-lead">
            From the first message to the final mirror check, every part of the experience is
            shaped to feel easy, attentive, and reassuring.
          </p>
          <p className="about-section-copy">
            We keep the environment calm, the setup clean and comfortable, and the service journey
            clear so guests can focus on enjoying the appointment.
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
          <h2>Carefully designed for comfort and ease.</h2>
          <p className="about-section-lead">
            Every detail is intended to make appointments feel more comfortable, more polished, and
            easier to enjoy.
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
          <h2>Comfort, confidence, and care.</h2>
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
          <h2>Thoughtful service, delivered with warmth.</h2>
          <p className="about-section-lead">
            Our team focuses on delivering thoughtful beauty care with attention, cleanliness, and a
            warm customer experience.
          </p>
        </div>

        <div className="about-team-aside">
          <span>Booking support</span>
          <strong>{BRAND_BOOKING_PHONE}</strong>
          <a href={bookingPhoneHref}>Call the front desk</a>
        </div>
      </div>
    </section>

    <section className="about-cta">
      <div className="container about-cta-card">
        <div className="about-cta-copy">
          <p className="about-section-kicker about-section-kicker-light">Ready to Visit Hazel Beauty Saloon?</p>
          <h2>Book your appointment today and enjoy a calm, professional beauty experience.</h2>
          <p>
            Reserve your visit when you are ready, or contact us if you would like help choosing the
            right appointment.
          </p>
        </div>

        <div className="about-cta-actions">
          <Link to={BOOKING_ROUTE} className="about-primary-link">
            Reserve Now
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
