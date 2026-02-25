import React from 'react';
import './Part1Results.css';
import { RISK_COLORS } from '../utils/epsaCalculator';
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

  const { score, scoreRange, confidenceRange, risk, color, action, ipssTotal, shimTotal, bmi, age } = result;

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
          RECOMMENDED NEXT STEP
        </div>
        <p className="rec-text">{action}</p>
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
        <div>Displayed Range (±10%): <strong>{confidenceRange}</strong></div>
        <div>Age: <strong>{age}</strong></div>
        <div>BMI: <strong>{bmi}</strong></div>
        <div>IPSS: <strong>{ipssTotal}/35</strong></div>
        <div>SHIM: <strong>{shimTotal}/25</strong></div>
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
