import React from 'react';
import './Results.css';

const Results = ({ result }) => {
  if (!result) return null;

  const { riskPct, riskCat, riskClass, totalPoints, nextSteps } = result;

  const renderNextStep = (step, index) => {
    if (step.includes('Learn more about prostate cancer health')) {
      return (
        <li key={index}>
          {step.replace(' →', '')}
          <a 
            href="https://www.youtube.com/@ashtewarimd7526" 
            target="_blank" 
            rel="noopener noreferrer"
            className="external-link"
            title="Watch Video"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="#2196F3" opacity="0.2" />
              <path fill="#2196F3" d="M10 8v8l6-4z" />
            </svg>
          </a>
        </li>
      );
    }
    if (step.includes('Mount Sinai Mobile Unit')) {
      return (
        <li key={index}>
          {step.replace(' →', '')}
          <a 
            href="https://events.mountsinaihealth.org/search/events?event_types%5B%5D=37714143563487" 
            target="_blank" 
            rel="noopener noreferrer"
            className="external-link"
            title="View Mobile Unit Location"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="#2196F3" viewBox="0 0 24 24" width="20" height="20">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
          </a>
        </li>
      );
    }
    return <li key={index}>{step}</li>;
  };

  return (
    <div className={`results-container ${riskClass} show`}>
      <div className="results-header">
        <h3>Your Risk Assessment Results</h3>
      </div>
      <div className="results-content">
        <div className="risk-metric">
          <span className="metric-label">Risk of Prostate Cancer:</span>
          <span className="metric-value">{riskPct}</span>
        </div>
        <div className="risk-metric">
          <span className="metric-label">Total Points:</span>
          <span className="metric-value">{totalPoints}</span>
        </div>
        <div className="risk-metric">
          <span className="metric-label">Risk Category:</span>
          <span className="metric-value risk-category">{riskCat}</span>
        </div>
      </div>
      <div className="next-steps">
        <h4>Recommended Next Steps:</h4>
        <ul>
          {nextSteps.map((step, index) => renderNextStep(step, index))}
        </ul>
      </div>
    </div>
  );
};

export default Results;
