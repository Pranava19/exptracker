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

            <div className="flex items-center justify-between py-1">
              <span className="text-ink-700 dark:text-ink-300 opacity-75 flex items-center gap-2">
                <ShieldCheck size={14} strokeWidth={1.5} /> Auth Security
              </span>
              <span className="font-mono text-positive text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-positive/10 border border-positive/20 glass-pill">
                HTTP-Only Cookie Protected
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-ink-100/60 dark:border-white/10 space-y-3">
            {reportSent ? (
              <div className="p-3 rounded-xl bg-positive/10 border border-positive/20 text-positive text-xs flex items-center gap-2 font-medium">
                <CheckCircle2 size={16} strokeWidth={1.5} />
                <span>Monthly financial summary email sent to {user?.email}!</span>
              </div>
            ) : (
              <button
                onClick={handleSendReport}
                disabled={reportLoading}
                className="glass-btn w-full flex items-center justify-center gap-2 text-accent py-2.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {reportLoading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} strokeWidth={1.5} />}
                <span>Email Me Monthly Financial Summary</span>
              </button>
            )}

            {resetSent ? (
              <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs flex items-center gap-2">
                <CheckCircle2 size={16} strokeWidth={1.5} />
                <span>Password reset link sent to your email address!</span>
              </div>
            ) : (
              <button
                onClick={handlePasswordReset}
                disabled={resetLoading}
                className="glass-btn w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {resetLoading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} strokeWidth={1.5} />}
                <span>Send Password Reset Email</span>
              </button>
            )}

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