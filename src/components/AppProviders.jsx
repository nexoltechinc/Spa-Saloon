import { useEffect, useRef } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { queryClient } from '../lib/queryClient';
import { reportWebVitals } from '../lib/webVitals';

const AppProviders = ({ children }) => {
  const hasRegisteredVitals = useRef(false);

  useEffect(() => {
    if (hasRegisteredVitals.current) {
      return undefined;
    }

    hasRegisteredVitals.current = true;
    reportWebVitals();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      return undefined;
    }

    const lenis = new Lenis({
      autoRaf: true,
      anchors: true,
      stopInertiaOnNavigate: true,
    });

    return () => {
      lenis.destroy();
    };
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

export default AppProviders;
