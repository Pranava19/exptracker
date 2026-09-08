import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import MonthlyChart from '../components/MonthlyChart';
import CategoryChart from '../components/CategoryChart';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import { SkeletonChart } from '../components/Skeleton';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowUpRight,
  Download,
  ChevronRight,
  Sparkles
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
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ total_income: 0, total_expense: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetch = async () => {
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
    fetch();
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

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const monthName = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      const monthStr = `${String(thisMonth + 1).padStart(2, '0')}-${thisYear}`;

      const income  = monthTxs.filter(tx => tx.type === 'income').reduce((s, tx) => s + Number(tx.amount), 0);
      const expense = monthTxs.filter(tx => tx.type === 'expense').reduce((s, tx) => s + Number(tx.amount), 0);
      const savings = income - expense;

      const rows = [...monthTxs]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(tx => `
          <tr>
            <td>${tx.date.slice(0, 10)}</td>
            <td>${(tx.payee || tx.description || '').slice(0, 40)}</td>
            <td>${tx.category}</td>
            <td>${tx.mode || 'Other'}</td>
            <td style="color:${tx.type === 'income' ? '#2563EB' : '#B5473B'}; font-weight:600; text-align:right;">
              ${tx.type === 'income' ? '+' : '−'}${fmt(tx.amount)}
            </td>
          </tr>
        `).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Statement ${monthStr}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Instrument Sans', 'Segoe UI', sans-serif; font-size: 12px; color: #1C1C1A; padding: 32px; background: #FFF; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 2px solid #EDECE8; padding-bottom: 16px; }
            .brand { font-size: 22px; font-weight: 800; }
            .brand span { color: #2A5C8A; }
            .period { font-size: 11px; color: #6E6E6B; margin-top: 3px; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
            .summary-card { background: #F7F7F5; border: 1px solid #EDECE8; border-radius: 6px; padding: 12px 16px; }
            .summary-card .label { font-size: 10px; text-transform: uppercase; font-family: monospace; color: #6E6E6B; margin-bottom: 4px; }
            .summary-card .val { font-size: 18px; font-weight: 700; font-family: monospace; }
            .income  { color: #2563EB; }
            .expense { color: #B5473B; }
            .savings { color: #2A5C8A; }
            h2 { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6E6E6B; margin-bottom: 10px; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; font-size: 10px; text-transform: uppercase; font-family: monospace; color: #6E6E6B; padding: 8px 10px; border-bottom: 1px solid #EDECE8; }
            td { padding: 8px 10px; border-bottom: 1px solid #F7F7F5; font-size: 11px; }
            .footer { margin-top: 24px; font-size: 10px; color: #6E6E6B; text-align: center; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">Exp<span>Tracker</span></div>
              <div class="period">Monthly Statement: ${monthName}</div>
            </div>
            <div style="text-align:right; font-size:11px; color:#6E6E6B;">
              Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div class="summary">
            <div class="summary-card">
              <div class="label">Income</div>
              <div class="val income">${fmt(income)}</div>
            </div>
            <div class="summary-card">
              <div class="label">Expense</div>
              <div class="val expense">${fmt(expense)}</div>
            </div>
            <div class="summary-card">
              <div class="label">Net Savings</div>
              <div class="val savings">${fmt(savings)}</div>
            </div>
          </div>
          <h2>Transactions (${monthTxs.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Mode</th>
                <th style="text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="footer">ExpTracker · Personal Finance · ${monthStr}</div>
        </body>
        </html>
      `;

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        }, 2000);
      }, 250);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  const grouped = groupByDate(transactions);

  return (
    <Layout>
      <SEO
        title="Dashboard - Personal Money Overview"
        description="Track your total balance, monthly income, expenses, and latest transaction activity with ExpTracker."
        path="/dashboard"
      />

      {/* Human Dynamic Greeting Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-900 dark:text-ink-50">
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="text-xs text-ink-600 dark:text-ink-300 mt-1">
            Here's your real-time financial snapshot for {now.toLocaleString('default', { month: 'long', year: 'numeric' })}.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-accent/10 text-accent">
          <Sparkles size={14} /> Account Synchronized
        </div>
      </div>

      {/* Balance & Income/Expense Highlight Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2 p-6 sm:p-8 bg-gradient-to-br from-ink-900 via-ink-900 to-ink-800 text-white rounded-2xl flex flex-col justify-between shadow-md relative overflow-hidden border border-ink-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-accent/20 text-accent-light backdrop-blur-md">
                <Wallet size={20} strokeWidth={2} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-ink-200 opacity-90 select-none">
                Available Balance
              </span>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Live Balance
            </span>
          </div>

          <div className="my-4">
            {loading ? (
              <div className="h-12 w-64 bg-ink-800 animate-pulse rounded-xl" />
            ) : (
              <p className="font-mono text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
                {fmt(summary.balance)}
              </p>
            )}
            <p className="text-xs text-ink-300 mt-2 font-medium">Total liquid funds across your linked records</p>
          </div>

          <div className="pt-4 border-t border-ink-800 flex items-center justify-between text-xs">
            <span className="text-ink-300 font-medium">Month-to-date summary</span>
            <button
              onClick={handleExportPDF}
              disabled={exporting || monthTxs.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-accent hover:bg-accent-dark text-white transition-all shadow-sm cursor-pointer disabled:opacity-50 min-h-[44px]"
            >
              <Download size={14} strokeWidth={2} />
              <span>{exporting ? 'Generating PDF...' : 'Download PDF Summary'}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex-1 p-5 bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-2xl flex flex-col justify-between shadow-sm">
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

          <div className="flex-1 p-5 bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-2xl flex flex-col justify-between shadow-sm">
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
          <div className="p-5 bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-ink-600 dark:text-ink-300 select-none">Daily Pace</span>
              <p className="font-mono text-xl font-bold text-ink-900 dark:text-ink-50 mt-1">{fmtShort(dailyAvg)}</p>
              <p className="text-[11px] text-ink-500 dark:text-ink-400 mt-0.5">Average spend per active day</p>
            </div>
            <div className="p-3 rounded-xl bg-accent/10 text-accent">
              <Calendar size={22} strokeWidth={2} />
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-2xl flex items-center justify-between shadow-sm">
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
          <div className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 dark:border-[#2C2C28]">
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
                      <div className="h-3.5 bg-ink-100 dark:bg-ink-800 rounded-lg w-40" />
                      <div className="h-2.5 bg-ink-100 dark:bg-ink-800 rounded-lg w-24" />
                    </div>
                    <div className="h-4 bg-ink-100 dark:bg-ink-800 rounded-lg w-20" />
                  </div>
                ))}
              </div>
            ) : Object.keys(grouped).length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-xs font-semibold text-ink-600 dark:text-ink-300">All clear! No spend or income logged yet. 🎉</p>
                <Link to="/transactions" className="text-xs text-accent font-bold mt-2 inline-block">Add your first transaction</Link>
              </div>
            ) : (
              Object.entries(grouped)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, txs]) => (
                  <div key={date}>
                    <div className="px-6 py-2.5 bg-ink-50/70 dark:bg-[#252522] border-y border-ink-100 dark:border-[#2C2C28]">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-600 dark:text-ink-300">
                        {formatGroupLabel(date)}
                      </p>
                    </div>
                    {txs.map(tx => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between px-6 py-3.5 border-b border-ink-100 dark:border-[#2C2C28] last:border-0 hover:bg-ink-50/50 dark:hover:bg-[#252522]/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1 mr-4">
                          <p className="text-sm font-semibold text-ink-900 dark:text-ink-50 truncate">{tx.payee || tx.description || tx.category}</p>
                          <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{tx.category} · {tx.mode || 'Other'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${tx.type === 'income' ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'}`}>
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
            <div className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-ink-100 dark:border-[#2C2C28] mb-4">
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
                    <div className="ml-6 h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
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
          <div className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-2xl overflow-hidden p-5 shadow-sm">
            <div className="pb-3 border-b border-ink-100 dark:border-[#2C2C28] mb-3">
              <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50">Monthly Cash Flow</h3>
              <p className="text-[11px] text-ink-500 dark:text-ink-400">Income vs Expenses trend</p>
            </div>
            {loading ? <SkeletonChart /> : <MonthlyChart transactions={transactions} />}
          </div>

          <div className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-2xl overflow-hidden p-5 shadow-sm">
            <div className="pb-3 border-b border-ink-100 dark:border-[#2C2C28] mb-3">
              <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50">Spending by Category</h3>
              <p className="text-[11px] text-ink-500 dark:text-ink-400">Category breakdown</p>
            </div>
            {loading ? <SkeletonChart /> : <CategoryChart transactions={transactions} />}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardHome;