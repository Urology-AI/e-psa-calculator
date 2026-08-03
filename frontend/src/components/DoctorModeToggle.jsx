import React from 'react';
import { useDoctorMode } from '../context/DoctorModeContext.jsx';

// Visible Patient/Doctor pill switch — deliberately not tucked into the
// settings menu since it changes what content is shown, not just display
// preferences (text size, theme, language).
const DoctorModeToggle = () => {
  const { doctorMode, toggleDoctorMode } = useDoctorMode();
  return (
    <div className="doctor-mode-toggle" role="group" aria-label="View mode">
      <button
        type="button"
        className={`doctor-mode-toggle__btn${!doctorMode ? ' doctor-mode-toggle__btn--active' : ''}`}
        aria-pressed={!doctorMode}
        onClick={() => { if (doctorMode) toggleDoctorMode(); }}
      >
        Patient
      </button>
      <button
        type="button"
        className={`doctor-mode-toggle__btn${doctorMode ? ' doctor-mode-toggle__btn--active' : ''}`}
        aria-pressed={doctorMode}
        onClick={() => { if (!doctorMode) toggleDoctorMode(); }}
        title="Show clinical detail (PSA density, PI-RADS, confidence, calibration, validation) expanded by default"
      >
        Doctor
      </button>
    </div>
  );
};

export default DoctorModeToggle;
