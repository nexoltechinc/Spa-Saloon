import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';
import './TestimonialsCarousel.css';

const TestimonialsCarousel = ({ testimonials = [] }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    loop: true,
    skipSnaps: false,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const slideCount = emblaApi?.scrollSnapList().length || testimonials.length;

  useEffect(() => {
    if (!emblaApi) {
      return undefined;
    }

    const handleSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on('select', handleSelect);
    emblaApi.on('reInit', handleSelect);

    return () => {
      emblaApi.off('select', handleSelect);
      emblaApi.off('reInit', handleSelect);
    };
  }, [emblaApi]);

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index) => {
      emblaApi?.scrollTo(index);
    },
    [emblaApi],
  );

  useEffect(() => {
    if (
      !emblaApi ||
      isPaused ||
      testimonials.length < 2 ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return undefined;
    }

    const autoPlayTimer = window.setInterval(() => {
      emblaApi.scrollNext();
    }, 4600);

    return () => window.clearInterval(autoPlayTimer);
  }, [emblaApi, isPaused, testimonials.length]);

  if (!testimonials.length) {
    return null;
  }

  return (
    <div
      className="home-testimonials-carousel"
      aria-roledescription="carousel"
      aria-label="Guest testimonials"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <div className="home-testimonials-topline">
        <span>Swipe through guest stories</span>
        <strong>
          {selectedIndex + 1}/{slideCount || testimonials.length}
        </strong>
      </div>

      <div className="home-testimonials-viewport" ref={emblaRef}>
        <div className="home-testimonials-container">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className={`home-testimonials-slide${index === selectedIndex ? ' is-active' : ''}`}
            >
              <article className={`home-testimonial-card home-testimonial-card-carousel${index === selectedIndex ? ' is-active' : ''}`}>
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
              </article>
            </div>
          ))}
        </div>
      </div>

      <div className="home-testimonials-controls">
        <button
          type="button"
          className="home-testimonials-control"
          aria-label="Previous testimonial"
          onClick={scrollPrev}
        >
          <ChevronLeft size={18} />
        </button>

        <div className="home-testimonials-dots" aria-label="Testimonial slide navigation">
          {testimonials.map((testimonial, index) => (
            <button
              key={testimonial.name}
              type="button"
              className={`home-testimonials-dot${index === selectedIndex ? ' is-active' : ''}`}
              aria-label={`Go to testimonial ${index + 1}`}
              aria-pressed={index === selectedIndex}
              onClick={() => scrollTo(index)}
            />
          ))}
        </div>

        <button
          type="button"
          className="home-testimonials-control"
          aria-label="Next testimonial"
          onClick={scrollNext}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default TestimonialsCarousel;
