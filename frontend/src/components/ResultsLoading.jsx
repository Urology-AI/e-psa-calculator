import React, { useState, useEffect } from 'react';
import './ResultsLoading.css';

const LOADING_STEPS = [
  {
    label: 'Parsing clinical profile',
    detail: 'Reading PSA values, DRE findings, age, and symptom history…',
    progress: 12,
    duration: 1500,
  },
  {
    label: 'Calibrating PSA trajectory',
    detail: 'Modeling PSA velocity and doubling time relative to your age…',
    progress: 28,
    duration: 2000,
  },
  {
    label: 'Evaluating hereditary risk',
    detail: 'Scanning family history — first-degree relatives, BRCA2, Lynch syndrome…',
    progress: 44,
    duration: 2200,
  },
  {
    label: 'Adjusting for prostate volume',
    detail: 'Weighting PSA density against prostate size and body habitus…',
    progress: 59,
    duration: 2000,
  },
  {
    label: 'Incorporating imaging data',
    detail: 'Cross-referencing MRI / PI-RADS scores and prior biopsy pathology…',
    progress: 74,
    duration: 2200,
  },
  {
    label: 'Matching 2026 guidelines',
    detail: 'Aligning your profile to AUA/SUO 2026 and NCCN Very Low → High classification…',
    progress: 89,
    duration: 2000,
  },
  {
    label: 'Composing your recommendation',
    detail: 'Preparing your personalized PSA screening plan with evidence-tier citations…',
    progress: 97,
    duration: 0,
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
  message = 'Analyzing your prostate health profile…',
}) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timeouts = [];
    let elapsed = 0;

    for (let i = 0; i < LOADING_STEPS.length - 1; i++) {
      elapsed += LOADING_STEPS[i].duration;
      const nextStep = i + 1;
      timeouts.push(setTimeout(() => setStep(nextStep), elapsed));
    }

    return () => timeouts.forEach(clearTimeout);
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

        <div className="rl-progress-bar" aria-hidden="true">
          <div
            className="rl-progress-fill"
            style={{ width: `${current.progress}%` }}
          />
        </div>
        <div className="rl-progress-pct" aria-hidden="true">{current.progress}%</div>

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
          {' '}{current.label}
        </div>

        <div className="results-loading-detail" key={`d-${step}`}>
          {current.detail}
        </div>

      </div>
    </div>
  );
};

export default ResultsLoading;
