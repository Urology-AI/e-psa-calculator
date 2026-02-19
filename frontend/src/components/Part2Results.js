import React from 'react';
import './Part2Results.css';
import { RISK_COLORS } from '../utils/epsaCalculator';

const Part2Results = ({ result, preResult, onEditAnswers, onStartOver, onPrint }) => {
  if (!result) {
    return (
      <div className="part2-results-container">
        <p>No results available.</p>
      </div>
    );
  }

  const { riskPct, riskCat, riskClass, totalPoints, nextSteps } = result;

  // Map risk class to color
  const getRiskColor = (riskClass) => {
    if (riskClass.includes('low')) return RISK_COLORS.LOW;
    if (riskClass.includes('moderate')) return RISK_COLORS["LOW-MOD"];
    if (riskClass.includes('high') && !riskClass.includes('very')) return RISK_COLORS.MOD;
    return RISK_COLORS.HIGH;
  };

  const riskColor = getRiskColor(riskClass);

  return (
    <div className="part2-results-container">
      <div className="results-header">
        <div className="results-logo">ePSA</div>
        <div className="results-subtitle">Risk Assessment — Results</div>
      </div>

      <div className="score-card">
        <div className="score-label">YOUR RISK OF PROSTATE CANCER</div>
        <div className="score-big" style={{ color: riskColor }}>
          {riskPct}
        </div>
        <div className="risk-badge" style={{ background: riskColor }}>
          {riskCat.replace(/[🟢🟡🟠🔴]/g, '').trim()}
        </div>
      </div>

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
          RECOMMENDED NEXT STEPS
        </div>
        <ul className="rec-list">
          {nextSteps.map((step, index) => {
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
        <div>Total Points: <strong>{totalPoints}</strong></div>
        {preResult && (
          <>
            <div>Part 1 Score: <strong>{preResult.score}%</strong></div>
            <div>Part 1 Risk: <strong>{preResult.risk}</strong></div>
          </>
        )}
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

export default Part2Results;
