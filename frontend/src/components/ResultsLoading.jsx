import React, { useState, useEffect } from 'react';
import './ResultsLoading.css';

const LOADING_STEPS = [
  {
    label: 'Analyzing risk factors',
    detail: 'Reading your responses and weighting each clinical factor…',
  },
  {
    label: 'Applying guideline criteria',
    detail: 'Comparing your profile against AUA/SUO 2026 and NCCN 2024 standards…',
  },
  {
    label: 'Generating your result',
    detail: 'Preparing your personalized PSA testing recommendation…',
  },
];

/* ─── Shared Results Loading Screen ───
 * Used by both Part 1 and Part 2 results pages.
 *
 * Props:
 *   label    — small eyebrow label (default "ePSA")
 *   message  — main heading shown to the patient
 */
const ResultsLoading = ({
  label = 'ePSA',
  message = 'Reviewing your profile…',
}) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setStep(s => (s < LOADING_STEPS.length - 1 ? s + 1 : s)),
      1300,
    );
    return () => clearInterval(id);
  }, []);

  const current = LOADING_STEPS[step];

  return (
    <div className="results-loading" role="status" aria-live="polite">
      <div className="results-loading-card">

        <div className="results-loading-eyebrow">{label}</div>

        <div className="results-loading-spinner" aria-hidden="true">
          <div className="results-loading-ring" />
        </div>

        <div className="results-loading-message">{message}</div>

        <div className="results-loading-steps" aria-hidden="true">
          {LOADING_STEPS.map((_, i) => (
            <span
              key={i}
              className={`rl-dot ${
                i < step  ? 'rl-dot--done'    :
                i === step ? 'rl-dot--active'  :
                             'rl-dot--pending'
              }`}
            />
          ))}
        </div>

        <div className="results-loading-step-text" key={step}>
          <span className="results-loading-step-count">{step + 1}&thinsp;/&thinsp;{LOADING_STEPS.length}</span>
          {' '}{current.label}
        </div>

        <div className="results-loading-detail" key={`d-${step}`}>
          {current.detail}
        </div>

      </div>
    </div>
  );
};

export default ResultsLoading;
