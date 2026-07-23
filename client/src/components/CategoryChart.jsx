import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const CATEGORY_COLORS = {
  Food: '#4F8EF7',
  Transport: '#059669',
  Shopping: '#F59E0B',
  Entertainment: '#8B5CF6',
  Health: '#EC4899',
  Salary: '#14B8A6',
  Freelance: '#F97316',
  Other: '#9CA3AF',
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
        <p style={{ fontSize: 13, color: '#9CA3AF' }}>No expense data yet</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barCategoryGap="25%" barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
        />
        <Tooltip
          formatter={(val, name) => [`₹${Number(val).toLocaleString('en-IN')}`, name]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8EAED' }}
        />
        <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        {allCategories.map(cat => (
          <Bar
            key={cat}
            dataKey={cat}
            fill={CATEGORY_COLORS[cat] || '#9CA3AF'}
            radius={[3, 3, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default CategoryChart;