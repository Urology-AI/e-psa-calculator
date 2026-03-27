import React from 'react';
import './ConsentScreen.css';
import { 
  ShieldIcon, 
  HardDriveIcon,
  CloudIcon,
  LockIcon
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ConsentScreen = ({ phone, email, onConsentComplete }) => {
  const { t } = useTranslation();

  const handleSubmit = (e) => {
    e.preventDefault();

    const consentData = {
      consentToContact: true,
      consentBasis: 'implied_by_use',
      consentTimestamp: new Date().toISOString()
    };

    onConsentComplete(consentData);
  };

  return (
    <div className="consent-container">
      <div className="consent-card">
        <div className="consent-header">
          <h2>{t('consent.title')}</h2>
          <p className="consent-intro">
            {t('consent.intro')}
          </p>
        </div>

        <div className="consent-reasons">
          <ul>
            <li>
              <HardDriveIcon size={16} />
              {t('consent.reasonStorage')}
            </li>
            <li>
              <CloudIcon size={16} />
              {t('consent.reasonCloudKey')}
            </li>
            <li>
              <LockIcon size={16} />
              {t('consent.reasonPrivacy')}
            </li>
            <li>
              <ShieldIcon size={16} />
              {t('consent.reasonDataUse')}
            </li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="consent-form">
          <div className="consent-question">
            <p className="question-text">
              <strong>{t('consent.acknowledgement')}</strong>
            </p>
          </div>

          <div className="consent-disclaimer">
            <p>
              <strong>{t('consent.disclaimerNotePrefix')}</strong> {t('consent.disclaimerMain')}
            </p>
          </div>

          <div className="consent-data-use">
            <p>
              <strong>{t('consent.dataUseTitle')}</strong> {t('consent.dataUseBody')}
            </p>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block"
          >
            {t('consent.continueButton')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConsentScreen;
