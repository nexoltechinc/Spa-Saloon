import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import CrmSidebar from './CrmSidebar';

const Layout = ({ children }) => {
  const { pathname } = useLocation();

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
