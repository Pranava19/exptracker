import React from 'react';
import Layout from '../components/Layout';
import ImportStatement from '../components/ImportStatement';
import { useNavigate } from 'react-router-dom';

const Import = () => {
  const navigate = useNavigate();
  return (
    <Layout>
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