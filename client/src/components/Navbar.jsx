import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  ArrowLeftRight,
  BarChart3,
  FileInput,
  User,
  Sun,
  Moon,
  LogOut
} from 'lucide-react';
import './Navbar.css';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
      { to: '/analysis', label: 'Analysis', icon: BarChart3 },
    ],
  },
  {
    label: 'Manage',
    items: [
      { to: '/import', label: 'Import', icon: FileInput },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/profile', label: 'Profile', icon: User },
    ],
  },
];

const MOBILE_NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'History', icon: ArrowLeftRight },
  { to: '/analysis', label: 'Insights', icon: BarChart3 },
  { to: '/import', label: 'Import', icon: FileInput },
];

const Navbar = () => {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <aside className="navbar-sidebar glass-nav">
        <div className="navbar-brand-header">
          <Link to="/dashboard" className="navbar-brand-link">
            <span>Exp<span className="navbar-brand-accent">Tracker</span></span>
          </Link>
          <div>
            <button
              onClick={toggle}
              className="navbar-theme-btn"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun size={17} strokeWidth={1.75} /> : <Moon size={17} strokeWidth={1.75} />}
            </button>
          </div>
        </div>

        <div className="navbar-menu-scroll">
          {NAV_SECTIONS.map(({ label, items }) => (
            <div key={label}>
              <p className="navbar-section-label">
                {label}
              </p>
              {items.map(({ to, label: itemLabel, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `navbar-link ${isActive ? 'navbar-link-active' : ''}`
                  }
                >
                  <Icon size={18} strokeWidth={1.75} className="navbar-link-icon" />
                  <span>{itemLabel}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        <div className="navbar-footer">
          <div className="navbar-user-card glass-card-subtle">
            <div className="navbar-avatar">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="navbar-user-info">
              <p className="navbar-user-name">{user?.name || 'User'}</p>
              <p className="navbar-user-email">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="navbar-logout-btn"
          >
            <LogOut size={16} strokeWidth={1.75} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="navbar-mobile-header glass-mobile-bar">
        <div className="navbar-mobile-header-inner">
          <Link to="/dashboard" className="navbar-brand-link">
            <span>Exp<span className="navbar-brand-accent">Tracker</span></span>
          </Link>
          <div className="navbar-mobile-header-actions">
            <button
              onClick={toggle}
              className="navbar-theme-btn"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
            </button>
            <NavLink
              to="/profile"
              className="navbar-avatar"
            >
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </NavLink>
          </div>
        </div>
      </div>

      <div className="navbar-mobile-bottom-bar glass-mobile-bar">
        <div className="navbar-mobile-nav-items">
          {MOBILE_NAV_ITEMS.map(({ to, label: l, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `navbar-mobile-tab ${isActive ? 'navbar-mobile-tab-active' : ''}`
              }
            >
              <Icon size={18} strokeWidth={1.75} />
              <span className="navbar-mobile-tab-label">{l}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </>
  );
};

export default Navbar;