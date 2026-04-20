import React, { useState } from 'react';
import './Part2Results.css';
import { RISK_COLORS } from '../utils/riskColors';
import PrintableForm from './PrintableForm';
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
  InfoIcon as LucideInfoIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  AlertCircleIcon,
  ExternalLinkIcon,
  MapPinIcon,
  PillIcon,
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

/* ─── Risk Level Visual Bar ─── */
const RiskLevelBar = ({ riskClass }) => {
  const levels = [
    { id: 'low',      label: 'LOW',       color: '#16a34a' },
    { id: 'moderate', label: 'MODERATE',  color: '#d97706' },
    { id: 'high',     label: 'HIGH',      color: '#dc2626' },
  ];
  const cls = String(riskClass || '').toLowerCase();
  const activeIdx = cls.includes('very') || cls.includes('high') ? 2
    : cls.includes('moderate') ? 1
    : 0;

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
  if (b === 'brca1') return 'BRCA1 mutation';
  if (b === 'brca2') return 'BRCA2 mutation';
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
      {/* Header row */}
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

      {/* Always-visible summary pills */}
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

      {/* Expanded full detail */}
      {expanded && (
        <div className="p2r-profile-detail">
          <div className="p2r-profile-section-label">Demographics &amp; Physical</div>
          <div className="p2r-profile-grid">
            <ProfileRow label="Age" value={formatAge(preResult?.age ?? preData?.age)} />
            <ProfileRow label="Race / Ethnicity" value={formatRace(preData?.race)} />
            <ProfileRow label="BMI" value={formatBmi(preResult?.bmi ?? preData?.bmi)} />
            <ProfileRow label="Family History (PCa)" value={formatFh(preResult?.fhBinary ?? preData?.familyHistory)} highlight={preResult?.fhBinary === 1 || preData?.familyHistory === 'yes'} />
            <ProfileRow label="BRCA Status" value={formatBrca(preResult?.brcaStatus ?? preData?.brcaStatus)} highlight={preData?.brcaStatus === 'brca1' || preData?.brcaStatus === 'brca2'} />
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

  const pointsExplanationText =
    'Your Part 2 result combines your questionnaire profile with your PSA level (and MRI score, if provided). Together, these are used to estimate your risk of prostate cancer that may need treatment — specifically Gleason Grade Group ≥2, which is the standard clinical definition per the AUA/SUO 2026 Early Detection Guideline. This is shown as an educational risk category, not a diagnosis.';

  return (
    <div className="p2r-container" role="main">

      {/* ── Session / Cloud row ── */}
      {(sessionId || (storageMode === 'local' && cloudAvailable && onSaveToCloud)) && (
        <div className="p2r-cloud-row">
          {sessionId && (
            <div className="p2r-session-pill">
              <span className="p2r-session-label">Session</span>
              <code className="p2r-session-code">{sessionId}</code>
            </div>
          )}
          {storageMode === 'cloud' && sessionId && (
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

      {/* ── Low PSA Warning ── */}
      {lowPsaWarning && (
        <div className="p2r-alert p2r-alert--warning" role="alert">
          <AlertTriangleIcon size={16} className="p2r-alert-icon" />
          <div>
            <div className="p2r-alert-title">Low-PSA Notice</div>
            <p className="p2r-alert-body">{lowPsaWarningText}</p>
          </div>
        </div>
      )}

      {/* ── PSA Density (PSAD) note ── */}
      {psadFlag && (
        <div className="p2r-alert p2r-alert--warning" role="note" aria-label="PSA density elevated note">
          <AlertTriangleIcon size={16} className="p2r-alert-icon" />
          <div>
            <div className="p2r-alert-title">PSA Density Notice</div>
            <p className="p2r-alert-body">
              PSA Density elevated (&gt; 0.177 ng/mL/mL) — supports further evaluation per Kadeer et al. 2025.
            </p>
            <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'inherit', opacity: 0.9 }}>
                Source
              </span>
              <ModalInfoIcon
                title="Kadeer et al. 2025 — PSA Density (PSAD)"
                description="Kadeer et al. evaluated PSA derivatives in patients with low PSA levels (≤10 ng/mL) and reported strong diagnostic performance for PSA density."
                sources={fieldReferences.part2.psadKadeer.sources}
              />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'inherit', opacity: 0.95 }}>
                Kadeer et al. 2025 (Front. Oncol. 15:1602134)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── 5-ARI PSA Correction Notice ── */}
      {psaAdjustedFlag && (
        <div
          role="alert"
          style={{
            background: '#fffbeb',
            border: '1px solid #fcd34d',
            borderLeft: '4px solid #d97706',
            borderRadius: '8px',
            padding: '14px 16px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
          }}
        >
          <PillIcon size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#92400e', marginBottom: '6px', letterSpacing: '0.02em' }}>
              PSA ADJUSTED FOR 5-ARI MEDICATION
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <div style={{ background: '#fef3c7', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', color: '#78350f' }}>
                Reported: <strong>{psaValue} ng/mL</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', color: '#d97706', fontSize: '13px', fontWeight: 700 }}>→</div>
              <div style={{ background: '#d97706', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', color: '#fff', fontWeight: 700 }}>
                Adjusted: {psaAdjusted} ng/mL (×2)
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#78350f', lineHeight: 1.5 }}>
              Finasteride and dutasteride suppress PSA by ~50%. Per the{' '}
              <strong>AUA/SUO 2026 Early Detection Guideline</strong> and REDUCE trial,
              the reported PSA is multiplied by 2 before risk scoring.
            </p>
            <p style={{ margin: '6px 0 0', fontSize: '11.5px', color: '#92400e', lineHeight: 1.4, fontStyle: 'italic' }}>
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

      {/* ── Discordance Flag ── */}
      {discordanceFlag && (
        <div
          className={`p2r-alert p2r-alert--${discordanceFlag.severity === 'high' ? 'error' : 'warning'}`}
          role="alert"
        >
          <AlertCircleIcon size={16} className="p2r-alert-icon" />
          <div>
            <div className="p2r-alert-title">Risk Discordance Detected</div>
            <p className="p2r-alert-body">{discordanceFlag.text}</p>
          </div>
        </div>
      )}

      {/* ── Biopsy / Urology Referral Banner ── */}
      {/* Fires on post_psa and post_mri pathways per AUA/SUO 2026 — elevated    */}
      {/* combined risk score warrants biopsy discussion regardless of MRI status */}
      {biopsyRecommended && biopsyMessage && (
        <div
          className="p2r-biopsy-banner"
          role="alert"
          style={{
            background: biopsyReason === 'high_risk_discordance' ? '#fffbeb' : '#fef2f2',
            borderLeft: `4px solid ${biopsyReason === 'high_risk_discordance' ? '#d97706' : '#dc2626'}`,
            borderRadius: '8px',
            padding: '14px 16px',
            marginBottom: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircleIcon
              size={18}
              style={{
                color: biopsyReason === 'high_risk_discordance' ? '#d97706' : '#dc2626',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontWeight: 700,
                fontSize: '13px',
                color: biopsyReason === 'high_risk_discordance' ? '#92400e' : '#991b1b',
                letterSpacing: '0.03em',
              }}
            >
              {biopsyReason === 'high_risk_discordance'
                ? 'UROLOGIST REVIEW RECOMMENDED'
                : 'BIOPSY DISCUSSION RECOMMENDED'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: '#374151', lineHeight: 1.5 }}>
            {biopsyMessage}
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
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
          <span className="p2r-risk-pct" style={{ color: riskColor }}>{cleanRiskCat}</span>
        </div>
        <RiskLevelBar riskClass={riskClass} />
        <div className="p2r-risk-card-note">
          Educational estimate — discuss with your doctor before taking action.
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

      {/* ── Clinical inputs summary ── */}
      <div className="p2r-clinical-grid" role="group" aria-label="Key clinical inputs">
        <div className="p2r-clinical-item">
          <FlaskConicalIcon size={16} className="p2r-clinical-icon" />
          <div>
            <div className="p2r-clinical-val">
              {psaValue != null ? `${psaValue}` : postData?.psa != null ? `${postData.psa}` : '—'}
              {(psaValue != null || postData?.psa != null) && <span className="p2r-clinical-unit"> ng/mL</span>}
            </div>
            <div className="p2r-clinical-key">PSA Level</div>
          </div>
        </div>
        <div className="p2r-clinical-item">
          <ActivityIcon size={16} className="p2r-clinical-icon" />
          <div>
            <div className="p2r-clinical-val">{psaTier || '—'}</div>
            <div className="p2r-clinical-key">PSA Tier</div>
          </div>
        </div>
        <div className="p2r-clinical-item">
          <LucideInfoIcon size={16} className="p2r-clinical-icon" />
          <div>
            <div className="p2r-clinical-val">
              {postData?.knowPirads ? `PI-RADS ${postData.pirads}` : 'Not provided'}
            </div>
            <div className="p2r-clinical-key">MRI Score</div>
          </div>
        </div>

        {psadValue != null && !Number.isNaN(psadValue) && (
          <div className="p2r-clinical-item">
            <LucideInfoIcon size={16} className="p2r-clinical-icon" />
            <div>
              <div className="p2r-clinical-val">
                {Number(psadValue).toFixed(3)}
                <span className="p2r-clinical-unit"> ng/mL/mL</span>
              </div>
              <div className="p2r-clinical-key">PSA Density</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Expandable detail sections ── */}
      <div className="p2r-details">
        <CollapsibleSection title="About This Risk Estimate" defaultOpen>
          <p>{pointsExplanationText}</p>
          <p>
            Your risk category is a starting point for a conversation with your doctor — not a final answer.
            PSA-based screening works best when paired with shared decision-making between you and your physician,
            taking your full health picture into account.
          </p>
        </CollapsibleSection>

        <CollapsibleSection title="Understanding PI-RADS / MRI">
          <p>
            {postData?.knowPirads
              ? 'MRI and PI-RADS scoring may be used prior to initial biopsy to increase detection of clinically significant prostate cancer (GG2+). A PI-RADS score of 3 or higher indicates a suspicious lesion warranting further evaluation. This tool does not replace a radiologist\'s interpretation of multiparametric MRI findings.'
              : 'If PI-RADS is not included, the Part 2 category is based on the baseline estimate and PSA information only. A clinician may recommend MRI (or not) depending on your full clinical context.'}
          </p>
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
    </div>
  );
};

export default Part2Results;
