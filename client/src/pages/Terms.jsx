import React from 'react';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import { FileText, AlertTriangle, UserCheck, Scale } from 'lucide-react';

const Terms = () => {
  return (
    <Layout>
      <SEO
        title="Terms of Service - ExpTracker"
        description="Read the terms and conditions for using ExpTracker personal finance and expense tracking web application."
        path="/terms"
      />
      <div className="max-w-3xl mx-auto py-4 space-y-6 text-ink-800 dark:text-ink-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-ink-50">Terms of Service</h1>
          <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">Last updated: September 2026</p>
        </div>

        <div className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-2xl p-6 shadow-sm space-y-6 text-sm leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-ink-900 dark:text-ink-50 flex items-center gap-2">
              <FileText size={18} className="text-accent" />
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using ExpTracker, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-ink-900 dark:text-ink-50 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              2. Financial Advice Disclaimer
            </h2>
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-xs leading-relaxed font-medium">
              ExpTracker is an informational, self-directed financial management and budgeting tool. ExpTracker does not provide certified financial, investment, legal, accounting, or tax advice. All calculations, categorizations, and summaries are generated for organizational convenience only. Consult a certified financial planner or tax professional before making significant financial decisions.
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-ink-900 dark:text-ink-50 flex items-center gap-2">
              <UserCheck size={18} className="text-accent" />
              3. User Accounts & Responsibilities
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate transaction records and notify us immediately of any unauthorized use or security compromise.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-ink-900 dark:text-ink-50 flex items-center gap-2">
              <Scale size={18} className="text-accent" />
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
