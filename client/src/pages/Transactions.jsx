import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import * as XLSX from 'xlsx';
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

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Salary', 'Freelance', 'Other'];
const MODES = ['UPI', 'Card', 'Cash', 'Net Banking', 'Other'];

const inputCls = [
  'w-full glass-input px-3 py-2 text-xs transition-colors',
  'text-ink-900 dark:text-ink-50',
  'placeholder-ink-500 dark:placeholder-ink-400',
  'focus:outline-none',
  'dark:[color-scheme:dark]',
].join(' ');

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
    <div className="glass-card p-4 space-y-3 rounded-xl shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-900 dark:text-ink-50 truncate" title={payee !== '-' ? payee : (tx.description || tx.category)}>
            {payee !== '-' ? payee : (tx.description || tx.category)}
          </p>
          {tx.description && (
            <p className="text-xs text-ink-700 dark:text-ink-300 opacity-70 mt-0.5 line-clamp-2 break-words">
              {tx.description}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className={`font-mono text-sm sm:text-base font-bold ${tx.type === 'income' ? 'text-positive' : 'text-negative'}`}>
            {tx.type === 'income' ? '+' : '−'}₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] font-mono text-ink-600 dark:text-ink-400 opacity-70">
            {tx.date.slice(0, 10)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-ink-100/60 dark:border-white/10 text-xs">
        <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${tx.type === 'income' ? 'bg-positive/10 text-positive border border-positive/20' : 'bg-negative/10 text-negative border border-negative/20'}`}>
          {tx.type}
        </span>
        
        <select
          value={tx.category}
          onChange={e => onInlineUpdate(tx.id, 'category', e.target.value)}
          className="text-[11px] font-sans glass-input rounded-lg px-2 py-1 text-ink-900 dark:text-ink-50 focus:outline-none cursor-pointer"
        >
          {CATEGORIES.map(c => <option key={c} value={c} className="bg-white dark:bg-slate-900">{c}</option>)}
        </select>

        <select
          value={tx.mode || 'Other'}
          onChange={e => onInlineUpdate(tx.id, 'mode', e.target.value)}
          className="text-[11px] font-sans glass-input rounded-lg px-2 py-1 text-ink-900 dark:text-ink-50 focus:outline-none cursor-pointer"
        >
          {MODES.map(m => <option key={m} value={m} className="bg-white dark:bg-slate-900">{m}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => onEdit(tx)} className="p-1 text-xs font-medium text-accent hover:underline flex items-center gap-1 cursor-pointer">
            <Edit2 size={13} strokeWidth={1.5} />
            <span>Edit</span>
          </button>
          <button onClick={() => onDelete(tx.id)} className="p-1 text-xs font-medium text-negative hover:underline flex items-center gap-1 cursor-pointer">
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
    <tr className="border-b border-ink-100/60 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-colors group">
      <td className="py-3 pl-5 pr-4 text-xs font-mono text-ink-700 dark:text-ink-300 opacity-75 whitespace-nowrap">{tx.date.slice(0, 10)}</td>
      <td className="py-3 pr-4 text-xs text-ink-900 dark:text-ink-50 max-w-[260px]">
        <span className="block truncate" title={tx.description}>{tx.description || '-'}</span>
      </td>
      <td className="py-3 pr-4 text-xs font-medium text-ink-900 dark:text-ink-50 max-w-[120px] truncate">{payee}</td>
      <td className="py-3 pr-4">
        <select
          value={tx.category}
          onChange={e => onInlineUpdate(tx.id, 'category', e.target.value)}
          className="text-xs font-sans glass-input rounded-lg px-2 py-1 text-ink-900 dark:text-ink-50 focus:outline-none cursor-pointer"
        >
          {CATEGORIES.map(c => <option key={c} value={c} className="bg-white dark:bg-slate-900">{c}</option>)}
        </select>
      </td>
      <td className="py-3 pr-4">
        <select
          value={tx.mode || 'Other'}
          onChange={e => onInlineUpdate(tx.id, 'mode', e.target.value)}
          className="text-xs font-sans glass-input rounded-lg px-2 py-1 text-ink-900 dark:text-ink-50 focus:outline-none cursor-pointer"
        >
          {MODES.map(m => <option key={m} value={m} className="bg-white dark:bg-slate-900">{m}</option>)}
        </select>
      </td>
      <td className="py-3 pr-4">
        <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${tx.type === 'income' ? 'bg-positive/10 text-positive border border-positive/20' : 'bg-negative/10 text-negative border border-negative/20'}`}>
          {tx.type}
        </span>
      </td>
      <td className={`py-3 pr-4 font-mono text-xs font-bold text-right ${tx.type === 'income' ? 'text-positive' : 'text-negative'}`}>
        {tx.type === 'income' ? '+' : '−'}₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </td>
      <td className="py-3 pl-2 pr-5">
        <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
          <button onClick={() => onEdit(tx)} className="text-xs font-medium text-accent hover:underline cursor-pointer">Edit</button>
          <button onClick={() => onDelete(tx.id)} className="text-xs font-medium text-negative hover:underline cursor-pointer">Delete</button>
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

  const fetchAll = async () => {
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
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAll(); }, [filter]);

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

  const thCls = 'pb-3 pr-4 text-left text-[10px] font-mono font-semibold text-ink-700 dark:text-ink-200 uppercase tracking-wider cursor-pointer select-none hover:text-ink-900 dark:hover:text-white transition-colors';
  const thNoCls = 'pb-3 pr-4 text-left text-[10px] font-mono font-semibold text-ink-700 dark:text-ink-200 uppercase tracking-wider opacity-75';
  const rowProps = { onEdit: handleEdit, onDelete: handleDelete, onInlineUpdate: handleInlineUpdate };

  return (
    <Layout>
      <SEO
        title="Transactions - Filter, Search & Export Ledger"
        description="View, filter, edit, and export your personal transactions to CSV. Filter by category, payment mode, date range, or transaction type."
        path="/transactions"
      />
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="glass-card p-4 rounded-xl">
          <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-ink-700 dark:text-ink-300 opacity-60 mb-1">{currentYear} Income</p>
          <p className="font-mono text-base font-semibold text-positive">
            ₹{yearIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="glass-card p-4 rounded-xl">
          <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-ink-700 dark:text-ink-300 opacity-60 mb-1">{currentYear} Expense</p>
          <p className="font-mono text-base font-semibold text-negative">
            ₹{yearExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="glass-card p-4 rounded-xl">
          <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-ink-700 dark:text-ink-300 opacity-60 mb-1">Net Savings</p>
          <p className={`font-mono text-base font-semibold ${yearSavings >= 0 ? 'text-accent' : 'text-negative'}`}>
            ₹{Math.abs(yearSavings).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <h1 className="text-base font-semibold text-ink-900 dark:text-ink-50 tracking-tight flex items-center gap-2">
          All Transactions
          <span className="text-xs font-mono font-normal text-ink-700 dark:text-ink-300 opacity-60">({sorted.length})</span>
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="glass-btn flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50"
            title="Export all transactions from start date till today as an Excel (.xlsx) spreadsheet"
          >
            {exporting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet size={14} strokeWidth={1.5} className="text-emerald-500" />
                <span>Export Excel</span>
              </>
            )}
          </button>
          <button
            onClick={() => { setShowForm(f => !f); if (editId) cancelEdit(); }}
            className="glass-btn-primary fixed sm:static bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:bottom-auto right-4 sm:right-auto z-40 sm:z-auto shadow-lg sm:shadow-sm rounded-full sm:rounded-xl px-4 sm:px-3.5 py-3 sm:py-1.5 flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <Plus size={15} strokeWidth={2} />
            <span>Add transaction</span>
          </button>
        </div>
      </div>

      {showForm && (
        <div className="glass-card p-4 sm:p-5 mb-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-ink-900 dark:text-ink-50">
              {editId ? 'Edit transaction' : 'New transaction'}
            </h2>
            <button onClick={cancelEdit} className="text-ink-700 dark:text-ink-200 hover:text-ink-900 cursor-pointer">
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <select name="type" value={form.type} onChange={handleChange} className={inputCls}>
                <option value="expense" className="bg-white dark:bg-slate-900">Expense</option>
                <option value="income" className="bg-white dark:bg-slate-900">Income</option>
              </select>
              <select name="mode" value={form.mode} onChange={handleChange} className={inputCls}>
                {MODES.map(m => <option key={m} value={m} className="bg-white dark:bg-slate-900">{m}</option>)}
              </select>
              <select name="category" value={form.category} onChange={handleChange} className={inputCls}>
                {CATEGORIES.map(c => <option key={c} value={c} className="bg-white dark:bg-slate-900">{c}</option>)}
              </select>
              <input type="number" name="amount" placeholder="Amount" value={form.amount} onChange={handleChange} required className={inputCls} />
              <input type="text" name="description" placeholder="Description" value={form.description} onChange={handleChange} className={inputCls} />
              <input type="date" name="date" value={form.date} onChange={handleChange} required className={inputCls} />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                disabled={submitting}
                className="glass-btn-primary flex-1 sm:flex-none justify-center flex items-center gap-2 px-5 py-2 text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                <span>{editId ? 'Update' : 'Add'}</span>
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="glass-btn flex-1 sm:flex-none justify-center px-4 py-2 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-card p-4 mb-6 rounded-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <select value={filter.type} onChange={e => setFilter({ ...filter, type: e.target.value })} className={inputCls}>
            <option value="" className="bg-white dark:bg-slate-900 text-ink-900 dark:text-ink-50">All types</option>
            <option value="income" className="bg-white dark:bg-slate-900 text-ink-900 dark:text-ink-50">Income</option>
            <option value="expense" className="bg-white dark:bg-slate-900 text-ink-900 dark:text-ink-50">Expense</option>
          </select>
          <select value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })} className={inputCls}>
            <option value="" className="bg-white dark:bg-slate-900 text-ink-900 dark:text-ink-50">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c} className="bg-white dark:bg-slate-900 text-ink-900 dark:text-ink-50">{c}</option>)}
          </select>
          <div className="flex flex-col">
            <label className="text-[10px] font-mono text-ink-700 dark:text-ink-300 mb-1 select-none">From</label>
            <input type="date" value={filter.start_date} onChange={e => setFilter({ ...filter, start_date: e.target.value })} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-mono text-ink-700 dark:text-ink-300 mb-1 select-none">To</label>
            <input type="date" value={filter.end_date} onChange={e => setFilter({ ...filter, end_date: e.target.value })} className={inputCls} />
          </div>
          <button
            onClick={() => setFilter({ type: '', category: '', start_date: '', end_date: '' })}
            className="glass-btn sm:col-span-2 md:col-span-1 self-end flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium cursor-pointer w-full"
          >
            <X size={12} strokeWidth={1.5} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="md:hidden p-4 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse flex justify-between p-3.5 glass-card-subtle rounded-xl">
                  <div className="space-y-1.5">
                    <div className="h-3 bg-black/5 dark:bg-white/10 rounded w-32" />
                    <div className="h-2 bg-black/5 dark:bg-white/10 rounded w-20" />
                  </div>
                  <div className="h-3 bg-black/5 dark:bg-white/10 rounded w-14" />
                </div>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-12 text-center text-ink-700 dark:text-ink-200">
              <Inbox size={32} strokeWidth={1.5} className="mx-auto mb-2 opacity-50" />
              <p className="text-xs font-mono opacity-70">No transactions found</p>
            </div>
          ) : sort.field === 'date' ? (
            Object.entries(grouped)
              .sort(([a], [b]) => sort.order === 'desc' ? b.localeCompare(a) : a.localeCompare(b))
              .map(([date, txs]) => (
                <div key={date} className="space-y-2">
                  <div className="pt-2 pb-1 border-b border-ink-100/60 dark:border-white/10">
                    <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-300 opacity-75">
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
        <div className="hidden md:block overflow-x-auto">
          {loading ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink-100/60 dark:border-white/10">
                  <th className={thCls}>Date</th>
                  <th className={thNoCls}>Description</th>
                  <th className={thNoCls}>Payee</th>
                  <th className={thNoCls}>Category</th>
                  <th className={thNoCls}>Mode</th>
                  <th className={thNoCls}>Type</th>
                  <th className={`${thNoCls} text-right`}>Amount</th>
                  <th className={thNoCls}></th>
                </tr>
              </thead>
              <tbody>
                {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
              </tbody>
            </table>
          ) : sorted.length === 0 ? (
            <div className="py-16 text-center text-ink-700 dark:text-ink-200">
              <Inbox size={36} strokeWidth={1.5} className="mx-auto mb-2 opacity-50" />
              <p className="text-xs font-mono opacity-70">No transactions found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink-100/60 dark:border-white/10">
                  <th className={thCls} onClick={() => toggleSort('date')}>Date <ArrowUpDown size={11} className="inline ml-1 opacity-60" /></th>
                  <th className={thNoCls} style={{ minWidth: 180 }}>Description</th>
                  <th className={thNoCls} style={{ minWidth: 100 }}>Payee</th>
                  <th className={thNoCls}>Category</th>
                  <th className={thNoCls}>Mode</th>
                  <th className={thCls} onClick={() => toggleSort('type')}>Type <ArrowUpDown size={11} className="inline ml-1 opacity-60" /></th>
                  <th className={`${thCls} text-right`} onClick={() => toggleSort('amount')}>Amount <ArrowUpDown size={11} className="inline ml-1 opacity-60" /></th>
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
                            <td colSpan={8} className="px-0 py-0">
                              <div className="px-5 py-2 glass-card-subtle border-y border-ink-100/60 dark:border-white/10">
                                <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-ink-600 dark:text-ink-300 opacity-75">
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