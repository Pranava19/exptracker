// Centralized Currency & Date Formatting Utilities

export const formatCurrency = (amount, currency = 'INR', locale = 'en-IN') => {
  return '₹' + Number(amount || 0).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatCurrencyShort = (amount, locale = 'en-IN') => {
  return '₹' + Number(amount || 0).toLocaleString(locale, {
    maximumFractionDigits: 0,
  });
};

export const extractPayee = (description) => {
  if (!description) return '-';
  const match = String(description).match(/UPI\/(?:DR|CR)\/\d+\/([^/]+)\//);
  if (match) return match[1].trim();
  return '-';
};

export const formatDateGroup = (dateStr, locale = 'en-IN') => {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.getTime() === today.getTime()) {
    return `Today, ${d.toLocaleDateString(locale, { day: 'numeric', month: 'long' })}`;
  }
  if (d.getTime() === yesterday.getTime()) {
    return `Yesterday, ${d.toLocaleDateString(locale, { day: 'numeric', month: 'long' })}`;
  }
  return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
};
