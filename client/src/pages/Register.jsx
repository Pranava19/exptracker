import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from '../api/axios';
import SEO from '../components/SEO';
import { User, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';

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
    <div className="min-h-screen bg-ink-50 dark:bg-ink-900 flex items-center justify-center p-4">
      <SEO
        title="Create Free Account - Personal Expense Tracker"
        description="Create a free ExpTracker account today. Track your money, organize expenses, parse bank statements, and gain financial clarity."
        path="/register"
      />
      <main className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/login" className="inline-flex items-center">
            <h1 className="font-bold text-2xl text-ink-900 dark:text-ink-50">
              Exp<span className="text-accent">Tracker</span>
            </h1>
          </Link>
          <p className="text-xs text-ink-700 dark:text-ink-200 opacity-60 mt-1">Create your personal account</p>
        </div>

        <div className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-card p-6 shadow-sm">
          {error && (
            <div className="mb-4 p-3 rounded-md bg-negative/10 border border-negative/20 text-negative text-xs">
              {error}
            </div>
          )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-ink-900 dark:text-ink-50 block mb-1.5 flex items-center gap-1.5">
                    <User size={14} strokeWidth={1.5} className="text-ink-700 dark:text-ink-200" />
                    <span>Full Name</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                    className="w-full rounded-md px-3 py-2 text-xs border border-ink-100 dark:border-[#2C2C28] bg-white dark:bg-[#252522] text-ink-900 dark:text-ink-50 focus:outline-none focus:border-accent"
                    placeholder="Your full name"
                  />
                </div>
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
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      required
                      className="w-full rounded-md px-3 py-2 text-xs border border-ink-100 dark:border-[#2C2C28] bg-white dark:bg-[#252522] text-ink-900 dark:text-ink-50 focus:outline-none focus:border-accent pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-700 dark:text-ink-200 opacity-60 hover:opacity-100 p-0.5 cursor-pointer"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-accent hover:bg-accent-dark text-white rounded-md py-2.5 text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors mt-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  <span>{loading ? 'Creating account...' : 'Create account'}</span>
                </button>
              </form>
              <p className="text-xs text-center mt-5 text-ink-700 dark:text-ink-200 opacity-70">
                Already have an account?{' '}
                <Link to="/login" className="text-accent font-semibold hover:underline">Sign in</Link>
              </p>
        </div>
      </main>
    </div>
  );
};

export default Register;