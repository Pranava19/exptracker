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
  Sparkles
} from 'lucide-react';
import './DashboardHome.css';

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
  const { toast, hideToast } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ total_income: 0, total_expense: 0, balance: 0 });
  const [loading, setLoading] = useState(true);

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
    const handleTxAdded = () => {
      fetchDashboardData();
    };
    window.addEventListener('tx-added', handleTxAdded);
    return () => window.removeEventListener('tx-added', handleTxAdded);
  }, []);

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
      <div className="dashboard-greeting-header">
        <div>
          <h1 className="dashboard-greeting-title">
            {getGreeting()}, {firstName}
          </h1>
          <p className="dashboard-greeting-desc">
            Here's your real-time financial snapshot for {now.toLocaleString('default', { month: 'long', year: 'numeric' })}.
          </p>
        </div>
        <div className="dashboard-sync-pill">
          <Sparkles size={14} /> Account Synchronized
        </div>
      </div>

      {/* Balance & Income/Expense Highlight Row */}
      <div className="dashboard-hero-grid">
        <div className="glass-card dashboard-balance-hero">
          {/* Subtle atmospheric light inside hero card */}
          <div className="dashboard-hero-glow" />

          <div className="dashboard-balance-header">
            <div className="dashboard-balance-title-row">
              <div className="dashboard-balance-icon">
                <Wallet size={20} strokeWidth={2} />
              </div>
              <span className="dashboard-balance-label">
                Available Balance
              </span>
            </div>
            <div className="dashboard-balance-badge-row">
              <span className="dashboard-live-badge">
                Live Balance
              </span>
            </div>
          </div>

          <div className="dashboard-balance-amount-wrapper">
            {loading ? (
              <div className="dashboard-balance-skeleton" />
            ) : (
              <p className="dashboard-balance-amount">
                {fmt(summary.balance)}
              </p>
            )}
            <p className="dashboard-balance-sub">Total liquid funds across your linked records</p>
          </div>
        </div>

        <div className="dashboard-mini-metrics">
          <div className="glass-card dashboard-mini-metric-card">
            <div className="dashboard-mini-metric-header">
              <span className="dashboard-mini-metric-label">
                Money In
              </span>
              <div className="dashboard-metric-icon-positive">
                <TrendingUp size={18} strokeWidth={2} />
              </div>
            </div>
            <p className="dashboard-metric-val-positive">
              {loading ? '...' : fmt(summary.total_income)}
            </p>
            <p className="dashboard-mini-metric-sub">Total received this month</p>
          </div>

          <div className="glass-card dashboard-mini-metric-card">
            <div className="dashboard-mini-metric-header">
              <span className="dashboard-mini-metric-label">
                Money Out
              </span>
              <div className="dashboard-metric-icon-negative">
                <TrendingDown size={18} strokeWidth={2} />
              </div>
            </div>
            <p className="dashboard-metric-val-negative">
              {loading ? '...' : fmt(summary.total_expense)}
            </p>
            <p className="dashboard-mini-metric-sub">Total spent this month</p>
          </div>
        </div>
      </div>

      {!loading && (
        <div className="dashboard-stats-grid">
          <div className="glass-card dashboard-stat-card">
            <div>
              <span className="dashboard-stat-label">Daily Pace</span>
              <p className="dashboard-stat-val">{fmtShort(dailyAvg)}</p>
              <p className="dashboard-stat-sub">Average spend per active day</p>
            </div>
            <div className="dashboard-stat-icon-accent">
              <Calendar size={22} strokeWidth={2} />
            </div>
          </div>

          <div className="glass-card dashboard-stat-card">
            <div className="dashboard-splurge-content">
              <span className="dashboard-stat-label">Biggest Splurge</span>
              {biggestTx ? (
                <>
                  <p className="dashboard-splurge-amount">{fmt(biggestTx.amount)}</p>
                  <p className="dashboard-splurge-desc">
                    {(biggestTx.payee || biggestTx.description || '').slice(0, 30)} · {biggestTx.date.slice(0, 10)}
                  </p>
                </>
              ) : (
                <p className="dashboard-splurge-empty">No expenses logged yet this month</p>
              )}
            </div>
            <div className="dashboard-stat-icon-negative">
              <ArrowUpRight size={22} strokeWidth={2} />
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-main-grid">
        {/* Latest Activity Feed */}
        <div className="dashboard-feed-column">
          <div className="glass-card dashboard-feed-card">
            <div className="dashboard-feed-header">
              <div>
                <h2 className="dashboard-feed-title">Latest Activity</h2>
                <p className="dashboard-feed-subtitle">Your recent debit and credit entries</p>
              </div>
              <Link to="/transactions" className="dashboard-view-all-link">
                <span>View All Activity</span>
                <ChevronRight size={14} strokeWidth={2} />
              </Link>
            </div>

            {loading ? (
              <div className="dashboard-feed-skeleton-list">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="dashboard-feed-skeleton-item">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <div className="skeleton-line" style={{ width: '10rem', height: '0.875rem' }} />
                      <div className="skeleton-line" style={{ width: '6rem', height: '0.625rem' }} />
                    </div>
                    <div className="skeleton-line" style={{ width: '5rem', height: '1rem' }} />
                  </div>
                ))}
              </div>
            ) : Object.keys(grouped).length === 0 ? (
              <div className="dashboard-empty-feed">
                <p className="dashboard-empty-title">All clear! No spend or income logged yet.</p>
                <Link to="/transactions" className="dashboard-empty-action">Add your first transaction</Link>
              </div>
            ) : (
              Object.entries(grouped)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, txs]) => (
                  <div key={date}>
                    <div className="glass-card-subtle dashboard-feed-date-badge">
                      <p className="dashboard-feed-date-text">
                        {formatGroupLabel(date)}
                      </p>
                    </div>
                    {txs.map(tx => (
                      <div
                        key={tx.id}
                        className="dashboard-feed-row"
                      >
                        <div className="dashboard-feed-row-left">
                          <p className="dashboard-feed-row-title">{tx.payee || tx.description || tx.category}</p>
                          <p className="dashboard-feed-row-meta">{tx.category} · {tx.mode || 'Other'}</p>
                        </div>
                        <div className="dashboard-feed-row-right">
                          <span className={`dashboard-type-pill ${tx.type === 'income' ? 'dashboard-type-pill-income' : 'dashboard-type-pill-expense'}`}>
                            {tx.type === 'income' ? 'Income' : 'Expense'}
                          </span>
                          <p className={tx.type === 'income' ? 'dashboard-feed-amount-income' : 'dashboard-feed-amount-expense'}>
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
            <div className="glass-card dashboard-payees-card">
              <div className="dashboard-payees-header">
                <div>
                  <h3 className="dashboard-payees-title">Where Your Money Goes</h3>
                  <p className="dashboard-payees-sub">Top merchants by total spend</p>
                </div>
                <span className="dashboard-payees-time">All Time</span>
              </div>
              <div className="dashboard-payees-list">
                {top5Payees.map(([name, amount], i) => (
                  <div key={name}>
                    <div className="dashboard-payee-info-row">
                      <div className="dashboard-payee-name-wrap">
                        <span className="dashboard-payee-rank">{i + 1}</span>
                        <p className="dashboard-payee-name">{name}</p>
                      </div>
                      <p className="dashboard-payee-amount">{fmtShort(amount)}</p>
                    </div>
                    <div className="dashboard-payee-bar-track">
                      <div
                        className="dashboard-payee-bar-fill"
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
        <div className="dashboard-charts-column">
          <div className="glass-card dashboard-chart-card">
            <div className="dashboard-chart-header">
              <h3 className="dashboard-feed-title">Monthly Cash Flow</h3>
              <p className="dashboard-feed-subtitle">Income vs Expenses trend</p>
            </div>
            {loading ? <SkeletonChart /> : <MonthlyChart transactions={transactions} />}
          </div>

          <div className="glass-card dashboard-chart-card">
            <div className="dashboard-chart-header">
              <h3 className="dashboard-feed-title">Spending by Category</h3>
              <p className="dashboard-feed-subtitle">Category breakdown</p>
            </div>
            {loading ? <SkeletonChart /> : <CategoryChart transactions={transactions} />}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardHome;