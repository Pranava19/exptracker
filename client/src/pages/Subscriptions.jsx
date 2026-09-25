import React, { useState, useEffect, useCallback } from 'react';
import axios from '../api/axios';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { SkeletonRow } from '../components/Skeleton';
import {
  CalendarClock,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  CreditCard,
  DollarSign,
  TrendingUp,
  X,
  Loader2,
  Calendar
} from 'lucide-react';

const CATEGORIES = ['Bills & Utilities', 'Entertainment', 'Health', 'Transport', 'Shopping', 'Other'];
const FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'weekly', label: 'Weekly' },
];
const MODES = ['UPI', 'Card', 'Net Banking', 'Cash', 'Other'];

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Subscriptions = () => {
  const { toast, showToast, hideToast } = useToast();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loggingId, setLoggingId] = useState(null);

  const [form, setForm] = useState({
    name: '',
    amount: '',
    frequency: 'monthly',
    due_date: 1,
    category: 'Bills & Utilities',
    payment_mode: 'UPI',
    status: 'active',
  });

  const fetchSubscriptions = useCallback(async () => {
    try {
      const res = await axios.get('/subscriptions');
      setSubscriptions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load subscriptions', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const openAddModal = () => {
    setEditId(null);
    setForm({
      name: '',
      amount: '',
      frequency: 'monthly',
      due_date: 1,
      category: 'Bills & Utilities',
      payment_mode: 'UPI',
      status: 'active',
    });
    setModalOpen(true);
  };

  const openEditModal = (sub) => {
    setEditId(sub.id);
    setForm({
      name: sub.name,
      amount: sub.amount,
      frequency: sub.frequency || 'monthly',
      due_date: sub.due_date || 1,
      category: sub.category || 'Bills & Utilities',
      payment_mode: sub.payment_mode || 'UPI',
      status: sub.status || 'active',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Subscription name is required', 'error');
      return;
    }
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editId) {
        const res = await axios.put(`/subscriptions/${editId}`, form);
        setSubscriptions(prev => prev.map(s => s.id === editId ? res.data : s));
        showToast('Subscription updated');
      } else {
        const res = await axios.post('/subscriptions', form);
        setSubscriptions(prev => [...prev, res.data]);
        showToast('Subscription added');
      }
      setModalOpen(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save subscription', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete subscription "${name}"?`)) return;

    try {
      await axios.delete(`/subscriptions/${id}`);
      setSubscriptions(prev => prev.filter(s => s.id !== id));
      showToast('Subscription deleted');
    } catch (err) {
      showToast('Failed to delete subscription', 'error');
    }
  };

  const handleLogPayment = async (sub) => {
    setLoggingId(sub.id);
    try {
      const res = await axios.post(`/subscriptions/${sub.id}/log-payment`, {});
      showToast(`Logged ₹${sub.amount} payment for ${sub.name}`);
      window.dispatchEvent(new CustomEvent('tx-added', { detail: res.data.transaction }));
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to log payment', 'error');
    } finally {
      setLoggingId(null);
    }
  };

  // Compute metrics
  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const monthlyTotal = activeSubs.reduce((acc, s) => {
    const amt = Number(s.amount) || 0;
    if (s.frequency === 'yearly') return acc + amt / 12;
    if (s.frequency === 'weekly') return acc + (amt * 52) / 12;
    return acc + amt;
  }, 0);
  const yearlyTotal = monthlyTotal * 12;

  return (
    <Layout>
      <SEO
        title="Recurring Bills & Subscriptions"
        description="Track your monthly subscriptions, recurring bills, and renewal dates with ExpTracker."
        path="/subscriptions"
      />
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-900 dark:text-ink-50 flex items-center gap-2">
              <CalendarClock className="text-accent" size={24} />
              Recurring Bills & Subscriptions
            </h1>
            <p className="text-xs text-ink-600 dark:text-ink-300 mt-1">
              Keep track of recurring commitments, memberships, and billing dates
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add Subscription</span>
          </button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-ink-600 dark:text-ink-300 mb-2">
              <span>Monthly Recurring</span>
              <DollarSign size={16} className="text-accent opacity-80" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-ink-900 dark:text-ink-50">
              {fmt(monthlyTotal)}
            </div>
            <p className="text-[11px] text-ink-600 dark:text-ink-400 mt-1">Estimated monthly commitment</p>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-ink-600 dark:text-ink-300 mb-2">
              <span>Annual Projected</span>
              <TrendingUp size={16} className="text-positive opacity-80" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-ink-900 dark:text-ink-50">
              {fmt(yearlyTotal)}
            </div>
            <p className="text-[11px] text-ink-600 dark:text-ink-400 mt-1">Across 12 months</p>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-ink-600 dark:text-ink-300 mb-2">
              <span>Active Services</span>
              <CreditCard size={16} className="text-accent opacity-80" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-ink-900 dark:text-ink-50">
              {activeSubs.length}
            </div>
            <p className="text-[11px] text-ink-600 dark:text-ink-400 mt-1">
              {subscriptions.length - activeSubs.length > 0
                ? `${subscriptions.length - activeSubs.length} paused`
                : 'All in active tracking'}
            </p>
          </div>
        </div>

        {/* Subscription List */}
        <div className="glass-card rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-ink-100/60 dark:border-white/10 pb-3">
            <h2 className="text-sm font-bold text-ink-900 dark:text-ink-50">Your Recurring Subscriptions</h2>
            <span className="text-xs font-mono text-ink-600 dark:text-ink-300 opacity-70">
              {subscriptions.length} Total
            </span>
          </div>

          {loading ? (
            <div className="space-y-3 py-2">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-ink-100/50 dark:bg-white/5 border border-ink-100/60 dark:border-white/10 flex items-center justify-center mx-auto text-ink-500 dark:text-ink-400">
                <CalendarClock size={28} strokeWidth={1.5} />
              </div>
              <div className="max-w-xs mx-auto space-y-1">
                <p className="text-sm font-semibold text-ink-900 dark:text-ink-50">No Subscriptions Yet</p>
                <p className="text-xs text-ink-600 dark:text-ink-300 opacity-80">
                  Track recurring bills like Wi-Fi, Netflix, Spotify, Gym, or Rent to know your commitments in advance.
                </p>
              </div>
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors cursor-pointer"
              >
                <Plus size={15} /> Add First Subscription
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="glass-card-subtle p-4 rounded-xl border border-ink-100/60 dark:border-white/10 flex flex-col justify-between gap-3 hover:border-accent/30 transition-all shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50 truncate">
                          {sub.name}
                        </h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                          sub.status === 'active'
                            ? 'bg-positive/10 text-positive border border-positive/20'
                            : 'bg-ink-200/50 dark:bg-white/10 text-ink-600 dark:text-ink-300'
                        }`}>
                          {sub.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-ink-600 dark:text-ink-300">
                        <span className="px-2 py-0.5 rounded-md bg-ink-100/50 dark:bg-white/5 border border-ink-100/60 dark:border-white/10">
                          {sub.category}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar size={12} className="opacity-70" />
                          Due day {sub.due_date} of month
                        </span>
                        <span className="capitalize opacity-80">• {sub.payment_mode}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-mono text-base font-bold text-ink-900 dark:text-ink-50">
                        {fmt(sub.amount)}
                      </p>
                      <span className="text-[10px] font-mono text-ink-600 dark:text-ink-400 capitalize">
                        /{sub.frequency}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-ink-100/40 dark:border-white/5 text-xs">
                    <button
                      onClick={() => handleLogPayment(sub)}
                      disabled={loggingId === sub.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent font-semibold text-[11px] transition-colors cursor-pointer disabled:opacity-50"
                      title="Add a transaction for this subscription for today"
                    >
                      {loggingId === sub.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={13} />
                      )}
                      <span>Log Payment</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(sub)}
                        className="p-1.5 text-ink-600 dark:text-ink-300 hover:text-ink-900 dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        aria-label="Edit subscription"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(sub.id, sub.name)}
                        className="p-1.5 text-negative hover:bg-negative/10 rounded-lg transition-colors cursor-pointer"
                        aria-label="Delete subscription"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Subscription Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md glass-card border border-ink-100/60 dark:border-white/15 rounded-2xl shadow-2xl p-6 relative animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-ink-600 dark:text-ink-300 hover:text-ink-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold">
                <CalendarClock size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-ink-900 dark:text-ink-50">
                  {editId ? 'Edit Subscription' : 'Add Subscription'}
                </h2>
                <p className="text-[11px] text-ink-600 dark:text-ink-300 opacity-80">
                  Track recurring service renewal
                </p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-ink-700 dark:text-ink-300 mb-1">
                  Subscription / Service Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Netflix, Spotify, Gym, Broadband"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  autoFocus
                  className="w-full px-3 py-2 glass-input text-xs text-ink-900 dark:text-ink-50 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-ink-700 dark:text-ink-300 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                    className="w-full px-3 py-2 glass-input text-xs font-mono font-bold text-ink-900 dark:text-ink-50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-ink-700 dark:text-ink-300 mb-1">
                    Frequency
                  </label>
                  <select
                    value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                    className="w-full px-3 py-2 glass-input text-xs text-ink-900 dark:text-ink-50 focus:outline-none cursor-pointer"
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f.value} value={f.value} className="bg-white dark:bg-slate-900">
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-ink-700 dark:text-ink-300 mb-1">
                    Due Day (1-31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 glass-input text-xs text-ink-900 dark:text-ink-50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-ink-700 dark:text-ink-300 mb-1">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 glass-input text-xs text-ink-900 dark:text-ink-50 focus:outline-none cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-white dark:bg-slate-900">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-ink-700 dark:text-ink-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={form.payment_mode}
                    onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}
                    className="w-full px-3 py-2 glass-input text-xs text-ink-900 dark:text-ink-50 focus:outline-none cursor-pointer"
                  >
                    {MODES.map((m) => (
                      <option key={m} value={m} className="bg-white dark:bg-slate-900">
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-ink-700 dark:text-ink-300 mb-1">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 glass-input text-xs text-ink-900 dark:text-ink-50 focus:outline-none cursor-pointer"
                  >
                    <option value="active" className="bg-white dark:bg-slate-900">Active</option>
                    <option value="paused" className="bg-white dark:bg-slate-900">Paused</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <span>{editId ? 'Update Subscription' : 'Save Subscription'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Subscriptions;
