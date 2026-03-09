import React from 'react';
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
  HardDriveIcon
} from 'lucide-react';

const Part1Results = ({ result, onEditAnswers, onStartOver, formData, storageMode, hideBackButton = false, sessionId = null, userEmail = null, userPhone = null, onSaveToCloud = null, cloudAvailable = false, saveToCloudPending = false, saveToCloudError = null }) => {
  const [showPrintableForm, setShowPrintableForm] = React.useState(false);
  const handleExportCsv = () => {
    const rows = buildPart1CsvRows(formData, result, {}); // config not needed for CSV
    const filename = `ePSA_Part1_Results_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(filename, rows);
  };

  if (showPrintableForm) {
    return (
      <PrintableForm 
        formData={formData} 
        onBack={() => setShowPrintableForm(false)} 
      />
    );
  }

  if (!result) {
    return (
      <div className="part1-results-container">
        <p>No results available.</p>
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
    epsaGuidelineText
  } = result;
  const displayRange = result.displayRange || result.confidenceRange;
  const activeTier = tierRisk || risk;
  const recommendationLabel = recommendPSA === true
    ? 'PSA Recommended'
    : recommendPSA === false
      ? 'PSA Not Recommended'
      : 'Recommendation Unavailable';
  const recommendationSubtitle = recommendPSA === true
    ? 'Threshold-based recommendation from Part 1'
    : recommendPSA === false
      ? 'Below recommendation threshold in Part 1'
      : 'Falling back to tier-based guidance';
  const riskBadgeLabel = recommendPSA == null ? `${risk} RISK` : recommendationLabel.toUpperCase();

  const riskExplanationText =
    'Your result is an educational estimate based on the information you entered. It summarizes how many prostate cancer risk flags you have (age, BMI, urinary symptoms, exercise, smoking, diet, family/genetic factors and others), but it does not determine whether you do or do not have prostate cancer. Use this as a starting point for a conversation with a clinician who can interpret your risk in context.';

  const displayRangeExplanationText =
    'The displayed range is a ±5% band around your score. It is there to avoid over-interpreting small differences between nearby scores. It is not a statistical confidence interval and does not represent measurement precision.';

  const guidelineContextText =
    'Screening should begin at age 40–45 for people at increased risk — specifically those with Black ancestry, germline mutations, or strong family history of prostate cancer. For average-risk individuals, a baseline PSA can be offered between ages 45–50, with regular screening every 2–4 years for those aged 50–69. Age-based PSA thresholds used clinically are approximately: 2.5 ng/mL (ages 40–49), 3.5 (50–59), 4.5 (60–69), and 6.5 (70–79).';

  const guidelineDivergenceText =
    'Current guidelines do not adjust screening thresholds for race, family history, or age under 50 as standalone triggers. The ePSA tool intentionally flags these high-risk profiles for earlier evaluation, which is the clinical gap this project is designed to address.';

  const getTierDescription = (tier) => {
    switch (tier) {
      case 'LOWER':
        return 'LOWER suggests a lower estimated likelihood relative to others in the model\'s reference data. Lower does not mean no risk, and it does not replace clinician guidance.';
      case 'MODERATE':
        return 'MODERATE suggests an estimated likelihood in the middle range of the model\'s reference data. Reviewing personal risk factors and prior PSA history with a clinician may add important context.';
      case 'HIGHER':
        return 'HIGHER suggests a higher estimated likelihood relative to others in the model\'s reference data. Higher does not mean cancer is present. It may be a useful prompt to review screening options with a clinician.';
      default:
        return '';
    }
  };

  const getSoftenedActionText = (tier, fallback) => {
    if (typeof fallback === 'string' && fallback.trim().length > 0) return fallback;

    switch (tier) {
      case 'LOWER':
        return 'Consider using this result to support a routine conversation with your healthcare provider, especially if you have questions about screening, family history, or symptoms.';
      case 'MODERATE':
        return 'Consider discussing this result with your healthcare provider. Together you can decide whether screening (such as PSA testing) makes sense based on your age, preferences, and prior results.';
      case 'HIGHER':
        return 'Consider prioritizing a discussion with your healthcare provider. They can help interpret this estimate and decide whether additional evaluation (for example, PSA testing or follow-up) is appropriate for you.';
      default:
        return 'Consider discussing these results with your healthcare provider.';
    }
  };

  const footerDisclaimerText =
    'ePSA is a non-validated educational risk assessment tool. Risk tiers are based on population-level data and guideline thresholds from AUA, NCCN, and EAU. In high-risk demographic profiles, ePSA may suggest earlier evaluation than standard guideline thresholds recommend. This tool does not replace physician judgment and is not intended for clinical decision-making without physician review. — Ashutosh K. Tewari, MD, Icahn School of Medicine at Mount Sinai';

  const riskLevels = [
    { label: 'LOWER', range: 'Fewer risk flags' },
    { label: 'MODERATE', range: 'Some risk flags' },
    { label: 'HIGHER', range: 'Many risk flags' },
  ];

  return (
    <div className="part1-results-container">
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
        {/* Debug info - remove in production */}
        {import.meta.env.DEV && (
          <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
            Debug: formData has {formData ? Object.keys(formData).length : 0} fields
          </div>
        )}
      </div>

      <div className="score-card">
        <div className="score-label">YOUR ePSA RISK TIER</div>
        <div className="score-big" style={{ color }}>
          {epsaTierLabel || 'ePSA Tier'}
        </div>
        {epsaPsaEquivalent && (
          <div className="score-range" style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
            PSA-equivalent: <strong>{epsaPsaEquivalent}</strong>
          </div>
        )}
        {epsaGuidelineText && (
          <p
            className="score-guideline-text"
            style={{ marginTop: '10px', fontSize: '13px', color: '#444', lineHeight: 1.5 }}
          >
            {epsaGuidelineText}
          </p>
        )}
        <div className="risk-badge" style={{ background: color }}>
          {riskBadgeLabel}
        </div>
      </div>

      <div className="recommendation-box" style={{ border: `2px solid ${color}` }}>
        <div className="rec-label" style={{ color }}>
          {recommendationLabel}
        </div>
        <p className="rec-text">{getSoftenedActionText(activeTier, action)}</p>
        <p className="rec-text" style={{ fontSize: '12px', marginTop: '6px', opacity: 0.8 }}>{recommendationSubtitle}</p>
      </div>

      <div className="summary-box">
        <div><strong>Risk explanation</strong></div>
        <div style={{ marginTop: '6px' }}>{riskExplanationText}</div>
        <div style={{ marginTop: '10px' }}><strong>How this score is calculated</strong></div>
        <div style={{ marginTop: '6px' }}>
          The ePSA score is a point-based summary of your answers. Each risk factor (for example age 60+, BMI ≥30, mild urinary symptoms, little or no exercise, current or former smoking, high red meat diet, Black race, family history, BRCA, inflammation, Agent Orange/chemical exposure, or a low SHIM score) adds points. The total points are then normalized to a 0–100% scale, and a ±5% range is shown instead of a single number.
        </div>
        <div style={{ marginTop: '10px' }}><strong>What your tier means</strong></div>
        <div style={{ marginTop: '6px' }}>{getTierDescription(activeTier)}</div>
      </div>

      <div className="summary-box">
        <div><strong>Guideline context (AUA/SUO 2026)</strong></div>
        <div style={{ marginTop: '6px' }}>{guidelineContextText}</div>
        <div style={{ marginTop: '10px', fontStyle: 'italic' }}>{guidelineDivergenceText}</div>
      </div>

      <div className="risk-bar">
        {riskLevels.map(({ label, range }) => {
          const isActive = label === activeTier;
          return (
            <div
              key={label}
              className="risk-bar-item"
              style={{
                background: isActive ? RISK_COLORS[label] : '#E8ECF0',
                color: isActive ? 'white' : '#7F8C8D',
              }}
            >
              <div className="rlabel">{label}</div>
              <div className="rrange">{range}</div>
            </div>
          );
        })}
      </div>

      <div className="summary-box">
        <div>Recommendation Threshold: <strong>{scoreRange}</strong></div>
        <div>Risk Tier: <strong>{activeTier || 'N/A'}</strong></div>
        {displayRange && (
          <div>Displayed Range: <strong>{displayRange}</strong></div>
        )}
        <div>Age: <strong>{age}</strong></div>
        <div>BMI: <strong>{bmi}</strong></div>
        <div>IPSS: <strong>{ipssTotal}/35</strong></div>
        <div>SHIM: <strong>{shimTotal}/25</strong></div>
        {displayRange && (
          <div style={{ marginTop: '10px', fontSize: '13px', color: '#666' }}>{displayRangeExplanationText}</div>
        )}
      </div>

      <div className="summary-box">
        <div style={{ fontSize: '13px', color: '#666' }}>{footerDisclaimerText}</div>
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
        <button className="btn-print" onClick={() => window.print()}>
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
                console.log('Exporting data:', formData);
                
                // Check if formData exists and has content
                if (!formData || Object.keys(formData).length === 0) {
                  throw new Error('No form data available to export');
                }
                
                const exportData = {
                  version: '1.0',
                  exportDate: new Date().toISOString(),
                  part: 'part1',
                  formData: formData,
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
                link.download = `epsa-part1-data-${new Date().toISOString().split('T')[0]}.json`;
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

export default Part1Results;
