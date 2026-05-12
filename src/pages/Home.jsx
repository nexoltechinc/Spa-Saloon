import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Leaf,
  MapPin,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Waves,
} from 'lucide-react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  BRAND_ADDRESS,
  BRAND_BOOKING_EMAIL,
  BRAND_BOOKING_PHONE,
  BRAND_CONTACT_EMAIL,
  BRAND_PHONE,
  BRAND_TAGLINE,
  SALON_NAME,
} from '../config/brand';
import './Home.css';

const heroImage = '/images/hero.png';

const heroStats = [
  {
    icon: Clock3,
    label: 'Open daily',
    value: '9am - 9pm',
  },
  {
    icon: MapPin,
    label: 'West Hollywood',
    value: '8422 Melrose Ave',
  },
  {
    icon: Sparkles,
    label: 'Booking style',
    value: 'Private suites',
  },
];

const featuredInTicker = [
  'Luxury hospitality',
  'West Hollywood concierge',
  'Editorial calm',
  'Private suite rituals',
];

const liveSocialProof = [
  {
    title: 'Live social proof',
    message: 'Someone just booked a Signature Facial in West Hollywood.',
  },
  {
    title: 'Live social proof',
    message: 'A guest just reserved a quiet body ritual for this evening.',
  },
  {
    title: 'Live social proof',
    message: 'A bridal consultation was just added to the calendar.',
  },
];

const philosophyCards = [
  {
    icon: Leaf,
    title: 'Mindful arrival',
    text:
      'We start with a warm welcome, clear guidance, and a pace that immediately lowers the volume of the day.',
  },
  {
    icon: Waves,
    title: 'Tailored rituals',
    text:
      'Treatments are adapted to skin, body, and energy so the result feels personal rather than generic.',
  },
  {
    icon: ShieldCheck,
    title: 'Thoughtful aftercare',
    text:
      'Every visit ends with practical follow-up advice, product direction, and a calm transition back out.',
  },
];

const galleryTiles = [
  {
    title: 'Arrival Lounge',
    caption: 'Warm light, textural finishes, and a first impression that slows the breath.',
    className: 'home-gallery-tile-large',
    position: 'center 24%',
  },
  {
    title: 'Ritual Detail',
    caption: 'Candles, botanicals, and the quiet precision behind every service.',
    className: 'home-gallery-tile-tall',
    position: 'center 56%',
  },
  {
    title: 'Evening Reset',
    caption: 'A serene finish designed to linger long after you leave.',
    className: 'home-gallery-tile-wide',
    position: 'center 76%',
  },
];

const serviceTiles = [
  {
    title: 'Signature Massage',
    badge: 'Body ritual',
    description:
      'Deep release with warm stones, layered pressure, and custom oils to unwind tension without rushing the body.',
    duration: '75 min',
    position: 'center 32%',
  },
  {
    title: 'Facial Renewal',
    badge: 'Skin ritual',
    description:
      'Botanical actives and lymphatic flow work together to restore luminosity and clarity.',
    duration: '60 min',
    position: 'center 52%',
  },
  {
    title: 'Aromatic Body Scrub',
    badge: 'Glow ritual',
    description:
      'A polishing exfoliation that leaves the skin smooth, hydrated, and beautifully renewed.',
    duration: '45 min',
    position: 'center 74%',
  },
];

const testimonials = [
  {
    quote:
      'The team made the appointment feel considered, calm, and beautifully paced from start to finish.',
    name: 'Helena M.',
    title: 'Returning guest',
    initials: 'HM',
  },
  {
    quote:
      'It feels like a retreat, not just a salon visit. Every detail is warm, polished, and quietly luxurious.',
    name: 'Julian T.',
    title: 'Weekend regular',
    initials: 'JT',
  },
  {
    quote:
      'I left feeling reset and looked after. The booking, the welcome, and the aftercare all felt effortless.',
    name: 'Ava K.',
    title: 'First-time guest',
    initials: 'AK',
  },
];

