import React from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import { useTheme } from '../context/ThemeContext';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/transactions': 'Transactions',
  '/analysis': 'Analysis',
  '/import': 'Import statement',
  '/profile': 'Profile',
};

const Layout = ({ children }) => {
  const { pathname } = useLocation();
  const { dark } = useTheme();
  const title = PAGE_TITLES[pathname] || 'ExpTracker';
  const now = new Date();
  const month = now.toLocaleString('default', { month: 'short', year: 'numeric' });

  return (
    <div className={`min-h-screen ${dark ? 'dark' : ''}`}>
      <div className="min-h-screen bg-gray-50 dark:bg-[#0D1117]">
        <Navbar />

        {/* Desktop */}
        <div className="hidden md:block md:ml-52">
          <div className="sticky top-0 z-20 flex items-center justify-between px-6 h-[50px] bg-white dark:bg-[#161B27] border-b border-gray-100 dark:border-[#252D3D]">
            <h1 className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 tracking-tight">{title}</h1>
            <span className="text-[12px] text-gray-400 dark:text-[#475569] font-medium">{month}</span>
          </div>
          <div className="p-6">{children}</div>
        </div>

        {/* Mobile */}
        <div className="md:hidden pt-[50px] pb-20">
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Layout;