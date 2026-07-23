import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: 'ti-layout-dashboard' },
      { to: '/transactions', label: 'Transactions', icon: 'ti-arrows-exchange' },
      { to: '/analysis', label: 'Analysis', icon: 'ti-chart-bar' },
    ],
  },
  {
    label: 'Manage',
    items: [
      { to: '/import', label: 'Import', icon: 'ti-file-import' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/profile', label: 'Profile', icon: 'ti-user' },
    ],
  },
];

const Navbar = () => {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed top-0 left-0 h-screen z-30 w-52 dark:bg-[#161B27] bg-white border-r border-gray-100 dark:border-[#252D3D]">
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-[#252D3D]">
          <Link to="/dashboard" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 17, letterSpacing: '-0.3px' }}
            className="text-gray-900 dark:text-gray-100 hover:opacity-80 transition-opacity">
            Exp<span className="text-blue-500">Tracker</span>
          </Link>
          <div className="flex items-center gap-1">
            <button onClick={toggle}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded"
              aria-label="Toggle dark mode">
              <i className={`ti ${dark ? 'ti-sun' : 'ti-moon'}`} style={{ fontSize: 15 }} aria-hidden="true" />
            </button>
            <NavLink to="/profile"
              className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold hover:opacity-80 transition-opacity"
              aria-label="Profile">
              {user?.name?.charAt(0).toUpperCase()}
            </NavLink>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2">
          {NAV_SECTIONS.map(({ label, items }) => (
            <div key={label} className="mb-1">
              <p className="px-2 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.8px] text-gray-400 dark:text-[#334155]">
                {label}
              </p>
              {items.map(({ to, label: itemLabel, icon }) => (
                <NavLink key={to} to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 text-[13px] font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 dark:bg-[#1E3A5F] text-blue-700 dark:text-blue-300'
                        : 'text-gray-500 dark:text-[#64748B] hover:text-gray-800 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1E2A3B]'
                    }`
                  }>
                  <i className={`ti ${icon} flex-shrink-0`} style={{ fontSize: 15 }} aria-hidden="true" />
                  {itemLabel}
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        <div className="p-2 border-t border-gray-100 dark:border-[#252D3D]">
          <button onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[12px] font-medium text-gray-400 dark:text-[#475569] hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1E2A3B] transition-colors">
            <i className="ti ti-logout" style={{ fontSize: 14 }} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-[#161B27] border-b border-gray-100 dark:border-[#252D3D]">
        <div className="flex items-center justify-between px-4 h-[50px]">
          <Link to="/dashboard" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 16 }}
            className="text-gray-900 dark:text-gray-100">
            Exp<span className="text-blue-500">Tracker</span>
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={toggle}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
              aria-label="Toggle dark mode">
              <i className={`ti ${dark ? 'ti-sun' : 'ti-moon'}`} style={{ fontSize: 18 }} aria-hidden="true" />
            </button>
            <NavLink to="/profile"
              className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold hover:opacity-80 transition-opacity"
              aria-label="Profile">
              {user?.name?.charAt(0).toUpperCase()}
            </NavLink>
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-[#161B27] border-t border-gray-100 dark:border-[#252D3D]">
        <div className="flex">
          {NAV_SECTIONS.flatMap(s => s.items).map(({ to, label: l, icon }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex flex-col items-center flex-1 py-2.5 gap-0.5 transition-colors ${
                  isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-[#475569]'
                }`
              }>
              <i className={`ti ${icon}`} style={{ fontSize: 20 }} aria-hidden="true" />
              <span style={{ fontSize: 10, fontWeight: 500 }}>{l}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </>
  );
};

export default Navbar;