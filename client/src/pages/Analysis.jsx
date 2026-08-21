import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import Layout from '../components/Layout';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, ReferenceLine,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Wallet, ArrowUpRight,
  Calendar, Hash, Filter, RotateCcw
} from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtDecimal = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ink-900 text-ink-50 border border-ink-700 rounded-card p-3 shadow-lg font-mono text-xs max-w-sm">
      <p className="font-sans font-semibold mb-1 opacity-80 truncate">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold flex items-center justify-between gap-3" style={{ color: p.color || p.fill }}>
          <span>{p.name}:</span>
          <span>{fmtDecimal(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

const SectionHeader = ({ title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div>
      <h2 className="text-sm font-semibold text-ink-900 dark:text-ink-50">{title}</h2>
      {subtitle && <p className="text-xs text-ink-700 dark:text-ink-200 opacity-60 mt-0.5">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

const Card = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-card p-5 ${className}`}>
    {children}
  </div>
);

const Analysis = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Filter state
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(''); // '' means All Months
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [type, setType] = useState('all'); // 'all', 'income', 'expense'

  // Data state
  const [summaryCards, setSummaryCards] = useState({
    total_income: 0,
    total_expenses: 0,
    current_balance: 0,
    highest_expense: 0,
    avg_daily_expense: 0,
    transaction_count: 0,
  });
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [netCashFlow, setNetCashFlow] = useState([]);
  const [dailyExpenses, setDailyExpenses] = useState([]);
  const [topTransactions, setTopTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Auto-detect available years from transactions API initially
  const [availableYears, setAvailableYears] = useState([currentYear]);

  useEffect(() => {
    axios.get('/transactions').then(res => {
      if (res.data && res.data.length > 0) {
        const txYears = [...new Set(res.data.map(tx => new Date(tx.date).getFullYear()))].sort((a, b) => b - a);
        if (txYears.length > 0) {
          setAvailableYears(txYears);
          setYear(txYears[0]); // Auto-select most recent transaction year
        }
      }
    }).catch(err => console.error(err));
  }, []);

  // Fetch all 5 analytics endpoints when filters change
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (year) queryParams.append('year', year);
        if (month) queryParams.append('month', month);
        if (fromDate) queryParams.append('from', fromDate);
        if (toDate) queryParams.append('to', toDate);
        if (type && type !== 'all') queryParams.append('type', type);

        const activeMonth = month || currentMonth;
        const dailyParams = new URLSearchParams();
        if (year) dailyParams.append('year', year);
        dailyParams.append('month', activeMonth);
        if (fromDate) dailyParams.append('from', fromDate);
        if (toDate) dailyParams.append('to', toDate);

        const topParams = new URLSearchParams(queryParams);
        topParams.set('limit', '5');

        const [summaryRes, monthlyRes, netRes, dailyRes, topRes] = await Promise.all([
          axios.get(`/analysis/summary-cards?${queryParams.toString()}`),
          axios.get(`/analysis/monthly-summary?${queryParams.toString()}`),
          axios.get(`/analysis/net-cashflow?${queryParams.toString()}`),
          axios.get(`/analysis/daily-expenses?${dailyParams.toString()}`),
          axios.get(`/analysis/top-transactions?${topParams.toString()}`),
        ]);

        setSummaryCards(summaryRes.data || {});
        setMonthlySummary(monthlyRes.data || []);
        setNetCashFlow(netRes.data || []);
        setDailyExpenses(dailyRes.data || []);
        setTopTransactions(topRes.data || []);
      } catch (err) {
        console.error('Error fetching analysis data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, fromDate, toDate, type]);

  const handleResetFilters = () => {
    setYear(availableYears[0] || currentYear);
    setMonth('');
    setFromDate('');
    setToDate('');
    setType('all');
  };

  // Format monthly bar & line chart data
  const monthlyBarData = monthlySummary.map(m => ({
    month: MONTHS[m.month - 1],
    Income: m.income,
    Expense: m.expense,
  }));

  const netCashFlowData = netCashFlow.map(m => ({
    month: MONTHS[m.month - 1],
    'Net Cash Flow': m.net,
  }));

  const dailyExpenseData = dailyExpenses.map(d => ({
    date: d.date.slice(5), // MM-DD for x-axis
    fullDate: d.date,
    Expense: d.total_expense,
  }));

  // Format Top 5 transactions data preserving exact description/payee
  const topTransactionsData = topTransactions.map(t => ({
    label: t.label || t.description || t.payee || 'Unknown',
    fullDescription: t.description || t.payee || 'Unknown',
    amount: t.amount,
    date: t.date,
  }));

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-base font-semibold text-ink-900 dark:text-ink-50">Financial Analysis</h1>
          <p className="text-xs font-mono text-ink-700 dark:text-ink-200 opacity-60 mt-0.5">
            Cash flow, expense trends, and financial performance summary
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink-900 dark:text-ink-50">
            <Filter size={16} strokeWidth={1.5} className="text-accent" />
            <span>Filter Transactions</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div>
              <label className="text-[10px] font-mono text-ink-700 dark:text-ink-200 opacity-60 block mb-1 select-none">Year</label>
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="font-mono border border-ink-100 dark:border-[#2C2C28] rounded-md px-2.5 py-1.5 bg-white dark:bg-[#252522] text-ink-900 dark:text-ink-50 focus:outline-none focus:border-accent cursor-pointer"
              >
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono text-ink-700 dark:text-ink-200 opacity-60 block mb-1 select-none">Month</label>
              <select
                value={month}
                onChange={e => setMonth(e.target.value ? Number(e.target.value) : '')}
                className="font-mono border border-ink-100 dark:border-[#2C2C28] rounded-md px-2.5 py-1.5 bg-white dark:bg-[#252522] text-ink-900 dark:text-ink-50 focus:outline-none focus:border-accent cursor-pointer"
              >
                <option value="">All Months</option>
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono text-ink-700 dark:text-ink-200 opacity-60 block mb-1 select-none">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="font-mono border border-ink-100 dark:border-[#2C2C28] rounded-md px-2.5 py-1.5 bg-white dark:bg-[#252522] text-ink-900 dark:text-ink-50 focus:outline-none focus:border-accent cursor-pointer"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-ink-700 dark:text-ink-200 opacity-60 block mb-1 select-none">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="font-mono border border-ink-100 dark:border-[#2C2C28] rounded-md px-2.5 py-1.5 bg-white dark:bg-[#252522] text-ink-900 dark:text-ink-50 focus:outline-none focus:border-accent cursor-pointer"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-ink-700 dark:text-ink-200 opacity-60 block mb-1 select-none">Type</label>
              <div className="flex bg-ink-50 dark:bg-[#252522] p-0.5 rounded-md border border-ink-100 dark:border-[#2C2C28]">
                {['all', 'income', 'expense'].map(t => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`px-2.5 py-1 text-[11px] font-mono capitalize rounded cursor-pointer ${type === t ? 'bg-accent text-white font-semibold' : 'text-ink-700 dark:text-ink-200 hover:text-ink-900'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="self-end">
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 text-xs font-mono text-ink-700 dark:text-ink-200 hover:text-ink-900 dark:hover:text-white px-2.5 py-1.5 border border-ink-100 dark:border-[#2C2C28] rounded-md transition-colors cursor-pointer"
                title="Reset filters"
              >
                <RotateCcw size={14} />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Card title={fmtDecimal(summaryCards.total_income)}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-700 dark:text-ink-200 opacity-60 select-none">Total Income</span>
            <div className="p-1 rounded bg-positive/10 text-positive">
              <TrendingUp size={14} strokeWidth={1.5} />
            </div>
          </div>
          <p className="font-mono text-base font-semibold text-positive truncate">{fmt(summaryCards.total_income)}</p>
        </Card>

        <Card title={fmtDecimal(summaryCards.total_expenses)}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-700 dark:text-ink-200 opacity-60 select-none">Total Expenses</span>
            <div className="p-1 rounded bg-negative/10 text-negative">
              <TrendingDown size={14} strokeWidth={1.5} />
            </div>
          </div>
          <p className="font-mono text-base font-semibold text-negative truncate">{fmt(summaryCards.total_expenses)}</p>
        </Card>

        <Card title={fmtDecimal(summaryCards.current_balance)}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-700 dark:text-ink-200 opacity-60 select-none">Current Balance</span>
            <div className="p-1 rounded bg-accent/10 text-accent">
              <Wallet size={14} strokeWidth={1.5} />
            </div>
          </div>
          <p className={`font-mono text-base font-semibold truncate ${summaryCards.current_balance >= 0 ? 'text-accent' : 'text-negative'}`}>
            {fmt(summaryCards.current_balance)}
          </p>
        </Card>

        <Card title={fmtDecimal(summaryCards.highest_expense)}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-700 dark:text-ink-200 opacity-60 select-none">Highest Expense</span>
            <div className="p-1 rounded bg-negative/10 text-negative">
              <ArrowUpRight size={14} strokeWidth={1.5} />
            </div>
          </div>
          <p className="font-mono text-base font-semibold text-negative truncate">{fmt(summaryCards.highest_expense)}</p>
        </Card>

        <Card title={`${fmtDecimal(summaryCards.avg_daily_expense)} / active day`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-700 dark:text-ink-200 opacity-60 select-none">Avg Daily Spend</span>
            <div className="p-1 rounded bg-accent/10 text-accent">
              <Calendar size={14} strokeWidth={1.5} />
            </div>
          </div>
          <p className="font-mono text-base font-semibold text-ink-900 dark:text-ink-50 truncate">{fmt(summaryCards.avg_daily_expense)}</p>
        </Card>

        <Card title={`${summaryCards.transaction_count} recorded transactions`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-700 dark:text-ink-200 opacity-60 select-none">Transactions</span>
            <div className="p-1 rounded bg-ink-100 dark:bg-ink-700 text-ink-900 dark:text-ink-50">
              <Hash size={14} strokeWidth={1.5} />
            </div>
          </div>
          <p className="font-mono text-base font-semibold text-ink-900 dark:text-ink-50 truncate">{summaryCards.transaction_count}</p>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-ink-700 dark:text-ink-200">
          <span className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mr-3" />
          <span className="text-xs font-mono">Loading cash flow analysis...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <SectionHeader
                title="Monthly Income vs Expenses"
                subtitle={`Full year cash flow comparison (${year})`}
              />
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyBarData} barGap={2} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="0" stroke="#EDECE8" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} stroke="#888" />
                  <YAxis tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} stroke="#888" tickFormatter={v => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Income" name="Income" fill="#16A34A" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="Expense" name="Expense" fill="#DC2626" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <SectionHeader
                title="Monthly Net Cash Flow"
                subtitle={`Net income minus expenses per month (${year})`}
              />
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={netCashFlowData}>
                  <CartesianGrid strokeDasharray="0" stroke="#EDECE8" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} stroke="#888" />
                  <YAxis tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} stroke="#888" tickFormatter={v => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="#888" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="Net Cash Flow"
                    name="Net Cash Flow"
                    stroke="#2563EB"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#2563EB' }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <SectionHeader
                title="Daily Expense Trend"
                subtitle={`Expense timeline for ${MONTHS[(month || currentMonth) - 1]} ${year}`}
              />
              {dailyExpenseData.length === 0 ? (
                <div className="py-16 text-center text-xs font-mono text-ink-700 dark:text-ink-200 opacity-60">
                  No daily expense data for {MONTHS[(month || currentMonth) - 1]} {year}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={dailyExpenseData}>
                    <CartesianGrid strokeDasharray="0" stroke="#EDECE8" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} stroke="#888" />
                    <YAxis tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} stroke="#888" tickFormatter={v => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="Expense"
                      name="Daily Expense"
                      stroke="#DC2626"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#DC2626' }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card>
              <SectionHeader
                title="Top 5 Expense Transactions"
                subtitle="Highest debited single transactions (exact imported text)"
              />
              {topTransactionsData.length === 0 ? (
                <div className="py-16 text-center text-xs font-mono text-ink-700 dark:text-ink-200 opacity-60">
                  No expense transactions found
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={topTransactionsData} layout="vertical" barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="0" stroke="#EDECE8" vertical={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} stroke="#888" tickFormatter={v => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                      stroke="#888"
                      width={120}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-ink-900 text-ink-50 border border-ink-700 rounded-card p-3 shadow-lg font-mono text-xs max-w-md whitespace-normal break-words">
                            <p className="font-sans font-semibold mb-1 opacity-80">{data.fullDescription}</p>
                            <p className="text-[10px] text-ink-200 opacity-60 mb-2">{data.date}</p>
                            <p className="font-semibold text-negative">{fmtDecimal(data.amount)}</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="amount" name="Amount" fill="#2563EB" radius={[0, 2, 2, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>
        </>
      )}
    </Layout>
  );
};

export default Analysis;