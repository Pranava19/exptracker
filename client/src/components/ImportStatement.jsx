import React, { useState } from 'react';
import axios from '../api/axios';
import Toast from './Toast';
import { useToast } from '../hooks/useToast';
import { FileUp, Loader2, CheckCircle2, Lock } from 'lucide-react';
import './ImportStatement.css';

const ImportStatement = ({ onImportDone }) => {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepText, setStepText] = useState('');
  const { toast, showToast, hideToast } = useToast();

  const handleImport = async () => {
    if (!file) { showToast('Select a file first', 'error'); return; }
    setLoading(true);
    setProgress(20);
    setStepText('Reading statement file...');

    try {
      const formData = new FormData();
      formData.append('password', password);
      formData.append('file', file);

      setTimeout(() => { setProgress(50); setStepText('Decrypting & parsing transactions...'); }, 300);
      setTimeout(() => { setProgress(80); setStepText('Extracting payees & auto-categorizing...'); }, 600);

      const res = await axios.post('/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setProgress(100);
      setStepText('Completed!');
      showToast(`Imported ${res.data.count} transactions, skipped ${res.data.skipped} duplicates`);
      setFile(null);
      setPassword('');
      if (onImportDone) onImportDone();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Import failed', 'error');
    } finally {
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
        setStepText('');
      }, 500);
    }
  };

  return (
    <div className="glass-card import-stmt-card">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      
      <div className="import-stmt-header">
        <FileUp size={18} strokeWidth={1.5} className="import-stmt-header-icon" />
        <h3 className="import-stmt-title">Import Bank Statement</h3>
      </div>

      <div className="import-stmt-body">
        <div>
          <label className="import-stmt-label">Statement File (.xlsx, .xls)</label>
          <div className="glass-card-subtle import-stmt-dropzone">
            <input
              type="file"
              accept=".xlsx,.xls"
              tabIndex={-1}
              onChange={e => setFile(e.target.files[0])}
              className="import-stmt-file-input"
            />
            <FileUp size={24} strokeWidth={1.5} className="import-stmt-upload-icon" />
            <p className="import-stmt-filename">
              {file ? file.name : 'Click or drag bank statement file here'}
            </p>
            <p className="import-stmt-hint">Supports Excel statements (.xlsx, .xls) (Max 15MB)</p>
          </div>
        </div>

        <div>
          <div className="import-stmt-pw-header">
            <label className="import-stmt-pw-label">
              <Lock size={12} strokeWidth={1.5} />
              <span>Password Protection</span>
            </label>
            <span className="import-stmt-pw-optional">(Optional)</span>
          </div>
          <div className="import-stmt-pw-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter file password if protected"
              className="glass-input import-stmt-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="import-stmt-pw-toggle"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {loading && (
          <div className="import-stmt-progress-section">
            <div className="import-stmt-progress-header">
              <span className="import-stmt-progress-step">{stepText}</span>
              <span className="import-stmt-progress-percent">{progress}%</span>
            </div>
            <div className="import-stmt-progress-track">
              <div
                className="import-stmt-progress-bar"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={loading || !file}
          className="glass-btn-primary import-stmt-submit-btn"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} strokeWidth={1.5} />}
          <span>{loading ? 'Processing Statement...' : 'Import Statement'}</span>
        </button>
      </div>
    </div>
  );
};

export default ImportStatement;