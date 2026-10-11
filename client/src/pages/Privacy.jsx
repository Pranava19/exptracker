import React from 'react';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import { Shield, Lock, Eye, Database } from 'lucide-react';
import './Privacy.css';

const Privacy = () => {
  return (
    <Layout>
      <SEO
        title="Privacy Policy - Financial Data Protection"
        description="Learn how ExpTracker collects, encrypts, and protects your personal expense records and financial data."
        path="/privacy"
      />
      <div className="privacy-container">
        <div>
          <h1 className="privacy-title">Privacy Policy</h1>
          <p className="privacy-updated">Last updated: September 2026</p>
        </div>

        <div className="glass-card privacy-card">
          <section className="privacy-section">
            <h2 className="privacy-section-title">
              <Shield size={18} className="privacy-icon" />
              1. Our Financial Privacy Commitment
            </h2>
            <p>
              At ExpTracker, we treat your financial data with the highest degree of confidentiality. We do not sell, rent, or monetize your transaction data, spending habits, or personal information to third parties or advertisers.
            </p>
          </section>

          <section className="privacy-section">
            <h2 className="privacy-section-title">
              <Database size={18} className="privacy-icon" />
              2. Data We Collect
            </h2>
            <p>
              When you use ExpTracker, we store the transactions, amounts, categories, and dates you manually record or import via bank statements. All records are isolated strictly to your authenticated user account.
            </p>
          </section>

          <section className="privacy-section">
            <h2 className="privacy-section-title">
              <Lock size={18} className="privacy-icon" />
              3. Encryption & Storage
            </h2>
            <p>
              Your passwords are cryptographically hashed with salt rounds using industry-standard bcrypt algorithms. All network communications are transmitted via TLS/HTTPS, and authentication tokens are stored exclusively in HTTP-only, secure cookies.
            </p>
          </section>

          <section className="privacy-section">
            <h2 className="privacy-section-title">
              <Eye size={18} className="privacy-icon" />
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
