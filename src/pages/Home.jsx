import { ArrowRight, Quote, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BRAND_TAGLINE, SALON_NAME } from '../config/brand';
import './Home.css';

const heroImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAoG57Qd9WMg0H6lYPhWqMdnpjtg-kLLz5mA4qUC170imSRw4DrnNaYn_Wkfw-zV9-XgBHk2e3NSEK7byiXMxTcXckISlbnZz6LrJC1C5KMaNOk5o3YZ7TR_cJGbaX9u-YtXZycLUlYl5DG9edgpr8qJBzTBA1YlXHqrN4fdgYytIJuoBV_lYn_UvFfh5wgY3ES3OTDU7ugUoc_ghoyBILURzm7R4kbGgSyIOBTuRTeWW-ry4Ys8I9iK4MGd8fl6z7UzCPqd8BKNvQ';

const storyImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBlu8U8K30MpWwSwYDjv9L2_X5JFm7q869YjP9iyMIDW235ouaK-nloy8c0WpXxBzN26hBK2FiYIt3SqlJeEUXpQUuHUt_BIo2ZxrPU3wuBMCnPJ6ED7vdYBwrVpWdgJ6usGlQSTtIXJqEv7EQp1jG-z7HqQDXiVzn3mh1ybvhHgLHAEizxVNbpFbVmMbrdFIrAwUNW1pGtfc9D0_entPDFpZqlpLlatSsDm6Ozi5Q4SogIBGqucHX6jc4_K9no1qka0tVqdPO4CNM';

const ctaImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC1YdowQvAvwuIYNuwLjdy1AAICHe0y6TG9yqIx68v5krz2T2pUfYERWEFs9ZmDzKcagvrhNnIwFKgydfGLbmJSAFGub3QtbPEYBcmNqS9xhAySt_ZNUdv1vuNTGGB2Fnl1J4VQKX0SKMWVGFaUopTbQlVnnh4H4tdZ-kE7qvXLmF97bvuFonLZS_jgpnZ7UBZ3crgUHb_G_QFmNpAytUsSoLsND6bMnOn3h0oPuSiITVSoS2SAiO9VISQXVu_q6qOEBZqvmct4a-Y';

const featuredServices = [
  {
    title: 'Signature Massage',
    description:
      'A deep tissue journey using volcanic stones and custom essential oils to release deep-seated tension.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDcw1Hc6rua5lhJRlztqw0tT-5OaFXcr6WQKSWjaCrjr4ZIWRrAHI00BTSJ9Jk6WXFUof5mhOLTYG1dKIuoEu2X_lGkdXJpJVKq1YCNuBcmsHD8MzZhbahqPCHnNf9-BwxVYBji4T70u4QAP8-q63ViE16Mqm0jGGFjbhRsVWvJt1ABc4hUSHkqQdsuIfonOFMgAfWmzR0ZO3GYG8Ql-QkvBBu8njdkhYDJ5RUPyDIPCGZomrelvShyWvNxnEYZPXaFxqnb-2H5YhA',
    alt: 'Signature massage with hot stones in a serene spa setting',
  },
  {
    title: 'Facial Renewal',
    description:
      "Advanced botanical skincare paired with lymphatic drainage to restore your skin's natural luminescence.",
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAHGqID-1Rxb7Hi1gjvYaPBzRdcDq4LdPJsicJ2EFNOUGgC2ozbDGLUSZyIm87uF6-5QRYpSX6NcaEx09WdP1QJixTInUg_d77r3qAn1zQsyG67n3WMnADky0xxb2WbOYBDrqmydmX1KPeKVe5xm9Y1a5OTtFCaIiu117wLfgx3s12dpYIjwRdClao5PN0GxC0QZeP1cgYYpBrhVgkQ3_fhdU7KkOVpz2SW8Ok3wYrN8mfB1BtoVMDsH2nMpBY1XfsmN83PHbGCDfA',
    alt: 'Botanical facial treatment with calming spa textures',
  },
  {
    title: 'Aromatic Body Scrub',
    description:
      'A revitalizing exfoliation using Himalayan salts and organic nectar to polish and deeply nourish the body.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBLwnmfeHa81oSJmBvdUa8h00caX_2XCfbAslIFemYYVYFbirK-9FOTAXOuBo8ltfg0DZgB46SSDIepXKOM9u22MZZNIqJgIrpmXhQh9_qbeG5kC6CiRFfDSohYFVPIhGRIzKjLiHdWnbT0BtUjYTQTaGlrwlIj6lHK0WIKwAVWJ5M-LxAW2rJWliBXnahkBDSWpAS7ZBFRjBPjle1ohFjgKWj2dVJ-8spF8DGHutm7oSX504mm66eEMcDWy7w5jkpMXntUVT6yaj8',
    alt: 'Aromatic body scrub ingredients arranged in a spa ritual setting',
  },
];

