import React from 'react';
import Layout from '../components/Layout';
import ImportStatement from '../components/ImportStatement';
import { useNavigate } from 'react-router-dom';

const Import = () => {
  const navigate = useNavigate();
  return (
    <Layout>
      <h2 className="text-2xl font-bold mb-2 text-gray-800">Import Bank Statement</h2>
      <p className="text-sm text-gray-500 mb-6">Supports SBI Excel (.xlsx) statements with optional password protection.</p>
      <div className="max-w-md">
        <ImportStatement onImportDone={() => navigate('/transactions')} />
      </div>
    </Layout>
  );
};

export default Import;