import { lazy, Suspense, useEffect, useRef, useState } from 'react';
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
import { useInView } from 'react-intersection-observer';
import {
  BRAND_ADDRESS,
  BRAND_BOOKING_EMAIL,
  BRAND_CONTACT_EMAIL,
  BRAND_PHONE,
  BRAND_TAGLINE,
  BRAND_WHATSAPP_BOOKING_LINK,
  SALON_NAME,
} from '../config/brand';
import { resolveHazelImage } from '../config/serviceMedia';
import './Home.css';

const TestimonialsCarousel = lazy(() => import('../components/TestimonialsCarousel'));

const homeHeroBackdropImage = resolveHazelImage('facial-skin-care', 'home-hero-backdrop');
const homeHeroPanelImage = resolveHazelImage('bridal-packages', 'home-hero-panel');
const homeCtaImage = resolveHazelImage('nails', 'home-cta');

const heroStats = [
  {
    icon: Clock3,
    label: 'Open daily',
    value: '10am - 9pm',
  },
  {
    icon: MapPin,
    label: 'Lahore',
    value: 'Gulberg III',
  },
  {
    icon: Sparkles,
    label: 'Booking style',
    value: 'Ladies-friendly salon',
  },
];

const heroTrustBadges = ['Bridal Specialists', 'Skin-Friendly Products', 'Ladies-Only Comfort', 'Expert Staff'];

const featuredInTicker = [
  'Nikkah and Mehndi Looks',
  'Barat and Walima Makeup',
  'Eid and Party Glam',
  'Facials, Nails, and Hair Styling',
];

const liveSocialProof = [
  {
    title: 'Just booked',
    message: 'A bride reserved a full Nikkah + Barat makeup package.',
  },
  {
    title: 'Just booked',
    message: 'A guest booked facial glow + hair styling for an Eid dinner event.',
  },
  {
    title: 'Just booked',
    message: 'A family group added Mehndi and party makeup slots for this weekend.',
  },
];

const philosophyCards = [
  {
    icon: Leaf,
    title: 'Event-ready planning',
    text:
      'From first call to final look, we help you plan bridal, party, and Eid services with clear timing and guidance.',
  },
  {
    icon: Waves,
    title: 'Looks for every occasion',
    text:
      'Whether it is Nikkah, Mehndi, Barat, Walima, engagement, or a family event, every look is tailored to your style.',
  },
  {
    icon: ShieldCheck,
    title: 'Trusted ladies-only care',
    text:
      'Our ladies-friendly environment, hygiene standards, and professional beauticians keep every appointment comfortable.',
  },
];

const galleryTiles = [
  {
    title: 'Bridal Finish',
    category: 'Bridal',
    caption: 'Complete bridal finishing designed to stay flawless through your event and photos.',
    className: 'home-gallery-tile-large',
    image: resolveHazelImage('bridal-packages', 'home-gallery-bridal'),
    alt: 'Bridal beauty photograph from Hazel Beauty Saloon',
    position: 'center 36%',
  },
  {
    title: 'Facial Ritual',
    category: 'Skincare',
    caption: 'Skin-focused treatments to help you get a fresh, even, and camera-ready glow.',
    className: 'home-gallery-tile-tall',
    image: resolveHazelImage('facial-skin-care', 'home-gallery-facial'),
    alt: 'Facial ritual photograph from Hazel Beauty Saloon',
    position: 'center 52%',
  },
  {
    title: 'Nail Detail',
    category: 'Nail care',
    caption: 'Clean shaping and polished finishing for weddings, parties, and everyday confidence.',
    className: 'home-gallery-tile-wide',
    image: resolveHazelImage('nail-services', 'home-gallery-nails'),
    alt: 'Nail detail photograph from Hazel Beauty Saloon',
    position: 'center 70%',
  },
];

