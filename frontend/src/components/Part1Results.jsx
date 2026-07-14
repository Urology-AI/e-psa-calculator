import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
// Shared result components — canonical source; local definitions below kept for
// backwards compatibility until a full merge is completed.
import { GuidelineSupportBadge as SharedGuidelineSupportBadge } from './shared/ResultsShared.jsx'; // eslint-disable-line no-unused-vars
import UrologistFinder from './UrologistFinder';
import './Part1Results.css';
import './epsa-v2-layout.css';
import './PathwaySelector.css';
import { RISK_COLORS } from '../utils/riskColors';
import { fieldReferences } from '../utils/fieldReferences';
import { PSA_BANNER_CONFIG_DATA } from '@epsa/engine';
import PrintableForm from './PrintableForm';
import ModelDocumentation from './ModelDocumentation';
import RiskGauge from './RiskGauge';
import { AUAGuidelineCriteria } from './AUAFlowchart';
import { Part1GuidelineJourney } from './GuidelineJourney';
import ResultsLoading, { LOADING_SEEN_KEY_P1, PART1_LOADING_STEPS } from './ResultsLoading';
import ResultsMetaBar from './ResultsMetaBar';
import { downloadCsv, buildPart1CsvRows } from '../utils/exportCsv';
import { functions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import {
  ArrowLeftIcon, RefreshCwIcon, PrinterIcon, FileTextIcon, DownloadIcon,
  CloudIcon, ChevronDownIcon, ChevronUpIcon, InfoIcon, CheckCircle2Icon,
  AlertTriangleIcon, AlertCircleIcon, ExternalLinkIcon, MapPinIcon,
  FlaskConicalIcon, MicroscopeIcon, ArrowRightIcon, CheckIcon, CircleIcon, XIcon,
} from 'lucide-react';

/* ─── Count-up animation hook ─── */
const useCountUp = (target, duration = 1100, delayMs = 700) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const n = Number(target) || 0;
    if (n <= 0) return;
    const startTs = performance.now() + delayMs;
    let raf;
    const tick = (now) => {
      if (now < startTs) { raf = requestAnimationFrame(tick); return; }
      const t = Math.min((now - startTs) / duration, 1);
      setValue(Math.round((1 - Math.pow(1 - t, 3)) * n));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delayMs]);
  return value;
};

/* ─── Evidence tier classification for impact table rows ───
 * AUA/SUO 2026 tier: Age, Race/ancestry, Family history (germline mutations handled via Family history row)
 * Research-based tier: all other factors including BMI, IPSS, lifestyle
 */
const AUA_SUO_FACTORS = new Set([
  'Age', 'Black ancestry', 'Family history',
]);

const FactorSourceBadge = ({ itemName }) => {
  const isAua = AUA_SUO_FACTORS.has(itemName);
  const label = isAua ? 'AUA/SUO 2026' : 'Research-based';
  const title = isAua
    ? 'Factor included in AUA/SUO 2026 and NCCN 2026 Early Detection Guidelines'
    : 'Associated with prostate cancer risk in published research — not part of current AUA/NCCN screening guidelines';
  return (
    <span
      title={title}
      aria-label={title}
      role="img"
      style={{
        display: 'inline-block',
        marginLeft: '6px',
        padding: '1px 6px',
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.03em',
        borderRadius: '10px',
        verticalAlign: 'middle',
        whiteSpace: 'nowrap',
        background: isAua ? '#dbeafe' : '#f3f4f6',
        color: isAua ? '#1e40af' : '#374151',
        border: `1px solid ${isAua ? '#93c5fd' : '#d1d5db'}`,
      }}
    >
      {label}
    </span>
  );
};

