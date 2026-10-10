import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import Navbar from './Navbar';
import HeaderClock from './HeaderClock';
import QuickAddFAB from './QuickAddFAB';
import { useTheme } from '../context/ThemeContext';
import { ChevronRight } from 'lucide-react';
import './Layout.css';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/transactions': 'Transactions',
  '/analysis': 'Analysis',
  '/import': 'Import statement',
  '/profile': 'Profile',
  '/privacy': 'Privacy Policy',
  '/terms': 'Terms of Service',
};

const Layout = ({ children }) => {
  const { pathname } = useLocation();
  const { dark } = useTheme();
  const title = PAGE_TITLES[pathname] || 'ExpTracker';

  return (
    <div className={`layout-root ${dark ? 'dark' : ''}`}>
      {/* Ambient background mesh & glowing blobs for glassmorphism refraction */}
      <div className="ambient-glow-wrapper" aria-hidden="true">
        <div className="ambient-blob-1" />
        <div className="ambient-blob-2" />
        <div className="ambient-blob-3" />
      </div>

      <div className="layout-main-wrapper">
        <a
          href="#main-content"
          className="layout-skip-link"
        >
          Skip to main content
        </a>

        <Navbar />

        <div className="layout-desktop-content">
          <header className="layout-desktop-header glass-header">
            <nav aria-label="Breadcrumb" className="layout-breadcrumb">
              <Link to="/dashboard" className="layout-breadcrumb-link">
                Home
              </Link>
              <ChevronRight size={12} className="layout-breadcrumb-sep" />
              <span className="layout-breadcrumb-active">{title}</span>
            </nav>
            <HeaderClock />
          </header>
          <main id="main-content" className="layout-desktop-main">
            {children}
          </main>
        </div>

        <div className="layout-mobile-content">
          <main id="main-content" className="layout-mobile-main">
            {children}
          </main>
        </div>

        <QuickAddFAB />
      </div>
    </div>
  );
};

export default Layout;