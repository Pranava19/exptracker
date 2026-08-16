import React, { useState } from 'react';
import axios from '../api/axios';
import Toast from './Toast';
import { useToast } from '../hooks/useToast';
import { FileUp, Loader2, CheckCircle2, Lock } from 'lucide-react';

const inputCls = 'w-full border border-ink-100 dark:border-[#2C2C28] rounded-md px-3 py-2 text-sm text-ink-900 dark:text-ink-50 bg-white dark:bg-[#252522] focus:outline-none focus:border-accent transition-colors';

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
    <div className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-card p-6 shadow-sm">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      
      <div className="flex items-center gap-2 mb-4">
        <FileUp size={18} strokeWidth={1.5} className="text-accent" />
        <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-ink-700 dark:text-ink-200">Import Bank Statement</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-ink-700 dark:text-ink-200 block mb-1.5">Statement File (.pdf, .xlsx)</label>
          <div className="border border-dashed border-ink-200 dark:border-[#2C2C28] rounded-card p-4 text-center bg-ink-50/50 dark:bg-[#252522]/50 hover:bg-ink-50 transition-colors cursor-pointer relative">
            <input
              type="file"
              accept=".xlsx,.xls,.pdf"
              tabIndex={-1}
              style={{ caretColor: 'transparent' }}
              onChange={e => setFile(e.target.files[0])}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <FileUp size={24} strokeWidth={1.5} className="mx-auto text-ink-700 dark:text-ink-200 opacity-50 mb-1" />
            <p className="text-xs font-medium text-ink-900 dark:text-ink-50">
              {file ? file.name : 'Click or drag bank statement file here'}
            </p>
            <p className="text-[10px] text-ink-700 dark:text-ink-200 opacity-60 mt-0.5">Supports SBI PDF & Excel statements (Max 10MB)</p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-ink-700 dark:text-ink-200 flex items-center gap-1">
              <Lock size={12} strokeWidth={1.5} />
              <span>Password Protection</span>
            </label>
            <span className="text-[10px] text-ink-700 dark:text-ink-200 opacity-60">(Optional)</span>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter file password if protected"
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-ink-700 dark:text-ink-200 opacity-60 hover:opacity-100"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {loading && (
          <div className="py-2 space-y-1.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-ink-900 dark:text-ink-50 font-medium">{stepText}</span>
              <span className="text-accent font-semibold">{progress}%</span>
            </div>
            <div className="h-1.5 bg-ink-100 dark:bg-[#2C2C28] rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={loading || !file}
          className="w-full bg-accent hover:bg-accent-dark text-white py-2.5 rounded-md text-xs font-semibold disabled:opacity-40 flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} strokeWidth={1.5} />}
          <span>{loading ? 'Processing Statement...' : 'Import Statement'}</span>
        </button>
      </div>
    </div>
  );
};

export default ImportStatement;