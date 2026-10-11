import React, { useState, useEffect, useCallback } from 'react';
import axios from '../api/axios';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { SkeletonRow } from '../components/Skeleton';
import {
  FileSpreadsheet,
  Plus,
  X,
  ArrowUpDown,
  Edit2,
  Trash2,
  Inbox,
  Loader2
} from 'lucide-react';
import './Transactions.css';

import { CATEGORIES } from '../constants/categories';
const MODES = ['UPI', 'Card', 'Cash', 'Net Banking', 'Other'];

const groupByDate = (txs) => {
  const groups = {};
  txs.forEach(tx => {
    const d = tx.date.slice(0, 10);
    if (!groups[d]) groups[d] = [];
    groups[d].push(tx);
  });
  return groups;
};

const formatGroupLabel = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  if (d.getTime() === today.getTime())
    return `Today, ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}`;
  if (d.getTime() === yesterday.getTime())
    return `Yesterday, ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}`;
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
};

const extractPayee = (desc) => {
  if (!desc) return '-';
  const m = desc.match(/UPI\/(?:DR|CR)\/\d+\/([^/]+)\//);
  if (m) return m[1].trim();
  return '-';
};

const TransactionCard = ({ tx, onEdit, onDelete, onInlineUpdate }) => {
  const payee = tx.payee || extractPayee(tx.description);
  return (
    <div className="glass-card tx-card">
      <div className="tx-card-header">
        <div className="tx-card-header-left">
          <p className="tx-card-payee" title={payee !== '-' ? payee : (tx.description || tx.category)}>
            {payee !== '-' ? payee : (tx.description || tx.category)}
          </p>
          {tx.description && (
            <p className="tx-card-desc">
              {tx.description}
            </p>
          )}
        </div>
        <div className="tx-card-header-right">
          <p className={`tx-card-amount ${tx.type === 'income' ? 'tx-amount-income' : 'tx-amount-expense'}`}>
            {tx.type === 'income' ? '+' : '−'}₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="tx-card-date">
            {tx.date.slice(0, 10)}
          </span>
        </div>
      </div>

      <div className="tx-card-meta">
        <span className={`tx-type-pill ${tx.type === 'income' ? 'tx-type-pill-income' : 'tx-type-pill-expense'}`}>
          {tx.type}
        </span>
        
        <select
          value={tx.category}
          onChange={e => onInlineUpdate(tx.id, 'category', e.target.value)}
          className="glass-input tx-inline-select"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={tx.mode || 'Other'}
          onChange={e => onInlineUpdate(tx.id, 'mode', e.target.value)}
          className="glass-input tx-inline-select"
        >
          {MODES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <div className="tx-card-actions">
          <button onClick={() => onEdit(tx)} className="tx-btn-edit">
            <Edit2 size={13} strokeWidth={1.5} />
            <span>Edit</span>
          </button>
          <button onClick={() => onDelete(tx.id)} className="tx-btn-delete">
            <Trash2 size={13} strokeWidth={1.5} />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const TxRow = ({ tx, onEdit, onDelete, onInlineUpdate }) => {
  const payee = tx.payee || extractPayee(tx.description);
  return (
    <tr className="tx-table-row">
      <td className="tx-cell-date">{tx.date.slice(0, 10)}</td>
      <td className="tx-cell-desc">
        <span title={tx.description}>{tx.description || '-'}</span>
      </td>
      <td className="tx-cell-payee">{payee}</td>
      <td className="tx-cell">
        <select
          value={tx.category}
          onChange={e => onInlineUpdate(tx.id, 'category', e.target.value)}
          className="glass-input tx-table-select"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </td>
      <td className="tx-cell">
        <select
          value={tx.mode || 'Other'}
          onChange={e => onInlineUpdate(tx.id, 'mode', e.target.value)}
          className="glass-input tx-table-select"
        >
          {MODES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </td>
      <td className="tx-cell">
        <span className={`tx-type-pill ${tx.type === 'income' ? 'tx-type-pill-income' : 'tx-type-pill-expense'}`}>
          {tx.type}
        </span>
      </td>
      <td className={`tx-cell-amount ${tx.type === 'income' ? 'tx-amount-income' : 'tx-amount-expense'}`}>
        {tx.type === 'income' ? '+' : '−'}₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </td>
      <td className="tx-cell-actions">
        <div className="tx-row-actions">
          <button onClick={() => onEdit(tx)} className="tx-row-action-btn tx-row-edit">Edit</button>
          <button onClick={() => onDelete(tx.id)} className="tx-row-action-btn tx-row-delete">Delete</button>
        </div>
      </td>
    </tr>
  );
};

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({ type: 'expense', category: 'Food', amount: '', description: '', date: '', mode: 'Other' });
  const [editId, setEditId] = useState(null);
  const [filter, setFilter] = useState({ type: '', category: '', start_date: '', end_date: '' });
  const [sort, setSort] = useState({ field: 'date', order: 'desc' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter.type) params.type = filter.type;
      if (filter.category) params.category = filter.category;
      if (filter.start_date) params.start_date = filter.start_date;
      if (filter.end_date) params.end_date = filter.end_date;
      const res = await axios.get('/transactions', { params });
      setTransactions(res.data);
    } catch {
      showToast('Failed to load transactions', 'error');
    } finally {
      setLoading(false);
    }
  }, [filter, showToast]);

  useEffect(() => {
    fetchAll();
    const handleTxAdded = () => { fetchAll(); };
    window.addEventListener('tx-added', handleTxAdded);
    return () => window.removeEventListener('tx-added', handleTxAdded);
  }, [fetchAll]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const previousSnapshot = [...transactions];

    try {
      if (editId) {
        const updatedItem = {
          ...transactions.find(t => t.id === editId),
          ...form,
          amount: Number(form.amount),
        };
        setTransactions(prev => prev.map(t => t.id === editId ? updatedItem : t));

        await axios.put(`/transactions/${editId}`, form);
        showToast('Transaction updated');
        setEditId(null);
      } else {
        const res = await axios.post('/transactions', form);
        showToast('Transaction added');
        const newTx = res.data && res.data.id ? res.data : { ...form, id: Date.now() };
        setTransactions(prev => [newTx, ...prev]);
      }
      setForm({ type: 'expense', category: 'Food', amount: '', description: '', date: '', mode: 'Other' });
      setShowForm(false);
    } catch (err) {
      setTransactions(previousSnapshot);
      showToast(err.response?.data?.message || 'Something went wrong', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (tx) => {
    setEditId(tx.id);
    setForm({
      type: tx.type,
      category: tx.category,
      amount: tx.amount,
      description: tx.description,
      date: tx.date.slice(0, 10),
      mode: tx.mode || 'Other',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    const previousSnapshot = [...transactions];
    setTransactions(prev => prev.filter(t => t.id !== id));
    try {
      await axios.delete(`/transactions/${id}`);
      showToast('Deleted');
    } catch {
      setTransactions(previousSnapshot);
      showToast('Failed to delete transaction, change reverted', 'error');
    }
  };

  const cancelEdit = () => {
    setEditId(null);
    setShowForm(false);
    setForm({ type: 'expense', category: 'Food', amount: '', description: '', date: '', mode: 'Other' });
  };

  const handleInlineUpdate = async (id, field, value) => {
    const previousSnapshot = [...transactions];
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    setTransactions(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    try {
      await axios.patch(`/transactions/${id}`, { category: tx.category, mode: tx.mode || 'Other', [field]: value });
    } catch {
      setTransactions(previousSnapshot);
      showToast('Update failed, changes reverted', 'error');
    }
  };

  const sorted = [...transactions].sort((a, b) => {
    let av = a[sort.field], bv = b[sort.field];
    if (sort.field === 'amount') { av = Number(av); bv = Number(bv); }
    if (sort.field === 'date') { av = new Date(av); bv = new Date(bv); }
    if (av < bv) return sort.order === 'asc' ? -1 : 1;
    if (av > bv) return sort.order === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (field) => setSort(p => ({ field, order: p.field === field && p.order === 'asc' ? 'desc' : 'asc' }));

  const handleExport = async () => {
    setExporting(true);
    try {
      // Fetch all user transactions from the start without screen filters
      const res = await axios.get('/transactions');
      const allTxs = Array.isArray(res.data) ? res.data : (res.data?.transactions || []);

      if (allTxs.length === 0) {
        showToast('No transactions found to export', 'error');
        return;
      }

      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const todayStr = new Date().toISOString().slice(0, 10);

      // Filter all records from the earliest start date up to today and sort chronologically
      const filteredTxs = allTxs
        .filter(tx => {
          if (!tx.date) return false;
          const txDate = new Date(tx.date);
          return txDate <= today;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      if (filteredTxs.length === 0) {
        showToast('No transactions recorded up to today', 'error');
        return;
      }

      const startDateStr = filteredTxs[0].date.slice(0, 10);

      // Calculate overall ledger totals
      const totalIncome = filteredTxs
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + Number(t.amount || 0), 0);
      const totalExpense = filteredTxs
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + Number(t.amount || 0), 0);
      const netSavings = totalIncome - totalExpense;

      // 1. Transactions Ledger Sheet
      const sheetData = filteredTxs.map((tx, idx) => ({
        '#': idx + 1,
        'Date': tx.date.slice(0, 10),
        'Type': (tx.type || 'expense').toUpperCase(),
        'Category': tx.category || 'Other',
        'Payment Mode': tx.mode || 'Other',
        'Payee': tx.payee || extractPayee(tx.description) || '-',
        'Description': tx.description || '-',
        'Amount (INR)': Number(Number(tx.amount || 0).toFixed(2)),
      }));

      const XLSX = await import('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(sheetData);

      // Format clean, comfortable column widths
      worksheet['!cols'] = [
        { wch: 6 },  // #
        { wch: 14 }, // Date
        { wch: 12 }, // Type
        { wch: 18 }, // Category
        { wch: 16 }, // Payment Mode
        { wch: 28 }, // Payee
        { wch: 40 }, // Description
        { wch: 16 }, // Amount (INR)
      ];

      // 2. Summary Overview Sheet
      const summaryData = [
        { 'Metric': 'Report Name', 'Value': 'ExpTracker All-Time Financial Ledger' },
        { 'Metric': 'Start Date', 'Value': startDateStr },
        { 'Metric': 'End Date (Today)', 'Value': todayStr },
        { 'Metric': 'Total Transactions', 'Value': filteredTxs.length },
        { 'Metric': 'Total Income (₹)', 'Value': Number(totalIncome.toFixed(2)) },
        { 'Metric': 'Total Expenses (₹)', 'Value': Number(totalExpense.toFixed(2)) },
        { 'Metric': 'Net Savings (₹)', 'Value': Number(netSavings.toFixed(2)) },
        { 'Metric': 'Export Date & Time', 'Value': new Date().toLocaleString('en-IN') },
      ];
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      summarySheet['!cols'] = [
        { wch: 26 },
        { wch: 38 },
      ];

      // Create workbook with both sheets
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'All Transactions');
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ledger Summary');

      // Export native .xlsx file
      const fileName = `ExpTracker_Transactions_${startDateStr}_to_${todayStr}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      showToast(`Exported ${filteredTxs.length} transactions to Excel!`);
    } catch (err) {
      console.error('Export error:', err);
      showToast('Failed to export Excel file', 'error');
    } finally {
      setExporting(false);
    }
  };

  const grouped = groupByDate(sorted);

  const currentYear = new Date().getFullYear();
  const yearTxs = transactions.filter(tx => new Date(tx.date).getFullYear() === currentYear);
  const yearIncome  = yearTxs.filter(tx => tx.type === 'income').reduce((s, tx) => s + Number(tx.amount), 0);
  const yearExpense = yearTxs.filter(tx => tx.type === 'expense').reduce((s, tx) => s + Number(tx.amount), 0);
  const yearSavings = yearIncome - yearExpense;

  const thCls = 'tx-th tx-th-clickable';
  const thNoCls = 'tx-th';
  const rowProps = { onEdit: handleEdit, onDelete: handleDelete, onInlineUpdate: handleInlineUpdate };

  return (
    <Layout>
      <SEO
        title="Transactions - Filter, Search & Export Ledger"
        description="View, filter, edit, and export your personal transactions to Excel (.xlsx). Filter by category, payment mode, date range, or transaction type."
        path="/transactions"
      />
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <div className="tx-summary-grid">
        <div className="glass-card tx-summary-card">
          <p className="tx-summary-label">{currentYear} Income</p>
          <p className="tx-summary-val tx-summary-val-positive">
            ₹{yearIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="glass-card tx-summary-card">
          <p className="tx-summary-label">{currentYear} Expense</p>
          <p className="tx-summary-val tx-summary-val-negative">
            ₹{yearExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="glass-card tx-summary-card">
          <p className="tx-summary-label">Net Savings</p>
          <p className={`tx-summary-val ${yearSavings >= 0 ? 'tx-summary-val-accent' : 'tx-summary-val-negative'}`}>
            ₹{Math.abs(yearSavings).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <div className="tx-header">
        <h1 className="tx-header-title">
          All Transactions
          <span className="tx-header-count">({sorted.length})</span>
        </h1>
        <div className="tx-header-actions">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="glass-btn tx-export-btn"
            title="Export all transactions from start date till today as an Excel (.xlsx) spreadsheet"
          >
            {exporting ? (
              <>
                <Loader2 size={14} className="tx-spinner" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet size={14} strokeWidth={1.5} className="tx-excel-icon" />
                <span>Export Excel</span>
              </>
            )}
          </button>
          <button
            onClick={() => { setShowForm(f => !f); if (editId) cancelEdit(); }}
            className="glass-btn-primary tx-add-btn"
          >
            <Plus size={15} strokeWidth={2} />
            <span>Add transaction</span>
          </button>
        </div>
      </div>

      {showForm && (
        <div className="glass-card tx-form-card">
          <div className="tx-form-header">
            <h2 className="tx-form-title">
              {editId ? 'Edit transaction' : 'New transaction'}
            </h2>
            <button onClick={cancelEdit} className="tx-form-close-btn">
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="tx-form-grid">
              <select name="type" value={form.type} onChange={handleChange} className="glass-input tx-input">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <select name="mode" value={form.mode} onChange={handleChange} className="glass-input tx-input">
                {MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select name="category" value={form.category} onChange={handleChange} className="glass-input tx-input">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" name="amount" placeholder="Amount" value={form.amount} onChange={handleChange} required className="glass-input tx-input" />
              <input type="text" name="description" placeholder="Description" value={form.description} onChange={handleChange} className="glass-input tx-input" />
              <input type="date" name="date" value={form.date} onChange={handleChange} required className="glass-input tx-input" />
            </div>
            <div className="tx-form-actions">
              <button
                type="submit"
                disabled={submitting}
                className="glass-btn-primary tx-form-submit-btn"
              >
                {submitting && <Loader2 size={14} className="tx-spinner" />}
                <span>{editId ? 'Update' : 'Add'}</span>
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="glass-btn tx-form-cancel-btn"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-card tx-filter-card">
        <div className="tx-filter-grid">
          <select value={filter.type} onChange={e => setFilter({ ...filter, type: e.target.value })} className="glass-input tx-input">
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })} className="glass-input tx-input">
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="tx-filter-date-group">
            <label className="tx-filter-date-label">From</label>
            <input type="date" value={filter.start_date} onChange={e => setFilter({ ...filter, start_date: e.target.value })} className="glass-input tx-input" />
          </div>
          <div className="tx-filter-date-group">
            <label className="tx-filter-date-label">To</label>
            <input type="date" value={filter.end_date} onChange={e => setFilter({ ...filter, end_date: e.target.value })} className="glass-input tx-input" />
          </div>
          <button
            onClick={() => setFilter({ type: '', category: '', start_date: '', end_date: '' })}
            className="glass-btn tx-filter-clear-btn"
          >
            <X size={12} strokeWidth={1.5} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="glass-card tx-list-card">
        <div className="tx-mobile-list">
          {loading ? (
            <div className="tx-mobile-skeleton-list">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="glass-card-subtle tx-mobile-skeleton-card tx-skeleton-pulse">
                  <div className="tx-skeleton-lines">
                    <div className="tx-skeleton-line tx-skeleton-line-title" />
                    <div className="tx-skeleton-line tx-skeleton-line-sub" />
                  </div>
                  <div className="tx-skeleton-line tx-skeleton-line-badge" />
                </div>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="tx-empty-state">
              <Inbox size={32} strokeWidth={1.5} className="tx-empty-icon" />
              <p className="tx-empty-text">No transactions found</p>
            </div>
          ) : sort.field === 'date' ? (
            Object.entries(grouped)
              .sort(([a], [b]) => sort.order === 'desc' ? b.localeCompare(a) : a.localeCompare(b))
              .map(([date, txs]) => (
                <div key={date} className="tx-mobile-date-group">
                  <div className="tx-mobile-date-header">
                    <p className="tx-mobile-date-text">
                      {formatGroupLabel(date)}
                    </p>
                  </div>
                  {txs.map(tx => <TransactionCard key={tx.id} tx={tx} {...rowProps} />)}
                </div>
              ))
          ) : (
            sorted.map(tx => <TransactionCard key={tx.id} tx={tx} {...rowProps} />)
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="tx-desktop-table-wrapper">
          {loading ? (
            <table className="tx-table">
              <thead>
                <tr className="tx-table-head-row">
                  <th className={thCls}>Date</th>
                  <th className={thNoCls}>Description</th>
                  <th className={thNoCls}>Payee</th>
                  <th className={thNoCls}>Category</th>
                  <th className={thNoCls}>Mode</th>
                  <th className={thNoCls}>Type</th>
                  <th className={`${thNoCls} tx-th-right`}>Amount</th>
                  <th className={thNoCls}></th>
                </tr>
              </thead>
              <tbody>
                {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
              </tbody>
            </table>
          ) : sorted.length === 0 ? (
            <div className="tx-empty-state">
              <Inbox size={36} strokeWidth={1.5} className="tx-empty-icon" />
              <p className="tx-empty-text">No transactions found</p>
            </div>
          ) : (
            <table className="tx-table">
              <thead>
                <tr className="tx-table-head-row">
                  <th className={thCls} onClick={() => toggleSort('date')}>Date <ArrowUpDown size={11} className="tx-sort-icon" /></th>
                  <th className={thNoCls} style={{ minWidth: 180 }}>Description</th>
                  <th className={thNoCls} style={{ minWidth: 100 }}>Payee</th>
                  <th className={thNoCls}>Category</th>
                  <th className={thNoCls}>Mode</th>
                  <th className={thCls} onClick={() => toggleSort('type')}>Type <ArrowUpDown size={11} className="tx-sort-icon" /></th>
                  <th className={`${thCls} tx-th-right`} onClick={() => toggleSort('amount')}>Amount <ArrowUpDown size={11} className="tx-sort-icon" /></th>
                  <th className={thNoCls}></th>
                </tr>
              </thead>
              <tbody>
                {sort.field === 'date'
                  ? Object.entries(grouped)
                      .sort(([a], [b]) => sort.order === 'desc' ? b.localeCompare(a) : a.localeCompare(b))
                      .map(([date, txs]) => (
                        <React.Fragment key={date}>
                          <tr>
                            <td colSpan={8} className="tx-table-date-cell">
                              <div className="glass-card-subtle tx-table-date-badge">
                                <p className="tx-table-date-text">
                                  {formatGroupLabel(date)}
                                </p>
                              </div>
                            </td>
                          </tr>
                          {txs.map(tx => <TxRow key={tx.id} tx={tx} {...rowProps} />)}
                        </React.Fragment>
                      ))
                  : sorted.map(tx => <TxRow key={tx.id} tx={tx} {...rowProps} />)
                }
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Transactions;