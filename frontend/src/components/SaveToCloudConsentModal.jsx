import React, { useEffect, useRef } from 'react';
import './ModelDocs.css';

/**
 * Explicit consent gate shown before moving a locally-stored session to the
 * cloud (Firebase). Saving to cloud is a materially different data-handling
 * choice than the initial local/cloud storage pick, so it needs its own
 * confirmation rather than being silently triggered by the header button.
 */
const SaveToCloudConsentModal = ({ onConfirm, onCancel }) => {
  const closeRef = useRef(null);

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

  return (
    <div className="model-docs-overlay" role="dialog" aria-modal="true" aria-labelledby="save-cloud-consent-title">
      <div className="model-docs-container">
        <div className="model-docs-header">
          <h2 id="save-cloud-consent-title">Save your results to the cloud?</h2>
          <button ref={closeRef} className="btn-close" onClick={onCancel} aria-label="Cancel">×</button>
        </div>

        <div className="model-docs-content">
          <section className="docs-section">
            <p>
              Right now your responses and results are stored only on this device. Saving to the
              cloud uploads them to Mount Sinai's secure cloud storage (Firebase) and gives you a
              session key you can use to resume your assessment from any device.
            </p>
            <div className="info-box info">
              Your data is not shared for research unless you separately opt in to the research
              study. You can keep using ePSA locally instead — this step is optional.
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
            Cancel
          </button>
          <button className="btn-primary" onClick={onConfirm}>Yes, save to cloud</button>
        </div>
      </div>
    </div>
  );
};

export default SaveToCloudConsentModal;
