import React, { useState } from 'react';
import './Part1Results.css';
import './PathwaySelector.css';
import { RISK_COLORS } from '../utils/riskColors';
import PrintableForm from './PrintableForm';
import { downloadCsv, buildPart1CsvRows } from '../utils/exportCsv';
import {
  ArrowLeftIcon, RefreshCwIcon, PrinterIcon, FileTextIcon, DownloadIcon,
  CloudIcon, ChevronDownIcon, ChevronUpIcon, InfoIcon, CheckCircle2Icon,
  AlertTriangleIcon, AlertCircleIcon, ExternalLinkIcon, MapPinIcon,
} from 'lucide-react';

/* ─── SVG Risk Gauge ─── */
const RiskGauge = ({ score, epsaTierKey, epsaTierLabel }) => {
  const cx = 140, cy = 130, r = 100, strokeW = 22;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const arcPath = (startDeg, endDeg) => {
    const x1 = cx + r * Math.cos(toRad(startDeg));
    const y1 = cy - r * Math.sin(toRad(startDeg));
    const x2 = cx + r * Math.cos(toRad(endDeg));
    const y2 = cy - r * Math.sin(toRad(endDeg));
    const large = Math.abs(startDeg - endDeg) > 180 ? 1 : 0;
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 0 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };
  const clampedScore = Math.min(100, Math.max(0, score || 0));
  const needleAngle = 180 - (clampedScore / 100) * 180;
  const needleLen = r - strokeW - 2;
  const needleTipX = cx + needleLen * Math.cos(toRad(needleAngle));
  const needleTipY = cy - needleLen * Math.sin(toRad(needleAngle));
  const colors = { lower: '#16a34a', moderate: '#2563eb', higher: '#d97706', track: '#e2eaf2' };
  const activeColor = epsaTierKey === 'low' ? colors.lower : epsaTierKey === 'elevated' ? colors.higher : colors.moderate;
  const caption = epsaTierLabel || 'Risk';
  return (
    <figure className="risk-gauge-figure" aria-label={`Risk gauge: ${caption}, score ${clampedScore}%`}>
      <svg viewBox="0 0 280 145" xmlns="http://www.w3.org/2000/svg" className="risk-gauge-svg" aria-hidden="true">
        <path d={arcPath(182, -2)} fill="none" stroke={colors.track} strokeWidth={strokeW + 6} strokeLinecap="butt" />
        <path d={arcPath(180, 122)} fill="none" stroke={colors.lower} strokeWidth={strokeW} strokeLinecap="butt" opacity={epsaTierKey === 'low' ? '1' : '0.3'} />
        <path d={arcPath(118, 62)} fill="none" stroke={colors.moderate} strokeWidth={strokeW} strokeLinecap="butt" opacity={epsaTierKey === 'intermediate' ? '1' : '0.3'} />
        <path d={arcPath(58, 0)} fill="none" stroke={colors.higher} strokeWidth={strokeW} strokeLinecap="butt" opacity={epsaTierKey === 'elevated' ? '1' : '0.3'} />
        <line x1={cx} y1={cy + 2} x2={needleTipX} y2={needleTipY + 2} stroke="rgba(0,0,0,0.10)" strokeWidth="4" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={needleTipX} y2={needleTipY} stroke="#1e3a5f" strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="8" fill="#1e3a5f" />
        <circle cx={cx} cy={cy} r="4.5" fill="#fff" />
      </svg>
      <div className="risk-gauge-labels">
        <span className={`risk-gauge-range-pill ${epsaTierKey === 'low' ? 'risk-gauge-range-pill--active' : ''}`} style={{ color: colors.lower }}>Low (0-10)</span>
        <span className={`risk-gauge-range-pill ${epsaTierKey === 'intermediate' ? 'risk-gauge-range-pill--active' : ''}`} style={{ color: colors.moderate }}>Intermediate (11-17)</span>
        <span className={`risk-gauge-range-pill ${epsaTierKey === 'elevated' ? 'risk-gauge-range-pill--active' : ''}`} style={{ color: colors.higher }}>Elevated (&gt;=18)</span>
      </div>
      <figcaption className="risk-gauge-caption" style={{ color: activeColor }}>{caption}</figcaption>
    </figure>
  );
};

