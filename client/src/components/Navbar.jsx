import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  ArrowLeftRight,
  BarChart3,
  CalendarClock,
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
      { to: '/subscriptions', label: 'Subscriptions', icon: CalendarClock },
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
  { to: '/subscriptions', label: 'Recurring', icon: CalendarClock },
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
      <aside className="hidden md:flex flex-col fixed top-0 left-0 h-screen z-30 w-56 glass-nav">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100/60 dark:border-white/10">
          <Link to="/dashboard" className="text-ink-900 dark:text-ink-50 font-bold text-lg tracking-tight hover:opacity-85 transition-opacity">
            <span>Exp<span className="text-accent font-semibold">Tracker</span></span>
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={toggle}
              className="text-ink-700 dark:text-ink-200 hover:text-ink-900 dark:hover:text-white transition-colors p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun size={17} strokeWidth={1.75} /> : <Moon size={17} strokeWidth={1.75} />}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
          {NAV_SECTIONS.map(({ label, items }) => (
            <div key={label}>
              <p className="px-2 pb-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-300 opacity-60 cursor-default">
                {label}
              </p>
              {items.map(({ to, label: itemLabel, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl mb-1 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-accent/15 dark:bg-accent/25 text-accent font-semibold shadow-xs'
                        : 'text-ink-700 dark:text-ink-300 hover:text-ink-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'
                    }`
                  }
                >
                  <Icon size={18} strokeWidth={1.75} className="flex-shrink-0" />
                  <span>{itemLabel}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-ink-100/60 dark:border-white/10 space-y-2">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl glass-card-subtle">
            <div className="w-7 h-7 rounded-full bg-accent text-white font-mono text-xs font-semibold flex items-center justify-center select-none shadow-xs">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate text-ink-900 dark:text-ink-50">{user?.name || 'User'}</p>
              <p className="text-[10px] text-ink-600 dark:text-ink-300 truncate opacity-75">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-medium text-negative hover:bg-negative/10 transition-colors cursor-pointer"
          >
            <LogOut size={16} strokeWidth={1.75} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-30 glass-mobile-bar border-b border-ink-100/60 dark:border-white/10 pt-[env(safe-area-inset-top,0px)]">
        <div className="flex items-center justify-between px-4 h-12">
          <Link to="/dashboard" className="font-bold text-base text-ink-900 dark:text-ink-50">
            <span>Exp<span className="text-accent font-semibold">Tracker</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="text-ink-700 dark:text-ink-200 p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
            </button>
            <NavLink
              to="/profile"
              className="w-7 h-7 rounded-full bg-accent text-white font-mono text-xs font-bold flex items-center justify-center select-none shadow-xs"
            >
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </NavLink>
          </div>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 glass-mobile-bar border-t border-ink-100/60 dark:border-white/10 pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-around px-2 py-1">
          {MOBILE_NAV_ITEMS.map(({ to, label: l, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center flex-1 py-1.5 gap-1 rounded-xl transition-all ${
                  isActive
                    ? 'text-accent font-semibold bg-accent/15 dark:bg-accent/25'
                    : 'text-ink-700 dark:text-ink-300 opacity-70 hover:opacity-100'
                }`
              }
            >
              <Icon size={18} strokeWidth={1.75} />
              <span className="text-[10px] font-medium tracking-tight">{l}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </>
  );
};

export default Navbar;