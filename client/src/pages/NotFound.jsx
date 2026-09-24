import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';

const NotFound = () => {
  return (
    <Layout>
      <SEO
        title="404 - Page Not Found"
        description="The page you are looking for doesn't exist or has been moved."
        path="/404"
      />
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-12">
        <div className="glass-card p-8 sm:p-12 max-w-lg w-full flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl glass-card-subtle text-accent flex items-center justify-center mb-6 border border-accent/20 shadow-sm">
            <FileQuestion size={34} strokeWidth={1.75} />
          </div>

          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-accent mb-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
            404 Error
          </span>
          <h1 className="text-3xl font-bold text-ink-900 dark:text-ink-50 mb-3 tracking-tight">
            Page not found
          </h1>
          <p className="text-sm text-ink-600 dark:text-ink-300 max-w-sm mb-8 leading-relaxed">
            Sorry, we couldn’t find the page you’re looking for. It may have been moved, deleted, or the URL might be incorrect.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <Link
              to="/dashboard"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold glass-btn-primary w-full sm:w-auto"
            >
              <Home size={15} />
              <span>Go to Dashboard</span>
            </Link>
            <Link
              to="/transactions"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold glass-btn w-full sm:w-auto"
            >
              <ArrowLeft size={15} />
              <span>View Transactions</span>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
