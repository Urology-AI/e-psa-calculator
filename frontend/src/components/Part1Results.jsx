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
 *   age_guideline_55_69       → BLUE  — AUA average-risk window, informational
 *   not_recommended           → GREEN — below threshold, routine
 * ─────────────────────────────────────────────────────────────────────────── */
const PSA_BANNER_CONFIG = {
  high_risk_early_screening: {
    bg: '#fef2f2', border: '#dc2626', iconColor: '#dc2626',
    label: 'PSA SCREENING RECOMMENDED — HIGH-RISK PROFILE', labelColor: '#991b1b',
    Icon: AlertCircleIcon,
    source: 'AUA, NCCN, and ERUS guidelines all support earlier screening for men with Black ancestry or a BRCA mutation. AUA is the most explicit about starting from age 40.',
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
  age_guideline_55_69: {
    bg: '#eff6ff', border: '#2563eb', iconColor: '#2563eb',
    label: 'PSA DISCUSSION RECOMMENDED', labelColor: '#1e40af',
    Icon: InfoIcon,
    source: 'AUA guideline Rec. 4 — all men aged 55–69 should discuss PSA screening with their physician.',
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
    tierRisk, epsaTierKey, epsaTierLabel,
    epsaGuidelineText, itemImpacts = [], isHighRiskFlagged = false,
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


      {/* ── High-risk notice (compact, only when not already covered by PSA banner reason) ── */}
      {isHighRiskFlagged && psaRecommendReason !== 'high_risk_early_screening' && psaRecommendReason !== 'family_history_override' && (
        <div className="high-risk-notice" role="note">
          <AlertTriangleIcon size={14} className="high-risk-notice-icon" />
          <p>
            <strong>High-risk factors detected.</strong> Your score is elevated and you have at least one guideline-recognised high-risk factor (age ≥70, Black ancestry, first-degree family history, BRCA mutation, or multiple comorbidities). Earlier evaluation is recommended.
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

      {/* ── Expandable sections ── */}
      <div className="detail-sections">
        <CollapsibleSection title="About Your Result">
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
        </CollapsibleSection>

        {itemImpacts.length > 0 && (
        <CollapsibleSection title="Risk Factor Breakdown">
          <p>Each risk factor below contributed points toward your score. The total determines your risk tier.</p>
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

        <CollapsibleSection title="Screening Guidelines (AUA / NCCN / ERUS)">
          <p>Three major organisations publish guidelines on when men should consider a PSA test. Here is what each recommends:</p>
          <ul style={{ margin: '8px 0 8px 18px', fontSize: '13px', lineHeight: 1.8, color: '#374151' }}>
            <li><strong>AUA (American Urological Association) 2023/2026</strong> — All men aged 55–69 should talk to their doctor about PSA testing. Men at higher risk — including those with Black ancestry, a family history of prostate cancer, or a BRCA gene mutation — should have that conversation from age 40.</li>
            <li><strong>NCCN (National Comprehensive Cancer Network) 2024</strong> — A first PSA test is recommended at age 45 for most men, or at 40 for higher-risk men. Testing every 1–2 years is suggested between ages 45 and 75, adjusted based on results.</li>
            <li><strong>ERUS (European Guidelines on Prostate Cancer)</strong> — Screening is recommended from age 50 for most men, or from 45 if there are high-risk factors. How often to test is based on the PSA result and the patient's preferences, decided together with a doctor.</li>
          </ul>
          <p>For men at average risk, a typical PSA value considered normal rises slightly with age: roughly 2.5 ng/mL for ages 40–49, 3.5 for ages 50–59, 4.5 for ages 60–69, and 6.5 for ages 70–79.</p>
          <p className="detail-note"><strong>Where the guidelines don't fully agree:</strong> AUA is the most specific about starting at age 40 for high-risk men. NCCN and ERUS agree on high-risk earlier screening but differ slightly on exact ages and frequency. When this tool recommends earlier screening for your profile, a yellow notice appears above explaining why — and encourages you to confirm the right approach with your doctor.</p>
        </CollapsibleSection>

        <CollapsibleSection title="Key Publications">
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '10px' }}>The risk factors used in this tool are based on the following published research studies:</p>
          <ul style={{ margin: '0 0 8px 18px', fontSize: '13px', lineHeight: 1.8, color: '#374151' }}>
            <li>Godtman RA, et al. <em>Eur Urol.</em> 2022 — Race and prostate cancer early detection outcomes.</li>
            <li>Nemesure B, et al. <em>Res Rep Urol.</em> 2022 — Racial disparities in prostate cancer screening uptake.</li>
            <li>Tewari A, et al. <em>Urol Onc.</em> 2005 — Race as a risk factor in prostate cancer prognosis.</li>
            <li>Loeb S, et al. <em>Urology.</em> 2006 — Family history and PSA screening outcomes.</li>
            <li>Giri VN, et al. <em>J Clin Oncol.</em> 2018 — BRCA mutations and prostate cancer risk.</li>
            <li>Hemminki H, et al. <em>Eur Urol Open Sci.</em> 2024 — Hereditary factors and early-onset prostate cancer.</li>
            <li>Su ZT, et al. <em>JAMA Oncol.</em> 2024 — Diet and prostate cancer risk.</li>
            <li>Blanc-Lapierre A, et al. <em>BMC Public Health.</em> 2015 — Lifestyle factors and prostate cancer.</li>
            <li>van Leeuwen PJ, et al. <em>Can J Urol.</em> 2011 — Comorbidities and prostate cancer screening.</li>
            <li>Brawley O. <em>World J Urol.</em> 2012 — Epidemiology of prostate cancer in Black men.</li>
            <li>Andersson SO, et al. <em>Int J Cancer.</em> 1996 — Body mass index and prostate cancer risk.</li>
            <li>Rogers LQ, et al. <em>BMC Public Health.</em> 2008 — Physical activity and prostate cancer.</li>
            <li>Zhu D, et al. <em>Clin Genitourin Cancer.</em> 2022 — Smoking, diet, and urological cancer risk.</li>
            <li>Plaskon LA, et al. <em>Cancer Epidemiol Biomarkers Prev.</em> 2003 — Obesity and prostate cancer detection.</li>
            <li>Tiruye et al. <em>PubMed.</em> 2024 — Impact of comorbidities on prostate cancer-specific mortality.</li>
            <li>Madersbacher S, et al. <em>BJU Int.</em> 2010 — IPSS and lower urinary tract symptoms in prostate cancer context.</li>
          </ul>
          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>All studies are peer-reviewed and indexed in PubMed. Full links available on request.</p>
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