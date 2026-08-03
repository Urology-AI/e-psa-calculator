import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './Part2Form.css';
import './epsa-v2-layout.css';
import './Part1Results.css';
import './Part3Results.css';
import RiskGauge from './RiskGauge';
import { CollapsibleSection, GuardrailBanner, SdmConversationGuide } from './shared/ResultsShared.jsx';
import { AlertTriangleIcon } from 'lucide-react';
import ResultsLoading, { LOADING_SEEN_KEY_PSA, PSA_LOADING_STEPS } from './ResultsLoading';

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
 * PSA Results — ePSA score (PSA + baseline, no MRI yet) plus any
 * advanced-biomarker context the user reported. MRI / PI-RADS and the
 * validated biopsy-prediction model live on the MRI stage once MRI data is added.
 */
const Part2Results = ({ result, postData, preResult, onContinueToMRI, onBack, onStartOver }) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);

  if (!result) return null;

  if (isLoading) return (
    <div className="results-container">
      <ResultsLoading
        label="ePSA · PSA"
        message="Analyzing your PSA result…"
        steps={PSA_LOADING_STEPS}
        onComplete={() => setIsLoading(false)}
        storageKey={LOADING_SEEN_KEY_PSA}
      />
    </div>
  );

  const {
    riskCat, riskClass, epsaTierKey, psaValue, psaAdjusted, psaAdjustedFlag, psaTier,
    guardrailAlerts = [], lowPsaWarning, lowPsaWarningText, discordanceFlag, isOtherHormonal,
    priorPsa = null, rescreeningIntervalMessage = null,
  } = result;

  const ageNum = Number(preResult?.age) || 0;
  const isAge70Plus = ageNum >= 70;
  const auaAgeThreshold = ageNum < 50 ? 2.5 : ageNum < 60 ? 3.5 : ageNum < 70 ? 4.5 : 6.5;
  const auaAgeLabel = ageNum < 50 ? '40–49' : ageNum < 60 ? '50–59' : ageNum < 70 ? '60–69' : '70+';
  const psaForThreshold = parseFloat(psaAdjusted ?? psaValue) || 0;
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
      <div className="risk-summary-card res-reveal" role="region" aria-label="PSA and biomarker risk assessment result">
        <div className="v2-res-eyebrow">
          <span>ePSA Score · PSA Result</span>
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
          <div className="tier-journey" aria-label="Risk tier change from Pre-PSA to PSA stage">
            <div className="tier-journey-step">
              <span className="tier-journey-label">Pre-PSA Baseline</span>
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
            {ageNum >= 40 && (
              <div style={{ marginTop: '8px', fontSize: '11px', background: '#f8fafc', border: '0.5px solid #cbd5e1', borderRadius: '6px', padding: '6px 8px', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 600, color: '#475569', marginBottom: '2px' }}>AUA/SUO 2026 Age-Adjusted Threshold</div>
                <div style={{ color: '#334155' }}>
                  Age {auaAgeLabel}: <strong>{auaAgeThreshold} ng/mL</strong>
                  {' · '}
                  {psaForThreshold >= auaAgeThreshold
                    ? <span style={{ color: '#b45309', fontWeight: 600 }}>Your PSA exceeds this threshold</span>
                    : <span style={{ color: '#15803d', fontWeight: 600 }}>Your PSA is below this threshold</span>}
                </div>
              </div>
            )}
          </div>

          {preResult?.score != null && (
            <div className="p2r-key-input p2r-key-input--muted">
              <div className="p2r-key-input-label">Pre-PSA Score</div>
              <div className="p2r-key-input-value">
                {preResult.score}
                <span className="p2r-key-input-unit">%</span>
              </div>
              <div className="p2r-key-input-tier">{preResult.epsaTierLabel || '—'}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Critical guardrail alerts (e.g. PSA > 100) ── */}
      {guardrailAlerts?.length > 0 && guardrailAlerts
        .filter(a => a.level === 'critical')
        .map(alert => <GuardrailBanner key={alert.code} alert={alert} />)
      }

      {/* ── Clinical Notices: one consolidated box for every non-critical, patient-specific
           note (hormonal therapy, low PSA, discordance, re-screening interval, age 70+ SDM,
           and any non-critical guardrail) instead of a separate card per item. ── */}
      {(() => {
        const nonCriticalGuardrails = (guardrailAlerts || []).filter(a => a.level !== 'critical');
        // Age 70+ SDM note is redundant with the LIFE_EXPECTANCY_GATE guardrail when both apply —
        // only show the standalone note if the guardrail (which covers 75+/comorbidities) didn't fire.
        const hasLifeExpectancyGuardrail = nonCriticalGuardrails.some(a => a.code === 'LIFE_EXPECTANCY_GATE');
        const showAge70Note = isAge70Plus && !hasLifeExpectancyGuardrail;
        const hasAnyNotice = isOtherHormonal || lowPsaWarning || discordanceFlag ||
          (priorPsa != null && rescreeningIntervalMessage) || showAge70Note || nonCriticalGuardrails.length > 0;
        if (!hasAnyNotice) return null;
        return (
          <div className="p2r-notices" role="note" aria-label="Clinical notices">
            <div className="p2r-notices-title">
              <AlertTriangleIcon size={13} className="p2r-notices-icon" />
              <span>Clinical Notices</span>
            </div>
            <ul className="p2r-notices-list">
              {isOtherHormonal && (
                <li style={{ fontSize: '13px', color: 'var(--ink-800)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--warning-600)' }}>Hormonal Therapy: </strong>No validated PSA correction exists for this therapy. PSA used as reported — inform your physician.
                </li>
              )}
              {lowPsaWarning && (
                <li style={{ fontSize: '13px', color: 'var(--ink-800)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--warning-600)' }}>Low PSA Risk: </strong>{lowPsaWarningText}
                </li>
              )}
              {discordanceFlag && (
                <li style={{ fontSize: '13px', color: 'var(--ink-800)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--warning-600)' }}>Risk Discordance: </strong>{discordanceFlag.text}
                </li>
              )}
              {priorPsa != null && rescreeningIntervalMessage && (
                <li style={{ fontSize: '13px', color: 'var(--ink-800)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--warning-600)' }}>Re-Screening Interval </strong>(prior PSA {priorPsa} ng/mL): {rescreeningIntervalMessage}
                </li>
              )}
              {showAge70Note && (
                <li style={{ fontSize: '13px', color: 'var(--ink-800)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--warning-600)' }}>Age 70+ — SDM Required: </strong>Per AUA/SUO 2026, PSA screening decisions at age 70+ require a physician-led conversation about life expectancy before acting on this result.
                </li>
              )}
              {nonCriticalGuardrails.map(alert => (
                <li key={alert.code} style={{ fontSize: '13px', color: 'var(--ink-800)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--warning-600)' }}>{alert.title}: </strong>{alert.message}
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      {/* ── Shared Decision-Making Conversation Guide (AHRQ SHARE Approach) ── */}
      <SdmConversationGuide sdmGuide={result?.sdmGuide} />

      <BiomarkerContextSection formData={postData} />

      {/* ── Next-step guidance: one compact box instead of two ── */}
      <div
        role="note"
        style={{ margin: '1rem 0', padding: '0.875rem 1rem', background: 'var(--brand-50)', border: '1px solid var(--brand-400)', borderLeft: '4px solid var(--brand-500)', borderRadius: '8px', fontSize: '0.8125rem', color: 'var(--brand-700)', lineHeight: 1.6 }}
      >
        <p style={{ margin: 0 }}>PSA alone has limited specificity. Adding an MRI PI-RADS score lets ePSA run the validated biopsy-prediction model, which combines PSA density and PI-RADS for a much more informative estimate.</p>
        <p style={{ margin: '8px 0 0' }}>Up to 25–40% of elevated PSA values normalise on repeat testing. If this PSA hasn't been confirmed, discuss a repeat test with your clinician before further workup (AUA/SUO 2026, Statement 3).</p>
      </div>

      <CollapsibleSection title="Important Disclaimer" defaultOpen={false}>
        <p style={{ fontSize: '13px', color: 'var(--ink-800)', lineHeight: 1.6 }}>
          ePSA is an educational tool, not a medical diagnosis. Results are based on population-level data aligned with AUA/SUO 2026 guideline thresholds. A higher tier means earlier follow-up is recommended — it does not mean you have cancer. Always confirm an elevated PSA with a repeat test before any biopsy, and speak with a physician before making any health decisions.
        </p>
        <p style={{ fontSize: '11px', color: 'var(--ink-600)', fontStyle: 'italic' }}>— Ashutosh K. Tewari, MD, Icahn School of Medicine at Mount Sinai</p>
      </CollapsibleSection>

      <div className="form-navigation">
        <div className="form-navigation-inner">
          {typeof onBack === 'function' && (
            <button className="btn-back" onClick={onBack}>← Back</button>
          )}
          {typeof onContinueToMRI === 'function' && (
            <button className="btn-calculate" onClick={onContinueToMRI}>
              Continue to MRI Assessment →
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
