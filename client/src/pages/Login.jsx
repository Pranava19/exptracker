import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from '../api/axios';
import SEO from '../components/SEO';
import { Lock, Mail, Loader2, Eye, EyeOff } from 'lucide-react';
import './Login.css';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await axios.post('/auth/login', form);
      login(res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      {/* Ambient background mesh & glowing blobs */}
      <div className="ambient-glow-wrapper" aria-hidden="true">
        <div className="ambient-blob-1" />
        <div className="ambient-blob-2" />
        <div className="ambient-blob-3" />
      </div>

      <SEO
        title="Sign In to ExpTracker - Finance Account Login"
        description="Sign in to your ExpTracker account to access your personal expense dashboard, transactions ledger, bank statement parser, and reports."
        path="/login"
      />
      <main className="login-main-container">
        <div className="login-brand-header">
          <Link to="/dashboard" className="login-brand-link">
            <h1 className="login-brand-logo">
              Exp<span className="login-brand-accent">Tracker</span>
            </h1>
          </Link>
          <p className="login-subtitle">Sign in to manage your finances</p>
        </div>

        <div className="glass-card login-card">
          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div>
              <label className="login-label">
                <Mail size={14} strokeWidth={1.5} className="login-label-icon" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                className="glass-input login-input"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="login-label">
                <Lock size={14} strokeWidth={1.5} className="login-label-icon" />
                <span>Password</span>
              </label>
              <div className="login-password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  className="glass-input login-input login-input-password"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-password-toggle"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="glass-btn-primary login-submit-btn"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{loading ? 'Signing in...' : 'Sign in'}</span>
            </button>
          </form>
          <p className="login-footer-text">
            Don't have an account?{' '}
            <Link to="/register" className="login-footer-link">Create one</Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;