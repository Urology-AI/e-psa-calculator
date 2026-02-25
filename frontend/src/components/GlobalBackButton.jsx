import React from 'react';
import { ArrowLeftIcon } from 'lucide-react';
import './GlobalBackButton.css';

const GlobalBackButton = ({ show, onBack, disabled = false }) => {
  if (!show) return null;

  return (
    <button
      type="button"
      className="global-back-btn"
      onClick={onBack}
      disabled={disabled}
    >
      <ArrowLeftIcon size={16} />
      <span>Back</span>
    </button>
  );
};

export default GlobalBackButton;
