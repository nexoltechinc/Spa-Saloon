import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import CrmSidebar from './CrmSidebar';

const Layout = ({ children }) => {
  const { pathname } = useLocation();

  useEffect(() => {
    const isCrmRoute = pathname.startsWith('/crm');
    if (isCrmRoute || pathname === '/crm-login') {
      return undefined;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return undefined;
    }

    const sections = Array.from(document.querySelectorAll('main section'));
    const footerBlocks = Array.from(
      document.querySelectorAll('.footer .footer-brand, .footer .footer-column, .footer .footer-bottom'),
    );
    const revealTargets = [...sections, ...footerBlocks];

    if (!revealTargets.length) {
      return undefined;
    }

    sections.forEach((section) => section.classList.add('luxury-reveal'));
    footerBlocks.forEach((block) => block.classList.add('luxury-reveal-node'));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('luxury-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { root: null, threshold: 0.2, rootMargin: '0px 0px -10% 0px' },
    );

    revealTargets.forEach((target) => observer.observe(target));

    return () => {
      observer.disconnect();
      sections.forEach((section) => {
        section.classList.remove('luxury-reveal', 'luxury-visible');
      });
      footerBlocks.forEach((block) => {
        block.classList.remove('luxury-reveal-node', 'luxury-visible');
      });
    };
  }, [pathname]);

  return (
    <>
      <Navbar key={pathname} />
      <CrmSidebar />
      <main>
        {children || <Outlet />}
      </main>
      <Footer />
    </>
  );
};

export default Layout;
