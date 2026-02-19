import React from 'react';
import './Part1Results.css';
import { RISK_COLORS } from '../utils/epsaCalculator';

const Part1Results = ({ result, onEditAnswers, onStartOver, onPrint }) => {
  if (!result) {
    return (
      <div className="part1-results-container">
        <p>No results available.</p>
      </div>
    );
  }

  const { score, risk, color, action, ipssTotal, shimTotal, bmi, age } = result;

  const riskLevels = [
    { label: "LOW", range: "<21%" },
    { label: "LOW-MOD", range: "21-31%" },
    { label: "MOD", range: "31-41%" },
    { label: "MOD-HIGH", range: "41-52%" },
    { label: "HIGH", range: ">52%" },
  ];

  return (
    <div className="part1-results-container">
      <div className="results-header">
        <div className="results-logo">ePSA</div>
        <div className="results-subtitle">Prostate-Specific Awareness — Results</div>
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
                background: isActive ? RISK_COLORS[label] : "#E8ECF0",
                color: isActive ? "white" : "#7F8C8D",
              }}
            >
              <div className="rlabel">{label}</div>
              <div className="rrange">{range}</div>
            </div>
          );
        })}
      </div>

      <div className="summary-box">
        <div>Age: <strong>{age}</strong></div>
        <div>BMI: <strong>{bmi}</strong></div>
        <div>IPSS: <strong>{ipssTotal}/35</strong></div>
        <div>SHIM: <strong>{shimTotal}/25</strong></div>
      </div>

      <div className="result-buttons">
        <button className="btn-edit" onClick={onEditAnswers}>
          ← Edit Answers
        </button>
        <button className="btn-start-over" onClick={onStartOver}>
          ↺ Start Over
        </button>
        <button className="btn-print" onClick={onPrint}>
          Print Results
        </button>
      </div>

    </div>
  );
};

export default Part1Results;