/* ─── Collapsible Section ─── */
const CollapsibleSection = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="collapsible-section">
      <button className="collapsible-toggle" onClick={() => setOpen(!open)} aria-expanded={open} type="button">
        <span>{title}</span>
        {open ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  );
};

/* ─── Risk Icon ─── */
const RiskIcon = ({ risk, epsaTierKey }) => {
  const key = epsaTierKey || risk;
  if (key === 'low' || key === 'LOWER') return <CheckCircle2Icon size={22} className="risk-icon risk-icon--lower" />;
  if (key === 'intermediate' || key === 'MODERATE') return <AlertTriangleIcon size={22} className="risk-icon risk-icon--moderate" />;
  return <AlertCircleIcon size={22} className="risk-icon risk-icon--elevated" />;
};

/* ─── PSA Recommendation Banner ───────────────────────────────────────────────
 *
 * Colour logic keyed to psaRecommendReason from the engine:
 *
 *   high_risk_early_screening → RED   — high-risk group, urgent
 *   family_history_override   → RED   — family history, urgent
 *   score_threshold           → AMBER — score exceeded threshold
 *   age_guideline_55_69       → BLUE  — AUA average-risk window, informational
 *   not_recommended           → GREEN — below threshold, routine
 * ─────────────────────────────────────────────────────────────────────────── */
const PSA_BANNER_CONFIG = {
  high_risk_early_screening: {
    bg: '#fef2f2', border: '#dc2626', iconColor: '#dc2626',
    label: 'PSA SCREENING RECOMMENDED — HIGH-RISK PROFILE', labelColor: '#991b1b',
    Icon: AlertCircleIcon,
    source: 'Source: AUA/SUO Guideline Rec. 5 — Black men and BRCA carriers should discuss PSA from age 40.',
  },
  family_history_override: {
    bg: '#fef2f2', border: '#dc2626', iconColor: '#dc2626',
    label: 'PSA SCREENING RECOMMENDED — FAMILY HISTORY', labelColor: '#991b1b',
    Icon: AlertCircleIcon,
    source: 'Source: AUA/SUO Guideline Rec. 5 — men with first-degree family history should discuss PSA from age 40.',
  },
  score_threshold: {
    bg: '#fffbeb', border: '#d97706', iconColor: '#d97706',
    label: 'PSA SCREENING RECOMMENDED', labelColor: '#92400e',
    Icon: AlertTriangleIcon,
    source: 'Based on your ePSA score exceeding the screening threshold.',
  },
  age_guideline_55_69: {
    bg: '#eff6ff', border: '#2563eb', iconColor: '#2563eb',
    label: 'PSA DISCUSSION RECOMMENDED', labelColor: '#1e40af',
    Icon: InfoIcon,
    source: 'Source: AUA/SUO Early Detection Guideline 2023/2026, Rec. 4 — all men 55–69 should discuss PSA screening with their physician.',
  },
  not_recommended: {
    bg: '#f0fdf4', border: '#16a34a', iconColor: '#16a34a',
    label: 'PSA NOT CURRENTLY RECOMMENDED', labelColor: '#166534',
    Icon: CheckCircle2Icon,
    source: 'Threshold-based assessment from Part 1. Routine age-based screening guidance applies.',
  },
};

