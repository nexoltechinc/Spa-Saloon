import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import CrmSidebar from './CrmSidebar';

const Layout = ({ children }) => {
  return (
    <>
      <Navbar />
      <CrmSidebar />
      <main>
        {children || <Outlet />}
      </main>
      <Footer />
    </>
  );
};

export default Layout;
