import React from 'react';
import './PreResults.css';

const PreResults = ({ result }) => {
  // Debug logging (reduced frequency)
  if (result?.category === 'prior-cancer') {
    console.log('PreResults render - PRIOR CANCER result:', result);
  }
  
  if (!result) {
    return (
      <div className="pre-results-container">
        <div className="pre-results-content">
          <p>No results available. Please complete the form.</p>
        </div>
      </div>
    );
  }

  const { category, priority, color, points, finasteride, message } = result;

  // If prior cancer - show Important Notice
  // Check for prior cancer case: either category is 'prior-cancer' OR (priority is null AND message exists)
  const isPriorCancer = category === 'prior-cancer' || (priority === null && message);
  
  if (isPriorCancer) {
    console.log('Rendering PRIOR CANCER notice - category:', category, 'message:', message);
    return (
      <div className="pre-results-container prior-cancer show" style={{ display: 'block', visibility: 'visible', opacity: 1 }}>
        <div className="pre-results-header">
          <h3>Important Notice</h3>
        </div>
        <div className="pre-results-content">
          <p className="prior-cancer-message" style={{ fontSize: '18px', fontWeight: 'bold', color: '#c62828', marginBottom: '20px' }}>
            {message || 'You should follow up with your treating physician.'}
          </p>
          <div className="pre-disclaimer">
            <p><strong>Note:</strong> Since you have a prior cancer diagnosis, please follow up with your treating physician. The risk assessment tool is not applicable in this case.</p>
          </div>
        </div>
      </div>
    );
  }

  // If result is invalid or missing priority (but not prior cancer case)
  if (!priority || priority === null) {
    return (
      <div className="pre-results-container">
        <div className="pre-results-content">
          <p>Unable to calculate results. Please check your inputs and try again.</p>
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
