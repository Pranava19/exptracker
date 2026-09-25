import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import { User, Mail, LogOut } from 'lucide-react';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Layout>
      <SEO
        title="Account Profile"
        description="Manage your personal account profile credentials and session in ExpTracker."
        path="/profile"
      />
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-900 dark:text-ink-50">Account Profile</h1>
          <p className="text-xs text-ink-600 dark:text-ink-300 mt-1">Manage your credentials and session</p>
        </div>

        <div className="glass-card p-6 rounded-2xl shadow-sm space-y-5">
          <div className="flex items-center gap-4 pb-4 border-b border-ink-100/60 dark:border-white/10">
            <div className="w-14 h-14 rounded-2xl bg-accent text-white font-mono text-xl font-bold flex items-center justify-center shadow-sm select-none">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink-900 dark:text-ink-50">{user?.name || 'User'}</h2>
              <p className="text-xs font-mono text-ink-600 dark:text-ink-300 opacity-80">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between py-1">
              <span className="text-ink-700 dark:text-ink-300 opacity-75 flex items-center gap-2">
                <User size={14} strokeWidth={1.5} /> Full Name
              </span>
              <span className="font-medium text-ink-900 dark:text-ink-50">{user?.name}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-ink-700 dark:text-ink-300 opacity-75 flex items-center gap-2">
                <Mail size={14} strokeWidth={1.5} /> Email
              </span>
              <span className="font-mono text-ink-900 dark:text-ink-50">{user?.email}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-ink-100/60 dark:border-white/10 space-y-3">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-negative/10 hover:bg-negative/20 text-negative py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-negative/20"
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