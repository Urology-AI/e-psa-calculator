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
    'ePSA is a non-validated educational risk assessment tool. Risk tiers are based on population-level data and guideline thresholds from AUA, NCCN, and EAU. In high-risk demographic profiles, ePSA may suggest earlier evaluation than standard guideline thresholds recommend. This tool does not replace physician judgment and is not intended for clinical decision-making without physician review. — Ashutosh K. Tewari, MD, Icahn School of Medicine at Mount Sinai';

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
    'Part 2 combines your Part 1 risk profile with your PSA level and — if provided — MRI PI-RADS score. A logistic regression model calculates an estimated probability of high-grade (Gleason Grade Group ≥3) prostate cancer. This is displayed as an educational risk category, not a clinical diagnosis.';

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

      {/* ── Biopsy Recommendation Banner (post_mri only) ── */}
      {pathwayMode === 'post_mri' && biopsyRecommended && biopsyMessage && (
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
            Source: AUA/NCCN/EAU Guidelines —{' '}
            {biopsyReason === 'pirads_5'
              ? 'PI-RADS 5 findings require biopsy discussion without delay.'
              : biopsyReason === 'combined_score_high'
              ? 'High combined score warrants urology referral and biopsy discussion.'
              : 'Significant discordance between ePSA profile and PSA level warrants evaluation.'}
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
          <span className="p2r-risk-pct" style={{ color: riskColor }}>{riskPct}</span>
        </div>
        {riskPctRange && (
          <div className="p2r-risk-range">
            Display range: <strong>{riskPctRange}</strong>
          </div>
        )}
        <div className="p2r-risk-badge" style={{ background: riskColor }}>
          {cleanRiskCat}
        </div>
        <RiskLevelBar riskClass={riskClass} />
      </div>

      {/* ── Part 1 Reference ── */}
      {preResult && (
        <div className="p2r-part1-ref" role="complementary" aria-label="Part 1 reference data">
          <div className="p2r-part1-ref-label">Based on Part 1 Screening Profile</div>
          <div className="p2r-part1-ref-data">
            <div className="p2r-part1-ref-item">
              <span className="p2r-part1-ref-val">{preResult.score}%</span>
              <span className="p2r-part1-ref-key">ePSA Score</span>
            </div>
            <div className="p2r-part1-ref-divider" aria-hidden="true" />
            <div className="p2r-part1-ref-item">
              <span className="p2r-part1-ref-val">{preResult.risk}</span>
              <span className="p2r-part1-ref-key">Risk Tier</span>
            </div>
            <div className="p2r-part1-ref-divider" aria-hidden="true" />
            <div className="p2r-part1-ref-item">
              <span className="p2r-part1-ref-val">
                {postData?.psa != null ? `${postData.psa} ng/mL` : '—'}
              </span>
              <span className="p2r-part1-ref-key">PSA Level</span>
            </div>
            {postData?.knowPirads && (
              <>
                <div className="p2r-part1-ref-divider" aria-hidden="true" />
                <div className="p2r-part1-ref-item">
                  <span className="p2r-part1-ref-val">PI-RADS {postData.pirads}</span>
                  <span className="p2r-part1-ref-key">MRI Score</span>
                </div>
              </>
            )}
          </div>
        </div>
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
            PSA levels and PI-RADS scores entered here are used solely for educational risk stratification.
            PSA-based screening in combination with shared decision-making is the recommended standard —
            this tool is intended to supplement, not replace, that conversation with your clinician.
          </p>
          <p>
            A newly elevated PSA should usually be confirmed with a repeat test before any biopsy or
            further workup is pursued.
          </p>
        </CollapsibleSection>

        <CollapsibleSection title="Understanding PI-RADS / MRI">
          <p>
            {postData?.knowPirads
              ? 'MRI and PI-RADS scoring may be used prior to initial biopsy to increase detection of clinically significant prostate cancer (GG2+). A PI-RADS score of 3 or higher indicates a suspicious lesion warranting further evaluation. This tool does not replace a radiologist\'s interpretation of multiparametric MRI findings.'
              : 'If PI-RADS is not included, the Part 2 category is based on the baseline estimate and PSA information only. A clinician may recommend MRI (or not) depending on your full clinical context.'}
          </p>
        </CollapsibleSection>

        <CollapsibleSection title="Important Disclaimer">
          <p className="p2r-disclaimer-text">{footerDisclaimerText}</p>
        </CollapsibleSection>
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
