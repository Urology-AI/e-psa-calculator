import React from 'react';
import './Part2Results.css';
import { RISK_COLORS } from '../utils/riskColors';
import ResultsPrint from './ResultsPrint';
import PrintableForm from './PrintableForm';
import { downloadCsv, buildPart2CsvRows } from '../utils/exportCsv';
import { 
  ArrowLeftIcon, 
  RefreshCwIcon, 
  PrinterIcon, 
  FileTextIcon, 
  CloudIcon,
  HardDriveIcon,
  DownloadIcon
} from 'lucide-react';

const Part2Results = ({ result, preResult, preData, onEditAnswers, onStartOver, storageMode, postData, sessionId = null, userEmail = null, userPhone = null, onSaveToCloud = null, cloudAvailable = false, saveToCloudPending = false, saveToCloudError = null }) => {
  const [showResultsPrint, setShowResultsPrint] = React.useState(false);
  const [showPrintableForm, setShowPrintableForm] = React.useState(false);
  const handleExportCsv = () => {
    const rows = buildPart2CsvRows(postData, preResult, result, {}); // config not needed for CSV
    const filename = `ePSA_Part2_Results_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(filename, rows);
  };
  const footerDisclaimerText =
    'ePSA is a non-validated educational risk assessment tool. Risk tiers are based on population-level data and guideline thresholds from AUA, NCCN, and EAU. In high-risk demographic profiles, ePSA may suggest earlier evaluation than standard guideline thresholds recommend. This tool does not replace physician judgment and is not intended for clinical decision-making without physician review. — Ashutosh K. Tewari, MD, Icahn School of Medicine at Mount Sinai';

  const combinedFormData = {
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
    age: preResult?.age ?? preData?.age
  };

  if (showResultsPrint) {
    return (
      <ResultsPrint 
        result={result} 
        formData={combinedFormData}
        sessionId={sessionId}
        userEmail={userEmail}
        userPhone={userPhone}
        onBack={() => setShowResultsPrint(false)} 
      />
    );
  }

  if (showPrintableForm) {
    return (
      <PrintableForm 
        formData={combinedFormData}
        onBack={() => setShowPrintableForm(false)} 
      />
    );
  }
  if (!result) {
    return (
      <div className="part2-results-container">
        <p>No results available.</p>
        <div className="summary-box">
          <div style={{ fontSize: '13px', color: '#666' }}>{footerDisclaimerText}</div>
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
    lowPsaWarningText
  } = result;

  const part2RiskExplanationText =
    'Part 2 combines your ePSA risk profile with your PSA level and (if available) MRI PI-RADS score to provide an educational risk tier. PSA levels and PI-RADS scores entered here are used solely for educational risk stratification. PSA-based screening in combination with shared decision-making is the recommended standard — this tool is intended to supplement, not replace, that conversation with your clinician. A newly elevated PSA should usually be confirmed with a repeat test before any biopsy or further workup is pursued.';

  const piradsExplanationTextProvided =
    'MRI and PI-RADS scoring may be used prior to initial biopsy to increase detection of clinically significant prostate cancer (GG2+). A PI-RADS score of 3 or higher indicates a suspicious lesion warranting further evaluation. This tool does not replace a radiologist\'s interpretation of multiparametric MRI findings.';
  
  const piradsExplanationTextNotProvided =
    'If PI-RADS is not included, the Part 2 category is based on the baseline estimate and PSA information only. A clinician may recommend MRI (or not) depending on your full clinical context.';

  // Map risk class to color
  const getRiskColor = (riskClass) => {
    const cls = String(riskClass || '');
    if (cls.includes('low')) return RISK_COLORS.LOW;
    if (cls.includes('moderate')) return RISK_COLORS["LOW-MOD"];
    if (cls.includes('high') && !cls.includes('very')) return RISK_COLORS.MOD;
    return RISK_COLORS.HIGH;
  };

  const riskColor = getRiskColor(riskClass);

  return (
    <div className="part2-results-container">
      <div className="results-header">
        {sessionId && (
          <div className="session-id-display">
            Session key: <strong>{sessionId}</strong>
          </div>
        )}
        {storageMode === 'cloud' && sessionId && (
          <div className="saved-to-cloud-badge">
            <CloudIcon size={16} />
            <span>Saved to cloud</span>
          </div>
        )}
        {storageMode === 'local' && cloudAvailable && onSaveToCloud && (
          <div className="move-to-cloud-row">
            <button
              type="button"
              className="btn-move-to-cloud"
              onClick={onSaveToCloud}
              disabled={saveToCloudPending}
            >
              <CloudIcon size={18} />
              {saveToCloudPending ? 'Saving...' : 'Move to cloud'}
            </button>
            {saveToCloudError && (
              <span className="save-to-cloud-error">{saveToCloudError}</span>
            )}
          </div>
        )}
      </div>

      <div className="score-card">
        <div className="score-label">YOUR EDUCATIONAL RISK CATEGORY</div>
        <div className="score-big" style={{ color: riskColor }}>
          {riskPct}
        </div>
        {riskPctRange && (
          <div className="score-range" style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
            Display range: <strong>{riskPctRange}</strong>
          </div>
        )}
        <div className="risk-badge" style={{ background: riskColor }}>
          {riskCat.replace(/[🟢🟡🟠🔴]/g, '').trim()}
        </div>
      </div>

      {lowPsaWarning && (
        <div className="summary-box low-psa-warning-banner">
          <div style={{ color: '#C0392B', fontWeight: 600, marginBottom: '4px' }}>Low-PSA Warning</div>
          <div style={{ fontSize: '13px' }}>
            {lowPsaWarningText}
          </div>
        </div>
      )}

      {discordanceFlag && (
        <div className={`summary-box discordance-flag discordance-${discordanceFlag.severity}`}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Risk Discordance Detected</div>
          <div style={{ fontSize: '13px' }}>
            {discordanceFlag.text}
          </div>
        </div>
      )}

      {preResult && (
        <div className="part1-reference-box">
          <div className="reference-label">Based on Part 1 Score:</div>
          <div className="reference-content">
            <span>ePSA Score: <strong>{preResult.score}%</strong></span>
            <span>Risk Level: <strong>{preResult.risk}</strong></span>
          </div>
        </div>
      )}

      <div className="recommendation-box" style={{ border: `2px solid ${riskColor}` }}>
        <div className="rec-label" style={{ color: riskColor }}>
          CONSIDER DISCUSSING NEXT STEPS
        </div>
        <ul className="rec-list">
          {(nextSteps?.length ? nextSteps : ['Discuss these results with your physician and review PSA/MRI follow-up options.']).map((step, index) => {
            // Check for external links
            if (step.includes('Learn more about prostate cancer health')) {
              return (
                <li key={index}>
                  {step.replace(' →', '')}
                  <a 
                    href="https://www.youtube.com/@ashtewarimd7526" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="external-link"
                    title="Watch Video"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" fill={riskColor} opacity="0.2" />
                      <path fill={riskColor} d="M10 8v8l6-4z" />
                    </svg>
                  </a>
                </li>
              );
            }
            if (step.includes('Mount Sinai Mobile Unit')) {
              return (
                <li key={index}>
                  {step.replace(' →', '')}
                  <a 
                    href="https://events.mountsinaihealth.org/search/events?event_types%5B%5D=37714143563487" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="external-link"
                    title="View Mobile Unit Location"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill={riskColor} viewBox="0 0 24 24" width="18" height="18">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                  </a>
                </li>
              );
            }
            return <li key={index}>{step}</li>;
          })}
        </ul>
      </div>

      <div className="summary-box">
        <div><strong>Risk explanation</strong></div>
        <div style={{ marginTop: '6px' }}>{part2RiskExplanationText}</div>
        <div style={{ marginTop: '10px' }}>
          <strong>How the risk tier is summarized</strong>
        </div>
        <div style={{ marginTop: '6px' }}>
          {pointsExplanationText}
        </div>
        <div style={{ marginTop: '10px' }}><strong>About PI-RADS</strong></div>
        <div style={{ marginTop: '6px' }}>
          {postData?.knowPirads ? piradsExplanationTextProvided : piradsExplanationTextNotProvided}
        </div>
      </div>

      <div className="summary-box">
        <>
          <div><strong>Key clinical inputs</strong></div>
          <div>PSA: <strong>{psaValue != null ? `${psaValue} ng/mL` : (postData?.psa != null ? `${postData.psa} ng/mL` : 'N/A')}</strong></div>
          <div>PSA Tier: <strong>{psaTier || 'N/A'}</strong></div>
          <div>PI-RADS: <strong>{postData?.knowPirads ? postData?.pirads : 'Not Provided'}</strong></div>
          {preResult && (
            <>
              <div>Part 1 Score: <strong>{preResult.score}%</strong></div>
              <div>Part 1 Risk: <strong>{preResult.risk}</strong></div>
            </>
          )}
        </>
      </div>

      <div className="summary-box">
        <div style={{ fontSize: '13px', color: '#666' }}>
          {footerDisclaimerText}
        </div>
      </div>

      <div className="result-buttons">
        <button className="btn-edit" onClick={onEditAnswers}>
          <ArrowLeftIcon size={18} />
          <span>Edit Answers</span>
        </button>
        <button className="btn-start-over" onClick={onStartOver}>
          <RefreshCwIcon size={18} />
          <span>Start Over</span>
        </button>
        <button className="btn-print" onClick={() => setShowResultsPrint(true)}>
          <PrinterIcon size={18} />
          <span>Print Results</span>
        </button>
        <button className="btn-print-form" onClick={() => setShowPrintableForm(true)}>
          <FileTextIcon size={18} />
          <span>Print Form</span>
        </button>
        
        {/* Export available for both storage modes */}
        {(storageMode === 'local' || storageMode === 'cloud') && (
          <>
            <button className="btn-export" onClick={() => {
              try {
                const exportData = {
                  version: '1.0',
                  exportDate: new Date().toISOString(),
                  part: 'complete',
                  part1Data: preData || {},
                  part1Result: preResult || {},
                  part2Data: postData || {},
                  part2Result: result || {},
                  userInfo: {
                    email: userEmail || null,
                    phone: userPhone || null,
                    sessionId: sessionId || null
                  }
                };
                const dataStr = JSON.stringify(exportData, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `epsa-complete-data-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              } catch (error) {
                console.error('Export failed:', error);
                alert('Export failed. Please try again.');
              }
            }}>
              <DownloadIcon size={18} />
              <span>Export Data</span>
            </button>
            <button className="btn-export" onClick={handleExportCsv}>
              <DownloadIcon size={18} />
              <span>Export CSV</span>
            </button>
          </>
        )}
      </div>

    </div>
  );
};

export default Part2Results;
