import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

/**
 * App-wide result-screen audience mode: 'patient' | 'clinical'.
 * Orthogonal to the "Clinician View" quick-entry data-entry path (that's about
 * HOW data gets in; this is about how much clinical detail is shown once
 * results exist, regardless of entry path). Persisted to localStorage so a
 * clinician reviewing a session doesn't lose the setting on reload.
 *
 * A third 'research' tier (methodology detail, validation-cohort stats, raw
 * JSON/CSV export) previously lived here but has moved to epsa-admin-dashboard
 * (separate staff-only app) — research/journal-style content doesn't belong
 * in the patient-facing app. Anything that was research-gated here now either
 * folds up into 'clinical' or is removed; see git history for what changed.
 */
const STORAGE_KEY = 'epsa_view_mode';
const LEGACY_STORAGE_KEY = 'epsa_doctor_mode';
export const VIEW_MODES = ['patient', 'clinical'];

const readInitialViewMode = () => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (VIEW_MODES.includes(stored)) return stored;
    // Old 'research' tier folds up into 'clinical' now that the mode was
    // dropped; old boolean toggle ('1' = doctor mode on) also maps here.
    if (stored === 'research') return 'clinical';
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy === '1') return 'clinical';
  } catch { /* ignore */ }
  return 'patient';
};

const DoctorModeContext = createContext({
  viewMode: 'patient',
  setViewMode: () => {},
  doctorMode: false,
});

export const DoctorModeProvider = ({ children }) => {
  const [viewMode, setViewModeState] = useState(readInitialViewMode);

  // Mirrors ThemeSwitcher.jsx's `.theme-dark` root-class pattern — a
  // `data-view-mode` attribute on <html> drives density/table-vs-card CSS
  // variants (see ResultsViewMode.css) without threading a prop everywhere.
  useEffect(() => {
    document.documentElement.setAttribute('data-view-mode', viewMode);
  }, [viewMode]);

  const setViewMode = useCallback((next) => {
    if (!VIEW_MODES.includes(next)) return;
    setViewModeState(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  }, []);

  const value = {
    viewMode,
    setViewMode,
    // Back-compat for any call site that only needs "is this beyond patient view".
    doctorMode: viewMode !== 'patient',
  };

  return (
    <DoctorModeContext.Provider value={value}>
      {children}
    </DoctorModeContext.Provider>
  );
};

export const useDoctorMode = () => useContext(DoctorModeContext);

// True once viewMode is at or above the given tier (patient < clinical).
export const modeAtLeast = (viewMode, minMode) => VIEW_MODES.indexOf(viewMode) >= VIEW_MODES.indexOf(minMode);
