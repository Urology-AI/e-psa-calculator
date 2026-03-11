import React, { useState } from 'react';
import './Part1Results.css';
import { RISK_COLORS } from '../utils/riskColors';
import PrintableForm from './PrintableForm';
import { downloadCsv, buildPart1CsvRows } from '../utils/exportCsv';
import {
  ArrowLeftIcon,
  RefreshCwIcon,
  PrinterIcon,
  FileTextIcon,
  DownloadIcon,
  CloudIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InfoIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  AlertCircleIcon,
} from 'lucide-react';

/* ─── SVG Risk Gauge ─── */
const RiskGauge = ({ score, risk }) => {
  const cx = 140, cy = 142, r = 108, strokeW = 26;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const arcPath = (startDeg, endDeg) => {
    const x1 = cx + r * Math.cos(toRad(startDeg));
    const y1 = cy - r * Math.sin(toRad(startDeg));
    const x2 = cx + r * Math.cos(toRad(endDeg));
    const y2 = cy - r * Math.sin(toRad(endDeg));
    const large = Math.abs(startDeg - endDeg) > 180 ? 1 : 0;
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 0 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };

  // Needle angle: score 0→100 maps from 180°→0°
  const clampedScore = Math.min(100, Math.max(0, score || 0));
  const needleAngle = 180 - (clampedScore / 100) * 180;
  const needleLen = r - strokeW - 4;
  const needleTipX = cx + needleLen * Math.cos(toRad(needleAngle));
  const needleTipY = cy - needleLen * Math.sin(toRad(needleAngle));

  // Zone colors with slight transparency for depth
  const colors = {
    lower: '#16a34a',
    moderate: '#d97706',
    higher: '#dc2626',
    track: '#e2eaf2',
  };

  const activeColor =
    risk === 'LOWER' ? colors.lower :
    risk === 'HIGHER' ? colors.higher :
    colors.moderate;

  return (
    <figure className="risk-gauge-figure" aria-label={`Risk gauge showing ${risk} risk`}>
      <svg
        viewBox="0 0 280 160"
        xmlns="http://www.w3.org/2000/svg"
        className="risk-gauge-svg"
        role="img"
        aria-label={`Risk level: ${risk}, Score: ${clampedScore}%`}
      >
        {/* Background track */}
        <path
          d={arcPath(182, -2)}
          fill="none"
          stroke={colors.track}
          strokeWidth={strokeW + 6}
          strokeLinecap="butt"
        />
        {/* LOWER zone — green (180°→122°) */}
        <path
          d={arcPath(180, 122)}
          fill="none"
          stroke={colors.lower}
          strokeWidth={strokeW}
          strokeLinecap="butt"
          opacity={risk === 'LOWER' ? '1' : '0.35'}
        />
        {/* MODERATE zone — amber (118°→62°) */}
        <path
          d={arcPath(118, 62)}
          fill="none"
          stroke={colors.moderate}
          strokeWidth={strokeW}
          strokeLinecap="butt"
          opacity={risk === 'MODERATE' ? '1' : '0.35'}
        />
        {/* HIGHER zone — red (58°→0°) */}
        <path
          d={arcPath(58, 0)}
          fill="none"
          stroke={colors.higher}
          strokeWidth={strokeW}
          strokeLinecap="butt"
          opacity={risk === 'HIGHER' ? '1' : '0.35'}
        />

        {/* Needle shadow */}
        <line
          x1={cx} y1={cy + 2}
          x2={needleTipX} y2={needleTipY + 2}
          stroke="rgba(0,0,0,0.12)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Needle */}
        <line
          x1={cx} y1={cy}
          x2={needleTipX} y2={needleTipY}
          stroke="#1e3a5f"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Needle base ring */}
        <circle cx={cx} cy={cy} r="9" fill="#1e3a5f" />
        <circle cx={cx} cy={cy} r="5" fill="#fff" />

        {/* Zone labels */}
        <text x="8"  y="153" fontSize="9.5" fill={colors.lower}    fontWeight="800" fontFamily="Inter, sans-serif" letterSpacing="0.04em">LOWER</text>
        <text x="110" y="22"  fontSize="9.5" fill={colors.moderate} fontWeight="800" fontFamily="Inter, sans-serif" letterSpacing="0.04em">MODERATE</text>
        <text x="218" y="153" fontSize="9.5" fill={colors.higher}   fontWeight="800" fontFamily="Inter, sans-serif" letterSpacing="0.04em">HIGHER</text>

        {/* Score display under needle */}
        <text
          x={cx} y={cy + 24}
          fontSize="13"
          fill={activeColor}
          fontWeight="800"
          fontFamily="Inter, sans-serif"
          textAnchor="middle"
          letterSpacing="-0.02em"
        >
          {clampedScore}%
        </text>
      </svg>
      <figcaption className="risk-gauge-caption" style={{ color: activeColor }}>
        {risk} RISK
      </figcaption>
    </figure>
  );
};

