import React from 'react';
import './ModelDocs.css';
import { DEFAULT_CALCULATOR_CONFIG } from '../config/calculatorConfig';
import { useTranslation } from 'react-i18next';
import ValidationStudyModal from './ValidationStudyModal';

/**
 * Model Documentation — Stage 1 (ePSA Screening Priority)
 * Documents the questionnaire and scoring model, not the Risk Assessment (Stage 2) model.
 */
const ModelDocs = ({ onClose, config = DEFAULT_CALCULATOR_CONFIG }) => {
  const { t } = useTranslation();
  const [showValidationStudy, setShowValidationStudy] = React.useState(false);
  const part1 = config?.part1 || DEFAULT_CALCULATOR_CONFIG.part1;
  const riskCutoffs = part1?.riskCutoffs || { lower: { threshold: 0.23 }, moderate: { threshold: 0.39 }, higher: { threshold: 1.0 } };
  const recommendThreshold = part1?.recommendThreshold ?? 0.09;

  return (
    <>
      <div className="model-docs-overlay">
        <div className="model-docs-container">
          <div className="model-docs-header">
            <h2>{t('modelDocs.title')}</h2>
            <button className="btn-close" onClick={onClose} aria-label={t('modelDocs.closeAriaLabel')}>×</button>
          </div>

          <div className="model-docs-content">
            <section className="docs-section">
              <h3>{t('modelDocs.overview.title')}</h3>
              <p>
                {t('modelDocs.overview.bodyStart')}{' '}
                <strong>{t('modelDocs.overview.notDiagnosisStrong')}</strong>{' '}
                {t('modelDocs.overview.bodyEnd')}
              </p>
              <div className="info-box warning">
                <strong>{t('modelDocs.overview.warningStrong')}</strong>{' '}
                {t('modelDocs.overview.warningBody')}
              </div>
            </section>

            <section className="docs-section">
              <h3>{t('modelDocs.inputs.title')}</h3>
              <p>{t('modelDocs.inputs.intro')}</p>
              <ul className="limitations-list">
                <li><strong>{t('modelDocs.inputs.demographicsLabel')}</strong> {t('modelDocs.inputs.demographics')}</li>
                <li><strong>{t('modelDocs.inputs.anthropometricsLabel')}</strong> {t('modelDocs.inputs.anthropometrics')}</li>
                <li><strong>{t('modelDocs.inputs.familyGeneticsLabel')}</strong> {t('modelDocs.inputs.familyGenetics')}</li>
                <li><strong>{t('modelDocs.inputs.lifestyleLabel')}</strong> {t('modelDocs.inputs.lifestyle')}</li>
                <li><strong>{t('modelDocs.inputs.medicalHistoryLabel')}</strong> {t('modelDocs.inputs.medicalHistory')}</li>
                <li><strong>{t('modelDocs.inputs.validatedLabel')}</strong> {t('modelDocs.inputs.validated')}</li>
              </ul>
            </section>

            <section className="docs-section">
              <h3>{t('modelDocs.scoring.title')}</h3>
              <p>
                {t('modelDocs.scoring.body')}
              </p>
              <p className="formula-note">
                {t('modelDocs.scoring.formula', {
                  modelType: part1?.modelType || 'binned_v1',
                  lowerPct: Math.round((riskCutoffs?.lower?.threshold ?? 0.23) * 100),
                  moderatePct: Math.round((riskCutoffs?.moderate?.threshold ?? 0.39) * 100),
                })}
              </p>
            </section>

            <section className="docs-section">
              <h3>{t('modelDocs.riskTiers.title')}</h3>
              <p>
                {t('modelDocs.riskTiers.body', {
                  recommendPct: Math.round(recommendThreshold * 100),
                })}
              </p>
            </section>

            <section className="docs-section">
              <h3>{t('modelDocs.limitations.title')}</h3>
              <ul className="limitations-list">
                <li>{t('modelDocs.limitations.item1')}</li>
                <li>{t('modelDocs.limitations.item2')}</li>
                <li>{t('modelDocs.limitations.item3')}</li>
              </ul>
            </section>

            <section className="docs-section">
              <h3>{t('modelDocs.references.title')}</h3>
              <p>
                {t('modelDocs.references.body')}
              </p>
            </section>
          </div>

          <div className="model-docs-footer" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn-model-docs" onClick={() => setShowValidationStudy(true)}>
              {t('modelDocs.validationStudyButton')}
            </button>
            <button className="btn-primary" onClick={onClose}>{t('modelDocs.closeButton')}</button>
          </div>
        </div>
      </div>
      {showValidationStudy && <ValidationStudyModal onClose={() => setShowValidationStudy(false)} />}
    </>
  );
};

export default ModelDocs;
