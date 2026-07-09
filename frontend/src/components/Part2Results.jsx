import React from 'react';
import { useTranslation } from 'react-i18next';
import './Part2Form.css';
import './epsa-v2-layout.css';
import './Part1Results.css';
import './Part3Results.css';
import RiskGauge from './RiskGauge';

/* ─── PSA context colors (labels resolved via i18n) ─── */
const PSA_TIER_COLORS = {
  'low':               '#16a34a',
  'intermediate-low':  '#2563eb',
  'intermediate-high': '#d97706',
  'high':              '#dc2626',
};
const PSA_TIER_I18N_KEY = {
  'low':               'low',
  'intermediate-low':  'intermediateLow',
  'intermediate-high': 'intermediateHigh',
  'high':              'high',
};

const P2_GAUGE_COLORS = { low: '#16a34a', moderate: '#d97706', high: '#dc2626' };

/* ─── Biomarker Context (user-reported advanced biomarker results) ─── */
const BIOMARKER_RESULT_LABEL = { low: 'Low risk', intermediate: 'Intermediate', high: 'High risk' };
const BIOMARKER_RESULT_NOTE = {
  low: 'suggests lower likelihood of clinically significant disease than PSA alone.',
  intermediate: 'suggests a mixed signal — discuss alongside your ePSA score with your clinician.',
  high: 'suggests elevated concern that may warrant closer follow-up regardless of your ePSA score.',
};

const PRS_LABEL = {
  below_average: 'Below average',
  average: 'Average risk',
  above_average: 'Above average (1.5–2× average)',
  high: 'High risk (2×+ above average)',
};

const scoreSuffix = (score) => (score ? ` (score: ${score})` : '');

const BiomarkerContextSection = ({ formData }) => {
  if (!formData) return null;
  const items = [];
  if (formData.polygenicrisk && formData.polygenicrisk !== 'not_tested') {
    const label = PRS_LABEL[formData.polygenicrisk] || formData.polygenicrisk;
    items.push({ name: 'Polygenic Risk Score', value: label + scoreSuffix(formData.polygenicScore), note: 'Reflects inherited genetic risk independent of PSA and lifestyle factors.' });
  }
  if (formData.urineBiomarker && formData.urineBiomarker !== 'none' && formData.urineBiomarkerResult) {
    const testLabel = { mps2: 'MPS2 (MyProstateScore 2.0)', exodx: 'ExoDx Prostate (IntelliScore)', pca3: 'PCA3', selectmdx: 'SelectMDx' }[formData.urineBiomarker];
    items.push({ name: testLabel, value: BIOMARKER_RESULT_LABEL[formData.urineBiomarkerResult] + scoreSuffix(formData.urineBiomarkerScore), note: `Urine biomarker result — ${BIOMARKER_RESULT_NOTE[formData.urineBiomarkerResult]}` });
  }
  if (formData.bloodBiomarker && formData.bloodBiomarker !== 'none' && formData.bloodBiomarkerResult) {
    const testLabel = { stockholm3: 'Stockholm 3 (STHLM3)', phi: 'Prostate Health Index (PHI)', '4k': '4Kscore' }[formData.bloodBiomarker];
    items.push({ name: testLabel, value: BIOMARKER_RESULT_LABEL[formData.bloodBiomarkerResult] + scoreSuffix(formData.bloodBiomarkerScore), note: `Blood biomarker result — ${BIOMARKER_RESULT_NOTE[formData.bloodBiomarkerResult]}` });
  }
  if (formData.genomicTest && formData.genomicTest !== 'none' && formData.genomicResult) {
    const testLabel = { decipher: 'Decipher', oncodx: 'OncotypeDX GPS', prolaris: 'Prolaris' }[formData.genomicTest];
    items.push({ name: testLabel, value: BIOMARKER_RESULT_LABEL[formData.genomicResult], note: `Tissue genomic result — ${BIOMARKER_RESULT_NOTE[formData.genomicResult]}` });
  }
  if (formData.exactvuDone === 'yes' && formData.exactvuPrecise) {
    items.push({ name: 'ExactVu Micro-Ultrasound', value: `PRECISE ${formData.exactvuPrecise}/5`, note: 'PRECISE score reflects lesion suspicion on high-resolution micro-ultrasound.' });
  }
  if (items.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Biomarker context"
      style={{
        margin: '1rem 0',
        padding: '1rem 1.125rem',
        background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)',
        border: '1.5px solid #c7d2fe',
        borderLeft: '4px solid #6366F1',
        borderRadius: '10px',
      }}
    >
      <h4 style={{ margin: '0 0 4px', fontSize: '0.9375rem', fontWeight: 700, color: '#312e81' }}>Biomarker Context</h4>
      <p style={{ margin: '0 0 12px', fontSize: '0.8125rem', color: '#4338ca', lineHeight: 1.5 }}>
        Additional test results you reported, shown alongside your ePSA score for clinical context.
      </p>
      <div style={{ display: 'grid', gap: '8px' }}>
        {items.map((item, idx) => (
          <div key={idx} style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid #e0e7ff', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', fontSize: '0.8125rem' }}>
              <strong style={{ color: '#312e81' }}>{item.name}</strong>
              <span style={{ fontWeight: 700, color: '#4338ca' }}>{item.value}</span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#4b5563', lineHeight: 1.5 }}>{item.note}</p>
          </div>
        ))}
      </div>
      <p style={{ margin: '12px 0 0', fontSize: '0.75rem', color: '#4338ca', fontStyle: 'italic', lineHeight: 1.5 }}>
        These results are displayed for clinical context. The ePSA multimodal model incorporating all biomarker inputs is in active development.
      </p>
    </div>
  );
};

