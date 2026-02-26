import React from 'react';
import './StorageChoiceScreen.css';
import { CloudIcon, HardDriveIcon, UploadIcon, CheckIcon, LockIcon } from 'lucide-react';

const StorageChoiceScreen = ({ onChoice, onImport }) => {
  return (
    <div className="storage-choice-container">
      <div className="storage-options">
        <div className="storage-card" onClick={() => onChoice('cloud')}>
          <div className="storage-icon">
            <CloudIcon size={48} />
          </div>
          <h3>Cloud Storage</h3>
          <p className="storage-description">
            Store your data securely by email or phone number. Access from any device and share with healthcare providers.
          </p>
          <ul className="storage-features">
            <li><CheckIcon size={16} className="feature-check-icon" /> Secure cloud storage</li>
            <li><CheckIcon size={16} className="feature-check-icon" /> Access from any device</li>
            <li><CheckIcon size={16} className="feature-check-icon" /> Provider collaboration</li>
            <li><CheckIcon size={16} className="feature-check-icon" /> Automatic backups</li>
            <li><CheckIcon size={16} className="feature-check-icon" /> Email or phone authentication</li>
          </ul>
          <button className="storage-btn primary">
            Continue with Cloud Storage
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
          Your health data is stored securely and privately. We never share or sell your information.
        </p>
        <p className="privacy-note">
          <LockIcon size={14} className="privacy-lock-icon" />
          HIPAA-compliant secure storage
        </p>
      </div>
    </div>
  );
};

export default StorageChoiceScreen;
