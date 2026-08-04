import React from 'react';
import { CheckIcon } from 'lucide-react';

/**
 * Horizontal patient-journey timeline: Today -> PSA -> Repeat PSA -> MRI ->
 * Biopsy Discussion -> Treatment Planning. `currentKey` marks where the
 * patient is now; steps before it render as completed, steps after as
 * upcoming. Distinct from AssessmentJourney's sidebar (that tracks progress
 * through the ePSA questionnaire itself) — this tracks the clinical care
 * pathway the questionnaire result points toward.
 */
const TIMELINE_STEPS = [
  { key: 'today', label: 'Today' },
  { key: 'psa', label: 'PSA' },
  { key: 'repeat_psa', label: 'Repeat PSA' },
  { key: 'mri', label: 'MRI' },
  { key: 'biopsy', label: 'Biopsy Discussion' },
  { key: 'treatment', label: 'Treatment Planning' },
];

export const JourneyTimeline = ({ currentKey = 'today', visibleKeys = null }) => {
  const steps = visibleKeys ? TIMELINE_STEPS.filter((s) => visibleKeys.includes(s.key)) : TIMELINE_STEPS;
  const currentIdx = steps.findIndex((s) => s.key === currentKey);
  return (
    <nav className="journey-timeline" aria-label="Your care journey">
      {steps.map((s, i) => {
        const done = currentIdx >= 0 && i < currentIdx;
        const active = i === currentIdx;
        return (
          <React.Fragment key={s.key}>
            <div className={`journey-timeline__step${active ? ' journey-timeline__step--active' : ''}${done ? ' journey-timeline__step--done' : ''}`}>
              <span className="journey-timeline__marker" aria-hidden="true">
                {done ? <CheckIcon size={12} /> : <span className="journey-timeline__dot" />}
              </span>
              <span className="journey-timeline__label">{s.label}</span>
            </div>
            {i < steps.length - 1 && <span className="journey-timeline__connector" aria-hidden="true" />}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default JourneyTimeline;
