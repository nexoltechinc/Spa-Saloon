import { ArrowRight, CalendarDays, Check, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { resolveHazelImage } from '../config/serviceMedia';
import './Packages.css';

const BOOKING_ROUTE = '/booking';
const SERVICES_ROUTE = '/services';

const packageCards = [
  {
    id: 'bridal-beauty',
    title: 'Bridal Beauty Package',
    description:
      'A complete beauty preparation package for brides who want a polished and elegant look for their special day.',
    includes: ['Bridal makeup', 'Hair styling', 'Skin preparation', 'Final touch-up guidance'],
    duration: '3–4 hours',
    image: resolveHazelImage('bridal-packages', 'package-bridal-beauty'),
    alt: 'Bridal beauty service photograph from Hazel Beauty Saloon',
  },
  {
    id: 'party-glam',
    title: 'Party Glam Package',
    description:
      'A refined look for parties, formal events, dinners, and celebrations.',
    includes: ['Party makeup', 'Hair styling', 'Light skin prep'],
    duration: '1–2 hours',
    image: resolveHazelImage('makeup-services', 'package-party-glam'),
    alt: 'Party makeup service photograph from Hazel Beauty Saloon',
  },
  {
    id: 'facial-massage',
    title: 'Facial + Massage Package',
    description:
      'A relaxing self-care package designed to refresh your skin and help you unwind.',
    includes: ['Facial ritual', 'Relaxing massage', 'Skin care guidance'],
    duration: '1–2 hours',
    image: resolveHazelImage('spa-massage', 'package-facial-massage'),
    alt: 'Facial and massage service photograph from Hazel Beauty Saloon',
  },
  {
    id: 'hair-styling',
    title: 'Hair Styling Package',
    description:
      'A polished hair care package for fresh, clean, and beautiful styling.',
    includes: ['Blow dry', 'Hair styling', 'Basic finishing'],
    duration: '45–90 minutes',
    image: resolveHazelImage('hair-services', 'package-hair-styling'),
    alt: 'Hair styling service photograph from Hazel Beauty Saloon',
  },
  {
    id: 'mani-pedi',
    title: 'Manicure + Pedicure Package',
    description:
      'A clean and elegant nail care package for hands and feet.',
    includes: ['Manicure', 'Pedicure', 'Nail shaping', 'Polish application'],
    duration: '1–2 hours',
    image: resolveHazelImage('nail-services', 'package-mani-pedi'),
    alt: 'Manicure and pedicure service photograph from Hazel Beauty Saloon',
  },
  {
    id: 'luxury-self-care',
    title: 'Luxury Self-Care Package',
    description:
      'A complete salon and spa experience for customers who want a calm, premium refresh.',
    includes: ['Facial', 'Massage', 'Hair styling', 'Manicure or pedicure'],
    duration: '2–4 hours',
    image: resolveHazelImage('facial-skin-care', 'package-luxury-self-care'),
    alt: 'Luxury self-care service photograph from Hazel Beauty Saloon',
  },
];

const Packages = () => (
  <div className="packages-page">
    <section className="packages-hero">
      <div className="container packages-hero-grid">
        <div className="packages-hero-copy">
          <p className="packages-kicker">Packages & Offers</p>
          <h1>Bundled experiences for calm, polished visits.</h1>
          <p>
            Explore curated beauty and salon packages designed for bridal preparation, event looks,
            self-care sessions, and polished finishing without repeating individual service pricing.
          </p>

          <div className="packages-hero-actions">
            <Link to={BOOKING_ROUTE} className="packages-primary-link">
              Reserve Now
              <ArrowRight size={16} />
            </Link>
            <Link to={SERVICES_ROUTE} className="packages-secondary-link">
              View Service Pricing
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <aside className="packages-hero-panel">
          <div className="packages-hero-highlight">
            <span>Thoughtfully bundled</span>
            <strong>Built around occasion, comfort, and ease.</strong>
            <p>
              Each package groups together the services guests most often ask for when they want a
              smoother booking path.
            </p>
          </div>

          <div className="packages-hero-meta">
            <article>
              <span>Focus</span>
              <strong>Occasion-ready beauty care</strong>
            </article>
            <article>
              <span>Booking</span>
              <strong>Reserve now, refine details later</strong>
            </article>
          </div>
        </aside>
      </div>
    </section>

    <section className="packages-catalog">
      <div className="container">
        <div className="packages-section-head">
          <div>
            <p className="packages-kicker">Package Selection</p>
            <h2>Choose the experience that fits your visit.</h2>
          </div>
          <p>
            Package cards stay focused on what is included, how long the experience may take, and
            the easiest next step to reserve.
          </p>
        </div>

        <div className="packages-grid">
          {packageCards.map((item) => (
            <article key={item.id} className="packages-card">
              <div className="packages-card-media">
                <img src={item.image} alt={item.alt} className="packages-card-image" loading="lazy" />
                <div className="packages-card-overlay" aria-hidden="true" />
                <span className="packages-duration-pill">
                  <CalendarDays size={14} />
                  {item.duration}
                </span>
              </div>

              <div className="packages-card-body">
                <div className="packages-card-copy">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>

                <div className="packages-includes">
                  <span>Includes</span>
                  <ul>
                    {item.includes.map((service) => (
                      <li key={`${item.id}-${service}`}>
                        <Check size={14} />
                        <span>{service}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="packages-card-actions">
                  <Link to={BOOKING_ROUTE} className="packages-primary-link">
                    Reserve Now
                    <ArrowRight size={16} />
                  </Link>
                  <Link to={SERVICES_ROUTE} className="packages-inline-link">
                    View Service Pricing
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="packages-guidance-note">
          <Sparkles size={16} />
          <p>
            For detailed service pricing, please visit our Services page or contact our team for
            package guidance.
          </p>
        </div>
      </div>
    </section>
  </div>
);

export default Packages;
