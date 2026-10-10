import React, { useState, useEffect } from 'react';
import './HeaderClock.css';

const formatClock = () => {
  const formatter = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const day = parts.find(p => p.type === 'day')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const year = parts.find(p => p.type === 'year')?.value || '';
  const hour = parts.find(p => p.type === 'hour')?.value || '';
  const minute = parts.find(p => p.type === 'minute')?.value || '';
  return `${day} ${month} ${year}, ${hour}:${minute}`;
};

const HeaderClock = () => {
  const [timeStr, setTimeStr] = useState(formatClock);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(formatClock());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="header-clock-badge glass-card-subtle shadow-xs">
      {timeStr}
    </span>
  );
};

export default HeaderClock;
