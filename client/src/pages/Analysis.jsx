import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import Layout from '../components/Layout';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
  ComposedChart,
} from 'recharts';
import { TrendingUp, AlertTriangle, Calendar, ShieldCheck, Activity } from 'lucide-react';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Salary', 'Freelance', 'Other'];

const CATEGORY_COLORS = {
  Food:          '#2A5C8A',
  Transport:     '#4A7BA8',
  Shopping:      '#8C6D46',
  Entertainment: '#6B4F7D',
  Health:        '#B5473B',
  Salary:        '#2563EB',
  Freelance:     '#1A3F63',
  Other:         '#6E6E6B',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ink-900 text-ink-50 border border-ink-700 rounded-card p-3 shadow-lg font-mono text-xs">
      <p className="font-sans font-semibold mb-1 opacity-80">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold flex items-center justify-between gap-3" style={{ color: p.color || p.fill }}>
          <span>{p.name}:</span>
          <span>{typeof p.value === 'number' && !String(p.name).includes('%') && !String(p.name).includes('Rate') ? fmt(p.value) : p.value}</span>
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
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  // Analytics endpoints state
  const [topPayees, setTopPayees] = useState([]);
  const [yoyData, setYoyData] = useState([]);
  const [weekdaySplit, setWeekdaySplit] = useState({ weekday_total: 0, weekend_total: 0, weekday_avg: 0, weekend_avg: 0 });
  const [rollingWindow, setRollingWindow] = useState(7);
  const [rollingData, setRollingData] = useState([]);
  const [incomeStability, setIncomeStability] = useState({ mean_income: 0, stddev: 0, coefficient_of_variation: 0 });
  const [savingsMonthly, setSavingsMonthly] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [projection, setProjection] = useState({ daily_avg: 0, days_elapsed: 0, days_in_month: 0, projected_total: 0 });

  useEffect(() => {
    axios.get('/transactions').then(res => {
      setTransactions(res.data);
    }).finally(() => setLoading(false));
  }, []);

  const years = [...new Set(transactions.map(tx => new Date(tx.date).getFullYear()))].sort((a, b) => b - a);
  const availableYears = years.length > 0 ? years : [new Date().getFullYear()];

  // Fetch year-dependent analysis data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const yoyYearsParam = availableYears.slice(0, 2).reverse().join(',');
        const [
          payeesRes,
          yoyRes,
          weekdayRes,
          rollingRes,
          stabilityRes,
          savingsRes,
          anomaliesRes,
          projectionRes
        ] = await Promise.all([
          axios.get(`/analysis/top-payees?year=${year}&limit=10`),
          axios.get(`/analysis/yoy?years=${yoyYearsParam}`),
          axios.get(`/analysis/weekday-split?year=${year}`),
          axios.get(`/analysis/rolling-avg?year=${year}&window=${rollingWindow}`),
          axios.get(`/analysis/income-stability?year=${year}`),
          axios.get(`/analysis/savings-rate-monthly?year=${year}`),
          axios.get(`/analysis/anomalies?year=${year}&limit=5`),
          axios.get('/analysis/projection'),
        ]);

        setTopPayees(payeesRes.data || []);
        setYoyData(yoyRes.data || []);
        setWeekdaySplit(weekdayRes.data || { weekday_total: 0, weekend_total: 0, weekday_avg: 0, weekend_avg: 0 });
        setRollingData(rollingRes.data || []);
        setIncomeStability(stabilityRes.data || { mean_income: 0, stddev: 0, coefficient_of_variation: 0 });
        setSavingsMonthly(savingsRes.data || []);
        setAnomalies(anomaliesRes.data || []);
        setProjection(projectionRes.data || { daily_avg: 0, days_elapsed: 0, days_in_month: 0, projected_total: 0 });
      } catch (err) {
        console.error('Error fetching analytics:', err);
      }
    };
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, rollingWindow, transactions]);

  const yearTxs = transactions.filter(tx => new Date(tx.date).getFullYear() === year);

  const categoryExpense = CATEGORIES.map(cat => ({
    name: cat,
    amount: yearTxs
      .filter(tx => tx.type === 'expense' && tx.category === cat)
      .reduce((s, tx) => s + Number(tx.amount), 0),
  })).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);

  const categoryIncome = CATEGORIES.map(cat => ({
    name: cat,
    amount: yearTxs
      .filter(tx => tx.type === 'income' && tx.category === cat)
      .reduce((s, tx) => s + Number(tx.amount), 0),
  })).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);

  const monthlyData = MONTHS.map((m, i) => {
    const monthTxs = yearTxs.filter(tx => new Date(tx.date).getMonth() === i);
    return {
      month: m,
      income:  monthTxs.filter(tx => tx.type === 'income').reduce((s, tx) => s + Number(tx.amount), 0),
      expense: monthTxs.filter(tx => tx.type === 'expense').reduce((s, tx) => s + Number(tx.amount), 0),
    };
  });

  const totalIncome  = yearTxs.filter(tx => tx.type === 'income').reduce((s, tx) => s + Number(tx.amount), 0);
  const totalExpense = yearTxs.filter(tx => tx.type === 'expense').reduce((s, tx) => s + Number(tx.amount), 0);
  const savings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((savings / totalIncome) * 100).toFixed(1) : 0;

  // Biggest expense of the year
  const biggestExpenseTx = yearTxs
    .filter(tx => tx.type === 'expense')
    .reduce((max, tx) => Number(tx.amount) > Number(max?.amount || 0) ? tx : max, null);

  // YoY data transform
  const uniqueYoyYears = [...new Set(yoyData.map(d => d.year))];
  const formattedYoyData = MONTHS.map((m, idx) => {
    const row = { month: m };
    uniqueYoyYears.forEach(y => {
      const match = yoyData.find(d => d.year === y && d.month === idx + 1);
      row[`${y}_expense`] = match ? match.expense : 0;
      row[`${y}_income`] = match ? match.income : 0;
    });
    return row;
  });

  // Weekday vs Weekend calculation
  const { weekday_avg, weekend_avg, weekday_total, weekend_total } = weekdaySplit;
  let splitText = 'Spending is evenly balanced';
  if (weekday_avg > 0 && weekend_avg > weekday_avg) {
    const pct = (((weekend_avg - weekday_avg) / weekday_avg) * 100).toFixed(1);
    splitText = `You spend ${pct}% more per day on weekends`;
  } else if (weekend_avg > 0 && weekday_avg > weekend_avg) {
    const pct = (((weekday_avg - weekend_avg) / weekend_avg) * 100).toFixed(1);
    splitText = `You spend ${pct}% more per day on weekdays`;
  }

  const weekdayChartData = [
    { name: 'Weekday Avg', amount: weekday_avg },
    { name: 'Weekend Avg', amount: weekend_avg },
  ];

  // Savings rate monthly chart data
  const savingsRateChartData = MONTHS.map((m, idx) => {
    const match = savingsMonthly.find(s => s.month === idx + 1);
    return {
      month: m,
      rate: match && match.savings_rate !== null ? Number(match.savings_rate.toFixed(1)) : 0,
    };
  });
  const latestSavingsRate = savingsMonthly.length > 0 && savingsMonthly[savingsMonthly.length - 1].savings_rate !== null
    ? savingsMonthly[savingsMonthly.length - 1].savings_rate.toFixed(1)
    : savingsRate;

  // Max top payee amount for progress bars
  const maxPayeeTotal = topPayees[0]?.total_amount || 1;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24 text-ink-700 dark:text-ink-200">
          <span className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mr-3" />
          <span className="text-xs font-mono">Loading financial analytics...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-base font-semibold text-ink-900 dark:text-ink-50">Financial Analysis</h1>
          <p className="text-xs font-mono text-ink-700 dark:text-ink-200 opacity-60 mt-0.5">{yearTxs.length} transactions in {year}</p>
        </div>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="text-xs font-mono border border-ink-100 dark:border-[#2C2C28] rounded-md px-3 py-1.5 bg-white dark:bg-[#252522] text-ink-900 dark:text-ink-50 focus:outline-none focus:border-accent"
        >
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Income',  value: fmt(totalIncome),  color: 'text-positive' },
          { label: 'Total Expense', value: fmt(totalExpense), color: 'text-negative' },
          { label: 'Net Savings',   value: fmt(savings),      color: savings >= 0 ? 'text-accent' : 'text-negative' },
          { label: 'Savings Rate',  value: `${latestSavingsRate}%`, color: 'text-ink-900 dark:text-ink-50' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <p className="text-[10px] font-mono uppercase tracking-wider text-ink-700 dark:text-ink-200 opacity-60 mb-1">{label}</p>
            <p className={`font-mono text-lg font-semibold ${color}`}>{value}</p>
          </Card>
        ))}
      </div>

      {/* Insights Row: Daily Avg Spend with Projection + Income Stability + Biggest Expense */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Daily Average & Projected Spend */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-ink-700 dark:text-ink-200 opacity-70">Daily Average Spend</span>
              <div className="p-1.5 rounded bg-accent/10 text-accent">
                <Calendar size={16} strokeWidth={1.5} />
              </div>
            </div>
            <p className="font-mono text-xl font-semibold text-ink-900 dark:text-ink-50">{fmt(projection.daily_avg)}/day</p>
            <p className="text-xs text-accent font-semibold mt-2 pt-2 border-t border-ink-100 dark:border-[#2C2C28]">
              Projected: <span className="font-mono">{fmt(projection.projected_total)}</span> by month end
            </p>
          </div>
        </Card>

        {/* Income Stability Stat Card */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-ink-700 dark:text-ink-200 opacity-70">Income Stability</span>
              <div className={`p-1.5 rounded ${incomeStability.coefficient_of_variation < 15 ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'}`}>
                <Activity size={16} strokeWidth={1.5} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="font-mono text-xl font-semibold text-ink-900 dark:text-ink-50">
                {incomeStability.coefficient_of_variation.toFixed(1)}% CoV
              </p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${incomeStability.coefficient_of_variation < 15 ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'}`}>
                {incomeStability.coefficient_of_variation < 15 ? 'Stable' : 'Irregular'}
              </span>
            </div>
            <p className="text-[11px] text-ink-700 dark:text-ink-200 opacity-60 mt-2 pt-2 border-t border-ink-100 dark:border-[#2C2C28]">
              Mean: {fmt(incomeStability.mean_income)} · StdDev: {fmt(incomeStability.stddev)}
            </p>
          </div>
        </Card>

        {/* Biggest Expense */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-ink-700 dark:text-ink-200 opacity-70">Biggest Expense ({year})</span>
              <div className="p-1.5 rounded bg-negative/10 text-negative">
                <TrendingUp size={16} strokeWidth={1.5} />
              </div>
            </div>
            {biggestExpenseTx ? (
              <>
                <p className="font-mono text-xl font-semibold text-negative">{fmt(biggestExpenseTx.amount)}</p>
                <p className="text-[11px] text-ink-700 dark:text-ink-200 opacity-70 truncate mt-2 pt-2 border-t border-ink-100 dark:border-[#2C2C28]">
                  {(biggestExpenseTx.payee || biggestExpenseTx.description || '').slice(0, 28)} · {biggestExpenseTx.date.slice(0, 10)}
                </p>
              </>
            ) : (
              <p className="text-xs text-ink-700 dark:text-ink-200 opacity-60 mt-2">No expense recorded</p>
            )}
          </div>
        </Card>
      </div>

      {/* Monthly Income vs Expense */}
      <Card className="mb-6">
        <SectionHeader title="Monthly Income vs Expense" subtitle={`Full year comparison — ${year}`} />
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyData} barGap={2} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="0" stroke="#EDECE8" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} stroke="#888" />
            <YAxis tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} stroke="#888" tickFormatter={v => '₹' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="income"  name="Income"  fill="#2563EB" radius={[2,2,0,0]} />
            <Bar dataKey="expense" name="Expense" fill="#B5473B" radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Rolling Average & Spending Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Rolling Average Chart */}
        <Card>
          <SectionHeader
            title="Rolling Average Spend"
            subtitle={`Daily spend overlay with ${rollingWindow}-day rolling mean`}
            action={
              <div className="flex gap-1 bg-ink-50 dark:bg-[#252522] p-1 rounded-md border border-ink-100 dark:border-[#2C2C28]">
                <button
                  onClick={() => setRollingWindow(7)}
                  className={`px-2.5 py-1 text-[11px] font-mono font-medium rounded ${rollingWindow === 7 ? 'bg-accent text-white' : 'text-ink-700 dark:text-ink-200 hover:text-ink-900'}`}
                >
                  7-Day
                </button>
                <button
                  onClick={() => setRollingWindow(30)}
                  className={`px-2.5 py-1 text-[11px] font-mono font-medium rounded ${rollingWindow === 30 ? 'bg-accent text-white' : 'text-ink-700 dark:text-ink-200 hover:text-ink-900'}`}
                >
                  30-Day
                </button>
              </div>
            }
          />
          {rollingData.length === 0 ? (
            <p className="text-xs font-mono text-ink-700 dark:text-ink-200 opacity-60 py-12 text-center">No daily expense data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={rollingData}>
                <CartesianGrid strokeDasharray="0" stroke="#EDECE8" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} stroke="#888" tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} stroke="#888" tickFormatter={v => '₹' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="daily_total" name="Daily Total" fill="#93C5FD" radius={[2, 2, 0, 0]} opacity={0.6} />
                <Line type="monotone" dataKey="rolling_avg" name={`${rollingWindow}-Day Avg`} stroke="#2563EB" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Monthly Savings Rate Trend Line Chart */}
        <Card>
          <SectionHeader title="Savings Rate Trend" subtitle={`Monthly savings rate percentage — ${year}`} />
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={savingsRateChartData}>
              <CartesianGrid strokeDasharray="0" stroke="#EDECE8" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} stroke="#888" />
              <YAxis tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} stroke="#888" tickFormatter={v => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="rate" name="Savings Rate (%)" stroke="#2563EB" strokeWidth={2} dot={{ r: 3, fill: '#2563EB' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* YoY Comparison & Weekday vs Weekend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* YoY Comparison */}
        <Card>
          <SectionHeader title="Year-over-Year Comparison" subtitle="Monthly expense comparison across years" />
          {uniqueYoyYears.length < 2 ? (
            <div className="py-12 px-4 text-center border border-dashed border-ink-100 dark:border-[#2C2C28] rounded-card bg-ink-50/50 dark:bg-[#252522]/50">
              <ShieldCheck size={28} className="mx-auto text-accent opacity-70 mb-2" />
              <p className="text-xs font-mono font-medium text-ink-700 dark:text-ink-200">
                Not enough data yet — check back after your first full year
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={formattedYoyData} barGap={2} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="0" stroke="#EDECE8" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} stroke="#888" />
                <YAxis tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} stroke="#888" tickFormatter={v => '₹' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} />
                <Tooltip content={<CustomTooltip />} />
                {uniqueYoyYears.map((y, idx) => (
                  <Bar key={y} dataKey={`${y}_expense`} name={`${y} Expense`} fill={idx === 0 ? '#4A7BA8' : '#2563EB'} radius={[2, 2, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Weekday vs Weekend */}
        <Card>
          <SectionHeader title="Weekday vs Weekend Spend" subtitle={splitText} />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekdayChartData} barCategoryGap="40%">
              <CartesianGrid strokeDasharray="0" stroke="#EDECE8" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} stroke="#888" />
              <YAxis tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} stroke="#888" tickFormatter={v => '₹' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="amount" name="Daily Avg Spend" radius={[4, 4, 0, 0]}>
                <Cell fill="#2563EB" />
                <Cell fill="#B5473B" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 pt-3 border-t border-ink-100 dark:border-[#2C2C28] flex justify-between text-xs font-mono text-ink-700 dark:text-ink-200">
            <span>Weekday Total: {fmt(weekday_total)}</span>
            <span>Weekend Total: {fmt(weekend_total)}</span>
          </div>
        </Card>
      </div>

      {/* Top 10 Payees & Unusual Transactions (Anomalies) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top 10 Payees */}
        <Card>
          <SectionHeader title="Top 10 Payees by Spend" subtitle={`Highest debited entities in ${year}`} />
          {topPayees.length === 0 ? (
            <p className="text-xs font-mono text-ink-700 dark:text-ink-200 opacity-60 py-8 text-center">No payee transactions recorded</p>
          ) : (
            <div className="space-y-3">
              {topPayees.map((item, idx) => (
                <div key={item.payee + idx}>
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-3">
                      <span className="font-mono text-ink-700 dark:text-ink-200 opacity-60 w-5">#{idx + 1}</span>
                      <p className="font-medium text-ink-900 dark:text-ink-50 truncate">{item.payee}</p>
                      <span className="text-[10px] font-mono text-ink-700 dark:text-ink-200 opacity-50">({item.txn_count} txns)</span>
                    </div>
                    <p className="font-mono font-semibold text-negative">{fmt(item.total_amount)}</p>
                  </div>
                  <div className="ml-7 h-1.5 rounded-full bg-ink-100 dark:bg-ink-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${(item.total_amount / maxPayeeTotal) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Unusual Transactions (Anomalies) */}
        <Card>
          <SectionHeader title="Unusual Transactions" subtitle="Spikes exceeding 2 standard deviations from mean" />
          {anomalies.length === 0 ? (
            <div className="py-12 text-center">
              <ShieldCheck size={28} className="mx-auto text-positive opacity-80 mb-2" />
              <p className="text-xs font-mono text-ink-700 dark:text-ink-200 opacity-70">No unusual spending anomalies detected in {year}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {anomalies.map((anom, idx) => (
                <div key={idx} className="p-3 rounded-md bg-negative/5 border border-negative/10 flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle size={14} className="text-negative flex-shrink-0" />
                      <p className="text-xs font-semibold text-ink-900 dark:text-ink-50 truncate">{anom.payee}</p>
                    </div>
                    <p className="text-[10px] font-mono text-ink-700 dark:text-ink-200 opacity-70">{anom.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs font-semibold text-negative">{fmt(anom.amount)}</p>
                    <span className="inline-block mt-0.5 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-negative/10 text-negative">
                      +{anom.std_devs_above_mean.toFixed(1)}σ above avg
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Category Distributions */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <SectionHeader title="Expense by Category" subtitle="Distribution of spend" />
          {categoryExpense.length === 0 ? (
            <p className="text-xs font-mono text-ink-700 dark:text-ink-200 opacity-60 py-8 text-center">No expense data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryExpense} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                  {categoryExpense.map(entry => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#6E6E6B'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs font-sans">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <SectionHeader title="Income by Category" subtitle="Distribution of credited funds" />
          {categoryIncome.length === 0 ? (
            <p className="text-xs font-mono text-ink-700 dark:text-ink-200 opacity-60 py-8 text-center">No income data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryIncome} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                  {categoryIncome.map(entry => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#6E6E6B'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs font-sans">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card className="mb-6">
        <SectionHeader title="Expense Breakdown" subtitle="Total spent per category" />
        {categoryExpense.length === 0 ? (
          <p className="text-xs font-mono text-ink-700 dark:text-ink-200 opacity-60 py-8 text-center">No expense data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryExpense} layout="vertical" barCategoryGap="25%">
              <XAxis type="number" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} stroke="#888" tickFormatter={v => '₹' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} stroke="#888" width={90} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="amount" name="Expense" radius={[0,2,2,0]}>
                {categoryExpense.map(entry => (
                  <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#6E6E6B'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </Layout>
  );
};

export default Analysis;