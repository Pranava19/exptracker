import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '../context/ThemeContext';
import './CategoryChart.css';

import { CATEGORY_COLORS } from '../constants/categories';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-modal category-chart-tooltip">
        <p className="category-chart-tooltip-label">{label}</p>
        {payload.filter(p => p.value > 0).map((entry, index) => (
          <p key={`item-${index}`} style={{ color: entry.color }} className="category-chart-tooltip-row">
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
  const { dark } = useTheme();
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
      <div className="category-chart-empty-container">
        <p className="category-chart-empty-text">No expense data available</p>
      </div>
    );
  }

  const gridColor = dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const tickColor = dark ? '#94a3b8' : '#64748b';

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barCategoryGap="20%" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="0" stroke={gridColor} vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fill: tickColor }} stroke={tickColor} />
        <YAxis tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fill: tickColor }} stroke={tickColor} tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
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