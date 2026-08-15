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
      <div className="min-h-screen bg-ink-50 dark:bg-ink-900 text-ink-900 dark:text-ink-50">
        <Navbar />

        {/* Desktop */}
        <div className="hidden md:block md:ml-56">
          <div className="sticky top-0 z-20 flex items-center justify-between px-8 h-14 bg-white/80 dark:bg-ink-900/80 backdrop-blur-md border-b border-ink-100 dark:border-[#2C2C28]">
            <h1 className="text-base font-semibold text-ink-900 dark:text-ink-50 tracking-tight">{title}</h1>
            <span className="text-xs font-mono font-medium text-ink-700 dark:text-ink-200 opacity-75">{month}</span>
          </div>
          <div className="p-8 max-w-7xl mx-auto">{children}</div>
        </div>

        {/* Mobile */}
        <div className="md:hidden pt-12 pb-20">
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Layout;