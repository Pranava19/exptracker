import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from '../api/axios';

const inputCls = {
  width: '100%', border: '1px solid #E5E7EB', borderRadius: 8,
  padding: '10px 12px', fontSize: 14, color: '#1C1F26',
  outline: 'none', background: '#fff', transition: 'border-color 0.15s',
};

const Register = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await axios.post('/auth/register', form);
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F4F5F7' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div className="text-center mb-8">
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 26, color: '#1C1F26', letterSpacing: '-0.5px' }}>
            Exp<span style={{ color: '#4F8EF7' }}>Tracker</span>
          </span>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6 }}>Create your account</p>
        </div>

        <div className="rounded-xl p-7" style={{ background: '#fff', border: '1px solid #E8EAED' }}>
          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-lg" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <p style={{ fontSize: 13, color: '#DC2626' }}>{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Name</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required style={inputCls} placeholder="Your name" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required style={inputCls} placeholder="you@example.com" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Password</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required style={inputCls} placeholder="••••••••" />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2"
              style={{ background: '#1C1F26', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 16px', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, marginTop: 8 }}
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
          <p style={{ fontSize: 13, textAlign: 'center', marginTop: 20, color: '#9CA3AF' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#4F8EF7', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;