import React, { useState } from 'react';
import './WelcomeScreen.css';
import PrintableForm from './PrintableForm';
import { 
  FileTextIcon, 
  ClipboardListIcon, 
  ClockIcon, 
  LockIcon, 
  ArrowRightIcon,
  UploadIcon
} from 'lucide-react';

const WelcomeScreen = ({ onBegin, onBeginLocal, onBeginCloud, onImport, formData, urlEmail, cloudAvailable }) => {
  const [showForm, setShowForm] = useState(false);

  const handleViewForm = () => {
    setShowForm(true);
  };

  const handleBack = () => {
    setShowForm(false);
  };

  const handleBegin = () => {
    if (onBegin) return onBegin();
    if (cloudAvailable && onBeginCloud) return onBeginCloud();
    if (onBeginLocal) return onBeginLocal();
  };

  const showStorageChoice = cloudAvailable && onBeginLocal && onBeginCloud;

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

          {showStorageChoice ? (
            <div className="welcome-storage-choice">
              <p className="welcome-storage-label">Where should we store your answers?</p>
              <div className="welcome-storage-buttons">
                <button type="button" className="btn-begin-local" onClick={onBeginLocal}>
                  <span>This device only</span>
                  <span className="btn-begin-sub">No sign-in · data stays here</span>
                </button>
                <button type="button" className="btn-begin-cloud" onClick={onBeginCloud}>
                  <span>Save to cloud</span>
                  <span className="btn-begin-sub">Sign in with phone or email</span>
                </button>
              </div>
            </div>
          ) : (
            <button className="btn-begin-assessment" onClick={handleBegin}>
              <span>Begin Assessment</span>
              <ArrowRightIcon size={18} />
            </button>
          )}

          {onImport && (
            <button type="button" className="btn-import-json" onClick={onImport}>
              <UploadIcon size={16} />
              <span>Import Previous Data</span>
            </button>
          )}

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
