import React, { useState } from 'react';
import './WelcomeScreen.css';
import PrintableForm from './PrintableForm';
import {
  FileTextIcon,
  ClipboardListIcon,
  ClockIcon,
  LockIcon,
  ArrowRightIcon,
  UploadIcon,
  ShieldCheckIcon,
  StethoscopeIcon,
  CheckCircle2Icon
} from 'lucide-react';

const WelcomeScreen = ({ onBegin, onBeginLocal, onBeginCloud, onImport, formData, cloudAvailable }) => {
  const [showForm, setShowForm] = useState(false);

  const handleBegin = () => {
    if (onBegin) return onBegin();
    if (cloudAvailable && onBeginCloud) return onBeginCloud();
    if (onBeginLocal) return onBeginLocal();
  };

  const showStorageChoice = cloudAvailable && onBeginLocal && onBeginCloud;

  if (showForm) {
    return <PrintableForm onBack={() => setShowForm(false)} formData={formData} />;
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-container">
        <section className="welcome-hero">
          <div className="hero-badge">Educational Clinical Support Tool</div>
          <h3 className="hero-title">Know your baseline risk before your next urology visit</h3>
          <p className="hero-description">
            Complete a brief evidence-informed questionnaire to generate a personalized ePSA estimate
            for discussion with your clinician.
          </p>

          <div className="welcome-features">
            <div className="feature-item">
              <ClipboardListIcon size={18} className="feature-icon" />
              <span className="feature-text">27 guided questions</span>
            </div>
            <div className="feature-item">
              <ClockIcon size={18} className="feature-icon" />
              <span className="feature-text">~5 minutes</span>
            </div>
            <div className="feature-item">
              <LockIcon size={18} className="feature-icon" />
              <span className="feature-text">Private by design</span>
            </div>
          </div>
        </section>

        <section className="welcome-body">
          {showStorageChoice ? (
            <div className="welcome-storage-choice">
              <p className="welcome-storage-label">Choose how to save your progress</p>
              <div className="welcome-storage-buttons">
                <button type="button" className="btn-begin-local" onClick={onBeginLocal}>
                  <span>Use this device only</span>
                  <span className="btn-begin-sub">No sign-in · data stays on this browser</span>
                </button>
                <button type="button" className="btn-begin-cloud" onClick={onBeginCloud}>
                  <span>Save anonymously to cloud</span>
                  <span className="btn-begin-sub">Get a session key · no phone or email required</span>
                </button>
              </div>
            </div>
          ) : (
            <button className="btn-begin-assessment" onClick={handleBegin}>
              <span>Start Assessment</span>
              <ArrowRightIcon size={18} />
            </button>
          )}

          {onImport && (
            <button type="button" className="btn-import-json" onClick={onImport}>
              <UploadIcon size={16} />
              <span>Import Previous Session</span>
            </button>
          )}

          <button className="btn-view-form-bottom" onClick={() => setShowForm(true)} title="View Offline Form">
            <FileTextIcon size={16} />
            <span>View Printable Form</span>
          </button>

          <div className="trust-grid">
            <div className="trust-item">
              <ShieldCheckIcon size={16} />
              <span>No account required</span>
            </div>
            <div className="trust-item">
              <StethoscopeIcon size={16} />
              <span>Built for clinician conversations</span>
            </div>
            <div className="trust-item">
              <CheckCircle2Icon size={16} />
              <span>Clear risk summary output</span>
            </div>
          </div>
        </section>

        <p className="welcome-footer">
          This tool is for education only and is not a diagnosis. It has not been clinically validated for
          standalone decision-making and should be used alongside guidance from a licensed healthcare
          professional.
        </p>
      </div>
    </div>
  );
};

export default WelcomeScreen;
