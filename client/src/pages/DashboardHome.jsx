import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import MonthlyChart from '../components/MonthlyChart';
import CategoryChart from '../components/CategoryChart';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { SkeletonChart } from '../components/Skeleton';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowUpRight,
  ChevronRight,
  Sparkles,
  Edit3,
  X,
  Check,
  Loader2
} from 'lucide-react';

const groupByDate = (txs) => {
  const groups = {};
  txs.slice(0, 8).forEach(tx => {
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
  if (d.getTime() === today.getTime()) return `Today, ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}`;
  if (d.getTime() === yesterday.getTime()) return `Yesterday, ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}`;
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
};

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtShort = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const DashboardHome = () => {
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ total_income: 0, total_expense: 0, balance: 0 });
  const [loading, setLoading] = useState(true);

  // Balance adjustment modal state
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [savingBalance, setSavingBalance] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchDashboardData = async () => {
    try {
      const [txRes, sumRes] = await Promise.all([
        axios.get('/transactions'),
        axios.get('/transactions/summary'),
      ]);
      setTransactions(txRes.data);
      setSummary(sumRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const openBalanceModal = () => {
    setBalanceInput(
      summary.starting_balance !== null && summary.starting_balance !== undefined
        ? String(summary.starting_balance)
        : String(summary.balance || '')
    );
    const defaultDate = summary.starting_balance_date
      ? new Date(summary.starting_balance_date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    setDateInput(defaultDate);
    setModalError('');
    setIsBalanceModalOpen(true);
  };

  const handleSaveBalance = async (e) => {
    e.preventDefault();
    setModalError('');

    if (balanceInput === '' || isNaN(Number(balanceInput))) {
      setModalError('Please enter a valid numeric balance amount.');
      return;
    }

    if (!dateInput) {
      setModalError('Please select the date this balance is accurate as of.');
      return;
    }

    setSavingBalance(true);
    try {
      const payload = {
        balance: parseFloat(Number(balanceInput).toFixed(2)),
        date: dateInput,
      };
      try {
        await axios.put('/profile/balance', payload);
      } catch (firstErr) {
        if (firstErr.response?.status === 404) {
          try {
            await axios.put('/balance', payload);
          } catch (secondErr) {
            if (secondErr.response?.status === 404) {
              await axios.put('/profile', payload);
            } else {
              throw secondErr;
            }
          }
        } else {
          throw firstErr;
        }
      }
      showToast('Available balance baseline updated successfully', 'success');
      setIsBalanceModalOpen(false);
      await fetchDashboardData();
    } catch (err) {
      console.error(err);
      setModalError(err.response?.data?.message || 'Failed to update balance. Please try again.');
    } finally {
      setSavingBalance(false);
    }
  };

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const firstName = user?.name ? user.name.split(' ')[0] : 'Friend';

  const monthTxs = transactions.filter(tx => {
    const d = new Date(tx.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  const monthExpenses = monthTxs.filter(tx => tx.type === 'expense');
  const biggestTx = monthExpenses.reduce((max, tx) =>
    Number(tx.amount) > Number(max?.amount || 0) ? tx : max, null);

  const daysElapsed = now.getDate();
  const totalMonthSpend = monthExpenses.reduce((s, tx) => s + Number(tx.amount), 0);
  const dailyAvg = daysElapsed > 0 ? totalMonthSpend / daysElapsed : 0;

  const payeeMap = {};
  transactions
    .filter(tx => tx.type === 'expense')
    .forEach(tx => {
      const name = tx.payee || (() => {
        const m = (tx.description || '').match(/UPI\/(?:DR|CR)\/\d+\/([^/]+)\//);
        return m ? m[1].trim() : (tx.description || 'Other');
      })();
      if (!payeeMap[name]) payeeMap[name] = 0;
      payeeMap[name] += Number(tx.amount);
    });

  const top5Payees = Object.entries(payeeMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const maxPayeeAmount = top5Payees[0]?.[1] || 1;

  const grouped = groupByDate(transactions);

  return (
    <Layout>
      <SEO
        title="Dashboard - Personal Money Overview"
        description="Track your total balance, monthly income, expenses, and latest transaction activity with ExpTracker."
        path="/dashboard"
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      {/* Human Dynamic Greeting Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-900 dark:text-ink-50">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-xs text-ink-600 dark:text-ink-300 mt-1">
            Here's your real-time financial snapshot for {now.toLocaleString('default', { month: 'long', year: 'numeric' })}.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-accent/10 text-accent glass-pill border-accent/20 select-none shadow-xs">
          <Sparkles size={14} /> Account Synchronized
        </div>
      </div>

      {/* Balance & Income/Expense Highlight Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-card md:col-span-2 p-6 sm:p-8 rounded-2xl flex flex-col justify-between relative overflow-hidden text-ink-900 dark:text-white border border-black/5 dark:border-white/10 shadow-lg">
          {/* Subtle atmospheric light inside hero card */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-accent/10 dark:bg-accent/15 rounded-full filter blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-accent/10 dark:bg-accent/25 text-accent dark:text-blue-300 backdrop-blur-md border border-accent/20 dark:border-white/10">
                <Wallet size={20} strokeWidth={2} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-ink-600 dark:text-slate-300 select-none">
                Available Balance
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openBalanceModal}
                className="glass-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-ink-800 dark:text-slate-200 hover:text-ink-900 dark:hover:text-white bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 border border-black/10 dark:border-white/15 transition-all cursor-pointer shadow-xs"
                title="Adjust your real-world bank balance baseline"
              >
                <Edit3 size={13} strokeWidth={2} />
                <span>Adjust</span>
              </button>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/30 backdrop-blur-sm">
                Live Balance
              </span>
            </div>
          </div>

          <div className="relative z-10 my-4">
            {loading ? (
              <div className="h-12 w-64 bg-ink-200/60 dark:bg-slate-800/80 animate-pulse rounded-xl" />
            ) : (
              <p className="font-mono text-4xl sm:text-5xl font-extrabold tracking-tight text-ink-900 dark:text-white drop-shadow-xs">
                {fmt(summary.balance)}
              </p>
            )}
            <p className="text-xs text-ink-600 dark:text-slate-400 mt-2 font-medium">Total liquid funds across your linked records</p>
            {summary.starting_balance_date && (
              <p className="text-[11px] text-ink-500 dark:text-slate-300/80 mt-1.5 flex items-center gap-1.5 font-mono">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
                Adjusted as of {new Date(summary.starting_balance_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="glass-card flex-1 p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-600 dark:text-ink-300 select-none">
                Money In
              </span>
              <div className="p-2 rounded-xl bg-positive/10 text-positive">
                <TrendingUp size={18} strokeWidth={2} />
              </div>
            </div>
            <p className="font-mono text-2xl font-bold text-positive">
              {loading ? '...' : fmt(summary.total_income)}
            </p>
            <p className="text-[11px] text-ink-500 dark:text-ink-400 mt-1">Total received this month</p>
          </div>

          <div className="glass-card flex-1 p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-600 dark:text-ink-300 select-none">
                Money Out
              </span>
              <div className="p-2 rounded-xl bg-negative/10 text-negative">
                <TrendingDown size={18} strokeWidth={2} />
              </div>
            </div>
            <p className="font-mono text-2xl font-bold text-negative">
              {loading ? '...' : fmt(summary.total_expense)}
            </p>
            <p className="text-[11px] text-ink-500 dark:text-ink-400 mt-1">Total spent this month</p>
          </div>
        </div>
      </div>

      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-ink-600 dark:text-ink-300 select-none">Daily Pace</span>
              <p className="font-mono text-xl font-bold text-ink-900 dark:text-ink-50 mt-1">{fmtShort(dailyAvg)}</p>
              <p className="text-[11px] text-ink-500 dark:text-ink-400 mt-0.5">Average spend per active day</p>
            </div>
            <div className="p-3 rounded-xl bg-accent/10 text-accent">
              <Calendar size={22} strokeWidth={2} />
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
            <div className="min-w-0 flex-1 mr-3">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-600 dark:text-ink-300 select-none">Biggest Splurge</span>
              {biggestTx ? (
                <>
                  <p className="font-mono text-xl font-bold text-negative mt-1">{fmt(biggestTx.amount)}</p>
                  <p className="text-[11px] font-semibold text-ink-700 dark:text-ink-200 truncate mt-0.5">
                    {(biggestTx.payee || biggestTx.description || '').slice(0, 30)} · {biggestTx.date.slice(0, 10)}
                  </p>
                </>
              ) : (
                <p className="text-xs text-ink-500 dark:text-ink-400 mt-2">No expenses logged yet this month</p>
              )}
            </div>
            <div className="p-3 rounded-xl bg-negative/10 text-negative flex-shrink-0">
              <ArrowUpRight size={22} strokeWidth={2} />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Activity Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100/60 dark:border-white/10">
              <div>
                <h2 className="text-sm font-bold text-ink-900 dark:text-ink-50">Latest Activity</h2>
                <p className="text-[11px] text-ink-500 dark:text-ink-400">Your recent debit and credit entries</p>
              </div>
              <Link to="/transactions" className="text-xs font-semibold text-accent hover:text-accent-dark flex items-center gap-1 cursor-pointer">
                <span>View All Activity</span>
                <ChevronRight size={14} strokeWidth={2} />
              </Link>
            </div>

            {loading ? (
              <div className="p-6 space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse flex justify-between">
                    <div className="space-y-1.5">
                      <div className="h-3.5 bg-black/5 dark:bg-white/10 rounded-lg w-40" />
                      <div className="h-2.5 bg-black/5 dark:bg-white/10 rounded-lg w-24" />
                    </div>
                    <div className="h-4 bg-black/5 dark:bg-white/10 rounded-lg w-20" />
                  </div>
                ))}
              </div>
            ) : Object.keys(grouped).length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-xs font-semibold text-ink-600 dark:text-ink-300">All clear! No spend or income logged yet.</p>
                <Link to="/transactions" className="text-xs text-accent font-bold mt-2 inline-block">Add your first transaction</Link>
              </div>
            ) : (
              Object.entries(grouped)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, txs]) => (
                  <div key={date}>
                    <div className="px-6 py-2.5 glass-card-subtle border-y border-ink-100/60 dark:border-white/10">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-600 dark:text-ink-300">
                        {formatGroupLabel(date)}
                      </p>
                    </div>
                    {txs.map(tx => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between px-6 py-3.5 border-b border-ink-100/50 dark:border-white/5 last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-colors"
                      >
                        <div className="min-w-0 flex-1 mr-4">
                          <p className="text-sm font-semibold text-ink-900 dark:text-ink-50 truncate">{tx.payee || tx.description || tx.category}</p>
                          <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{tx.category} · {tx.mode || 'Other'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${tx.type === 'income' ? 'bg-positive/10 text-positive border border-positive/20' : 'bg-negative/10 text-negative border border-negative/20'}`}>
                            {tx.type === 'income' ? 'Income' : 'Expense'}
                          </span>
                          <p className={`font-mono text-sm font-bold ${tx.type === 'income' ? 'text-positive' : 'text-negative'}`}>
                            {tx.type === 'income' ? '+' : '−'}₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
            )}
          </div>

          {/* Top Payees Card */}
          {!loading && top5Payees.length > 0 && (
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between pb-3 border-b border-ink-100/60 dark:border-white/10 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50">Where Your Money Goes</h3>
                  <p className="text-[11px] text-ink-500 dark:text-ink-400">Top merchants by total spend</p>
                </div>
                <span className="text-xs font-semibold text-ink-500 dark:text-ink-400">All Time</span>
              </div>
              <div className="space-y-4">
                {top5Payees.map(([name, amount], i) => (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-3">
                        <span className="font-mono text-xs font-bold text-ink-400 w-4">{i + 1}</span>
                        <p className="text-xs font-semibold text-ink-900 dark:text-ink-50 truncate">{name}</p>
                      </div>
                      <p className="font-mono text-xs font-bold text-negative">{fmtShort(amount)}</p>
                    </div>
                    <div className="ml-6 h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-300"
                        style={{ width: `${(amount / maxPayeeAmount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Charts Column */}
        <div className="space-y-6">
          <div className="glass-card rounded-2xl overflow-hidden p-5">
            <div className="pb-3 border-b border-ink-100/60 dark:border-white/10 mb-3">
              <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50">Monthly Cash Flow</h3>
              <p className="text-[11px] text-ink-500 dark:text-ink-400">Income vs Expenses trend</p>
            </div>
            {loading ? <SkeletonChart /> : <MonthlyChart transactions={transactions} />}
          </div>

          <div className="glass-card rounded-2xl overflow-hidden p-5">
            <div className="pb-3 border-b border-ink-100/60 dark:border-white/10 mb-3">
              <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50">Spending by Category</h3>
              <p className="text-[11px] text-ink-500 dark:text-ink-400">Category breakdown</p>
            </div>
            {loading ? <SkeletonChart /> : <CategoryChart transactions={transactions} />}
          </div>
        </div>
      </div>

      {/* Manual Balance Adjustment Modal */}
      {isBalanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-slide-in">
          <div className="glass-modal max-w-md w-full p-6 sm:p-7 space-y-5 border border-white/20 dark:border-white/10 shadow-2xl relative text-ink-900 dark:text-ink-50">
            <div className="flex items-center justify-between pb-3 border-b border-ink-100/60 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-accent/20 text-accent">
                  <Wallet size={18} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink-900 dark:text-ink-50">Adjust Available Balance</h3>
                  <p className="text-xs text-ink-600 dark:text-ink-300">Calibrate against your actual real-world bank account</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBalanceModalOpen(false)}
                className="text-ink-600 dark:text-ink-300 hover:text-ink-900 dark:hover:text-ink-50 p-1 rounded-lg transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBalance} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1.5">
                  Actual Bank Balance (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={balanceInput}
                  onChange={(e) => setBalanceInput(e.target.value)}
                  placeholder="e.g. 25000.00"
                  required
                  className="w-full glass-input px-3.5 py-2.5 text-sm font-mono text-ink-900 dark:text-ink-50"
                  autoFocus
                />
                <p className="text-[11px] text-ink-600 dark:text-ink-300 mt-1">
                  Accepts decimal amounts. Can be negative in case of credit overdraft.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1.5">
                  As of Date *
                </label>
                <input
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  required
                  className="w-full glass-input px-3 py-2 text-xs font-mono text-ink-900 dark:text-ink-50 dark:[color-scheme:dark]"
                />
                <p className="text-[11px] text-ink-600 dark:text-ink-300 mt-1">
                  Transactions recorded on or after this date will adjust from this baseline amount.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/20 text-xs text-ink-800 dark:text-ink-200 space-y-1">
                <p className="font-semibold text-accent flex items-center gap-1.5">
                  <Sparkles size={14} /> Confirmation Summary
                </p>
                <p className="text-[11px] leading-relaxed">
                  Your baseline balance will be set to{' '}
                  <strong className="font-mono text-ink-900 dark:text-ink-50">
                    {balanceInput && !isNaN(Number(balanceInput)) ? fmt(balanceInput) : '₹0.00'}
                  </strong>{' '}
                  as of <strong className="font-mono text-ink-900 dark:text-ink-50">{dateInput || 'today'}</strong>.
                </p>
              </div>

              {modalError && (
                <div className="p-2.5 rounded-xl bg-negative/10 border border-negative/20 text-negative text-xs font-medium">
                  {modalError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBalanceModalOpen(false)}
                  disabled={savingBalance}
                  className="glass-btn px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBalance}
                  className="glass-btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingBalance ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} strokeWidth={2.5} />
                      <span>Confirm & Save</span>
                    </>
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

export default DashboardHome;