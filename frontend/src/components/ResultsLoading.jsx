import React from 'react';
import './ResultsLoading.css';

/* ─── Shared Results Loading Screen ───
 * Used by both Part 1 and Part 2 results pages to show a brief
 * "calculating your risk" animation before the result renders.
 *
 * Props:
 *   label    — optional small label text above the spinner
 *   message  — main heading shown to the patient
 *   detail   — sub-text shown under the heading
 */
const ResultsLoading = ({
  label = 'ePSA',
  message = 'Reviewing your profile\u2026',
  detail = 'Running guideline checks. This takes just a moment.',
}) => {
  return (
    <div className="results-loading" role="status" aria-live="polite">
      <div className="results-loading-card">
        <div className="results-loading-eyebrow">{label}</div>
        <div className="results-loading-gauge" aria-hidden="true">
          <svg viewBox="0 0 120 70" xmlns="http://www.w3.org/2000/svg" className="results-loading-gauge-svg">
            <path d="M 14 60 A 46 46 0 0 1 106 60" fill="none" stroke="#e2eaf2" strokeWidth="10" strokeLinecap="round" />
            <path d="M 14 60 A 46 46 0 0 1 106 60" fill="none" stroke="#1e3a5f" strokeWidth="10" strokeLinecap="round"
              strokeDasharray="145" strokeDashoffset="145" className="results-loading-gauge-fill" />
            <line x1="60" y1="60" x2="60" y2="20" stroke="#1e3a5f" strokeWidth="3" strokeLinecap="round"
              className="results-loading-gauge-needle" />
            <circle cx="60" cy="60" r="5" fill="#1e3a5f" />
          </svg>
        </div>
        <div className="results-loading-message">{message}</div>
        <div className="results-loading-detail">{detail}</div>
        <div className="results-loading-dots" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  );
};

export default ResultsLoading;
