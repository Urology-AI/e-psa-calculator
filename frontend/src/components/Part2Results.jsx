import React, { useState } from 'react';
import './Part2Results.css';
import './Part1Results.css';
import './epsa-v2-layout.css';
import PrintableForm from './PrintableForm';
import ModelDocumentation from './ModelDocumentation';
import { downloadCsv, buildPart2CsvRows } from '../utils/exportCsv';
import ModalInfoIcon from './InfoIcon';
import { fieldReferences } from '../utils/fieldReferences';
import {
  ArrowLeftIcon, RefreshCwIcon, PrinterIcon, FileTextIcon, CloudIcon,
  DownloadIcon, ChevronDownIcon, ChevronUpIcon, FlaskConicalIcon, ActivityIcon,
  CheckCircle2Icon, AlertTriangleIcon, AlertCircleIcon, ExternalLinkIcon,
  MapPinIcon, PillIcon,
} from 'lucide-react';

/* ─── Collapsible (same style as Part 1) ─── */
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

/* ─── Guideline Deviation Banner ─── */
const GuidelineDeviationBanner = ({ type }) => {
  const isDiscordance = type === 'discordance';
  const colorClass = isDiscordance ? 'guideline-deviation-banner--amber' : 'guideline-deviation-banner--red';

  const title = isDiscordance
    ? 'ePSA tier is higher than PSA alone suggests — goes beyond standard guidelines'
    : 'Low PSA does not rule out risk — ePSA flags factors outside standard PSA interpretation';

  const guidelineSays = isDiscordance
    ? 'Standard PSA guidelines assign risk tier based on PSA value alone.'
    : 'A PSA below 2.0 ng/mL is generally reassuring per AUA/NCCN. Routine guidelines do not mandate further action at this level.';

  const epsaAdds = isDiscordance
    ? 'ePSA combines PSA with your Part 1 profile — including race, family history, germline mutations, and additional factors like BMI, urinary symptoms, and lifestyle — pushing your combined tier higher than PSA alone suggests.'
    : 'Your Part 1 profile contains high-risk features (Black ancestry, family history, or germline mutations) that AUA/NCCN identify as warranting earlier screening regardless of PSA level. ePSA surfaces this risk even when PSA appears low.';

  return (
    <div role="alert" className={`guideline-deviation-banner ${colorClass}`}>
      <div className="guideline-deviation-banner__header">
        <AlertTriangleIcon size={15} className="guideline-deviation-banner__icon" />
        <span className="guideline-deviation-banner__title">{title}</span>
      </div>
      <div className="guideline-deviation-banner__row">
        <span className="guideline-deviation-banner__pill guideline-deviation-banner__pill--guideline">Guidelines say</span>
        <p className="guideline-deviation-banner__text">{guidelineSays}</p>
      </div>
      <div className="guideline-deviation-banner__row">
        <span className="guideline-deviation-banner__pill guideline-deviation-banner__pill--epsa">ePSA adds</span>
        <p className="guideline-deviation-banner__text">{epsaAdds}</p>
      </div>
      <p className="guideline-deviation-banner__footer">Always discuss with your physician before drawing conclusions from this result alone.</p>
    </div>
  );
};

/* ─── PSA / MRI Tier scales ─── */
const PSA_TIER_SCALE = [
  { key: 'low',               label: 'Low',          range: '< 1.0',    color: '#16a34a', bg: '#f0fdf4' },
  { key: 'intermediate-low',  label: 'Int-Low',      range: '1.0–2.9',  color: '#2563eb', bg: '#eff6ff' },
  { key: 'intermediate-high', label: 'Int-High',     range: '3.0–9.9',  color: '#d97706', bg: '#fffbeb' },
  { key: 'high',              label: 'High',         range: '≥ 10.0',   color: '#dc2626', bg: '#fef2f2' },
];
const MRI_TIER_SCALE = [
  { pirads: [1, 2], label: 'PI-RADS 1–2', meaning: 'Very Low / Low',          color: '#16a34a', bg: '#f0fdf4' },
  { pirads: [3],    label: 'PI-RADS 3',   meaning: 'Intermediate (Equivocal)',color: '#2563eb', bg: '#eff6ff' },
  { pirads: [4],    label: 'PI-RADS 4',   meaning: 'High — Likely',            color: '#d97706', bg: '#fffbeb' },
  { pirads: [5],    label: 'PI-RADS 5',   meaning: 'Very High — Highly Likely',color: '#dc2626', bg: '#fef2f2' },
];

