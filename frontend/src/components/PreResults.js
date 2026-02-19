import React from 'react';
import './PreResults.css';

const PreResults = ({ result }) => {
  if (!result) return null;

  const { category, priority, color, points, finasteride, message } = result;

  // If prior cancer
  if (priority === null && message) {
    return (
      <div className="pre-results-container prior-cancer">
        <div className="pre-results-header">
          <h3>Important Notice</h3>
        </div>
        <div className="pre-results-content">
          <p className="prior-cancer-message">{message}</p>
        </div>
      </div>
    );
  }

  const colorClass = `pre-${color}`;
  const emoji = 
    priority === 'routine' ? '🟢' :
    priority === 'priority' ? '🟡' :
    '🔴';

  return (
    <div className={`pre-results-container ${colorClass} show`}>
      <div className="pre-results-header">
        <h3>Your Screening Priority</h3>
      </div>
      <div className="pre-results-content">
        <div className="priority-badge">
          <span className="priority-emoji">{emoji}</span>
          <span className="priority-category">{category}</span>
        </div>
        <div className="priority-points">
          <span className="points-label">Total Points:</span>
          <span className="points-value">{points}</span>
        </div>
        {finasteride && (
          <div className="finasteride-notice">
            <strong>Note:</strong> You are taking finasteride/dutasteride. Please inform your healthcare provider as this may affect PSA interpretation.
          </div>
        )}
        <div className="pre-disclaimer">
          <p><strong>Disclaimer:</strong> This tool is educational and not a medical diagnosis. Please consult with a healthcare provider for personalized medical advice.</p>
        </div>
      </div>
    </div>
  );
};

export default PreResults;
