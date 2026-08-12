import React, { useEffect, useRef, useState } from 'react';
import { CheckIcon, CopyIcon, KeyRoundIcon } from 'lucide-react';
import './ModelDocs.css';
// Reuses the consent screen's checkbox styling — these opt-ins moved here from
// that screen and should look identical wherever they're asked.
import './ConsentScreen.css';

/**
 * Post-screening step: the user has results, and this is where we ask whether
 * to keep them off-device and whether they want to contribute them to the
 * research study. Both questions used to sit on the up-front consent screen,
 * before a single question had been asked — which put a data-retention and
 * IRB-enrollment decision in front of the screening itself, about results that
 * did not exist yet. Nothing is uploaded until this is confirmed.
 *
 * `onConfirm` receives the research-consent payload so the caller can record it
 * alongside the session; declining research still allows a plain cloud save.
 */
const SaveToCloudConsentModal = ({ sessionId, onConfirm, onCancel }) => {
  const closeRef = useRef(null);
  const [researchConsent, setResearchConsent] = useState(false);
  const [emrLinkageConsent, setEmrLinkageConsent] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sessionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (permissions, insecure context) — the key is
      // shown in full above, so copying is a convenience, not the mechanism.
    }
  };

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handleKey);
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onCancel]);

  const handleConfirm = () => {
    const now = new Date().toISOString();
    onConfirm({
      consentToContact: researchConsent,
      consentBasis: 'explicit_at_cloud_save',
      consentTimestamp: now,
      researchConsent,
      researchTimestamp: now,
      followUpSurveyDisclosureShown: researchConsent,
      followUpSurveyDisclosureTimestamp: now,
      emrLinkageConsent: researchConsent && emrLinkageConsent,
      emrLinkageConsentTimestamp: now,
    });
  };

  return (
    <div className="model-docs-overlay" role="dialog" aria-modal="true" aria-labelledby="save-cloud-consent-title">
      <div className="model-docs-container">
        <div className="model-docs-header">
          <h2 id="save-cloud-consent-title">Save your results?</h2>
          <button ref={closeRef} className="btn-close" onClick={onCancel} aria-label="Not now">×</button>
        </div>

        <div className="model-docs-content">
          <section className="docs-section">
            <p>
              Your results are on screen but not yet kept — close this tab and they're gone.
              Saving stores them in Mount Sinai's secure cloud storage under the anonymous
              session key below. No name, email, or phone number is stored.
            </p>

            {sessionId && (
              <>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                    background: 'var(--brand-50, #eff6ff)', border: '1px solid var(--brand-100, #dbeafe)',
                    borderRadius: '12px', padding: '16px 20px', margin: '14px 0 8px',
                  }}
                >
                  <KeyRoundIcon size={20} aria-hidden="true" style={{ color: 'var(--brand-600, #2563eb)', flexShrink: 0 }} />
                  <span
                    style={{
                      fontSize: 'clamp(1.375rem, 5.5vw, 1.875rem)', fontWeight: 700, letterSpacing: '0.16em',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      color: 'var(--ink-900, #111827)', wordBreak: 'break-all',
                    }}
                  >
                    {sessionId}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={handleCopy}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      background: 'transparent', border: '1px solid var(--line-200, #e5e7eb)',
                      color: 'var(--ink-700, #374151)', padding: '0.4rem 0.9rem',
                      borderRadius: '0.5rem', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer',
                    }}
                  >
                    {copied ? <CheckIcon size={14} aria-hidden="true" /> : <CopyIcon size={14} aria-hidden="true" />}
                    {copied ? 'Copied' : 'Copy key'}
                  </button>
                </div>
                <p style={{ margin: '0 0 4px', fontSize: '0.8125rem', color: 'var(--ink-600, #4b5563)' }}>
                  Write this key down — it's the only way back into a saved session, and it stays
                  in the header while you work.
                </p>
              </>
            )}

            <div className="consent-emr-section">
              <label className="consent-emr-label">
                <input
                  type="checkbox"
                  checked={researchConsent}
                  onChange={(e) => {
                    setResearchConsent(e.target.checked);
                    if (!e.target.checked) setEmrLinkageConsent(false);
                  }}
                  className="consent-emr-checkbox"
                />
                <span>
                  <strong>[Optional] Also use my results for research</strong> — enrolls me in the
                  Tewari Lab / Million Strong Men study (IRB STUDY-14-00050). De-identified data
                  may be used to improve ePSA for future patients. I may be contacted at about 3,
                  6, 12, and 36 months to ask only whether I received a PSA test and its result.
                  Opt out anytime by replying STOP.
                </span>
              </label>
            </div>

            {researchConsent && (
              <div className="consent-emr-section">
                <label className="consent-emr-label">
                  <input
                    type="checkbox"
                    checked={emrLinkageConsent}
                    onChange={(e) => setEmrLinkageConsent(e.target.checked)}
                    className="consent-emr-checkbox"
                  />
                  <span>
                    <strong>[Optional] Medical record linkage</strong> — the research team may
                    verify clinical outcomes (PSA results, biopsy findings, treatments) from my
                    medical record to improve the ePSA model. This does not affect my results.
                  </span>
                </label>
              </div>
            )}

            <div className="info-box info">
              Saving and research are separate — you can save without joining the study. Either
              way your results stay on screen for this visit, and a saved session can be deleted
              from the results screen later.
            </div>
          </section>
        </div>

        <div className="model-docs-footer" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'transparent', border: '1px solid var(--line-200, #e5e7eb)',
              color: 'var(--ink-700, #374151)', padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem', fontSize: '0.9375rem', fontWeight: 500, cursor: 'pointer',
            }}
          >
            Not now
          </button>
          <button className="btn-primary" onClick={handleConfirm}>Save my results</button>
        </div>
      </div>
    </div>
  );
};

export default SaveToCloudConsentModal;
