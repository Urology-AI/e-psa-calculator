import React, { useState } from 'react';
import {
  ArrowLeftIcon,
  ShieldCheckIcon,
  FlaskConicalIcon,
  LockIcon,
  FileTextIcon,
  AlertTriangleIcon,
} from 'lucide-react';
import './MountSinaiGateScreen.css';

/**
 * SinaiConsentScreen
 * ─────────────────────────────────────────────────────────────────────────
 * IRB STUDY-14-00050-specific consent text for the Mount Sinai clinic cohort.
 * Different from the public ConsentScreen because:
 *   - the patient is already opting in by entering a clinic code
 *   - the text cites the IRB protocol explicitly
 *   - it discloses both the live REDCap path and the offline-capture fallback
 *     so the patient knows where their data may flow
 *
 * Props:
 *   clinicCode  — the validated code (display only, not editable)
 *   redcapEnabled — whether live REDCap submission is currently enabled
 *   onConsent   — () => void  (parent advances to the form)
 *   onBack      — () => void
 */
const SinaiConsentScreen = ({ clinicCode, redcapEnabled, onConsent, onBack }) => {
  const [acknowledged, setAcknowledged] = useState(false);

  const formatCode = (raw) => {
    const cleaned = (raw || '').replace(/-/g, '').toUpperCase();
    const groups = [];
    for (let i = 0; i < cleaned.length; i += 4) groups.push(cleaned.slice(i, i + 4));
    return groups.join('-');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!acknowledged) return;
    onConsent({
      consentToContact: true,
      consentBasis: 'sinai_irb_study_14_00050',
      consentTimestamp: new Date().toISOString(),
      researchConsent: true,
      researchTimestamp: new Date().toISOString(),
    });
  };

  return (
    <div className="sinai-consent-container">
      <div className="sinai-consent-card">
        <button
          type="button"
          className="sinai-gate-back"
          onClick={onBack}
          aria-label="Go back"
        >
          <ArrowLeftIcon size={16} />
          <span>Back</span>
        </button>

        <div className="sinai-gate-header">
          <div className="sinai-gate-icon">
            <FlaskConicalIcon size={28} />
          </div>
          <h2>Research Participation Consent</h2>
          <p className="sinai-gate-subtitle">
            Mount Sinai ePSA Study — IRB Protocol STUDY-14-00050
          </p>
        </div>

        <div className="sinai-consent-code">
          <span className="sinai-consent-code-label">Clinic code</span>
          <span className="sinai-consent-code-value">{formatCode(clinicCode)}</span>
        </div>

        <section className="sinai-consent-section">
          <header className="sinai-consent-section-header">
            <FileTextIcon size={16} />
            <h3>What we&apos;re asking</h3>
          </header>
          <p>
            By continuing, you agree to share your de-identified ePSA responses
            with the Mount Sinai prostate cancer research team for use in study
            STUDY-14-00050. Your data will be linked to your clinic code only,
            not to your name or other identifying information stored in this app.
          </p>
        </section>

        <section className="sinai-consent-section">
          <header className="sinai-consent-section-header">
            <LockIcon size={16} />
            <h3>How your data is handled</h3>
          </header>
          <p>
            Your responses are stored in the ePSA research database, identified
            only by your clinic code (no name, MRN, or other personal identifiers).
            The temporary processing copy is automatically deleted after{' '}
            <strong>30 days</strong>, or sooner once it has been recorded in
            Mount Sinai&apos;s REDCap research database.
          </p>
          {!redcapEnabled && (
            <div className="sinai-consent-callout" style={{ marginTop: 12 }}>
              <AlertTriangleIcon size={16} className="sinai-consent-callout-icon" />
              <div>
                <strong>REDCap upload pending</strong>
                <p>
                  The live REDCap connection is not active right now, so the
                  study team will manually transfer your responses to REDCap
                  shortly. You may also receive a copy as a downloaded CSV file
                  for the clinician.
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="sinai-consent-section">
          <header className="sinai-consent-section-header">
            <ShieldCheckIcon size={16} />
            <h3>Your rights</h3>
          </header>
          <ul className="sinai-consent-rights">
            <li>Participation is voluntary. Your clinical care is not affected by your choice.</li>
            <li>You may withdraw by contacting the Mount Sinai study coordinator at any time.</li>
            <li>ePSA is a decision-support tool, not an FDA-cleared medical device.</li>
            <li>
              Questions: contact the principal investigator listed in your study materials, or the
              Mount Sinai IRB Office.
            </li>
          </ul>
        </section>

        <form onSubmit={handleSubmit} className="sinai-gate-form">
          <label className="sinai-consent-checkbox">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
            <span>
              I am the patient identified by clinic code {formatCode(clinicCode)}, I have read
              the information above, and I agree to participate in IRB study STUDY-14-00050.
            </span>
          </label>

          <button
            type="submit"
            className="sinai-gate-submit"
            disabled={!acknowledged}
          >
            <span>I consent — continue to the form</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default SinaiConsentScreen;
