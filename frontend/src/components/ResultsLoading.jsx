import React, { useState, useEffect } from 'react';
import './ResultsLoading.css';

// Part 1: baseline risk profile — no PSA or MRI references
export const PART1_LOADING_STEPS = [
  {
    label: 'Reading your health profile',
    detail: 'Parsing age, race, family history, and urinary symptom scores…',
    progress: 12,
    duration: 1500,
  },
  {
    label: 'Assessing hereditary risk',
    detail: 'Evaluating first-degree relatives, BRCA2 status, and Lynch syndrome flags…',
    progress: 28,
    duration: 2000,
  },
  {
    label: 'Scoring urinary symptoms',
    detail: 'Processing your IPSS responses to assess lower urinary tract symptoms…',
    progress: 44,
    duration: 2200,
  },
  {
    label: 'Weighing lifestyle factors',
    detail: 'Factoring in BMI, exercise habits, diet patterns, and smoking history…',
    progress: 59,
    duration: 2000,
  },
  {
    label: 'Checking guideline criteria',
    detail: 'Matching your profile to AUA/SUO 2026 and NCCN screening thresholds…',
    progress: 74,
    duration: 2200,
  },
  {
    label: 'Running the baseline model',
    detail: 'Applying the ePSA risk scoring model to your complete profile…',
    progress: 89,
    duration: 2000,
  },
  {
    label: 'Composing your recommendation',
    detail: 'Preparing your personalized screening priority with evidence-tier citations…',
    progress: 97,
    duration: 0,
  },
];

// Part 2: PSA + MRI analysis and next-step guideline matching
export const PART2_LOADING_STEPS = [
  {
    label: 'Loading your baseline profile',
    detail: 'Retrieving your Part 1 risk score and guideline classification…',
    progress: 12,
    duration: 1500,
  },
  {
    label: 'Analyzing your PSA level',
    detail: 'Placing your PSA in context — gray zone, PSA density, and hormonal adjustments…',
    progress: 28,
    duration: 2000,
  },
  {
    label: 'Evaluating imaging data',
    detail: 'Cross-referencing PI-RADS score with your PSA and baseline risk profile…',
    progress: 44,
    duration: 2200,
  },
  {
    label: 'Matching 2026 guidelines',
    detail: 'Aligning with AUA/SUO/NCCN/EAU 2026 next-step recommendations…',
    progress: 59,
    duration: 2000,
  },
  {
    label: 'Checking biopsy thresholds',
    detail: 'Evaluating biopsy and MRI referral criteria for your risk tier…',
    progress: 74,
    duration: 2200,
  },
  {
    label: 'Applying the Part 2 model',
    detail: 'Combining PSA, MRI, and baseline data through the ePSA post-PSA engine…',
    progress: 89,
    duration: 2000,
  },
  {
    label: 'Composing your plan',
    detail: 'Preparing your personalized PSA assessment with guideline-backed next steps…',
    progress: 97,
    duration: 0,
  },
];

// Part 2: PSA-only analysis (no MRI/biopsy references — MRI lives on Part 3)
export const PSA_LOADING_STEPS = [
  {
    label: 'Loading your baseline profile',
    detail: 'Retrieving your Part 1 risk score and guideline classification…',
    progress: 14,
    duration: 1500,
  },
  {
    label: 'Analyzing your PSA level',
    detail: 'Placing your PSA in context — gray zone, PSA density, and hormonal adjustments…',
    progress: 32,
    duration: 2000,
  },
  {
    label: 'Checking age-adjusted thresholds',
    detail: 'Comparing your PSA against AUA/SUO 2026 age-adjusted reference ranges…',
    progress: 52,
    duration: 2000,
  },
  {
    label: 'Matching 2026 guidelines',
    detail: 'Aligning with AUA/SUO/NCCN/EAU 2026 PSA-based next-step recommendations…',
    progress: 71,
    duration: 2000,
  },
  {
    label: 'Applying the Part 2 model',
    detail: 'Combining PSA and baseline data through the ePSA post-PSA engine…',
    progress: 89,
    duration: 1800,
  },
  {
    label: 'Composing your plan',
    detail: 'Preparing your personalized PSA assessment with guideline-backed next steps…',
    progress: 97,
    duration: 0,
  },
];

export const LOADING_SEEN_KEY_PSA = 'epsa_loading_seen_psa';

/* ─── Shared Results Loading Screen ───
 * Used by both Part 1 and Part 2 results pages.
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
