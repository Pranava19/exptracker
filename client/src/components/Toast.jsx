import React, { useEffect } from 'react';

const ICONS = { success: 'ti-circle-check', error: 'ti-circle-x', info: 'ti-info-circle' };
const COLORS = {
  success: 'bg-white border-gray-200 text-gray-800',
  error: 'bg-white border-gray-200 text-gray-800',
  info: 'bg-white border-gray-200 text-gray-800',
};
const ICON_COLORS = { success: 'text-green-600', error: 'text-red-500', info: 'text-blue-600' };

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded border shadow-sm text-sm ${COLORS[type]}`} style={{ minWidth: 260 }}>
      <i className={`ti ${ICONS[type]} ${ICON_COLORS[type]}`} style={{ fontSize: 16 }} aria-hidden="true" />
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Dismiss">
        <i className="ti ti-x" style={{ fontSize: 14 }} aria-hidden="true" />
      </button>
    </div>
  );
};

export default Toast;