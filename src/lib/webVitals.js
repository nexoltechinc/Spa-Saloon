import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

const updateWebVitalsStore = (metric) => {
  if (typeof window === 'undefined') {
    return;
  }

  const entry = {
    delta: metric.delta,
    id: metric.id,
    name: metric.name,
    rating: metric.rating,
    startTime: metric.startTime,
    value: metric.value,
  };

  window.__HAZEL_WEB_VITALS__ = window.__HAZEL_WEB_VITALS__ || {};
  window.__HAZEL_WEB_VITALS__[metric.name] = entry;
  window.dispatchEvent(new CustomEvent('hazel:web-vitals', { detail: entry }));

  if (import.meta.env.DEV) {
    console.info(`[web-vitals] ${metric.name}`, entry);
  }
};

export const reportWebVitals = () => {
  onCLS(updateWebVitalsStore);
  onFCP(updateWebVitalsStore);
  onINP(updateWebVitalsStore);
  onLCP(updateWebVitalsStore);
  onTTFB(updateWebVitalsStore);
};
