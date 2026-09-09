import React from 'react';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import { Shield, Lock, Eye, Database } from 'lucide-react';

const Privacy = () => {
  return (
    <Layout>
      <SEO
        title="Privacy Policy - Financial Data Protection"
        description="Learn how ExpTracker collects, encrypts, and protects your personal expense records and financial data."
        path="/privacy"
      />
      <div className="max-w-3xl mx-auto py-4 space-y-6 text-ink-800 dark:text-ink-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-ink-50">Privacy Policy</h1>
          <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">Last updated: September 2026</p>
        </div>

        <div className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-2xl p-6 shadow-sm space-y-6 text-sm leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-ink-900 dark:text-ink-50 flex items-center gap-2">
              <Shield size={18} className="text-accent" />
              1. Our Financial Privacy Commitment
            </h2>
            <p>
              At ExpTracker, we treat your financial data with the highest degree of confidentiality. We do not sell, rent, or monetize your transaction data, spending habits, or personal information to third parties or advertisers.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-ink-900 dark:text-ink-50 flex items-center gap-2">
              <Database size={18} className="text-accent" />
              2. Data We Collect
            </h2>
            <p>
              When you use ExpTracker, we store the transactions, amounts, categories, and dates you manually record or import via bank statements. All records are isolated strictly to your authenticated user account.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-ink-900 dark:text-ink-50 flex items-center gap-2">
              <Lock size={18} className="text-accent" />
              3. Encryption & Storage
            </h2>
            <p>
              Your passwords are cryptographically hashed with salt rounds using industry-standard bcrypt algorithms. All network communications are transmitted via TLS/HTTPS, and authentication tokens are stored exclusively in HTTP-only, secure cookies.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-ink-900 dark:text-ink-50 flex items-center gap-2">
              <Eye size={18} className="text-accent" />
              4. Analytics & Telemetry
            </h2>
            <p>
              We only collect privacy-conscious, non-identifying telemetry (e.g. pageview counts and interface performance) to maintain service reliability. Financial figures, payees, and personal notes are never transmitted to analytics providers.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default Privacy;
