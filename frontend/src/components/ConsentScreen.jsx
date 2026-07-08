import React, { useState } from 'react';
import './ConsentScreen.css';
import {
  HardDriveIcon,
  CloudIcon,
  CheckCircle2Icon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ConsentScreen = ({ phone, email, onConsentComplete }) => {
  const { t } = useTranslation();
  const [researchConsent, setResearchConsent] = useState(null); // null = not answered yet
  const [emrLinkageConsent, setEmrLinkageConsent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    const consentData = {
      consentToContact: true,
      consentBasis: 'implied_by_use',
      consentTimestamp: new Date().toISOString(),
      researchConsent: researchConsent === true,
      researchTimestamp: new Date().toISOString(),
      followUpSurveyDisclosureShown: true,
      followUpSurveyDisclosureTimestamp: new Date().toISOString(),
      emrLinkageConsent: emrLinkageConsent,
      emrLinkageConsentTimestamp: new Date().toISOString(),
    };

    onConsentComplete(consentData);
  };

  return (
    <div className="consent-container">
      <div className="consent-card">
        <div className="consent-header">
          <h2>{t('consent.title')}</h2>
          <p className="consent-intro">{t('consent.intro')}</p>
        </div>

        <form onSubmit={handleSubmit} className="consent-form">
          <div className="consent-why">
            <p>
              Your assessment can be kept <strong>only on this device</strong>, or{' '}
              <strong>saved to the cloud</strong> under an anonymous session key (no name, email,
              or phone stored). {t('consent.notMedicalDevice')}
            </p>
          </div>

          <div className="consent-choice">
            <p className="question-text">Where should your assessment be saved?</p>

            <label className={`consent-choice-option ${researchConsent === false ? 'consent-choice-option--selected' : ''}`}>
              <input
                type="radio"
                name="researchConsent"
                value="local"
                checked={researchConsent === false}
                onChange={() => setResearchConsent(false)}
              />
              <HardDriveIcon size={18} className="consent-choice-icon" />
              <span>
                <strong>Local only</strong>
                <small>Nothing leaves your device.</small>
              </span>
            </label>

            <label className={`consent-choice-option ${researchConsent === true ? 'consent-choice-option--selected' : ''}`}>
              <input
                type="radio"
                name="researchConsent"
                value="cloud"
                checked={researchConsent === true}
                onChange={() => setResearchConsent(true)}
              />
              <CloudIcon size={18} className="consent-choice-icon" />
              <span>
                <strong>Cloud &amp; research study</strong>
                <small>
                  Saves your session (ID, status, results) to a secure cloud database and enrolls
                  you in the Tewari Lab / Million Strong Men research study. De-identified data may
                  be used to improve ePSA. You can disable this anytime and delete your saved
                  session from the results screen.
                </small>
              </span>
            </label>

            {researchConsent === null && (
              <p className="consent-choice-skip">{t('consent.errorNoSelection')}</p>
            )}
          </div>

          {researchConsent === true && (
            <>
              <div className="consent-followup-notice">
                As part of the study protocol (IRB STUDY-14-00050), you may be contacted
                by text message or email at approximately 3, 6, 12, and 36 months after
                completing this questionnaire. We will ask only whether you received a PSA
                test and any results. This follow-up is completely optional — you may opt
                out at any time by replying STOP to any text message.
              </div>

              <div className="consent-emr-section">
                <label className="consent-emr-label">
                  <input
                    type="checkbox"
                    checked={emrLinkageConsent}
                    onChange={(e) => setEmrLinkageConsent(e.target.checked)}
                    className="consent-emr-checkbox"
                  />
                  <span>
                    <strong>[Optional] Medical record linkage</strong> — I agree that the
                    research team may verify clinical outcomes (PSA results, biopsy findings,
                    treatments received) from my medical record to improve the ePSA model.
                    This is completely optional and does not affect my questionnaire or results.
                  </span>
                </label>
              </div>
            </>
          )}

          <p className="consent-footnote">
            {t('consent.rightToWithdrawBody')}{' '}
            <a href="mailto:aditya.dixit@mssm.edu">{t('consent.researcherContactTitle')}</a>
          </p>

          <button type="submit" className="btn btn-primary btn-block" disabled={researchConsent === null}>
            <CheckCircle2Icon size={16} />
            {t('consent.continueButton')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConsentScreen;
