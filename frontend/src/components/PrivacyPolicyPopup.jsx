import React from 'react';
import './ModelDocs.css';
import { useTranslation } from 'react-i18next';

const PrivacyPolicyPopup = ({ onClose }) => {
  const { t } = useTranslation();
  return (
    <div className="model-docs-overlay">
      <div className="model-docs-container">
        <div className="model-docs-header">
          <h2>{t('privacyPolicy.title')}</h2>
          <button className="btn-close" onClick={onClose} aria-label={t('privacyPolicy.closeButton')}>×</button>
        </div>

        <div className="model-docs-content">
          <section className="docs-section">
            <div className="info-box info">
              <strong>{t('privacyPolicy.placeholder.label')}</strong> {t('privacyPolicy.placeholder.text')}
            </div>
          </section>

          <section className="docs-section">
            <h3>{t('privacyPolicy.lastUpdated.title')}</h3>
            <p>{t('privacyPolicy.lastUpdated.text')}</p>
          </section>

          <section className="docs-section">
            <h3>{t('privacyPolicy.whoWeAre.title')}</h3>
            <p>{t('privacyPolicy.whoWeAre.text')}</p>
          </section>

          <section className="docs-section">
            <h3>{t('privacyPolicy.dataCollected.title')}</h3>
            <p>{t('privacyPolicy.dataCollected.intro')}</p>
            <ul className="limitations-list">
              <li><strong>{t('privacyPolicy.dataCollected.assessmentLabel')}</strong> {t('privacyPolicy.dataCollected.assessmentText')}</li>
              <li><strong>{t('privacyPolicy.dataCollected.authLabel')}</strong> {t('privacyPolicy.dataCollected.authText')}</li>
              <li><strong>{t('privacyPolicy.dataCollected.technicalLabel')}</strong> {t('privacyPolicy.dataCollected.technicalText')}</li>
            </ul>
          </section>

          <section className="docs-section">
            <h3>{t('privacyPolicy.howWeUse.title')}</h3>
            <p>{t('privacyPolicy.howWeUse.text')}</p>
          </section>

          <section className="docs-section">
            <h3>{t('privacyPolicy.storageAndSharing.title')}</h3>
            <p>{t('privacyPolicy.storageAndSharing.text')}</p>
          </section>

          <section className="docs-section">
            <h3>{t('privacyPolicy.yourRights.title')}</h3>
            <p>{t('privacyPolicy.yourRights.text')}</p>
          </section>

          <section className="docs-section">
            <h3>{t('privacyPolicy.contact.title')}</h3>
            <p>{t('privacyPolicy.contact.text')}</p>
          </section>
        </div>

        <div className="model-docs-footer">
          <button className="btn-primary" onClick={onClose}>{t('privacyPolicy.closeButton')}</button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPopup;
