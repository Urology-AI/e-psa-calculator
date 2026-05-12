import React, { useState, useEffect } from 'react';
import './Part2Results.css';
import './Part1Results.css';
import './epsa-v2-layout.css';
import PrintableForm from './PrintableForm';
import RiskGauge from './RiskGauge';
import ResultsLoading from './ResultsLoading';
import InfoIcon from './InfoIcon';
import { fieldReferences } from '../utils/fieldReferences';
import { downloadCsv, buildPart2CsvRows } from '../utils/exportCsv';
import {
  ArrowLeftIcon, RefreshCwIcon, PrinterIcon, FileTextIcon, CloudIcon,
  DownloadIcon, ChevronDownIcon, ChevronUpIcon, FlaskConicalIcon,
  CheckCircle2Icon, AlertTriangleIcon, AlertCircleIcon, ExternalLinkIcon,
  MapPinIcon, PillIcon, ScanEyeIcon,
} from 'lucide-react';

/* ─── Collapsible ─── */
const CollapsibleSection = ({ title, children, defaultOpen = false, className = '' }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`collapsible-section${className ? ` ${className}` : ''}`}>
      <button className="collapsible-toggle" onClick={() => setOpen(!open)} aria-expanded={open} type="button">
        <span>{title}</span>
        {open ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  );
};

