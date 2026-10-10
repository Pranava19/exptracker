import React from 'react';
import './Skeleton.css';

export const SkeletonCard = () => (
  <div className="glass-card skeleton-card skeleton-pulse">
    <div className="skeleton-bar-title"></div>
    <div className="skeleton-bar-value"></div>
  </div>
);

export const SkeletonRow = () => (
  <tr className="skeleton-table-row skeleton-pulse">
    {[...Array(8)].map((_, i) => (
      <td key={i} className="skeleton-table-cell">
        <div className="skeleton-cell-bar" style={{ width: `${50 + (i * 13) % 40}%` }}></div>
      </td>
    ))}
  </tr>
);

export const SkeletonChart = () => (
  <div className="skeleton-pulse">
    <div className="skeleton-chart-wrapper">
      {[55, 70, 45, 85, 60, 75, 50].map((h, i) => (
        <div key={i} className="skeleton-chart-col" style={{ height: `${h}%` }}></div>
      ))}
    </div>
  </div>
);