import React, { useState } from 'react';
import './ConsentScreen.css';
import {
  ShieldIcon,
  HardDriveIcon,
  CloudIcon,
  LockIcon,
  FlaskConicalIcon,
  CheckCircle2Icon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ConsentScreen = ({ phone, email, onConsentComplete }) => {
  const { t } = useTranslation();
  const [researchConsent, setResearchConsent] = useState(null); // null = not answered yet

  const handleSubmit = (e) => {
    e.preventDefault();

    const consentData = {
      consentToContact: true,
      consentBasis: 'implied_by_use',
      consentTimestamp: new Date().toISOString(),
      researchConsent: researchConsent === true,
      researchTimestamp: new Date().toISOString(),
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
            <p>
              {t('consent.firstVisitDisclaimer')}
            </p>
          </div>

          <div className="consent-data-use">
            <p>
              <strong>{t('consent.dataUseTitle')}</strong> {t('consent.dataUseBody')}
            </p>
          </div>

          <div className="consent-data-use">
            <p>
              <strong>{t('consent.rightToWithdrawTitle')}:</strong> {t('consent.rightToWithdrawBody')}
            </p>
            <p>{t('consent.notMedicalDevice')}</p>
            <p>
              <strong>{t('consent.researcherContactTitle')}:</strong>{' '}
              {t('consent.researcherContactBody')}
            </p>
          </div>

          {/* ── Research Consent — separate, optional ── */}
          <div className="consent-research-section">
            <div className="consent-research-header">
              <FlaskConicalIcon size={18} className="consent-research-icon" />
              <span className="consent-research-title">Research Participation <span className="consent-research-optional">(Optional)</span></span>
            </div>
            <p className="consent-research-body">
              Would you like your <strong>de-identified data</strong> to be included in the
              ePSA prostate cancer research study at Mount Sinai? This helps improve the
              tool for future patients. Your results are <strong>not affected</strong> by
              your choice.
            </p>
            <div className="consent-research-options">
              <label className={`consent-research-option ${researchConsent === true ? 'consent-research-option--selected' : ''}`}>
                <input
                  type="radio"
                  name="researchConsent"
                  value="yes"
                  checked={researchConsent === true}
                  onChange={() => setResearchConsent(true)}
                />
                <CheckCircle2Icon size={16} className="consent-research-option-icon" />
                <span>Yes, include my data for research</span>
              </label>
              <label className={`consent-research-option ${researchConsent === false ? 'consent-research-option--selected consent-research-option--no' : ''}`}>
                <input
                  type="radio"
                  name="researchConsent"
                  value="no"
                  checked={researchConsent === false}
                  onChange={() => setResearchConsent(false)}
                />
                <span>No, keep my data private</span>
              </label>
            </div>
            {researchConsent === null && (
              <p className="consent-research-skip">You can skip this — your results won't be affected either way.</p>
            )}
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