/* ─── Inline reference popover (ⓘ) for impact table rows ─── */
const IMPACT_TO_REF = {
  'Age': 'age',
  'Black ancestry': 'race',
  'Family history': 'familyHistory',
  'Inflammation history': 'inflammationHistory',
  'Genetic mutation': 'brcaStatus',
  'Expanded germline panel': 'brcaStatus',
  // 'Family history (breast/ovarian/pancreatic)' intentionally has no popover mapping —
  // the 'familyHistory' reference entry cites direct prostate-FH sources (Carter 1993, etc.),
  // which would misattribute the HBOC/Lynch-syndrome evidence this factor is actually based on.
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

/* ─── Factor rationale row (spans all columns, expands on demand) ─── */
// rationale can be a plain string OR { data, literature, decision, source }
const RationaleRow = ({ rationale }) => {
  const [open, setOpen] = useState(false);
  if (!rationale) return null;
  const isStructured = typeof rationale === 'object' && rationale !== null;
  return (
    <tr className="impact-rationale-row">
      <td colSpan={4} style={{ padding: 0, border: 0 }}>
        <button
          type="button"
          className="impact-rationale-toggle"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
        >
          {open ? <ChevronUpIcon size={11} aria-hidden="true" /> : <ChevronDownIcon size={11} aria-hidden="true" />}
          {open ? 'Hide score rationale' : 'Why this score?'}
        </button>
        {open && (
          <div className="impact-rationale-body">
            {isStructured ? (
              <table className="rationale-table">
                <tbody>
                  {rationale.data && (
                    <tr>
                      <td className="rationale-table__label">Our data</td>
                      <td className="rationale-table__value">{rationale.data}</td>
                    </tr>
                  )}
                  {rationale.literature && (
                    <tr>
                      <td className="rationale-table__label">Literature</td>
                      <td className="rationale-table__value">{rationale.literature}</td>
                    </tr>
                  )}
                  {rationale.decision && (
                    <tr>
                      <td className="rationale-table__label rationale-table__label--decision">Decision</td>
                      <td className="rationale-table__value rationale-table__value--decision">{rationale.decision}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : rationale}
          </div>
        )}
      </td>
    </tr>
  );
};

/* ─── Collapsible Section ─── */
const CollapsibleSection = ({ title, children, defaultOpen = false, id, highlight = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      id={id}
      className={`collapsible-section${highlight ? ' collapsible-section--highlight' : ''}`}
    >
      <button className="collapsible-toggle" onClick={() => setOpen(!open)} aria-expanded={open} type="button">
        <span>{title}</span>
        {open ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  );
};

/* ─── Guideline Deviation Banner ─── */
const NON_GUIDELINE_LABELS = {
  'BMI': 'Body weight (BMI)',
  'Exercise': 'Physical activity level',
  'Smoking': 'Smoking history',
  'Diet pattern': 'Diet pattern',
  'Inflammation history': 'Prostate inflammation history',
  '9/11 / Chemical exposure': 'Chemical / 9-11 exposure',
  'SHIM total': 'Erectile function (SHIM)',
  'IPSS total': 'Urinary symptoms (IPSS)',
  'Comorbidity burden': 'Comorbidity burden',
};

const GuidelineDeviationBanner = ({ age, nonGuidelineFactors = [] }) => {
  let guidelineSays, epsaAdds;
  if (age < 45) {
    guidelineSays = 'AUA/NCCN do not recommend routine PSA screening before age 45 for average-risk men. High-risk individuals (Black ancestry, BRCA1/2, strong family history) may begin discussions at 40–45.';
    epsaAdds = 'ePSA is recommending a PSA test based on your individual risk score — which is above the model threshold. This goes beyond what AUA/NCCN currently endorse for your age group.';
  } else if (age < 50) {
    guidelineSays = 'AUA/SUO 2026 (Statement 2, Strong Recommendation; Grade A) recommends a baseline PSA discussion beginning at age 45 for average-risk men. Repeat screening is individualized until routine 2–4 year intervals begin at age 50.';
    epsaAdds = 'ePSA is recommending a PSA test with more urgency than the guideline. Your score exceeds the model threshold, driven partly by factors AUA/NCCN do not use for screening decisions.';
  } else if (age <= 69) {
    guidelineSays = 'AUA/NCCN already recommend regular PSA screening every 2–4 years at ages 50–69.';
    epsaAdds = 'ePSA is adding urgency beyond the routine interval. Your score is elevated by individual risk factors — including some that fall outside AUA/NCCN criteria.';
  } else {
    guidelineSays = 'AUA/NCCN require Shared Decision Making at age 70+, weighing screening benefit against life expectancy and comorbidities. Routine screening is not automatically recommended.';
    epsaAdds = 'ePSA is flagging elevated risk based on your score, but at this age the guideline requires a life-expectancy discussion with your physician first.';
  }

  return (
    <div role="alert" className="guideline-deviation-banner guideline-deviation-banner--amber">
      <div className="guideline-deviation-banner__header">
        <AlertTriangleIcon size={15} className="guideline-deviation-banner__icon" />
        <span className="guideline-deviation-banner__title">ePSA recommendation goes beyond AUA/NCCN guidelines</span>
      </div>

      <div className="guideline-deviation-banner__row">
        <span className="guideline-deviation-banner__pill guideline-deviation-banner__pill--guideline">AUA/NCCN says</span>
        <p className="guideline-deviation-banner__text">{guidelineSays}</p>
      </div>

      <div className="guideline-deviation-banner__row">
        <span className="guideline-deviation-banner__pill guideline-deviation-banner__pill--epsa">ePSA adds</span>
        <p className="guideline-deviation-banner__text">{epsaAdds}</p>
      </div>

      {nonGuidelineFactors.length > 0 && (
        <div className="guideline-deviation-banner__factors">
          <span className="guideline-deviation-banner__factors-label">Factors used that are NOT AUA/NCCN screening criteria:</span>
          <ul className="guideline-deviation-banner__factors-list">
            {nonGuidelineFactors.map(f => (
              <li key={f}>{NON_GUIDELINE_LABELS[f] || f}</li>
            ))}
          </ul>
          <p className="guideline-deviation-banner__factors-note">AUA/NCCN base PSA screening on age, race, family history, and germline mutations only. Diet, exercise, BMI, urinary symptoms, and similar factors are not part of their screening criteria.</p>
        </div>
      )}

      <p className="guideline-deviation-banner__footer">
        <strong>When ePSA and the guideline disagree, the guideline wins.</strong> ePSA is a supportive tool — your doctor and the published AUA/NCCN guidance should drive the decision. Always discuss this result with your GP or urologist before acting on it.
      </p>
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
 * Serialisable config lives in calculatorConfig.js (PSA_BANNER_CONFIG_DATA).
 * Here we merge in the Icon component reference for each entry.
 * ─────────────────────────────────────────────────────────────────────────── */
const PSA_BANNER_ICONS = {
  'alert-circle':   AlertCircleIcon,
  'alert-triangle': AlertTriangleIcon,
  'info':           InfoIcon,
  'check-circle':   CheckCircle2Icon,
};

const PSA_BANNER_CONFIG = Object.fromEntries(
  Object.entries(PSA_BANNER_CONFIG_DATA).map(([k, v]) => [k, { ...v, Icon: PSA_BANNER_ICONS[v.iconKey] }])
);

const GUIDELINE_LABELS_P1 = { aua: 'AUA/SUO', nccn: 'NCCN', eau: 'EAU', erspc: 'ERSPC' };
const GuidelineSupportBadge = ({ support, count }) => {
  const [showTip, setShowTip] = useState(false);
  if (!support) return null;
  const total = 4;
  const n = typeof count === 'number'
    ? count
    : Object.values(support).filter(Boolean).length;
  const strong = n >= 3;
  const partial = n >= 1 && n < 3;
  /* WCAG AA contrast-safe colors: text on colored backgrounds at 11px font-weight 600 */
  const colour = strong ? '#166534' : partial ? '#92400e' : '#374151';
  const bg = strong ? '#f0fdf4' : partial ? '#fffbeb' : '#f3f4f6';
  const supportedNames = Object.entries(support).filter(([, v]) => v).map(([k]) => GUIDELINE_LABELS_P1[k]).join(', ') || 'none';
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 8px', background: bg, border: `1px solid ${colour}`, borderRadius: '999px', fontSize: '11px', fontWeight: 600, color: colour, letterSpacing: '0.02em', cursor: 'help', alignSelf: 'flex-start' }}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
      onFocus={() => setShowTip(true)}
      onBlur={() => setShowTip(false)}
      tabIndex={0}
      role="img"
      aria-label={`Supported by ${n} of ${total} guidelines: ${supportedNames}`}
    >
      {strong ? <CheckCircle2Icon size={12} aria-hidden="true" /> : partial ? <CircleIcon size={12} aria-hidden="true" style={{ opacity: 0.6 }} /> : <CircleIcon size={12} aria-hidden="true" style={{ opacity: 0.3 }} />}
      Supported by {n} / {total} guidelines
      {showTip && (
        <span
          role="tooltip"
          style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 10, background: '#111827', color: '#fff', padding: '8px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, lineHeight: 1.5, whiteSpace: 'nowrap', boxShadow: '0 6px 14px rgba(0,0,0,0.18)' }}
        >
          {Object.entries(GUIDELINE_LABELS_P1).map(([k, label]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {support[k] ? <CheckIcon size={11} color="#4ade80" aria-hidden="true" /> : <span style={{ color: '#9ca3af', fontWeight: 700 }}>—</span>}
              {label}
            </span>
          ))}
        </span>
      )}
    </span>
  );
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
const NextStepsSection = ({ onContinueToPSA, onContinueToBiopsy }) => (
  <div className="next-steps-section">
    <div className="next-steps-heading">Continue Your Assessment</div>
    <div className="next-steps-cards">
      {onContinueToPSA && (
        <button className="next-step-card next-step-card--psa" onClick={onContinueToPSA}>
          <div className="nsc-icon-wrap nsc-icon-wrap--psa">
            <FlaskConicalIcon size={18} />
          </div>
          <div className="nsc-body">
            <div className="nsc-title">Enter PSA Result</div>
            <div className="nsc-desc">Have your PSA result? Add it — the tool will then assess whether an MRI is recommended.</div>
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
          {copied ? <><CheckIcon size={13} style={{ marginRight: 4 }} />Copied</> : 'Copy'}
        </button>
      </div>
      <p style={{ margin: 0, fontSize: '12px', color: '#1e40af' }}>
        Show this code to your clinic staff to link your responses to your visit — no personal information is stored.
      </p>
    </div>
  );
};

/* ─── Guardrail Alert Banner ─── */
// Uses semantic CSS variables (defined in App.css, with .theme-dark overrides) so
// guardrail banners render correctly in both light and dark mode.
const GUARDRAIL_CFG = {
  critical: { bg: 'var(--error-50)', border: 'var(--error-600)', labelColor: 'var(--error-600)', Icon: AlertCircleIcon },
  warning:  { bg: 'var(--warning-50)', border: 'var(--warning-600)', labelColor: 'var(--warning-600)', Icon: AlertTriangleIcon },
  info:     { bg: 'var(--brand-50)', border: 'var(--brand-500)', labelColor: 'var(--brand-700)', Icon: InfoIcon },
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
        <cfg.Icon size={16} aria-hidden="true" color={cfg.labelColor} />
        <span style={{ fontWeight: 700, fontSize: '13px', color: cfg.labelColor, letterSpacing: '0.03em' }}>
          {alert.title}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: '14px', color: 'var(--ink-800)', lineHeight: 1.5 }}>{alert.message}</p>
      {alert.guideline && (
        <p style={{ margin: 0, fontSize: '11px', color: 'var(--ink-600)', fontStyle: 'italic' }}>
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
  onContinueToPostPSA = null, onContinueToMRI = null, onContinueToPostBiopsy = null,
  researchConsent = false,
  onShowModelDocs = null,
  flowMode = 'public',
}) => {
  const { t } = useTranslation();
  const [showPrintableForm, setShowPrintableForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllImpacts, setShowAllImpacts] = useState(false);
  const breakdownRef = useRef(null);
  const recommendRef = useRef(null);
  const [researchSubmitState, setResearchSubmitState] = useState('idle'); // idle | pending | success | error
  const [confirmStartOver, setConfirmStartOver] = useState(false);
  const [researchSubmitError, setResearchSubmitError] = useState(null);
  const [exportError, setExportError] = useState(null);
  // Hook must be before early returns — animates the impact total in the score breakdown
  const animImpactScore = useCountUp(Number(result?.calculationDetails?.rawScore) || 0);

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

  useEffect(() => {
    if (!result) return;
    setIsLoading(true);
  }, [result]);

  useEffect(() => {
    if (isLoading) return;
    const t = setTimeout(() => {
      recommendRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => clearTimeout(t);
  }, [isLoading]);

  const handleExportCsv = () => {
    const rows = buildPart1CsvRows(formData, result, {});
    const filename = `ePSA_Part1_Results_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(filename, rows);
  };

  if (showPrintableForm) return <PrintableForm formData={formData} onBack={() => setShowPrintableForm(false)} />;
  if (!result) return (
    <div className="results-container">
      <div role="alert" style={{ margin: '2rem auto', maxWidth: '480px', padding: '24px', background: '#fffbeb', border: '1.5px solid #d97706', borderRadius: '12px', textAlign: 'center' }}>
        <AlertTriangleIcon size={32} color="#d97706" style={{ marginBottom: '12px' }} />
        <h3 style={{ color: '#92400e', fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>No Results Yet</h3>
        <p style={{ color: '#78350f', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
          Complete the Pre-PSA questionnaire to see your baseline risk assessment.
        </p>
      </div>
    </div>
  );

  /* ── Structural validity guard ──────────────────────────────────────────────
   * Catches corrupted localStorage sessions where required fields are missing.
   * The engine never returns a result without `age` set; if it is absent/NaN
   * the session data was corrupted and rendering would produce a misleading score.
   * ─────────────────────────────────────────────────────────────────────────── */
  const _ageValid = Number.isFinite(Number(result?.age));
  const _scorePresent = result?.score != null || result?.belowMinAge || result?.aboveMaxScreeningAge;
  if (!_ageValid || !_scorePresent) return (
    <div className="results-container">
      <div role="alert" style={{ margin: '2rem auto', maxWidth: '480px', padding: '24px', background: '#fffbeb', border: '1.5px solid #d97706', borderRadius: '12px', textAlign: 'center' }}>
        <AlertTriangleIcon size={32} color="#d97706" style={{ marginBottom: '12px' }} />
        <h3 style={{ color: '#92400e', fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>
          Assessment Data Incomplete
        </h3>
        <p style={{ color: '#78350f', fontSize: '14px', lineHeight: 1.6, margin: '0 0 16px' }}>
          Your results could not be computed — the session data appears incomplete or corrupted.
          This can happen if the assessment was not fully submitted, or if browser storage was cleared mid-session.
        </p>
        <button
          type="button"
          onClick={onStartOver}
          style={{ background: '#d97706', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
        >
          Start a New Assessment
        </button>
      </div>
    </div>
  );

  if (isLoading) return (
    <div className="results-container">
      <ResultsLoading
        label="ePSA · Pre-PSA"
        message="Building your baseline risk profile…"
        steps={PART1_LOADING_STEPS}
        onComplete={() => setIsLoading(false)}
        storageKey={LOADING_SEEN_KEY_P1}
      />
    </div>
  );

  const {
    score, scoreRange, risk, color, action, ipssTotal, shimTotal, bmi, age,
    recommendPSA, psaRecommendReason, psaRecommendMessage,
    psaGuidelineSupport = null, psaGuidelineSupportCount = null,
    tierRisk, epsaTierKey, epsaTierLabel,
    epsaGuidelineText, itemImpacts = [], isHighRiskFlagged = false,
    pathwayMode = 'pre_psa', empiricalProbabilityText = null,
    belowMinAge = false,
    aboveMaxScreeningAge = false,
    guardrailAlerts = [],
    guidelineTrack = null,
    epsaExtendedProfile = null,
    empiricalRate = null,
    empiricalRateCiLo = null,
    empiricalRateCiHi = null,
    empiricalRateN = null,
    empiricalRateEvents = null,
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
    if (k === 'low' || k === 'LOWER') return t('part1Results.tierDescriptionV2.low');
    if (k === 'intermediate' || k === 'MODERATE') return t('part1Results.tierDescriptionV2.intermediate');
    return t('part1Results.tierDescriptionV2.high');
  };

  // ── Contextual triggers: when ePSA's output diverges from guideline,
  // auto-open the AUA/NCCN reference section so the user can compare.
  const hasCriticalGuardrail = (guardrailAlerts || []).some(a => a.level === 'critical');
  const guidelineTriggers = [];
  if (belowMinAge) guidelineTriggers.push({
    code: 'below_min_age',
    text: t('part1Results.guidelineTrigger.belowMinAge'),
  });
  if (aboveMaxScreeningAge) guidelineTriggers.push({
    code: 'above_max_age',
    text: t('part1Results.guidelineTrigger.aboveMaxAge'),
  });
  if (psaRecommendReason === 'score_threshold') guidelineTriggers.push({
    code: 'score_threshold',
    text: t('part1Results.guidelineTrigger.scoreThreshold'),
  });
  if (hasCriticalGuardrail) guidelineTriggers.push({
    code: 'critical_guardrail',
    text: t('part1Results.guidelineTrigger.criticalGuardrail'),
  });
  const screeningGuidelineAutoOpen = guidelineTriggers.length > 0;

  return (
    <div className="results-container" role="main">

      <ResultsMetaBar sessionId={sessionId} computedAt={result?.computedAt} part="Pre-PSA · Baseline Assessment" />

      {/* ── Guardrail Alerts ── */}
      {guardrailAlerts?.length > 0 && guardrailAlerts.map(alert => (
        <GuardrailBanner key={alert.code} alert={alert} />
      ))}

      {/* ── Research consent / REDCap status ── */}
      {storageMode === 'cloud' && (
        /* Cloud user — auto-synced if consented */
        <div className={`results-research-badge ${researchConsent ? 'results-research-badge--consented' : 'results-research-badge--private'}`}>
          {researchConsent
            ? <><CheckCircle2Icon size={14} /><span>{t('part1Results.researchBadgeConsented')}</span></>
            : <><CloudIcon size={14} /><span>{t('part1Results.researchBadgePrivate')}</span></>}
        </div>
      )}
      {storageMode === 'local' && researchConsent && (
        /* Local user — must push manually */
        <div className="results-research-submit-row">
          {researchSubmitState === 'success' ? (
            <div className="results-research-badge results-research-badge--consented">
              <CheckCircle2Icon size={14} />
              <span>{t('part1Results.researchSubmitSuccess')}</span>
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
                {researchSubmitState === 'pending' ? t('part1Results.researchSubmitting') : t('part1Results.researchSubmitButton')}
              </button>
              {researchSubmitState === 'error' && (
                <span className="results-research-error">{researchSubmitError}</span>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Shared Decision-Making Framing Card (AUA/SUO 2026 Statement 1) ── */}
      <div role="note" aria-label="Shared decision-making guidance" style={{ background: '#f0fdf4', border: '0.5px solid #86efac', borderLeft: '3px solid #16a34a', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#166534', lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: '7px' }}>
          <CheckCircle2Icon size={14} aria-hidden="true" style={{ color: '#16a34a', flexShrink: 0 }} />
          <span><strong>Shared decision-making tool</strong> (AUA/SUO 2026 Statement 1) — discuss these results with your clinician before acting.</span>
      </div>

      {/* ── Risk Summary Card (v2: gauge + tier side-by-side) ── */}
      <div ref={recommendRef} className={`risk-summary-card ${riskBgClass} res-reveal`} style={{ '--delay': '80ms' }} role="region" aria-label="PSA testing recommendation">
        <div className="v2-res-eyebrow">
          <span>{t('part1Results.eyebrow')}</span>
          <span>{t('part1Results.assessedToday')}</span>
        </div>

        {belowMinAge ? (
          /* ── Under-40: suppress score, show N/A card ── */
          <div className="under-age-notice" role="note">
            <div className="under-age-notice-icon">ℹ️</div>
            <div className="under-age-notice-body">
              <strong>{t('part1Results.underFortyStrong')}</strong>
              <p style={{ marginTop: '6px' }}>
                {t('part1Results.underFortyBody')}
              </p>
            </div>
          </div>
        ) : aboveMaxScreeningAge ? (
          /* ── Over-75: suppress score, refer to life expectancy tool ── */
          <div className="under-age-notice" role="note">
            <div className="under-age-notice-icon">ℹ️</div>
            <div className="under-age-notice-body">
              <strong>{t('part1Results.overSeventyFiveStrong')}</strong>
              <p style={{ marginTop: '6px' }}>
                {t('part1Results.overSeventyFiveBody')}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="v2-gauge-layout">
              <RiskGauge score={gaugeScore} tierKey={epsaTierKey} tierLabel={epsaTierLabel} />
              <div className="v2-tier-info">
                <div className="v2-tier-label">{t('part1Results.psaTestingPriority')}</div>
                <h2 className="v2-tier-title res-tier-pop" style={{ color: tierAccentColor }}>{epsaTierLabel || activeTier}</h2>
                <p className="v2-tier-narr">{getTierDescription(epsaTierKey, activeTier)}</p>
                {guidelineTrack && epsaExtendedProfile && (
                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '8px', fontSize: '0.8125rem', color: 'var(--ink-700)' }} title="Guideline-based score reflects only age, race, family history, and germline mutation status. ePSA extended profile adds lifestyle and research-based factors as context.">
                    <span><strong style={{ color: 'var(--brand-700)' }}>Guideline score:</strong> {guidelineTrack.percent}%</span>
                    <span><strong style={{ color: 'var(--ink-700)' }}>ePSA extended:</strong> {epsaExtendedProfile.percent}%</span>
                  </div>
                )}
                {(() => {
                  // Show "Based on X of 27 inputs you answered" so users see the prediction
                  // confidence and which inputs they skipped. Total = 27 distinct items
                  // (matches Part1Form's totalQuestions).
                  const skippedFields = Array.isArray(formData?.skippedFields) ? formData.skippedFields : [];
                  if (!skippedFields.length) return null;
                  const total = 25;
                  let skipped = 0;
                  for (const f of skippedFields) {
                    if (f === 'ipss') skipped += 7;
                    else if (f === 'shim') skipped += 5;
                    else skipped += 1;
                  }
                  const answered = Math.max(0, total - skipped);
                  const pct = Math.round((answered / total) * 100);
                  return (
                    <div style={{ marginTop: '8px', padding: '6px 10px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.8125rem', color: '#374151' }}>
                      <strong>{t('part1Results.basedOnSummary', { answered, total, pct })}</strong> {t('part1Results.skippedNote', { skipped })}
                    </div>
                  );
                })()}
              </div>
            </div>

          </>
        )}
      </div>

      {/* ── Guideline Deviation Banner ── */}
      {psaRecommendReason === 'score_threshold' && !belowMinAge && !aboveMaxScreeningAge && (() => {
        const NON_GUIDELINE = new Set(['IPSS total', 'BMI', 'Exercise', 'Smoking', 'Diet pattern', 'Inflammation history', '9/11 / Chemical exposure', 'SHIM total', 'Comorbidity burden', 'Family history (breast/ovarian/pancreatic)', 'Ashkenazi Jewish ancestry']);
        const nonGuidelineFactors = (itemImpacts || []).filter(b => b.points > 0 && NON_GUIDELINE.has(b.item)).map(b => b.item);
        return <GuidelineDeviationBanner age={age} nonGuidelineFactors={nonGuidelineFactors} />;
      })()}


      {/* ── Add PSA CTA ── */}
      {onContinueToPostPSA && (
        <div
          className="psa-cta-banner res-reveal"
          style={{ '--delay': '460ms' }}
          role="complementary"
          aria-label="Add PSA result"
        >
          <div className="psa-cta-banner__text">
            <p className="psa-cta-banner__title">
              {t('part1Results.psaCtaTitle')}
            </p>
            <p className="psa-cta-banner__desc">
              {t('part1Results.psaCtaDesc')}
            </p>
          </div>
          <button
            type="button"
            onClick={onContinueToPostPSA}
            className="psa-cta-banner__btn"
          >
            {t('part1Results.psaCtaButton')} <ArrowRightIcon size={15} />
          </button>
        </div>
      )}

      {/* ── Guideline-Recommended Next Step (compact strip) ── */}
      {!belowMinAge && !aboveMaxScreeningAge && (() => {
        const ageNum = Number(age) || 0;
        const isElevatedRisk = isHighRiskFlagged ||
          formData?.race === 'black' || formData?.race === 'african-american' ||
          Number(formData?.familyHistory) > 0 || ['yes','lynch','other_elevated','other_unknown'].includes(formData?.brcaStatus);
        const startAgeNum = isElevatedRisk ? 40 : 45;
        const alreadyStarted = ageNum >= startAgeNum;
        const inScreeningRange = ageNum >= 50 && ageNum <= 69;
        const nextStep = !alreadyStarted
          ? `Start PSA screening at age ${isElevatedRisk ? '40' : '45'} (AUA/SUO Stmt ${isElevatedRisk ? '5' : '2'})`
          : ageNum < 50
            ? `You are in the early-screening window — discuss with your clinician (AUA/SUO Stmt ${isElevatedRisk ? '5' : '4'})`
            : inScreeningRange
              ? 'Re-screen every 2–4 years while aged 50–69 (AUA/SUO Stmt 6)'
              : 'Age 70+: shared decision-making required — discuss with your clinician (AUA/SUO Stmt 7)';
        return (
          <div style={{ background: '#eff6ff', border: '0.5px solid #93c5fd', borderLeft: '3px solid #2563eb', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '7px' }}>
            <AlertCircleIcon size={14} aria-hidden="true" style={{ color: '#2563eb', flexShrink: 0 }} />
            <span><strong>Guideline next step:</strong> {nextStep}</span>
          </div>
        );
      })()}

      {/* ── Expandable sections ── */}
      <div className="detail-sections res-reveal" style={{ '--delay': '500ms' }}>

        <CollapsibleSection
          id="screening-guidelines"
          title={t('part1Results.sectionScreeningGuidelines')}
          defaultOpen={false}
          highlight={screeningGuidelineAutoOpen}
        >
          {(() => {
            const ageNum = Number(age);
            const isBlack = formData?.race === 'black' || formData?.race === 'african-american';
            const hasFamilyHistory = Number(formData?.familyHistory) > 0;
            const hasBrca = ['yes','lynch','other_elevated','other_unknown'].includes(formData?.brcaStatus);
            const isHighRisk = isBlack || hasFamilyHistory || hasBrca;
            return (
              <Part1GuidelineJourney
                age={ageNum}
                isHighRisk={isHighRisk}
                priority={result?.priority}
                expandableDetail={<AUAGuidelineCriteria age={ageNum} isHighRisk={isHighRisk} />}
              />
            );
          })()}
        </CollapsibleSection>

        {!belowMinAge && !aboveMaxScreeningAge && itemImpacts.length > 0 && (() => {
          const SKIP_ITEM_MAP = {
            'IPSS total': 'ipss',
            'Exercise': 'exercise',
            'Smoking': 'smoking',
            'Diet pattern': 'dietPattern',
            'Family history': 'familyHistory',
            'Genetic mutation': 'brcaStatus',
            'Inflammation history': 'inflammationHistory',
            '9/11 / Chemical exposure': 'chemicalExposure',
            'SHIM total': 'shim',
            'Comorbidity burden': 'comorbidityScore',
          };
          const skippedSet = new Set(Array.isArray(formData?.skippedFields) ? formData.skippedFields : []);
          const isImpactSkipped = (itemName) => {
            const key = SKIP_ITEM_MAP[itemName];
            return key ? skippedSet.has(key) : false;
          };
          return (
          <div ref={breakdownRef}>
            <CollapsibleSection title={t('part1Results.sectionWhatDroveScore')} defaultOpen={false}>
              <p>{t('part1Results.scoreIntro')}</p>
              <p style={{ fontSize: '12px', color: '#4b5563', margin: '4px 0 10px' }}>
                {t('part1Results.factorBadgeExplanation.before')} <FactorSourceBadge itemName="Age" /> {t('part1Results.factorBadgeExplanation.middle')} <FactorSourceBadge itemName="Exercise" /> {t('part1Results.factorBadgeExplanation.after')}
              </p>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '3px solid #2563eb', borderRadius: '6px', padding: '8px 12px', marginBottom: '10px', fontSize: '11.5px', color: '#374151', lineHeight: 1.6 }}>
                <strong style={{ color: '#1e40af' }}>How point values were chosen:</strong> Each factor was evaluated against our internal dataset (N=100, AUC=0.56) and published literature. Where data and literature agree, data informs the weight. Where they conflict — due to referral bias, sparse positives, or selection effects in our cohort — the well-replicated literature OR is used instead. Click <em>"Why this score?"</em> under any row to see the data coefficient, literature OR, and the decision rationale.
              </div>
              {(() => {
                const sortedByImpact = [...itemImpacts].sort((a, b) => Number(b.points) - Number(a.points));
                const TOP_N = 4;
                const visibleImpacts = showAllImpacts ? itemImpacts : sortedByImpact.slice(0, TOP_N);
                const hiddenCount = itemImpacts.length - TOP_N;
                return (
                  <>
                    <div className="impact-table-wrap">
                      <table className="impact-table" aria-label="Item impact breakdown table">
                        <thead><tr><th>{t('part1Results.tableHeaderItem')}</th><th>{t('part1Results.tableHeaderInput')}</th><th>{t('part1Results.tableHeaderImpact')}</th><th>{t('part1Results.tableHeaderPoints')}</th></tr></thead>
                        <tbody>
                          {visibleImpacts.map((impact) => {
                            const skipped = isImpactSkipped(impact.item);
                            return (
                              <React.Fragment key={impact.item}>
                                <tr style={skipped ? { opacity: 0.7 } : undefined}>
                                  <td>{impact.item}<FactorSourceBadge itemName={impact.item} /><SourcesPopover itemName={impact.item} /></td>
                                  <td>
                                    {skipped ? (
                                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151', fontSize: '0.75rem', fontWeight: 600, fontStyle: 'italic' }}>
                                        {t('part1Results.skippedNeutralDefault')}
                                      </span>
                                    ) : impact.value}
                                  </td>
                                  <td>
                                    <div className="impact-bar-track" aria-hidden="true">
                                      <div className={`impact-bar-fill ${impact.points > 0 ? 'impact-bar-fill--active' : 'impact-bar-fill--zero'}`} style={{ width: `${Math.min(100, ((Number(impact.points) || 0) / 20) * 100)}%` }} />
                                    </div>
                                  </td>
                                  <td><span className={`impact-points-badge ${impact.points > 0 ? 'impact-points-badge--active' : 'impact-points-badge--zero'}`}>{impact.points > 0 ? `+${impact.points}` : '0'}</span></td>
                                </tr>
                                <RationaleRow rationale={impact.rationale} />
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={3}>{t('part1Results.totalScoreContribution')}</td>
                            <td><span className="impact-total-badge impact-total-badge--counting">{animImpactScore}{Number.isFinite(impactMaxScore) ? ` / ${impactMaxScore}` : ''}{impactPercent != null ? ` (${impactPercent}%)` : ''}</span></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    {itemImpacts.length > TOP_N && (
                      <button
                        type="button"
                        onClick={() => setShowAllImpacts(v => !v)}
                        style={{ marginTop: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 0' }}
                        aria-expanded={showAllImpacts}
                      >
                        {showAllImpacts
                          ? <><ChevronUpIcon size={13} aria-hidden="true" /> Show summary (top {TOP_N} factors)</>
                          : <><ChevronDownIcon size={13} aria-hidden="true" /> Show all {itemImpacts.length} factors ({hiddenCount} more)</>
                        }
                      </button>
                    )}
                    {Number.isFinite(empiricalRate) && empiricalRate > 0 && Number.isFinite(empiricalRateN) && (
                      <p style={{ fontStyle: 'italic', fontSize: '11px', color: '#6b7280', marginTop: '10px', lineHeight: 1.5 }}>
                        {t('part1Results.empiricalProbabilityText', {
                          n: empiricalRateN,
                          events: empiricalRateEvents ?? '—',
                          rate: Math.round(empiricalRate * 100),
                          ciLo: Math.round((empiricalRateCiLo ?? 0) * 100),
                          ciHi: Math.round((empiricalRateCiHi ?? 0) * 100),
                        })}
                      </p>
                    )}
                  </>
                );
              })()}
            </CollapsibleSection>
          </div>
          );
        })()}

        {onShowModelDocs && (
          <div className="model-docs-btn-row">
            <button type="button" className="btn-results btn-results--outline model-docs-btn" onClick={onShowModelDocs}>
              <ExternalLinkIcon size={14} />
              <span>{t('part1Results.viewModelDocs')}</span>
            </button>
          </div>
        )}

      </div>

      {/* ── Urologist Finder ── */}
      <CollapsibleSection title="Find a Board-Certified Urologist Near You">
        <UrologistFinder flowMode={flowMode} />
      </CollapsibleSection>

      {/* ── Action buttons ── */}
      <div className="results-actions res-reveal" style={{ '--delay': '640ms' }}>
        <div className="results-actions-row results-actions-row--primary">
          <button className="btn-results btn-results--outline" onClick={onEditAnswers}><ArrowLeftIcon size={16} /><span>{t('part1Results.btnEditAnswers')}</span></button>
          {confirmStartOver ? (
            <div className="start-over-confirm">
              <span className="start-over-confirm-msg">This will erase all your answers. Are you sure?</span>
              <div className="start-over-confirm-btns">
                <button className="btn-results btn-results--danger" onClick={onStartOver}><RefreshCwIcon size={14} /><span>Yes, start over</span></button>
                <button className="btn-results btn-results--outline" onClick={() => setConfirmStartOver(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="btn-results btn-results--danger-outline" onClick={() => setConfirmStartOver(true)}><RefreshCwIcon size={16} /><span>{t('part1Results.btnStartOver')}</span></button>
          )}
        </div>
        <div className="results-actions-row">
          <button className="btn-results btn-results--solid" onClick={() => window.print()}><PrinterIcon size={16} /><span>{t('part1Results.btnPrintResults')}</span></button>
          <button className="btn-results btn-results--outline" onClick={() => setShowPrintableForm(true)}><FileTextIcon size={16} /><span>{t('part1Results.btnPrintableForm')}</span></button>
          {(storageMode === 'local' || storageMode === 'cloud') && (
            <>
              <button className="btn-results btn-results--outline" onClick={() => {
                try {
                  if (!formData || Object.keys(formData).length === 0) throw new Error('No form data');
                  const exportData = { version: '1.0', exportDate: new Date().toISOString(), part: 'part1', formData, userInfo: { email: userEmail || null, phone: userPhone || null, sessionId: sessionId || null } };
                  const url = URL.createObjectURL(new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' }));
                  const a = Object.assign(document.createElement('a'), { href: url, download: `epsa-part1-data-${new Date().toISOString().split('T')[0]}.json` });
                  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                } catch { setExportError(t('part1Results.exportFailedAlert')); }
              }}><DownloadIcon size={16} /><span>{t('part1Results.btnExportJson')}</span></button>
              <button className="btn-results btn-results--outline" onClick={handleExportCsv}><DownloadIcon size={16} /><span>{t('part1Results.btnExportCsv')}</span></button>
            </>
          )}
        </div>
      </div>

      {/* ── Export error ── */}
      {exportError && (
        <div role="alert" style={{ margin: '0 0 0.75rem', padding: '0.6rem 0.875rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{exportError}</span>
          <button onClick={() => setExportError(null)} aria-label="Dismiss" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', marginLeft: '0.5rem', display: 'inline-flex', alignItems: 'center' }}><XIcon size={14} aria-hidden="true" /></button>
        </div>
      )}

      {/* ── Disclaimer (below buttons) ── */}
      <CollapsibleSection title={t('part1Results.sectionDisclaimer')} defaultOpen={false}>
        <p className="detail-disclaimer">{t('part1Results.disclaimerText')}</p>
        <p className="detail-attribution">{t('part1Results.disclaimerAttribution')}</p>
        <div className="detail-notice-box" style={{ borderLeft: '3px solid #d97706', background: '#fffbeb', marginBottom: '0.75rem' }}>
          <strong>Model Outcome Definition:</strong> This model was trained and validated to detect <strong>Grade Group ≥3</strong> (Gleason score ≥4+3) prostate cancer in a referral cohort (N=94, 23 events). The AUA/SUO 2026, NCCN 2026, and ERSPC define clinically significant prostate cancer (csPCa) as <strong>Grade Group ≥2</strong> (Gleason ≥3+4). Model performance for detecting Grade Group 2 specifically has not been separately validated. Results should be interpreted in the context of this limitation.
        </div>
        <div className="detail-notice-box">
          <strong>Clinical Deployment Notice:</strong> This application uses Google Firebase, which is HIPAA-eligible only under an executed Business Associate Agreement (BAA). Until a BAA is confirmed, do not enter Protected Health Information (PHI) in a clinical context. Institutional or clinical deployment requires a signed BAA with the platform provider.
          <br /><br />
          <strong>Data Retention:</strong> Anonymous research data submitted under consent may be retained for up to 7 years in accordance with IRB protocol STUDY-14-00050.
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default Part1Results;
