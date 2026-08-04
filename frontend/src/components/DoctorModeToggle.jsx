import React from 'react';
import { useDoctorMode } from '../context/DoctorModeContext.jsx';

const OPTIONS = [
  { mode: 'patient', label: 'Patient' },
  { mode: 'clinical', label: 'Clinical', title: 'Show clinical detail (PSA density, PI-RADS, feature contributions, guideline comparison) expanded by default' },
];

// Visible Patient/Clinical pill switch — deliberately not tucked into the
// settings menu since it changes what content is shown, not just display
// preferences (text size, theme, language). Research-tier content (model
// methodology, validation cohorts, raw export) lives in epsa-admin-dashboard,
// not here.
const DoctorModeToggle = () => {
  const { viewMode, setViewMode } = useDoctorMode();
  return (
    <div className="doctor-mode-toggle" role="group" aria-label="View mode">
      {OPTIONS.map(({ mode, label, title }) => (
        <button
          key={mode}
          type="button"
          className={`doctor-mode-toggle__btn${viewMode === mode ? ' doctor-mode-toggle__btn--active' : ''}`}
          aria-pressed={viewMode === mode}
          onClick={() => setViewMode(mode)}
          title={title}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export default DoctorModeToggle;
