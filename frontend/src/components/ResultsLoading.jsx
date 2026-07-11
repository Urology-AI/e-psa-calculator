import React, { useState, useEffect } from 'react';
import './ResultsLoading.css';

// Pre-PSA: baseline risk profile — no PSA or MRI references
export const PART1_LOADING_STEPS = [
  {
    label: 'Reading your health profile',
    detail: 'Age, race, family history, and urinary symptoms…',
    progress: 20,
    duration: 1500,
  },
  {
    label: 'Assessing hereditary risk',
    detail: 'Family history, germline mutations, and lifestyle factors…',
    progress: 45,
    duration: 1800,
  },
  {
    label: 'Checking guideline criteria',
    detail: 'Matching your profile to AUA/SUO 2026 and NCCN thresholds…',
    progress: 72,
    duration: 1800,
  },
  {
    label: 'Composing your recommendation',
    detail: 'Preparing your personalized screening priority…',
    progress: 97,
    duration: 0,
  },
];

// PSA + MRI: combined analysis and next-step guideline matching
export const PART2_LOADING_STEPS = [
  {
    label: 'Loading your baseline profile',
    detail: 'Retrieving your Pre-PSA risk score and classification…',
    progress: 20,
    duration: 1500,
  },
  {
    label: 'Analyzing PSA and imaging',
    detail: 'PSA density, PI-RADS score, and hormonal adjustments…',
    progress: 50,
    duration: 1800,
  },
  {
    label: 'Matching 2026 guidelines',
    detail: 'Checking AUA/SUO/NCCN/EAU biopsy and referral thresholds…',
    progress: 78,
    duration: 1800,
  },
  {
    label: 'Composing your plan',
    detail: 'Preparing your guideline-backed next steps…',
    progress: 97,
    duration: 0,
  },
];

// PSA-only analysis (no MRI/biopsy references — MRI lives on its own stage)
export const PSA_LOADING_STEPS = [
  {
    label: 'Loading your baseline profile',
    detail: 'Retrieving your Pre-PSA risk score and classification…',
    progress: 22,
    duration: 1400,
  },
  {
    label: 'Analyzing your PSA level',
    detail: 'Age-adjusted thresholds and hormonal adjustments…',
    progress: 55,
    duration: 1600,
  },
  {
    label: 'Matching 2026 guidelines',
    detail: 'Aligning with AUA/SUO/NCCN/EAU next-step recommendations…',
    progress: 82,
    duration: 1600,
  },
  {
    label: 'Composing your plan',
    detail: 'Preparing your guideline-backed next steps…',
    progress: 97,
    duration: 0,
  },
];

export const LOADING_SEEN_KEY_PSA = 'epsa_loading_seen_psa';

/* ─── Shared Results Loading Screen ───
 * Used by the Pre-PSA, PSA, and MRI results pages.
 *
 * Props:
 *   label      — small eyebrow label (default "ePSA")
 *   message    — main heading shown to the patient
 *   onComplete — called after all steps finish animating
 */
export const LOADING_SEEN_KEY_P1 = 'epsa_loading_seen_p1';
export const LOADING_SEEN_KEY_P2 = 'epsa_loading_seen_p2';

const ResultsLoading = ({
  label = 'ePSA',
  message = 'Analyzing your prostate health profile…',
  onComplete,
  storageKey = 'epsa_loading_seen',
  steps = PART1_LOADING_STEPS,
}) => {
  const isFirstVisit = !localStorage.getItem(storageKey);
  const lastStep = steps.length - 1;
  const [step, setStep] = useState(isFirstVisit ? 0 : lastStep);

  useEffect(() => {
    if (!isFirstVisit) {
      // Already seen — dismiss immediately after a brief settle
      if (onComplete) setTimeout(onComplete, 400);
      return;
    }

    localStorage.setItem(storageKey, '1');

    const timeouts = [];
    let elapsed = 0;

    for (let i = 0; i < lastStep; i++) {
      elapsed += steps[i].duration;
      const nextStep = i + 1;
      timeouts.push(setTimeout(() => setStep(nextStep), elapsed));
    }

    // Fire onComplete after all steps have advanced (add a short settle delay)
    if (onComplete) {
      timeouts.push(setTimeout(onComplete, elapsed + 600));
    }

    return () => timeouts.forEach(clearTimeout);
  }, []);

  const current = steps[step];

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
          {steps.map((_, i) => (
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
          <span className="results-loading-step-count">{step + 1}&thinsp;/&thinsp;{steps.length}</span>
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
