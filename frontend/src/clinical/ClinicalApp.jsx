import React, { useEffect, useState } from 'react';
import { UsersIcon, UserIcon, ArrowLeftIcon } from 'lucide-react';
import { DoctorModeContext } from '../context/DoctorModeContext.jsx';
import HeaderSettingsMenu from '../components/HeaderSettingsMenu.jsx';
import QuickEntry from '../components/QuickEntry.jsx';
import ClinicalWorkspace from './ClinicalWorkspace.jsx';
import { getCalculatorConfig } from '../utils/dynamicCalculator';
import './ClinicalApp.css';

// This app is always the clinical view. The shared view-mode context is pinned
// here rather than set through DoctorModeProvider, which would persist
// "clinical" to localStorage and flip the patient app on the same origin.
const CLINICAL_CONTEXT = { viewMode: 'clinical', setViewMode: () => {}, doctorMode: true };

const TABS = [
  { id: 'cohort', label: 'Cohort table', icon: UsersIcon },
  { id: 'single', label: 'Single patient', icon: UserIcon },
];

const ClinicalApp = () => {
  const [tab, setTab] = useState('cohort');
  useEffect(() => {
    document.title = 'ePSA Clinical';
    document.documentElement.setAttribute('data-view-mode', 'clinical');
  }, []);

  return (
    <DoctorModeContext.Provider value={CLINICAL_CONTEXT}>
      <div className="clinical-app">
        <header className="clinical-app__header">
          <div className="clinical-app__brand">
            <span className="clinical-app__name">ePSA<span className="clinical-app__tag">Clinical</span></span>
            <span className="clinical-app__sub">Tewari Lab · Icahn School of Medicine at Mount Sinai · Research &amp; clinical decision support</span>
          </div>
          <nav className="clinical-app__tabs" aria-label="Clinical views">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" aria-pressed={tab === id}
                className={`clinical-app__tab${tab === id ? ' clinical-app__tab--active' : ''}`} onClick={() => setTab(id)}>
                <Icon size={14} aria-hidden="true" /> {label}
              </button>
            ))}
          </nav>
          <div className="clinical-app__actions">
            <HeaderSettingsMenu />
            <a className="clinical-app__link" href="/"><ArrowLeftIcon size={13} aria-hidden="true" /> Patient app</a>
          </div>
        </header>
        <main className="clinical-app__main">
          {/* Both stay mounted so switching tabs never loses a loaded cohort or a half-entered patient. */}
          <div hidden={tab !== 'cohort'}><ClinicalWorkspace /></div>
          <div hidden={tab !== 'single'}><QuickEntry calculatorConfig={getCalculatorConfig()} /></div>
        </main>
      </div>
    </DoctorModeContext.Provider>
  );
};

export default ClinicalApp;
