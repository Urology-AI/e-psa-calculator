import React from 'react';
import { CheckIcon } from 'lucide-react';
import './JourneyProgress.css';

const JourneyProgress = ({ stage, currentStep, pathwayMode, preResult, postResult }) => {
  const isPostPathway =
    pathwayMode === 'post_psa' || pathwayMode === 'post_mri' || stage === 'post';

  let activeIdx;
  if (pathwayMode === null && !preResult) {
    activeIdx = 0;
  } else if (stage === 'pre') {
    activeIdx = currentStep >= 3 ? 2 : currentStep <= 1 ? 1 : 1;
  } else {
    activeIdx = currentStep >= 4 ? 6 : currentStep === 3 ? 5 : currentStep === 2 ? 4 : 3;
  }

  const steps = [
    { label: 'Choose Path' },
    { label: 'Your Profile' },
    { label: 'Initial Score' },
    ...(isPostPathway
      ? [
          { label: 'PSA' },
          { label: 'Biomarkers' },
          { label: 'MRI' },
          { label: 'Final Score' },
        ]
      : []),
  ];

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
