import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import UrologistFinder from './UrologistFinder';
import { functions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import './Part2Results.css';
import './Part1Results.css';
import './epsa-v2-layout.css';
import PrintableForm from './PrintableForm';
import RiskGauge from './RiskGauge';
import AUAScreeningFlowchart, { AUAInitialBiopsyGuidelines } from './AUAFlowchart';
import { Part2GuidelineJourney } from './GuidelineJourney';
import ResultsLoading, { LOADING_SEEN_KEY_P2, PART2_LOADING_STEPS } from './ResultsLoading';
import InfoIcon from './InfoIcon';
import ResultsMetaBar from './ResultsMetaBar';
import { fieldReferences } from '../utils/fieldReferences';
import { downloadCsv, buildPart2CsvRows } from '../utils/exportCsv';
import {
  ArrowLeftIcon, ArrowRightIcon, RefreshCwIcon, PrinterIcon, FileTextIcon, CloudIcon,
  DownloadIcon, ChevronDownIcon, ChevronUpIcon, FlaskConicalIcon,
  CheckCircle2Icon, AlertTriangleIcon, AlertCircleIcon, ExternalLinkIcon,
  MapPinIcon, PillIcon, UsersIcon,
} from 'lucide-react';

/* ─── Count-up hook for PSA value animation ─── */
const useCountUpFloat = (target, decimals = 1, duration = 950, delayMs = 800) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const n = parseFloat(target) || 0;
    if (n <= 0) return;
    const startTs = performance.now() + delayMs;
    let raf;
    const tick = (now) => {
      if (now < startTs) { raf = requestAnimationFrame(tick); return; }
      const t = Math.min((now - startTs) / duration, 1);
      setValue(parseFloat(((1 - Math.pow(1 - t, 3)) * n).toFixed(decimals)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delayMs]);
  return value;
};

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
  const { t } = useTranslation();
  const levels = [
    { id: 'low',               label: t('part2Results.tiers.riskBar.low'),              color: '#16a34a' },
    { id: 'intermediate-low',  label: t('part2Results.tiers.riskBar.intermediateLow'),  color: '#2563eb' },
    { id: 'intermediate-high', label: t('part2Results.tiers.riskBar.intermediateHigh'), color: '#d97706' },
    { id: 'high',              label: t('part2Results.tiers.riskBar.high'),             color: '#dc2626' },
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

/* ─── Notice Item ─── */
const NoticeItem = ({ label, children }) => (
  <li style={{ marginBottom: '6px', fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>
    <strong style={{ color: '#92400e' }}>{label}: </strong>
    {children}
  </li>
);

/* ─── Modal Info Icon (alias for InfoIcon) ─── */
const ModalInfoIcon = InfoIcon;

/* ─── Guideline Support Badge ─── */
const GUIDELINE_LABELS = { aua: 'AUA/SUO', nccn: 'NCCN', eau: 'EAU', erspc: 'ERSPC' };
const GuidelineSupportBadge = ({ support, count, variant = 'light' }) => {
  const [showTip, setShowTip] = useState(false);
  if (!support) return null;
  const total = 4;
  const n = typeof count === 'number' ? count : Object.values(support).filter(Boolean).length;
  const strong = n >= 3;
  const partial = n >= 1 && n < 3;
  /* WCAG AA contrast-safe colors: text on colored backgrounds at 11px font-weight 600 */
  const colour = strong ? '#166534' : partial ? '#92400e' : '#374151';
  const bg = variant === 'dark' ? 'rgba(255,255,255,0.18)' : (strong ? '#f0fdf4' : partial ? '#fffbeb' : '#f3f4f6');
  const border = variant === 'dark' ? 'rgba(255,255,255,0.35)' : colour;
  const text = variant === 'dark' ? '#fff' : colour;
  const supportedNames = Object.entries(support).filter(([, v]) => v).map(([k]) => GUIDELINE_LABELS[k]).join(', ') || 'none';
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 8px', background: bg, border: `1px solid ${border}`, borderRadius: '999px', fontSize: '11px', fontWeight: 600, color: text, letterSpacing: '0.02em', cursor: 'help' }}
      onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}
      onFocus={() => setShowTip(true)} onBlur={() => setShowTip(false)}
      tabIndex={0} role="img"
      aria-label={`Supported by ${n} of ${total} guidelines: ${supportedNames}`}
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

/* ─── PSA context colors (labels resolved via i18n inside component) ─── */
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

/* ─── PI-RADS context colors (labels resolved via i18n inside component) ─── */
const PIRADS_COLORS = ['#16a34a', '#16a34a', '#16a34a', '#2563eb', '#d97706', '#dc2626'];

/* ─── Gauge tier colors for Part 2 ─── */
const P2_GAUGE_COLORS = { low: '#16a34a', moderate: '#d97706', high: '#dc2626' };


/* ─── Main Component ─── */
const Part2Results = ({
  result, preResult, preData, onEditAnswers, onStartOver, storageMode,
  postData, sessionId = null, userEmail = null, userPhone = null,
  onSaveToCloud = null, cloudAvailable = false,
  saveToCloudPending = false, saveToCloudError = null,
  researchConsent = false,
  onShowModelDocs = null, onContinueToMRI = null,
  flowMode = 'public',
  onSubmitToSinai = null,
}) => {
  const { t } = useTranslation();
  const [showPrintableForm, setShowPrintableForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const recommendRef = useRef(null);
  const [researchSubmitState, setResearchSubmitState] = useState('idle'); // idle | pending | success | error
  const [researchSubmitError, setResearchSubmitError] = useState(null);
  const [confirmStartOver, setConfirmStartOver] = useState(false);
  // Hook must be before early returns — animates the PSA value on reveal
  const rawPsaForAnim = parseFloat(result?.psaValue) || 0;
  const psaDecimals = String(result?.psaValue || '').includes('.') ? String(result?.psaValue || '').split('.')[1].length : 1;
  const animPsaValue = useCountUpFloat(rawPsaForAnim, Math.min(psaDecimals, 2));

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

  const handleSubmitToResearch = async () => {
    if (!functions) return;
    setResearchSubmitState('pending');
    setResearchSubmitError(null);
    try {
      const fn = httpsCallable(functions, 'submitToRedcap');
      await fn({
        researchConsent: true,
        step1: preData,
        result: preResult,
        step2: postData,
        finalCategory: result?.riskCat,
        finalScore: result?.totalPoints,
        pathwayMode: postData?.pathwayMode || preData?.pathwayMode || 'post_psa',
        sessionId: sessionId || undefined,
      });
      setResearchSubmitState('success');
    } catch (err) {
      setResearchSubmitState('error');
      setResearchSubmitError(err?.message || 'Submission failed. Please try again.');
    }
  };

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

  if (!result) return (
    <div className="p2r-container">
      <div role="alert" style={{ margin: '2rem auto', maxWidth: '480px', padding: '24px', background: '#fffbeb', border: '1.5px solid #d97706', borderRadius: '12px', textAlign: 'center' }}>
        <AlertTriangleIcon size={32} color="#d97706" style={{ marginBottom: '12px' }} />
        <h3 style={{ color: '#92400e', fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>No Results Yet</h3>
        <p style={{ color: '#78350f', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
          Complete the Part 2 questionnaire to see your combined risk assessment.
        </p>
      </div>
    </div>
  );

  /* ── Structural validity guard ──────────────────────────────────────────────
   * Part 2 result must have a valid PSA value and a risk category. If either is
   * absent the session is corrupted — rendering would produce a meaningless tier.
   * ─────────────────────────────────────────────────────────────────────────── */
  const _psaValid = result?.psaValue != null && Number.isFinite(parseFloat(result.psaValue));
  const _riskCatPresent = result?.riskCat != null || result?.epsaTierKey != null;
  if (!_psaValid || !_riskCatPresent) return (
    <div className="p2r-container">
      <div role="alert" style={{ margin: '2rem auto', maxWidth: '480px', padding: '24px', background: '#fffbeb', border: '1.5px solid #d97706', borderRadius: '12px', textAlign: 'center' }}>
        <AlertTriangleIcon size={32} color="#d97706" style={{ marginBottom: '12px' }} />
        <h3 style={{ color: '#92400e', fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>
          Assessment Data Incomplete
        </h3>
        <p style={{ color: '#78350f', fontSize: '14px', lineHeight: 1.6, margin: '0 0 16px' }}>
          Your Part 2 results could not be computed — the PSA data or session record appears incomplete or corrupted.
          Please start a new assessment or return to Part 1 to re-enter your PSA value.
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
    <div className="p2r-container">
      <ResultsLoading
        label="ePSA · Part 2"
        message="Reviewing guidelines for your PSA…"
        steps={PART2_LOADING_STEPS}
        onComplete={() => setIsLoading(false)}
        storageKey={LOADING_SEEN_KEY_P2}
      />
    </div>
  );

  const {
    riskCat, riskClass, psaValue, psaAdjusted, psaAdjustedFlag,
    isOtherHormonal, psaTier, biopsyRecommended, biopsyReason, biopsyMessage,
    biopsyGuidelineSupport, biopsyGuidelineSupportCount,
    tierGuidelineSupport, tierGuidelineSupportCount,
    mriRecommended, mriRecommendMessage,
    pathwayMode = 'post_psa',
    epsaTierKey, guardrailAlerts = [],
    discordanceFlag, lowPsaWarning, lowPsaWarningText,
    psadFlag,
  } = result;

  const ageNum = Number(preResult?.age || preData?.age) || 0;
  const isAge70Plus = ageNum >= 70;

  /* SDM section only shown where clinically required: age 70+ (AUA/SUO 2026 mandate) or discordance */
  const showSDM = isAge70Plus || !!discordanceFlag;

  /* Urology referral CTAs only appropriate for elevated combined risk */
  const showUrologyReferral = epsaTierKey === 'intermediate-high' || epsaTierKey === 'high'
    || biopsyRecommended;

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

  const psaTierLower = psaTier?.toLowerCase();
  const psaTierKey = PSA_TIER_I18N_KEY[psaTierLower] || PSA_TIER_I18N_KEY['intermediate-high'];
  const psaTierCtx = {
    label: t(`part2Results.tiers.psaContext.${psaTierKey}.label`),
    detail: t(`part2Results.tiers.psaContext.${psaTierKey}.detail`),
    color: PSA_TIER_COLORS[psaTierLower] || PSA_TIER_COLORS['intermediate-high'],
  };

  const _piradsRaw = postData?.pirads;
  const piradsVal = (_piradsRaw !== null && _piradsRaw !== undefined && _piradsRaw !== '')
    ? Number(_piradsRaw)
    : null;
  const piradsCtx = (piradsVal != null && !isNaN(piradsVal))
    ? (() => {
        const idx = Math.min(5, Math.max(0, piradsVal));
        const detailKey = `part2Results.tiers.pirads.${idx}.detail`;
        const detail = t(detailKey);
        return {
          label: t(`part2Results.tiers.pirads.${idx}.label`),
          color: PIRADS_COLORS[idx],
          detail: detail === detailKey ? undefined : detail,
        };
      })()
    : null;

  const p2GaugeTiers = [
    { key: 'low',      label: t('part2Results.tiers.gauge.low'),      color: P2_GAUGE_COLORS.low },
    { key: 'moderate', label: t('part2Results.tiers.gauge.moderate'), color: P2_GAUGE_COLORS.moderate },
    { key: 'high',     label: t('part2Results.tiers.gauge.high'),     color: P2_GAUGE_COLORS.high },
  ];

  const heroVariant = biopsyRecommended
    ? (biopsyReason === 'high_risk_discordance' ? 'amber' : 'red')
    : 'blue';

  const heroIcon = (() => {
    if (biopsyRecommended) return heroVariant === 'red' ? <AlertCircleIcon size={20} /> : <AlertTriangleIcon size={20} />;
    if (isAge70Plus) return <UsersIcon size={20} />;
    return <FlaskConicalIcon size={20} />;
  })();

  const heroTitle = (() => {
    if (biopsyRecommended) return heroVariant === 'red' ? t('part2Results.tiers.hero.biopsy') : t('part2Results.tiers.hero.urologistReview');
    if (isAge70Plus) return 'Discuss Next Steps with Your Physician';
    return t('part2Results.tiers.hero.nextSteps');
  })();

  /* Plain-language recommendation based on tier — aligns with AUA/NCCN */
  const tierRecommendation = (() => {
    if (epsaTierKey === 'high' && isVeryHighRisk) return t('part2Results.tiers.recommendation.veryHigh');
    if (epsaTierKey === 'high') return t('part2Results.tiers.recommendation.high');
    if (epsaTierKey === 'intermediate-high') return t('part2Results.tiers.recommendation.intermediateHigh');
    if (epsaTierKey === 'intermediate-low') return t('part2Results.tiers.recommendation.intermediateLow');
    return t('part2Results.tiers.recommendation.low');
  })();

  /* For 70+ patients the hero message emphasises SDM + life expectancy per AUA/SUO 2026 */
  const heroMessage = (() => {
    if (biopsyRecommended && biopsyMessage) return biopsyMessage;
    if (isAge70Plus) {
      return 'Per AUA/SUO 2026, all screening decisions at age 70+ require Shared Decision-Making based on your life expectancy and personal values. The PSA-based pathway applies only if your life expectancy is ≥ 10 years — your physician must assess this first.';
    }
    return tierRecommendation;
  })();

  /* Surface discordance or low-PSA context as a single calm footnote in the hero */
  const hasContextNote = discordanceFlag || lowPsaWarning;
  const contextNote = lowPsaWarning
    ? t('part2Results.tiers.contextNote.lowPsa')
    : discordanceFlag?.direction === 'psa_higher'
    ? t('part2Results.tiers.contextNote.discordancePsaHigher')
    : discordanceFlag
    ? t('part2Results.tiers.contextNote.discordanceProfile')
    : null;

  /* ── Active Surveillance eligibility ── */
  const gggNum = postData?.ggg ? Number(postData.ggg) : null;
  // GG4/5: engine guardrail already rules out AS — never show AS banner
  const asGuardrailFired = gggNum != null && gggNum >= 4;
  const asStrongIndication = !asGuardrailFired && gggNum === 1;
  const asPossibleIndication = !asGuardrailFired && gggNum === 2 &&
    (epsaTierKey === 'low' || epsaTierKey === 'intermediate-low');
  // Pre-biopsy: very low combined risk on MRI pathway — mention AS as possible outcome
  const asPreBiopsyMention = !gggNum && !biopsyRecommended &&
    epsaTierKey === 'low' && pathwayMode === 'post_mri';
  const showASBanner = asStrongIndication || asPossibleIndication || asPreBiopsyMention;

  return (
    <div className="p2r-container" role="main">

      <ResultsMetaBar sessionId={sessionId} computedAt={result?.computedAt} part="Part 2 · ePSA Combined Risk" />

      {/* ── Cloud row ── */}
      {(storageMode === 'local' && cloudAvailable && onSaveToCloud) && (
        <div className="p2r-cloud-row">
          <button type="button" className="p2r-btn-move-cloud" onClick={onSaveToCloud} disabled={saveToCloudPending}>
            <CloudIcon size={16} />{saveToCloudPending ? 'Saving…' : 'Save to Cloud'}
          </button>
          {saveToCloudError && (
            <div
              role="alert"
              aria-live="polite"
              style={{
                marginTop: '0.5rem',
                padding: '0.625rem 0.875rem',
                background: 'rgba(217, 119, 6, 0.08)',
                border: '1px solid rgba(217, 119, 6, 0.35)',
                borderLeft: '4px solid #d97706',
                borderRadius: '6px',
                color: '#78350f',
                fontSize: '0.8125rem',
                lineHeight: 1.5,
              }}
            >
              <strong>Cloud save unavailable.</strong> {saveToCloudError}
            </div>
          )}
        </div>
      )}

      {/* ── Research consent / REDCap status ── */}
      {storageMode === 'cloud' && (
        /* Cloud user — auto-synced if consented */
        <div className={`p2r-research-badge ${researchConsent ? 'p2r-research-badge--consented' : 'p2r-research-badge--private'}`}>
          {researchConsent
            ? <><CheckCircle2Icon size={14} /><span>Your data is included in the ePSA research study</span></>
            : <><CloudIcon size={14} /><span>Your data is stored privately — not shared for research</span></>}
        </div>
      )}
      {storageMode === 'local' && researchConsent && (
        /* Local user — must push manually */
        <div className="p2r-research-submit-row">
          {researchSubmitState === 'success' ? (
            <div className="p2r-research-badge p2r-research-badge--consented">
              <CheckCircle2Icon size={14} />
              <span>Thank you! Your data has been submitted to the research study.</span>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="p2r-btn-research-submit"
                onClick={handleSubmitToResearch}
                disabled={researchSubmitState === 'pending'}
              >
                <FlaskConicalIcon size={15} />
                {researchSubmitState === 'pending' ? 'Submitting…' : 'Submit to Research Study'}
              </button>
              {researchSubmitState === 'error' && (
                <span className="p2r-research-error">{researchSubmitError}</span>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Critical guardrail alerts only (e.g. PSA > 100) ── */}
      {guardrailAlerts?.length > 0 && guardrailAlerts
        .filter(a => a.level === 'critical')
        .map(alert => <GuardrailBanner key={alert.code} alert={alert} />)
      }

      {/* ── Risk Summary Card ── */}
      <div ref={recommendRef} className={`risk-summary-card ${riskBgClass} res-reveal`} style={{ '--delay': '80ms' }} role="region" aria-label="Risk assessment result">
        <div className="v2-res-eyebrow">
          <span>ePSA Guideline-Based Next Steps · Part 2 {pathwayMode === 'post_mri' ? 'PSA + MRI' : 'PSA Only'}</span>
          <span>Assessed today</span>
        </div>

        <div className="v2-gauge-layout">
          <RiskGauge score={p2GaugeScore} tierKey={p2GaugeTierKey} tierLabel={cleanRiskCat} tiers={p2GaugeTiers} />
          <div className="v2-tier-info">
            <div className="v2-tier-label">Combined Risk Tier</div>
            <h2 className="v2-tier-title res-tier-pop" style={{ color: riskColor }}>{cleanRiskCat}</h2>
            <RiskLevelBar riskClass={riskClass} />
          </div>
        </div>

        {/* ── Tier journey: Part 1 → Part 2 ── */}
        {preResult?.epsaTierLabel && (
          <div className="tier-journey" aria-label="Risk tier change from Part 1 to Part 2">
            <div className="tier-journey-step">
              <span className="tier-journey-label">Part 1 Baseline</span>
              <span className="tier-journey-tier">{preResult.epsaTierLabel}</span>
            </div>
            <span className="tier-journey-arrow" aria-hidden="true">→</span>
            <div className="tier-journey-step tier-journey-step--to">
              <span className="tier-journey-label">Combined Risk</span>
              <span className="tier-journey-tier" style={{ color: riskColor }}>{cleanRiskCat}</span>
            </div>
          </div>
        )}

        {/* ── PSA prominently displayed ── */}
        <div className="p2r-key-inputs">
          <div className="p2r-key-input">
            <div className="p2r-key-input-label">PSA Result</div>
            <div className="p2r-key-input-value" style={{ color: psaTierCtx.color }}>
              {psaAdjustedFlag ? psaAdjusted : animPsaValue}
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

      {/* ── Clinical Notices (after the risk card so the result is seen first) ── */}
      {(lowPsaWarning || psadFlag || discordanceFlag) && (
        <div className="p2r-notices" role="note" aria-label="Clinical notices">
          <div className="p2r-notices-title">
            <AlertTriangleIcon size={14} className="p2r-notices-icon" />
            <span>Clinical Notices</span>
          </div>
          <ul className="p2r-notices-list">
            {lowPsaWarning && (
              <NoticeItem label="Low PSA Risk">
                {lowPsaWarningText}
              </NoticeItem>
            )}
            {psadFlag && (
              <NoticeItem label="PSA Density Elevated">
                Your PSA density (&gt;0.177 ng/mL/mL) suggests a higher proportion of PSA per prostate volume — this independently supports further evaluation.{' '}
                <ModalInfoIcon
                  title="Kadeer et al. 2025 — PSA Density (PSAD)"
                  description="Kadeer et al. evaluated PSA derivatives in patients with low PSA levels (≤10 ng/mL) and reported strong diagnostic performance for PSA density."
                  sources={fieldReferences.part2.psadKadeer.sources}
                />
              </NoticeItem>
            )}
            {discordanceFlag && (
              <NoticeItem label="Risk Discordance">
                {discordanceFlag.text}
              </NoticeItem>
            )}
          </ul>
        </div>
      )}

      {/* ── Age 70+ SDM / Life Expectancy Required banner ── */}
      {isAge70Plus && (
        <div className="p2r-sdm-required-banner res-reveal" role="note" style={{ '--delay': '160ms' }}>
          <div className="p2r-sdm-required-icon">👤</div>
          <div className="p2r-sdm-required-body">
            <div className="p2r-sdm-required-title">Age 70+ — Shared Decision-Making Required</div>
            <p className="p2r-sdm-required-text">
              Per AUA/SUO 2026, all PSA screening decisions at age 70+ begin with Shared Decision-Making (SDM). Your physician must first assess your <strong>life expectancy</strong> — if less than 10 years, discontinuing screening is recommended regardless of PSA level. The PSA-based recommendations below only apply if your life expectancy is ≥ 10 years.
            </p>
          </div>
        </div>
      )}

      {/* ── MRI CTA — styled like Part 1 PSA CTA ── */}
      {pathwayMode === 'post_psa' && mriRecommended && (
        <div
          className="psa-cta-banner res-reveal"
          style={{ '--delay': '200ms' }}
          role="complementary"
          aria-label="Add MRI result"
        >
          <div>
            <p className="psa-cta-banner__title">Know your MRI? Add it for a more complete picture.</p>
            <p className="psa-cta-banner__desc">
              {mriRecommendMessage || 'Adding your MRI result gives you a full ePSA assessment — including whether a biopsy is recommended.'}
            </p>
          </div>
          {onContinueToMRI && (
            <button type="button" onClick={onContinueToMRI} className="psa-cta-banner__btn">
              Add MRI result <ArrowRightIcon size={15} />
            </button>
          )}
        </div>
      )}

      {/* ── Main Recommendation Hero ── */}
      <div className={`v2-psa-hero v2-psa-hero--${heroVariant} res-reveal`} style={{ '--delay': '340ms' }}>
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
          {showUrologyReferral ? (
            <>
              <a href="https://www.mountsinai.org/care/cancer/services/prostate/mobile-screening" target="_blank" rel="noopener noreferrer" className="btn-results btn-results--solid v2-psa-hero-btn-solid">
                Book urology referral →
              </a>
              <a href="https://www.mountsinai.org/care/urology/team" target="_blank" rel="noopener noreferrer" className="btn-results btn-results--outline v2-psa-hero-btn-outline">
                Meet the urology team ↗
              </a>
            </>
          ) : isAge70Plus ? (
            <a href="https://www.mountsinai.org/care/urology/team" target="_blank" rel="noopener noreferrer" className="btn-results btn-results--outline v2-psa-hero-btn-outline">
              Discuss with your physician →
            </a>
          ) : (
            <a href="https://www.mountsinai.org/care/urology/team" target="_blank" rel="noopener noreferrer" className="btn-results btn-results--outline v2-psa-hero-btn-outline">
              Discuss with your GP →
            </a>
          )}
        </div>
      </div>

      {/* ── Active Surveillance Banner ── */}
      {showASBanner && (
        <div className={`as-banner as-banner--${asStrongIndication ? 'strong' : asPossibleIndication ? 'possible' : 'mention'} res-reveal`} style={{ '--delay': '400ms' }}>
          <div className="as-banner-body">
            <div className="as-banner-eyebrow">
              {asStrongIndication
                ? 'AUA/NCCN Guideline — Active Surveillance Strongly Recommended'
                : asPossibleIndication
                ? 'AUA/NCCN Guideline — Active Surveillance May Be Appropriate'
                : 'Possible Outcome — Active Surveillance'}
            </div>
            <h4 className="as-banner-title">
              {asStrongIndication
                ? 'Your biopsy result (Grade Group 1) supports active surveillance as the preferred management option.'
                : asPossibleIndication
                ? 'Your biopsy result (Grade Group 2) with a low combined-risk profile may support active surveillance — confirm with your urologist.'
                : 'Given your low MRI-based risk profile, active surveillance may be discussed as an outcome if a biopsy is performed.'}
            </h4>
            <p className="as-banner-sub">
              Active surveillance means regular monitoring (PSA, MRI, biopsy) without immediate treatment. It is the guideline-preferred approach for low-risk localised prostate cancer (AUA/NCCN 2024).
            </p>
          </div>
          <div className="as-banner-cta">
            <a
              href="https://as.millionstrongmen.com"
              target="_blank"
              rel="noopener noreferrer"
              className="as-banner-btn"
            >
              Learn about Active Surveillance <ExternalLinkIcon size={13} aria-hidden="true" />
            </a>
            <span className="as-banner-source">as.millionstrongmen.com · AUA/NCCN 2024</span>
          </div>
        </div>
      )}

      {/* ── Non-critical guardrail alerts (warning / info) ── */}
      {guardrailAlerts?.length > 0 && guardrailAlerts
        .filter(a => a.level !== 'critical')
        .map(alert => <GuardrailBanner key={alert.code} alert={alert} />)
      }

      {/* ── Expandable Sections ── */}
      <div className="detail-sections res-reveal" style={{ '--delay': '460ms' }}>

        <CollapsibleSection title="AUA/SUO 2026 Guideline — PSA Pathway & Next Steps" defaultOpen>
          {(() => {
            const ageForChart = preResult?.age ?? preData?.age;
            const isBlack = preData?.race === 'black';
            const hasFamilyHx = Number(preData?.familyHistory) > 0;
            const hasBrca = preData?.brcaStatus === 'yes';
            return (
              <>
                <Part2GuidelineJourney
                  psaValue={psaValue}
                  piradsVal={piradsVal}
                  biopsyRecommended={!!biopsyRecommended}
                  pathwayMode={pathwayMode}
                  epsaTierKey={epsaTierKey}
                  expandableDetail={
                    <>
                      <AUAScreeningFlowchart
                        age={ageForChart}
                        psaValue={psaValue}
                        isHighRisk={isBlack || hasFamilyHx || hasBrca}
                        part="part2"
                      />
                      <AUAInitialBiopsyGuidelines
                        biopsyRecommended={!!biopsyRecommended}
                        epsaTierKey={epsaTierKey}
                        piradsVal={piradsVal}
                        pathwayMode={pathwayMode}
                      />
                    </>
                  }
                />
              </>
            );
          })()}
        </CollapsibleSection>

        {showSDM && (
          <CollapsibleSection title={isAge70Plus ? 'Age 70+ — Shared Decision-Making (Required)' : 'Risk Discordance — Shared Decision-Making'} className="sdm-collapsible" defaultOpen={isAge70Plus}>
            {isAge70Plus ? (
              <>
                <p style={{ fontSize: '13px', color: '#374151', marginBottom: '8px' }}>Per AUA/SUO 2026, all PSA screening decisions at age 70+ require a physician-led SDM conversation. Four questions to address:</p>
                <ul style={{ paddingLeft: '1.25rem', fontSize: '13px', lineHeight: 1.9, color: '#374151' }}>
                  <li><strong>Life expectancy</strong> — must be assessed first. If &lt;10 years, discontinuing screening is recommended regardless of PSA.</li>
                  <li><strong>Overdiagnosis risk</strong> — most prostate cancers are slow-growing; treatment side effects may outweigh benefit at this age.</li>
                  <li><strong>Patient values</strong> — priorities around cancer detection, quality of life, and treatment burden guide the decision.</li>
                  <li><strong>Interval or stop?</strong> — if life expectancy ≥10 years, PSA level (threshold 3.0 ng/mL) guides continue vs. discontinue.</li>
                </ul>
              </>
            ) : (
              <>
                <p style={{ fontSize: '13px', color: '#374151', marginBottom: '8px' }}>Your PSA result and ePSA baseline risk point in different directions. Questions to raise with your doctor:</p>
                <ul style={{ paddingLeft: '1.25rem', fontSize: '13px', lineHeight: 1.9, color: '#374151' }}>
                  <li><strong>Repeat the PSA</strong> — a single elevated result can reflect infection, inflammation, or recent activity. Confirm before any workup.</li>
                  <li><strong>Consider MRI</strong> — if PSA remains elevated, AUA/SUO 2026 conditionally recommends MRI before biopsy (Grade A).</li>
                  <li><strong>Assess urgency</strong> — most prostate cancers are slow-growing; gathering more information over a few weeks is usually safe.</li>
                </ul>
              </>
            )}
            <p style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic', marginTop: '10px' }}>
              AUA/SUO 2026 · NCCN v3.2024
            </p>
          </CollapsibleSection>
        )}

        {onShowModelDocs && (
          <div className="model-docs-btn-row">
            <button type="button" className="btn-results btn-results--outline model-docs-btn" onClick={onShowModelDocs}>
              <ExternalLinkIcon size={14} />
              <span>View Model Documentation</span>
            </button>
          </div>
        )}

        {/* ── Urologist Finder ── */}
        <CollapsibleSection title="Find a Board-Certified Urologist Near You">
          <UrologistFinder flowMode={flowMode} />
        </CollapsibleSection>

      </div>

      {/* ── Action buttons ── */}
      <div className="results-actions res-reveal" style={{ '--delay': '660ms' }}>
        {flowMode === 'sinai' && onSubmitToSinai && (
          <div
            className="results-actions-row"
            style={{
              padding: '14px 16px',
              marginBottom: '12px',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              border: '1px solid #93c5fd',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: '1 1 240px', minWidth: 0 }}>
              <strong style={{ display: 'block', color: '#1e3a8a', fontSize: '14px' }}>
                Mount Sinai Research Study
              </strong>
              <span style={{ color: '#1e40af', fontSize: '13px' }}>
                Submit your responses to complete your participation in study STUDY-14-00050.
              </span>
            </div>
            <button
              type="button"
              className="btn-results btn-results--solid"
              style={{ background: '#2563eb', borderColor: '#2563eb' }}
              onClick={onSubmitToSinai}
            >
              <FlaskConicalIcon size={16} />
              <span>Submit to Mount Sinai</span>
            </button>
          </div>
        )}
        <div className="results-actions-row results-actions-row--primary">
          <button className="btn-results btn-results--outline" onClick={onEditAnswers}><ArrowLeftIcon size={16} /><span>Edit Answers</span></button>
          {confirmStartOver ? (
            <div className="start-over-confirm">
              <span className="start-over-confirm-msg">This will erase all your answers. Are you sure?</span>
              <div className="start-over-confirm-btns">
                <button className="btn-results btn-results--danger" onClick={onStartOver}><RefreshCwIcon size={14} /><span>Yes, start over</span></button>
                <button className="btn-results btn-results--outline" onClick={() => setConfirmStartOver(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="btn-results btn-results--danger-outline" onClick={() => setConfirmStartOver(true)}><RefreshCwIcon size={16} /><span>Start Over</span></button>
          )}
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

      {/* ── Disclaimer (below buttons) ── */}
      <CollapsibleSection title="Important Disclaimer">
        <p className="detail-notice-box--amber detail-disclaimer">
          <strong>When ePSA and the guideline disagree, the guideline wins.</strong> ePSA is a supportive tool — your doctor and the published AUA/SUO, NCCN, and EAU guidance should drive the decision. Always discuss this result with your GP or urologist before acting on it.
        </p>
        <p className="detail-disclaimer">ePSA is an educational tool, not a medical diagnosis. Results are based on population-level data aligned with AUA/SUO 2026 guideline thresholds. A higher tier means earlier follow-up is recommended — it does not mean you have cancer. Always confirm an elevated PSA with a repeat test before any biopsy, and speak with a physician before making any health decisions.</p>
        <p className="detail-attribution">— Ashutosh K. Tewari, MD, Icahn School of Medicine at Mount Sinai</p>
        <div className="detail-notice-box">
          <strong>Clinical Deployment Notice:</strong> This application uses Google Firebase, which is HIPAA-eligible only under an executed Business Associate Agreement (BAA). Until a BAA is confirmed, do not enter Protected Health Information (PHI) in a clinical context. Institutional or clinical deployment requires a signed BAA with the platform provider.
          <br /><br />
          <strong>Data Retention:</strong> Anonymous research data submitted under consent may be retained for up to 7 years in accordance with IRB protocol STUDY-14-00050.
        </div>
      </CollapsibleSection>

    </div>
  );
};

export default Part2Results;
