import React, { useState } from 'react';
import './ConsentScreen.css';
import { 
  ShieldIcon, 
  SmartphoneIcon, 
  MailIcon,
  CalendarIcon, 
  HospitalIcon 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ConsentScreen = ({ phone, email, onConsentComplete }) => {
  const [consent, setConsent] = useState(null);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (consent === null) {
      setError(t('consent.errorNoSelection'));
      return;
    }

    const consentData = {
      consentToContact: consent === 'yes',
      consentTimestamp: new Date().toISOString()
    };

    onConsentComplete(consentData);
  };

  const contactInfo = email || phone;
  const isEmail = !!email;
  const hasContact = !!contactInfo;

  return (
    <div className="consent-container">
      <div className="consent-card">
        <div className="consent-header">
          <h2>{t('consent.title')}</h2>
          <p className="consent-intro">
            {hasContact
              ? t('consent.introWithContact', {
                  contactInfo,
                  contactLabel: isEmail ? t('consent.contactEmailLabel') : t('consent.contactPhoneLabel'),
                })
              : t('consent.introWithoutContact')}
          </p>
        </div>

        <div className="consent-reasons">
          <ul>
            {hasContact && (
              <li>
                <ShieldIcon size={16} />
                {t('consent.reasonAccountLogin')}
              </li>
            )}
            <li>
              {hasContact ? (isEmail ? <MailIcon size={16} /> : <SmartphoneIcon size={16} />) : <ShieldIcon size={16} />}
              {t('consent.reasonFollowup')}
            </li>
            <li>
              <CalendarIcon size={16} />
              {t('consent.reasonReminders')}
            </li>
            <li>
              <HospitalIcon size={16} />
              {t('consent.reasonResources')}
            </li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="consent-form">
          <div className="consent-question">
            <p className="question-text">
              <strong>{t('consent.question')}</strong>
            </p>

            <div className="consent-options">
              <label className={`consent-option ${consent === 'yes' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="consent"
                  value="yes"
                  checked={consent === 'yes'}
                  onChange={(e) => {
                    setConsent(e.target.value);
                    setError('');
                  }}
                />
                <span>{t('consent.optionYes')}</span>
              </label>

              <label className={`consent-option ${consent === 'no' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="consent"
                  value="no"
                  checked={consent === 'no'}
                  onChange={(e) => {
                    setConsent(e.target.value);
                    setError('');
                  }}
                />
                <span>{t('consent.optionNo')}</span>
              </label>
            </div>

            {error && <div className="error-message">{error}</div>}
          </div>

          <div className="consent-disclaimer">
            <p>
              <strong>{t('consent.disclaimerNotePrefix')}</strong> {t('consent.disclaimerMain')}
              {hasContact
                ? ` ${t('consent.disclaimerWithContactNo')}`
                : ` ${t('consent.disclaimerWithoutContactNo')}`
              }
            </p>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={consent === null}
          >
            {t('consent.continueButton')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConsentScreen;
