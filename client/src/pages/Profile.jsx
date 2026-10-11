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
import './Profile.css';

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

        const confirmMsg = `Restore data from backup?\n\n• ${txCount} Transactions\n\nExisting non-duplicate records will be preserved.`;

        if (!window.confirm(confirmMsg)) {
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        setRestoring(true);
        const res = await axios.post('/profile/restore', json);
        showToast(
          `Restored ${res.data.restoredTransactions} transactions`
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

      <div className="profile-container">
        <div>
          <h1 className="profile-title">Account Profile</h1>
          <p className="profile-subtitle">Manage your credentials, backup, and data portability</p>
        </div>

        {/* Profile Card */}
        <div className="glass-card profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="profile-user-name">{user?.name || 'User'}</h2>
              <p className="profile-user-email">{user?.email}</p>
            </div>
          </div>

          <div className="profile-details-list">
            <div className="profile-detail-row">
              <span className="profile-detail-label">
                <User size={14} strokeWidth={1.5} /> Full Name
              </span>
              <span className="profile-detail-val">{user?.name}</span>
            </div>

            <div className="profile-detail-row">
              <span className="profile-detail-label">
                <Mail size={14} strokeWidth={1.5} /> Email
              </span>
              <span className="profile-detail-val profile-detail-val-mono">{user?.email}</span>
            </div>
          </div>

          <div className="profile-actions">
            <button
              onClick={handleLogout}
              className="profile-logout-btn"
            >
              <LogOut size={16} strokeWidth={1.5} />
              <span>Sign out</span>
            </button>
          </div>
        </div>

        {/* 1-Click Backup & Restore Card */}
        <div className="glass-card profile-backup-card">
          <div className="profile-backup-header">
            <div className="profile-backup-icon-wrapper">
              <Database size={16} />
            </div>
            <div>
              <h2 className="profile-backup-title">Data Backup & Restore</h2>
              <p className="profile-backup-sub">Full data ownership with zero lock-in</p>
            </div>
          </div>

          <p className="profile-backup-desc">
            Download an offline JSON snapshot of all your transactions, or restore from a previous backup file.
          </p>

          <div className="profile-backup-btns">
            {/* Download Backup */}
            <button
              onClick={handleDownloadBackup}
              disabled={downloading}
              className="profile-backup-download-btn"
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
              style={{ display: 'none' }}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={restoring}
              className="glass-card-subtle profile-backup-restore-btn"
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

          <div className="profile-backup-footer">
            <ShieldCheck size={14} className="profile-backup-shield-icon" />
            <span>Encrypted transmission with PostgreSQL Row-Level Security</span>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;