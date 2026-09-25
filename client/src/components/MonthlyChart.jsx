import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '../context/ThemeContext';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-modal p-3 rounded-xl border border-ink-100 dark:border-white/10 shadow-lg text-xs font-mono text-ink-900 dark:text-ink-50">
        <p className="font-sans font-semibold mb-1 opacity-80">{label}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} style={{ color: entry.color }} className="font-semibold flex items-center justify-between gap-4">
            <span>{entry.name}:</span>
            <span>₹{Number(entry.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const MonthlyChart = ({ transactions }) => {
  const { dark } = useTheme();
  const monthlyData = {};

  transactions.forEach(tx => {
    const month = tx.date.slice(0, 7); // "2026-06"
    if (!monthlyData[month]) monthlyData[month] = { month, income: 0, expense: 0 };
    if (tx.type === 'income') monthlyData[month].income += Number(tx.amount);
    else monthlyData[month].expense += Number(tx.amount);
  });

  const data = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

  if (data.length === 0) return <p className="text-ink-700 dark:text-ink-200 text-xs font-mono opacity-60">No transaction data available</p>;

  const gridColor = dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const tickColor = dark ? '#94a3b8' : '#64748b';

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="0" stroke={gridColor} vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fill: tickColor }} stroke={tickColor} />
        <YAxis tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fill: tickColor }} stroke={tickColor} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="income" fill="#2563EB" name="Income" radius={[2, 2, 0, 0]} />
        <Bar dataKey="expense" fill="#DC2626" name="Expense" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default MonthlyChart;