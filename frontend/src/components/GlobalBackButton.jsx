import React from 'react';
import { ArrowLeftIcon } from 'lucide-react';
import './GlobalBackButton.css';

const GlobalBackButton = ({ onBack, show = true, disabled = false }) => {
  if (!show || disabled) return null;

  return (
    <button className="global-back-btn" onClick={onBack} title="Go Back">
      <ArrowLeftIcon size={16} />
      <span>Back</span>
    </button>
  );
};

export default GlobalBackButton;
