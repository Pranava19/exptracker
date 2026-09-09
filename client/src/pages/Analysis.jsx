import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, ReferenceLine, AreaChart, Area
} from 'recharts';
import {
  TrendingUp, TrendingDown, Wallet, ArrowUpRight,
  Calendar, Filter, RotateCcw, Sparkles, Activity
} from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtDecimal = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ink-900 text-white border border-ink-700 rounded-xl p-3.5 shadow-xl font-mono text-xs max-w-xs space-y-1.5 backdrop-blur-md">
      <p className="font-sans font-semibold text-ink-200 text-xs border-b border-ink-700/60 pb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 font-medium" style={{ color: p.color || p.fill }}>
          <span className="opacity-90">{p.name}:</span>
          <span className="font-semibold">{fmtDecimal(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const SectionHeader = ({ title, subtitle, icon: Icon }) => (
  <div className="flex items-center gap-2.5 mb-4">
    {Icon && (
      <div className="p-2 rounded-lg bg-accent/10 text-accent dark:bg-accent/20">
        <Icon size={18} strokeWidth={2} />
      </div>
    )}
    <div>
      <h2 className="text-base font-bold text-ink-900 dark:text-ink-50">{title}</h2>
      {subtitle && <p className="text-xs text-ink-600 dark:text-ink-300 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

const Card = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-ink-900 border border-ink-100 dark:border-[#2C2C28] rounded-2xl p-5 shadow-sm transition-all hover:shadow-md ${className}`}>
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
      const txList = Array.isArray(res.data) ? res.data : (res.data?.transactions || []);
      if (txList.length > 0) {
        const txYears = [...new Set(txList.map(tx => {
          if (!tx.date) return null;
          const y = parseInt(String(tx.date).slice(0, 4), 10);
          return isNaN(y) ? null : y;
        }).filter(Boolean))].sort((a, b) => b - a);
        if (txYears.length > 0) {
          setAvailableYears(txYears);
          setYear(txYears[0]);
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
          axios.get(`/analysis/summary-cards?${queryParams.toString()}`).catch(() => ({ data: {} })),
          axios.get(`/analysis/monthly-summary?${queryParams.toString()}`).catch(() => ({ data: [] })),
          axios.get(`/analysis/net-cashflow?${queryParams.toString()}`).catch(() => ({ data: [] })),
          axios.get(`/analysis/daily-expenses?${dailyParams.toString()}`).catch(() => ({ data: [] })),
          axios.get(`/analysis/top-transactions?${topParams.toString()}`).catch(() => ({ data: [] })),
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

  const hasMonthlyBarData = monthlySummary.some(m => (m.income || 0) > 0 || (m.expense || 0) > 0);

  const netCashFlowData = netCashFlow.map(m => ({
    month: MONTHS[m.month - 1],
    'Net Cash Flow': m.net,
  }));

  const hasNetCashFlowData = netCashFlow.some(m => (m.net || 0) !== 0);

  const dailyExpenseData = dailyExpenses.map(d => ({
    date: d.date.slice(5),
    fullDate: d.date,
    Expense: d.total_expense,
  }));

  const topTransactionsData = topTransactions.map(t => ({
    label: (t.label || t.description || t.payee || 'Unknown').slice(0, 20),
    fullDescription: t.description || t.payee || 'Unknown',
    amount: t.amount,
    date: t.date,
  }));

  return (
    <Layout>
      <SEO
        title="Financial Analysis - Cash Flow & Spending Reports"
        description="Clear visual financial analytics, cash flow breakdowns, and expense trends for ExpTracker."
        path="/analysis"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-900 dark:text-ink-50">
              Financial Analysis
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
              <Sparkles size={12} /> Insights
            </span>
          </div>
          <p className="text-xs text-ink-600 dark:text-ink-300 mt-1">
            Simple breakdown of your income, expenses, cash flow trends, and highest spending.
          </p>
        </div>

        <button
          onClick={handleResetFilters}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-ink-700 dark:text-ink-200 bg-ink-50 dark:bg-ink-800 hover:bg-ink-100 dark:hover:bg-ink-700 border border-ink-200 dark:border-ink-700 rounded-xl transition-all cursor-pointer min-h-[44px]"
        >
          <RotateCcw size={14} />
          <span>Reset Filters</span>
        </button>
      </div>

      {/* Easy Filter Controls */}
      <Card className="mb-6 bg-gradient-to-r from-white to-ink-50/50 dark:from-ink-900 dark:to-ink-900/50">
        <div className="flex items-center gap-2 text-xs font-bold text-ink-900 dark:text-ink-50 mb-3">
          <Filter size={16} className="text-accent" />
          <span>Quick Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-ink-600 dark:text-ink-300 block mb-1">Year</label>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="w-full border border-ink-200 dark:border-ink-700 rounded-xl px-3 py-2 bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-50 focus:ring-2 focus:ring-accent focus:outline-none cursor-pointer text-xs min-h-[44px]"
            >
              {availableYears.map(y => (
                <option key={y} value={y} className="bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-50">
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-ink-600 dark:text-ink-300 block mb-1">Month</label>
            <select
              value={month}
              onChange={e => setMonth(e.target.value ? Number(e.target.value) : '')}
              className="w-full border border-ink-200 dark:border-ink-700 rounded-xl px-3 py-2 bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-50 focus:ring-2 focus:ring-accent focus:outline-none cursor-pointer text-xs min-h-[44px]"
            >
              <option value="" className="bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-50">All Months</option>
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx + 1} className="bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-50">
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-ink-600 dark:text-ink-300 block mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="w-full border border-ink-200 dark:border-ink-700 rounded-xl px-3 py-2 bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-50 focus:ring-2 focus:ring-accent focus:outline-none cursor-pointer text-xs min-h-[44px] dark:[color-scheme:dark]"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-ink-600 dark:text-ink-300 block mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="w-full border border-ink-200 dark:border-ink-700 rounded-xl px-3 py-2 bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-50 focus:ring-2 focus:ring-accent focus:outline-none cursor-pointer text-xs min-h-[44px] dark:[color-scheme:dark]"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-ink-600 dark:text-ink-300 block mb-1">Transaction Type</label>
            <div className="flex bg-ink-100 dark:bg-ink-800 p-1 rounded-xl border border-ink-200 dark:border-ink-700 min-h-[44px] items-center">
              {['all', 'income', 'expense'].map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 py-1.5 text-xs font-semibold capitalize rounded-lg transition-all cursor-pointer ${type === t ? 'bg-accent text-white shadow-sm' : 'text-ink-700 dark:text-ink-200 hover:text-ink-900 dark:hover:text-white'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Cards: Clean 4-Column Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Income */}
        <Card className="border-l-4 border-l-positive">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-600 dark:text-ink-300">Total Income</span>
            <div className="p-2 rounded-xl bg-positive/10 text-positive">
              <TrendingUp size={18} strokeWidth={2} />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-positive tracking-tight">
            {fmt(summaryCards.total_income)}
          </p>
          <p className="text-[11px] text-ink-500 dark:text-ink-400 mt-1">Total credited funds in range</p>
        </Card>

        {/* Total Expenses */}
        <Card className="border-l-4 border-l-negative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-600 dark:text-ink-300">Total Expenses</span>
            <div className="p-2 rounded-xl bg-negative/10 text-negative">
              <TrendingDown size={18} strokeWidth={2} />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-negative tracking-tight">
            {fmt(summaryCards.total_expenses)}
          </p>
          <p className="text-[11px] text-ink-500 dark:text-ink-400 mt-1">Total debited spend in range</p>
        </Card>

        {/* Net Cash Flow / Balance */}
        <Card className="border-l-4 border-l-accent">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-600 dark:text-ink-300">Net Cash Flow</span>
            <div className="p-2 rounded-xl bg-accent/10 text-accent">
              <Wallet size={18} strokeWidth={2} />
            </div>
          </div>
          <p className={`text-2xl font-bold font-mono tracking-tight ${summaryCards.current_balance >= 0 ? 'text-accent' : 'text-negative'}`}>
            {fmt(summaryCards.current_balance)}
          </p>
          <p className="text-[11px] text-ink-500 dark:text-ink-400 mt-1">Income minus total expenses</p>
        </Card>

        {/* Highest Single Expense */}
        <Card className="border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-600 dark:text-ink-300">Highest Single Spend</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ArrowUpRight size={18} strokeWidth={2} />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 tracking-tight">
            {fmt(summaryCards.highest_expense)}
          </p>
          <p className="text-[11px] text-ink-500 dark:text-ink-400 mt-1">
            {summaryCards.avg_daily_expense > 0 ? `Avg ${fmt(summaryCards.avg_daily_expense)} / active day` : 'Single largest transaction'}
          </p>
        </Card>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-ink-600 dark:text-ink-300 bg-white dark:bg-ink-900 rounded-2xl border border-ink-100 dark:border-ink-800">
          <span className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-sm font-semibold">Loading cash flow analysis...</span>
        </div>
      ) : (
        <>
          {/* Main Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <SectionHeader
                title="Monthly Income vs Expenses"
                subtitle={`Side-by-side comparison for ${year}`}
                icon={Activity}
              />
              {!hasMonthlyBarData ? (
                <div className="py-20 text-center text-xs font-mono text-ink-500 dark:text-ink-400">
                  No monthly data recorded for {year}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyBarData} barGap={4} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.15} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6B7280' }} stroke="#888" />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} stroke="#888" tickFormatter={v => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Income" name="Income" fill="#059669" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="Expense" name="Expense" fill="#DC2626" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card>
              <SectionHeader
                title="Monthly Net Cash Flow"
                subtitle={`Net profit/loss trajectory over ${year}`}
                icon={TrendingUp}
              />
              {!hasNetCashFlowData ? (
                <div className="py-20 text-center text-xs font-mono text-ink-500 dark:text-ink-400">
                  No cash flow trajectory data for {year}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={netCashFlowData}>
                    <defs>
                      <linearGradient id="netColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.15} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6B7280' }} stroke="#888" />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} stroke="#888" tickFormatter={v => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="3 3" />
                    <Area
                      type="monotone"
                      dataKey="Net Cash Flow"
                      name="Net Cash Flow"
                      stroke="#2563EB"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#netColor)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* Secondary Detail Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <SectionHeader
                title="Daily Expense Timeline"
                subtitle={`Daily spend patterns for ${MONTHS[(month || currentMonth) - 1]} ${year}`}
                icon={Calendar}
              />
              {dailyExpenseData.length === 0 ? (
                <div className="py-20 text-center text-xs font-mono text-ink-500 dark:text-ink-400">
                  No daily expense entries for {MONTHS[(month || currentMonth) - 1]} {year}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={dailyExpenseData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.15} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} stroke="#888" />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} stroke="#888" tickFormatter={v => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
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
                title="Top 5 Largest Expenses"
                subtitle="Highest individual debited transactions"
                icon={ArrowUpRight}
              />
              {topTransactionsData.length === 0 ? (
                <div className="py-20 text-center text-xs font-mono text-ink-500 dark:text-ink-400">
                  No expense transactions recorded
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={topTransactionsData} layout="vertical" barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.15} vertical={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} stroke="#888" tickFormatter={v => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#374151' }}
                      stroke="#888"
                      width={120}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-ink-900 text-white border border-ink-700 rounded-xl p-3 shadow-xl font-mono text-xs max-w-xs whitespace-normal break-words">
                            <p className="font-sans font-semibold text-ink-200 mb-1">{data.fullDescription}</p>
                            <p className="text-[10px] text-ink-400 mb-1.5">{data.date}</p>
                            <p className="font-bold text-negative">{fmtDecimal(data.amount)}</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="amount" name="Amount" fill="#2563EB" radius={[0, 4, 4, 0]} isAnimationActive={false} />
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