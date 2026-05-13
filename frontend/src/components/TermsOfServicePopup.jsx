import React from 'react';
import './ModelDocs.css';
import { useTranslation } from 'react-i18next';

const TermsOfServicePopup = ({ onClose }) => {
  const { t } = useTranslation();
  return (
    <div className="model-docs-overlay">
      <div className="model-docs-container">
        <div className="model-docs-header">
          <h2>{t('terms.title')}</h2>
          <button className="btn-close" onClick={onClose} aria-label={t('terms.closeButton')}>×</button>
        </div>

        <div className="model-docs-content">
          <section className="docs-section">
            <div className="info-box info">
              <strong>{t('terms.placeholder.label')}</strong> {t('terms.placeholder.text')}
            </div>
          </section>

          <section className="docs-section">
            <h3>{t('terms.lastUpdated.title')}</h3>
            <p>{t('terms.lastUpdated.text')}</p>
          </section>

          <section className="docs-section">
            <h3>{t('terms.acceptance.title')}</h3>
            <p>{t('terms.acceptance.text')}</p>
          </section>

          <section className="docs-section">
            <h3>{t('terms.institutional.title')}</h3>
            <p>{t('terms.institutional.text')}</p>
          </section>

          <section className="docs-section">
            <h3>{t('terms.educationalUse.title')}</h3>
            <p>{t('terms.educationalUse.text')}</p>
          </section>

          <section className="docs-section">
            <h3>{t('terms.noMedicalAdvice.title')}</h3>
            <p>{t('terms.noMedicalAdvice.text')}</p>
          </section>

          <section className="docs-section">
            <h3>{t('terms.accountResponsibility.title')}</h3>
            <p>{t('terms.accountResponsibility.text')}</p>
          </section>

          <section className="docs-section">
            <h3>{t('terms.intellectualProperty.title')}</h3>
            <p>{t('terms.intellectualProperty.text')}</p>
          </section>

          <section className="docs-section">
            <h3>{t('terms.noWarranty.title')}</h3>
            <p>{t('terms.noWarranty.text')}</p>
          </section>

          <section className="docs-section">
            <h3>{t('terms.limitationOfLiability.title')}</h3>
            <p>{t('terms.limitationOfLiability.text')}</p>
          </section>

          <section className="docs-section">
            <h3>{t('terms.indemnity.title')}</h3>
            <p>{t('terms.indemnity.text')}</p>
          </section>

          <section className="docs-section">
            <h3>{t('terms.changes.title')}</h3>
            <p>{t('terms.changes.text')}</p>
          </section>

          <section className="docs-section">
            <h3>{t('terms.governingLaw.title')}</h3>
            <p>{t('terms.governingLaw.text')}</p>
          </section>

          <section className="docs-section">
            <h3>{t('terms.contact.title')}</h3>
            <p>{t('terms.contact.text')}</p>
          </section>
        </div>

        <div className="model-docs-footer">
          <button className="btn-primary" onClick={onClose}>{t('terms.closeButton')}</button>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePopup;
