import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import './Toast.css';

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const renderIcon = () => {
    if (type === 'error') return <XCircle size={16} className="toast-icon-error" />;
    if (type === 'info') return <Info size={16} className="toast-icon-info" />;
    return <CheckCircle2 size={16} className="toast-icon-success" />;
  };

  return (
    <div className="toast-container glass-toast animate-slide-in">
      {renderIcon()}
      <span className="toast-message">{message}</span>
      <button onClick={onClose} className="toast-close-btn" aria-label="Dismiss">
        <X size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
};

export default Toast;