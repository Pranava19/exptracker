import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axios';
import MonthlyChart from '../components/MonthlyChart';
import CategoryChart from '../components/CategoryChart';
import Layout from '../components/Layout';
import { SkeletonCard, SkeletonChart } from '../components/Skeleton';

const StatCard = ({ label, value, icon, iconBgLight, iconColorLight, sub, subGreen, loading }) => {
  if (loading) return <SkeletonCard />;
  return (
    <div className="rounded-xl p-4 bg-white dark:bg-[#161B27] border border-gray-100 dark:border-[#252D3D]">
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.6px] text-gray-400 dark:text-[#475569]">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconBgLight }}>
          <i className={`ti ${icon}`} style={{ fontSize: 15, color: iconColorLight }} aria-hidden="true" />
        </div>
      </div>
      <p className="text-[22px] font-bold tracking-tight text-gray-900 dark:text-gray-100" style={{ letterSpacing: '-0.6px' }}>
        ₹{Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      {sub && <p className={`text-[11px] mt-1 ${subGreen ? 'text-emerald-500' : 'text-gray-400 dark:text-[#475569]'}`}>{sub}</p>}
    </div>
  );
};

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
  if (d.getTime() === today.getTime()) return `Today — ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}`;
  if (d.getTime() === yesterday.getTime()) return `Yesterday — ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}`;
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
};

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtShort = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

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

  // ── This month stats ──────────────────────────────────────────────────────
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const monthTxs = transactions.filter(tx => {
    const d = new Date(tx.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  const monthExpenses = monthTxs.filter(tx => tx.type === 'expense');

  // Biggest single transaction this month
  const biggestTx = monthExpenses.reduce((max, tx) =>
    Number(tx.amount) > Number(max?.amount || 0) ? tx : max, null);

  // Daily average spend this month
  const daysElapsed = now.getDate();
  const totalMonthSpend = monthExpenses.reduce((s, tx) => s + Number(tx.amount), 0);
  const dailyAvg = daysElapsed > 0 ? totalMonthSpend / daysElapsed : 0;

  // Top 5 payees by total spend (all time, expenses only)
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

  // ── PDF Export ────────────────────────────────────────────────────────────
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
            <td style="color:${tx.type === 'income' ? '#059669' : '#DC2626'}; font-weight:600; text-align:right;">
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
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 32px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; }
            .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
            .brand span { color: #3b82f6; }
            .period { font-size: 11px; color: #64748b; margin-top: 3px; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
            .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; }
            .summary-card .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; margin-bottom: 4px; }
            .summary-card .val { font-size: 18px; font-weight: 700; }
            .income  { color: #059669; }
            .expense { color: #dc2626; }
            .savings { color: #3b82f6; }
            h2 { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
            td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
            tr:last-child td { border-bottom: none; }
            .footer { margin-top: 24px; font-size: 10px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">Exp<span>Tracker</span></div>
              <div class="period">Monthly Statement — ${monthName}</div>
            </div>
            <div style="text-align:right; font-size:11px; color:#64748b;">
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
          <div class="footer">ExpTracker — Personal Finance · ${monthStr}</div>
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
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <StatCard label="Balance"  value={summary.balance}       icon="ti-wallet"       iconBgLight="#EFF6FF" iconColorLight="#3B82F6" sub="Current balance"  loading={loading} />
        <StatCard label="Income"   value={summary.total_income}  icon="ti-trending-up"  iconBgLight="#ECFDF5" iconColorLight="#059669" sub="+12% this month"  subGreen loading={loading} />
        <StatCard label="Expenses" value={summary.total_expense} icon="ti-trending-down" iconBgLight="#FEF2F2" iconColorLight="#DC2626" sub="Total debited"    loading={loading} />
      </div>

      {/* This month insight cards */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {/* Daily average */}
          <div className="rounded-xl p-4 bg-white dark:bg-[#161B27] border border-gray-100 dark:border-[#252D3D]">
            <div className="flex items-start justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.6px] text-gray-400 dark:text-[#475569]">Daily Avg Spend</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#FFF7ED' }}>
                <i className="ti ti-calendar-stats" style={{ fontSize: 15, color: '#F97316' }} aria-hidden="true" />
              </div>
            </div>
            <p className="text-[20px] font-bold text-gray-900 dark:text-gray-100 tabular-nums" style={{ letterSpacing: '-0.5px' }}>
              {fmtShort(dailyAvg)}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-[#475569] mt-1">per day · {now.toLocaleString('default', { month: 'short' })}</p>
          </div>

          {/* Biggest transaction */}
          <div className="rounded-xl p-4 bg-white dark:bg-[#161B27] border border-gray-100 dark:border-[#252D3D]">
            <div className="flex items-start justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.6px] text-gray-400 dark:text-[#475569]">Biggest Expense</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#FFF1F2' }}>
                <i className="ti ti-arrow-big-up" style={{ fontSize: 15, color: '#F43F5E' }} aria-hidden="true" />
              </div>
            </div>
            {biggestTx ? (
              <>
                <p className="text-[20px] font-bold text-red-500 dark:text-red-400 tabular-nums" style={{ letterSpacing: '-0.5px' }}>
                  {fmt(biggestTx.amount)}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-[#475569] mt-1 truncate">
                  {(biggestTx.payee || biggestTx.description || '').slice(0, 28)} · {biggestTx.date.slice(0, 10)}
                </p>
              </>
            ) : (
              <p className="text-[13px] text-gray-400 dark:text-[#475569] mt-2">No expenses this month</p>
            )}
          </div>

          {/* Export PDF */}
          <div className="rounded-xl p-4 bg-white dark:bg-[#161B27] border border-gray-100 dark:border-[#252D3D] flex flex-col justify-between">
            <div className="flex items-start justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.6px] text-gray-400 dark:text-[#475569]">Monthly Statement</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#F0FDF4' }}>
                <i className="ti ti-file-type-pdf" style={{ fontSize: 15, color: '#22C55E' }} aria-hidden="true" />
              </div>
            </div>
            <div>
              <p className="text-[12px] text-gray-500 dark:text-[#64748B] mb-3">
                {now.toLocaleString('default', { month: 'long', year: 'numeric' })} · {monthTxs.length} transactions
              </p>
              <button
                onClick={handleExportPDF}
                disabled={exporting || monthTxs.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors"
              >
                {exporting
                  ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <i className="ti ti-download" style={{ fontSize: 13 }} aria-hidden="true" />
                }
                Export PDF
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent transactions — 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl overflow-hidden bg-white dark:bg-[#161B27] border border-gray-100 dark:border-[#252D3D]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 dark:border-[#1E2A3B]">
              <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">Recent transactions</p>
              <Link to="/transactions" className="text-[12px] font-medium text-blue-500 hover:text-blue-600">View all</Link>
            </div>
            {loading ? (
              <div className="p-5 space-y-3">
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
            ) : Object.keys(grouped).length === 0 ? (
              <div className="flex items-center justify-center h-40">
                <p className="text-[13px] text-gray-400 dark:text-[#475569]">No transactions yet</p>
              </div>
            ) : (
              Object.entries(grouped)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, txs]) => (
                  <div key={date}>
                    <div className="px-5 py-2 bg-gray-50 dark:bg-[#0D1117] border-y border-gray-50 dark:border-[#1A2235]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.7px] text-gray-400 dark:text-[#334155]">
                        {formatGroupLabel(date)}
                      </p>
                    </div>
                    {txs.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-50 dark:border-[#1A2235] last:border-0 hover:bg-gray-50 dark:hover:bg-[#1A2235] transition-colors">
                        <div className="min-w-0 flex-1 mr-4">
                          <p className="text-[13px] font-medium text-gray-800 dark:text-[#CBD5E1] truncate">{tx.payee || tx.description || tx.category}</p>
                          <p className="text-[11px] text-gray-400 dark:text-[#475569] mt-0.5">{tx.category} · {tx.mode || 'Other'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${tx.type === 'income' ? 'bg-emerald-50 dark:bg-[#064E3B] text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-[#450A0A] text-red-600 dark:text-red-300'}`}>
                            {tx.type}
                          </span>
                          <p className={`text-[13px] font-bold tabular-nums ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {tx.type === 'income' ? '+' : '−'}₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
            )}
          </div>

          {/* Top 5 payees */}
          {!loading && top5Payees.length > 0 && (
            <div className="rounded-xl bg-white dark:bg-[#161B27] border border-gray-100 dark:border-[#252D3D]">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 dark:border-[#1E2A3B]">
                <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">Top payees by spend</p>
                <span className="text-[11px] text-gray-400 dark:text-[#475569]">All time</span>
              </div>
              <div className="p-5 space-y-3">
                {top5Payees.map(([name, amount], i) => (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0 flex-1 mr-3">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-[#475569] w-4 flex-shrink-0">{i + 1}</span>
                        <p className="text-[12px] font-medium text-gray-700 dark:text-[#CBD5E1] truncate">{name}</p>
                      </div>
                      <p className="text-[12px] font-bold tabular-nums text-red-500 dark:text-red-400 flex-shrink-0">{fmtShort(amount)}</p>
                    </div>
                    <div className="ml-6 h-1.5 rounded-full bg-gray-100 dark:bg-[#1E2A3B] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 dark:bg-blue-400 transition-all"
                        style={{ width: `${(amount / maxPayeeAmount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Charts — 1 col */}
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden bg-white dark:bg-[#161B27] border border-gray-100 dark:border-[#252D3D]">
            <div className="px-5 py-3.5 border-b border-gray-50 dark:border-[#1E2A3B]">
              <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">Monthly overview</p>
            </div>
            <div className="p-4">
              {loading ? <SkeletonChart /> : <MonthlyChart transactions={transactions} />}
            </div>
          </div>
          <div className="rounded-xl overflow-hidden bg-white dark:bg-[#161B27] border border-gray-100 dark:border-[#252D3D]">
            <div className="px-5 py-3.5 border-b border-gray-50 dark:border-[#1E2A3B]">
              <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">Expenses by category</p>
            </div>
            <div className="p-4">
              {loading ? <SkeletonChart /> : <CategoryChart transactions={transactions} />}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardHome;