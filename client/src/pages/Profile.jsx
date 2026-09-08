import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import { User, Mail, ShieldCheck, LogOut, KeyRound, CheckCircle2, Loader2 } from 'lucide-react';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [reportSent, setReportSent] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setResetLoading(true);
    try {
      await axios.post('/auth/forgot-password', { email: user.email });
      setResetSent(true);
    } catch (e) {
      console.error(e);
    } finally {
      setResetLoading(false);
    }
  };

  const handleSendReport = async () => {
    setReportLoading(true);
    try {
      await axios.post('/reports/send-monthly-email');
      setReportSent(true);
    } catch (e) {
      console.error(e);
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <Layout>
      <SEO
        title="Account Profile & Security Settings"
        description="Manage your personal account profile credentials, session authentication security, and password reset preferences in ExpTracker."
        path="/profile"
      />
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

          <div className="pt-4 border-t border-ink-100 dark:border-[#2C2C28] space-y-3">
            {reportSent ? (
              <div className="p-3 rounded-md bg-positive/10 border border-positive/20 text-positive text-xs flex items-center gap-2 font-medium">
                <CheckCircle2 size={16} strokeWidth={1.5} />
                <span>Monthly financial summary email sent to {user?.email}!</span>
              </div>
            ) : (
              <button
                onClick={handleSendReport}
                disabled={reportLoading}
                className="w-full flex items-center justify-center gap-2 bg-accent/10 hover:bg-accent/20 text-accent py-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {reportLoading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} strokeWidth={1.5} />}
                <span>Email Me Monthly Financial Summary</span>
              </button>
            )}

            {resetSent ? (
              <div className="p-3 rounded-md bg-accent/10 border border-accent/20 text-accent text-xs flex items-center gap-2">
                <CheckCircle2 size={16} strokeWidth={1.5} />
                <span>Password reset link sent to your email address!</span>
              </div>
            ) : (
              <button
                onClick={handlePasswordReset}
                disabled={resetLoading}
                className="w-full flex items-center justify-center gap-2 border border-ink-100 dark:border-[#2C2C28] hover:bg-ink-50 dark:hover:bg-[#252522] text-ink-900 dark:text-ink-50 py-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {resetLoading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} strokeWidth={1.5} />}
                <span>Send Password Reset Email</span>
              </button>
            )}

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-negative/10 hover:bg-negative/20 text-negative py-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer"
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