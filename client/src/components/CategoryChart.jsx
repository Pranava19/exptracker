import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CATEGORY_COLORS = {
  Food: '#2A5C8A',
  Transport: '#4A7BA8',
  Shopping: '#8C6D46',
  Entertainment: '#6B4F7D',
  Health: '#B5473B',
  Salary: '#2F7A4F',
  Freelance: '#1A3F63',
  Other: '#6E6E6B',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-ink-900 text-ink-50 p-3 rounded-card border border-ink-700 shadow-lg text-xs font-mono">
        <p className="font-sans font-semibold mb-1 opacity-80">{label}</p>
        {payload.filter(p => p.value > 0).map((entry, index) => (
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

const CategoryChart = ({ transactions }) => {
  const monthMap = {};

  transactions
    .filter(tx => tx.type === 'expense')
    .forEach(tx => {
      const month = tx.date.slice(0, 7);
      if (!monthMap[month]) monthMap[month] = {};
      const cat = tx.category || 'Other';
      if (!monthMap[month][cat]) monthMap[month][cat] = 0;
      monthMap[month][cat] += Number(tx.amount);
    });

  const allCategories = [...new Set(
    transactions
      .filter(tx => tx.type === 'expense')
      .map(tx => tx.category || 'Other')
  )];

  const data = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, cats]) => ({
      month: new Date(month + '-01').toLocaleString('default', { month: 'short', year: '2-digit' }),
      ...Object.fromEntries(
        allCategories.map(cat => [cat, parseFloat((cats[cat] || 0).toFixed(2))])
      ),
    }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-xs font-mono text-ink-700 dark:text-ink-200 opacity-60">No expense data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barCategoryGap="20%" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="0" stroke="#EDECE8" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} stroke="#888" />
        <YAxis tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} stroke="#888" tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
        <Tooltip content={<CustomTooltip />} />
        {allCategories.map(cat => (
          <Bar
            key={cat}
            dataKey={cat}
            fill={CATEGORY_COLORS[cat] || '#6E6E6B'}
            radius={[2, 2, 0, 0]}
            stackId="a"
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default CategoryChart;