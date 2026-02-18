import React from 'react';
import Tooltip from './Tooltip';
import './FormField.css';

const FormField = ({ 
  label, 
  tooltipText, 
  children, 
  id,
  className = '' 
}) => {
  return (
    <div className={`form-field ${className}`}>
      <label htmlFor={id} className="form-label">
        {label}
        {tooltipText && <Tooltip text={tooltipText} />}
      </label>
      {children}
    </div>
  );
};

export default FormField;
