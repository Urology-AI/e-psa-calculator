import React from 'react';
import './Part1Results.css';
import { RISK_COLORS } from '../utils/riskColors';
import PrintableForm from './PrintableForm';
import ResultsPrint from './ResultsPrint';
import { 
  ArrowLeftIcon, 
  RefreshCwIcon, 
  PrinterIcon, 
  FileTextIcon, 
  DownloadIcon,
  CloudIcon,
  HardDriveIcon
} from 'lucide-react';

const Part1Results = ({ result, onEditAnswers, onStartOver, formData, storageMode, hideBackButton = false }) => {
  const [showPrintableForm, setShowPrintableForm] = React.useState(false);
  const [showResultsPrint, setShowResultsPrint] = React.useState(false);

  if (showPrintableForm) {
    return (
      <PrintableForm 
        formData={formData} 
        onBack={() => setShowPrintableForm(false)} 
      />
    );
  }

  if (showResultsPrint) {
    return (
      <ResultsPrint 
        result={result} 
        formData={formData} 
        onBack={() => setShowResultsPrint(false)} 
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

  const { score, scoreRange, risk, color, action, ipssTotal, shimTotal, bmi, age } = result;
  const displayRange = result.displayRange || result.confidenceRange;

  const riskExplanationText =
    'Your result is an educational estimate based on the information you entered. It describes how your answers compare with patterns the model was built from, but it does not determine whether you do or do not have prostate cancer. Use this as a starting point for a conversation with a clinician who can interpret your risk in context.';

  const displayRangeExplanationText =
    'The display range is a visual buffer to help avoid over-interpreting small differences in a single number. It is not a statistical confidence interval and does not represent precision.';

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
    'This is a Non-Validated Educational Risk Tool. It is not medical advice, not diagnostic, and not intended to guide treatment decisions. Screening and imaging decisions should be made with a qualified clinician.';

  const riskLevels = [
    { label: 'LOWER', range: '<8%' },
    { label: 'MODERATE', range: '8%–20%' },
    { label: 'HIGHER', range: '≥20%' },
  ];

  return (
    <div className="part1-results-container">
      <div className="results-header">
        <div className="results-logo">ePSA</div>
        <div className="results-subtitle">Prostate-Specific Awareness — Results</div>
        <div className="results-subtitle">A Non-Validated Educational Risk Tool</div>
        {storageMode && (
          <div className="storage-indicator">
            {storageMode === 'cloud' ? 'Cloud Storage' : 'Self-Storage'}
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
        <div className="score-label">YOUR ePSA SCORE</div>
        <div className="score-big" style={{ color }}>
          {score}%
        </div>
        <div className="risk-badge" style={{ background: color }}>
          {risk} RISK
        </div>
      </div>

      <div className="recommendation-box" style={{ border: `2px solid ${color}` }}>
        <div className="rec-label" style={{ color }}>
          CONSIDER DISCUSSING NEXT STEPS
        </div>
        <p className="rec-text">{getSoftenedActionText(risk, action)}</p>
      </div>

      <div className="summary-box">
        <div><strong>Risk explanation</strong></div>
        <div style={{ marginTop: '6px' }}>{riskExplanationText}</div>
        <div style={{ marginTop: '10px' }}><strong>What your tier means</strong></div>
        <div style={{ marginTop: '6px' }}>{getTierDescription(risk)}</div>
      </div>

      <div className="risk-bar">
        {riskLevels.map(({ label, range }) => {
          const isActive = label === risk;
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
        <div>Score Tier: <strong>{scoreRange}</strong></div>
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
        <button className="btn-print" onClick={() => setShowResultsPrint(true)}>
          <PrinterIcon size={18} />
          <span>Print Results</span>
        </button>
        <button className="btn-print-form" onClick={() => setShowPrintableForm(true)}>
          <FileTextIcon size={18} />
          <span>Print Form</span>
        </button>
        
        {/* Storage mode specific actions */}
        {storageMode === 'cloud' && (
          <button className="btn-save" onClick={() => {
            // TODO: Implement save to cloud functionality
            console.log('Save to cloud functionality coming soon');
          }}>
            <CloudIcon size={18} />
            <span>Save to Cloud</span>
          </button>
        )}
        
        {/* Export available for both storage modes */}
        {(storageMode === 'local' || storageMode === 'cloud') && (
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
                formData: formData
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
        )}
      </div>
    </div>
  );
};

export default Part1Results;
