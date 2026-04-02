import React from 'react';
import './ActiveSurveillanceResults.css';
import { downloadCsv, buildASCsvRows } from '../utils/exportCsv';
import { ArrowLeftIcon, RefreshCwIcon, PrinterIcon, DownloadIcon, InfoIcon } from 'lucide-react';

const PointsBadge = ({ points }) => {
  if (points < 0) return <span className="as-points-badge as-points-badge--neg">{points}</span>;
  if (points > 0) return <span className="as-points-badge as-points-badge--pos">+{points}</span>;
  return <span className="as-points-badge as-points-badge--zero">0</span>;
};

const ActiveSurveillanceResults = ({ result, onStartOver, onEditAnswers }) => {
  if (!result) return null;

  const {
    asTierKey,
    asTierLabel,
    asColor,
    asRecommendation,
    asGuidelineSource,
    asScore,
    asFactors = [],
    nccnRiskGroup,
    biopsyGGG,
    coresPositive,
    coresTotal,
    corePct,
    maxCorePct,
    psaValue,
    psadValue,
    psadFlag,
    piradsValue,
    asEmpiricalNote,
    disclaimer,
  } = result;

  const bannerBg = asTierKey === 'as_recommended' ? '#16a34a'
    : asTierKey === 'shared_decision' ? '#d97706'
    : '#dc2626';

  const handleExportCsv = () => {
    const rows = buildASCsvRows(null, null, null, result, {});
    const filename = `ePSA_AS_Results_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(filename, rows);
  };

  return (
    <div className="as-results" role="main">

      {/* ── A. Recommendation banner ── */}
      <div className="as-banner" style={{ background: bannerBg }} role="alert">
        <div className="as-banner-label">{asTierLabel}</div>
        <p className="as-banner-body">{asRecommendation}</p>
        <p className="as-banner-source">Source: {asGuidelineSource}</p>
      </div>

      {/* ── B. NCCN badge ── */}
      <div className="as-nccn-badge" role="note">
        <span className="as-nccn-label">NCCN Classification:</span>
        <span className="as-nccn-value">{nccnRiskGroup}</span>
      </div>

      {/* ── C. Score factors table ── */}
      <div className="as-factors-section">
        <h3 className="as-factors-heading">What went into this assessment</h3>
        <div className="as-factors-table-wrap">
          <table className="as-factors-table" aria-label="Active surveillance scoring factors">
            <thead>
              <tr>
                <th>Factor</th>
                <th>Value</th>
                <th>Points</th>
                <th>Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {asFactors.map((f, i) => (
                <tr key={i}>
                  <td className="as-factors-label">{f.label}</td>
                  <td className="as-factors-value">{f.value}</td>
                  <td className="as-factors-points"><PointsBadge points={f.points} /></td>
                  <td className="as-factors-note">{f.note}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="as-factors-total-label">Total AS Score</td>
                <td><PointsBadge points={asScore} /></td>
                <td className="as-factors-note as-factors-note--muted">Negative = more evidence for AS; Positive = more evidence for treatment</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── D. Biopsy summary ── */}
      <div className="as-summary-row" role="group" aria-label="Biopsy summary">
        <div className="as-summary-item">
          <span className="as-summary-val">GG{biopsyGGG}</span>
          <span className="as-summary-key">Grade Group</span>
        </div>
        <div className="as-summary-item">
          <span className="as-summary-val">{coresPositive}/{coresTotal} ({corePct}%)</span>
          <span className="as-summary-key">Positive Cores</span>
        </div>
        {maxCorePct != null && (
          <div className="as-summary-item">
            <span className="as-summary-val">{maxCorePct}%</span>
            <span className="as-summary-key">Max Core Involvement</span>
          </div>
        )}
        {psaValue != null && (
          <div className="as-summary-item">
            <span className="as-summary-val">{psaValue} ng/mL</span>
            <span className="as-summary-key">PSA</span>
          </div>
        )}
        {psadValue != null && (
          <div className="as-summary-item">
            <span className="as-summary-val">
              {Number(psadValue).toFixed(3)} ng/mL/cm³
              {psadFlag && <span className="as-psad-flag">Elevated PSAD (&gt;0.177)</span>}
            </span>
            <span className="as-summary-key">PSA Density</span>
          </div>
        )}
        {piradsValue != null && (
          <div className="as-summary-item">
            <span className="as-summary-val">PI-RADS {piradsValue}</span>
            <span className="as-summary-key">MRI Score</span>
          </div>
        )}
      </div>

      {/* ── E. Empirical context ── */}
      {asEmpiricalNote && (
        <div className="as-empirical-box" role="note">
          <InfoIcon size={14} className="as-empirical-icon" />
          <p className="as-empirical-text">{asEmpiricalNote}</p>
        </div>
      )}

      {/* ── F. Disclaimer ── */}
      {disclaimer && (
        <p className="as-disclaimer">{disclaimer}</p>
      )}

      {/* ── Actions ── */}
      <div className="as-actions">
        <div className="as-actions-row">
          {onEditAnswers && (
            <button className="as-btn as-btn--outline" type="button" onClick={onEditAnswers}>
              <ArrowLeftIcon size={16} /><span>Edit Biopsy Answers</span>
            </button>
          )}
          {onStartOver && (
            <button className="as-btn as-btn--danger" type="button" onClick={onStartOver}>
              <RefreshCwIcon size={16} /><span>Start Over</span>
            </button>
          )}
        </div>
        <div className="as-actions-row">
          <button className="as-btn as-btn--solid" type="button" onClick={() => window.print()}>
            <PrinterIcon size={16} /><span>Print Results</span>
          </button>
          <button className="as-btn as-btn--outline" type="button" onClick={handleExportCsv}>
            <DownloadIcon size={16} /><span>Export CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveSurveillanceResults;
