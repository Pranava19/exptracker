import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from '../api/axios';
import SEO from '../components/SEO';
import { User, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import './Register.css';

const Register = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await axios.post('/auth/register', form);
      if (res.data?.user) {
        login(res.data.user);
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page-wrapper">
      {/* Ambient background mesh & glowing blobs */}
      <div className="ambient-glow-wrapper" aria-hidden="true">
        <div className="ambient-blob-1" />
        <div className="ambient-blob-2" />
        <div className="ambient-blob-3" />
      </div>

      <SEO
        title="Create Free Account - Personal Expense Tracker"
        description="Create a free ExpTracker account today. Track your money, organize expenses, parse bank statements, and gain financial clarity."
        path="/register"
      />
      <main className="register-main-container">
        <div className="register-brand-header">
          <Link to="/login" className="register-brand-link">
            <h1 className="register-brand-logo">
              Exp<span className="register-brand-accent">Tracker</span>
            </h1>
          </Link>
          <p className="register-subtitle">Create your personal account</p>
        </div>

        <div className="glass-card register-card">
          {error && (
            <div className="register-error">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="register-form">
            <div>
              <label className="register-label">
                <User size={14} strokeWidth={1.5} className="register-label-icon" />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                className="glass-input register-input"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="register-label">
                <Mail size={14} strokeWidth={1.5} className="register-label-icon" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                className="glass-input register-input"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="register-label">
                <Lock size={14} strokeWidth={1.5} className="register-label-icon" />
                <span>Password</span>
              </label>
              <div className="register-password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  className="glass-input register-input register-input-password"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="register-password-toggle"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="glass-btn-primary register-submit-btn"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{loading ? 'Creating account...' : 'Create account'}</span>
            </button>
          </form>
          <p className="register-footer-text">
            Already have an account?{' '}
            <Link to="/login" className="register-footer-link">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Register;