const testimonials = [
  {
    quote:
      "The moment you step through the doors, the world simply stops. I haven't felt this grounded in years. The Signature Massage was transformative.",
    name: 'Helena Montgomery',
    title: 'Wellness Enthusiast',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuABjb4QYUq-UNfn1z9m0vqt8_1mP8gtvNlirVcphyWknk04IH4AMNVHB8SXtYhXOyC1mSFkn929CPDrl3cjrST-7nQvx8lx8ry9PwyM_It83PdrE5gEbE9IwjPRIpEXjU5mYkepnXlN8wm-t7lYjFWLHROqVh8myDueOKV7DRzx8EomvgOp8pJZnfb_V07i1Ocb4lh6lPk1EwpcASy_b59NQZn7ktFh1FDYH0A_6jDS7C24eJuENwcKthirSR9CbxxjOZv-6aQGjqU',
    alt: 'Guest portrait of Helena Montgomery',
  },
  {
    quote:
      'More than a spa, it is a spiritual retreat. The attention to detail is unmatched, from the organic tea blends to the therapeutic scents.',
    name: 'Julian Thorne',
    title: 'Global Traveler',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDIPc8U2Q8TVqeH3a-AOYymRp9Bhc2u-8HYdF_NEZvUsmKHOMrniLzBoybmIuxYUVw6EkXYnPopx5E5BMQ4Sh4WcDbaiESrVjnkG20kPnhrQ96hOUkFrU2wJ5buqzVPivN9XWcE8_9wezRK0Dooa_cwgPCfMgf6K47PYuX4NH6iNEuoZQTmKydWSd4M_H_gRnf-MAKwfETT98ZfOG13pbCQcMAwL3fXA83JIobhKumLNvLZMK68K3Wm-RIVWlEFgAjiWgykmBcE5G0',
    alt: 'Guest portrait of Julian Thorne',
  },
];

const Home = () => {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-media">
          <img
            src={heroImage}
            alt="Luxury indoor spa pool with warm ambient lighting"
            className="home-hero-image"
          />
        </div>
        <div className="home-hero-overlay" />
        <div className="container home-hero-content">
          <div className="home-hero-copy">
            <span className="home-eyebrow">{SALON_NAME}</span>
            <h1 className="home-hero-title">
              {SALON_NAME}
            </h1>
            <p className="home-hero-subtitle">
              {BRAND_TAGLINE}. A restorative journey designed to harmonize your inner landscape
              through modern luxury and thoughtful care.
            </p>
            <Link to="/booking" className="home-primary-button">
              Book Your Escape
            </Link>
          </div>
        </div>
      </section>

      <section className="home-story">
        <div className="container home-story-grid">
          <div className="home-story-media">
            <div className="home-story-image-shell">
              <img
                src={storyImage}
                alt="Spa facial treatment in a softly lit wellness room"
                className="home-story-image"
                loading="lazy"
              />
            </div>
            <div className="home-story-quote">
              <p>"Silence is the language of the soul."</p>
            </div>
          </div>

          <div className="home-story-copy">
            <span className="home-story-divider" />
            <h2 className="home-section-title">
              The Art of
              <br />
              Purposeful Stillness
            </h2>
            <p className="home-section-text">
              Founded on the principle that true luxury is found in time and
              space, {SALON_NAME} offers a curated environment where the
              noise of the world dissolves into a whisper.
            </p>
            <p className="home-section-text">
              Every element, from the scent of hand-pressed oils to the
              rhythmic cadence of our signature rituals, is orchestrated to
              guide you back to your center. We believe wellness is not a
              destination, but a state of being.
            </p>
            <div className="home-story-meta">
              <span className="home-story-line" />
              <span className="home-story-year">Since 1994</span>
            </div>
          </div>
        </div>
      </section>

      <section className="home-services">
        <div className="container">
          <div className="home-section-header home-section-header-centered">
            <span className="home-section-kicker">Curated Rituals</span>
            <h2 className="home-section-title">Signature Experiences</h2>
          </div>

          <div className="home-services-grid">
            {featuredServices.map((service) => (
              <article key={service.title} className="home-service-card">
                <div className="home-service-image-shell">
                  <img
                    src={service.image}
                    alt={service.alt}
                    className="home-service-image"
                    loading="lazy"
                  />
                </div>
                <div className="home-service-content">
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                  <Link to="/services" className="home-inline-link">
                    Learn More
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-testimonials">
        <div className="container">
          <div className="home-section-header home-section-header-centered">
            <span className="home-section-kicker home-section-kicker-muted">
              Guest Perspectives
            </span>
            <h2 className="home-section-title home-section-title-italic">
              Echoes of Peace
            </h2>
          </div>

          <div className="home-testimonials-grid">
            {testimonials.map((testimonial) => (
              <article key={testimonial.name} className="home-testimonial-card">
                <Quote className="home-testimonial-quote-icon" size={70} />
                <div className="home-stars" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} size={18} fill="currentColor" />
                  ))}
                </div>
                <p className="home-testimonial-copy">"{testimonial.quote}"</p>
                <div className="home-testimonial-author">
                  <img
                    src={testimonial.image}
                    alt={testimonial.alt}
                    className="home-testimonial-avatar"
                    loading="lazy"
                  />
                  <div>
                    <h4>{testimonial.name}</h4>
                    <p>{testimonial.title}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-cta">
        <div className="home-cta-media">
          <img
            src={ctaImage}
            alt="Minimalist wellness retreat overlooking a forest at dawn"
            className="home-cta-image"
            loading="lazy"
          />
        </div>
        <div className="home-cta-overlay" />
        <div className="container home-cta-content">
          <h2 className="home-cta-title">Ready for Your Retreat?</h2>
          <Link to="/booking" className="home-primary-button home-primary-button-large">
            Book Your Appointment Now
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
