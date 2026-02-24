import React from 'react';
import './StepForm.css';

const StepForm = ({ step, children, title, description, onNext, onPrevious, canProceed = true, isLastStep = false }) => {
  return (
    <div className="step-form-container">
      <div className="step-header">
        <h2 className="step-title">{title}</h2>
        {description && <p className="step-description">{description}</p>}
      </div>
      
      <div className="step-content">
        {children}
      </div>
      
      <div className="step-actions">
        {step > 1 && (
          <button
            type="button"
            onClick={onPrevious}
            className="btn btn-secondary"
          >
            ← Previous
          </button>
        )}
        <div className="step-actions-spacer"></div>
        <button
          type="button"
          onClick={onNext}
          className={`btn btn-primary ${!canProceed ? 'disabled' : ''}`}
          disabled={!canProceed}
        >
          {isLastStep ? 'Calculate Risk →' : 'Next →'}
        </button>
      </div>
    </div>
  );
};

export default StepForm;
