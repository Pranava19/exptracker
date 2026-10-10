import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { detectMerchant } from '../utils/merchantDetector';
import { X, Sparkles, Loader2, Plus, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import './QuickAddModal.css';

import { CATEGORIES } from '../constants/categories';
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
    <div className="quick-add-overlay">
      <div 
        className="glass-card quick-add-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="quick-add-close-btn"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <div className="quick-add-header">
          <div className="quick-add-icon-badge">
            <Plus size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="quick-add-title">Quick Add Transaction</h2>
            <p className="quick-add-subtitle">Log spending or income instantly</p>
          </div>
        </div>

        {error && (
          <div className="quick-add-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="quick-add-form">
          {/* Income vs Expense Toggle */}
          <div className="quick-add-type-toggle">
            <button
              type="button"
              onClick={() => { setType('expense'); if (category === 'Salary' || category === 'Freelance') setCategory('Food'); }}
              className={`quick-add-type-btn ${
                type === 'expense' ? 'quick-add-type-btn-expense' : ''
              }`}
            >
              <ArrowDownLeft size={14} />
              Expense
            </button>
            <button
              type="button"
              onClick={() => { setType('income'); if (category === 'Food') setCategory('Salary'); }}
              className={`quick-add-type-btn ${
                type === 'income' ? 'quick-add-type-btn-income' : ''
              }`}
            >
              <ArrowUpRight size={14} />
              Income
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="quick-add-label">
              Amount (₹)
            </label>
            <div className="quick-add-amount-wrapper">
              <span className="quick-add-currency-symbol">
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
                className="glass-input quick-add-amount-input"
              />
            </div>
          </div>

          {/* Description & Live Auto-Rename Feature */}
          <div>
            <div className="quick-add-desc-header">
              <label className="quick-add-label">
                Description / UPI / Payee
              </label>
              <span className="quick-add-smart-tag">
                <Sparkles size={11} /> Smart Auto-Categorize
              </span>
            </div>
            <input
              type="text"
              placeholder="e.g. Swiggy, Uber, Metro, Amazon, UPI/DR/..."
              value={description}
              onChange={handleDescriptionChange}
              className="glass-input quick-add-input"
            />

            {/* Smart Merchant detection pill */}
            {detectedSuggestion && (
              <div 
                onClick={handleApplySuggestion}
                className="quick-add-suggestion-pill"
                title="Click to apply suggested merchant and category"
              >
                <div className="quick-add-suggestion-content">
                  <Sparkles size={13} style={{ flexShrink: 0 }} />
                  <span className="quick-add-suggestion-text">
                    Detected: <strong className="quick-add-suggestion-bold">{detectedSuggestion.payee}</strong> ({detectedSuggestion.category})
                  </span>
                </div>
                <span className="quick-add-suggestion-applied">Applied ✓</span>
              </div>
            )}
          </div>

          {/* Category & Payment Mode */}
          <div className="quick-add-grid-two">
            <div>
              <label className="quick-add-label">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="glass-input quick-add-input"
                style={{ cursor: 'pointer' }}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="quick-add-label">
                Payment Mode
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="glass-input quick-add-input"
                style={{ cursor: 'pointer' }}
              >
                {MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="quick-add-label">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="glass-input quick-add-input"
            />
          </div>

          {/* Submit Button */}
          <div style={{ paddingTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={loading}
              className="quick-add-submit-btn"
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
