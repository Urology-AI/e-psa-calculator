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

const WelcomeScreen = ({ onBegin, formData, urlEmail }) => {
  const [showForm, setShowForm] = useState(false);

  const handleViewForm = () => {
    setShowForm(true);
  };

  const handleBack = () => {
    setShowForm(false);
  };

  const handleBegin = () => {
    // If URL email is present, skip storage choice and go directly to login
    if (urlEmail) {
      onBegin(); // This will trigger login step directly
    } else {
      onBegin(); // Normal flow
    }
  };

  if (showForm) {
    return <PrintableForm onBack={handleBack} formData={formData} />;
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-container">
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

          <button className="btn-begin-assessment" onClick={handleBegin}>
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