/* ─── Main Component ─── */
const Part2Results = ({
  result, preResult, preData, onEditAnswers, onStartOver, storageMode,
  postData, sessionId = null, userEmail = null, userPhone = null,
  onSaveToCloud = null, cloudAvailable = false,
  saveToCloudPending = false, saveToCloudError = null,
  onShowModelDocs = null,
}) => {
  const [showPrintableForm, setShowPrintableForm] = useState(false);

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

  const {
    riskCat, riskClass, nextSteps, psaValue, psaAdjusted, psaAdjustedFlag,
    isOtherHormonal, psaTier, discordanceFlag, lowPsaWarning, lowPsaWarningText,
    psadValue, psadFlag, biopsyRecommended, biopsyReason, biopsyMessage,
    pathwayMode = 'post_mri', empiricalProbabilityText, piradsConfidenceText,
    epsaTierKey, highGradeRisk, guardrailAlerts = [],
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

  const heroVariant = biopsyRecommended
    ? (biopsyReason === 'high_risk_discordance' ? 'amber' : 'red')
    : 'blue';
  const heroIcon = heroVariant === 'red' ? <AlertCircleIcon size={20} /> : heroVariant === 'amber' ? <AlertTriangleIcon size={20} /> : <FlaskConicalIcon size={20} />;
  const heroTitle = heroVariant === 'red' ? 'Biopsy Discussion Recommended' : heroVariant === 'amber' ? 'Urologist Review Recommended' : 'Next Steps';
  const heroMessage = biopsyRecommended && biopsyMessage
    ? biopsyMessage
    : 'Discuss your combined risk profile with a urologist. Bring your printed ePSA results to your appointment.';

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

      {/* ── Guardrail alerts ── */}
      {guardrailAlerts?.length > 0 && guardrailAlerts.map(alert => (
        <GuardrailBanner key={alert.code} alert={alert} />
      ))}

      {/* ── Risk Summary Card ── */}
      <div className={`risk-summary-card ${riskBgClass}`} role="region" aria-label="Risk assessment result">
        <div className="v2-res-eyebrow">
          <span>ePSA Risk Assessment · Part 2 {pathwayMode === 'post_mri' ? 'PSA + MRI' : 'PSA Only'}</span>
          <span>Assessed today</span>
        </div>

        <div className="v2-gauge-layout" style={{ alignItems: 'center', gap: '1rem' }}>
          <div style={{ flex: '0 0 auto' }}>
            {riskColor === '#16a34a'
              ? <CheckCircle2Icon size={48} style={{ color: riskColor }} />
              : riskColor === '#d97706'
              ? <AlertTriangleIcon size={48} style={{ color: riskColor }} />
              : <AlertCircleIcon size={48} style={{ color: riskColor }} />}
          </div>
          <div className="v2-tier-info">
            <div className="v2-tier-label">Combined Risk Tier</div>
            <h2 className="v2-tier-title" style={{ color: riskColor }}>{cleanRiskCat}</h2>
            <RiskLevelBar riskClass={riskClass} />
          </div>
        </div>

        {/* Input summary pills */}
        <div className="v2-why">
          <div className="v2-why-head"><span className="v2-why-head-title">Based on</span></div>
          <div className="v2-why-items">
            <div className="v2-why-item">
              <div className="v2-why-item-label">PSA</div>
              <div className="v2-why-item-val">{postData?.psa != null ? `${postData.psa} ng/mL` : '—'}</div>
              <div className="v2-why-item-pts" style={{ color: riskColor }}>{psaTier || '—'}</div>
            </div>
            <div className="v2-why-item">
              <div className="v2-why-item-label">Part 1</div>
              <div className="v2-why-item-val">{preResult?.score ?? '—'}%</div>
              <div className="v2-why-item-pts" style={{ color: riskColor }}>{preResult?.epsaTierLabel || preResult?.risk || '—'}</div>
            </div>
            {postData?.knowPirads && postData?.pirads && (
              <div className="v2-why-item">
                <div className="v2-why-item-label">MRI</div>
                <div className="v2-why-item-val">PI-RADS {postData.pirads}</div>
                <div className="v2-why-item-pts" style={{ color: riskColor }}>{Number(postData.pirads) >= 4 ? 'High' : Number(postData.pirads) === 3 ? 'Equivocal' : 'Low'}</div>
              </div>
            )}
            {psadValue != null && (
              <div className="v2-why-item">
                <div className="v2-why-item-label">PSA Density</div>
                <div className="v2-why-item-val">{psadValue.toFixed(3)}</div>
                <div className="v2-why-item-pts" style={{ color: psadFlag ? '#d97706' : riskColor }}>{psadFlag ? 'Elevated' : 'Normal'}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Guideline Deviation Notices ── */}
      {discordanceFlag && <GuidelineDeviationBanner type="discordance" />}
      {lowPsaWarning && <GuidelineDeviationBanner type="low_psa" />}

      {/* ── Recommendation Hero ── */}
      <div className={`v2-psa-hero v2-psa-hero--${heroVariant}`}>
        <div className="v2-psa-hero-top">
          <div className="v2-psa-hero-icon">{heroIcon}</div>
          <div className="v2-psa-hero-body">
            <h3 className="v2-psa-hero-title">{heroTitle}</h3>
            <p className="v2-psa-hero-desc">{heroMessage}</p>
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

      {/* ── High-Grade Risk (GG3+) ── */}
      {pathwayMode === 'post_mri' && highGradeRisk != null && (() => {
        const pct = Math.round(highGradeRisk.prob * 100);
        const color = highGradeRisk.prob >= 0.30 ? '#dc2626' : highGradeRisk.prob >= 0.15 ? '#d97706' : '#16a34a';
        const bg    = highGradeRisk.prob >= 0.30 ? '#fef2f2' : highGradeRisk.prob >= 0.15 ? '#fffbeb' : '#f0fdf4';
        return (
          <div style={{ background: bg, border: `1.5px solid ${color}`, borderRadius: '10px', padding: '16px', margin: '10px 0' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>High-Grade Cancer Risk (GG3+)</div>
            <div style={{ fontSize: '38px', fontWeight: 700, color, lineHeight: 1, marginBottom: '4px' }}>{pct}%</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '2px' }}>Risk of GG3+ Cancer</div>
            <div style={{ fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>AUC 0.694 · PI-RADS + PSA model</div>
          </div>
        );
      })()}

      {/* ── Timeline ── */}
      <div className="v2-timeline">
        <div className="v2-timeline-head"><span className="v2-timeline-title">What happens next</span></div>
        <div className="v2-timeline-track">
          <div className="v2-timeline-step v2-timeline-step--current">
            <span className="v2-timeline-when">Today</span>
            <span className="v2-timeline-desc">Review results and share with your GP or urologist</span>
          </div>
          <div className="v2-timeline-step">
            <span className="v2-timeline-when">Week 1</span>
            <span className="v2-timeline-desc">Book a urology referral via your GP</span>
          </div>
          <div className="v2-timeline-step">
            <span className="v2-timeline-when">Week 2–4</span>
            <span className="v2-timeline-desc">Attend specialist appointment with your ePSA results</span>
          </div>
          <div className="v2-timeline-step">
            <span className="v2-timeline-when">Week 4–8</span>
            <span className="v2-timeline-desc">Decide on further workup (biopsy / watchful waiting)</span>
          </div>
        </div>
      </div>

      {/* ── ESSENTIAL label ── */}
      <div className="v2-essential-label">
        <span className="v2-essential-badge">ESSENTIAL</span>
        <span className="v2-essential-text">Understanding your result</span>
      </div>

      {/* ── Expandable sections ── */}
      <div className="detail-sections">

        <CollapsibleSection title="About Your Result" defaultOpen>
          <p>
            Your combined risk tier is <strong style={{ color: riskColor }}>{cleanRiskCat}</strong>.
            {pathwayMode === 'post_mri' ? ' Combines your Part 1 profile, PSA, and MRI PI-RADS.' : ' Combines your Part 1 profile with PSA.'}
          </p>
          {empiricalProbabilityText && (
            <p style={{ fontStyle: 'italic', fontSize: '0.875rem', color: '#4b5563', marginTop: '6px' }}>{empiricalProbabilityText}</p>
          )}
          {(nextSteps?.length > 0) && (
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: 1.8, marginTop: '8px' }}>
              {nextSteps.map((step, i) => {
                const hasVideoLink = step.includes('Learn more about prostate cancer health');
                const hasMobileUnit = step.includes('Mount Sinai Mobile Unit');
                return (
                  <li key={i}>
                    {step.replace(' →', '')}
                    {hasVideoLink && <a href="https://www.youtube.com/@ashtewarimd7526" target="_blank" rel="noopener noreferrer" style={{ marginLeft: '4px', color: '#2563eb' }} aria-label="Watch video"><ExternalLinkIcon size={12} /></a>}
                    {hasMobileUnit && <a href="https://events.mountsinaihealth.org/search/events?event_types%5B%5D=37714143563487" target="_blank" rel="noopener noreferrer" style={{ marginLeft: '4px', color: '#2563eb' }} aria-label="View location"><MapPinIcon size={12} /></a>}
                  </li>
                );
              })}
            </ul>
          )}
          {(epsaTierKey === 'intermediate-high' || epsaTierKey === 'high') && (
            <p style={{ fontSize: '0.8rem', marginTop: '10px', color: '#374151' }}>
              Already had a biopsy?{' '}
              <a href={`https://as.millionstrongmen.com?psa=${encodeURIComponent(psaValue ?? '')}&source=epsa`} target="_blank" rel="noopener noreferrer" style={{ color: '#16a34a', fontWeight: 600 }}>Open AI Surveillance Tool →</a>
            </p>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Score Breakdown">
          {/* Score bars */}
          <div className="v2-score-stack" style={{ margin: '0 0 12px' }}>
            <div className="v2-score-stack-row">
              <span className="v2-score-stack-label">Part 1 (ePSA)</span>
              <span className="v2-score-stack-val">{preResult?.score ?? '—'}%</span>
              <div className="v2-score-stack-bar-track"><div className="v2-score-stack-bar-fill" style={{ width: `${Math.min(100, preResult?.score ?? 0)}%` }} /></div>
              <span className="v2-score-stack-pts">{preResult?.epsaTierLabel || '—'}</span>
            </div>
            <div className="v2-score-stack-row">
              <span className="v2-score-stack-label">PSA Level</span>
              <span className="v2-score-stack-val">{postData?.psa ? `${postData.psa} ng/mL` : '—'}</span>
              <div className="v2-score-stack-bar-track"><div className="v2-score-stack-bar-fill" style={{ width: `${Math.min(100, (parseFloat(postData?.psa) / 20) * 100)}%` }} /></div>
              <span className="v2-score-stack-pts">{psaTier || '—'}</span>
            </div>
            {psadValue != null && (
              <div className="v2-score-stack-row">
                <span className="v2-score-stack-label">PSA Density</span>
                <span className="v2-score-stack-val">{psadValue.toFixed(3)} ng/mL/mL</span>
                <div className="v2-score-stack-bar-track"><div className="v2-score-stack-bar-fill" style={{ width: `${Math.min(100, (psadValue / 0.4) * 100)}%` }} /></div>
                <span className="v2-score-stack-pts" style={{ color: psadFlag ? '#d97706' : undefined }}>{psadFlag ? 'Elevated' : 'Normal'}</span>
              </div>
            )}
            {postData?.knowPirads && postData?.pirads && (
              <div className="v2-score-stack-row">
                <span className="v2-score-stack-label">MRI PI-RADS</span>
                <span className="v2-score-stack-val">PI-RADS {postData.pirads}</span>
                <div className="v2-score-stack-bar-track"><div className="v2-score-stack-bar-fill" style={{ width: `${(Number(postData.pirads) / 5) * 100}%` }} /></div>
                <span className="v2-score-stack-pts">{Number(postData.pirads) >= 4 ? 'High' : Number(postData.pirads) === 3 ? 'Equivocal' : 'Low'}</span>
              </div>
            )}
            <div className="v2-score-stack-total">
              <span className="v2-score-stack-total-label">Combined Tier</span>
              <span className="v2-score-stack-total-val" style={{ color: riskColor }}>{cleanRiskCat}</span>
            </div>
          </div>

          {/* PSA tier chips */}
          <div className="p2r-breakdown-block">
            <div className="p2r-breakdown-heading"><FlaskConicalIcon size={13} style={{ flexShrink: 0 }} /><span>PSA Level Tier</span></div>
            <div className="p2r-tier-chips-grid">
              {PSA_TIER_SCALE.map(({ key, label, range, color, bg }) => {
                const isActive = (psaTier ? psaTier.toLowerCase() : null) === key;
                return (
                  <div key={key} className={`p2r-tier-chip${isActive ? ' p2r-tier-chip--active' : ''}`}
                    style={isActive ? { background: bg, borderColor: color, color } : {}} aria-current={isActive ? 'true' : undefined}>
                    <span className="p2r-tier-chip-label">{label}</span>
                    <span style={{ fontSize: '10px', color: isActive ? color : '#9ca3af' }}>{range} ng/mL</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MRI PI-RADS chips */}
          {postData?.knowPirads && postData?.pirads != null && (
            <div className="p2r-breakdown-block">
              <div className="p2r-breakdown-heading"><ActivityIcon size={13} style={{ flexShrink: 0 }} /><span>MRI PI-RADS</span></div>
              <div className="p2r-tier-chips-grid">
                {MRI_TIER_SCALE.map(({ pirads: piradsArr, label, meaning, color, bg }) => {
                  const isActive = piradsArr.includes(Number(postData.pirads));
                  return (
                    <div key={label} className={`p2r-tier-chip${isActive ? ' p2r-tier-chip--active' : ''}`}
                      style={isActive ? { background: bg, borderColor: color, color } : {}} aria-current={isActive ? 'true' : undefined}>
                      <span className="p2r-tier-chip-label">{label}</span>
                      <span style={{ fontSize: '10px', color: isActive ? color : '#9ca3af' }}>{meaning}</span>
                    </div>
                  );
                })}
              </div>
              {piradsConfidenceText && <p style={{ fontSize: '0.8rem', color: '#374151', marginTop: '8px' }}>{piradsConfidenceText}</p>}
            </div>
          )}

          {/* Cohort data */}
          <div className="p2r-cohort-card">
            <div className="p2r-cohort-heading"><FlaskConicalIcon size={13} /><span>Mount Sinai Validation Cohort (N=94)</span></div>
            <div className="p2r-cohort-table-wrap">
              <table className="p2r-cohort-table">
                <thead><tr><th>Tier</th><th>Range</th><th>N</th><th>csPCa Rate</th></tr></thead>
                <tbody>
                  <tr className={result.epsaTierKey === 'low' ? 'p2r-cohort-row--active' : ''}>
                    <td>Low</td><td>≤13 pts</td><td>—</td><td><span className="p2r-cohort-na">No data</span></td>
                  </tr>
                  <tr className={result.epsaTierKey === 'intermediate-low' ? 'p2r-cohort-row--active' : ''}>
                    <td>Int-Low</td><td>14–27</td><td>4</td><td><span className="p2r-cohort-rate p2r-cohort-rate--yellow">25% <span className="p2r-cohort-caution">(small N)</span></span></td>
                  </tr>
                  <tr className={result.epsaTierKey === 'intermediate-high' ? 'p2r-cohort-row--active' : ''}>
                    <td>Int-High</td><td>28–55</td><td>58</td><td><span className="p2r-cohort-rate p2r-cohort-rate--amber">21%</span></td>
                  </tr>
                  <tr className={result.epsaTierKey === 'high' ? 'p2r-cohort-row--active' : ''}>
                    <td>High</td><td>≥56</td><td>32</td><td><span className="p2r-cohort-rate p2r-cohort-rate--red">31%</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px', fontStyle: 'italic' }}>
              Biopsied referral cohort — rates reflect referred patients, not a general screening population.{pathwayMode === 'post_mri' ? ' MRI not in cohort; PI-RADS scoring follows AUA/NCCN/EAU v2.1.' : ''}
            </p>
          </div>
        </CollapsibleSection>

        {preResult && (
          <CollapsibleSection title="Your Part 1 Profile">
            <div className="p2r-profile-summary-pills">
              <div className="p2r-profile-pill">
                <span className="p2r-profile-pill-val" style={{ color: getRiskColor(preResult?.risk) }}>{preResult?.score}%</span>
                <span className="p2r-profile-pill-lbl">ePSA Score</span>
              </div>
              <div className="p2r-profile-pill">
                <span className="p2r-profile-pill-val" style={{ color: getRiskColor(preResult?.risk) }}>{preResult?.epsaTierLabel || preResult?.risk || '—'}</span>
                <span className="p2r-profile-pill-lbl">Risk Tier</span>
              </div>
              {preResult?.confidenceRange && (
                <div className="p2r-profile-pill">
                  <span className="p2r-profile-pill-val">{preResult.confidenceRange}</span>
                  <span className="p2r-profile-pill-lbl">Confidence</span>
                </div>
              )}
            </div>
            {preResult?.highRiskAnchors?.length > 0 && (
              <ul style={{ paddingLeft: '1rem', fontSize: '0.8rem', lineHeight: 1.8, marginTop: '10px' }}>
                {preResult.highRiskAnchors.map((anchor, i) => (
                  <li key={i} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                    <AlertTriangleIcon size={12} style={{ color: '#dc2626', flexShrink: 0, marginTop: '3px' }} />
                    <span>{anchor}</span>
                  </li>
                ))}
              </ul>
            )}
          </CollapsibleSection>
        )}

        <CollapsibleSection title="Shared Decision-Making">
          <p>Choosing the next step is a joint decision between you and your doctor. Key questions to raise:</p>
          <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: 1.8, marginTop: '6px' }}>
            <li><strong>How serious is this tier?</strong> — what does it mean for follow-up timing?</li>
            <li><strong>Biopsy vs. watchful waiting?</strong> — weigh detection benefit against biopsy risks (bleeding, infection, anxiety).</li>
            <li><strong>Your health and life expectancy</strong> — age and comorbidities guide whether further workup makes sense.</li>
            <li><strong>Your baseline function</strong> — current IPSS and SHIM scores matter for any treatment discussion.</li>
          </ul>
          <p style={{ fontSize: '0.8rem', color: '#607286', fontStyle: 'italic', marginTop: '8px' }}>
            AUA/ASTRO Part I–II, J Urol 2022 · NCCN v3.2024 · EAU 2024
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
