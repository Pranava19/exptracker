import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from '../api/axios';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing verification link.');
      return;
    }

    const verify = async () => {
      try {
        const res = await axios.get(`/auth/verify-email?token=${token}`);
        setStatus('success');
        setMessage(res.data.message || 'Email verified successfully!');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed or link expired.');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/login" className="inline-flex items-center font-bold text-2xl text-ink-900 dark:text-ink-50">
            <span>Exp<span className="text-accent">Tracker</span></span>
          </Link>
          <p className="text-xs text-ink-700 dark:text-ink-200 opacity-60 mt-1">Account Verification</p>
        </div>

        <div className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-card p-6 shadow-sm text-center">
          {status === 'verifying' && (
            <div className="py-8 space-y-3">
              <Loader2 size={32} className="animate-spin mx-auto text-accent" />
              <p className="text-xs font-mono text-ink-700 dark:text-ink-200">Verifying your email address...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-accent/10 text-accent mx-auto flex items-center justify-center">
                <CheckCircle2 size={28} strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">Email Verified!</h2>
                <p className="text-xs text-ink-700 dark:text-ink-200 opacity-80 mt-1">{message}</p>
              </div>
              <Link
                to="/login"
                className="w-full inline-block bg-accent hover:bg-accent-dark text-white rounded-md py-2.5 text-xs font-semibold transition-colors mt-2"
              >
                Sign In to Your Account
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="py-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-negative/10 text-negative mx-auto flex items-center justify-center">
                <XCircle size={28} strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">Verification Failed</h2>
                <p className="text-xs text-negative mt-1">{message}</p>
              </div>

              <div className="pt-2 border-t border-ink-100 dark:border-[#2C2C28] space-y-3">
                <Link
                  to="/login"
                  className="w-full inline-block bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] text-ink-900 dark:text-ink-50 hover:bg-ink-50 rounded-md py-2 text-xs font-medium transition-colors"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