/**
 * Parts 2 & 3 Results — ePSA score (PSA + baseline, no MRI yet) plus any
 * advanced-biomarker context the user reported. MRI / PI-RADS and the
 * validated biopsy-prediction model live on Part 4 once MRI data is added.
 */
const Part2Results = ({ result, postData, preResult, onContinueToMRI, onBack, onStartOver }) => {
  const { t } = useTranslation();

  if (!result) return null;

  const { riskCat, riskClass, epsaTierKey, psaValue, psaAdjusted, psaAdjustedFlag, psaTier } = result;
  const cleanRiskCat = (riskCat || '').replace(/[🟢🟡🟠🔴]/g, '').trim();
  const riskColor = riskClass === 'high' || String(riskClass || '').toLowerCase().includes('high') ? '#dc2626'
    : riskClass === 'moderate' || String(riskClass || '').toLowerCase().includes('moderate') ? '#d97706'
    : '#16a34a';

  const isVeryHighRisk = String(riskClass || '').toLowerCase().includes('very');
  const p2GaugeTierKey = epsaTierKey === 'high' ? 'high' : epsaTierKey === 'intermediate-high' ? 'moderate' : 'low';
  const p2GaugeScore = isVeryHighRisk ? 92
    : epsaTierKey === 'high' ? 78
    : epsaTierKey === 'intermediate-high' ? 50
    : epsaTierKey === 'intermediate-low' ? 28
    : 17;

  const p2GaugeTiers = [
    { key: 'low',      label: t('part2Results.tiers.gauge.low'),      color: P2_GAUGE_COLORS.low },
    { key: 'moderate', label: t('part2Results.tiers.gauge.moderate'), color: P2_GAUGE_COLORS.moderate },
    { key: 'high',     label: t('part2Results.tiers.gauge.high'),     color: P2_GAUGE_COLORS.high },
  ];

  const psaTierLower = psaTier?.toLowerCase();
  const psaTierKey = PSA_TIER_I18N_KEY[psaTierLower] || PSA_TIER_I18N_KEY['intermediate-high'];
  const psaTierCtx = {
    label: t(`part2Results.tiers.psaContext.${psaTierKey}.label`),
    detail: t(`part2Results.tiers.psaContext.${psaTierKey}.detail`),
    color: PSA_TIER_COLORS[psaTierLower] || PSA_TIER_COLORS['intermediate-high'],
  };

  return (
    <div className="part2-form-container">
      <div className="flow-header">
        <div className="flow-step-chip">Parts 2 &amp; 3 Results</div>
        <h3 className="flow-step-title">Your ePSA Score</h3>
        <p className="flow-step-note">Based on your PSA level and baseline profile. Add your MRI / PI-RADS result next for the combined biopsy-risk assessment.</p>
      </div>

      <div className="risk-summary-card res-reveal" role="region" aria-label="PSA and biomarker risk assessment result">
        <div className="v2-res-eyebrow">
          <span>ePSA Score · PSA &amp; Biomarkers</span>
          <span>Assessed today</span>
        </div>

        <div className="v2-gauge-layout">
          <RiskGauge score={p2GaugeScore} tierKey={p2GaugeTierKey} tierLabel={cleanRiskCat} tiers={p2GaugeTiers} />
          <div className="v2-tier-info">
            <div className="v2-tier-label">ePSA Risk Tier</div>
            <h2 className="v2-tier-title res-tier-pop" style={{ color: riskColor }}>{cleanRiskCat}</h2>
          </div>
        </div>

        {preResult?.epsaTierLabel && (
          <div className="tier-journey" aria-label="Risk tier change from Part 1 to Part 2">
            <div className="tier-journey-step">
              <span className="tier-journey-label">Part 1 Baseline</span>
              <span className="tier-journey-tier">{preResult.epsaTierLabel}</span>
            </div>
            <span className="tier-journey-arrow" aria-hidden="true">→</span>
            <div className="tier-journey-step tier-journey-step--to">
              <span className="tier-journey-label">ePSA Score</span>
              <span className="tier-journey-tier" style={{ color: riskColor }}>{cleanRiskCat}</span>
            </div>
          </div>
        )}

        <div className="p2r-key-inputs">
          <div className="p2r-key-input">
            <div className="p2r-key-input-label">PSA Result</div>
            <div className="p2r-key-input-value" style={{ color: psaTierCtx.color }}>
              {psaAdjustedFlag ? psaAdjusted : psaValue}
              <span className="p2r-key-input-unit"> ng/mL</span>
            </div>
            <div className="p2r-key-input-tier" style={{ color: psaTierCtx.color }}>{psaTierCtx.label}</div>
            <div className="p2r-key-input-detail">{psaTierCtx.detail}</div>
          </div>

          {preResult?.score != null && (
            <div className="p2r-key-input p2r-key-input--muted">
              <div className="p2r-key-input-label">Part 1 Score</div>
              <div className="p2r-key-input-value">
                {preResult.score}
                <span className="p2r-key-input-unit">%</span>
              </div>
              <div className="p2r-key-input-tier">{preResult.epsaTierLabel || '—'}</div>
            </div>
          )}
        </div>
      </div>

      <BiomarkerContextSection formData={postData} />

      <div
        role="note"
        style={{ margin: '1rem 0', padding: '0.875rem 1rem', background: '#eef2ff', border: '1px solid #c7d2fe', borderLeft: '4px solid #6366F1', borderRadius: '8px', fontSize: '0.8125rem', color: '#312e81', lineHeight: 1.5 }}
      >
        PSA alone has limited specificity. Adding an MRI PI-RADS score (Part 4) lets ePSA run the validated biopsy-prediction model, which combines PSA density and PI-RADS for a much more informative estimate.
      </div>

      <div className="form-navigation">
        <div className="form-navigation-inner">
          {typeof onBack === 'function' && (
            <button className="btn-back" onClick={onBack}>← Back</button>
          )}
          {typeof onContinueToMRI === 'function' && (
            <button className="btn-calculate" onClick={onContinueToMRI}>
              Continue to MRI Assessment (Part 4) →
            </button>
          )}
        </div>
        {typeof onStartOver === 'function' && (
          <div className="form-navigation-inner" style={{ marginTop: '8px', justifyContent: 'center' }}>
            <button className="btn-back" onClick={onStartOver}>Start Over</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Part2Results;
