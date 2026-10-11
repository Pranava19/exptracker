import React from 'react';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import ImportStatement from '../components/ImportStatement';
import { useNavigate } from 'react-router-dom';
import './Import.css';

const Import = () => {
  const navigate = useNavigate();
  return (
    <Layout>
      <SEO
        title="Import Bank Statement - Excel Parser"
        description="Upload Excel bank statements (.xlsx, .xls). Automatically decrypt, extract payees, and categorize transactions effortlessly."
        path="/import"
      />
      <div className="import-page-container">
        <div>
          <h1 className="import-page-title">Import Bank Statement</h1>
          <p className="import-page-subtitle">
            Upload Excel statements (.xlsx, .xls). Supports password-protected files and auto-categorizes transactions.
          </p>
        </div>
        <ImportStatement onImportDone={() => navigate('/transactions')} />
      </div>
    </Layout>
  );
};

export default Import;