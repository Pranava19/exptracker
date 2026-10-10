import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import QuickAddModal from './QuickAddModal';
import './QuickAddFAB.css';

const QuickAddFAB = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fab-button"
        aria-label="Quick add transaction"
        title="Quick Add Transaction (+)"
      >
        <Plus
          size={26}
          strokeWidth={2.5}
          className="fab-icon"
        />
        {/* Ambient subtle ping ring */}
        <span className="fab-ping-ring" />
      </button>

      <QuickAddModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};

export default QuickAddFAB;
