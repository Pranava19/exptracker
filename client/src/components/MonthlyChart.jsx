import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const MonthlyChart = ({ transactions }) => {
  const monthlyData = {};

  transactions.forEach(tx => {
    const month = tx.date.slice(0, 7); // "2026-06"
    if (!monthlyData[month]) monthlyData[month] = { month, income: 0, expense: 0 };
    if (tx.type === 'income') monthlyData[month].income += Number(tx.amount);
    else monthlyData[month].expense += Number(tx.amount);
  });

  const data = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

  if (data.length === 0) return <p className="text-gray-500 text-sm">No data for chart.</p>;

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(val) => `₹${val.toFixed(2)}`} />
        <Legend />
        <Bar dataKey="income" fill="#22c55e" name="Income" />
        <Bar dataKey="expense" fill="#ef4444" name="Expense" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default MonthlyChart;