import React from 'react';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import ImportStatement from '../components/ImportStatement';
import { useNavigate } from 'react-router-dom';

const Import = () => {
  const navigate = useNavigate();
  return (
    <Layout>
      <SEO
        title="Import Bank Statement - SBI PDF & Excel Parser"
        description="Upload PDF and Excel bank statements (.pdf, .xlsx). Automatically decrypt, extract payees, and categorize transactions effortlessly."
        path="/import"
      />
      <div className="max-w-xl mx-auto space-y-4">
        <div>
          <h1 className="text-base font-semibold text-ink-900 dark:text-ink-50">Import Bank Statement</h1>
          <p className="text-xs text-ink-700 dark:text-ink-200 opacity-60 mt-0.5">
            Upload PDF or Excel statements (.pdf, .xlsx). Supports password-protected files and auto-categorizes transactions.
          </p>
        </div>
        <ImportStatement onImportDone={() => navigate('/transactions')} />
      </div>
    </Layout>
  );
};

export default Import;