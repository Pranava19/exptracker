import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import {
  User,
  Mail,
  LogOut,
  Download,
  Upload,
  Database,
  ShieldCheck,
  Loader2
} from 'lucide-react';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();
  const fileInputRef = useRef(null);

  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleDownloadBackup = async () => {
    setDownloading(true);
    try {
      const res = await axios.get('/profile/backup', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const today = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `exptracker_backup_${today}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Backup downloaded successfully');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate backup', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!json || typeof json !== 'object') {
          showToast('Invalid JSON file format', 'error');
          return;
        }

        const txCount = json.transactions?.length || 0;
        const subCount = json.subscriptions?.length || 0;
        const hasBal = json.profile?.starting_balance !== undefined && json.profile?.starting_balance !== null;

        const confirmMsg = `Restore data from backup?\n\n• ${txCount} Transactions\n• ${subCount} Subscriptions\n• ${hasBal ? 'Starting balance: ₹' + json.profile.starting_balance : 'No balance changes'}\n\nExisting non-duplicate records will be preserved.`;

        if (!window.confirm(confirmMsg)) {
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        setRestoring(true);
        const res = await axios.post('/profile/restore', json);
        showToast(
          `Restored ${res.data.restoredTransactions} transactions & ${res.data.restoredSubscriptions} subscriptions`
        );
      } catch (err) {
        console.error(err);
        showToast(err.response?.data?.message || 'Failed to restore backup file. Invalid format.', 'error');
      } finally {
        setRestoring(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  return (
    <Layout>
      <SEO
        title="Account Profile & Backup"
        description="Manage your personal account profile credentials, data backup, and restore in ExpTracker."
        path="/profile"
      />
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <div className="max-w-md mx-auto space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-900 dark:text-ink-50">Account Profile</h1>
          <p className="text-xs text-ink-600 dark:text-ink-300 mt-1">Manage your credentials, backup, and data portability</p>
        </div>

        {/* Profile Card */}
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

        {/* 1-Click Backup & Restore Card */}
        <div className="glass-card p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-ink-100/60 dark:border-white/10 pb-3">
            <div className="w-8 h-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center">
              <Database size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink-900 dark:text-ink-50">Data Backup & Restore</h2>
              <p className="text-[11px] text-ink-600 dark:text-ink-300 opacity-80">Full data ownership with zero lock-in</p>
            </div>
          </div>

          <p className="text-xs text-ink-700 dark:text-ink-300 opacity-85 leading-relaxed">
            Download an offline JSON snapshot of all your transactions, baseline balances, and subscriptions, or restore from a previous backup file.
          </p>

          <div className="space-y-2.5 pt-1">
            {/* Download Backup */}
            <button
              onClick={handleDownloadBackup}
              disabled={downloading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Generating Backup...
                </>
              ) : (
                <>
                  <Download size={15} />
                  Download Complete Backup (.json)
                </>
              )}
            </button>

            {/* Restore Backup */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={restoring}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl glass-card-subtle hover:bg-black/5 dark:hover:bg-white/10 border border-ink-100/60 dark:border-white/10 text-ink-900 dark:text-ink-50 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              {restoring ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Restoring Backup...
                </>
              ) : (
                <>
                  <Upload size={15} />
                  Restore Data from JSON File
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 pt-2 text-[10px] text-ink-600 dark:text-ink-400 opacity-75">
            <ShieldCheck size={14} className="text-positive shrink-0" />
            <span>Encrypted transmission with PostgreSQL Row-Level Security</span>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;