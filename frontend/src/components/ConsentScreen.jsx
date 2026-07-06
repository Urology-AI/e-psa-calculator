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

          {/* ── Research Consent — separate, optional ── */}
          <div className="consent-research-section">
            <div className="consent-research-header">
              <FlaskConicalIcon size={18} className="consent-research-icon" />
              <span className="consent-research-title">
                Cloud Session &amp; Research Participation
                <span className="consent-research-optional"> (Optional)</span>
              </span>
            </div>
            <p className="consent-research-body">
              Choosing <strong>"Yes"</strong> saves your session to a secure cloud database
              (Tewari Lab, Icahn School of Medicine at Mount Sinai / Million Strong Men initiative).
              Your de-identified data may be used to improve ePSA for future patients.{' '}
              <strong>Your results are not affected by your choice.</strong>
            </p>
            <p className="consent-research-body" style={{ marginTop: '0.4rem', fontSize: '0.8125rem', color: 'var(--ink-600)' }}>
              Choosing <strong>"No"</strong> keeps everything on your device — nothing leaves your browser.
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
                <span>Yes — save my session to the cloud &amp; support research</span>
              </label>
              <label className={`consent-research-option ${researchConsent === false ? 'consent-research-option--selected consent-research-option--no' : ''}`}>
                <input
                  type="radio"
                  name="researchConsent"
                  value="no"
                  checked={researchConsent === false}
                  onChange={() => setResearchConsent(false)}
                />
                <span>No — device only, no cloud storage</span>
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
