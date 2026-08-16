import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import Layout from '../components/Layout';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Salary', 'Freelance', 'Other'];

const CATEGORY_COLORS = {
  Food:          '#2A5C8A',
  Transport:     '#4A7BA8',
  Shopping:      '#8C6D46',
  Entertainment: '#6B4F7D',
  Health:        '#B5473B',
  Salary:        '#2F7A4F',
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
        <p key={i} className="font-semibold flex items-center justify-between gap-3" style={{ color: p.color }}>
          <span>{p.name}:</span>
          <span>{fmt(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

const SectionHeader = ({ title, subtitle }) => (
  <div className="mb-4">
    <h2 className="text-sm font-semibold text-ink-900 dark:text-ink-50">{title}</h2>
    {subtitle && <p className="text-xs text-ink-700 dark:text-ink-200 opacity-60 mt-0.5">{subtitle}</p>}
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

  useEffect(() => {
    axios.get('/transactions').then(res => {
      setTransactions(res.data);
    }).finally(() => setLoading(false));
  }, []);

  const yearTxs = transactions.filter(tx => new Date(tx.date).getFullYear() === year);
  const years = [...new Set(transactions.map(tx => new Date(tx.date).getFullYear()))].sort((a, b) => b - a);

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
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Income',  value: fmt(totalIncome),  color: 'text-positive' },
          { label: 'Total Expense', value: fmt(totalExpense), color: 'text-negative' },
          { label: 'Net Savings',   value: fmt(savings),      color: savings >= 0 ? 'text-accent' : 'text-negative' },
          { label: 'Savings Rate',  value: `${savingsRate}%`, color: 'text-ink-900 dark:text-ink-50' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <p className="text-[10px] font-mono uppercase tracking-wider text-ink-700 dark:text-ink-200 opacity-60 mb-1">{label}</p>
            <p className={`font-mono text-lg font-semibold ${color}`}>{value}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <SectionHeader title="Monthly Income vs Expense" subtitle={`Full year comparison — ${year}`} />
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyData} barGap={2} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="0" stroke="#EDECE8" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} stroke="#888" />
            <YAxis tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} stroke="#888" tickFormatter={v => '₹' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="income"  name="Income"  fill="#2F7A4F" radius={[2,2,0,0]} />
            <Bar dataKey="expense" name="Expense" fill="#B5473B" radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="mb-6">
        <SectionHeader title="Spending Trend" subtitle="Month-over-month expense line" />
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="0" stroke="#EDECE8" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} stroke="#888" />
            <YAxis tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} stroke="#888" tickFormatter={v => '₹' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="expense" name="Expense" stroke="#B5473B" strokeWidth={2} dot={{ r: 3, fill: '#B5473B' }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="income"  name="Income"  stroke="#2F7A4F" strokeWidth={2} dot={{ r: 3, fill: '#2F7A4F' }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

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