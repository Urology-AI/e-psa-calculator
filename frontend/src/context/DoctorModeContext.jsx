import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * App-wide Patient/Doctor view mode. Orthogonal to the "Clinician View" quick-entry
 * data-entry path (that's about HOW data gets in; this is about how much clinical
 * detail is shown once results exist, regardless of entry path). Persisted to
 * localStorage so a clinician reviewing a session doesn't lose the setting on reload.
 */
const STORAGE_KEY = 'epsa_doctor_mode';
const DoctorModeContext = createContext({ doctorMode: false, toggleDoctorMode: () => {} });

export const DoctorModeProvider = ({ children }) => {
  const [doctorMode, setDoctorMode] = useState(() => {
    try { return window.localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });

  const toggleDoctorMode = useCallback(() => {
    setDoctorMode((prev) => {
      const next = !prev;
      try { window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return (
    <DoctorModeContext.Provider value={{ doctorMode, toggleDoctorMode }}>
      {children}
    </DoctorModeContext.Provider>
  );
};

export const useDoctorMode = () => useContext(DoctorModeContext);
