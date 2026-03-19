import React from 'react';
import './StorageChoiceScreen.css';
import { CloudIcon, HardDriveIcon, UploadIcon, CheckIcon, LockIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const StorageChoiceScreen = ({ onChoice, onImport, cloudAvailable = true }) => {
  const { t } = useTranslation();
  return (
    <div className="storage-choice-container">
      <div className="storage-options">
        {cloudAvailable && (
          <div className="storage-card" onClick={() => onChoice('cloud')}>
          <div className="storage-icon">
            <CloudIcon size={48} />
          </div>
          <h3>{t('storage.cloudTitle')}</h3>
          <p className="storage-description">
            {t('storage.cloudDescription')}
          </p>
          <ul className="storage-features">
            <li><CheckIcon size={16} className="feature-check-icon" /> {t('storage.cloudFeatureSecure')}</li>
            <li><CheckIcon size={16} className="feature-check-icon" /> {t('storage.cloudFeatureAnyDevice')}</li>
            <li><CheckIcon size={16} className="feature-check-icon" /> {t('storage.cloudFeatureCollaboration')}</li>
            <li><CheckIcon size={16} className="feature-check-icon" /> {t('storage.cloudFeatureBackups')}</li>
            <li><CheckIcon size={16} className="feature-check-icon" /> {t('storage.cloudFeatureAuth')}</li>
          </ul>
          <button className="storage-btn primary">
            {t('storage.cloudContinue')}
          </button>
        </div>
        )}
        <div className="storage-card" onClick={() => onChoice('local')}>
          <div className="storage-icon">
            <HardDriveIcon size={48} />
          </div>
          <h3>{t('storage.localTitle')}</h3>
          <p className="storage-description">
            {t('storage.localDescription')}
          </p>
          <ul className="storage-features">
            <li><CheckIcon size={16} className="feature-check-icon" /> {t('storage.localFeatureNoSignIn')}</li>
            <li><CheckIcon size={16} className="feature-check-icon" /> {t('storage.localFeatureSame')}</li>
            <li><CheckIcon size={16} className="feature-check-icon" /> {t('storage.localFeatureExport')}</li>
            <li><CheckIcon size={16} className="feature-check-icon" /> {t('storage.localFeaturePrivacy')}</li>
          </ul>
          <button className={`storage-btn ${cloudAvailable ? 'secondary' : 'primary'}`}>
            {t('storage.localContinue')}
          </button>
        </div>
      </div>

      <div className="storage-import-section">
        <p className="import-text">{t('storage.importPrompt')}</p>
        <button className="import-btn" onClick={onImport}>
          <UploadIcon size={18} />
          <span>{t('storage.importButton')}</span>
        </button>
      </div>

      <div className="storage-footer">
        <p className="footer-text">
          {t('storage.footerText')}
        </p>
        <p className="privacy-note">
          <LockIcon size={14} className="privacy-lock-icon" />
          {t('storage.privacyNote')}
        </p>
      </div>
    </div>
  );
};

export default StorageChoiceScreen;