/* ─── Collapsible Section ─── */
const CollapsibleSection = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="collapsible-section">
      <button
        className="collapsible-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        type="button"
      >
        <span>{title}</span>
        {open ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  );
};

/* ─── Risk Icon ─── */
const RiskIcon = ({ risk }) => {
  if (risk === 'LOWER') return <CheckCircle2Icon size={22} className="risk-icon risk-icon--lower" />;
  if (risk === 'MODERATE') return <AlertTriangleIcon size={22} className="risk-icon risk-icon--moderate" />;
  return <AlertCircleIcon size={22} className="risk-icon risk-icon--higher" />;
};

/* ─── Main Component ─── */
const Part1Results = ({
  result,
  onEditAnswers,
  onStartOver,
  formData,
  storageMode,
  hideBackButton = false,
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
    const rows = buildPart1CsvRows(formData, result, {});
    const filename = `ePSA_Part1_Results_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(filename, rows);
  };

  if (showPrintableForm) {
    return <PrintableForm formData={formData} onBack={() => setShowPrintableForm(false)} />;
  }

  if (!result) {
    return (
      <div className="results-container">
        <p className="results-empty">No results available.</p>
      </div>
    );
  }

  const {
    score,
    scoreRange,
    risk,
    color,
    action,
    ipssTotal,
    shimTotal,
    bmi,
    age,
    recommendPSA,
    tierRisk,
    epsaTierLabel,
    epsaPsaEquivalent,
    epsaGuidelineText,
  } = result;

  const displayRange = result.displayRange || result.confidenceRange;
  const activeTier = tierRisk || risk;

  const recommendationLabel =
    recommendPSA === true  ? 'PSA Screening Recommended' :
    recommendPSA === false ? 'PSA Not Currently Recommended' :
    'Recommendation Unavailable';

  const riskBadgeLabel = recommendPSA == null ? `${risk} RISK` : recommendationLabel.toUpperCase();

  const getSoftenedActionText = (tier, fallback) => {
    if (typeof fallback === 'string' && fallback.trim().length > 0) return fallback;
    switch (tier) {
      case 'LOWER':
        return 'Consider using this result to support a routine conversation with your healthcare provider, especially if you have questions about screening, family history, or symptoms.';
      case 'MODERATE':
        return 'Consider discussing this result with your healthcare provider. Together you can decide whether PSA screening makes sense based on your age, preferences, and prior results.';
      case 'HIGHER':
        return 'Consider prioritizing a discussion with your healthcare provider. They can help interpret this estimate and decide whether additional evaluation — such as PSA testing or follow-up — is appropriate.';
      default:
        return 'Consider discussing these results with your healthcare provider.';
    }
  };

  const getTierDescription = (tier) => {
    switch (tier) {
      case 'LOWER':
        return 'LOWER suggests a lower estimated likelihood relative to others in the model\'s reference data. Lower does not mean no risk, and it does not replace clinician guidance.';
      case 'MODERATE':
        return 'MODERATE suggests an estimated likelihood in the middle range of the model\'s reference data. Reviewing personal risk factors and prior PSA history with a clinician may add important context.';
      case 'HIGHER':
        return 'HIGHER suggests a higher estimated likelihood relative to others in the model\'s reference data. Higher does not mean cancer is present — it may be a useful prompt to review screening options with a clinician.';
      default:
        return '';
    }
  };

  const riskBgClass =
    activeTier === 'LOWER'    ? 'risk-card--lower' :
    activeTier === 'HIGHER'   ? 'risk-card--higher' :
    'risk-card--moderate';

  const metrics = [
    { label: 'Age', value: age, unit: 'yrs' },
    { label: 'BMI', value: bmi, unit: '' },
    { label: 'IPSS Score', value: `${ipssTotal}/35`, unit: '' },
    { label: 'SHIM Score', value: `${shimTotal}/25`, unit: '' },
  ];

  return (
    <div className="results-container" role="main">

      {/* ── Session / Cloud row ── */}
      {(sessionId || (storageMode === 'local' && cloudAvailable && onSaveToCloud)) && (
        <div className="results-cloud-row">
          {sessionId && (
            <div className="session-pill">
              <span className="session-pill-label">Session</span>
              <code className="session-pill-code">{sessionId}</code>
            </div>
          )}
          {storageMode === 'cloud' && sessionId && (
            <div className="cloud-saved-badge">
              <CloudIcon size={13} />
              <span>Saved to cloud</span>
            </div>
          )}
          {storageMode === 'local' && cloudAvailable && onSaveToCloud && (
            <div className="cloud-move-row">
              <button
                type="button"
                className="btn-move-cloud"
                onClick={onSaveToCloud}
                disabled={saveToCloudPending}
              >
                <CloudIcon size={16} />
                {saveToCloudPending ? 'Saving…' : 'Save to Cloud'}
              </button>
              {saveToCloudError && (
                <span className="cloud-error-msg">{saveToCloudError}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Risk Summary Card ── */}
      <div className={`risk-summary-card ${riskBgClass}`} role="region" aria-label="Risk assessment result">
        <div className="risk-summary-header">
          <div className="risk-summary-label">Your ePSA Risk Assessment</div>
          <div className="risk-summary-tier-row">
            <RiskIcon risk={activeTier} />
            <span className="risk-tier-text" style={{ color }}>
              {epsaTierLabel || activeTier}
            </span>
          </div>
          {epsaPsaEquivalent && (
            <div className="risk-psa-equivalent">
              PSA equivalent: <strong>{epsaPsaEquivalent}</strong>
            </div>
          )}
        </div>

        {/* Gauge */}
        <RiskGauge score={score} risk={activeTier} />

        {/* Recommendation pill */}
        <div className="risk-rec-pill" style={{ background: color }}>
          {riskBadgeLabel}
        </div>
      </div>

      {/* ── Guideline text ── */}
      {epsaGuidelineText && (
        <div className="guideline-banner" role="note">
          <InfoIcon size={15} className="guideline-banner-icon" />
          <p>{epsaGuidelineText}</p>
        </div>
      )}

      {/* ── Recommendation box ── */}
      <div className="recommendation-card" style={{ borderLeftColor: color }}>
        <div className="rec-card-label" style={{ color }}>Clinician Discussion Guidance</div>
        <p className="rec-card-text">{getSoftenedActionText(activeTier, action)}</p>
        {recommendPSA != null && (
          <p className="rec-card-sub">
            {recommendPSA
              ? 'Threshold-based recommendation from Part 1 assessment'
              : 'Below recommendation threshold based on Part 1 assessment'}
          </p>
        )}
      </div>

      {/* ── Clinical metrics grid ── */}
      <div className="metrics-grid" role="list" aria-label="Clinical summary metrics">
        {metrics.map((m) => (
          <div className="metric-card" key={m.label} role="listitem">
            <div className="metric-value">
              {m.value}
              {m.unit && <span className="metric-unit">{m.unit}</span>}
            </div>
            <div className="metric-label">{m.label}</div>
          </div>
        ))}
      </div>

      {/* ── Risk tier scale ── */}
      <div className="tier-scale" role="group" aria-label="Risk tier scale">
        {[
          { label: 'LOWER',    sub: 'Fewer risk flags',  color: '#16a34a', bg: '#f0fdf4' },
          { label: 'MODERATE', sub: 'Some risk flags',   color: '#d97706', bg: '#fffbeb' },
          { label: 'HIGHER',   sub: 'Many risk flags',   color: '#dc2626', bg: '#fef2f2' },
        ].map(({ label, sub, color: c, bg }) => {
          const isActive = label === activeTier;
          return (
            <div
              key={label}
              className={`tier-scale-item ${isActive ? 'tier-scale-item--active' : ''}`}
              style={isActive ? { background: bg, borderColor: c, color: c } : {}}
              aria-current={isActive ? 'true' : undefined}
            >
              <div className="tier-scale-label">{label}</div>
              <div className="tier-scale-sub">{sub}</div>
            </div>
          );
        })}
      </div>

      {/* ── Expandable detail sections ── */}
      <div className="detail-sections">
        <CollapsibleSection title="About Your Result" defaultOpen>
          <p>
            Your result is an educational estimate based on the information you entered. It summarizes how
            many prostate cancer risk flags you have — including age, BMI, urinary symptoms, exercise,
            smoking, diet, family and genetic factors, and others — but it does not determine whether
            you do or do not have prostate cancer. Use this as a starting point for a conversation with
            a clinician who can interpret your risk in context.
          </p>
          <p>{getTierDescription(activeTier)}</p>
        </CollapsibleSection>

        <CollapsibleSection title="How This Score Is Calculated">
          <p>
            The ePSA score is a point-based summary of your answers. Each risk factor (e.g. age ≥60,
            BMI ≥30, urinary symptoms, limited exercise, current or former smoking, high red meat diet,
            Black ancestry, family history, BRCA, inflammation history, Agent Orange/chemical exposure,
            or a low SHIM score) contributes points. The total is normalized to a 0–100% scale, and a
            ±5% range is displayed in place of a single number to avoid over-interpretation.
          </p>
          {displayRange && (
            <div className="detail-data-row">
              <span>Displayed Range</span>
              <strong>{displayRange}</strong>
            </div>
          )}
          <div className="detail-data-row">
            <span>Recommendation Threshold</span>
            <strong>{scoreRange}</strong>
          </div>
          <div className="detail-data-row">
            <span>Risk Tier</span>
            <strong>{activeTier}</strong>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Screening Guidelines (AUA/SUO 2026)">
          <p>
            Screening should begin at age 40–45 for people at increased risk — specifically those with
            Black ancestry, germline mutations, or strong family history of prostate cancer. For
            average-risk individuals, a baseline PSA can be offered between ages 45–50, with regular
            screening every 2–4 years for those aged 50–69. Age-based PSA thresholds used clinically
            are approximately: 2.5 ng/mL (ages 40–49), 3.5 (50–59), 4.5 (60–69), and 6.5 (70–79).
          </p>
          <p className="detail-note">
            Current guidelines do not adjust screening thresholds for race, family history, or age
            under 50 as standalone triggers. The ePSA tool intentionally flags these high-risk profiles
            for earlier evaluation — the clinical gap this project is designed to address.
          </p>
        </CollapsibleSection>

        <CollapsibleSection title="Important Disclaimer">
          <p className="detail-disclaimer">
            ePSA is a non-validated educational risk assessment tool. Risk tiers are based on
            population-level data and guideline thresholds from AUA, NCCN, and EAU. In high-risk
            demographic profiles, ePSA may suggest earlier evaluation than standard guideline
            thresholds recommend. This tool does not replace physician judgment and is not intended
            for clinical decision-making without physician review.
          </p>
          <p className="detail-attribution">
            — Ashutosh K. Tewari, MD, Icahn School of Medicine at Mount Sinai
          </p>
        </CollapsibleSection>
      </div>

      {/* ── Action buttons ── */}
      <div className="results-actions">
        <div className="results-actions-row results-actions-row--primary">
          <button className="btn-results btn-results--outline" onClick={onEditAnswers}>
            <ArrowLeftIcon size={16} />
            <span>Edit Answers</span>
          </button>
          <button className="btn-results btn-results--danger-outline" onClick={onStartOver}>
            <RefreshCwIcon size={16} />
            <span>Start Over</span>
          </button>
        </div>
        <div className="results-actions-row">
          <button className="btn-results btn-results--solid" onClick={() => window.print()}>
            <PrinterIcon size={16} />
            <span>Print Results</span>
          </button>
          <button className="btn-results btn-results--outline" onClick={() => setShowPrintableForm(true)}>
            <FileTextIcon size={16} />
            <span>Printable Form</span>
          </button>
          {(storageMode === 'local' || storageMode === 'cloud') && (
            <>
              <button
                className="btn-results btn-results--outline"
                onClick={() => {
                  try {
                    if (!formData || Object.keys(formData).length === 0) {
                      throw new Error('No form data available to export');
                    }
                    const exportData = {
                      version: '1.0',
                      exportDate: new Date().toISOString(),
                      part: 'part1',
                      formData,
                      userInfo: { email: userEmail || null, phone: userPhone || null, sessionId: sessionId || null },
                    };
                    const url = URL.createObjectURL(new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' }));
                    const a = Object.assign(document.createElement('a'), {
                      href: url,
                      download: `epsa-part1-data-${new Date().toISOString().split('T')[0]}.json`,
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
                <DownloadIcon size={16} />
                <span>Export JSON</span>
              </button>
              <button className="btn-results btn-results--outline" onClick={handleExportCsv}>
                <DownloadIcon size={16} />
                <span>Export CSV</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Part1Results;
