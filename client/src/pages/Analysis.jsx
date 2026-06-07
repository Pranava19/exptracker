import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import Layout from '../components/Layout';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Salary', 'Freelance', 'Other'];

const CATEGORY_COLORS = {
  Food:          '#3B82F6',
  Transport:     '#8B5CF6',
  Shopping:      '#EC4899',
  Entertainment: '#F59E0B',
  Health:        '#10B981',
  Salary:        '#06B6D4',
  Freelance:     '#6366F1',
  Other:         '#94A3B8',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#1E2A3B] border border-gray-100 dark:border-[#252D3D] rounded-lg px-3 py-2 shadow-lg">
      <p className="text-[11px] font-semibold text-gray-500 dark:text-[#64748B] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[12px] font-bold" style={{ color: p.color }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

const SectionHeader = ({ title, subtitle }) => (
  <div className="mb-4">
    <h2 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 tracking-tight">{title}</h2>
    {subtitle && <p className="text-[11px] text-gray-400 dark:text-[#475569] mt-0.5">{subtitle}</p>}
  </div>
);

const Card = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-[#161B27] border border-gray-100 dark:border-[#252D3D] rounded-xl p-5 ${className}`}>
    {children}
  </div>
);

const Analysis = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    axios.get('/transactions').then(res => {
      setTransactions(res.data);
    }).finally(() => setLoading(false));
  }, []);

  const yearTxs = transactions.filter(tx => new Date(tx.date).getFullYear() === year);

  // Available years from data
  const years = [...new Set(transactions.map(tx => new Date(tx.date).getFullYear()))].sort((a, b) => b - a);

  // ── Category breakdown (expenses only) ──────────────────────────────────
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

  // ── Monthly trend ────────────────────────────────────────────────────────
  const monthlyData = MONTHS.map((m, i) => {
    const monthTxs = yearTxs.filter(tx => new Date(tx.date).getMonth() === i);
    return {
      month: m,
      income:  monthTxs.filter(tx => tx.type === 'income').reduce((s, tx) => s + Number(tx.amount), 0),
      expense: monthTxs.filter(tx => tx.type === 'expense').reduce((s, tx) => s + Number(tx.amount), 0),
    };
  });

  // ── Monthly per-category (expenses) ─────────────────────────────────────
  const topCategories = categoryExpense.slice(0, 5).map(c => c.name);
  const monthlyCategoryData = MONTHS.map((m, i) => {
    const monthTxs = yearTxs.filter(tx => new Date(tx.date).getMonth() === i && tx.type === 'expense');
    const entry = { month: m };
    topCategories.forEach(cat => {
      entry[cat] = monthTxs.filter(tx => tx.category === cat).reduce((s, tx) => s + Number(tx.amount), 0);
    });
    return entry;
  });

  // ── Summary stats ────────────────────────────────────────────────────────
  const totalIncome  = yearTxs.filter(tx => tx.type === 'income').reduce((s, tx) => s + Number(tx.amount), 0);
  const totalExpense = yearTxs.filter(tx => tx.type === 'expense').reduce((s, tx) => s + Number(tx.amount), 0);
  const savings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((savings / totalIncome) * 100).toFixed(1) : 0;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24 text-gray-400 dark:text-[#475569]">
          <span className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mr-3" />
          <span className="text-[13px]">Loading analysis...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Year selector + summary */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 tracking-tight">Analysis</h1>
          <p className="text-[11px] text-gray-400 dark:text-[#475569] mt-0.5">{yearTxs.length} transactions in {year}</p>
        </div>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="text-[12px] border border-gray-200 dark:border-[#252D3D] rounded-lg px-3 py-1.5 bg-white dark:bg-[#1E2A3B] text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-400 transition-colors"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Income',  value: fmt(totalIncome),  color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Total Expense', value: fmt(totalExpense), color: 'text-red-500 dark:text-red-400' },
          { label: 'Net Savings',   value: fmt(savings),      color: savings >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500 dark:text-red-400' },
          { label: 'Savings Rate',  value: `${savingsRate}%`, color: 'text-gray-700 dark:text-gray-300' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.6px] text-gray-400 dark:text-[#475569] mb-1">{label}</p>
            <p className={`text-[17px] font-bold tabular-nums ${color}`}>{value}</p>
          </Card>
        ))}
      </div>

      {/* Monthly income vs expense */}
      <Card className="mb-5">
        <SectionHeader title="Monthly Income vs Expense" subtitle={`Full year view — ${year}`} />
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyData} barGap={2} barCategoryGap="30%">
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => '₹' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="income"  name="Income"  fill="#10B981" radius={[3,3,0,0]} />
            <Bar dataKey="expense" name="Expense" fill="#F87171" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Monthly trend line */}
      <Card className="mb-5">
        <SectionHeader title="Spending Trend" subtitle="Month-over-month expense line" />
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2A3B" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => '₹' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="expense" name="Expense" stroke="#F87171" strokeWidth={2} dot={{ r: 3, fill: '#F87171' }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="income"  name="Income"  stroke="#10B981" strokeWidth={2} dot={{ r: 3, fill: '#10B981' }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Two column: expense pie + income pie */}
      <div className="grid md:grid-cols-2 gap-5 mb-5">
        <Card>
          <SectionHeader title="Expense by Category" subtitle="Where your money goes" />
          {categoryExpense.length === 0 ? (
            <p className="text-[12px] text-gray-400 dark:text-[#475569] py-8 text-center">No expense data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryExpense} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                  {categoryExpense.map(entry => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#94A3B8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <SectionHeader title="Income by Category" subtitle="Where your money comes from" />
          {categoryIncome.length === 0 ? (
            <p className="text-[12px] text-gray-400 dark:text-[#475569] py-8 text-center">No income data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryIncome} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                  {categoryIncome.map(entry => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#94A3B8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Category bar chart — expenses */}
      <Card className="mb-5">
        <SectionHeader title="Expense Breakdown" subtitle="Total spent per category" />
        {categoryExpense.length === 0 ? (
          <p className="text-[12px] text-gray-400 dark:text-[#475569] py-8 text-center">No expense data</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryExpense} layout="vertical" barCategoryGap="25%">
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => '₹' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="amount" name="Expense" radius={[0,3,3,0]}>
                {categoryExpense.map(entry => (
                  <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#94A3B8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Monthly category stacked bar — top 5 expense categories */}
      {topCategories.length > 0 && (
        <Card className="mb-5">
          <SectionHeader title="Monthly Category Breakdown" subtitle={`Top ${topCategories.length} expense categories by month`} />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyCategoryData} barCategoryGap="25%">
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => '₹' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
              {topCategories.map(cat => (
                <Bar key={cat} dataKey={cat} stackId="a" fill={CATEGORY_COLORS[cat] || '#94A3B8'} radius={cat === topCategories[topCategories.length - 1] ? [3,3,0,0] : [0,0,0,0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Per-category monthly detail */}
      <SectionHeader title="Per Category Monthly Detail" subtitle="Drill down into each category" />
      <div className="grid md:grid-cols-2 gap-4 mb-5">
        {categoryExpense.map(({ name, amount }) => {
          const catMonthly = MONTHS.map((m, i) => ({
            month: m,
            amount: yearTxs
              .filter(tx => tx.type === 'expense' && tx.category === name && new Date(tx.date).getMonth() === i)
              .reduce((s, tx) => s + Number(tx.amount), 0),
          }));
          return (
            <Card key={name}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLORS[name] }} />
                  <p className="text-[12px] font-semibold text-gray-800 dark:text-gray-200">{name}</p>
                </div>
                <p className="text-[12px] font-bold tabular-nums text-red-500 dark:text-red-400">{fmt(amount)}</p>
              </div>
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={catMonthly} barCategoryGap="30%">
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => fmt(v)} labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 11, background: '#1E2A3B', border: 'none', borderRadius: 8 }} />
                  <Bar dataKey="amount" fill={CATEGORY_COLORS[name] || '#94A3B8'} radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          );
        })}
      </div>
    </Layout>
  );
};

export default Analysis;