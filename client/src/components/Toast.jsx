import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const renderIcon = () => {
    if (type === 'error') return <XCircle size={16} className="text-negative" />;
    if (type === 'info') return <Info size={16} className="text-accent" />;
    return <CheckCircle2 size={16} className="text-accent" />;
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 glass-toast text-xs font-medium text-ink-900 dark:text-ink-50 min-w-[280px] animate-slide-in">
      {renderIcon()}
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="text-ink-700 dark:text-ink-200 opacity-60 hover:opacity-100 transition-opacity" aria-label="Dismiss">
        <X size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
};

export default Toast;