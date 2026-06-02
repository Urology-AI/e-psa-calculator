import React, { useEffect, useRef } from 'react';
import './ModelDocs.css';
import { useTranslation } from 'react-i18next';

const HipaaCompliancePopup = ({ onClose }) => {
  const { t } = useTranslation();
  const closeRef = useRef(null);
  const overlayRef = useRef(null);

  // Focus trap — WCAG 2.1 AA requirement for modal dialogs
  useEffect(() => {
    // Move focus to the close button when modal opens
    closeRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;

      const focusable = overlayRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="model-docs-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hipaa-dialog-title"
      ref={overlayRef}
    >
      <div className="model-docs-container">
        <div className="model-docs-header">
          <h2 id="hipaa-dialog-title">{t('hipaa.title')}</h2>
          <button ref={closeRef} className="btn-close" onClick={onClose} aria-label={t('hipaa.closeButton')}>×</button>
        </div>

        <div className="model-docs-content">
          <section className="docs-section">
            <h3>{t('hipaa.privacy.title')}</h3>
            <p>{t('hipaa.privacy.text')}</p>
          </section>

          <section className="docs-section">
            <h3>{t('hipaa.baa.title')}</h3>
            <div className="info-box info">
              <strong>{t('hipaa.baa.label')}</strong> {t('hipaa.baa.text')}
            </div>
          </section>

          <section className="docs-section">
            <h3>{t('hipaa.sessionOnly.title')}</h3>
            <ul className="limitations-list">
              <li>
                <strong>{t('hipaa.sessionOnly.noEmailPhoneLabel')}</strong> {t('hipaa.sessionOnly.noEmailPhoneText')}
              </li>
              <li>
                <strong>{t('hipaa.sessionOnly.noIdentityLabel')}</strong> {t('hipaa.sessionOnly.noIdentityText')}
              </li>
              <li>
                <strong>{t('hipaa.sessionOnly.saveKeyLabel')}</strong> {t('hipaa.sessionOnly.saveKeyText')}
              </li>
            </ul>
          </section>

          <section className="docs-section">
            <h3>{t('hipaa.importCloud.title')}</h3>
            <ul className="limitations-list">
              <li>
                <strong>{t('hipaa.importCloud.fileImportLabel')}</strong> {t('hipaa.importCloud.fileImportText')}
              </li>
              <li>
                <strong>{t('hipaa.importCloud.loadCloudLabel')}</strong> {t('hipaa.importCloud.loadCloudText')}
              </li>
            </ul>
          </section>

          <section className="docs-section">
            <h3>{t('hipaa.choices.title')}</h3>
            <p>{t('hipaa.choices.text')}</p>
          </section>

          <section className="docs-section">
            <div className="info-box info">
              <strong>{t('hipaa.disclaimer.label')}</strong> {t('hipaa.disclaimer.text')}
            </div>
          </section>
        </div>

        <div className="model-docs-footer">
          <button className="btn-primary" onClick={onClose}>{t('hipaa.closeButton')}</button>
        </div>
      </div>
    </div>
  );
};

export default HipaaCompliancePopup;
