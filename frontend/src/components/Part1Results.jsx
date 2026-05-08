import React, { useState, useRef } from 'react';
import './Part1Results.css';
import './epsa-v2-layout.css';
import './PathwaySelector.css';
import { RISK_COLORS } from '../utils/riskColors';
import { fieldReferences } from '../utils/fieldReferences';
import PrintableForm from './PrintableForm';
import ModelDocumentation from './ModelDocumentation';
import { downloadCsv, buildPart1CsvRows } from '../utils/exportCsv';
import { functions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import {
  ArrowLeftIcon, RefreshCwIcon, PrinterIcon, FileTextIcon, DownloadIcon,
  CloudIcon, ChevronDownIcon, ChevronUpIcon, InfoIcon, CheckCircle2Icon,
  AlertTriangleIcon, AlertCircleIcon, ExternalLinkIcon, MapPinIcon,
  FlaskConicalIcon, ScanEyeIcon, MicroscopeIcon, ArrowRightIcon,
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

/* ─── Inline reference popover (ⓘ) for impact table rows ─── */
const IMPACT_TO_REF = {
  'Age': 'age',
  'Black ancestry': 'race',
  'Family history': 'familyHistory',
  'Inflammation history': 'inflammationHistory',
  'Genetic mutation': 'brcaStatus',
  'BMI': 'heightWeight',
  'Exercise': 'exercise',
  'Smoking': 'smoking',
  '9/11 / Chemical exposure': 'chemicalExposure',
  'Diet pattern': 'diet',
  'IPSS total': 'ipss',
  'SHIM total': 'shim',
  'Comorbidity burden': 'comorbidities',
};

const SourcesPopover = ({ itemName }) => {
  const [open, setOpen] = useState(false);
  const refKey = IMPACT_TO_REF[itemName];
  const refData = refKey ? fieldReferences[refKey] : null;
  if (!refData?.sources?.length) return null;
  return (
    <span style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle', marginLeft: '3px' }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: '#2563eb', fontSize: '12px', lineHeight: 1 }}
        title={`References for ${itemName}`}
        aria-label={`Show references for ${itemName}`}
      >ⓘ</button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, background: 'var(--surface, #fff)', border: '1px solid #d1e3f3', borderRadius: '8px', padding: '10px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: '210px', maxWidth: '290px' }}>
            <div style={{ fontWeight: 700, fontSize: '11px', color: '#1d3a59', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{itemName}</div>
            <ul style={{ margin: 0, padding: '0 0 0 14px' }}>
              {refData.sources.map((src, i) => (
                <li key={i} style={{ fontSize: '11px', lineHeight: 1.65 }}>
                  <a href={src.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1d6ea3' }}>{src.name}</a>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </span>
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

/* ─── Papers shown inside the PSA banner when recommendation exceeds universal consensus ─── */
const BEYOND_GUIDELINE_PAPERS = {
  high_risk_early_screening: [
    'Tewari A, et al. Urol Onc. 2005 — Race as a risk factor in prostate cancer prognosis.',
    'Godtman RA, et al. Eur Urol. 2022 — Race and prostate cancer early detection outcomes.',
    'Brawley O. World J Urol. 2012 — Epidemiology of prostate cancer in Black men.',
    'Giri VN, et al. J Clin Oncol. 2018 — BRCA gene mutations and increased prostate cancer risk.',
    'Hemminki H, et al. Eur Urol Open Sci. 2024 — Hereditary factors and early-onset prostate cancer.',
  ],
  family_history_override: [
    'Loeb S, et al. Urology. 2006 — Family history of prostate cancer and PSA screening outcomes.',
    'Hemminki H, et al. Eur Urol Open Sci. 2024 — Hereditary factors and early-onset prostate cancer.',
  ],
};

/* ─── PSA Recommendation Banner ───────────────────────────────────────────────
 *
 * Colour logic keyed to psaRecommendReason from the engine:
 *
 *   high_risk_early_screening → RED   — high-risk group, urgent
 *   family_history_override   → RED   — family history, urgent
 *   score_threshold           → AMBER — score exceeded threshold
 *   age_guideline_50_69       → BLUE  — AUA average-risk window (50–69), informational
 *   baseline_psa_45_50        → BLUE  — AUA baseline PSA offered (45–50), informational
 *   not_recommended           → GREEN — below threshold, routine
 * ─────────────────────────────────────────────────────────────────────────── */
const PSA_BANNER_CONFIG = {
  high_risk_early_screening: {
    bg: '#fef2f2', border: '#dc2626', iconColor: '#dc2626',
    label: 'PSA SCREENING RECOMMENDED — HIGH-RISK PROFILE', labelColor: '#991b1b',
    Icon: AlertCircleIcon,
    source: 'AUA, NCCN, and ERUS guidelines all support earlier screening for men with Black ancestry or a hereditary genetic mutation. AUA is the most explicit about starting from age 40.',
  },
  family_history_override: {
    bg: '#fef2f2', border: '#dc2626', iconColor: '#dc2626',
    label: 'PSA SCREENING RECOMMENDED — FAMILY HISTORY', labelColor: '#991b1b',
    Icon: AlertCircleIcon,
    source: 'AUA, NCCN, and ERUS guidelines all support earlier screening for men with a first-degree family history of prostate cancer. AUA is the most explicit about starting from age 40.',
  },
  score_threshold: {
    bg: '#fffbeb', border: '#d97706', iconColor: '#d97706',
    label: 'PSA SCREENING RECOMMENDED', labelColor: '#92400e',
    Icon: AlertTriangleIcon,
    source: 'Your ePSA score is above the screening threshold. Based on AUA, NCCN, and ERUS guidelines.',
  },
  age_guideline_50_69: {
    bg: '#eff6ff', border: '#2563eb', iconColor: '#2563eb',
    label: 'PSA SCREENING RECOMMENDED', labelColor: '#1e40af',
    Icon: InfoIcon,
    source: 'AUA/SUO guideline Statement 6 (Strong Recommendation, Grade A) — regular PSA screening every 2–4 years for people aged 50–69.',
  },
  baseline_psa_45_50: {
    bg: '#eff6ff', border: '#2563eb', iconColor: '#2563eb',
    label: 'BASELINE PSA DISCUSSION RECOMMENDED', labelColor: '#1e40af',
    Icon: InfoIcon,
    source: 'AUA/SUO guideline Statement 4 (Conditional Recommendation, Grade B) — a baseline PSA test may be offered to people aged 45–50.',
  },
  not_recommended: {
    bg: '#f0fdf4', border: '#16a34a', iconColor: '#16a34a',
    label: 'PSA NOT CURRENTLY RECOMMENDED', labelColor: '#166534',
    Icon: CheckCircle2Icon,
    source: 'Your score is below the screening threshold. Follow standard age-based guidance from AUA, NCCN, and ERUS.',
  },
};

const PsaRecommendationBanner = ({ recommendPSA, psaRecommendReason, psaRecommendMessage }) => {
  const [showPapers, setShowPapers] = useState(false);
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
  const papers = BEYOND_GUIDELINE_PAPERS[configKey] || null;
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
      {papers && (
        <div style={{ marginTop: '4px' }}>
          <button
            type="button"
            onClick={() => setShowPapers(!showPapers)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '12px', color: cfg.labelColor, display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            {showPapers ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />}
            {showPapers ? 'Hide' : 'Show'} supporting research ({papers.length} studies)
          </button>
          {showPapers && (
            <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: '12px', color: '#6b7280', lineHeight: 1.7 }}>
              {papers.map((paper) => <li key={paper}>{paper}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

/* ─── Next Step Cards ─── */
const NextStepsSection = ({ onContinueToPSA, onContinueToMRI, onContinueToBiopsy }) => (
  <div className="next-steps-section">
    <div className="next-steps-heading">Continue Your Assessment</div>
    <div className="next-steps-cards">
      {onContinueToPSA && (
        <button className="next-step-card next-step-card--psa" onClick={onContinueToPSA}>
          <div className="nsc-icon-wrap nsc-icon-wrap--psa">
            <FlaskConicalIcon size={18} />
          </div>
          <div className="nsc-body">
            <div className="nsc-title">PSA Assessment</div>
            <div className="nsc-desc">Have your PSA result? Add it for a fuller picture.</div>
          </div>
          <ArrowRightIcon size={15} className="nsc-arrow" />
        </button>
      )}
      {onContinueToMRI && (
        <button className="next-step-card next-step-card--mri" onClick={onContinueToMRI}>
          <div className="nsc-icon-wrap nsc-icon-wrap--mri">
            <ScanEyeIcon size={18} />
          </div>
          <div className="nsc-body">
            <div className="nsc-title">MRI Results</div>
            <div className="nsc-desc">Had an MRI? Add your PI-RADS score for a more complete picture.</div>
          </div>
          <ArrowRightIcon size={15} className="nsc-arrow" />
        </button>
      )}
      {onContinueToBiopsy && (
        <button className="next-step-card next-step-card--biopsy" onClick={onContinueToBiopsy}>
          <div className="nsc-icon-wrap nsc-icon-wrap--biopsy">
            <MicroscopeIcon size={18} />
          </div>
          <div className="nsc-body">
            <div className="nsc-title">Biopsy Evaluation</div>
            <div className="nsc-desc">Had a biopsy? Evaluate whether active surveillance is right for you.</div>
          </div>
          <ArrowRightIcon size={15} className="nsc-arrow" />
        </button>
      )}
    </div>
  </div>
);

/* ─── Research ID Card ─── */
const ResearchIdCard = ({ sessionId }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(sessionId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div style={{
      background: '#f0f7ff',
      border: '1.5px solid #3b82f6',
      borderRadius: '10px',
      padding: '14px 16px',
      margin: '12px 0',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    }} role="region" aria-label="Research participation ID">
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <FlaskConicalIcon size={15} color="#3b82f6" />
        <span style={{ fontWeight: 600, fontSize: '13px', color: '#1e40af' }}>
          Research Participation ID
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{
          fontFamily: 'monospace',
          fontSize: '22px',
          fontWeight: 700,
          letterSpacing: '4px',
          color: '#1e3a8a',
          background: '#dbeafe',
          borderRadius: '6px',
          padding: '4px 12px',
        }}>
          {sessionId}
        </span>
        <button
          onClick={handleCopy}
          style={{
            background: copied ? '#22c55e' : '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          aria-label="Copy research ID to clipboard"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <p style={{ margin: 0, fontSize: '12px', color: '#1e40af' }}>
        Show this code to your clinic staff to link your responses to your visit — no personal information is stored.
      </p>
    </div>
  );
};

/* ─── Guardrail Alert Banner ─── */
const GUARDRAIL_CFG = {
  critical: { bg: '#fef2f2', border: '#dc2626', labelColor: '#991b1b', icon: '⛔' },
  warning:  { bg: '#fffbeb', border: '#d97706', labelColor: '#92400e', icon: '⚠️' },
  info:     { bg: '#eff6ff', border: '#2563eb', labelColor: '#1e40af', icon: 'ℹ️' },
};

const GuardrailBanner = ({ alert }) => {
  const cfg = GUARDRAIL_CFG[alert.level] || GUARDRAIL_CFG.info;
  return (
    <div
      role="alert"
      style={{
        background: cfg.bg,
        borderLeft: `4px solid ${cfg.border}`,
        borderRadius: '8px',
        padding: '14px 16px',
        margin: '8px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '16px' }}>{cfg.icon}</span>
        <span style={{ fontWeight: 700, fontSize: '13px', color: cfg.labelColor, letterSpacing: '0.03em' }}>
          {alert.title}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: '14px', color: '#374151', lineHeight: 1.5 }}>{alert.message}</p>
      {alert.guideline && (
        <p style={{ margin: 0, fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>
          Guideline: {alert.guideline}
        </p>
      )}
    </div>
  );
};

/* ─── Main Component ─── */
const Part1Results = ({
  result, onEditAnswers, onStartOver, formData, storageMode,
  hideBackButton = false, sessionId = null, userEmail = null, userPhone = null,
  onSaveToCloud = null, cloudAvailable = false, saveToCloudPending = false, saveToCloudError = null,
  onContinueToPostPSA = null, onContinueToMRI = null, onContinueToPostBiopsy = null,
  researchConsent = false,
}) => {
  const [showPrintableForm, setShowPrintableForm] = useState(false);
  const breakdownRef = useRef(null);
  const [researchSubmitState, setResearchSubmitState] = useState('idle'); // idle | pending | success | error
  const [researchSubmitError, setResearchSubmitError] = useState(null);

  const handleSubmitToResearch = async () => {
    if (!functions) return;
    setResearchSubmitState('pending');
    setResearchSubmitError(null);
    try {
      const fn = httpsCallable(functions, 'submitToRedcap');
      await fn({
        researchConsent: true,
        step1: formData,
        result,
        pathwayMode: formData?.pathwayMode || 'pre_psa',
        sessionId: sessionId || undefined,
      });
      setResearchSubmitState('success');
    } catch (err) {
      setResearchSubmitState('error');
      setResearchSubmitError(err?.message || 'Submission failed. Please try again.');
    }
  };

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
    tierRisk, epsaTierKey, epsaTierLabel,
    epsaGuidelineText, itemImpacts = [], isHighRiskFlagged = false,
    pathwayMode = 'pre_psa', empiricalProbabilityText = null,
    belowMinAge = false,
    aboveMaxScreeningAge = false,
    guardrailAlerts = [],
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
  const activeTier = tierRisk || risk;
  const riskBgClass = epsaTierKey === 'low' ? 'risk-card--lower' : epsaTierKey === 'intermediate' ? 'risk-card--moderate' : epsaTierKey === 'elevated' ? 'risk-card--elevated' : activeTier === 'LOWER' ? 'risk-card--lower' : activeTier === 'HIGHER' ? 'risk-card--elevated' : 'risk-card--moderate';
  const tierAccentColor = epsaTierKey === 'low' ? '#16a34a' : epsaTierKey === 'intermediate' ? '#2563eb' : epsaTierKey === 'elevated' ? '#d97706' : activeTier === 'LOWER' ? '#16a34a' : activeTier === 'HIGHER' ? '#d97706' : '#2563eb';


  const getTierDescription = (key, tier) => {
    const k = key || tier;
    if (k === 'low' || k === 'LOWER') return "Low Risk suggests a lower estimated likelihood relative to others in the model's reference data. Lower does not mean no risk, and it does not replace clinician guidance.";
    if (k === 'intermediate' || k === 'MODERATE') return "Intermediate Risk suggests an estimated likelihood in the middle range of the model's reference data. Reviewing personal risk factors and prior PSA history with a clinician may add important context.";
    return "Elevated Risk suggests a higher estimated likelihood relative to others in the model's reference data. Elevated does not mean cancer is present — it may be a useful prompt to review screening options with a clinician.";
  };

  const metrics = [
    { label: 'Age', value: age, unit: 'yrs' },
    { label: 'BMI', value: bmi, unit: '' },
    { label: 'IPSS Score', value: `${ipssTotal}/35`, unit: '', note: Number(ipssTotal) >= 20 ? 'Severe range in v2 contributes 0 points' : null },
    { label: 'SHIM Score', value: `${shimTotal}/25`, unit: '' },
  ];

  const topFactors = [...itemImpacts]
    .filter((i) => Number(i.points) > 0)
    .sort((a, b) => Number(b.points) - Number(a.points))
    .slice(0, 4);

  return (
    <div className="results-container" role="main">

      {/* ── Top bar ── */}
      <div className="results-top-links-row">
        <a className="results-mobile-unit-pill" href="https://events.mountsinaihealth.org/search/events?event_types%5B%5D=37714143563487" target="_blank" rel="noopener noreferrer" aria-label="Find a screening event near you">
          <MapPinIcon size={15} /><span>Upcoming Screening Events</span>
        </a>
      </div>

      {/* ── Cloud row ── */}
      {storageMode === 'local' && cloudAvailable && onSaveToCloud && (
        <div className="results-cloud-row">
          {storageMode === 'cloud' && <div className="cloud-saved-badge"><CloudIcon size={13} /><span>Saved to Cloud</span></div>}
          <div className="cloud-move-row">
            <button type="button" className="btn-move-cloud" onClick={onSaveToCloud} disabled={saveToCloudPending}>
              <CloudIcon size={16} />{saveToCloudPending ? 'Saving…' : 'Save to Cloud'}
            </button>
            {saveToCloudError && <span className="cloud-error-msg">{saveToCloudError}</span>}
          </div>
        </div>
      )}

      {/* ── Research Participation ID (from main) ── */}
      {sessionId && sessionId !== 'Local' && (
        <ResearchIdCard sessionId={sessionId} />
      )}

      {/* ── Guardrail Alerts ── */}
      {guardrailAlerts?.length > 0 && guardrailAlerts.map(alert => (
        <GuardrailBanner key={alert.code} alert={alert} />
      ))}

      {/* ── Research consent / REDCap status ── */}
      {storageMode === 'cloud' && (
        /* Cloud user — auto-synced if consented */
        <div className={`results-research-badge ${researchConsent ? 'results-research-badge--consented' : 'results-research-badge--private'}`}>
          {researchConsent
            ? <><CheckCircle2Icon size={14} /><span>Your data is included in the ePSA research study</span></>
            : <><CloudIcon size={14} /><span>Your data is stored privately — not shared for research</span></>}
        </div>
      )}
      {storageMode === 'local' && researchConsent && (
        /* Local user — must push manually */
        <div className="results-research-submit-row">
          {researchSubmitState === 'success' ? (
            <div className="results-research-badge results-research-badge--consented">
              <CheckCircle2Icon size={14} />
              <span>Thank you! Your data has been submitted to the research study.</span>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="btn-research-submit"
                onClick={handleSubmitToResearch}
                disabled={researchSubmitState === 'pending'}
              >
                <FlaskConicalIcon size={15} />
                {researchSubmitState === 'pending' ? 'Submitting…' : 'Submit to Research Study'}
              </button>
              {researchSubmitState === 'error' && (
                <span className="results-research-error">{researchSubmitError}</span>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Risk Summary Card (v2: gauge + tier side-by-side) ── */}
      <div className={`risk-summary-card ${riskBgClass}`} role="region" aria-label="Risk assessment result">
        <div className="v2-res-eyebrow">
          <span>ePSA Risk Assessment · Part 1 Baseline</span>
          <span>Assessed today</span>
        </div>

        {belowMinAge ? (
          /* ── Under-40: suppress score, show N/A card ── */
          <div className="under-age-notice" role="note">
            <div className="under-age-notice-icon">ℹ️</div>
            <div className="under-age-notice-body">
              <strong>PSA screening not indicated — per AUA/SUO guidelines, patient is under 40.</strong>
              <p style={{ marginTop: '6px' }}>
                <strong>AUA/SUO Guideline (2023, amended 2026):</strong>
              </p>
              <ul style={{ marginTop: '4px', paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
                <li><strong>Ages 40–45 (high-risk only):</strong> Screening discussions recommended for people at increased risk — Black race, germline mutations (e.g. BRCA1/2, ATM, Lynch Syndrome), or strong family history of prostate cancer. <em>(Statement 5; Strong Recommendation, Grade B)</em></li>
                <li><strong>Ages 45–50:</strong> A baseline PSA test may be offered to all people. <em>(Statement 4; Conditional Recommendation, Grade B)</em></li>
                <li><strong>Ages 50–69:</strong> Regular PSA screening every 2–4 years. <em>(Statement 6; Strong Recommendation, Grade A)</em></li>
              </ul>
              <p style={{ marginTop: '6px', fontSize: '13px', color: '#6b7280' }}>
                Speak with your physician if there are risk factors (Black ancestry, family history, or known germline mutation) that may warrant earlier discussion.
              </p>
            </div>
          </div>
        ) : aboveMaxScreeningAge ? (
          /* ── Over-75: suppress score, refer to life expectancy tool ── */
          <div className="under-age-notice" role="note">
            <div className="under-age-notice-icon">ℹ️</div>
            <div className="under-age-notice-body">
              <strong>Screening decisions require individualized assessment — per AUA/SUO guidelines, patient is over 75.</strong>
              <p style={{ marginTop: '6px' }}>
                <strong>AUA/SUO Guideline (Statement 7; Conditional Recommendation, Grade B):</strong> Clinicians
                may personalize or discontinue screening based on patient preference, age, PSA level, prostate
                cancer risk, life expectancy, and general health following shared decision-making (SDM).
                Specifically for patients 75 and older:
              </p>
              <ul style={{ marginTop: '4px', paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
                <li>Screening may be discontinued or the re-screening interval substantially lengthened if PSA is &lt;3 ng/mL.</li>
                <li>For very healthy patients with an estimated life expectancy of <strong>at least 10 years</strong>, ongoing screening every 2–4 years remains reasonable via SDM.</li>
                <li>For patients with &lt;10-year estimated life expectancy, screening is unlikely to provide benefit in terms of disease-specific or overall mortality.</li>
              </ul>
              <p style={{ marginTop: '6px', fontSize: '13px', color: '#6b7280' }}>
                Use the{' '}
                <a href="https://eprognosis.ucsf.edu/calculators/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-600)', textDecoration: 'underline' }}>
                  ePrognosis Life Expectancy Calculator (Lee / Schonberg Index)
                </a>
                {' '}to estimate 10-year mortality risk and support SDM with your physician.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="v2-gauge-layout">
              <RiskGauge score={gaugeScore} epsaTierKey={epsaTierKey} epsaTierLabel={epsaTierLabel} />
              <div className="v2-tier-info">
                <div className="v2-tier-label">Your Risk Tier</div>
                <h2 className="v2-tier-title" style={{ color: tierAccentColor }}>{epsaTierLabel || activeTier}</h2>
                <div className="v2-tier-score">
                  Score <strong>{impactTotalDisplay}</strong>
                  {Number.isFinite(impactMaxScore) && <span style={{ color: 'var(--ink-500)' }}> / {impactMaxScore}</span>}
                </div>
                <p className="v2-tier-narr">{getTierDescription(epsaTierKey, activeTier)}</p>
              </div>
            </div>

            {/* "What drove this score" cards */}
            {topFactors.length > 0 && (
              <div className="v2-why">
                <div className="v2-why-head">
                  <span className="v2-why-head-title">What drove this score</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--brand-600)', fontWeight: 600, cursor: 'pointer' }} onClick={() => breakdownRef.current?.scrollIntoView({ behavior: 'smooth' })}>See full breakdown ›</span>
                </div>
                <div className="v2-why-items">
                  {topFactors.slice(0, 3).map(f => (
                    <div key={f.item} className="v2-why-item">
                      <div className="v2-why-item-label">{f.item}</div>
                      <div className="v2-why-item-val">{f.value || '—'}</div>
                      <div className="v2-why-item-pts" style={{ color: tierAccentColor }}>+{f.points}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── PSA Recommendation Hero ── */}
      {(() => {
        const isRed = psaRecommendReason === 'high_risk_early_screening' || psaRecommendReason === 'family_history_override';
        const isAmber = psaRecommendReason === 'score_threshold';
        const isGreen = belowMinAge || aboveMaxScreeningAge || recommendPSA === false;
        const isAgeGuideline = psaRecommendReason === 'age_guideline_50_69';
        const variant = isRed ? 'red' : (isAmber || isAgeGuideline) ? 'amber' : isGreen ? 'green' : 'blue';
        const heroIcon = isRed || isAmber || isAgeGuideline ? <AlertTriangleIcon size={20} /> : isGreen ? <CheckCircle2Icon size={20} /> : <FlaskConicalIcon size={20} />;
        const heroTitle = isRed ? 'PSA Test Strongly Recommended'
          : (isAmber || isAgeGuideline) ? 'PSA Test Recommended'
          : belowMinAge ? 'PSA Test Not Required'
          : aboveMaxScreeningAge ? 'Screening Requires Life Expectancy Assessment'
          : isGreen ? 'PSA Test Not Currently Indicated'
          : 'PSA Test May Be Appropriate';
        const displayMessage = belowMinAge
          ? 'No AUA/SUO guideline recommends routine screening below age 40. High-risk individuals (Black ancestry, germline mutations, strong family history) may begin discussions at age 40–45 (Statement 5, Strong Rec Grade B). A baseline PSA may be offered at ages 45–50 (Statement 4, Conditional Rec Grade B). Speak with your physician.'
          : aboveMaxScreeningAge
          ? 'AUA/SUO guidelines recommend individualizing screening decisions above age 75 through shared decision-making (Statement 7, Conditional Rec Grade B). Screening may continue for very healthy patients with >10-year life expectancy; consider discontinuing or lengthening the interval if PSA <3 ng/mL. Use the ePrognosis Life Expectancy Calculator to guide this decision.'
          : psaRecommendMessage;
        return (
          <div className={`v2-psa-hero v2-psa-hero--${variant}`}>
            <div className="v2-psa-hero-top">
              <div className="v2-psa-hero-icon">{heroIcon}</div>
              <div className="v2-psa-hero-body">
                <h3 className="v2-psa-hero-title">{heroTitle}</h3>
                <p className="v2-psa-hero-desc">{displayMessage}</p>
                {psaRecommendReason === 'score_threshold' && (() => {
                  let guidelineSays, deviationType, deviationReason;
                  if (age < 45) {
                    deviationType = 'Model recommendation — outside AUA/SUO guideline age window.';
                    guidelineSays = 'AUA/SUO guidelines have no routine screening recommendation for average-risk individuals under 45. Screening discussions begin at 40–45 only for high-risk individuals (Black ancestry, germline mutations, strong family history — Statement 5, Strong Rec, Grade B).';
                    deviationReason = 'The ePSA model identifies elevated individual risk based on symptoms, BMI, comorbidities, and other factors that age-based guidelines do not capture. This result suggests your individual risk profile may warrant a PSA discussion even before the standard guideline window — but it is not an endorsed recommendation. Discuss with your physician.';
                  } else if (age < 50) {
                    deviationType = 'Model recommendation — stronger than AUA/SUO guideline for this age.';
                    guidelineSays = 'AUA/SUO guidelines suggest only that a baseline PSA test may be offered at ages 45–50 (Statement 4, Conditional Recommendation, Grade B) — not a strong recommendation for screening.';
                    deviationReason = 'The ePSA model score exceeds the screening threshold, suggesting elevated individual risk beyond what a baseline assessment alone would capture. The model may be identifying risk factors (symptoms, BMI, etc.) that make earlier or more urgent evaluation appropriate — but this goes beyond what the guideline currently endorses. Discuss with your physician.';
                  } else if (age <= 69) {
                    deviationType = 'Model score reinforces AUA/SUO guideline — but adds individual risk specificity.';
                    guidelineSays = 'AUA/SUO guidelines already recommend regular PSA screening every 2–4 years for ages 50–69 (Statement 6, Strong Recommendation, Grade A).';
                    deviationReason = 'Your ePSA score exceeds the model threshold, indicating elevated individual risk above the population average for this age group. While the guideline recommends screening regardless of score, the elevated score suggests more urgent follow-up may be warranted. Discuss timing and urgency with your physician.';
                  } else {
                    deviationType = 'Model recommendation — AUA/SUO guideline requires SDM at this age.';
                    guidelineSays = 'AUA/SUO guidelines recommend individualizing screening decisions for ages 70+ through shared decision-making (SDM) based on PSA level, life expectancy, and general health (Statement 7, Conditional Rec, Grade B). Routine screening is not automatically recommended.';
                    deviationReason = 'The ePSA model score suggests elevated risk, but at this age the guideline requires weighing benefits against risks of overdiagnosis based on life expectancy. The model does not account for competing mortality risks. Use the ePrognosis Life Expectancy Calculator and discuss with your physician before proceeding.';
                  }
                  const NON_GUIDELINE_FACTORS = new Set([
                    'IPSS total', 'BMI', 'Exercise', 'Smoking', 'Diet pattern',
                    'Inflammation history', '9/11 / Chemical exposure', 'SHIM total', 'Comorbidity burden'
                  ]);
                  const drivingNonGuidelineFactors = itemImpacts.filter(b => b.points > 0 && NON_GUIDELINE_FACTORS.has(b.item));
                  return (
                    <div style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(0,0,0,0.06)', borderRadius: '6px', fontSize: '0.8rem', lineHeight: 1.6 }}>
                      <div style={{ fontWeight: 700, marginBottom: '4px' }}>⚠️ {deviationType}</div>
                      <div style={{ marginBottom: '4px' }}><strong>What AUA/SUO says for this age:</strong> {guidelineSays}</div>
                      <div style={{ marginBottom: drivingNonGuidelineFactors.length > 0 ? '6px' : 0 }}><strong>Why the model may still apply:</strong> {deviationReason}</div>
                      {drivingNonGuidelineFactors.length > 0 && (
                        <div style={{ borderTop: '1px solid rgba(0,0,0,0.12)', paddingTop: '6px', marginTop: '2px' }}>
                          <strong>Non-guideline factors driving this score:</strong> The following ePSA model variables are <em>not</em> AUA/SUO-endorsed PSA screening criteria but contributed to this recommendation:{' '}
                          {drivingNonGuidelineFactors.map((b, i) => (
                            <span key={b.item}><strong>{b.item}</strong>{i < drivingNonGuidelineFactors.length - 1 ? ', ' : '.'}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="v2-psa-hero-ctas">
              <a
                href="https://www.mountsinai.org/care/cancer/services/prostate/mobile-screening"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-results btn-results--solid v2-psa-hero-btn-solid"
              >
                {recommendPSA ? 'Book PSA screening →' : 'Learn about PSA →'}
              </a>
              <a
                href="https://www.mountsinai.org/care/urology/team"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-results btn-results--outline v2-psa-hero-btn-outline"
              >
                Meet the urology team ↗
              </a>
            </div>
          </div>
        );
      })()}

      {/* ── What happens next — 4-step timeline ── */}
      <div className="v2-timeline">
        <div className="v2-timeline-head">
          <span className="v2-timeline-title">What happens next</span>
        </div>
        <div className="v2-timeline-track">
          <div className="v2-timeline-step v2-timeline-step--current">
            <span className="v2-timeline-when">Today</span>
            <span className="v2-timeline-desc">Review your results and share with your GP or urologist</span>
          </div>
          <div className="v2-timeline-step">
            <span className="v2-timeline-when">Week 1–2</span>
            <span className="v2-timeline-desc">{recommendPSA ? 'Book a PSA blood test at your clinic' : 'Discuss your lifestyle risk factors with your doctor'}</span>
          </div>
          <div className="v2-timeline-step">
            <span className="v2-timeline-when">Week 3–4</span>
            <span className="v2-timeline-desc">{recommendPSA ? 'Receive PSA result — continue to Part 2 here' : 'Continue monitoring annually as recommended'}</span>
          </div>
          <div className="v2-timeline-step">
            <span className="v2-timeline-when">Ongoing</span>
            <span className="v2-timeline-desc">Re-assess with ePSA if your health status changes</span>
          </div>
        </div>
      </div>

      {/* ── High-risk notice (compact, only when not already covered by PSA banner reason) ── */}
      {isHighRiskFlagged && psaRecommendReason !== 'high_risk_early_screening' && psaRecommendReason !== 'family_history_override' && (
        <div className="high-risk-notice" role="note">
          <AlertTriangleIcon size={14} className="high-risk-notice-icon" />
          <p>
            <strong>High-risk factors detected.</strong> Your score is elevated and you have at least one guideline-recognised high-risk factor (age ≥70, Black ancestry, first-degree family history, hereditary genetic mutation, or multiple comorbidities). Earlier evaluation is recommended.
          </p>
        </div>
      )}


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

      {/* ── Next Steps ── */}
      {(onContinueToPostPSA || onContinueToMRI || onContinueToPostBiopsy) && (
        <NextStepsSection
          onContinueToPSA={onContinueToPostPSA}
          onContinueToMRI={onContinueToMRI}
          onContinueToBiopsy={onContinueToPostBiopsy}
        />
      )}

      {/* ── Essential reading label ── */}
      <div className="v2-essential-label">
        <span className="v2-essential-badge">ESSENTIAL</span>
        <span className="v2-essential-text">Understanding your result</span>
      </div>

      {/* ── Expandable sections ── */}
      <div className="detail-sections">
        <CollapsibleSection title="About Your Result" defaultOpen={true}>
          {belowMinAge ? (
            <>
              <p>ePSA is not validated below age 40. No score or risk tier has been calculated.</p>
              <p style={{ marginTop: '8px' }}><strong>AUA/SUO Guideline (2023, amended 2026):</strong></p>
              <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '4px' }}>
                <li><strong>Ages 40–45:</strong> Screening discussions recommended for high-risk individuals — Black race, germline mutations, or strong family history. <em>(Statement 5; Strong Recommendation, Grade B)</em></li>
                <li><strong>Ages 45–50:</strong> A baseline PSA test may be offered to all people. <em>(Statement 4; Conditional Recommendation, Grade B)</em></li>
                <li><strong>Ages 50–69:</strong> Regular screening every 2–4 years. <em>(Statement 6; Strong Recommendation, Grade A)</em></li>
              </ul>
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>Return to complete a full ePSA assessment once the patient reaches age 40 or older.</p>
            </>
          ) : aboveMaxScreeningAge ? (
            <>
              <p>ePSA is not validated above age 75. No score or risk tier has been calculated.</p>
              <p style={{ marginTop: '8px' }}><strong>AUA/SUO Guideline — Statement 7 (Conditional Recommendation, Grade B):</strong> Clinicians may personalize or discontinue re-screening based on patient preference, age, PSA level, cancer risk, life expectancy, and general health following SDM. For patients 75 and older:</p>
              <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '4px' }}>
                <li>Screening may be discontinued or intervals substantially lengthened when PSA is &lt;3 ng/mL.</li>
                <li>Healthy patients with an estimated life expectancy of ≥10 years may continue screening every 2–4 years via SDM.</li>
                <li>For patients with &lt;10-year estimated life expectancy, screening is unlikely to reduce disease-specific or overall mortality.</li>
              </ul>
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>
                Use the{' '}
                <a href="https://eprognosis.ucsf.edu/calculators/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-600)', textDecoration: 'underline' }}>
                  ePrognosis Lee / Schonberg Index
                </a>
                {' '}to estimate 10-year mortality risk and support SDM with your physician.
              </p>
            </>
          ) : (
            <>
              {topFactors.length > 0 ? (
                <p>
                  Your score of <strong>{impactTotalDisplay}/{impactMaxScore}</strong> places you in the <strong>{epsaTierLabel || activeTier}</strong> tier.
                  {' '}The factors that contributed most to your score were:{' '}
                  {topFactors.map((f, i) => (
                    <span key={f.item}>{f.item} (+{f.points} pts){i < topFactors.length - 1 ? ', ' : '.'}</span>
                  ))}
                </p>
              ) : (
                <p>Your score of <strong>{impactTotalDisplay}/{impactMaxScore}</strong> places you in the <strong>{epsaTierLabel || activeTier}</strong> tier.</p>
              )}
              <p>{getTierDescription(epsaTierKey, activeTier)}</p>
              {empiricalProbabilityText && (
                <p style={{ fontStyle: 'italic', fontSize: '0.9em', color: '#4b5563', marginTop: '8px' }}>{empiricalProbabilityText}</p>
              )}
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>This is an educational estimate — it does not diagnose cancer. Use it as a starting point for a conversation with your doctor.</p>
            </>
          )}
        </CollapsibleSection>

        {!belowMinAge && !aboveMaxScreeningAge && itemImpacts.length > 0 && (
          <div ref={breakdownRef}>
            <CollapsibleSection title="Risk Factor Breakdown" defaultOpen={true}>
              <p>Each risk factor below contributed points toward your score. The total determines your risk tier.</p>
              <div className="impact-table-wrap">
                <table className="impact-table" aria-label="Item impact breakdown table">
                  <thead><tr><th>Item</th><th>Input</th><th>Impact</th><th>Points</th></tr></thead>
                  <tbody>
                    {itemImpacts.map((impact) => (
                      <tr key={impact.item}>
                        <td>{impact.item}<SourcesPopover itemName={impact.item} /></td>
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
          </div>
        )}

        <CollapsibleSection title="Screening Guidelines (ACS / AUA / NCCN / ERUS)">
          <p>When should men consider discussing a PSA test with their doctor?</p>
          <ul style={{ margin: '8px 0 8px 18px', fontSize: '13px', lineHeight: 1.8, color: '#374151' }}>
            <li><strong>ACS (American Cancer Society)</strong> — Age 50 for average-risk men; age 45 for African American men or those with a first-degree relative diagnosed before 65; age 40 for men with more than one first-degree relative diagnosed at an early age.</li>
            <li><strong>AUA/SUO (2023, amended 2026)</strong> — Baseline PSA may be offered at ages 45–50 (Conditional Rec, Grade B). Regular screening every 2–4 years for ages 50–69 (Strong Rec, Grade A). High-risk individuals (Black ancestry, germline mutations, strong family history) should begin discussions at age 40–45 (Strong Rec, Grade B). Above age 75, individualize via SDM based on health and life expectancy.</li>
            <li><strong>NCCN (National Comprehensive Cancer Network) 2024</strong> — First PSA at age 45 for most men, or 40 for higher-risk men. Testing every 1–2 years between ages 45 and 75.</li>
            <li><strong>ERUS (European Guidelines on Prostate Cancer)</strong> — Screening from age 50 for most men, or 45 for high-risk men.</li>
          </ul>
          <p>For men at average risk, normal PSA ranges by age: ~2.5 ng/mL (40–49), ~3.5 (50–59), ~4.5 (60–69), ~6.5 (70–79).</p>
        </CollapsibleSection>

        <CollapsibleSection title="Model Documentation (ePSA Screening Priority)">
          <ModelDocumentation scope="part1" />
        </CollapsibleSection>

        <CollapsibleSection title="Important Disclaimer">
          <p className="detail-disclaimer">ePSA is an educational tool designed to help you understand your prostate cancer risk. It is not a medical diagnosis. Your risk category is based on population research and the AUA, NCCN, and ERUS guidelines. In some cases — particularly for men with high-risk factors — this tool may suggest earlier screening than the general population guidelines recommend. This is intentional, and a notice appears on screen when this happens. Always discuss your result with a doctor before making any decisions about testing or treatment.</p>
          <p className="detail-attribution">— Ashutosh K. Tewari, MD, Icahn School of Medicine at Mount Sinai</p>
        </CollapsibleSection>
      </div>

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
