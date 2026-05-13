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
      'Complete bridal preparation for Nikkah, Barat, or Walima with a polished and camera-ready finish.',
    includes: ['Bridal makeup', 'Hair styling', 'Skin preparation', 'Final touch-up guidance'],
    duration: '3-4 hours',
    image: resolveHazelImage('bridal-packages', 'package-bridal-beauty'),
    alt: 'Bridal beauty service photograph from Hazel Beauty Saloon',
  },
  {
    id: 'party-glam',
    title: 'Party Glam Package',
    description:
      'A refined look for Mehndi, engagement, Eid, dinners, and family celebrations.',
    includes: ['Party makeup', 'Hair styling', 'Light skin prep'],
    duration: '1-2 hours',
    image: resolveHazelImage('makeup-services', 'package-party-glam'),
    alt: 'Party makeup service photograph from Hazel Beauty Saloon',
  },
  {
    id: 'facial-massage',
    title: 'Facial + Massage Package',
    description:
      'A glow-focused self-care package designed to refresh skin and relax body stress.',
    includes: ['Facial ritual', 'Relaxing massage', 'Skin care guidance'],
    duration: '1-2 hours',
    image: resolveHazelImage('spa-massage', 'package-facial-massage'),
    alt: 'Facial and massage service photograph from Hazel Beauty Saloon',
  },
  {
    id: 'hair-styling',
    title: 'Hair Styling Package',
    description:
      'A polished hair package for smooth styling, event finishing, and all-day hold.',
    includes: ['Blow dry', 'Hair styling', 'Basic finishing'],
    duration: '45-90 minutes',
    image: resolveHazelImage('hair-services', 'package-hair-styling'),
    alt: 'Hair styling service photograph from Hazel Beauty Saloon',
  },
  {
    id: 'mani-pedi',
    title: 'Manicure + Pedicure Package',
    description:
      'A clean and elegant nail care package for event-ready hands and feet.',
    includes: ['Manicure', 'Pedicure', 'Nail shaping', 'Polish application'],
    duration: '1-2 hours',
    image: resolveHazelImage('nail-services', 'package-mani-pedi'),
    alt: 'Manicure and pedicure service photograph from Hazel Beauty Saloon',
  },
  {
    id: 'luxury-self-care',
    title: 'Luxury Self-Care Package',
    description:
      'A complete salon and spa refresh for women who want premium care in one visit.',
    includes: ['Facial', 'Massage', 'Hair styling', 'Manicure or pedicure'],
    duration: '2-4 hours',
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
          <h1>Bundled packages for bridal, party, and glow care.</h1>
          <p>
            Explore curated packages for Nikkah, Mehndi, Barat, Walima, Eid, and self-care sessions
            without selecting each service individually.
          </p>

          <div className="packages-hero-actions">
            <Link to={BOOKING_ROUTE} className="packages-primary-link">
              Book Appointment
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
            <strong>Built around event needs, comfort, and convenience.</strong>
            <p>
              Each package combines the services clients usually request together for a smoother
              booking flow.
            </p>
          </div>

          <div className="packages-hero-meta">
            <article>
              <span>Focus</span>
              <strong>Occasion-ready beauty care</strong>
            </article>
            <article>
              <span>Booking</span>
              <strong>Book now, confirm details on call/WhatsApp</strong>
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
            <h2>Choose the package that fits your event.</h2>
          </div>
          <p>
            Package cards show what is included, estimated duration, and the easiest next step to
            book.
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
                    Book Appointment
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
            For exact package customization, visit our Services page or contact our team on
            call/WhatsApp.
          </p>
        </div>
      </div>
    </section>
  </div>
);

export default Packages;

