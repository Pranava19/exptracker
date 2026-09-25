import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import QuickAddModal from './QuickAddModal';

const QuickAddFAB = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-40 flex items-center justify-center w-13 h-13 md:w-14 md:h-14 rounded-full bg-accent hover:bg-accent-hover text-white shadow-xl shadow-accent/30 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-4 focus:ring-accent/30"
        aria-label="Quick add transaction"
        title="Quick Add Transaction (+)"
      >
        <Plus
          size={26}
          strokeWidth={2.5}
          className="group-hover:rotate-90 transition-transform duration-300"
        />
        {/* Ambient subtle ping ring */}
        <span className="absolute -inset-1 rounded-full bg-accent/20 animate-ping pointer-events-none -z-10 opacity-75 group-hover:opacity-100" />
      </button>

      <QuickAddModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};

export default QuickAddFAB;