const PsaRecommendationBanner = ({ recommendPSA, psaRecommendReason, psaRecommendMessage }) => {
  let configKey = 'not_recommended';
  if (recommendPSA === true) {
    configKey = (psaRecommendReason && PSA_BANNER_CONFIG[psaRecommendReason])
      ? psaRecommendReason
      : 'score_threshold';
  }
  const cfg = PSA_BANNER_CONFIG[configKey];
  const { Icon } = cfg;
  const message = psaRecommendMessage || (
    recommendPSA === true
      ? 'A PSA test is recommended. Please speak with your physician.'
      : 'Your ePSA score is below the recommendation threshold. Follow standard age-based screening guidance.'
  );
  return (
    <div
      className="psa-recommendation-banner"
      style={{ background: cfg.bg, borderLeft: `4px solid ${cfg.border}`, borderRadius: '8px', padding: '14px 16px', margin: '12px 0', display: 'flex', flexDirection: 'column', gap: '6px' }}
      role="alert"
      aria-live="polite"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Icon size={18} style={{ color: cfg.iconColor, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: '13px', color: cfg.labelColor, letterSpacing: '0.03em' }}>
          {cfg.label}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: '14px', color: '#374151', lineHeight: 1.5 }}>{message}</p>
      <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>{cfg.source}</p>
    </div>
  );
};

