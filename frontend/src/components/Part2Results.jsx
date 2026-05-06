import React, { useState } from 'react';
import './Part2Results.css';
import './epsa-v2-layout.css';
import { RISK_COLORS } from '../utils/riskColors';
import PrintableForm from './PrintableForm';
import ModelDocumentation from './ModelDocumentation';
import { downloadCsv, buildPart2CsvRows } from '../utils/exportCsv';
import ModalInfoIcon from './InfoIcon';
import { fieldReferences } from '../utils/fieldReferences';
import {
  ArrowLeftIcon,
  RefreshCwIcon,
  PrinterIcon,
  FileTextIcon,
  CloudIcon,
  DownloadIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FlaskConicalIcon,
  ActivityIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  AlertCircleIcon,
  ExternalLinkIcon,
  MapPinIcon,
  PillIcon,
  InfoIcon as LucideInfoIcon,
} from 'lucide-react';

/* ─── Collapsible ─── */
const CollapsibleSection = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="p2r-collapsible">
      <button
        className="p2r-collapsible-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        type="button"
      >
        <span>{title}</span>
        {open ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
      </button>
      {open && <div className="p2r-collapsible-body">{children}</div>}
    </div>
  );
};

/* ─── Collapsible Notice Item ─── */
const NoticeItem = ({ label, children }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <li className="p2r-notice-item">
      <button
        type="button"
        className="p2r-notice-toggle"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
      >
        <strong>{label}</strong>
        {expanded ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />}
      </button>
      {expanded && <div className="p2r-notice-body">{children}</div>}
    </li>
  );
};

