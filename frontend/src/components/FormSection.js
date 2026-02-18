import React from 'react';
import Tooltip from './Tooltip';
import './FormSection.css';

const FormSection = ({ title, children, tooltipText }) => {
  return (
    <div className="form-section">
      <h3 className="section-title">
        {title}
        {tooltipText && <Tooltip text={tooltipText} />}
      </h3>
      {children}
    </div>
  );
};

export default FormSection;
