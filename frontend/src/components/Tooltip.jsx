import React from 'react';
import './Tooltip.css';

const Tooltip = ({ text, children }) => {
  return (
    <span className="tooltip" data-tooltip={text}>
      {children || 'i'}
    </span>
  );
};

export default Tooltip;
