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
import './Analysis.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtDecimal = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-modal analysis-tooltip">
      <p className="analysis-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="analysis-tooltip-row" style={{ color: p.color || p.fill }}>
          <span style={{ opacity: 0.9 }}>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>{fmtDecimal(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const SectionHeader = ({ title, subtitle, icon: Icon }) => (
  <div className="analysis-section-header">
    {Icon && (
      <div className="analysis-section-icon">
        <Icon size={18} strokeWidth={2} />
      </div>
    )}
    <div>
      <h2 className="analysis-section-title">{title}</h2>
      {subtitle && <p className="analysis-section-subtitle">{subtitle}</p>}
    </div>
  </div>
);

const Card = ({ children, className = '' }) => (
  <div className={`glass-card analysis-card ${className}`}>
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
      <div className="analysis-header">
        <div>
          <div className="analysis-header-title-row">
            <h1 className="analysis-page-title">
              Financial Analysis
            </h1>
            <span className="analysis-pill-badge">
              <Sparkles size={12} /> Insights
            </span>
          </div>
          <p className="analysis-header-desc">
            Simple breakdown of your income, expenses, cash flow trends, and highest spending.
          </p>
        </div>

        <button
          onClick={handleResetFilters}
          className="glass-btn analysis-reset-btn"
        >
          <RotateCcw size={14} />
          <span>Reset Filters</span>
        </button>
      </div>

      {/* Easy Filter Controls */}
      <Card className="analysis-filter-card">
        <div className="analysis-filter-heading">
          <Filter size={16} className="analysis-filter-icon" />
          <span>Quick Filters</span>
        </div>

        <div className="analysis-filter-grid">
          <div>
            <label className="analysis-filter-label">Year</label>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="glass-input analysis-filter-select"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="analysis-filter-label">Month</label>
            <select
              value={month}
              onChange={e => setMonth(e.target.value ? Number(e.target.value) : '')}
              className="glass-input analysis-filter-select"
            >
              <option value="">All Months</option>
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="analysis-filter-label">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="glass-input analysis-filter-date"
            />
          </div>

          <div>
            <label className="analysis-filter-label">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="glass-input analysis-filter-date"
            />
          </div>

          <div>
            <label className="analysis-filter-label">Transaction Type</label>
            <div className="glass-card-subtle analysis-type-toggle">
              {['all', 'income', 'expense'].map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`analysis-type-btn ${type === t ? 'glass-btn-primary analysis-type-btn-active' : ''}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Cards: Clean 4-Column Layout */}
      <div className="analysis-kpi-grid">
        {/* Total Income */}
        <Card className="analysis-kpi-card analysis-kpi-positive">
          <div className="analysis-kpi-header">
            <span className="analysis-kpi-label">Total Income</span>
            <div className="analysis-kpi-icon-positive">
              <TrendingUp size={18} strokeWidth={2} />
            </div>
          </div>
          <p className="analysis-kpi-val analysis-kpi-val-positive">
            {fmt(summaryCards.total_income)}
          </p>
          <p className="analysis-kpi-sub">Total credited funds in range</p>
        </Card>

        {/* Total Expenses */}
        <Card className="analysis-kpi-card analysis-kpi-negative">
          <div className="analysis-kpi-header">
            <span className="analysis-kpi-label">Total Expenses</span>
            <div className="analysis-kpi-icon-negative">
              <TrendingDown size={18} strokeWidth={2} />
            </div>
          </div>
          <p className="analysis-kpi-val analysis-kpi-val-negative">
            {fmt(summaryCards.total_expenses)}
          </p>
          <p className="analysis-kpi-sub">Total debited spend in range</p>
        </Card>

        {/* Net Cash Flow / Balance */}
        <Card className="analysis-kpi-card analysis-kpi-accent">
          <div className="analysis-kpi-header">
            <span className="analysis-kpi-label">Net Cash Flow</span>
            <div className="analysis-kpi-icon-accent">
              <Wallet size={18} strokeWidth={2} />
            </div>
          </div>
          <p className={`analysis-kpi-val ${summaryCards.current_balance >= 0 ? 'analysis-kpi-val-accent' : 'analysis-kpi-val-negative'}`}>
            {fmt(summaryCards.current_balance)}
          </p>
          <p className="analysis-kpi-sub">Income minus total expenses</p>
        </Card>

        {/* Highest Single Expense */}
        <Card className="analysis-kpi-card analysis-kpi-purple">
          <div className="analysis-kpi-header">
            <span className="analysis-kpi-label">Highest Single Spend</span>
            <div className="analysis-kpi-icon-purple">
              <ArrowUpRight size={18} strokeWidth={2} />
            </div>
          </div>
          <p className="analysis-kpi-val analysis-kpi-val-purple">
            {fmt(summaryCards.highest_expense)}
          </p>
          <p className="analysis-kpi-sub">
            {summaryCards.avg_daily_expense > 0 ? `Avg ${fmt(summaryCards.avg_daily_expense)} / active day` : 'Single largest transaction'}
          </p>
        </Card>
      </div>

      {loading ? (
        <div className="glass-card analysis-loading-state">
          <span className="analysis-spinner" />
          <span className="analysis-loading-text">Loading cash flow analysis...</span>
        </div>
      ) : (
        <>
          {/* Main Charts Row */}
          <div className="analysis-charts-row">
            <Card>
              <SectionHeader
                title="Monthly Income vs Expenses"
                subtitle={`Side-by-side comparison for ${year}`}
                icon={Activity}
              />
              {!hasMonthlyBarData ? (
                <div className="analysis-no-data">
                  No monthly data recorded for {year}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyBarData} barGap={4} barCategoryGap="20%" margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.15} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6B7280' }} stroke="#888" />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} stroke="#888" tickFormatter={v => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} width={45} />
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
                <div className="analysis-no-data">
                  No cash flow trajectory data for {year}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={netCashFlowData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="netColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.15} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6B7280' }} stroke="#888" />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} stroke="#888" tickFormatter={v => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} width={45} />
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
          <div className="analysis-charts-row">
            <Card>
              <SectionHeader
                title="Daily Expense Timeline"
                subtitle={`Daily spend patterns for ${MONTHS[(month || currentMonth) - 1]} ${year}`}
                icon={Calendar}
              />
              {dailyExpenseData.length === 0 ? (
                <div className="analysis-no-data">
                  No daily expense entries for {MONTHS[(month || currentMonth) - 1]} {year}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={dailyExpenseData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.15} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} stroke="#888" />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} stroke="#888" tickFormatter={v => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} width={45} />
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
                <div className="analysis-no-data">
                  No expense transactions recorded
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={topTransactionsData} layout="vertical" barCategoryGap="25%" margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.15} vertical={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} stroke="#888" tickFormatter={v => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#9CA3AF' }}
                      stroke="#888"
                      width={100}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="analysis-top-tx-tooltip">
                            <p className="analysis-top-tx-desc">{data.fullDescription}</p>
                            <p className="analysis-top-tx-date">{data.date}</p>
                            <p className="analysis-top-tx-amount">{fmtDecimal(data.amount)}</p>
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