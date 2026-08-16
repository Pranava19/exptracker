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
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed top-0 left-0 h-screen z-30 w-56 bg-white dark:bg-ink-900 border-r border-ink-100 dark:border-[#2C2C28]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100 dark:border-[#2C2C28]">
          <Link to="/dashboard" className="text-ink-900 dark:text-ink-50 font-bold text-lg tracking-tight hover:opacity-80 transition-opacity">
            <span>Exp<span className="text-accent font-semibold">Tracker</span></span>
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={toggle}
              className="text-ink-700 dark:text-ink-200 hover:text-ink-900 dark:hover:text-white transition-colors p-1.5 rounded-md hover:bg-ink-50 dark:hover:bg-[#2C2C28]"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
          {NAV_SECTIONS.map(({ label, items }) => (
            <div key={label}>
              <p className="px-2 pb-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-ink-700 dark:text-ink-200 opacity-60">
                {label}
              </p>
              {items.map(({ to, label: itemLabel, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-md mb-0.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-accent/10 dark:bg-accent/20 text-accent font-semibold'
                        : 'text-ink-700 dark:text-ink-200 hover:text-ink-900 dark:hover:text-white hover:bg-ink-50 dark:hover:bg-[#2C2C28]'
                    }`
                  }
                >
                  <Icon size={18} strokeWidth={1.5} className="flex-shrink-0" />
                  <span>{itemLabel}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-ink-100 dark:border-[#2C2C28] space-y-2">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-card bg-ink-50 dark:bg-[#2C2C28]">
            <div className="w-7 h-7 rounded-full bg-accent text-white font-mono text-xs font-semibold flex items-center justify-center">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate text-ink-900 dark:text-ink-50">{user?.name || 'User'}</p>
              <p className="text-[10px] text-ink-700 dark:text-ink-200 truncate opacity-75">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-xs font-medium text-negative hover:bg-negative/10 transition-colors"
          >
            <LogOut size={16} strokeWidth={1.5} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-ink-900 border-b border-ink-100 dark:border-[#2C2C28]">
        <div className="flex items-center justify-between px-4 h-12">
          <Link to="/dashboard" className="font-bold text-base text-ink-900 dark:text-ink-50">
            <span>Exp<span className="text-accent">Tracker</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="text-ink-700 dark:text-ink-200 p-1"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
            </button>
            <NavLink
              to="/profile"
              className="w-7 h-7 rounded-full bg-accent text-white font-mono text-xs font-bold flex items-center justify-center"
            >
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </NavLink>
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-ink-900 border-t border-ink-100 dark:border-[#2C2C28]">
        <div className="flex">
          {NAV_SECTIONS.flatMap(s => s.items).map(({ to, label: l, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center flex-1 py-2 gap-1 transition-colors ${
                  isActive ? 'text-accent font-semibold' : 'text-ink-700 dark:text-ink-200 opacity-60'
                }`
              }
            >
              <Icon size={18} strokeWidth={1.5} />
              <span className="text-[10px]">{l}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </>
  );
};

export default Navbar;