const serviceTiles = [
  {
    title: 'Bridal Makeup Artistry',
    badge: 'Bridal',
    description:
      'Long-lasting bridal makeup with tone-matched base, detailed eyes, and a flawless finish for major events.',
    duration: '90 min',
    image: resolveHazelImage('bridal-packages', 'home-service-bridal'),
    alt: 'Bridal makeup service photograph from Hazel Beauty Saloon',
    position: 'center 36%',
  },
  {
    title: 'Facial Glow Ritual',
    badge: 'Skin ritual',
    description:
      'Deep cleanse, mask therapy, and glow-focused care for brighter skin before weddings and occasions.',
    duration: '60 min',
    image: resolveHazelImage('facial-skin-care', 'home-service-facial'),
    alt: 'Facial glow service photograph from Hazel Beauty Saloon',
    position: 'center 52%',
  },
  {
    title: 'Luxury Nails & Finish',
    badge: 'Nail care',
    description:
      'Manicure and polish care with refined detailing for formal events, Eid looks, and routine grooming.',
    duration: '75 min',
    image: resolveHazelImage('nail-services', 'home-service-nails'),
    alt: 'Luxury nail service photograph from Hazel Beauty Saloon',
    position: 'center 44%',
  },
];

const testimonials = [
  {
    quote:
      'My Barat makeup stayed perfect all night and looked beautiful in every photo.',
    name: 'Areeba S.',
    title: 'Bride, Lahore',
    initials: 'AS',
  },
  {
    quote:
      'I booked hair and makeup for Mehndi, and the team understood exactly the look I wanted.',
    name: 'Hina K.',
    title: 'Event guest',
    initials: 'HK',
  },
  {
    quote:
      'Clean setup, professional staff, and very smooth booking on WhatsApp. Highly recommended.',
    name: 'Sana R.',
    title: 'Regular client',
    initials: 'SR',
  },
];

const phoneHref = `tel:${BRAND_PHONE.replace(/[^\d+]/g, '')}`;
const bookingEmailHref = `mailto:${BRAND_BOOKING_EMAIL}`;

