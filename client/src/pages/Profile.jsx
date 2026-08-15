import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { User, Mail, ShieldCheck, LogOut } from 'lucide-react';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <h1 className="text-base font-semibold text-ink-900 dark:text-ink-50">Account Profile</h1>
          <p className="text-xs text-ink-700 dark:text-ink-200 opacity-60 mt-0.5">Manage your credentials and session</p>
        </div>

        <div className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-card p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-4 pb-4 border-b border-ink-100 dark:border-[#2C2C28]">
            <div className="w-12 h-12 rounded-full bg-accent text-white font-mono text-lg font-bold flex items-center justify-center">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink-900 dark:text-ink-50">{user?.name || 'User'}</h2>
              <p className="text-xs font-mono text-ink-700 dark:text-ink-200 opacity-60">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1">
              <span className="text-ink-700 dark:text-ink-200 opacity-70 flex items-center gap-2">
                <User size={14} strokeWidth={1.5} /> Full Name
              </span>
              <span className="font-medium text-ink-900 dark:text-ink-50">{user?.name}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-ink-700 dark:text-ink-200 opacity-70 flex items-center gap-2">
                <Mail size={14} strokeWidth={1.5} /> Email
              </span>
              <span className="font-mono text-ink-900 dark:text-ink-50">{user?.email}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-ink-700 dark:text-ink-200 opacity-70 flex items-center gap-2">
                <ShieldCheck size={14} strokeWidth={1.5} /> Auth Security
              </span>
              <span className="font-mono text-positive text-[11px] font-semibold px-2 py-0.5 rounded-sharp bg-positive/10">
                HTTP-Only Cookie Protected
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-ink-100 dark:border-[#2C2C28]">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-negative/10 hover:bg-negative/20 text-negative py-2.5 rounded-md text-xs font-semibold transition-colors"
            >
              <LogOut size={16} strokeWidth={1.5} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;