/* ─── Risk Level Visual Bar ─── */
const RiskLevelBar = ({ riskClass }) => {
  const levels = [
    { id: 'low',               label: 'Low',          color: '#16a34a' },
    { id: 'intermediate-low',  label: 'Int-Low',      color: '#2563eb' },
    { id: 'intermediate-high', label: 'Int-High',     color: '#d97706' },
    { id: 'high',              label: 'High',         color: '#dc2626' },
  ];
  const cls = String(riskClass || '').toLowerCase();
  const activeIdx =
    cls === 'very-high-risk' ? 3 :
    cls === 'high-risk' ? 2 :
    cls === 'moderate-risk' ? 1 :
    0;

  return (
    <div className="p2r-risk-bar" role="group" aria-label="Risk level bar">
      {levels.map(({ id, label, color }, i) => {
        const isActive = i === activeIdx;
        return (
          <div
            key={id}
            className={`p2r-risk-bar-segment ${isActive ? 'p2r-risk-bar-segment--active' : ''}`}
            style={isActive ? { background: color, color: '#fff' } : {}}
            aria-current={isActive ? 'true' : undefined}
          >
            <span className="p2r-risk-bar-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
};

/* ─── Risk Icon ─── */
const RiskIcon = ({ riskClass }) => {
  const cls = String(riskClass || '').toLowerCase();
  if (cls.includes('low') && !cls.includes('moderate') && !cls.includes('high')) {
    return <CheckCircle2Icon size={22} className="p2r-risk-icon p2r-risk-icon--low" />;
  }
  if (cls.includes('moderate')) {
    return <AlertTriangleIcon size={22} className="p2r-risk-icon p2r-risk-icon--moderate" />;
  }
  return <AlertCircleIcon size={22} className="p2r-risk-icon p2r-risk-icon--high" />;
};

/* ─── Helpers for Part 1 profile display ─── */
const formatAge = (age) => (age != null ? `${age} yrs` : '—');
const formatBmi = (bmi) => {
  if (bmi == null) return '—';
  const b = parseFloat(bmi);
  if (isNaN(b)) return '—';
  const cat = b < 18.5 ? 'Underweight' : b < 25 ? 'Normal' : b < 30 ? 'Overweight' : 'Obese';
  return `${b.toFixed(1)} (${cat})`;
};
const formatRace = (race) => {
  if (!race) return '—';
  const map = {
    'black': 'Black / African American',
    'black/aa': 'Black / African American',
    'african american': 'Black / African American',
    'white': 'White / Caucasian',
    'hispanic': 'Hispanic / Latino',
    'asian': 'Asian',
    'other': 'Other',
  };
  return map[String(race).toLowerCase()] || race;
};
const formatExercise = (ex) => {
  if (!ex) return '—';
  const map = { 'regular': 'Regular (3+ days/wk)', 'some': 'Some (1–2 days/wk)', 'none': 'Little / None' };
  return map[String(ex).toLowerCase()] || ex;
};
const formatSmoke = (s) => {
  if (!s) return '—';
  const map = { 'never': 'Never smoker', 'former': 'Former smoker', 'current': 'Current smoker' };
  return map[String(s).toLowerCase()] || s;
};
const formatDiet = (d) => {
  if (!d) return '—';
  const map = {
    'western': 'Western diet',
    'balanced': 'Balanced diet',
    'mediterranean': 'Mediterranean diet',
    'plant_based': 'Plant-based',
  };
  return map[String(d).toLowerCase()] || d;
};
const formatFh = (fh) => {
  if (fh === true || fh === 'yes' || fh === 1) return 'Yes';
  if (fh === false || fh === 'no' || fh === 0) return 'No';
  return '—';
};
const formatBrca = (b) => {
  if (!b || b === 'no' || b === 'none' || b === false) return 'None reported';
  if (b === 'yes' || b === true || b === 'positive') return 'Reported';
  if (b === 'brca1') return 'BRCA1 mutation';
  if (b === 'brca2') return 'BRCA2 mutation';
  if (b === 'hoxb13') return 'HOXB13 mutation';
  if (b === 'unknown') return 'Unknown';
  return b;
};
const formatIpss = (score) => {
  if (score == null || score === '') return '—';
  const n = Number(score);
  const sev = n <= 7 ? 'Mild' : n <= 19 ? 'Moderate' : 'Severe';
  return `${n} / 35 (${sev})`;
};
const formatShim = (score) => {
  if (score == null || score === '') return '—';
  const n = Number(score);
  const sev = n >= 22 ? 'Normal' : n >= 17 ? 'Mild ED' : n >= 12 ? 'Moderate' : n >= 8 ? 'Severe' : 'Very severe';
  return `${n} / 25 (${sev})`;
};
const formatComorbidities = (preData) => {
  if (!preData) return null;
  const flags = [];
  if (preData.hypertension === true || preData.hypertension === 'yes') flags.push('Hypertension');
  if (preData.hyperlipidemia === true || preData.hyperlipidemia === 'yes') flags.push('Hyperlipidemia');
  if (preData.diabetes === true || preData.diabetes === 'yes') flags.push('Diabetes');
  if (preData.coronaryArteryDisease === true || preData.coronaryArteryDisease === 'yes') flags.push('CAD');
  return flags.length ? flags.join(', ') : 'None reported';
};

/* Profile row: label + value */
const ProfileRow = ({ label, value, highlight = false }) => (
  <div className="p2r-profile-row">
    <span className="p2r-profile-row-label">{label}</span>
    <span className={`p2r-profile-row-val${highlight ? ' p2r-profile-row-val--hl' : ''}`}>{value || '—'}</span>
  </div>
);

/* ─── Part 1 Profile Card ─── */
const Part1ProfileCard = ({ preResult, preData, postData }) => {
  const [expanded, setExpanded] = useState(false);

  const tierColor =
    String(preResult?.risk || '').toLowerCase().includes('high') ? '#dc2626'
    : String(preResult?.risk || '').toLowerCase().includes('moderate') ? '#d97706'
    : '#16a34a';

  const confRange = preResult?.confidenceRange
    || (preResult?.confidenceLow != null && preResult?.confidenceHigh != null
        ? `${preResult.confidenceLow}%–${preResult.confidenceHigh}%`
        : null);

  return (
    <div className="p2r-profile-card" role="complementary" aria-label="Part 1 profile summary">
      <div className="p2r-profile-card-header">
        <div className="p2r-profile-card-title">Your Part 1 Screening Profile</div>
        <button
          type="button"
          className="p2r-profile-card-toggle"
          onClick={() => setExpanded(e => !e)}
          aria-expanded={expanded}
        >
          {expanded ? 'Hide details' : 'Show full profile'}
          {expanded ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
        </button>
      </div>

      <div className="p2r-profile-summary-pills">
        <div className="p2r-profile-pill">
          <span className="p2r-profile-pill-val" style={{ color: tierColor }}>{preResult?.score}%</span>
          <span className="p2r-profile-pill-lbl">ePSA Score</span>
        </div>
        <div className="p2r-profile-pill">
          <span className="p2r-profile-pill-val" style={{ color: tierColor }}>{preResult?.risk || '—'}</span>
          <span className="p2r-profile-pill-lbl">Risk Tier</span>
        </div>
        {confRange && (
          <div className="p2r-profile-pill">
            <span className="p2r-profile-pill-val">{confRange}</span>
            <span className="p2r-profile-pill-lbl">Confidence Range</span>
          </div>
        )}
        <div className="p2r-profile-pill">
          <span className="p2r-profile-pill-val">
            {postData?.psa != null ? `${postData.psa} ng/mL` : '—'}
          </span>
          <span className="p2r-profile-pill-lbl">PSA Level</span>
        </div>
        {postData?.knowPirads && postData?.pirads && (
          <div className="p2r-profile-pill">
            <span className="p2r-profile-pill-val">PI-RADS {postData.pirads}</span>
            <span className="p2r-profile-pill-lbl">MRI Score</span>
          </div>
        )}
      </div>

      {expanded && (
        <div className="p2r-profile-detail">
          <div className="p2r-profile-section-label">Demographics &amp; Physical</div>
          <div className="p2r-profile-grid">
            <ProfileRow label="Age" value={formatAge(preResult?.age ?? preData?.age)} />
            <ProfileRow label="Race / Ethnicity" value={formatRace(preData?.race)} />
            <ProfileRow label="BMI" value={formatBmi(preResult?.bmi ?? preData?.bmi)} />
            <ProfileRow label="Family History (PCa)" value={formatFh(preResult?.fhBinary ?? preData?.familyHistory)} highlight={preResult?.fhBinary === 1 || preData?.familyHistory === 'yes'} />
            <ProfileRow label="Genetic Mutation" value={formatBrca(preResult?.brcaStatus ?? preData?.brcaStatus)} highlight={preData?.brcaStatus === 'yes' || preData?.brcaStatus === 'positive'} />
          </div>

          <div className="p2r-profile-section-label">Symptoms &amp; Function</div>
          <div className="p2r-profile-grid">
            <ProfileRow label="IPSS (urinary)" value={formatIpss(preResult?.ipssTotal)} />
            <ProfileRow label="SHIM (sexual function)" value={formatShim(preResult?.shimTotal)} />
          </div>

          <div className="p2r-profile-section-label">Lifestyle</div>
          <div className="p2r-profile-grid">
            <ProfileRow label="Exercise Level" value={formatExercise(preData?.exercise)} />
            <ProfileRow label="Smoking Status" value={formatSmoke(preData?.smoking)} />
            <ProfileRow label="Diet Pattern" value={formatDiet(preData?.dietPattern)} />
          </div>

          <div className="p2r-profile-section-label">Comorbidities</div>
          <div className="p2r-profile-grid">
            <ProfileRow label="Conditions" value={formatComorbidities(preData)} />
            {preData?.inflammationHistory && (
              <ProfileRow label="Inflammation history" value={preData.inflammationHistory === 'yes' ? 'Yes' : 'No'} />
            )}
            {preData?.chemicalExposure && (
              <ProfileRow label="Chemical exposure" value={preData.chemicalExposure === 'yes' ? 'Yes' : 'No'} />
            )}
          </div>

          {preResult?.highRiskAnchors?.length > 0 && (
            <>
              <div className="p2r-profile-section-label" style={{ color: '#b91c1c' }}>Key Risk Factors Identified</div>
              <ul className="p2r-profile-anchors">
                {preResult.highRiskAnchors.map((anchor, i) => (
                  <li key={i} className="p2r-profile-anchor-item">
                    <AlertTriangleIcon size={13} style={{ color: '#dc2626', flexShrink: 0 }} />
                    <span>{anchor}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {preResult?.epsaTierLabel && (
            <div className="p2r-profile-tier-note">
              <span style={{ fontWeight: 600, color: tierColor }}>{preResult.epsaTierLabel}</span>
              {preResult.epsaTierScoreRange && (
                <span style={{ color: '#6b7280', fontSize: '0.75rem', marginLeft: '0.4rem' }}>
                  (score range: {preResult.epsaTierScoreRange})
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ─── PSA Tier Scale definition ─── */
const PSA_TIER_SCALE = [
  { key: 'low',               label: 'Low',              range: '< 1.0 ng/mL',   color: '#16a34a', bg: '#f0fdf4' },
  { key: 'intermediate-low',  label: 'Intermediate-Low', range: '1.0–2.9 ng/mL', color: '#2563eb', bg: '#eff6ff' },
  { key: 'intermediate-high', label: 'Intermediate-High',range: '3.0–9.9 ng/mL', color: '#d97706', bg: '#fffbeb' },
  { key: 'high',              label: 'High',             range: '≥ 10.0 ng/mL',  color: '#dc2626', bg: '#fef2f2' },
];

/* ─── MRI PI-RADS Scale definition (PI-RADS v2.1 official categories) ─── */
const MRI_TIER_SCALE = [
  { pirads: [1, 2], label: 'PI-RADS 1–2', meaning: 'Very Low / Low',          color: '#16a34a', bg: '#f0fdf4' },
  { pirads: [3],    label: 'PI-RADS 3',   meaning: 'Intermediate (Equivocal)', color: '#2563eb', bg: '#eff6ff' },
  { pirads: [4],    label: 'PI-RADS 4',   meaning: 'High — Likely',            color: '#d97706', bg: '#fffbeb' },
  { pirads: [5],    label: 'PI-RADS 5',   meaning: 'Very High — Highly Likely',color: '#dc2626', bg: '#fef2f2' },
];

/* ─── Main Component ─── */
const Part2Results = ({
  result,
  preResult,
  preData,
  onEditAnswers,
  onStartOver,
  storageMode,
  postData,
  sessionId = null,
  userEmail = null,
  userPhone = null,
  onSaveToCloud = null,
  cloudAvailable = false,
  saveToCloudPending = false,
  saveToCloudError = null,
}) => {
  const [showPrintableForm, setShowPrintableForm] = useState(false);

  const handleExportCsv = () => {
    const rows = buildPart2CsvRows(postData, preResult, result, {});
    const filename = `ePSA_Part2_Results_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(filename, rows);
  };

  const footerDisclaimerText =
    'ePSA is an educational tool — not a medical test or clinical diagnosis. Your results are based on population-level data and are meant to help you start a conversation with your doctor, not replace one. Always speak with a physician before making any health decisions. — Ashutosh K. Tewari, MD, Icahn School of Medicine at Mount Sinai';

  if (showPrintableForm) {
    return (
      <PrintableForm
        formData={{
          ...(preData || {}),
          ...(postData || {}),
          ipssTotal: preResult?.ipssTotal,
          shimTotal: preResult?.shimTotal,
          score: preResult?.score,
          scoreRange: preResult?.scoreRange,
          confidenceRange: preResult?.confidenceRange,
          risk: preResult?.risk,
          action: preResult?.action,
          bmi: preResult?.bmi ?? preData?.bmi,
          age: preResult?.age ?? preData?.age,
        }}
        onBack={() => setShowPrintableForm(false)}
      />
    );
  }

  if (!result) {
    return (
      <div className="p2r-container">
        <p className="p2r-empty">No results available.</p>
        <div className="p2r-disclaimer-box">
          <p>{footerDisclaimerText}</p>
        </div>
      </div>
    );
  }

  const {
    riskPct,
    riskPctRange,
    riskCat,
    riskClass,
    nextSteps,
    psaValue,
    psaAdjusted,
    psaAdjustedFlag,
    isOtherHormonal,
    psaTier,
    discordanceFlag,
    lowPsaWarning,
    lowPsaWarningText,
    psadValue,
    psadPoints,
    psadFlag,
    biopsyRecommended = false,
    biopsyReason = null,
    biopsyMessage = null,
    pathwayMode = 'post_mri',
    empiricalProbabilityText = null,
    piradsConfidenceText = null,
    epsaTierKey = null,
  } = result;

  const getRiskColor = (rc) => {
    const cls = String(rc || '').toLowerCase();
    if (cls.includes('very') || (cls.includes('high') && !cls.includes('mod'))) return '#dc2626';
    if (cls.includes('moderate')) return '#d97706';
    return '#16a34a';
  };

  const riskColor = getRiskColor(riskClass);
  const cleanRiskCat = (riskCat || '').replace(/[🟢🟡🟠🔴]/g, '').trim();

  const riskCardClass =
    riskColor === '#dc2626' ? 'p2r-risk-card--high' :
    riskColor === '#d97706' ? 'p2r-risk-card--moderate' :
    'p2r-risk-card--low';

  return (
    <div className="p2r-container" role="main">

      {/* ── Cloud row ── */}
      {(storageMode === 'local' && cloudAvailable && onSaveToCloud) && (
        <div className="p2r-cloud-row">
          {storageMode === 'cloud' && (
            <div className="p2r-cloud-saved">
              <CloudIcon size={13} /><span>Saved to cloud</span>
            </div>
          )}
          {storageMode === 'local' && cloudAvailable && onSaveToCloud && (
            <div className="p2r-cloud-move">
              <button
                type="button"
                className="p2r-btn-move-cloud"
                onClick={onSaveToCloud}
                disabled={saveToCloudPending}
              >
                <CloudIcon size={16} />
                {saveToCloudPending ? 'Saving…' : 'Save to Cloud'}
              </button>
              {saveToCloudError && <span className="p2r-cloud-err">{saveToCloudError}</span>}
            </div>
          )}
        </div>
      )}

      {/* ── Clinical Notices (consolidated) ── */}
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

      {/* ── 5-ARI PSA Correction Notice ── */}
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
            <p className="v2-ari-notice-text">
              Finasteride and dutasteride suppress PSA by ~50%. Per the{' '}
              <strong>AUA/SUO 2026 Early Detection Guideline</strong> and REDUCE trial,
              the reported PSA is multiplied by 2 before risk scoring.
            </p>
            <p className="v2-ari-notice-note">
              Note: The AUA/SUO 2026 guideline acknowledges individual variability — only ~1/3 of patients
              achieve the expected 40–60% PSA decline at 1 year. This is a standard clinical default.
              Discuss your adjusted PSA with your physician.
            </p>
          </div>
        </div>
      )}

      {/* ── Other Hormonal Therapy Notice ── */}
      {isOtherHormonal && (
        <div className="p2r-alert p2r-alert--warning" role="alert">
          <PillIcon size={16} className="p2r-alert-icon" />
          <div>
            <div className="p2r-alert-title">Hormonal Therapy Noted</div>
            <p className="p2r-alert-body">
              You reported using hormonal therapy. No validated PSA correction factor exists
              for this therapy type in current AUA/NCCN guidelines. Your PSA has been used
              as reported. Inform your physician of all medications when interpreting your PSA results.
            </p>
          </div>
        </div>
      )}

      {/* ── Biopsy / Urology Referral Banner ── */}
      {/* Fires on post_psa and post_mri pathways per AUA/SUO 2026 — elevated    */}
      {/* combined risk score warrants biopsy discussion regardless of MRI status */}
      {biopsyRecommended && biopsyMessage && (
        <div
          className={`v2-alert-banner v2-alert-banner--${biopsyReason === 'high_risk_discordance' ? 'amber' : 'red'}`}
          role="alert"
        >
          <div className="v2-alert-banner-head">
            <AlertCircleIcon size={18} className="v2-alert-banner-icon" />
            <span className="v2-alert-banner-title">
              {biopsyReason === 'high_risk_discordance'
                ? 'UROLOGIST REVIEW RECOMMENDED'
                : 'BIOPSY DISCUSSION RECOMMENDED'}
            </span>
          </div>
          <p className="v2-alert-banner-body">{biopsyMessage}</p>
          <p className="v2-alert-banner-source">
            Source: AUA/SUO 2026 Early Detection Guideline —{' '}
            {biopsyReason === 'pirads_5'
              ? 'PI-RADS 5 findings require biopsy discussion without delay (Rec. 28).'
              : biopsyReason === 'combined_score_high'
              ? 'Elevated combined risk profile warrants urology referral and shared decision-making regarding biopsy.'
              : 'Significant discordance between ePSA risk profile and PSA level warrants urologist evaluation.'}
          </p>
        </div>
      )}

      {/* ── Risk Summary Card ── */}
      <div className={`p2r-risk-card ${riskCardClass}`} role="region" aria-label="Risk assessment result">
        <div className="p2r-risk-label">
          {pathwayMode === 'post_mri'
            ? 'Full Workup Assessment — PSA + MRI + ePSA'
            : pathwayMode === 'post_psa'
            ? 'Combined Risk Profile — PSA + ePSA Context'
            : 'Educational Risk Category'}
        </div>
        <div className="p2r-risk-tier-row">
          <RiskIcon riskClass={riskClass} />
          <span className="p2r-risk-tier-title" style={{ color: riskColor }}>{cleanRiskCat}</span>
        </div>
        <RiskLevelBar riskClass={riskClass} />
        <div className="p2r-risk-card-note">
          Educational estimate — discuss with your doctor before taking action.
        </div>
      </div>

      {/* ── v2 Tier bar — "you are here" ── */}
      {(() => {
        const cls = String(riskClass || '').toLowerCase();
        const activeIdx = cls === 'very-high-risk' ? 3 : cls === 'high-risk' ? 2 : cls === 'moderate-risk' ? 1 : 0;
        const tiers = [
          { label: 'Low',          range: '< 14 pts',  color: '#16a34a' },
          { label: 'Int-Low',      range: '14–27 pts', color: '#2563eb' },
          { label: 'Int-High',     range: '28–55 pts', color: '#d97706' },
          { label: 'High',         range: '≥ 56 pts',  color: '#dc2626' },
        ];
        return (
          <div className="v2-tier-bar">
            {tiers.map((t, i) => (
              <div
                key={t.label}
                className={`v2-tier-bar-seg${i === activeIdx ? ' v2-tier-bar-seg--active' : ''}`}
                style={i === activeIdx ? { background: t.color } : {}}
              >
                <span className="v2-tier-bar-you">▲ you</span>
                <span className="v2-tier-bar-label">{t.label}</span>
                <span className="v2-tier-bar-range">{t.range}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── 3-Step Action Plan ── */}
      <div className="v2-action-plan">
        <div className="v2-action-plan-header">
          <div className="v2-action-plan-eyebrow" style={{ color: riskColor }}>
            Your personalised action plan
          </div>
          <h3 className="v2-action-plan-title">What to do next</h3>
          <p className="v2-action-plan-desc">Based on your combined risk profile, here are the recommended next steps.</p>
        </div>
        <div className="v2-action-steps">
          <div className="v2-action-step">
            <div className="v2-action-step-num" style={{ background: riskColor }}>1</div>
            <div>
              <div className="v2-action-step-title">Book a urology referral</div>
              <div className="v2-action-step-desc">Ask your GP to refer you to a urologist for evaluation of your PSA result and risk profile.</div>
            </div>
            <div className="v2-action-step-when">Today</div>
          </div>
          <div className="v2-action-step">
            <div className="v2-action-step-num" style={{ background: riskColor }}>2</div>
            <div>
              <div className="v2-action-step-title">Bring your ePSA results</div>
              <div className="v2-action-step-desc">Print or download your ePSA report to share with your specialist at the appointment.</div>
            </div>
            <div className="v2-action-step-when">Week 1</div>
          </div>
          <div className="v2-action-step">
            <div className="v2-action-step-num" style={{ background: riskColor }}>3</div>
            <div>
              <div className="v2-action-step-title">Discuss biopsy options</div>
              <div className="v2-action-step-desc">Your urologist will advise whether a repeat PSA, MRI, or biopsy is the right next step for you.</div>
            </div>
            <div className="v2-action-step-when">Week 2–4</div>
          </div>
        </div>
      </div>

      {/* ── Part 1 Full Profile Carryover ── */}
      {preResult && (
        <Part1ProfileCard preResult={preResult} preData={preData} postData={postData} />
      )}

      {/* ── Next Steps / Recommendations ── */}
      <div className="p2r-recommendations" style={{ borderLeftColor: riskColor }}>
        <div className="p2r-rec-label" style={{ color: riskColor }}>
          Recommended Next Steps
        </div>
        <ul className="p2r-rec-list">
          {(nextSteps?.length
            ? nextSteps
            : ['Discuss these results with your physician and review PSA/MRI follow-up options.']
          ).map((step, index) => {
            const hasVideoLink = step.includes('Learn more about prostate cancer health');
            const hasMobileUnit = step.includes('Mount Sinai Mobile Unit');
            const cleanStep = step.replace(' →', '');

            return (
              <li key={index} className="p2r-rec-item">
                <span className="p2r-rec-bullet" style={{ color: riskColor }} aria-hidden="true">›</span>
                <span className="p2r-rec-text">{cleanStep}</span>
                {hasVideoLink && (
                  <a
                    href="https://www.youtube.com/@ashtewarimd7526"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p2r-rec-link"
                    aria-label="Watch prostate cancer health video"
                    title="Watch Video"
                  >
                    <ExternalLinkIcon size={14} />
                  </a>
                )}
                {hasMobileUnit && (
                  <a
                    href="https://events.mountsinaihealth.org/search/events?event_types%5B%5D=37714143563487"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p2r-rec-link"
                    aria-label="View Mobile Unit location"
                    title="View Mobile Unit Location"
                  >
                    <MapPinIcon size={14} />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── How your score was composed ── */}
      <div className="v2-score-stack">
        <div className="v2-score-stack-head">
          <span className="v2-score-stack-title">How your score was composed</span>
          <span className="v2-score-stack-sub">Component breakdown</span>
        </div>
        <div className="v2-score-stack-row">
          <span className="v2-score-stack-label">Part 1 Baseline (ePSA)</span>
          <span className="v2-score-stack-val">{preResult?.score ?? '—'}%</span>
          <div className="v2-score-stack-bar-track">
            <div className="v2-score-stack-bar-fill" style={{ width: `${Math.min(100, preResult?.score ?? 0)}%` }} />
          </div>
          <span className="v2-score-stack-pts">{preResult?.epsaTierLabel || preResult?.risk || '—'}</span>
        </div>
        <div className="v2-score-stack-row">
          <span className="v2-score-stack-label">PSA Level</span>
          <span className="v2-score-stack-val">{postData?.psa ? `${postData.psa} ng/mL` : '—'}</span>
          <div className="v2-score-stack-bar-track">
            <div className="v2-score-stack-bar-fill" style={{ width: `${Math.min(100, (parseFloat(postData?.psa) / 20) * 100)}%` }} />
          </div>
          <span className="v2-score-stack-pts">{psaTier || '—'}</span>
        </div>
        {psadValue != null && (
          <div className="v2-score-stack-row">
            <span className="v2-score-stack-label">PSA Density</span>
            <span className="v2-score-stack-val">{psadValue.toFixed(3)} ng/mL/mL</span>
            <div className="v2-score-stack-bar-track">
              <div className="v2-score-stack-bar-fill" style={{ width: `${Math.min(100, (psadValue / 0.4) * 100)}%` }} />
            </div>
            <span className="v2-score-stack-pts" style={{ color: psadFlag ? '#d97706' : undefined }}>{psadFlag ? 'Elevated' : 'Normal'}</span>
          </div>
        )}
        {postData?.knowPirads && postData?.pirads && (
          <div className="v2-score-stack-row">
            <span className="v2-score-stack-label">MRI PI-RADS</span>
            <span className="v2-score-stack-val">PI-RADS {postData.pirads}</span>
            <div className="v2-score-stack-bar-track">
              <div className="v2-score-stack-bar-fill" style={{ width: `${(Number(postData.pirads) / 5) * 100}%` }} />
            </div>
            <span className="v2-score-stack-pts">{Number(postData.pirads) >= 4 ? 'High' : Number(postData.pirads) === 3 ? 'Equivocal' : 'Low'}</span>
          </div>
        )}
        <div className="v2-score-stack-total">
          <span className="v2-score-stack-total-label">Combined Risk Category</span>
          <span className="v2-score-stack-total-val" style={{ color: riskColor }}>{cleanRiskCat}</span>
        </div>
      </div>

      {/* ── What happens next timeline ── */}
      <div className="v2-timeline">
        <div className="v2-timeline-head">
          <span className="v2-timeline-title">What happens next</span>
        </div>
        <div className="v2-timeline-track">
          <div className="v2-timeline-step v2-timeline-step--current">
            <span className="v2-timeline-when">Today</span>
            <span className="v2-timeline-desc">Review results and download your report</span>
          </div>
          <div className="v2-timeline-step">
            <span className="v2-timeline-when">Week 1</span>
            <span className="v2-timeline-desc">Book urology referral via your GP</span>
          </div>
          <div className="v2-timeline-step">
            <span className="v2-timeline-when">Week 2–4</span>
            <span className="v2-timeline-desc">Attend specialist appointment with results</span>
          </div>
          <div className="v2-timeline-step">
            <span className="v2-timeline-when">Week 4–8</span>
            <span className="v2-timeline-desc">Decide on further workup (biopsy / watchful waiting)</span>
          </div>
        </div>
      </div>

      {/* ── Your inputs label ── */}
      <div className="v2-inputs-label">YOUR INPUTS &amp; DETAILED BREAKDOWN</div>

      {/* ── Expandable detail sections ── */}
      <div className="p2r-details">
        <CollapsibleSection title="How This Was Calculated" defaultOpen>
          <p>Part 2 combines your Part 1 risk profile with your PSA level and — if provided — MRI PI-RADS score. Your result is placed into a risk tier based on guideline thresholds from AUA, NCCN, and EAU. PSA-based screening combined with shared decision-making is the recommended standard — this is an educational supplement, not a clinical diagnosis. A newly elevated PSA should be confirmed with a repeat test before any biopsy or further workup.</p>

          {/* PSA Tier Breakdown */}
          <div className="p2r-breakdown-block">
            <div className="p2r-breakdown-heading">
              <FlaskConicalIcon size={13} style={{ flexShrink: 0 }} />
              <span>PSA Level Tier</span>
            </div>
            <div className="p2r-tier-chips-grid">
              {PSA_TIER_SCALE.map(({ key, label, range, color, bg }) => {
                const activePsaKey = psaTier ? psaTier.toLowerCase() : null;
                const isActive = activePsaKey === key;
                return (
                  <div
                    key={key}
                    className={`p2r-tier-chip${isActive ? ' p2r-tier-chip--active' : ''}`}
                    style={isActive ? { background: bg, borderColor: color, color } : {}}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <span className="p2r-tier-chip-label">{label}</span>
                  </div>
                );
              })}
            </div>
            {psaTier && (
              <p className="p2r-breakdown-why">
                Your PSA level falls in the <strong>{psaTier}</strong> tier.
              </p>
            )}
          </div>

          {/* MRI PI-RADS Breakdown */}
          {postData?.knowPirads && postData?.pirads != null && (
            <div className="p2r-breakdown-block">
              <div className="p2r-breakdown-heading">
                <ActivityIcon size={13} style={{ flexShrink: 0 }} />
                <span>MRI PI-RADS Tier</span>
              </div>
              <div className="p2r-tier-chips-grid">
                {MRI_TIER_SCALE.map(({ pirads: piradsArr, label, meaning, color, bg }) => {
                  const piradsNum = Number(postData.pirads);
                  const isActive = piradsArr.includes(piradsNum);
                  return (
                    <div
                      key={label}
                      className={`p2r-tier-chip${isActive ? ' p2r-tier-chip--active' : ''}`}
                      style={isActive ? { background: bg, borderColor: color, color } : {}}
                      aria-current={isActive ? 'true' : undefined}
                    >
                      <span className="p2r-tier-chip-label">{label}</span>
                    </div>
                  );
                })}
              </div>
              {piradsConfidenceText && (
                <p className="p2r-breakdown-why">{piradsConfidenceText}</p>
              )}
            </div>
          )}
          {/* Cohort validation data card */}
          <div className="p2r-cohort-card">
            <div className="p2r-cohort-heading">
              <FlaskConicalIcon size={13} />
              <span>Cohort Validation Data — Mount Sinai (N=94)</span>
            </div>
            <p className="p2r-cohort-note">
              These rates are from our prospectively collected biopsied referral cohort (N=94, 23 clinically
              significant cancers, GG≥3). All patients were referred for biopsy; rates reflect a biopsied
              population, not a general screening population.
            </p>
            <div className="p2r-cohort-table-wrap">
              <table className="p2r-cohort-table">
                <thead>
                  <tr>
                    <th>Combined Risk Tier</th>
                    <th>Score Range</th>
                    <th>N</th>
                    <th>csPCa Events</th>
                    <th>csPCa Rate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={result.epsaTierKey === 'low' ? 'p2r-cohort-row--active' : ''}>
                    <td>Low</td><td>≤ 13 pts</td><td>—</td><td>—</td>
                    <td><span className="p2r-cohort-na">No data (low-risk referrals not biopsied)</span></td>
                  </tr>
                  <tr className={result.epsaTierKey === 'intermediate-low' ? 'p2r-cohort-row--active' : ''}>
                    <td>Int-Low</td><td>14–27 pts</td><td>4</td><td>1</td>
                    <td><span className="p2r-cohort-rate p2r-cohort-rate--yellow">25% <span className="p2r-cohort-caution">(small N)</span></span></td>
                  </tr>
                  <tr className={result.epsaTierKey === 'intermediate-high' ? 'p2r-cohort-row--active' : ''}>
                    <td>Int-High</td><td>28–55 pts</td><td>58</td><td>12</td>
                    <td><span className="p2r-cohort-rate p2r-cohort-rate--amber">21%</span></td>
                  </tr>
                  <tr className={result.epsaTierKey === 'high' ? 'p2r-cohort-row--active' : ''}>
                    <td>High</td><td>≥ 56 pts</td><td>32</td><td>10</td>
                    <td><span className="p2r-cohort-rate p2r-cohort-rate--red">31%</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="p2r-cohort-model-row">
              <div className="p2r-cohort-model-item">
                <span className="p2r-cohort-model-val">0.600</span>
                <span className="p2r-cohort-model-key">Post-PSA Model AUC <span className="p2r-cohort-model-ci">[0.463–0.735]</span></span>
              </div>
              <div className="p2r-cohort-model-item">
                <span className="p2r-cohort-model-val">0.579</span>
                <span className="p2r-cohort-model-key">PSA Alone AUC <span className="p2r-cohort-model-ci">[0.442–0.712]</span></span>
              </div>
              <div className="p2r-cohort-model-item">
                <span className="p2r-cohort-model-val">94</span>
                <span className="p2r-cohort-model-key">Biopsied patients (N)</span>
              </div>
            </div>
            {pathwayMode === 'post_mri' && (
              <p className="p2r-cohort-mri-note">
                MRI (PI-RADS) was not collected in the N=94 validation cohort. Post-MRI PI-RADS
                scoring is based on AUA/NCCN/EAU v2.1 guidelines — empirical calibration for
                Model 3 is pending.
              </p>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Shared Decision-Making Guide">
          <p style={{ marginBottom: '0.6rem' }}>
            Choosing the next step after a risk assessment is not just about the numbers — it is about how each option could affect your everyday life. Shared decision-making means you and your doctor decide together, based on your risk level, your health, and what matters most to you.
          </p>
          <p style={{ fontWeight: 700, marginBottom: '0.3rem', fontSize: '0.85rem' }}>Key topics to discuss with your clinician:</p>
          <ol style={{ paddingLeft: '1.3rem', lineHeight: 1.7, fontSize: '0.875rem', marginBottom: '0.75rem' }}>
            <li><strong>How serious your risk is</strong> — your risk tier and what it means for next steps.</li>
            <li><strong>Your overall health and life expectancy</strong> — age and other health conditions help guide whether watchful waiting, monitoring, or biopsy makes more sense.</li>
            <li><strong>Chances of finding clinically significant cancer</strong> — risk calculators (like this tool) can help estimate likelihood, but they do not replace biopsy for diagnosis.</li>
            <li><strong>Possible side effects of further workup</strong> — a biopsy carries risks (bleeding, infection, anxiety). These should be weighed against the benefit of early detection.</li>
            <li><strong>Your starting point</strong> — current urinary and sexual function (assessed via IPSS, SHIM) is important context for any treatment discussion.</li>
            <li><strong>Your preferences and goals</strong> — what matters most to you (peace of mind, avoiding procedures, preserving function) should guide the plan.</li>
          </ol>
          <p style={{ fontWeight: 700, marginBottom: '0.3rem', fontSize: '0.85rem' }}>Psychological aspects to be aware of:</p>
          <ul style={{ paddingLeft: '1.3rem', lineHeight: 1.7, fontSize: '0.875rem', marginBottom: '0.75rem' }}>
            <li>Waiting for further test results can cause stress, sleep problems, or persistent worry — this is normal.</li>
            <li>Talking openly with your doctor about what results could mean may help reduce fear of the unknown.</li>
            <li>Support groups, counselors, and loved ones can help manage anxiety during the evaluation process.</li>
          </ul>
          <p style={{ fontSize: '0.8125rem', color: '#607286', fontStyle: 'italic', marginBottom: 0 }}>
            Sources: Eastham JA et al. AUA/ASTRO Guideline Part I–II. <em>J Urol.</em> 2022;208(1):10–25. &nbsp;|&nbsp; Schaeffer EM et al. NCCN Guidelines® Insights, Version 3.2024. PMID: 38626801. &nbsp;|&nbsp; Cornford P et al. EAU Guidelines 2024. <em>Eur Urol.</em> 86(2):148–163.
          </p>
        </CollapsibleSection>

        {postData?.knowPirads && (
        <CollapsibleSection title="Understanding PI-RADS / MRI">
          <p>
            MRI and PI-RADS scoring may be used prior to initial biopsy to increase detection of clinically significant prostate cancer (GG2+). A PI-RADS score of 3 or higher indicates a suspicious lesion warranting further evaluation. This tool does not replace a radiologist's interpretation of multiparametric MRI findings.
          </p>
        </CollapsibleSection>
        )}

        <CollapsibleSection title="Model Documentation (ePSA Screening Priority)">
          <ModelDocumentation scope="part2" pathwayMode={pathwayMode} />
        </CollapsibleSection>

        <CollapsibleSection title="Important Disclaimer" defaultOpen>
          <p className="p2r-disclaimer-text">{footerDisclaimerText}</p>
          <p className="p2r-disclaimer-text" style={{ marginTop: '0.5rem' }}>
            <strong>What "risk category" means here:</strong> ePSA groups results into Low, Intermediate-Low,
            Intermediate-High, and High categories based on your PSA and questionnaire answers. These align
            with the <strong>AUA/SUO 2026 Early Detection Guideline</strong> thresholds, which define
            clinically significant prostate cancer as Gleason Grade Group ≥2. A higher category means
            the guideline recommends earlier follow-up — it does not mean you have cancer.
          </p>
          <p className="p2r-disclaimer-text" style={{ marginTop: '0.5rem' }}>
            <strong>If your PSA is elevated:</strong> one high PSA reading is not enough to confirm a problem.
            The AUA recommends a repeat PSA test to confirm the result before any biopsy or procedure is
            considered (unless your MRI showed a PI-RADS 4 or 5 finding or your doctor advises otherwise).
            Temporary PSA elevation can be caused by infection, BPH, or recent physical activity.
          </p>
          <p className="p2r-disclaimer-text" style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
            <strong>Validation note:</strong> Some factors used in ePSA (e.g. diet, chemical exposure,
            inflammation history) are based on published literature associations but are not part of
            the currently validated core model. The core model variables — age, race, BMI, IPSS, family
            history, and PSA — are validated against a clinical cohort (N=94). Expanded variables are
            included as additional clinical context and may not apply equally to all individuals.
          </p>
        </CollapsibleSection>
      </div>

      {/* ── Persistent footer disclaimer ── */}
      <div className="p2r-footer-disclaimer" role="note" aria-label="Educational disclaimer">
        <LucideInfoIcon size={14} className="p2r-footer-disclaimer-icon" />
        <p>
          <strong>For educational use only.</strong> These results are not a diagnosis. Risk categories
          follow AUA/SUO 2026 guideline thresholds. Always talk to your doctor before making any health decisions.
        </p>
      </div>

      {/* ── Resources (video + mobile unit) ── */}
      <div className="p2r-bottom-links-row" aria-label="Resource links">
        <a
          className="p2r-video-pill"
          href="https://www.youtube.com/@ashtewarimd7526"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Watch clinician video resources"
          title="Watch clinician video resources"
        >
          <ExternalLinkIcon size={16} />
          <span>Video Resources</span>
        </a>
      </div>

      {/* ── Action buttons ── */}
      <div className="p2r-actions">
        <div className="p2r-actions-row p2r-actions-row--primary">
          <button className="p2r-btn p2r-btn--outline" onClick={onEditAnswers}>
            <ArrowLeftIcon size={16} /><span>Edit Answers</span>
          </button>
          <button className="p2r-btn p2r-btn--danger" onClick={onStartOver}>
            <RefreshCwIcon size={16} /><span>Start Over</span>
          </button>
        </div>
        <div className="p2r-actions-row">
          <button className="p2r-btn p2r-btn--solid" onClick={() => window.print()}>
            <PrinterIcon size={16} /><span>Print Results</span>
          </button>
          <button className="p2r-btn p2r-btn--outline" onClick={() => setShowPrintableForm(true)}>
            <FileTextIcon size={16} /><span>Printable Form</span>
          </button>
          {(storageMode === 'local' || storageMode === 'cloud') && (
            <>
              <button
                className="p2r-btn p2r-btn--outline"
                onClick={() => {
                  try {
                    const exportData = {
                      version: '1.0',
                      exportDate: new Date().toISOString(),
                      part: 'complete',
                      part1Data: preData || {},
                      part1Result: preResult || {},
                      part2Data: postData || {},
                      part2Result: result || {},
                      userInfo: { email: userEmail || null, phone: userPhone || null, sessionId: sessionId || null },
                    };
                    const url = URL.createObjectURL(new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' }));
                    const a = Object.assign(document.createElement('a'), {
                      href: url,
                      download: `epsa-complete-data-${new Date().toISOString().split('T')[0]}.json`,
                    });
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  } catch (err) {
                    alert('Export failed. Please try again.');
                  }
                }}
              >
                <DownloadIcon size={16} /><span>Export JSON</span>
              </button>
              <button className="p2r-btn p2r-btn--outline" onClick={handleExportCsv}>
                <DownloadIcon size={16} /><span>Export CSV</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Biopsy / AS Tool CTA ── */}
      {(epsaTierKey === 'intermediate-high' || epsaTierKey === 'high') && (
        <div className="v2-as-tool-cta">
          <span className="v2-as-tool-cta-label">Already had a biopsy?</span>
          <p className="v2-as-tool-cta-desc">Use our AI Surveillance Tool to assess your active surveillance options.</p>
          <a
            href={`https://as.millionstrongmen.com?psa=${encodeURIComponent(psaValue ?? '')}&source=epsa`}
            target="_blank"
            rel="noopener noreferrer"
            className="v2-as-tool-cta-btn"
          >
            Open AS Tool →
          </a>
        </div>
      )}
    </div>
  );
};

export default Part2Results;
