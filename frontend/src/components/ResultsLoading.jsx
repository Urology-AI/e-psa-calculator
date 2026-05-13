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
        <div className="results-loading-spinner" aria-hidden="true">
          <svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" className="results-loading-spinner-svg">
            <circle cx="28" cy="28" r="22" fill="none" stroke="#e2eaf2" strokeWidth="5" />
            <circle cx="28" cy="28" r="22" fill="none" stroke="#1e3a5f" strokeWidth="5"
              strokeLinecap="round" strokeDasharray="138" strokeDashoffset="100"
              className="results-loading-spinner-arc" />
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
