import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './Part2Form.css';
import './epsa-v2-layout.css';
import './Part1Results.css';
import './Part3Results.css';
import './Part2Results.css';
import { CollapsibleSection, GuardrailBanner, ClinicalOnly, SdmConversationGuide, SdmCard, DisclaimerTeaser, ModelConfidenceBadge, WhyImpactBars, GuidelineRecommendationCard, NarrationPlayer } from './shared/ResultsShared.jsx';
import { AssessmentSidebar, RiskGauge } from '@urology-ai/epsa-ui';
import { AlertTriangleIcon, BarChart2Icon, FlaskConicalIcon } from 'lucide-react';
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

/* ─── Compact "⚠ Clinical Notice: <short text> — Learn More" line, expandable ───
   NOTE: this is a local, screen-specific pattern for now — if Part1/Part3 grow a
   similar need, promote it to shared/ResultsShared.jsx. */
const ClinicalNoticeLine = ({ label, short, detail }) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="p2r-notice-line">
        <span>
          <AlertTriangleIcon size={12} style={{ color: 'var(--warning-600)', verticalAlign: '-2px', marginRight: '4px' }} aria-hidden="true" />
          <strong style={{ color: 'var(--warning-700, var(--warning-600))' }}>{label}: </strong>
          {short}
        </span>
        <button
          type="button"
          className="p2r-notice-learn-more"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
        >
          {open ? 'Hide' : 'Learn More'}
        </button>
      </div>
      {open && <div className="p2r-notice-detail">{detail}</div>}
    </div>
  );
};

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
    <CollapsibleSection
      title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><FlaskConicalIcon size={16} aria-hidden="true" />Biomarker Context ({items.length})</span>}
      defaultOpen={false}
      className="p2r-biomarker-collapsible"
      minMode="clinical"
    >
      <div role="region" aria-label="Biomarker context">
        <p className="p2r-biomarker-intro">
          Additional test results you reported, shown alongside your ePSA score for clinical context.
        </p>
        <div className="p2r-biomarker-list">
          {items.map((item, idx) => (
            <div key={idx} className="p2r-biomarker-item">
              <div className="p2r-biomarker-item-row">
                <strong>{item.name}</strong>
                <span className="p2r-biomarker-item-value">{item.value}</span>
              </div>
              <p className="p2r-biomarker-item-note">{item.note}</p>
            </div>
          ))}
        </div>
        <p className="p2r-biomarker-footnote">
          These results are displayed for clinical context. The ePSA multimodal model incorporating all biomarker inputs is in active development.
        </p>
      </div>
    </CollapsibleSection>
  );
};

/* ─── Terse one-liner + optional "Learn more" expand, replacing the two
   full paragraphs that used to sit inline on this screen. ─── */
