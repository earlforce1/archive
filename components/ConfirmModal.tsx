
import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-up"
      style={{ animationDuration: '150ms' }}
      onClick={onClose}
    >
      <div 
        className="bg-gray-900/80 border border-gray-700 rounded-lg shadow-2xl p-6 w-full max-w-sm relative"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
        <p className="text-gray-300 mb-6 text-sm">{message}</p>
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              // No need to call onClose here, onConfirm will trigger a state change that does
            }}
            className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-500 transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
