import React, { useState } from 'react';
import './WelcomeScreen.css';
import PrintableForm from './PrintableForm';
import { 
  FileTextIcon, 
  ClipboardListIcon, 
  ClockIcon, 
  LockIcon, 
  ArrowRightIcon 
} from 'lucide-react';

const WelcomeScreen = ({ onBegin, formData }) => {
  const [showForm, setShowForm] = useState(false);

  const handleViewForm = () => {
    setShowForm(true);
  };

  const handleBack = () => {
    setShowForm(false);
  };

  if (showForm) {
    return <PrintableForm onBack={handleBack} formData={formData} />;
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-container">
        <div className="welcome-header">
          <div className="welcome-logo-container">
            <div className="welcome-logo">ePSA</div>
          </div>
          <div className="welcome-title">Prostate-Specific Awareness</div>
          <h1 className="welcome-heading">Risk Assessment Tool</h1>
          <p className="welcome-subtitle">Evidence-based cancer risk evaluation</p>
          <p className="welcome-tagline">For educational and research purposes</p>
        </div>
        
        <div className="welcome-body">
          <p className="welcome-description">
            This 5-minute questionnaire calculates your personalized risk assessment using validated clinical instruments.
          </p>

          <div className="welcome-features">
            <div className="feature-item">
              <ClipboardListIcon size={20} className="feature-icon" />
              <span className="feature-text">23 questions</span>
            </div>
            <div className="feature-item">
              <ClockIcon size={20} className="feature-icon" />
              <span className="feature-text">~5 min</span>
            </div>
            <div className="feature-item">
              <LockIcon size={20} className="feature-icon" />
              <span className="feature-text">Private</span>
            </div>
          </div>

          <button className="btn-begin-assessment" onClick={onBegin}>
            <span>Begin Assessment</span>
            <ArrowRightIcon size={18} />
          </button>

          <button className="btn-view-form-bottom" onClick={handleViewForm} title="View Offline Form">
            <FileTextIcon size={16} />
            <span>View Printable Form</span>
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
