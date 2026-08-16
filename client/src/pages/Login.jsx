import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from '../api/axios';
import { Lock, Mail, Loader2, Send, CheckCircle2 } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isVerifiedParam = searchParams.get('verified');

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setUnverifiedEmail(null); setResendStatus(''); setLoading(true);
    try {
      const res = await axios.post('/auth/login', form);
      login(res.data.user);
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.unverified) {
        setError(err.response.data.message);
        setUnverifiedEmail(err.response.data.email || form.email);
      } else {
        setError(err.response?.data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    setResending(true);
    setResendStatus('');
    try {
      const res = await axios.post('/auth/resend-verification', { email: unverifiedEmail });
      setResendStatus(res.data.message || 'Verification link sent!');
    } catch (err) {
      setResendStatus(err.response?.data?.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/dashboard" className="inline-flex items-center font-bold text-2xl text-ink-900 dark:text-ink-50">
            <span>Exp<span className="text-accent">Tracker</span></span>
          </Link>
          <p className="text-xs text-ink-700 dark:text-ink-200 opacity-60 mt-1">Sign in to manage your finances</p>
        </div>

        <div className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-card p-6 shadow-sm">
          {isVerifiedParam && (
            <div className="mb-4 p-3 rounded-md bg-accent/10 border border-accent/20 text-accent text-xs flex items-center gap-2">
              <CheckCircle2 size={16} strokeWidth={1.5} />
              <span>Email verified successfully! You can now log in.</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-md bg-negative/10 border border-negative/20 text-negative text-xs space-y-2">
              <p>{error}</p>
              {unverifiedEmail && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="w-full bg-negative/20 hover:bg-negative/30 text-negative py-1.5 px-3 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  {resending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  <span>{resending ? 'Resending...' : 'Resend verification email'}</span>
                </button>
              )}
            </div>
          )}

          {resendStatus && (
            <div className="mb-4 p-3 rounded-md bg-accent/10 border border-accent/20 text-accent text-xs">
              {resendStatus}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-ink-900 dark:text-ink-50 block mb-1.5 flex items-center gap-1.5">
                <Mail size={14} strokeWidth={1.5} className="text-ink-700 dark:text-ink-200" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                className="w-full rounded-md px-3 py-2 text-xs border border-ink-100 dark:border-[#2C2C28] bg-white dark:bg-[#252522] text-ink-900 dark:text-ink-50 focus:outline-none focus:border-accent"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-900 dark:text-ink-50 block mb-1.5 flex items-center gap-1.5">
                <Lock size={14} strokeWidth={1.5} className="text-ink-700 dark:text-ink-200" />
                <span>Password</span>
              </label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                className="w-full rounded-md px-3 py-2 text-xs border border-ink-100 dark:border-[#2C2C28] bg-white dark:bg-[#252522] text-ink-900 dark:text-ink-50 focus:outline-none focus:border-accent"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-dark text-white rounded-md py-2.5 text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors mt-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>{loading ? 'Signing in...' : 'Sign in'}</span>
            </button>
          </form>
          <p className="text-xs text-center mt-5 text-ink-700 dark:text-ink-200 opacity-70">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent font-semibold hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;