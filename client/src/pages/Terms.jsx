import React from 'react';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import { FileText, AlertTriangle, UserCheck, Scale } from 'lucide-react';
import './Terms.css';

const Terms = () => {
  return (
    <Layout>
      <SEO
        title="Terms of Service - ExpTracker"
        description="Read the terms and conditions for using ExpTracker personal finance and expense tracking web application."
        path="/terms"
      />
      <div className="terms-container">
        <div>
          <h1 className="terms-title">Terms of Service</h1>
          <p className="terms-updated">Last updated: September 2026</p>
        </div>

        <div className="glass-card terms-card">
          <section className="terms-section">
            <h2 className="terms-section-title">
              <FileText size={18} className="terms-icon" />
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using ExpTracker, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this service.
            </p>
          </section>

          <section className="terms-section">
            <h2 className="terms-section-title">
              <AlertTriangle size={18} className="terms-icon-warn" />
              2. Financial Advice Disclaimer
            </h2>
            <div className="terms-disclaimer-box">
              ExpTracker is an informational, self-directed financial management and budgeting tool. ExpTracker does not provide certified financial, investment, legal, accounting, or tax advice. All calculations, categorizations, and summaries are generated for organizational convenience only. Consult a certified financial planner or tax professional before making significant financial decisions.
            </div>
          </section>

          <section className="terms-section">
            <h2 className="terms-section-title">
              <UserCheck size={18} className="terms-icon" />
              3. User Accounts & Responsibilities
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate transaction records and notify us immediately of any unauthorized use or security compromise.
            </p>
          </section>

          <section className="terms-section">
            <h2 className="terms-section-title">
              <Scale size={18} className="terms-icon" />
              4. Limitation of Liability
            </h2>
            <p>
              ExpTracker and its operators will not be held liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use the service, including data loss, calculation discrepancies, or financial losses incurred from budgeting decisions.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default Terms;
