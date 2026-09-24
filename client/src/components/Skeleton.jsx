import React from 'react';

export const SkeletonCard = () => (
  <div className="glass-card p-5 animate-pulse">
    <div className="h-2.5 bg-ink-200/60 dark:bg-white/10 rounded-full w-1/4 mb-4"></div>
    <div className="h-6 bg-ink-200/60 dark:bg-white/10 rounded-lg w-1/3"></div>
  </div>
);

export const SkeletonRow = () => (
  <tr className="border-b border-white/20 dark:border-white/5 animate-pulse">
    {[...Array(8)].map((_, i) => (
      <td key={i} className="py-3 pr-4">
        <div className="h-2.5 bg-ink-200/60 dark:bg-white/10 rounded-full" style={{ width: `${50 + (i * 13) % 40}%` }}></div>
      </td>
    ))}
  </tr>
);

export const SkeletonChart = () => (
  <div className="animate-pulse">
    <div className="flex items-end gap-2 h-40 px-1">
      {[55, 70, 45, 85, 60, 75, 50].map((h, i) => (
        <div key={i} className="flex-1 bg-ink-200/60 dark:bg-white/10 rounded-t-md" style={{ height: `${h}%` }}></div>
      ))}
    </div>
  </div>
);