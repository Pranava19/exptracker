import React, { useState } from 'react';
import axios from '../api/axios';
import Toast from './Toast';
import { useToast } from '../hooks/useToast';

const inputCls = 'w-full border border-gray-200 rounded px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:border-gray-400 transition-colors';

const ImportStatement = ({ onImportDone }) => {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const handleImport = async () => {
    if (!file) { showToast('Select a file first', 'error'); return; }
    setLoading(true);
    try {
      const formData = new FormData();
formData.append('password', password);  // password FIRST
formData.append('file', file);           // file SECOND
      const res = await axios.post('/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast(`Imported ${res.data.count}, skipped ${res.data.skipped} duplicates`);
      setFile(null);
      setPassword('');
      onImportDone();
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded p-5">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-4">Import SBI statement</p>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">Excel or PDF file (.xlsx, .pdf)</label>
          <input
            type="file"
            accept=".xlsx,.xls,.pdf"
            onChange={e => setFile(e.target.files[0])}
            className="w-full text-sm border border-gray-200 rounded px-3 py-2 text-gray-600 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:bg-gray-100 file:text-gray-600 hover:file:bg-gray-200 cursor-pointer"
          />
          {file && <p className="text-xs text-gray-400 mt-1">{file.name}</p>}
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">Password <span className="text-gray-400">(leave empty if none)</span></label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="File password" className={inputCls} />
        </div>
        <button
          onClick={handleImport}
          disabled={loading}
          className="w-full bg-gray-900 text-white py-2 rounded text-sm font-medium hover:bg-gray-700 disabled:opacity-40 flex items-center justify-center gap-2 transition-colors"
        >
          {loading && <span className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />}
          {loading ? 'Importing...' : 'Import statement'}
        </button>
      </div>
    </div>
  );
};

export default ImportStatement;