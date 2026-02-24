import React from 'react';
import './StorageChoiceScreen.css';
import { CloudIcon, HardDriveIcon, UploadIcon, CheckIcon, LockIcon } from 'lucide-react';

const StorageChoiceScreen = ({ onChoice, onImport }) => {
  return (
    <div className="storage-choice-container">
      <div className="storage-choice-header">
        <div className="storage-logo">ePSA</div>
        <h1>Choose How to Store Your Data</h1>
        <p className="storage-subtitle">
          You control your health data. Choose how you want to store and access your assessment results.
        </p>
      </div>

      <div className="storage-options">
        <div className="storage-card" onClick={() => onChoice('cloud')}>
          <div className="storage-icon">
            <CloudIcon size={48} />
          </div>
          <h3>Cloud Storage</h3>
          <p className="storage-description">
            Store your data securely by phone number. Access from any device and share with healthcare providers.
          </p>
          <ul className="storage-features">
            <li><CheckIcon size={16} className="feature-check-icon" /> Secure cloud storage</li>
            <li><CheckIcon size={16} className="feature-check-icon" /> Access from any device</li>
            <li><CheckIcon size={16} className="feature-check-icon" /> Provider collaboration</li>
            <li><CheckIcon size={16} className="feature-check-icon" /> Automatic backups</li>
            <li><CheckIcon size={16} className="feature-check-icon" /> Phone authentication</li>
          </ul>
          <button className="storage-btn primary">
            Choose Cloud Storage
          </button>
        </div>

        <div className="storage-card" onClick={() => onChoice('local')}>
          <div className="storage-icon">
            <HardDriveIcon size={48} />
          </div>
          <h3>Self-Storage</h3>
          <p className="storage-description">
            Keep your data on your device. Export as PDF and import when needed. Complete privacy control.
          </p>
          <ul className="storage-features">
            <li><CheckIcon size={16} className="feature-check-icon" /> Complete privacy</li>
            <li><CheckIcon size={16} className="feature-check-icon" /> No phone number required</li>
            <li><CheckIcon size={16} className="feature-check-icon" /> Export as PDF</li>
            <li><CheckIcon size={16} className="feature-check-icon" /> Import anytime</li>
            <li><CheckIcon size={16} className="feature-check-icon" /> Works offline</li>
          </ul>
          <button className="storage-btn secondary">
            Choose Self-Storage
          </button>
        </div>
      </div>

      <div className="storage-import-section">
        <p className="import-text">Already have an assessment?</p>
        <button className="import-btn" onClick={onImport}>
          <UploadIcon size={18} />
          <span>Import Previous Data</span>
        </button>
      </div>

      <div className="storage-footer">
        <p className="footer-text">
          Both options provide full access to the ePSA calculator and all assessment features.
        </p>
        <p className="privacy-note">
          <LockIcon size={14} className="privacy-lock-icon" />
          Your health data is private. We never share or sell your information.
        </p>
      </div>
    </div>
  );
};

export default StorageChoiceScreen;