const PsaSpecificityCallout = () => {
  const [open, setOpen] = useState(false);
  return (
    <div role="note" className="p2r-callout">
      <div className="p2r-callout-header">
        <span className="p2r-callout-label">Clinical Insight</span>
        <p className="p2r-callout-text">PSA alone has limited specificity — an MRI adds much more clarity.</p>
        <button
          type="button"
          className="p2r-notice-learn-more"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
        >
          {open ? 'Hide' : 'Learn more'}
        </button>
      </div>
      {open && (
        <div className="p2r-callout-detail">
          <p>Adding an MRI PI-RADS score lets ePSA run the validated biopsy-prediction model, which combines PSA density and PI-RADS for a much more informative estimate.</p>
          <p>Up to 25–40% of elevated PSA values normalise on repeat testing. If this PSA hasn't been confirmed, discuss a repeat test with your clinician before further workup (AUA/SUO 2026, Statement 3).</p>
        </div>
      )}
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
    part2Tier = null,
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

  /* ─── Recommended next step (derived from tier — mirrors the "Consult a urologist"
       style callout in the redesign brief) ─── */
  const recommendedNextStep = isVeryHighRisk || epsaTierKey === 'high'
    ? 'Consult a urologist'
    : epsaTierKey === 'intermediate-high'
    ? 'Discuss an MRI with your physician'
    : epsaTierKey === 'intermediate-low'
    ? 'Follow up with your physician'
    : 'Continue routine screening';

  /* ─── "What happens next?" — short, tailored list derived from this patient's
       actual tier/guardrails, not a fixed four-item checklist. ─── */
  const nextStepItems = [];
  if (priorPsa != null && rescreeningIntervalMessage) {
    nextStepItems.push('Repeat PSA per your re-screening interval');
  } else if (epsaTierKey === 'intermediate-low' || epsaTierKey === 'low') {
    nextStepItems.push('Repeat PSA at your next routine screening');
  }
  if (isVeryHighRisk || epsaTierKey === 'high' || epsaTierKey === 'intermediate-high') {
    nextStepItems.push('Discuss an MRI with your physician');
  }
  if (isVeryHighRisk || epsaTierKey === 'high') {
    nextStepItems.push('Referral to a urologist');
  }
  nextStepItems.push('Talk through your options with your clinician — see below');
  if (nextStepItems.length === 0) nextStepItems.push('Continue routine screening');

  /* ─── "Why?" reasons behind the overall risk — short, patient-facing bullets,
       each tagged with an impact tier for the graphical WhyImpactBars display ─── */
  const whyReasons = [];
  if (psaForThreshold >= auaAgeThreshold) whyReasons.push({ label: 'PSA above age-adjusted threshold', impact: 'high' });
  if (preResult?.familyHistory === 1 || preResult?.familyHistory === '1' || preResult?.familyHistory === true) {
    whyReasons.push({ label: 'Family history', impact: 'medium' });
  }
  if (postData?.polygenicrisk && postData.polygenicrisk !== 'not_tested' &&
      (postData.polygenicrisk === 'above_average' || postData.polygenicrisk === 'high')) {
    whyReasons.push({ label: 'Genetics (elevated polygenic risk score)', impact: 'medium' });
  }
  if (discordanceFlag) whyReasons.push({ label: 'Risk discordance between pre-PSA and PSA stages', impact: 'high' });
  if (lowPsaWarning) whyReasons.push({ label: 'Low-PSA risk pattern', impact: 'low' });
  if (whyReasons.length === 0) whyReasons.push({ label: psaTierCtx.detail, impact: 'low' });

  return (
    <>
      <AssessmentSidebar currentStepKey="psa" riskLabel={cleanRiskCat} riskColor={riskColor} onPrint={() => window.print()} />
      <div className="part2-form-container results-container--with-sidebar">
      <div className="risk-summary-card res-reveal" role="region" aria-label="PSA and biomarker risk assessment result">
        <div className="v2-res-eyebrow">
          <span>PSA Results</span>
          <span>Assessed today</span>
        </div>

        {/* ── PSA value first: the product owner wants the number, not the tier
             badge, to be the first/largest thing patients see on this screen. ── */}
        <div className="p2r-psa-hero">
          <div className="p2r-psa-hero-value" style={{ color: psaTierCtx.color }}>
            {psaAdjustedFlag ? psaAdjusted : psaValue}
            <span className="p2r-psa-hero-unit"> ng/mL</span>
          </div>
          <div className="p2r-psa-hero-context" style={{ color: psaTierCtx.color }}>{psaTierCtx.label}</div>
        </div>

        {/* Gauge is the single visual representation of the risk tier for this step —
            the tier name itself is shown once, in the "Overall Assessment" row below. */}
        <div className="v2-gauge-layout">
          <RiskGauge score={p2GaugeScore} tierKey={p2GaugeTierKey} tierLabel={cleanRiskCat} tiers={p2GaugeTiers} showCaption={false} />
        </div>

        {preResult?.epsaTierLabel && (
          <div className="tier-journey" aria-label="Risk tier change from Pre-PSA to PSA stage">
            <div className="tier-journey-step">
              <span className="tier-journey-label">Pre-PSA Baseline</span>
              <span className="tier-journey-tier">{preResult.epsaTierLabel}</span>
            </div>
            <span className="tier-journey-arrow" aria-hidden="true">→</span>
            <div className="tier-journey-step tier-journey-step--to">
              <span className="tier-journey-label">PSA Results</span>
              <span className="tier-journey-tier" style={{ color: riskColor }}>{cleanRiskCat}</span>
            </div>
          </div>
        )}

        <GuidelineRecommendationCard
          tier={part2Tier}
          detail={part2Tier && (
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '8px', fontSize: '0.8125rem', color: 'var(--ink-700)' }}>
              <span><strong>Age-adjusted threshold:</strong> {part2Tier.ageAdjustedThreshold} ng/mL</span>
              {part2Tier.confounders?.any && <span><strong>Confounder present:</strong> Yes</span>}
              {part2Tier.confounders?.informationalOnly && <span><strong>Informational confounder noted:</strong> cycling/DRE</span>}
              <span><strong>Strong risk factor:</strong> {part2Tier.strongRiskFactor?.any ? 'Yes' : 'No'}</span>
            </div>
          )}
        />

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
              <div className="p2r-aua-box">
                <div className="p2r-aua-box-title">AUA/SUO 2026 Age-Adjusted Threshold</div>
                <div className="p2r-aua-box-body">
                  Age {auaAgeLabel}: <strong>{auaAgeThreshold} ng/mL</strong>
                  {' · '}
                  {psaForThreshold >= auaAgeThreshold
                    ? <span className="p2r-aua-flag p2r-aua-flag--warn">Your PSA exceeds this threshold</span>
                    : <span className="p2r-aua-flag p2r-aua-flag--ok">Your PSA is below this threshold</span>}
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

        {/* ── Overall Assessment: risk tier framed as context beneath the PSA value,
             with a short "Because" list pulled from the same data as the Why? section. ── */}
        <div className="p2r-primary-row">
          <span className="p2r-primary-row-label">Overall Assessment</span>
          <span className="p2r-primary-row-value" style={{ color: riskColor }}>{cleanRiskCat}</span>
        </div>
        <div className="p2r-because">
          <span className="p2r-because-label">Because:</span>
          <ul className="p2r-because-list">
            {whyReasons.map((reason, idx) => (
              <li key={idx}>{reason.label}</li>
            ))}
          </ul>
        </div>

        {/* ── What happens next? — 2-4 items tailored to this patient's tier/guardrails. ── */}
        <div className="p2r-next-steps">
          <span className="p2r-primary-row-label">What happens next?</span>
          <ul className="p2r-next-steps-list">
            {nextStepItems.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Shared Decision-Making (central theme — sits right below the assessment) ── */}
      <SdmCard stageNote="Review your PSA result together with your clinician." sdmGuide={result?.sdmGuide} result={result} preResult={preResult} />
      <NarrationPlayer result={result} preResult={preResult} />

      {/* ── Why? — the single expandable reasoning section behind the headline result ── */}
      <CollapsibleSection
        title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><BarChart2Icon size={16} aria-hidden="true" />Why?</span>}
        defaultOpen={false}
      >
        <WhyImpactBars items={whyReasons} />
      </CollapsibleSection>

      {/* ── Model confidence (clinician framing) — sits right after the Why? reasoning ── */}
      <ClinicalOnly><ModelConfidenceBadge /></ClinicalOnly>

      {/* ── Critical guardrail alerts (e.g. PSA > 100) — always shown, never collapsed ── */}
      {guardrailAlerts?.length > 0 && guardrailAlerts
        .filter(a => a.level === 'critical')
        .map(alert => <GuardrailBanner key={alert.code} alert={alert} />)
      }

      {/* ── Clinical Notices: compact "⚠ Clinical Notice: <short text> — Learn More" lines,
           each independently expandable, instead of a bullet list of full sentences. ── */}
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
          // Clinician-facing caveats (PSA confounders, discordance, re-screening
          // intervals). Patients get the plain result + SDM guide instead.
          <ClinicalOnly>
          <div className="p2r-notices" role="note" aria-label="Clinical notices">
            <div className="p2r-notices-title">
              <AlertTriangleIcon size={13} className="p2r-notices-icon" />
              <span>Clinical Notices</span>
            </div>
            {isOtherHormonal && (
              <ClinicalNoticeLine
                label="Hormonal Therapy"
                short="No validated PSA correction for this therapy"
                detail="No validated PSA correction exists for this therapy. PSA used as reported — inform your physician."
              />
            )}
            {lowPsaWarning && (
              <ClinicalNoticeLine label="Low PSA Risk" short={lowPsaWarningText} detail={lowPsaWarningText} />
            )}
            {discordanceFlag && (
              <ClinicalNoticeLine
                label="Risk Discordance"
                short="Pre-PSA and PSA stage results diverge"
                detail={discordanceFlag.text}
              />
            )}
            {priorPsa != null && rescreeningIntervalMessage && (
              <ClinicalNoticeLine
                label="Re-Screening Interval"
                short={`Prior PSA ${priorPsa} ng/mL`}
                detail={rescreeningIntervalMessage}
              />
            )}
            {showAge70Note && (
              <ClinicalNoticeLine
                label="Age 70+ — SDM Required"
                short="Discuss life expectancy with your physician first"
                detail="Per AUA/SUO 2026, PSA screening decisions at age 70+ require a physician-led conversation about life expectancy before acting on this result."
              />
            )}
            {nonCriticalGuardrails.map(alert => (
              <ClinicalNoticeLine key={alert.code} label={alert.title} short={alert.message} detail={alert.message} />
            ))}
          </div>
          </ClinicalOnly>
        );
      })()}

      <BiomarkerContextSection formData={postData} />

      {/* ── Next-step guidance: one terse callout with an optional "Learn more" expand,
           instead of two full paragraphs inline. ── */}
      <PsaSpecificityCallout />

      <DisclaimerTeaser>
        <p className="p2r-disclaimer-text">
          ePSA is an educational tool, not a medical diagnosis. Results are based on population-level data aligned with AUA/SUO 2026 guideline thresholds. A higher tier means earlier follow-up is recommended — it does not mean you have cancer. Always confirm an elevated PSA with a repeat test before any biopsy, and speak with a physician before making any health decisions.
        </p>
        <p className="p2r-disclaimer-attribution">— Ashutosh K. Tewari, MD, Icahn School of Medicine at Mount Sinai</p>
      </DisclaimerTeaser>

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
    </>
  );
};

export default Part2Results;
