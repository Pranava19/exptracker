import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-ink-900 text-ink-50 p-3 rounded-card border border-ink-700 shadow-lg text-xs font-mono">
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
  const monthlyData = {};

  transactions.forEach(tx => {
    const month = tx.date.slice(0, 7); // "2026-06"
    if (!monthlyData[month]) monthlyData[month] = { month, income: 0, expense: 0 };
    if (tx.type === 'income') monthlyData[month].income += Number(tx.amount);
    else monthlyData[month].expense += Number(tx.amount);
  });

  const data = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

  if (data.length === 0) return <p className="text-ink-700 dark:text-ink-200 text-xs font-mono opacity-60">No transaction data available</p>;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="0" stroke="#EDECE8" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} stroke="#888" />
        <YAxis tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} stroke="#888" />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="income" fill="#3F6B4F" name="Income" radius={[2, 2, 0, 0]} />
        <Bar dataKey="expense" fill="#B5473B" name="Expense" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default MonthlyChart;