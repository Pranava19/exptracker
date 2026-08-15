import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import Layout from '../components/Layout';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { SkeletonRow } from '../components/Skeleton';
import {
  Download,
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
  'w-full rounded-md px-3 py-2 text-xs transition-colors',
  'bg-white dark:bg-[#252522]',
  'border border-ink-100 dark:border-[#2C2C28]',
  'text-ink-900 dark:text-ink-50',
  'placeholder-ink-700 dark:placeholder-ink-200',
  'focus:outline-none focus:border-accent',
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
    return `Today — ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}`;
  if (d.getTime() === yesterday.getTime())
    return `Yesterday — ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}`;
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
};

const extractPayee = (desc) => {
  if (!desc) return '—';
  const m = desc.match(/UPI\/(?:DR|CR)\/\d+\/([^/]+)\//);
  if (m) return m[1].trim();
  return '—';
};

const TransactionCard = ({ tx, onEdit, onDelete, onInlineUpdate }) => {
  const payee = tx.payee || extractPayee(tx.description);
  return (
    <div className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-card p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-ink-900 dark:text-ink-50">{payee !== '—' ? payee : (tx.description || tx.category)}</p>
          <p className="text-xs text-ink-700 dark:text-ink-200 opacity-60 mt-0.5">{tx.description}</p>
        </div>
        <p className={`font-mono text-sm font-semibold ${tx.type === 'income' ? 'text-positive' : 'text-negative'}`}>
          {tx.type === 'income' ? '+' : '−'}₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-ink-100 dark:border-[#2C2C28] text-xs">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-sharp ${tx.type === 'income' ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'}`}>
            {tx.type}
          </span>
          <span className="text-ink-700 dark:text-ink-200 opacity-60 font-mono">{tx.date.slice(0, 10)}</span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(tx)} className="text-xs font-medium text-accent hover:underline flex items-center gap-1">
            <Edit2 size={12} strokeWidth={1.5} />
            <span>Edit</span>
          </button>
          <button onClick={() => onDelete(tx.id)} className="text-xs font-medium text-negative hover:underline flex items-center gap-1">
            <Trash2 size={12} strokeWidth={1.5} />
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
    <tr className="border-b border-ink-100 dark:border-[#2C2C28] hover:bg-ink-50/50 dark:hover:bg-[#252522]/50 transition-colors group">
      <td className="py-3 pl-5 pr-4 text-xs font-mono text-ink-700 dark:text-ink-200 opacity-75 whitespace-nowrap">{tx.date.slice(0, 10)}</td>
      <td className="py-3 pr-4 text-xs text-ink-900 dark:text-ink-50 max-w-[260px]">
        <span className="block truncate" title={tx.description}>{tx.description || '—'}</span>
      </td>
      <td className="py-3 pr-4 text-xs font-medium text-ink-900 dark:text-ink-50 max-w-[120px] truncate">{payee}</td>
      <td className="py-3 pr-4">
        <select
          value={tx.category}
          onChange={e => onInlineUpdate(tx.id, 'category', e.target.value)}
          className="text-xs font-sans border border-ink-100 dark:border-[#2C2C28] rounded-sharp px-2 py-1 bg-white dark:bg-[#252522] text-ink-900 dark:text-ink-50 focus:outline-none focus:border-accent"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </td>
      <td className="py-3 pr-4">
        <select
          value={tx.mode || 'Other'}
          onChange={e => onInlineUpdate(tx.id, 'mode', e.target.value)}
          className="text-xs font-sans border border-ink-100 dark:border-[#2C2C28] rounded-sharp px-2 py-1 bg-white dark:bg-[#252522] text-ink-900 dark:text-ink-50 focus:outline-none focus:border-accent"
        >
          {MODES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </td>
      <td className="py-3 pr-4">
        <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-sharp ${tx.type === 'income' ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'}`}>
          {tx.type}
        </span>
      </td>
      <td className={`py-3 pr-4 font-mono text-xs font-bold text-right ${tx.type === 'income' ? 'text-positive' : 'text-negative'}`}>
        {tx.type === 'income' ? '+' : '−'}₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </td>
      <td className="py-3 pl-2 pr-5">
        <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
          <button onClick={() => onEdit(tx)} className="text-xs font-medium text-accent hover:underline">Edit</button>
          <button onClick={() => onDelete(tx.id)} className="text-xs font-medium text-negative hover:underline">Delete</button>
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
    try {
      if (editId) {
        await axios.put(`/transactions/${editId}`, form);
        showToast('Transaction updated');
        setEditId(null);
      } else {
        await axios.post('/transactions', form);
        showToast('Transaction added');
      }
      setForm({ type: 'expense', category: 'Food', amount: '', description: '', date: '', mode: 'Other' });
      setShowForm(false);
      fetchAll();
    } catch (err) {
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
    try {
      await axios.delete(`/transactions/${id}`);
      showToast('Deleted');
      fetchAll();
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  const cancelEdit = () => {
    setEditId(null);
    setShowForm(false);
    setForm({ type: 'expense', category: 'Food', amount: '', description: '', date: '', mode: 'Other' });
  };

  const handleInlineUpdate = async (id, field, value) => {
    const tx = transactions.find(t => t.id === id);
    try {
      await axios.patch(`/transactions/${id}`, { category: tx.category, mode: tx.mode || 'Other', [field]: value });
      fetchAll();
    } catch {
      showToast('Update failed', 'error');
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

  const handleExport = () => {
    const headers = ['Date', 'Type', 'Category', 'Mode', 'Payee', 'Description', 'Amount'];
    const rows = sorted.map(tx => [
      tx.date.slice(0, 10), tx.type, tx.category, tx.mode || 'Other',
      `"${(tx.payee || extractPayee(tx.description)).replace(/"/g, '""')}"`,
      `"${(tx.description || '').replace(/"/g, '""')}"`,
      Number(tx.amount).toFixed(2),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      {/* Year Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-card p-4">
          <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-ink-700 dark:text-ink-200 opacity-60 mb-1">{currentYear} Income</p>
          <p className="font-mono text-base font-semibold text-positive">
            ₹{yearIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-card p-4">
          <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-ink-700 dark:text-ink-200 opacity-60 mb-1">{currentYear} Expense</p>
          <p className="font-mono text-base font-semibold text-negative">
            ₹{yearExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-card p-4">
          <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-ink-700 dark:text-ink-200 opacity-60 mb-1">Net Savings</p>
          <p className={`font-mono text-base font-semibold ${yearSavings >= 0 ? 'text-accent' : 'text-negative'}`}>
            ₹{Math.abs(yearSavings).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-base font-semibold text-ink-900 dark:text-ink-50 tracking-tight">
          All Transactions
          <span className="ml-2 text-xs font-mono font-normal text-ink-700 dark:text-ink-200 opacity-60">({sorted.length})</span>
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-ink-100 dark:border-[#2C2C28] text-ink-900 dark:text-ink-50 hover:bg-ink-50 dark:hover:bg-[#252522] transition-colors"
          >
            <Download size={14} strokeWidth={1.5} />
            <span>Export</span>
          </button>
          <button
            onClick={() => { setShowForm(f => !f); if (editId) cancelEdit(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-accent hover:bg-accent-dark text-white transition-colors"
          >
            <Plus size={14} strokeWidth={1.5} />
            <span>Add transaction</span>
          </button>
        </div>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="rounded-card bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-ink-900 dark:text-ink-50">
              {editId ? 'Edit transaction' : 'New transaction'}
            </h2>
            <button onClick={cancelEdit} className="text-ink-700 dark:text-ink-200 hover:text-ink-900">
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <select name="type" value={form.type} onChange={handleChange} className={inputCls}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <select name="mode" value={form.mode} onChange={handleChange} className={inputCls}>
                {MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select name="category" value={form.category} onChange={handleChange} className={inputCls}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" name="amount" placeholder="Amount" value={form.amount} onChange={handleChange} required className={inputCls} />
              <input type="text" name="description" placeholder="Description" value={form.description} onChange={handleChange} className={inputCls} />
              <input type="date" name="date" value={form.date} onChange={handleChange} required className={inputCls} />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-accent hover:bg-accent-dark disabled:opacity-50 text-white transition-colors"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                <span>{editId ? 'Update' : 'Add'}</span>
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 rounded-md text-xs font-medium border border-ink-100 dark:border-[#2C2C28] text-ink-700 dark:text-ink-200 hover:bg-ink-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-card bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <select value={filter.type} onChange={e => setFilter({ ...filter, type: e.target.value })} className={inputCls}>
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })} className={inputCls}>
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex flex-col">
            <label className="text-[10px] font-mono text-ink-700 dark:text-ink-200 mb-1">From</label>
            <input type="date" value={filter.start_date} onChange={e => setFilter({ ...filter, start_date: e.target.value })} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-mono text-ink-700 dark:text-ink-200 mb-1">To</label>
            <input type="date" value={filter.end_date} onChange={e => setFilter({ ...filter, end_date: e.target.value })} className={inputCls} />
          </div>
          <button
            onClick={() => setFilter({ type: '', category: '', start_date: '', end_date: '' })}
            className="self-end flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium border border-ink-100 dark:border-[#2C2C28] text-ink-700 dark:text-ink-200 hover:bg-ink-50 transition-colors"
          >
            <X size={12} strokeWidth={1.5} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Transaction List */}
      <div className="rounded-card bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] overflow-hidden">
        {/* Mobile View: Responsive Transaction Cards */}
        <div className="md:hidden p-4 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse flex justify-between p-3 bg-ink-50 dark:bg-ink-700 rounded-card">
                  <div className="space-y-1">
                    <div className="h-3 bg-ink-200 dark:bg-ink-900 rounded w-32" />
                    <div className="h-2 bg-ink-200 dark:bg-ink-900 rounded w-20" />
                  </div>
                  <div className="h-3 bg-ink-200 dark:bg-ink-900 rounded w-14" />
                </div>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-12 text-center text-ink-700 dark:text-ink-200">
              <Inbox size={32} strokeWidth={1.5} className="mx-auto mb-2 opacity-50" />
              <p className="text-xs font-mono opacity-70">No transactions found</p>
            </div>
          ) : (
            sorted.map(tx => <TransactionCard key={tx.id} tx={tx} {...rowProps} />)
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          {loading ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink-100 dark:border-[#2C2C28]">
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
                <tr className="border-b border-ink-100 dark:border-[#2C2C28]">
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
                              <div className="px-5 py-2 bg-ink-50 dark:bg-[#252522] border-y border-ink-100 dark:border-[#2C2C28]">
                                <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-ink-700 dark:text-ink-200 opacity-75">
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