const bookingPhoneHref = `tel:${BRAND_BOOKING_PHONE.replace(/[^\d+]/g, '')}`;
const phoneHref = `tel:${BRAND_PHONE.replace(/[^\d+]/g, '')}`;
const bookingEmailHref = `mailto:${BRAND_BOOKING_EMAIL}`;

const Home = () => {
  const [socialProofIndex, setSocialProofIndex] = useState(0);
  const heroRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroBackdropY = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);
  const heroBackdropScale = useTransform(scrollYProgress, [0, 1], [1.04, 1.12]);
  const heroBackdropStyle = prefersReducedMotion ? undefined : { y: heroBackdropY, scale: heroBackdropScale };
  const revealProps = {
    initial: prefersReducedMotion ? false : { opacity: 0, y: 24 },
    whileInView: prefersReducedMotion ? undefined : { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.22 },
    transition: { duration: 0.65, ease: 'easeOut' },
  };

  void motion;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSocialProofIndex((current) => (current + 1) % liveSocialProof.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="home-page">
      <motion.section className="home-hero" ref={heroRef}>
        <motion.div className="home-hero-backdrop" aria-hidden="true" style={heroBackdropStyle}>
          <img
            src={heroImage}
            alt=""
            className="home-hero-image"
            loading="eager"
          />
        </motion.div>
        <div className="home-hero-overlay" aria-hidden="true" />

        <div className="container home-hero-grid">
          <motion.div className="home-hero-copy" {...revealProps}>
            <span className="home-eyebrow">Luxury salon & spa</span>
            <h1>{SALON_NAME}</h1>
            <p className="home-hero-intro">
              {BRAND_TAGLINE}. A quiet West Hollywood retreat for facials, body rituals, and
              beautifully paced care.
            </p>

            <div className="home-hero-actions">
              <Link to="/booking" className="home-primary-button">
                Reserve Now
              </Link>
              <Link to="/services" className="home-secondary-button">
                Explore Services
              </Link>
            </div>

            <p className="home-hero-note">By reservation only | West Hollywood | Thoughtfully paced appointments</p>

            <div className="home-hero-contact">
              <a href={phoneHref}>{BRAND_PHONE}</a>
              <span>{BRAND_ADDRESS}</span>
            </div>
          </motion.div>

          <motion.div className="home-hero-panel" {...revealProps} transition={{ duration: 0.7, ease: 'easeOut', delay: 0.12 }}>
            <div className="home-hero-image-shell">
              <motion.img
                src={heroImage}
                alt="Warm spa ritual bowl surrounded by candles and botanicals"
                className="home-hero-panel-image"
                loading="eager"
              />
              <span className="home-hero-ribbon">Bookings open</span>
              <article className="home-hero-card">
                <span>Private booking experience</span>
                <strong>Calm from first hello to aftercare.</strong>
                <p>
                  Tailored rituals, a soft arrival, and a booking flow that respects your time.
                </p>
              </article>
            </div>

            <div className="home-hero-stats">
              {heroStats.map((stat, index) => {
                const Icon = stat.icon;

                return (
                  <motion.article
                    key={stat.label}
                    className="home-hero-stat-card"
                    style={{ '--card-delay': `${index * 110}ms` }}
                    {...revealProps}
                    transition={{ duration: 0.5, ease: 'easeOut', delay: index * 0.06 }}
                  >
                    <Icon size={18} />
                    <span>{stat.label}</span>
                    <strong>{stat.value}</strong>
                  </motion.article>
                );
              })}
            </div>
          </motion.div>
        </div>
      </motion.section>

      <section className="home-trust-band" aria-label="Trust and social proof">
        <div className="container home-trust-grid">
          <article className="home-featured-strip">
            <span className="home-section-kicker">Featured in</span>
            <div className="home-featured-track" aria-hidden="true">
              {[...featuredInTicker, ...featuredInTicker].map((item, index) => (
                <span key={`${item}-${index}`} className="home-featured-chip">
                  {item}
                </span>
              ))}
            </div>
          </article>

          <article className="home-social-proof">
            <span className="home-section-kicker">Live social proof</span>
            <strong>{liveSocialProof[socialProofIndex].title}</strong>
            <p>{liveSocialProof[socialProofIndex].message}</p>
          </article>
        </div>
      </section>

      <section className="home-story" id="story">
        <div className="container home-story-grid">
          <div className="home-story-copy">
            <div className="home-section-header">
              <span className="home-section-kicker">Philosophy of calm</span>
              <h2 className="home-section-title">Beauty, paced like a breath.</h2>
              <p className="home-section-lead">
                Hazel Beauty Saloon is built around slower starts, softer finishes, and treatments
                that feel intentionally edited rather than overdone.
              </p>
              <p className="home-section-text">
                The team listens first, recommends second, and shapes each appointment around how
                you want to feel when you leave.
              </p>
            </div>

            <div className="home-philosophy-grid">
              {philosophyCards.map((card, index) => {
                const Icon = card.icon;

                return (
                  <motion.article
                    key={card.title}
                    className="home-philosophy-card"
                    style={{ '--card-delay': `${index * 120}ms` }}
                    {...revealProps}
                    transition={{ duration: 0.55, ease: 'easeOut', delay: index * 0.08 }}
                  >
                    <Icon size={20} />
                    <h3>{card.title}</h3>
                    <p>{card.text}</p>
                  </motion.article>
                );
              })}
            </div>

            <Link to="/contact" className="home-inline-link">
              Meet the team
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="home-story-aside">
            <article className="home-story-quote-card">
              <Quote className="home-story-quote-icon" size={68} aria-hidden="true" />
              <p>"Silence is the language of the soul."</p>
              <span>Crafted to feel restorative, never rushed.</span>
            </article>

            <article className="home-story-team-card">
              <span className="home-story-team-kicker">Our story</span>
              <strong>
                Warm hosts, detail-obsessed therapists, and a front desk that treats every visit
                like a welcome back.
              </strong>
              <p>
                From consultation to aftercare, the experience is designed to feel personal,
                calm, and clear.
              </p>
            </article>

            <div className="home-story-meta-row">
              <span>
                <CalendarDays size={14} />
                Tailored consults
              </span>
              <span>
                <Clock3 size={14} />
                Unhurried sessions
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="home-gallery">
        <div className="container">
          <div className="home-section-header home-section-header-centered">
            <span className="home-section-kicker">Inside the salon</span>
            <h2 className="home-section-title">A small portfolio of the atmosphere.</h2>
            <p className="home-section-lead">
              Warm surfaces, candlelight, and ritual details come together to make the space feel
              calm before the service even begins.
            </p>
          </div>

          <div className="home-gallery-grid">
            {galleryTiles.map((tile, index) => (
              <motion.article
                key={tile.title}
                className={`home-gallery-tile ${tile.className}`}
                style={{ '--card-delay': `${index * 120}ms` }}
                {...revealProps}
                transition={{ duration: 0.55, ease: 'easeOut', delay: index * 0.08 }}
              >
                <img
                  src={heroImage}
                  alt={tile.title}
                  className="home-gallery-image"
                  loading="lazy"
                  style={{ objectPosition: tile.position }}
                />
                <div className="home-gallery-overlay" aria-hidden="true" />
                <div className="home-gallery-copy">
                  <span>{tile.title}</span>
                  <p>{tile.caption}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-services" id="services">
        <div className="container">
          <div className="home-section-header home-section-header-centered">
            <span className="home-section-kicker">Curated rituals</span>
            <h2 className="home-section-title">Signature experiences.</h2>
            <p className="home-section-lead">
              Elevated service cards pair tactile imagery with faster scanning, clearer hierarchy,
              and a gentler path to booking.
            </p>
          </div>

          <div className="home-services-grid">
            {serviceTiles.map((service, index) => (
              <motion.article
                key={service.title}
                className="home-service-card"
                style={{ '--card-delay': `${index * 120}ms` }}
                {...revealProps}
                transition={{ duration: 0.55, ease: 'easeOut', delay: index * 0.08 }}
              >
                <div className="home-service-media">
                  <img
                    src={heroImage}
                    alt={service.title}
                    className="home-service-image"
                    loading="lazy"
                    style={{ objectPosition: service.position }}
                  />
                  <div className="home-service-media-overlay" aria-hidden="true" />
                  <span className="home-service-badge">{service.badge}</span>
                  <span className="home-service-duration">{service.duration}</span>
                </div>
                <div className="home-service-content">
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                  <Link to="/services" className="home-inline-link">
                    Learn More
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-testimonials">
        <div className="container">
          <div className="home-section-header home-section-header-centered">
            <span className="home-section-kicker home-section-kicker-muted">Guest perspectives</span>
            <h2 className="home-section-title home-section-title-italic">Echoes of peace.</h2>
            <p className="home-section-lead">
              Guest quotes are styled as a horizontal, scrollable narrative so the section feels
              more premium and less rigid on smaller screens.
            </p>
          </div>

          <div className="home-testimonials-track" aria-label="Guest testimonials">
            {testimonials.map((testimonial, index) => (
              <motion.article
                key={testimonial.name}
                className="home-testimonial-card"
                style={{ '--card-delay': `${index * 120}ms` }}
                {...revealProps}
                transition={{ duration: 0.55, ease: 'easeOut', delay: index * 0.08 }}
              >
                <div className="home-testimonial-head">
                  <Quote className="home-testimonial-quote-icon" size={64} aria-hidden="true" />
                  <div className="home-stars" aria-hidden="true">
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <Star key={starIndex} size={16} fill="currentColor" />
                    ))}
                  </div>
                </div>

                <p className="home-testimonial-copy">"{testimonial.quote}"</p>

                <div className="home-testimonial-author">
                  <div className="home-testimonial-monogram" aria-hidden="true">
                    {testimonial.initials}
                  </div>
                  <div>
                    <h4>{testimonial.name}</h4>
                    <p>{testimonial.title}</p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-cta">
        <div className="home-cta-media">
          <img
            src={heroImage}
            alt=""
            className="home-cta-image"
            loading="lazy"
          />
        </div>
        <div className="container home-cta-content">
          <div className="home-cta-copy">
            <span className="home-section-kicker home-section-kicker-light">Ready for your retreat?</span>
            <h2 className="home-cta-title">Reserve a calmer hour for yourself.</h2>
            <p className="home-cta-text">
              Tell us what you need, and we’ll help you choose the right ritual or service before
              you arrive.
            </p>

            <div className="home-cta-actions">
              <Link to="/booking" className="home-primary-button home-primary-button-large">
                Book Your Appointment
              </Link>
              <a href={bookingPhoneHref} className="home-secondary-button home-secondary-button-light">
                Call Front Desk
              </a>
            </div>
          </div>

          <aside className="home-cta-card">
            <span className="home-cta-card-kicker">What to expect</span>
            <ul>
              <li>
                <Sparkles size={15} />
                Guided consultation
              </li>
              <li>
                <Leaf size={15} />
                Tailored care and product guidance
              </li>
              <li>
                <ShieldCheck size={15} />
                Quiet, private, and unhurried
              </li>
            </ul>

            <div className="home-cta-card-foot">
              <span>Bookings</span>
              <a href={bookingEmailHref}>{BRAND_BOOKING_EMAIL}</a>
              <small>{BRAND_CONTACT_EMAIL}</small>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
};

export default Home;