const Home = () => {
  const [socialProofIndex, setSocialProofIndex] = useState(0);
  const [showMobileBookingCta, setShowMobileBookingCta] = useState(false);
  const [hideMobileBookingCta, setHideMobileBookingCta] = useState(false);
  const heroRef = useRef(null);
  const ctaSectionRef = useRef(null);
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
  const { ref: testimonialsRef, inView: testimonialsInView } = useInView({
    triggerOnce: true,
    rootMargin: '180px 0px',
    threshold: 0.2,
  });

  void motion;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSocialProofIndex((current) => (current + 1) % liveSocialProof.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mobileBreakpoint = window.matchMedia('(max-width: 760px)');
    const updateMobileCtaVisibility = () => {
      setShowMobileBookingCta(mobileBreakpoint.matches && window.scrollY > 300);
    };

    const handleMobileQueryChange = () => updateMobileCtaVisibility();

    updateMobileCtaVisibility();
    window.addEventListener('scroll', updateMobileCtaVisibility, { passive: true });
    window.addEventListener('resize', updateMobileCtaVisibility);
    if (typeof mobileBreakpoint.addEventListener === 'function') {
      mobileBreakpoint.addEventListener('change', handleMobileQueryChange);
    } else {
      mobileBreakpoint.addListener(handleMobileQueryChange);
    }

    return () => {
      window.removeEventListener('scroll', updateMobileCtaVisibility);
      window.removeEventListener('resize', updateMobileCtaVisibility);
      if (typeof mobileBreakpoint.removeEventListener === 'function') {
        mobileBreakpoint.removeEventListener('change', handleMobileQueryChange);
      } else {
        mobileBreakpoint.removeListener(handleMobileQueryChange);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return undefined;
    }

    const footer = document.querySelector('.footer');
    const ctaSection = ctaSectionRef.current;
    const targets = [footer, ctaSection].filter(Boolean);
    if (!targets.length) {
      return undefined;
    }

    const visibleTargets = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleTargets.add(entry.target);
          } else {
            visibleTargets.delete(entry.target);
          }
        });
        setHideMobileBookingCta(visibleTargets.size > 0);
      },
      { threshold: 0.08 },
    );

    targets.forEach((target) => observer.observe(target));

    return () => observer.disconnect();
  }, []);

  const isMobileBookingCtaVisible = showMobileBookingCta && !hideMobileBookingCta;

  return (
    <div className="home-page">
      <motion.section className="home-hero" ref={heroRef}>
        <motion.div className="home-hero-backdrop" aria-hidden="true" style={heroBackdropStyle}>
          <img
            src={homeHeroBackdropImage}
            alt=""
            className="home-hero-image"
            loading="eager"
          />
        </motion.div>
        <div className="home-hero-overlay" aria-hidden="true" />

        <div className="container home-hero-grid">
          <motion.div className="home-hero-copy" {...revealProps}>
            <span className="home-eyebrow">Premium ladies salon in Pakistan</span>
            <h1>{SALON_NAME}</h1>
            <p className="home-hero-intro">
              {BRAND_TAGLINE}. Bridal, party, facial, nails, and hair styling services for Nikkah,
              Mehndi, Barat, Walima, Eid, and family events.
            </p>

            <div className="home-hero-actions">
              <Link to="/booking" className="home-primary-button">
                Book Appointment
              </Link>
              <Link to="/services" className="home-secondary-button">
                View Services
              </Link>
            </div>

            <div className="home-hero-trust" aria-label="Trust indicators">
              {heroTrustBadges.map((badge) => (
                <span key={badge} className="home-hero-trust-item">
                  {badge}
                </span>
              ))}
            </div>

            <p className="home-hero-note">Nikkah to Walima looks | By appointment | Ladies-friendly service</p>

            <div className="home-hero-contact">
              <a href={phoneHref}>{BRAND_PHONE}</a>
              <span>{BRAND_ADDRESS}</span>
            </div>
          </motion.div>

          <motion.div className="home-hero-panel" {...revealProps} transition={{ duration: 0.7, ease: 'easeOut', delay: 0.12 }}>
            <div className="home-hero-image-shell">
              <motion.img
                src={homeHeroPanelImage}
                alt="Bridal beauty preparation at Hazel Beauty Saloon"
                className="home-hero-panel-image"
                loading="eager"
              />
              <span className="home-hero-ribbon">Bookings open</span>
              <article className="home-hero-card">
                <span>Bridal bookings available</span>
                <strong>Professional beauty care for every occasion.</strong>
                <p>
                  Book your event look with expert beauticians, clear guidance, and reliable support.
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
            <span className="home-section-kicker">Popular for</span>
            <div className="home-featured-track" aria-hidden="true">
              {[...featuredInTicker, ...featuredInTicker].map((item, index) => (
                <span key={`${item}-${index}`} className="home-featured-chip">
                  {item}
                </span>
              ))}
            </div>
          </article>

          <article className="home-social-proof">
            <span className="home-section-kicker">Recent bookings</span>
            <strong>{liveSocialProof[socialProofIndex].title}</strong>
            <p>{liveSocialProof[socialProofIndex].message}</p>
          </article>
        </div>
      </section>

      <section className="home-story" id="story">
        <div className="container home-story-grid">
          <div className="home-story-copy">
            <div className="home-section-header">
              <span className="home-section-kicker">Why women choose Hazel</span>
              <h2 className="home-section-title">Beauty that feels elegant, fresh, and confident.</h2>
              <p className="home-section-lead">
                We focus on looks that suit Pakistani skin tones, events, and style preferences,
                without overdone makeup or rushed service.
              </p>
              <p className="home-section-text">
                Our team guides you from consultation to final touch-up so your look stays polished
                from event start to finish.
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
              <p>"Every woman deserves to feel beautiful and fully confident."</p>
              <span>Event-ready beauty care, thoughtfully delivered.</span>
            </article>

            <article className="home-story-team-card">
              <span className="home-story-team-kicker">Our story</span>
              <strong>
                Experienced beauticians, ladies-friendly service, and a front desk that helps you
                book with ease.
              </strong>
              <p>
                From bridal trials to party touch-ups, every appointment is planned around your
                event timing and preferences.
              </p>
            </article>

            <div className="home-story-meta-row">
              <span>
                <CalendarDays size={14} />
                Bridal consultations
              </span>
              <span>
                <Clock3 size={14} />
                WhatsApp booking support
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="home-gallery">
        <div className="container">
          <div className="home-section-header home-section-header-centered">
            <span className="home-section-kicker">Portfolio</span>
            <h2 className="home-section-title">Recent bridal, facial, and nail looks.</h2>
            <p className="home-section-lead">
              Explore makeup, skincare, and finishing work prepared for weddings, festive events,
              and polished everyday beauty.
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
                  src={tile.image}
                  alt={tile.alt}
                  className="home-gallery-image"
                  loading="lazy"
                  style={{ objectPosition: tile.position }}
                />
                <div className="home-gallery-overlay" aria-hidden="true" />
                <div className="home-gallery-copy">
                  <span className="home-gallery-tag">{tile.category}</span>
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
            <span className="home-section-kicker">Popular services</span>
            <h2 className="home-section-title">Bridal, party, and glow-focused care.</h2>
            <p className="home-section-lead">
              Choose from bridal makeup, event-ready glam, facial glow rituals, hair styling, and
              nail care services designed for Pakistani occasions.
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
                    src={service.image}
                    alt={service.alt}
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
                    View Details
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-testimonials">
        <div className="container" ref={testimonialsRef}>
          <div className="home-section-header home-section-header-centered">
            <span className="home-section-kicker home-section-kicker-muted">Client reviews</span>
            <h2 className="home-section-title home-section-title-italic">Loved by brides and event guests.</h2>
            <p className="home-section-lead">
              Real feedback from women who booked bridal, party, and self-care appointments with us.
            </p>
          </div>

          {testimonialsInView ? (
            <Suspense
              fallback={
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
              }
            >
              <TestimonialsCarousel testimonials={testimonials} />
            </Suspense>
          ) : (
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
          )}
        </div>
      </section>

      <section className="home-cta" ref={ctaSectionRef}>
        <div className="home-cta-media">
          <img
            src={homeCtaImage}
            alt=""
            className="home-cta-image"
            loading="lazy"
          />
        </div>
        <div className="container home-cta-content">
          <div className="home-cta-copy">
            <span className="home-section-kicker home-section-kicker-light">Ready for your perfect salon look?</span>
            <h2 className="home-cta-title">Book your appointment today.</h2>
            <p className="home-cta-text">
              Tell us your event, date, and preferred style. We will guide you to the right service
              and secure your slot quickly.
            </p>

            <div className="home-cta-actions">
              <Link to="/booking" className="home-primary-button home-primary-button-large">
                Book Appointment
              </Link>
              <a href={BRAND_WHATSAPP_BOOKING_LINK} className="home-secondary-button home-secondary-button-light" target="_blank" rel="noreferrer">
                Call / WhatsApp Now
              </a>
            </div>
          </div>

          <aside className="home-cta-card">
            <span className="home-cta-card-kicker">What you get</span>
            <ul>
              <li>
                <Sparkles size={15} />
                Bridal and event makeup planning
              </li>
              <li>
                <Leaf size={15} />
                Skin-friendly products and tone-matched finish
              </li>
              <li>
                <ShieldCheck size={15} />
                Ladies-only comfort with hygienic service standards
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

      <div className={`home-mobile-booking-cta${isMobileBookingCtaVisible ? ' is-visible' : ''}`} aria-hidden={!isMobileBookingCtaVisible}>
        <Link
          to="/booking"
          className="home-mobile-booking-primary"
          tabIndex={isMobileBookingCtaVisible ? 0 : -1}
        >
          Book Appointment
        </Link>
        <a
          href={BRAND_WHATSAPP_BOOKING_LINK}
          className="home-mobile-booking-secondary"
          target="_blank"
          rel="noreferrer"
          tabIndex={isMobileBookingCtaVisible ? 0 : -1}
        >
          WhatsApp Now
        </a>
      </div>
    </div>
  );
};

export default Home;

