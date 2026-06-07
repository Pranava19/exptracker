import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import Layout from '../components/Layout';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { SkeletonRow } from '../components/Skeleton';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Salary', 'Freelance', 'Other'];
const MODES = ['UPI', 'Card', 'Cash', 'Net Banking', 'Other'];

const inputCls = [
  'w-full rounded-lg px-3 py-2 text-sm transition-colors',
  'bg-white dark:bg-[#1E2A3B]',
  'border border-gray-200 dark:border-[#252D3D]',
  'text-gray-800 dark:text-gray-200',
  'placeholder-gray-400 dark:placeholder-[#475569]',
  'focus:outline-none focus:border-blue-400 dark:focus:border-blue-500',
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
  const m = desc.match(/UPI\/(?:DR|CR)\/\d+\/([^\/]+)\//);
  if (m) return m[1].trim();
  return '—';
};

const TxRow = ({ tx, onEdit, onDelete, onInlineUpdate }) => {
  const payee = tx.payee || extractPayee(tx.description);
  return (
    <tr className="border-b border-gray-50 dark:border-[#1A2235] hover:bg-gray-50 dark:hover:bg-[#1A2235] transition-colors group">
      <td className="py-3 pl-5 pr-4 text-[12px] text-gray-400 dark:text-[#475569] tabular-nums whitespace-nowrap">{tx.date.slice(0, 10)}</td>
      <td className="py-3 pr-4 text-[12px] text-gray-600 dark:text-gray-400 max-w-[260px]">
        <span className="block truncate" title={tx.description}>{tx.description || '—'}</span>
      </td>
      <td className="py-3 pr-4 text-[13px] font-medium text-gray-800 dark:text-[#CBD5E1] max-w-[120px] truncate">{payee}</td>
      <td className="py-3 pr-4">
        <select value={tx.category} onChange={e => onInlineUpdate(tx.id, 'category', e.target.value)}
          className="text-[12px] border border-gray-100 dark:border-[#252D3D] rounded-md px-2 py-1 bg-white dark:bg-[#1E2A3B] text-gray-600 dark:text-gray-400 focus:outline-none focus:border-blue-400 transition-colors">
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </td>
      <td className="py-3 pr-4">
        <select value={tx.mode || 'Other'} onChange={e => onInlineUpdate(tx.id, 'mode', e.target.value)}
          className="text-[12px] border border-gray-100 dark:border-[#252D3D] rounded-md px-2 py-1 bg-white dark:bg-[#1E2A3B] text-gray-600 dark:text-gray-400 focus:outline-none focus:border-blue-400 transition-colors">
          {MODES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </td>
      <td className="py-3 pr-4">
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${tx.type === 'income' ? 'bg-emerald-50 dark:bg-[#064E3B] text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-[#450A0A] text-red-600 dark:text-red-300'}`}>
          {tx.type}
        </span>
      </td>
      <td className={`py-3 pr-4 text-[13px] font-bold text-right tabular-nums ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
        {tx.type === 'income' ? '+' : '−'}₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </td>
      <td className="py-3 pl-2 pr-5">
        <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(tx)} className="text-[12px] font-medium text-blue-500 hover:text-blue-700 dark:hover:text-blue-300">Edit</button>
          <button onClick={() => onDelete(tx.id)} className="text-[12px] font-medium text-gray-400 dark:text-[#475569] hover:text-red-500 dark:hover:text-red-400">Delete</button>
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

  const sortIcon = (field) =>
    sort.field === field
      ? <i className={`ti ${sort.order === 'asc' ? 'ti-chevron-up' : 'ti-chevron-down'} ml-1`} style={{ fontSize: 11 }} aria-hidden="true" />
      : <i className="ti ti-selector ml-1" style={{ fontSize: 11, opacity: 0.3 }} aria-hidden="true" />;

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

  // Year summary — uses all transactions regardless of filter
  const currentYear = new Date().getFullYear();
  const yearTxs = transactions.filter(tx => new Date(tx.date).getFullYear() === currentYear);
  const yearIncome  = yearTxs.filter(tx => tx.type === 'income').reduce((s, tx) => s + Number(tx.amount), 0);
  const yearExpense = yearTxs.filter(tx => tx.type === 'expense').reduce((s, tx) => s + Number(tx.amount), 0);
  const yearSavings = yearIncome - yearExpense;

  const thCls = 'pb-3 pr-4 text-left text-[10px] font-semibold text-gray-400 dark:text-[#475569] uppercase tracking-[0.6px] cursor-pointer select-none hover:text-gray-600 dark:hover:text-gray-300 transition-colors';
  const thNoCls = 'pb-3 pr-4 text-left text-[10px] font-semibold text-gray-400 dark:text-[#475569] uppercase tracking-[0.6px]';
  const rowProps = { onEdit: handleEdit, onDelete: handleDelete, onInlineUpdate: handleInlineUpdate };

  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      {/* Year summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white dark:bg-[#161B27] border border-gray-100 dark:border-[#252D3D] rounded-xl px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.6px] text-gray-400 dark:text-[#475569] mb-1">{currentYear} Income</p>
          <p className="text-[15px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            ₹{yearIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-white dark:bg-[#161B27] border border-gray-100 dark:border-[#252D3D] rounded-xl px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.6px] text-gray-400 dark:text-[#475569] mb-1">{currentYear} Expense</p>
          <p className="text-[15px] font-bold tabular-nums text-red-500 dark:text-red-400">
            ₹{yearExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-white dark:bg-[#161B27] border border-gray-100 dark:border-[#252D3D] rounded-xl px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.6px] text-gray-400 dark:text-[#475569] mb-1">Net Savings</p>
          <p className={`text-[15px] font-bold tabular-nums ${yearSavings >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500 dark:text-red-400'}`}>
            ₹{Math.abs(yearSavings).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
          All Transactions
          <span className="ml-2 text-[12px] font-normal text-gray-400 dark:text-[#475569]">{sorted.length}</span>
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border border-gray-200 dark:border-[#252D3D] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1E2A3B] transition-colors">
            <i className="ti ti-download" style={{ fontSize: 13 }} aria-hidden="true" />
            Export
          </button>
          <button onClick={() => { setShowForm(f => !f); if (editId) cancelEdit(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors">
            <i className="ti ti-plus" style={{ fontSize: 13 }} aria-hidden="true" />
            Add transaction
          </button>
        </div>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="rounded-xl bg-white dark:bg-[#161B27] border border-gray-100 dark:border-[#252D3D] p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
              {editId ? 'Edit transaction' : 'New transaction'}
            </p>
            <button onClick={cancelEdit} className="text-gray-400 dark:text-[#475569] hover:text-gray-600 dark:hover:text-gray-300">
              <i className="ti ti-x" style={{ fontSize: 15 }} aria-hidden="true" />
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
            <div className="flex gap-2 mt-3">
              <button type="submit" disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors">
                {submitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {editId ? 'Update' : 'Add'}
              </button>
              <button type="button" onClick={cancelEdit}
                className="px-4 py-2 rounded-lg text-[13px] font-medium border border-gray-200 dark:border-[#252D3D] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1E2A3B] transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl bg-white dark:bg-[#161B27] border border-gray-100 dark:border-[#252D3D] p-4 mb-5">
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
            <label className="text-[10px] text-gray-400 dark:text-[#475569] mb-1 font-medium">From</label>
            <input type="date" value={filter.start_date} onChange={e => setFilter({ ...filter, start_date: e.target.value })} className={inputCls} />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] text-gray-400 dark:text-[#475569] mb-1 font-medium">To</label>
            <input type="date" value={filter.end_date} onChange={e => setFilter({ ...filter, end_date: e.target.value })} className={inputCls} />
          </div>
          <button onClick={() => setFilter({ type: '', category: '', start_date: '', end_date: '' })}
            className="self-end flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium border border-gray-200 dark:border-[#252D3D] text-gray-500 dark:text-[#64748B] hover:bg-gray-50 dark:hover:bg-[#1E2A3B] transition-colors">
            <i className="ti ti-x" style={{ fontSize: 12 }} aria-hidden="true" />
            Clear
          </button>
        </div>
      </div>

      {/* Transaction list */}
      <div className="rounded-xl bg-white dark:bg-[#161B27] border border-gray-100 dark:border-[#252D3D] overflow-hidden">

        {/* Mobile */}
        <div className="md:hidden">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse flex justify-between">
                  <div className="space-y-1.5">
                    <div className="h-3 bg-gray-100 dark:bg-[#1E2A3B] rounded w-36" />
                    <div className="h-2.5 bg-gray-100 dark:bg-[#1E2A3B] rounded w-24" />
                  </div>
                  <div className="h-3 bg-gray-100 dark:bg-[#1E2A3B] rounded w-16" />
                </div>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-[#475569]">
              <i className="ti ti-inbox mb-2" style={{ fontSize: 32 }} aria-hidden="true" />
              <p className="text-[13px]">No transactions found</p>
            </div>
          ) : (
            Object.entries(grouped)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([date, txs]) => (
                <div key={date}>
                  <div className="px-4 py-2 bg-gray-50 dark:bg-[#0D1117] border-y border-gray-50 dark:border-[#1A2235]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.7px] text-gray-400 dark:text-[#334155]">
                      {formatGroupLabel(date)}
                    </p>
                  </div>
                  {txs.map(tx => {
                    const payee = tx.payee || extractPayee(tx.description);
                    return (
                      <div key={tx.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-[#1A2235] last:border-0">
                        <div className="min-w-0 flex-1 mr-3">
                          <p className="text-[13px] font-medium text-gray-800 dark:text-[#CBD5E1] truncate">
                            {payee !== '—' ? payee : tx.description}
                          </p>
                          <p className="text-[11px] text-gray-400 dark:text-[#475569] mt-0.5 truncate max-w-[200px]" title={tx.description}>
                            {tx.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <select value={tx.category} onChange={e => handleInlineUpdate(tx.id, 'category', e.target.value)}
                              className="text-[11px] border border-gray-100 dark:border-[#252D3D] rounded px-1.5 py-0.5 bg-white dark:bg-[#1E2A3B] text-gray-500 dark:text-[#64748B] focus:outline-none">
                              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <span className="text-[11px] text-gray-400 dark:text-[#475569]">· {tx.mode || 'Other'}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <p className={`text-[13px] font-bold tabular-nums ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {tx.type === 'income' ? '+' : '−'}₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                          <div className="flex gap-2">
                            <button onClick={() => handleEdit(tx)} className="text-[11px] text-blue-500 font-medium">Edit</button>
                            <button onClick={() => handleDelete(tx.id)} className="text-[11px] text-red-400 font-medium">Delete</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
          )}
        </div>

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          {loading ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 dark:border-[#1A2235]">
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
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-[#475569]">
              <i className="ti ti-inbox mb-2" style={{ fontSize: 36 }} aria-hidden="true" />
              <p className="text-[13px]">No transactions found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-[#1A2235]">
                  <th className={thCls} onClick={() => toggleSort('date')}>Date {sortIcon('date')}</th>
                  <th className={thNoCls} style={{ minWidth: 180 }}>Description</th>
                  <th className={thNoCls} style={{ minWidth: 100 }}>Payee</th>
                  <th className={thNoCls}>Category</th>
                  <th className={thNoCls}>Mode</th>
                  <th className={thCls} onClick={() => toggleSort('type')}>Type {sortIcon('type')}</th>
                  <th className={`${thCls} text-right`} onClick={() => toggleSort('amount')}>Amount {sortIcon('amount')}</th>
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
                              <div className="px-5 py-2 bg-gray-50 dark:bg-[#0D1117] border-y border-gray-100 dark:border-[#1A2235]">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.7px] text-gray-400 dark:text-[#334155]">
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