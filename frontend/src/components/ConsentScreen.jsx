import React from 'react';
import './ConsentScreen.css';
import {
  CheckCircle2Icon,
  ShieldCheckIcon,
  StethoscopeIcon,
  HardDriveIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Up-front acknowledgement: what ePSA is and is not (educational, not an
 * FDA-cleared device, not a diagnosis, not a replacement for a clinician).
 * One tap, no choices to make — a person cannot meaningfully read a result
 * they were never told the nature of, so this stays before the questions.
 *
 * What moved OUT of this screen: the storage choice and research-study
 * enrollment. Asking someone to pick a data-retention model and opt into an
 * IRB study before they have been asked a single question was a barrier in
 * front of the screening itself, and it asks for a decision about keeping
 * results that do not exist yet. Both are now asked once there are results
 * worth keeping — see SaveToCloudConsentModal.
 */
const ConsentScreen = ({ onConsentComplete }) => {
  const { t } = useTranslation();

  const handleSubmit = (e) => {
    e.preventDefault();
    onConsentComplete({
      // Acknowledgement only. Storage and research consent are captured later,
      // at the point of upload — nothing leaves the device before that.
      disclaimerAcknowledged: true,
      disclaimerTimestamp: new Date().toISOString(),
      consentToContact: false,
      researchConsent: false,
      consentBasis: 'local_only_no_upload',
      consentTimestamp: new Date().toISOString(),
    });
  };

  return (
    <div className="consent-container">
      <div className="consent-card">
        <div className="consent-header">
          <h2>Before you start</h2>
          <p className="consent-intro">
            ePSA takes about five minutes and gives you a personalized picture of your prostate
            cancer risk to bring to your clinician. Three things to know first.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="consent-form">
          <ul className="consent-points">
            <li className="consent-point">
              <ShieldCheckIcon size={18} className="consent-point-icon" aria-hidden="true" />
              <span>
                <strong>This is not a medical test or a diagnosis.</strong>
                <small>{t('consent.notMedicalDevice')} It estimates risk from population data — it cannot tell you whether you have cancer.</small>
              </span>
            </li>

            <li className="consent-point">
              <StethoscopeIcon size={18} className="consent-point-icon" aria-hidden="true" />
              <span>
                <strong>It's a starting point for a conversation.</strong>
                <small>Your result is meant to be reviewed with a clinician, who can weigh it against your full history. Do not use it to decide for or against testing on your own.</small>
              </span>
            </li>

            <li className="consent-point">
              <HardDriveIcon size={18} className="consent-point-icon" aria-hidden="true" />
              <span>
                <strong>No account, and nothing is kept unless you say so.</strong>
                <small>
                  Your answers are sent to Mount Sinai's secure server to calculate your score,
                  but they are not saved anywhere until you choose to keep them. No name, email,
                  or phone number is collected. After you see your results you'll get a session
                  key and be asked whether to save them — and separately, whether to share them
                  for research. Both are optional.
                </small>
              </span>
            </li>
          </ul>

          <p className="consent-footnote">
            {t('consent.rightToWithdrawBody')}{' '}
            <a href="mailto:aditya.dixit@mssm.edu">{t('consent.researcherContactTitle')}</a>
          </p>

          <button type="submit" className="btn btn-primary btn-block">
            <CheckCircle2Icon size={16} />
            I understand — start my assessment
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConsentScreen;