/* ─── Main Component ─── */
const Part1Results = ({
  result, onEditAnswers, onStartOver, formData, storageMode,
  hideBackButton = false, sessionId = null, userEmail = null, userPhone = null,
  onSaveToCloud = null, cloudAvailable = false, saveToCloudPending = false, saveToCloudError = null,
  onContinueToPostPSA = null, onContinueToMRI = null, onContinueToPostBiopsy = null,
}) => {
  const [showPrintableForm, setShowPrintableForm] = useState(false);

  const handleExportCsv = () => {
    const rows = buildPart1CsvRows(formData, result, {});
    const filename = `ePSA_Part1_Results_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(filename, rows);
  };

  if (showPrintableForm) return <PrintableForm formData={formData} onBack={() => setShowPrintableForm(false)} />;
  if (!result) return <div className="results-container"><p className="results-empty">No results available.</p></div>;

  const {
    score, scoreRange, risk, color, action, ipssTotal, shimTotal, bmi, age,
    recommendPSA, psaRecommendReason, psaRecommendMessage,
    tierRisk, epsaTierKey, epsaTierLabel, epsaTierScoreRange, epsaTierNormalizedRange,
    recommendationThresholdLabel, epsaGuidelineText, itemImpacts = [], isHighRiskFlagged = false,
    pathwayMode = 'pre_psa', empiricalProbabilityText = null,
  } = result;

  const rawImpactTotal = Number(result?.calculationDetails?.rawScore);
  const impactMaxScore = Number(result?.calculationDetails?.maxScore);
  const impactTotal = itemImpacts.reduce((sum, i) => sum + (Number(i?.points) || 0), 0);
  const impactTotalDisplay = Number.isFinite(rawImpactTotal) ? rawImpactTotal : impactTotal;
  const impactPercent = Number.isFinite(impactMaxScore) && impactMaxScore > 0
    ? Math.round((impactTotalDisplay / impactMaxScore) * 100) : null;
  const rawScore = Number(result?.calculationDetails?.rawScore);
  const maxScore = Number(result?.calculationDetails?.maxScore);

  const mapRawScoreToGaugePercent = (raw, max) => {
    if (!Number.isFinite(raw) || !Number.isFinite(max) || max <= 0) return score;
    const c = Math.max(0, Math.min(max, raw));
    if (c <= 10) return Math.round((c / 10) * 33);
    if (c <= 17) return Math.round(34 + ((c - 11) / 6) * 32);
    return Math.round(67 + ((c - 18) / Math.max(1, max - 18)) * 33);
  };

  const gaugeScore = mapRawScoreToGaugePercent(rawScore, maxScore);
  const confidenceLow = Number(result?.confidenceLow);
  const confidenceHigh = Number(result?.confidenceHigh);
  const thresholdPctMatch = String(recommendationThresholdLabel || '').match(/(\d+(\.\d+)?)/);
  const recommendationThresholdPct = thresholdPctMatch ? Number(thresholdPctMatch[1]) : 9;
  const activeTier = tierRisk || risk;
  const selectedTierKey = epsaTierKey || (activeTier === 'LOWER' ? 'low' : activeTier === 'HIGHER' ? 'elevated' : 'intermediate');

  const thresholdTiers = [
    { key: 'low', label: 'Low', range: 'score 0-10', colorClass: 'threshold-chip--low' },
    { key: 'intermediate', label: 'Intermediate', range: 'score 11-17', colorClass: 'threshold-chip--intermediate' },
    { key: 'elevated', label: 'Elevated', range: 'score >= 18', colorClass: 'threshold-chip--elevated' },
  ];

  const tierWhyText = Number.isFinite(rawImpactTotal)
    ? `Selected because your raw point total is ${rawImpactTotal}, which falls in ${epsaTierScoreRange || 'the selected tier range'}.`
    : `Selected because your total points fall in ${epsaTierScoreRange || 'the selected tier range'}.`;

  let recommendationWhyText = `PSA recommendation trigger is ${recommendationThresholdLabel || '>= 9%'} (different from raw-score tier boundaries).`;
  let recommendationWhyClass = 'threshold-status threshold-status--neutral';
  if (Number.isFinite(confidenceLow) && Number.isFinite(confidenceHigh)) {
    if (confidenceLow >= recommendationThresholdPct) {
      recommendationWhyText = `Selected as above threshold: your displayed range (${confidenceLow}%-${confidenceHigh}%) is fully at or above ${recommendationThresholdPct}%.`;
      recommendationWhyClass = 'threshold-status threshold-status--met';
    } else if (confidenceHigh < recommendationThresholdPct) {
      recommendationWhyText = `Selected as below threshold: your displayed range (${confidenceLow}%-${confidenceHigh}%) is fully below ${recommendationThresholdPct}%.`;
      recommendationWhyClass = 'threshold-status threshold-status--below';
    } else {
      recommendationWhyText = `Selected as borderline: your displayed range (${confidenceLow}%-${confidenceHigh}%) crosses the ${recommendationThresholdPct}% threshold.`;
    }
  }
  if (recommendationWhyClass.includes('threshold-status--met')) {
    if (selectedTierKey === 'elevated') recommendationWhyClass = 'threshold-status threshold-status--met-elevated';
    else if (selectedTierKey === 'intermediate') recommendationWhyClass = 'threshold-status threshold-status--met-intermediate';
    else recommendationWhyClass = 'threshold-status threshold-status--met-low';
  }

  const displayRange = result.displayRange || result.confidenceRange;
  const riskBgClass = epsaTierKey === 'low' ? 'risk-card--lower' : epsaTierKey === 'intermediate' ? 'risk-card--moderate' : epsaTierKey === 'elevated' ? 'risk-card--elevated' : activeTier === 'LOWER' ? 'risk-card--lower' : activeTier === 'HIGHER' ? 'risk-card--elevated' : 'risk-card--moderate';
  const tierAccentColor = epsaTierKey === 'low' ? '#16a34a' : epsaTierKey === 'intermediate' ? '#2563eb' : epsaTierKey === 'elevated' ? '#d97706' : activeTier === 'LOWER' ? '#16a34a' : activeTier === 'HIGHER' ? '#d97706' : '#2563eb';

  const getSoftenedActionText = (key, tier, fallback) => {
    if (typeof fallback === 'string' && fallback.trim().length > 0) return fallback;
    const k = key || tier;
    if (k === 'low' || k === 'LOWER') return 'Consider using this result to support a routine conversation with your healthcare provider, especially if you have questions about screening, family history, or symptoms.';
    if (k === 'intermediate' || k === 'MODERATE') return 'Consider discussing this result with your healthcare provider. Together you can decide whether PSA screening makes sense based on your age, preferences, and prior results.';
    return 'Consider prioritizing a discussion with your healthcare provider. They can help interpret this estimate and decide whether additional evaluation — such as PSA testing or follow-up — is appropriate.';
  };

  const getTierDescription = (key, tier) => {
    const k = key || tier;
    if (k === 'low' || k === 'LOWER') return "Low Risk suggests a lower estimated likelihood relative to others in the model's reference data. Lower does not mean no risk, and it does not replace clinician guidance.";
    if (k === 'intermediate' || k === 'MODERATE') return "Intermediate Risk suggests an estimated likelihood in the middle range of the model's reference data. Reviewing personal risk factors and prior PSA history with a clinician may add important context.";
    return "Elevated Risk suggests a higher estimated likelihood relative to others in the model's reference data. Elevated does not mean cancer is present — it may be a useful prompt to review screening options with a clinician.";
  };

  const tierScaleItems = [
    { key: 'low', tierRiskFallback: 'LOWER', label: 'Low', sub: 'score <= 10 (<= 12.5%)', color: '#16a34a', bg: '#f0fdf4' },
    { key: 'intermediate', tierRiskFallback: 'MODERATE', label: 'Intermediate', sub: 'score 11-17 (13.75%-21.25%)', color: '#2563eb', bg: '#eff6ff' },
    { key: 'elevated', tierRiskFallback: 'HIGHER', label: 'Elevated', sub: 'score >= 18 (>= 22.5%)', color: '#d97706', bg: '#fffbeb' },
  ];

  const metrics = [
    { label: 'Age', value: age, unit: 'yrs' },
    { label: 'BMI', value: bmi, unit: '' },
    { label: 'IPSS Score', value: `${ipssTotal}/35`, unit: '', note: Number(ipssTotal) >= 20 ? 'Severe range in v2 contributes 0 points' : null },
    { label: 'SHIM Score', value: `${shimTotal}/25`, unit: '' },
  ];

  return (
    <div className="results-container" role="main">

      {/* ── Top bar ── */}
      <div className="results-top-links-row">
        <div className="results-mobile-unit-wrap">
          <a className="results-mobile-unit-pill" href="https://events.mountsinaihealth.org/search/events?event_types%5B%5D=37714143563487" target="_blank" rel="noopener noreferrer" aria-label="Find Mobile Unit location">
            <MapPinIcon size={16} /><span>Mobile Unit</span>
          </a>
          <p className="results-mobile-unit-note">Important: Learn more about screening and upcoming community events.</p>
        </div>
      </div>

      {/* ── Session / Cloud row ── */}
      {(sessionId || (storageMode === 'local' && cloudAvailable && onSaveToCloud)) && (
        <div className="results-cloud-row">
          {sessionId && <div className="session-pill"><span className="session-pill-label">Session</span><code className="session-pill-code">{sessionId}</code></div>}
          {storageMode === 'cloud' && sessionId && <div className="cloud-saved-badge"><CloudIcon size={13} /><span>Saved to Cloud</span></div>}
          {storageMode === 'local' && cloudAvailable && onSaveToCloud && (
            <div className="cloud-move-row">
              <button type="button" className="btn-move-cloud" onClick={onSaveToCloud} disabled={saveToCloudPending}>
                <CloudIcon size={16} />{saveToCloudPending ? 'Saving…' : 'Save to Cloud'}
              </button>
              {saveToCloudError && <span className="cloud-error-msg">{saveToCloudError}</span>}
            </div>
          )}
        </div>
      )}

      {/* ── Risk Summary Card ── */}
      <div className={`risk-summary-card ${riskBgClass}`} role="region" aria-label="Risk assessment result">
        <div className="risk-summary-header">
          <div className="risk-summary-label">Your ePSA Risk Assessment</div>
          <div className="risk-summary-tier-row">
            <RiskIcon risk={activeTier} epsaTierKey={epsaTierKey} />
            <span className="risk-tier-text" style={{ color: tierAccentColor }}>{epsaTierLabel || activeTier}</span>
          </div>
        </div>
        <RiskGauge score={gaugeScore} epsaTierKey={epsaTierKey} epsaTierLabel={epsaTierLabel} />
      </div>

      {/* ── Empirical probability text ── */}
      {empiricalProbabilityText && (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '7px', padding: '10px 14px', margin: '10px 0', fontSize: '13px', color: '#4b5563', fontStyle: 'italic', lineHeight: 1.5 }} role="note">
          <InfoIcon size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px', color: '#6b7280' }} />
          {empiricalProbabilityText}
        </div>
      )}

      {/* ── PSA Recommendation Banner ──────────────────────────────────────────
       * RED   = high_risk_early_screening | family_history_override
       * AMBER = score_threshold
       * BLUE  = age_guideline_55_69  (calm/informational)
       * GREEN = not recommended
       * ─────────────────────────────────────────────────────────────────────── */}
      <PsaRecommendationBanner
        recommendPSA={recommendPSA}
        psaRecommendReason={psaRecommendReason}
        psaRecommendMessage={psaRecommendMessage}
      />

      {/* ── High-risk anchor flag ── */}
      {isHighRiskFlagged && (
        <div className="high-risk-flag-card" role="note" aria-label="High-risk factors present">
          <div className="high-risk-flag-title">Priority: High-Risk Factors Present</div>
          <p className="high-risk-flag-text">
            This result has been flagged because your score is elevated AND you have at least one factor independently recognised as high-risk by AUA/SUO (2023), NCCN (2024), and EAU (2024) guidelines: age ≥70, Black ancestry, first-degree family history, confirmed BRCA mutation, or two or more comorbid conditions.
          </p>
          <p className="high-risk-flag-disclosure">The High-Risk flag is clinically motivated and guideline-anchored.</p>
        </div>
      )}

      {/* ── Guideline text ── */}
      {epsaGuidelineText && (
        <div className="guideline-banner" role="note">
          <InfoIcon size={15} className="guideline-banner-icon" />
          <p>{epsaGuidelineText}</p>
        </div>
      )}

      {/* ── Clinician Discussion Guidance ── */}
      <div className="recommendation-card" style={{ borderLeftColor: tierAccentColor }}>
        <div className="rec-card-label" style={{ color: tierAccentColor }}>Clinician Discussion Guidance</div>
        <p className="rec-card-text">{getSoftenedActionText(epsaTierKey, activeTier, action)}</p>
        {recommendPSA != null && (
          <p className="rec-card-sub">
            {recommendPSA ? 'Threshold-based recommendation from Part 1 assessment' : 'Below recommendation threshold based on Part 1 assessment'}
          </p>
        )}
      </div>

      {/* ── Clinical metrics ── */}
      <div className="metrics-grid" role="list" aria-label="Clinical summary metrics">
        {metrics.map((m) => (
          <div className="metric-card" key={m.label} role="listitem">
            <div className="metric-value">{m.value}{m.unit && <span className="metric-unit">{m.unit}</span>}</div>
            <div className="metric-label">{m.label}</div>
            {m.note && <div className="metric-note">{m.note}</div>}
          </div>
        ))}
      </div>

      {/* ── Risk tier scale ── */}
      <div className="tier-scale" role="group" aria-label="Risk tier scale">
        {tierScaleItems.map(({ key, tierRiskFallback, label, sub, color: c, bg }) => {
          const isActive = epsaTierKey ? epsaTierKey === key : activeTier === tierRiskFallback;
          return (
            <div key={key} className={`tier-scale-item ${isActive ? 'tier-scale-item--active' : ''}`}
              style={isActive ? { background: bg, borderColor: c, color: c } : {}} aria-current={isActive ? 'true' : undefined}>
              <div className="tier-scale-label">{label}</div>
              <div className="tier-scale-sub">{sub}</div>
            </div>
          );
        })}
      </div>

      {/* ── Expandable sections ── */}
      <div className="detail-sections">
        <CollapsibleSection title="About Your Result" defaultOpen>
          <p>Your result is an educational estimate based on the information you entered. It summarizes how many prostate cancer risk flags you have — including age, BMI, urinary symptoms, exercise, smoking, diet, family and genetic factors, and others — but it does not determine whether you do or do not have prostate cancer. Use this as a starting point for a conversation with a clinician who can interpret your risk in context.</p>
          <p>{getTierDescription(epsaTierKey, activeTier)}</p>
        </CollapsibleSection>

        <CollapsibleSection title="How This Score Is Calculated">
          <p>The ePSA score is a point-based summary of your answers. Each risk factor (e.g. age ≥60, BMI ≥30, urinary symptoms, limited exercise, current or former smoking, high red meat diet, Black ancestry, family history, BRCA, inflammation history, Agent Orange/chemical exposure, or a low SHIM score) contributes points. The total is normalized to a 0–100% scale, and a ±5% range is displayed to avoid over-interpretation.</p>
          {displayRange && <div className="detail-data-row"><span>Displayed Range</span><strong>{displayRange}</strong></div>}
          {epsaTierScoreRange && <div className="detail-data-row"><span>Tier Score Range</span><strong>{epsaTierScoreRange}{epsaTierNormalizedRange ? ` (${epsaTierNormalizedRange})` : ''}</strong></div>}
          <div className="detail-data-row"><span>Risk Tier</span><strong>{epsaTierLabel || activeTier}</strong></div>
          <div className="threshold-chip-grid" role="group" aria-label="Risk tier thresholds">
            {thresholdTiers.map((tier) => (
              <div key={tier.key} className={`threshold-chip ${tier.colorClass} ${selectedTierKey === tier.key ? 'threshold-chip--selected' : ''}`} aria-current={selectedTierKey === tier.key ? 'true' : undefined}>
                <span className="threshold-chip-title">{tier.label}</span>
                <span className="threshold-chip-range">Range: {tier.range}</span>
              </div>
            ))}
          </div>
          <p className="threshold-why-text">{tierWhyText}</p>
          <div className={recommendationWhyClass}>{recommendationWhyText}</div>
        </CollapsibleSection>

        {itemImpacts.length > 0 && (
          <CollapsibleSection title="Item Impact Breakdown">
            <p>Each item below shows the exact point contribution from the scoring engine used to generate your result.</p>
            <div className="impact-table-wrap">
              <table className="impact-table" aria-label="Item impact breakdown table">
                <thead><tr><th>Item</th><th>Input</th><th>Impact</th><th>Points</th></tr></thead>
                <tbody>
                  {itemImpacts.map((impact) => (
                    <tr key={impact.item}>
                      <td>{impact.item}</td>
                      <td>{impact.value}</td>
                      <td>
                        <div className="impact-bar-track" aria-hidden="true">
                          <div className={`impact-bar-fill ${impact.points > 0 ? 'impact-bar-fill--active' : 'impact-bar-fill--zero'}`} style={{ width: `${Math.min(100, ((Number(impact.points) || 0) / 20) * 100)}%` }} />
                        </div>
                      </td>
                      <td><span className={`impact-points-badge ${impact.points > 0 ? 'impact-points-badge--active' : 'impact-points-badge--zero'}`}>{impact.points > 0 ? `+${impact.points}` : '0'}</span></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}>Total score contribution</td>
                    <td><span className="impact-total-badge">{impactTotalDisplay}{Number.isFinite(impactMaxScore) ? ` / ${impactMaxScore}` : ''}{impactPercent != null ? ` (${impactPercent}%)` : ''}</span></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CollapsibleSection>
        )}

        <CollapsibleSection title="Screening Guidelines (AUA/SUO 2026)">
          <p>Screening should begin at age 40–45 for people at increased risk — specifically those with Black ancestry, germline mutations, or strong family history of prostate cancer. For average-risk individuals, a baseline PSA can be offered between ages 45–50, with regular screening every 2–4 years for those aged 50–69. Age-based PSA thresholds used clinically are approximately: 2.5 ng/mL (ages 40–49), 3.5 (50–59), 4.5 (60–69), and 6.5 (70–79).</p>
          <p className="detail-note">Current guidelines do not adjust screening thresholds for race, family history, or age under 50 as standalone triggers. The ePSA tool intentionally flags these high-risk profiles for earlier evaluation — the clinical gap this project is designed to address.</p>
        </CollapsibleSection>

        <CollapsibleSection title="Important Disclaimer">
          <p className="detail-disclaimer">ePSA is a non-validated educational risk assessment tool. Risk tiers are based on population-level data and guideline thresholds from AUA, NCCN, and EAU. In high-risk demographic profiles, ePSA may suggest earlier evaluation than standard guideline thresholds recommend. This tool does not replace physician judgment and is not intended for clinical decision-making without physician review.</p>
          <p className="detail-attribution">— Ashutosh K. Tewari, MD, Icahn School of Medicine at Mount Sinai</p>
        </CollapsibleSection>
      </div>

      {/* ── Continue pathway banner ── */}
      {pathwayMode === 'pre_psa' && recommendPSA === true && onContinueToPostPSA && (
        <div className="pathway-continue-banner pathway-continue-banner--teal" role="note">
          <p className="pathway-continue-banner-text">Have your PSA result? Add it for a fuller picture.</p>
          <button type="button" className="pathway-continue-banner-btn" onClick={onContinueToPostPSA}>
            Continue to PSA Assessment →
          </button>
        </div>
      )}
      {pathwayMode === 'post_psa' && onContinueToMRI && (
        <div className="pathway-continue-banner pathway-continue-banner--navy" role="note">
          <p className="pathway-continue-banner-text">Had an MRI? Add your PI-RADS score for biopsy guidance.</p>
          <button type="button" className="pathway-continue-banner-btn" onClick={onContinueToMRI}>
            Continue to MRI Assessment →
          </button>
        </div>
      )}
      {pathwayMode === 'pre_psa' && recommendPSA === true && onContinueToPostBiopsy && (
        <div className="pathway-continue-banner pathway-continue-banner--biopsy" role="note">
          <p className="pathway-continue-banner-text">Had a biopsy? Evaluate whether active surveillance is right for you.</p>
          <button type="button" className="pathway-continue-banner-btn" onClick={onContinueToPostBiopsy}>
            Evaluate Biopsy Results →
          </button>
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className="results-actions">
        <div className="results-actions-row results-actions-row--primary">
          <button className="btn-results btn-results--outline" onClick={onEditAnswers}><ArrowLeftIcon size={16} /><span>Edit Answers</span></button>
          <button className="btn-results btn-results--danger-outline" onClick={onStartOver}><RefreshCwIcon size={16} /><span>Start Over</span></button>
        </div>
        <div className="results-actions-row">
          <button className="btn-results btn-results--solid" onClick={() => window.print()}><PrinterIcon size={16} /><span>Print Results</span></button>
          <button className="btn-results btn-results--outline" onClick={() => setShowPrintableForm(true)}><FileTextIcon size={16} /><span>Printable Form</span></button>
          {(storageMode === 'local' || storageMode === 'cloud') && (
            <>
              <button className="btn-results btn-results--outline" onClick={() => {
                try {
                  if (!formData || Object.keys(formData).length === 0) throw new Error('No form data');
                  const exportData = { version: '1.0', exportDate: new Date().toISOString(), part: 'part1', formData, userInfo: { email: userEmail || null, phone: userPhone || null, sessionId: sessionId || null } };
                  const url = URL.createObjectURL(new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' }));
                  const a = Object.assign(document.createElement('a'), { href: url, download: `epsa-part1-data-${new Date().toISOString().split('T')[0]}.json` });
                  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                } catch { alert('Export failed. Please try again.'); }
              }}><DownloadIcon size={16} /><span>Export JSON</span></button>
              <button className="btn-results btn-results--outline" onClick={handleExportCsv}><DownloadIcon size={16} /><span>Export CSV</span></button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Part1Results;