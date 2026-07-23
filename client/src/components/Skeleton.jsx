import React from 'react';

export const SkeletonCard = () => (
  <div className="bg-white dark:bg-[#161B27] border border-gray-100 dark:border-[#252D3D] rounded p-5 animate-pulse">
    <div className="h-2.5 bg-gray-100 dark:bg-[#1E2A3B] rounded w-1/4 mb-4"></div>
    <div className="h-5 bg-gray-100 dark:bg-[#1E2A3B] rounded w-1/3"></div>
  </div>
);

export const SkeletonRow = () => (
  <tr className="border-b border-gray-50 dark:border-[#1A2235] animate-pulse">
    {[...Array(8)].map((_, i) => (
      <td key={i} className="py-3 pr-4">
        <div className="h-2.5 bg-gray-100 dark:bg-[#1E2A3B] rounded" style={{ width: `${50 + (i * 13) % 40}%` }}></div>
      </td>
    ))}
  </tr>
);

export const SkeletonChart = () => (
  <div className="animate-pulse">
    <div className="flex items-end gap-2 h-40 px-1">
      {[55, 70, 45, 85, 60, 75, 50].map((h, i) => (
        <div key={i} className="flex-1 bg-gray-100 dark:bg-[#1E2A3B] rounded-sm" style={{ height: `${h}%` }}></div>
      ))}
    </div>
  </div>
);