/* ─── Risk Level Bar ─── */
const RiskLevelBar = ({ riskClass }) => {
  const levels = [
    { id: 'low',               label: 'Low',      color: '#16a34a' },
    { id: 'intermediate-low',  label: 'Int-Low',  color: '#2563eb' },
    { id: 'intermediate-high', label: 'Int-High', color: '#d97706' },
    { id: 'high',              label: 'High',     color: '#dc2626' },
  ];
  const cls = String(riskClass || '').toLowerCase();
  const activeIdx = cls === 'very-high-risk' ? 3 : cls === 'high-risk' ? 2 : cls === 'moderate-risk' ? 1 : 0;
  return (
    <div className="p2r-risk-bar" role="group" aria-label="Risk level bar">
      {levels.map(({ id, label, color }, i) => {
        const isActive = i === activeIdx;
        return (
          <div key={id} className={`p2r-risk-bar-segment ${isActive ? 'p2r-risk-bar-segment--active' : ''}`}
            style={isActive ? { background: color, color: '#fff' } : {}} aria-current={isActive ? 'true' : undefined}>
            <span className="p2r-risk-bar-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
};

/* ─── Guardrail Banner ─── */
const GUARDRAIL_CONFIG = {
  critical: { bg: '#fef2f2', border: '#dc2626', labelColor: '#991b1b', icon: '⛔' },
  warning:  { bg: '#fffbeb', border: '#d97706', labelColor: '#92400e', icon: '⚠️' },
  info:     { bg: '#eff6ff', border: '#2563eb', labelColor: '#1e40af', icon: 'ℹ️' },
};
const GuardrailBanner = ({ alert }) => {
  const cfg = GUARDRAIL_CONFIG[alert.level] || GUARDRAIL_CONFIG.info;
  return (
    <div role="alert" style={{ background: cfg.bg, borderLeft: `4px solid ${cfg.border}`, borderRadius: '8px', padding: '12px 14px', margin: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontSize: '15px' }}>{cfg.icon}</span>
        <span style={{ fontWeight: 700, fontSize: '13px', color: cfg.labelColor }}>{alert.title}</span>
      </div>
      <p style={{ margin: 0, fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>{alert.message}</p>
    </div>
  );
};

/* ─── Guideline Support Badge ─── */
const GUIDELINE_LABELS = { aua: 'AUA/SUO', nccn: 'NCCN', eau: 'EAU', erspc: 'ERSPC' };
const GuidelineSupportBadge = ({ support, count, variant = 'light' }) => {
  const [showTip, setShowTip] = useState(false);
  if (!support) return null;
  const total = 4;
  const n = typeof count === 'number' ? count : Object.values(support).filter(Boolean).length;
  const strong = n >= 3;
  const partial = n >= 1 && n < 3;
  const colour = strong ? '#16a34a' : partial ? '#d97706' : '#6b7280';
  const bg = variant === 'dark' ? 'rgba(255,255,255,0.18)' : (strong ? '#f0fdf4' : partial ? '#fffbeb' : '#f3f4f6');
  const border = variant === 'dark' ? 'rgba(255,255,255,0.35)' : colour;
  const text = variant === 'dark' ? '#fff' : colour;
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 8px', background: bg, border: `1px solid ${border}`, borderRadius: '999px', fontSize: '11px', fontWeight: 600, color: text, letterSpacing: '0.02em', cursor: 'help' }}
      onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}
      onFocus={() => setShowTip(true)} onBlur={() => setShowTip(false)}
      tabIndex={0} role="img"
      aria-label={`Supported by ${n} of ${total} guidelines`}
    >
      <span aria-hidden="true">{strong ? '✓' : partial ? '◐' : '○'}</span>
      Supported by {n} / {total} guidelines
      {showTip && (
        <span role="tooltip" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 10, background: '#111827', color: '#fff', padding: '8px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, lineHeight: 1.5, whiteSpace: 'nowrap', boxShadow: '0 6px 14px rgba(0,0,0,0.18)' }}>
          {Object.entries(GUIDELINE_LABELS).map(([k, label]) => (
            <span key={k} style={{ display: 'block' }}>
              <span style={{ color: support[k] ? '#4ade80' : '#9ca3af', marginRight: '6px' }}>{support[k] ? '✓' : '—'}</span>
              {label}
            </span>
          ))}
        </span>
      )}
    </span>
  );
};

/* ─── PSA context labels for patients ─── */
const PSA_TIER_CONTEXT = {
  'low':               { label: 'Low range',              detail: 'Reassuring. Continue routine screening.',             color: '#16a34a' },
  'intermediate-low':  { label: 'Low–intermediate range', detail: 'Warrants monitoring. Ask your doctor about interval.', color: '#2563eb' },
  'intermediate-high': { label: 'Elevated',               detail: 'Warrants evaluation by a urologist.',                 color: '#d97706' },
  'high':              { label: 'Significantly elevated',  detail: 'Prompt urology referral recommended.',               color: '#dc2626' },
};

/* ─── PI-RADS context labels for patients ─── */
const PIRADS_CONTEXT = [
  { label: 'No reportable lesion', color: '#16a34a', detail: 'MRI found no significant lesion.' },
  { label: 'Very unlikely', color: '#16a34a' },
  { label: 'Unlikely',      color: '#16a34a' },
  { label: 'Uncertain',     color: '#2563eb' },
  { label: 'Likely suspicious', color: '#d97706' },
  { label: 'Highly suspicious', color: '#dc2626' },
];

/* ─── Gauge tiers for Part 2 ─── */
const P2_GAUGE_TIERS = [
  { key: 'low',      label: 'Low',          color: '#16a34a' },
  { key: 'moderate', label: 'Intermediate', color: '#d97706' },
  { key: 'high',     label: 'High',         color: '#dc2626' },
];

/* ─── Main Component ─── */
const Part2Results = ({
  result, preResult, preData, onEditAnswers, onStartOver, storageMode,
  postData, sessionId = null, userEmail = null, userPhone = null,
  onSaveToCloud = null, cloudAvailable = false,
  saveToCloudPending = false, saveToCloudError = null,
  onShowModelDocs = null, onContinueToMRI = null,
}) => {
  const [showPrintableForm, setShowPrintableForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!result) return;
    const loadingTimer = setTimeout(() => setIsLoading(false), 900);
    return () => clearTimeout(loadingTimer);
  }, [result]);

  const handleExportCsv = () => {
    const rows = buildPart2CsvRows(postData, preResult, result, {});
    downloadCsv(`ePSA_Part2_Results_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  if (showPrintableForm) {
    return (
      <PrintableForm
        formData={{ ...(preData || {}), ...(postData || {}), ipssTotal: preResult?.ipssTotal, shimTotal: preResult?.shimTotal, score: preResult?.score, scoreRange: preResult?.scoreRange, confidenceRange: preResult?.confidenceRange, risk: preResult?.risk, action: preResult?.action, bmi: preResult?.bmi ?? preData?.bmi, age: preResult?.age ?? preData?.age }}
        onBack={() => setShowPrintableForm(false)}
      />
    );
  }

  if (!result) return <div className="p2r-container"><p className="p2r-empty">No results available.</p></div>;
  if (isLoading) return (
    <div className="p2r-container">
      <ResultsLoading
        label="ePSA · Part 2"
        message="Reviewing guidelines for your PSA…"
        detail="Checking AUA / NCCN / EAU next-step guidance based on your PSA result and Part 1 profile."
      />
    </div>
  );

  const {
    riskCat, riskClass, nextSteps, psaValue, psaAdjusted, psaAdjustedFlag,
    isOtherHormonal, psaTier, biopsyRecommended, biopsyReason, biopsyMessage,
    biopsyGuidelineSupport, biopsyGuidelineSupportCount,
    tierGuidelineSupport, tierGuidelineSupportCount,
    mriRecommended, mriRecommendMessage,
    pathwayMode = 'post_psa', empiricalProbabilityText,
    epsaTierKey, guardrailAlerts = [],
    discordanceFlag, lowPsaWarning,
  } = result;

  const getRiskColor = (rc) => {
    const cls = String(rc || '').toLowerCase();
    if (cls.includes('very') || (cls.includes('high') && !cls.includes('mod'))) return '#dc2626';
    if (cls.includes('moderate')) return '#d97706';
    return '#16a34a';
  };
  const riskColor = getRiskColor(riskClass);
  const cleanRiskCat = (riskCat || '').replace(/[🟢🟡🟠🔴]/g, '').trim();

  const riskBgClass =
    riskColor === '#dc2626' ? 'risk-card--elevated' :
    riskColor === '#d97706' ? 'risk-card--moderate' :
    'risk-card--lower';

  const isVeryHighRisk = String(riskClass || '').toLowerCase().includes('very');

  const p2GaugeTierKey = (() => {
    if (epsaTierKey === 'high') return 'high';
    if (epsaTierKey === 'intermediate-high') return 'moderate';
    return 'low';
  })();

  const p2GaugeScore = (() => {
    if (isVeryHighRisk) return 92;
    if (epsaTierKey === 'high') return 78;
    if (epsaTierKey === 'intermediate-high') return 50;
    if (epsaTierKey === 'intermediate-low') return 28;
    return 17;
  })();

  const psaTierCtx = PSA_TIER_CONTEXT[psaTier?.toLowerCase()] || PSA_TIER_CONTEXT['intermediate-high'];
  const _piradsRaw = postData?.pirads;
  const piradsVal = (_piradsRaw !== null && _piradsRaw !== undefined && _piradsRaw !== '')
    ? Number(_piradsRaw)
    : null;
  const piradsCtx = (piradsVal != null && !isNaN(piradsVal))
    ? PIRADS_CONTEXT[Math.min(5, Math.max(0, piradsVal))]
    : null;

  const heroVariant = biopsyRecommended
    ? (biopsyReason === 'high_risk_discordance' ? 'amber' : 'red')
    : 'blue';
  const heroIcon = heroVariant === 'red' ? <AlertCircleIcon size={20} /> : heroVariant === 'amber' ? <AlertTriangleIcon size={20} /> : <FlaskConicalIcon size={20} />;
  const heroTitle = heroVariant === 'red' ? 'Biopsy Discussion Recommended' : heroVariant === 'amber' ? 'Urologist Review Recommended' : 'Next Steps';

  /* Plain-language recommendation based on tier — aligns with AUA/NCCN */
  const tierRecommendation = (() => {
    if (epsaTierKey === 'high' && isVeryHighRisk) return 'Your combined risk is very high. AUA and NCCN guidelines recommend prompt urologist referral and strong consideration of biopsy. Additional staging imaging may also be discussed. This is an urgent conversation to have with your physician.';
    if (epsaTierKey === 'high') return 'Your combined risk is high. AUA and NCCN guidelines recommend prompt referral to a urologist. A urologist will discuss whether a biopsy is appropriate — this is a conversation, not an automatic decision.';
    if (epsaTierKey === 'intermediate-high') return 'Your combined risk warrants further evaluation. AUA and NCCN guidelines recommend speaking with a urologist. An MRI before biopsy is often the recommended next step to get more information.';
    if (epsaTierKey === 'intermediate-low') return 'Your combined risk is low-intermediate. AUA and NCCN guidelines recommend continued monitoring. Talk with your doctor about how often to repeat your PSA — typically every 1–2 years.';
    return 'Your combined risk is low. AUA and NCCN guidelines are reassuring at this level. Continue routine PSA screening — a repeat test in 2–4 years is typically appropriate.';
  })();

  const heroMessage = biopsyRecommended && biopsyMessage ? biopsyMessage : tierRecommendation;

  /* Surface discordance or low-PSA context as a single calm footnote in the hero */
  const hasContextNote = discordanceFlag || lowPsaWarning;
  const contextNote = lowPsaWarning
    ? 'Note: Even with a low PSA, your background risk factors (race, family history, or genetic mutation) mean closer monitoring is warranted per AUA/NCCN guidelines.'
    : discordanceFlag?.direction === 'psa_higher'
    ? `Note: Your PSA level is in a higher range than your combined tier alone suggests. Your PSA result is an independent signal — discuss it with your physician regardless of your overall profile.`
    : discordanceFlag
    ? 'Note: Your Part 1 risk profile raises your combined tier above what PSA alone would suggest. Both factors matter for your overall risk.'
    : null;

  /* Plain-language tier description for "Understanding Your Result" */
  const tierExplanation = (() => {
    if (epsaTierKey === 'high') return 'A high combined risk tier means your PSA level — together with your Part 1 risk profile — falls in the range where urologists typically discuss biopsy. This does not mean you have cancer; it means more investigation is warranted.';
    if (epsaTierKey === 'intermediate-high') return 'An intermediate-high combined risk tier means your PSA level and risk profile suggest a urology consultation is appropriate. An MRI is often recommended before any biopsy decision to get a clearer picture.';
    if (epsaTierKey === 'intermediate-low') return 'An intermediate-low combined risk tier means your PSA is mildly elevated or your background risk factors are present, but there is no immediate cause for concern. Continued monitoring with your doctor is the right approach.';
    return 'A low combined risk tier means your PSA level and risk profile are reassuring. No additional testing is needed right now — continue with routine screening as recommended by your doctor.';
  })();

  return (
    <div className="p2r-container" role="main">

      {/* ── Cloud row ── */}
      {(storageMode === 'local' && cloudAvailable && onSaveToCloud) && (
        <div className="p2r-cloud-row">
          <button type="button" className="p2r-btn-move-cloud" onClick={onSaveToCloud} disabled={saveToCloudPending}>
            <CloudIcon size={16} />{saveToCloudPending ? 'Saving…' : 'Save to Cloud'}
          </button>
          {saveToCloudError && <span className="p2r-cloud-err">{saveToCloudError}</span>}
        </div>
      )}

      {/* ── PSA Adjustment ── */}
      {psaAdjustedFlag && (
        <div className="v2-ari-notice" role="alert">
          <PillIcon size={18} className="v2-ari-notice-icon" />
          <div className="v2-ari-notice-body">
            <div className="v2-ari-notice-title">PSA ADJUSTED FOR 5-ARI MEDICATION</div>
            <div className="v2-ari-notice-pills">
              <div className="v2-ari-pill v2-ari-pill--reported">Reported: <strong>{psaValue} ng/mL</strong></div>
              <div className="v2-ari-arrow">→</div>
              <div className="v2-ari-pill v2-ari-pill--adjusted">Adjusted: {psaAdjusted} ng/mL (×2)</div>
            </div>
            <p className="v2-ari-notice-text">Finasteride/dutasteride suppress PSA by ~50%. Per AUA/SUO 2026, reported PSA is doubled before risk scoring.</p>
          </div>
        </div>
      )}

      {/* ── Hormonal therapy ── */}
      {isOtherHormonal && (
        <div className="p2r-alert p2r-alert--warning" role="alert">
          <PillIcon size={16} className="p2r-alert-icon" />
          <div>
            <div className="p2r-alert-title">Hormonal Therapy Noted</div>
            <p className="p2r-alert-body">No validated PSA correction exists for this therapy. PSA used as reported — inform your physician.</p>
          </div>
        </div>
      )}

      {/* ── Critical guardrail alerts only (e.g. PSA > 100) ── */}
      {guardrailAlerts?.length > 0 && guardrailAlerts
        .filter(a => a.level === 'critical')
        .map(alert => <GuardrailBanner key={alert.code} alert={alert} />)
      }

      {/* ── Risk Summary Card ── */}
      <div className={`risk-summary-card ${riskBgClass}`} role="region" aria-label="Risk assessment result">
        <div className="v2-res-eyebrow">
          <span>ePSA Guideline-Based Next Steps · Part 2 {pathwayMode === 'post_mri' ? 'PSA + MRI' : 'PSA Only'}</span>
          <span>Assessed today</span>
        </div>

        <div className="v2-gauge-layout">
          <RiskGauge score={p2GaugeScore} tierKey={p2GaugeTierKey} tierLabel={cleanRiskCat} tiers={P2_GAUGE_TIERS} />
          <div className="v2-tier-info">
            <div className="v2-tier-label">Combined Risk Tier</div>
            <h2 className="v2-tier-title" style={{ color: riskColor }}>{cleanRiskCat}</h2>
            <RiskLevelBar riskClass={riskClass} />
          </div>
        </div>

        {/* ── PSA prominently displayed ── */}
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

          {postData?.knowPirads && piradsVal != null && piradsCtx && (
            <div className="p2r-key-input">
              <div className="p2r-key-input-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                MRI PI-RADS
                <InfoIcon {...fieldReferences.part2.pirads} />
              </div>
              <div className="p2r-key-input-value" style={{ color: piradsCtx.color }}>
                {piradsVal === 0 ? '—' : piradsVal}
                {piradsVal !== 0 && <span className="p2r-key-input-unit"> / 5</span>}
              </div>
              <div className="p2r-key-input-tier" style={{ color: piradsCtx.color }}>{piradsCtx.label}</div>
              {piradsCtx.detail && <div className="p2r-key-input-detail">{piradsCtx.detail}</div>}
            </div>
          )}

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

      {/* ── MRI Recommendation (post_psa only) ── */}
      {pathwayMode === 'post_psa' && (
        <div className={`v2-psa-hero v2-psa-hero--${mriRecommended ? 'amber' : 'blue'}`}>
          <div className="v2-psa-hero-top">
            <div className="v2-psa-hero-icon"><ScanEyeIcon size={20} /></div>
            <div className="v2-psa-hero-body">
              <h3 className="v2-psa-hero-title">
                {mriRecommended ? 'MRI Recommended Before Biopsy' : 'MRI Not Required Right Now'}
              </h3>
              <p className="v2-psa-hero-desc">
                {mriRecommended
                  ? mriRecommendMessage || 'AUA/NCCN/EAU guidelines recommend an mpMRI before any biopsy decision. This gives your doctor a clearer picture and reduces unnecessary procedures.'
                  : 'Your combined ePSA and PSA profile does not currently meet the threshold for an mpMRI. Continue with routine follow-up as directed by your physician.'}
              </p>
            </div>
          </div>
          {onContinueToMRI && mriRecommended && (
            <div className="v2-psa-hero-ctas">
              <button type="button" className="btn-results btn-results--solid v2-psa-hero-btn-solid" onClick={onContinueToMRI}>
                Add MRI Results →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Main Recommendation Hero ── */}
      <div className={`v2-psa-hero v2-psa-hero--${heroVariant}`}>
        <div className="v2-psa-hero-top">
          <div className="v2-psa-hero-icon">{heroIcon}</div>
          <div className="v2-psa-hero-body">
            <h3 className="v2-psa-hero-title">{heroTitle}</h3>
            <p className="v2-psa-hero-desc">{heroMessage}</p>
            {hasContextNote && contextNote && (
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'inherit', opacity: 0.85, fontStyle: 'italic' }}>{contextNote}</p>
            )}
            {(biopsyRecommended && biopsyGuidelineSupport) ? (
              <div style={{ marginTop: '8px' }}>
                <GuidelineSupportBadge support={biopsyGuidelineSupport} count={biopsyGuidelineSupportCount} variant={heroVariant === 'blue' ? 'light' : 'dark'} />
              </div>
            ) : (tierGuidelineSupport ? (
              <div style={{ marginTop: '8px' }}>
                <GuidelineSupportBadge support={tierGuidelineSupport} count={tierGuidelineSupportCount} variant={heroVariant === 'blue' ? 'light' : 'dark'} />
              </div>
            ) : null)}
          </div>
        </div>
        <div className="v2-psa-hero-ctas">
          <a href="https://www.mountsinai.org/care/cancer/services/prostate/mobile-screening" target="_blank" rel="noopener noreferrer" className="btn-results btn-results--solid v2-psa-hero-btn-solid">
            Book urology referral →
          </a>
          <a href="https://www.mountsinai.org/care/urology/team" target="_blank" rel="noopener noreferrer" className="btn-results btn-results--outline v2-psa-hero-btn-outline">
            Meet the urology team ↗
          </a>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="v2-timeline">
        <div className="v2-timeline-head"><span className="v2-timeline-title">What happens next</span></div>
        <div className="v2-timeline-track">
          <div className="v2-timeline-step v2-timeline-step--current">
            <span className="v2-timeline-when">Today</span>
            <span className="v2-timeline-desc">Review these results and share with your GP or urologist</span>
          </div>
          <div className="v2-timeline-step">
            <span className="v2-timeline-when">Week 1</span>
            <span className="v2-timeline-desc">
              {epsaTierKey === 'low'
                ? 'Confirm your next PSA screening date with your doctor'
                : 'Book a urology referral via your GP'}
            </span>
          </div>
          <div className="v2-timeline-step">
            <span className="v2-timeline-when">Week 2–4</span>
            <span className="v2-timeline-desc">
              {epsaTierKey === 'low'
                ? 'Continue monitoring — re-assess with ePSA if your health status changes'
                : 'Attend specialist appointment with your ePSA results'}
            </span>
          </div>
          <div className="v2-timeline-step">
            <span className="v2-timeline-when">Ongoing</span>
            <span className="v2-timeline-desc">Re-assess with ePSA whenever your PSA changes or your health status changes</span>
          </div>
        </div>
      </div>

      {/* ── ESSENTIAL label ── */}
      <div className="v2-essential-label">
        <span className="v2-essential-badge">ESSENTIAL</span>
        <span className="v2-essential-text">Understanding your result</span>
      </div>

      {/* ── Expandable Sections ── */}
      <div className="detail-sections">

        <CollapsibleSection title="Understanding Your Result" defaultOpen>
          <p>{tierExplanation}</p>
          {(nextSteps?.length > 0) && (
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: 1.8, marginTop: '10px' }}>
              {nextSteps.map((step, i) => (
                <li key={i}>{step.replace(' →', '')}</li>
              ))}
            </ul>
          )}
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '10px' }}>
            This result combines your PSA value with your Part 1 risk profile. It is an educational estimate — not a diagnosis. Always confirm any elevated PSA with a repeat test before considering a biopsy, and make decisions with your doctor.
          </p>
        </CollapsibleSection>

        <CollapsibleSection title="Shared Decision-Making" className="sdm-collapsible" defaultOpen>
          <p>Choosing the next step is a joint decision between you and your doctor. Key questions to raise:</p>
          <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: 1.8, marginTop: '6px' }}>
            <li><strong>What does this tier mean for me specifically?</strong> — ask how your PSA trend and personal history affect the picture.</li>
            <li><strong>Should I repeat the PSA first?</strong> — a single elevated result can reflect inflammation, infection, or recent activity.</li>
            <li><strong>Is an MRI recommended before biopsy?</strong> — AUA/NCCN/EAU guidelines now support MRI-targeted biopsy to reduce over-detection.</li>
            <li><strong>What is the urgency?</strong> — most prostate cancers are slow-growing; ask whether a few weeks to gather more information is reasonable.</li>
          </ul>
          <p style={{ fontSize: '0.8rem', color: '#607286', fontStyle: 'italic', marginTop: '8px' }}>
            AUA/SUO 2026 · NCCN v3.2024 · EAU 2024
          </p>
        </CollapsibleSection>

        {onShowModelDocs && (
          <div className="model-docs-btn-row">
            <button type="button" className="btn-results btn-results--outline model-docs-btn" onClick={onShowModelDocs}>
              <ExternalLinkIcon size={14} />
              <span>View Model Documentation</span>
            </button>
          </div>
        )}

        <CollapsibleSection title="Important Disclaimer">
          <p
            className="detail-disclaimer"
            style={{
              padding: '0.75rem 1rem',
              marginBottom: '0.75rem',
              background: 'rgba(217, 119, 6, 0.08)',
              borderLeft: '4px solid #d97706',
              borderRadius: '6px',
              color: '#78350f',
            }}
          >
            <strong>When ePSA and the guideline disagree, the guideline wins.</strong> ePSA is a supportive tool — your doctor and the published AUA/SUO, NCCN, and EAU guidance should drive the decision. Always discuss this result with your GP or urologist before acting on it.
          </p>
          <p className="detail-disclaimer">ePSA is an educational tool, not a medical diagnosis. Results are based on population-level data aligned with AUA/SUO 2026 guideline thresholds. A higher tier means earlier follow-up is recommended — it does not mean you have cancer. Always confirm an elevated PSA with a repeat test before any biopsy, and speak with a physician before making any health decisions.</p>
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
                  const exportData = { version: '1.0', exportDate: new Date().toISOString(), part: 'complete', part1Data: preData || {}, part1Result: preResult || {}, part2Data: postData || {}, part2Result: result || {}, userInfo: { email: userEmail || null, phone: userPhone || null, sessionId: sessionId || null } };
                  const url = URL.createObjectURL(new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' }));
                  const a = Object.assign(document.createElement('a'), { href: url, download: `epsa-complete-data-${new Date().toISOString().split('T')[0]}.json` });
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

export default Part2Results;
