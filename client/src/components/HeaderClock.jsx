import React, { useState, useEffect } from 'react';

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const formatClock = () => {
  const parts = dateTimeFormatter.formatToParts(new Date());
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
    let intervalId;
    const updateTime = () => setTimeStr(formatClock());

    const now = new Date();
    const delayMs = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    const timeoutId = setTimeout(() => {
      updateTime();
      intervalId = setInterval(updateTime, 60000);
    }, Math.max(0, delayMs));

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <span className="text-xs font-mono font-medium text-ink-700 dark:text-ink-200 opacity-75">
      {timeStr}
    </span>
  );
};

export default HeaderClock;
