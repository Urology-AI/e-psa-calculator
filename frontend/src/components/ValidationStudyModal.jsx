import React from 'react';
import { useTranslation } from 'react-i18next';
import './ValidationStudyModal.css';

const ValidationStudyModal = ({ onClose }) => {
  const { t } = useTranslation();

  // Hard-coded from the Python validation output you pasted (N=94).
  const summary = {
    datasetN: 94,
    positive: 23,
    aucBayes: 0.593,
    aucPsa: 0.579,
    aucDiff: 0.012,
    aucDiffCiLow: -0.146,
    aucDiffCiHigh: 0.173,
    pVal: 0.878,
    youden: {
      bayes: {
        thr: -1.3470,
        j: 0.2486,
        sens: 0.826,
        spec: 0.423,
        ppv: 0.317,
        npv: 0.882,
        tp: 19,
        fn: 4,
        fp: 41,
        tn: 30,
      },
      psa: {
        thr: 5.500,
        j: 0.1898,
        sens: 0.739,
        spec: 0.451,
        ppv: 0.304,
        npv: 0.842,
        tp: 17,
        fn: 6,
        fp: 39,
        tn: 32,
      },
    },
  };

  const fmtPct = (x) => `${(x * 100).toFixed(1)}%`;
  const fmtSigned = (x, digits = 3) => (x >= 0 ? `+${x.toFixed(digits)}` : x.toFixed(digits));

  return (
    <div className="model-docs-overlay">
      <div className="model-docs-container" style={{ maxWidth: '1100px' }}>
        <div className="model-docs-header">
          <h2>{t('modelDocs.validationStudyTitle')}</h2>
          <button className="btn-close" onClick={onClose} aria-label={t('modelDocs.closeAriaLabel')}>×</button>
        </div>
        <div className="model-docs-content">
          <div className="vstudy-hero">
            <div className="vstudy-hero-title">
              <strong>
                {t('modelDocs.validationStudyModal.heroTitle', { n: summary.datasetN })}
              </strong>
              <span className="vstudy-muted">
                {t('modelDocs.validationStudyModal.csPcaCount', { positive: summary.positive })}
              </span>
            </div>
            <div className="vstudy-hero-sub">
              {t('modelDocs.validationStudyModal.heroSubtitle')}
            </div>
          </div>

          <div className="vstudy-grid">
            <div className="vstudy-card">
              <div className="vstudy-card-label">{t('modelDocs.validationStudyModal.cardAucBayesLabel')}</div>
              <div className="vstudy-card-value">{summary.aucBayes.toFixed(3)}</div>
            </div>
            <div className="vstudy-card">
              <div className="vstudy-card-label">{t('modelDocs.validationStudyModal.cardAucPsaLabel')}</div>
              <div className="vstudy-card-value">{summary.aucPsa.toFixed(3)}</div>
            </div>
            <div className="vstudy-card vstudy-card-wide">
              <div className="vstudy-card-label">{t('modelDocs.validationStudyModal.cardAucDiffLabel')}</div>
              <div className="vstudy-card-value">
                {fmtSigned(summary.aucDiff, 3)}{" "}
                <span className="vstudy-muted">
                  {t('modelDocs.validationStudyModal.aucDiffMeta', {
                    ciLow: summary.aucDiffCiLow.toFixed(3),
                    ciHigh: summary.aucDiffCiHigh.toFixed(3),
                    p: summary.pVal.toFixed(3),
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="docs-section">
            <h3>{t('modelDocs.validationStudyModal.youdenTitle')}</h3>
            <div className="vstudy-tables">
              <div className="vstudy-table">
                <div className="vstudy-table-title">
                  {t('modelDocs.validationStudyModal.bayesTableTitle', {
                    thr: summary.youden.bayes.thr.toFixed(3),
                  })}
                </div>
                <div className="vstudy-metrics">
                  <div className="vstudy-metric"><span>{t('modelDocs.validationStudyModal.sensitivityLabel')}</span><strong>{fmtPct(summary.youden.bayes.sens)}</strong></div>
                  <div className="vstudy-metric"><span>{t('modelDocs.validationStudyModal.specificityLabel')}</span><strong>{fmtPct(summary.youden.bayes.spec)}</strong></div>
                  <div className="vstudy-metric"><span>{t('modelDocs.validationStudyModal.ppvLabel')}</span><strong>{fmtPct(summary.youden.bayes.ppv)}</strong></div>
                  <div className="vstudy-metric"><span>{t('modelDocs.validationStudyModal.npvLabel')}</span><strong>{fmtPct(summary.youden.bayes.npv)}</strong></div>
                </div>
                <div className="vstudy-confusion">
                  <div className="vstudy-confusion-row"><span>{t('modelDocs.validationStudyModal.tpLabel')}</span><strong>{summary.youden.bayes.tp}</strong></div>
                  <div className="vstudy-confusion-row"><span>{t('modelDocs.validationStudyModal.fnLabel')}</span><strong>{summary.youden.bayes.fn}</strong></div>
                  <div className="vstudy-confusion-row"><span>{t('modelDocs.validationStudyModal.fpLabel')}</span><strong>{summary.youden.bayes.fp}</strong></div>
                  <div className="vstudy-confusion-row"><span>{t('modelDocs.validationStudyModal.tnLabel')}</span><strong>{summary.youden.bayes.tn}</strong></div>
                </div>
              </div>

              <div className="vstudy-table">
                <div className="vstudy-table-title">
                  {t('modelDocs.validationStudyModal.psaTableTitle', {
                    thr: summary.youden.psa.thr.toFixed(1),
                  })}
                </div>
                <div className="vstudy-metrics">
                  <div className="vstudy-metric"><span>{t('modelDocs.validationStudyModal.sensitivityLabel')}</span><strong>{fmtPct(summary.youden.psa.sens)}</strong></div>
                  <div className="vstudy-metric"><span>{t('modelDocs.validationStudyModal.specificityLabel')}</span><strong>{fmtPct(summary.youden.psa.spec)}</strong></div>
                  <div className="vstudy-metric"><span>{t('modelDocs.validationStudyModal.ppvLabel')}</span><strong>{fmtPct(summary.youden.psa.ppv)}</strong></div>
                  <div className="vstudy-metric"><span>{t('modelDocs.validationStudyModal.npvLabel')}</span><strong>{fmtPct(summary.youden.psa.npv)}</strong></div>
                </div>
                <div className="vstudy-confusion">
                  <div className="vstudy-confusion-row"><span>{t('modelDocs.validationStudyModal.tpLabel')}</span><strong>{summary.youden.psa.tp}</strong></div>
                  <div className="vstudy-confusion-row"><span>{t('modelDocs.validationStudyModal.fnLabel')}</span><strong>{summary.youden.psa.fn}</strong></div>
                  <div className="vstudy-confusion-row"><span>{t('modelDocs.validationStudyModal.fpLabel')}</span><strong>{summary.youden.psa.fp}</strong></div>
                  <div className="vstudy-confusion-row"><span>{t('modelDocs.validationStudyModal.tnLabel')}</span><strong>{summary.youden.psa.tn}</strong></div>
                </div>
              </div>
            </div>
          </div>

          <div className="docs-section">
            <h3>{t('modelDocs.validationStudyModal.bottomLineTitle')}</h3>
            <p>
              {t('modelDocs.validationStudyModal.bottomLineBodyStart')}
              <strong>{t('modelDocs.validationStudyModal.higherNpv')}</strong>{' '}
              {t('modelDocs.validationStudyModal.bottomLineBodyEnd')}
            </p>
            <p className="vstudy-muted">
              {t('modelDocs.validationStudyModal.interpretationNote', {
                n: summary.datasetN,
                positive: summary.positive,
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidationStudyModal;
