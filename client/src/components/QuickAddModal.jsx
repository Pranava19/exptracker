import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { detectMerchant } from '../utils/merchantDetector';
import { X, Sparkles, Loader2, Plus, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Salary', 'Freelance', 'Other'];
const MODES = ['UPI', 'Card', 'Cash', 'Net Banking', 'Other'];

const QuickAddModal = ({ isOpen, onClose, onAdded }) => {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [payee, setPayee] = useState('');
  const [category, setCategory] = useState('Food');
  const [mode, setMode] = useState('UPI');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [detectedSuggestion, setDetectedSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setType('expense');
      setAmount('');
      setDescription('');
      setPayee('');
      setCategory('Food');
      setMode('UPI');
      setDate(new Date().toISOString().slice(0, 10));
      setDetectedSuggestion(null);
      setError('');
    }
  }, [isOpen]);

  const handleDescriptionChange = (e) => {
    const val = e.target.value;
    setDescription(val);

    const suggestion = detectMerchant(val);
    if (suggestion) {
      setDetectedSuggestion(suggestion);
      if (suggestion.category && CATEGORIES.includes(suggestion.category)) {
        setCategory(suggestion.category);
      }
      if (suggestion.payee && !payee) {
        setPayee(suggestion.payee);
      }
      if (suggestion.type) {
        setType(suggestion.type);
      }
    } else {
      setDetectedSuggestion(null);
    }
  };

  const handleApplySuggestion = () => {
    if (!detectedSuggestion) return;
    if (detectedSuggestion.payee) setPayee(detectedSuggestion.payee);
    if (detectedSuggestion.category && CATEGORIES.includes(detectedSuggestion.category)) {
      setCategory(detectedSuggestion.category);
    }
    if (detectedSuggestion.type) setType(detectedSuggestion.type);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        type,
        amount: parseFloat(Number(amount).toFixed(2)),
        category,
        description: description.trim(),
        payee: payee.trim() || undefined,
        date: new Date(date).toISOString(),
        mode,
      };

      const res = await axios.post('/transactions', payload);
      const newTx = res.data;

      // Broadcast globally so any mounted page updates instantly
      window.dispatchEvent(new CustomEvent('tx-added', { detail: newTx }));

      if (onAdded) {
        onAdded(newTx);
      }
      onClose();
    } catch (err) {
      console.error('Quick add error:', err);
      setError(err.response?.data?.message || 'Failed to add transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md glass-card border border-ink-100/60 dark:border-white/15 rounded-2xl shadow-2xl p-6 relative animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-ink-600 dark:text-ink-300 hover:text-ink-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold">
            <Plus size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-base font-bold text-ink-900 dark:text-ink-50">Quick Add Transaction</h2>
            <p className="text-[11px] text-ink-600 dark:text-ink-300 opacity-80">Log spending or income instantly</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-negative/10 border border-negative/20 text-negative text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Income vs Expense Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-ink-100/40 dark:bg-white/5 border border-ink-100/60 dark:border-white/10">
            <button
              type="button"
              onClick={() => { setType('expense'); if (category === 'Salary' || category === 'Freelance') setCategory('Food'); }}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                type === 'expense'
                  ? 'bg-negative text-white shadow-xs'
                  : 'text-ink-700 dark:text-ink-300 hover:text-ink-900 dark:hover:text-white'
              }`}
            >
              <ArrowDownLeft size={14} />
              Expense
            </button>
            <button
              type="button"
              onClick={() => { setType('income'); if (category === 'Food') setCategory('Salary'); }}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                type === 'income'
                  ? 'bg-positive text-white shadow-xs'
                  : 'text-ink-700 dark:text-ink-300 hover:text-ink-900 dark:hover:text-white'
              }`}
            >
              <ArrowUpRight size={14} />
              Income
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-700 dark:text-ink-300 mb-1">
              Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-ink-500 dark:text-ink-400">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                required
                className="w-full pl-8 pr-4 py-2.5 glass-input text-lg font-bold font-mono text-ink-900 dark:text-ink-50 focus:outline-none"
              />
            </div>
          </div>

          {/* Description & Live Auto-Rename Feature */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-ink-700 dark:text-ink-300">
                Description / UPI / Payee
              </label>
              <span className="text-[10px] text-accent flex items-center gap-1">
                <Sparkles size={11} /> Smart Auto-Categorize
              </span>
            </div>
            <input
              type="text"
              placeholder="e.g. Swiggy, Uber, Metro, Amazon, UPI/DR/..."
              value={description}
              onChange={handleDescriptionChange}
              className="w-full px-3 py-2 glass-input text-xs text-ink-900 dark:text-ink-50 focus:outline-none"
            />

            {/* Smart Merchant detection pill */}
            {detectedSuggestion && (
              <div 
                onClick={handleApplySuggestion}
                className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-accent/10 border border-accent/25 flex items-center justify-between text-[11px] text-accent font-medium cursor-pointer hover:bg-accent/15 transition-colors"
                title="Click to apply suggested merchant and category"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Sparkles size={13} className="shrink-0 animate-pulse text-accent" />
                  <span className="truncate">
                    Detected: <strong className="font-semibold text-ink-900 dark:text-white">{detectedSuggestion.payee}</strong> ({detectedSuggestion.category})
                  </span>
                </div>
                <span className="text-[10px] underline font-semibold ml-2 shrink-0">Applied ✓</span>
              </div>
            )}
          </div>

          {/* Category & Payment Mode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-ink-700 dark:text-ink-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 glass-input text-xs text-ink-900 dark:text-ink-50 focus:outline-none cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-white dark:bg-slate-900 text-ink-900 dark:text-ink-50">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ink-700 dark:text-ink-300 mb-1">
                Payment Mode
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full px-3 py-2 glass-input text-xs text-ink-900 dark:text-ink-50 focus:outline-none cursor-pointer"
              >
                {MODES.map((m) => (
                  <option key={m} value={m} className="bg-white dark:bg-slate-900 text-ink-900 dark:text-ink-50">
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-700 dark:text-ink-300 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 glass-input text-xs text-ink-900 dark:text-ink-50 focus:outline-none"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving Transaction...
                </>
              ) : (
                <>
                  <Plus size={16} strokeWidth={2.5} />
                  Add Transaction
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickAddModal;
