import React, { useState } from 'react';
import './WelcomeScreen.css';
import PrintableForm from './PrintableForm';

const WelcomeScreen = ({ onBegin }) => {
  const [showForm, setShowForm] = useState(false);

  const handleViewForm = () => {
    setShowForm(true);
  };

  const handleBack = () => {
    setShowForm(false);
  };

  if (showForm) {
    return <PrintableForm onBack={handleBack} />;
  }

  return (
    <div className="welcome-screen">
      <button className="btn-view-form" onClick={handleViewForm} title="View Offline Form">
        📄 View Form
      </button>
      <div className="welcome-container">
        <div className="welcome-header">
          <div className="welcome-logo-container">
            <img 
              src={(process.env.PUBLIC_URL || '') + '/logo.png'}
              alt="ePSA Logo" 
              className="welcome-logo"
              onError={(e) => {
                if (e.target.src.includes('logo.png')) {
                  e.target.src = (process.env.PUBLIC_URL || '') + '/logo.jpg';
                } else {
                  e.target.style.display = 'none';
                }
              }}
            />
          </div>
          <div className="welcome-title">Million Strong Men — ePSA</div>
          <h1 className="welcome-heading">ePSA</h1>
          <h2 className="welcome-subtitle">Prostate-Specific Awareness</h2>
          <p className="welcome-tagline">A Non-Validated Educational Risk Tool</p>
        </div>

        <div className="welcome-body">
          <p className="welcome-description">
            This 5-minute questionnaire calculates your personalized risk assessment using validated clinical instruments.
          </p>

          <div className="welcome-features">
            <div className="feature-item">
              <span className="feature-icon">📋</span>
              <span className="feature-text">17 core questions</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⏱</span>
              <span className="feature-text">~5 min</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔒</span>
              <span className="feature-text">Private</span>
            </div>
          </div>

          <button className="btn-begin-assessment" onClick={onBegin}>
            Begin Assessment →
          </button>
        </div>

        <p className="welcome-footer">
          For educational and research purposes. Not for clinical decision-making without physician review.
        </p>
      </div>
    </div>
  );
};

export default WelcomeScreen;
