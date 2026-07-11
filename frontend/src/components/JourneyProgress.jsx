import React from 'react';
import { CheckIcon } from 'lucide-react';
import './JourneyProgress.css';

const JourneyProgress = ({ stage, currentStep, pathwayMode, preResult, postResult, biomarkersEnabled = false, showPart2Interim = false }) => {
  const isPostPathway =
    pathwayMode === 'post_psa' || pathwayMode === 'post_mri' || stage === 'post';
  // MRI is only part of the journey when the user actually chose (or upgraded
  // to) the combined PSA + MRI pathway — a PSA-only pathway never shows it.
  const isMriPathway = pathwayMode === 'post_mri' || postResult?.pathwayMode === 'post_mri';

  // Reaching the Part 2/3 results screen (interim PSA-only results, or the
  // final combined/biopsy results) means every step up to the pathway's last
  // is done — regardless of which currentStep number got us here.
  const resultsReached = showPart2Interim || currentStep >= 4;

  let activeIdx;
  if (pathwayMode === null && !preResult) {
    activeIdx = 0;
  } else if (stage === 'pre') {
    activeIdx = currentStep >= 3 ? 2 : currentStep <= 1 ? 1 : 1;
  } else if (resultsReached) {
    activeIdx = Infinity; // clamped to steps.length - 1 below
  } else if (biomarkersEnabled) {
    activeIdx = currentStep === 3 ? 5 : currentStep === 2 ? 4 : 3;
  } else {
    // Biomarkers step (currentStep 2) is disabled — fold it into the PSA step's
    // active index (currentStep skips straight from 1 to 3 in this case).
    activeIdx = currentStep === 3 ? 4 : 3;
  }

  const steps = [
    { label: 'Choose Path' },
    { label: 'Your Profile' },
    { label: 'Initial Score' },
    ...(isPostPathway
      ? [
          { label: 'PSA' },
          ...(biomarkersEnabled ? [{ label: 'Biomarkers' }] : []),
          ...(isMriPathway ? [{ label: 'MRI' }, { label: 'Final Score' }] : []),
        ]
      : []),
  ];

  // A PSA-only pathway can still transiently visit the (optional) MRI form —
  // clamp so we never point past the end of this pathway's own step list.
  activeIdx = Math.min(activeIdx, steps.length - 1);

  return (
    <nav className="journey-progress" aria-label="Assessment progress">
      <ol className="journey-steps">
        {steps.map((step, i) => {
          const isDone = i < activeIdx;
          const isActive = i === activeIdx;
          const isUpcoming = i > activeIdx;
          return (
            <React.Fragment key={i}>
              <li
                className={`journey-step ${isDone ? 'journey-step--done' : ''} ${isActive ? 'journey-step--active' : ''} ${isUpcoming ? 'journey-step--upcoming' : ''}`}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className="journey-step-dot" aria-hidden="true">
                  {isDone
                    ? <CheckIcon size={9} strokeWidth={3} />
                    : <span className="journey-step-num">{i + 1}</span>}
                </span>
                <span className="journey-step-label">{step.label}</span>
              </li>
              {i < steps.length - 1 && (
                <li
                  className={`journey-connector ${isDone ? 'journey-connector--done' : ''}`}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

export default JourneyProgress;
