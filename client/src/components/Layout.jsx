import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import Navbar from './Navbar';
import HeaderClock from './HeaderClock';
import { useTheme } from '../context/ThemeContext';
import { ChevronRight } from 'lucide-react';

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

  return (
    <div className={`min-h-screen ${dark ? 'dark' : ''}`}>
      <div className="min-h-screen bg-ink-50 dark:bg-ink-900 text-ink-900 dark:text-ink-50">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-accent focus:text-white focus:rounded-md focus:shadow-md"
        >
          Skip to main content
        </a>

        <Navbar />

        <div className="hidden md:block md:ml-56">
          <header className="sticky top-0 z-20 flex items-center justify-between px-8 h-14 bg-white/80 dark:bg-ink-900/80 backdrop-blur-md border-b border-ink-100 dark:border-[#2C2C28]">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-ink-700 dark:text-ink-200">
              <Link to="/dashboard" className="hover:text-accent transition-colors font-medium">
                Home
              </Link>
              <ChevronRight size={12} className="opacity-50" />
              <span className="font-semibold text-ink-900 dark:text-ink-50">{title}</span>
            </nav>
            <HeaderClock />
          </header>
          <main id="main-content" className="p-8 max-w-7xl mx-auto">
            {children}
          </main>
        </div>

        <div className="md:hidden pt-12 pb-20">
          <main id="main-content" className="p-4">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;