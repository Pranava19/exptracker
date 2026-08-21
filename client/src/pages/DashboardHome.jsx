import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axios';
import MonthlyChart from '../components/MonthlyChart';
import CategoryChart from '../components/CategoryChart';
import Layout from '../components/Layout';
import { SkeletonChart } from '../components/Skeleton';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowUpRight,
  Download,
  ChevronRight
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

const DashboardHome = () => {
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
        return m ? m[1].trim() : (tx.description || 'Unknown');
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

      const blob = new Blob([html], { type: 'text/html' });
      const url  = URL.createObjectURL(blob);
      const win  = window.open(url, '_blank');
      if (win) {
        win.onload = () => {
          win.print();
          URL.revokeObjectURL(url);
        };
      }
    } finally {
      setExporting(false);
    }
  };

  const grouped = groupByDate(transactions);

  return (
    <Layout>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2 p-8 bg-ink-900 text-ink-50 rounded-card flex flex-col justify-between border border-ink-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet size={18} strokeWidth={1.5} className="text-accent-light" />
              <span className="text-xs font-mono font-medium uppercase tracking-wider text-ink-200 opacity-80 select-none">Total Net Balance</span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-ink-700/60 text-ink-100 select-none">Live Account</span>
          </div>

          <div className="my-3">
            {loading ? (
              <div className="h-12 w-64 bg-ink-700 animate-pulse rounded" />
            ) : (
              <p className="font-mono text-4xl sm:text-5xl font-semibold tracking-tight text-white">
                {fmt(summary.balance)}
              </p>
            )}
            <p className="text-xs font-sans text-ink-200 opacity-70 mt-2">Overall account liquidity & cumulative balance</p>
          </div>

          <div className="pt-4 border-t border-ink-700/60 flex items-center justify-between text-xs">
            <span className="text-ink-200 opacity-70">Month-to-date activity</span>
            <button
              onClick={handleExportPDF}
              disabled={exporting || monthTxs.length === 0}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-accent hover:bg-accent-dark text-white transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Download size={14} strokeWidth={1.5} />
              <span>{exporting ? 'Exporting...' : 'Export Statement'}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex-1 p-5 bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-card flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-medium uppercase tracking-wider text-ink-700 dark:text-ink-200 opacity-70 select-none">Total Income</span>
              <div className="p-2 rounded bg-positive/10 text-positive">
                <TrendingUp size={16} strokeWidth={1.5} />
              </div>
            </div>
            <p className="font-mono text-2xl font-semibold text-positive">
              {loading ? '...' : fmt(summary.total_income)}
            </p>
            <p className="text-[11px] text-ink-700 dark:text-ink-200 opacity-60 mt-1">Total credited funds</p>
          </div>

          <div className="flex-1 p-5 bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-card flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-medium uppercase tracking-wider text-ink-700 dark:text-ink-200 opacity-70 select-none">Total Expenses</span>
              <div className="p-2 rounded bg-negative/10 text-negative">
                <TrendingDown size={16} strokeWidth={1.5} />
              </div>
            </div>
            <p className="font-mono text-2xl font-semibold text-negative">
              {loading ? '...' : fmt(summary.total_expense)}
            </p>
            <p className="text-[11px] text-ink-700 dark:text-ink-200 opacity-60 mt-1">Total debited funds</p>
          </div>
        </div>
      </div>

      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="p-5 bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-card flex items-center justify-between">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-ink-700 dark:text-ink-200 opacity-70 select-none">Daily Average Spend</span>
              <p className="font-mono text-xl font-semibold text-ink-900 dark:text-ink-50 mt-1">{fmtShort(dailyAvg)}</p>
              <p className="text-[11px] text-ink-700 dark:text-ink-200 opacity-60 mt-0.5">per day in {now.toLocaleString('default', { month: 'long' })}</p>
            </div>
            <div className="p-3 rounded bg-accent/10 text-accent">
              <Calendar size={20} strokeWidth={1.5} />
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-card flex items-center justify-between">
            <div className="min-w-0 flex-1 mr-3">
              <span className="text-xs font-mono uppercase tracking-wider text-ink-700 dark:text-ink-200 opacity-70 select-none">Biggest Expense ({now.toLocaleString('default', { month: 'short' })})</span>
              {biggestTx ? (
                <>
                  <p className="font-mono text-xl font-semibold text-negative mt-1">{fmt(biggestTx.amount)}</p>
                  <p className="text-[11px] text-ink-700 dark:text-ink-200 opacity-70 truncate mt-0.5">
                    {(biggestTx.payee || biggestTx.description || '').slice(0, 28)} · {biggestTx.date.slice(0, 10)}
                  </p>
                </>
              ) : (
                <p className="text-xs text-ink-700 dark:text-ink-200 opacity-60 mt-2">No expense recorded this month</p>
              )}
            </div>
            <div className="p-3 rounded bg-negative/10 text-negative flex-shrink-0">
              <ArrowUpRight size={20} strokeWidth={1.5} />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100 dark:border-[#2C2C28]">
              <h2 className="text-sm font-semibold text-ink-900 dark:text-ink-50">Recent Transactions</h2>
              <Link to="/transactions" className="text-xs font-medium text-accent hover:text-accent-dark flex items-center gap-1 cursor-pointer">
                <span>View all</span>
                <ChevronRight size={14} strokeWidth={1.5} />
              </Link>
            </div>

            {loading ? (
              <div className="p-5 space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse flex justify-between">
                    <div className="space-y-1">
                      <div className="h-3 bg-ink-100 dark:bg-ink-700 rounded w-36" />
                      <div className="h-2.5 bg-ink-100 dark:bg-ink-700 rounded w-24" />
                    </div>
                    <div className="h-3 bg-ink-100 dark:bg-ink-700 rounded w-16" />
                  </div>
                ))}
              </div>
            ) : Object.keys(grouped).length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-xs font-mono text-ink-700 dark:text-ink-200 opacity-60">No transactions recorded yet</p>
              </div>
            ) : (
              Object.entries(grouped)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, txs]) => (
                  <div key={date}>
                    <div className="px-5 py-2 bg-ink-50 dark:bg-[#252522] border-y border-ink-100 dark:border-[#2C2C28]">
                      <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-ink-700 dark:text-ink-200 opacity-75">
                        {formatGroupLabel(date)}
                      </p>
                    </div>
                    {txs.map(tx => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between px-5 py-3.5 border-b border-ink-100 dark:border-[#2C2C28] last:border-0 hover:bg-ink-50/50 dark:hover:bg-[#252522]/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1 mr-4">
                          <p className="text-sm font-medium text-ink-900 dark:text-ink-50 truncate">{tx.payee || tx.description || tx.category}</p>
                          <p className="text-xs text-ink-700 dark:text-ink-200 opacity-65 mt-0.5">{tx.category} · {tx.mode || 'Other'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-sharp ${tx.type === 'income' ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'}`}>
                            {tx.type}
                          </span>
                          <p className={`font-mono text-sm font-semibold ${tx.type === 'income' ? 'text-positive' : 'text-negative'}`}>
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
            <div className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-card p-5">
              <div className="flex items-center justify-between pb-3 border-b border-ink-100 dark:border-[#2C2C28] mb-4">
                <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-50">Top Payees by Spend</h3>
                <span className="text-xs font-mono text-ink-700 dark:text-ink-200 opacity-60">All time</span>
              </div>
              <div className="space-y-3">
                {top5Payees.map(([name, amount], i) => (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0 flex-1 mr-3">
                        <span className="font-mono text-xs text-ink-700 dark:text-ink-200 opacity-60 w-4">{i + 1}</span>
                        <p className="text-xs font-medium text-ink-900 dark:text-ink-50 truncate">{name}</p>
                      </div>
                      <p className="font-mono text-xs font-semibold text-negative">{fmtShort(amount)}</p>
                    </div>
                    <div className="ml-6 h-1.5 rounded-full bg-ink-100 dark:bg-ink-700 overflow-hidden">
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

        {/* Charts Column (1 col) */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-card overflow-hidden p-4">
            <div className="pb-3 border-b border-ink-100 dark:border-[#2C2C28] mb-3">
              <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-50">Monthly Overview</h3>
            </div>
            {loading ? <SkeletonChart /> : <MonthlyChart transactions={transactions} />}
          </div>

          <div className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-card overflow-hidden p-4">
            <div className="pb-3 border-b border-ink-100 dark:border-[#2C2C28] mb-3">
              <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-50">Expenses by Category</h3>
            </div>
            {loading ? <SkeletonChart /> : <CategoryChart transactions={transactions} />}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardHome;