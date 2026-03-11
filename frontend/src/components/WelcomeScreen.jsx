import React, { useState } from 'react';
import './WelcomeScreen.css';
import PrintableForm from './PrintableForm';
import {
  FileTextIcon,
  ClipboardListIcon,
  ClockIcon,
  LockIcon,
  ArrowRightIcon,
  UploadIcon,
  ShieldCheckIcon,
  StethoscopeIcon,
  CheckCircle2Icon,
  ActivityIcon,
  HeartPulseIcon,
  UserCheckIcon,
  ChevronRightIcon,
} from 'lucide-react';

const WelcomeScreen = ({ onBegin, onBeginLocal, onBeginCloud, onImport, formData, cloudAvailable }) => {
  const [showForm, setShowForm] = useState(false);

  const handleBegin = () => {
    if (onBegin) return onBegin();
    if (cloudAvailable && onBeginCloud) return onBeginCloud();
    if (onBeginLocal) return onBeginLocal();
  };

  const showStorageChoice = cloudAvailable && onBeginLocal && onBeginCloud;

  if (showForm) {
    return <PrintableForm onBack={() => setShowForm(false)} formData={formData} />;
  }

  const assessmentSteps = [
    {
      number: '01',
      icon: <ClipboardListIcon size={20} />,
      title: 'Part 1 — Risk Profile',
      description: 'Answer 27 questions covering demographics, lifestyle, family history, and urinary symptoms.',
      time: '~4 min',
    },
    {
      number: '02',
      icon: <ActivityIcon size={20} />,
      title: 'Part 2 — Clinical Data',
      description: 'Optionally enter your PSA level and MRI PI-RADS score to refine your risk estimate.',
      time: '~1 min',
    },
    {
      number: '03',
      icon: <HeartPulseIcon size={20} />,
      title: 'Results & Next Steps',
      description: 'Receive a personalized ePSA risk tier with evidence-based guidance for clinician discussion.',
      time: 'Instant',
    },
  ];

  const trustSignals = [
    { icon: <ShieldCheckIcon size={15} />, label: 'No account required' },
    { icon: <LockIcon size={15} />, label: 'Privacy by design' },
    { icon: <StethoscopeIcon size={15} />, label: 'Built for clinician conversations' },
    { icon: <CheckCircle2Icon size={15} />, label: 'AUA / NCCN / EAU guidelines' },
    { icon: <UserCheckIcon size={15} />, label: 'Evidence-informed scoring' },
    { icon: <FileTextIcon size={15} />, label: 'Exportable PDF & CSV results' },
  ];

  return (
    <div className="welcome-screen">
      {/* Clinical credibility bar */}
      <div className="welcome-cred-bar">
        <span className="welcome-cred-tag">Educational Clinical Support Tool</span>
        <span className="welcome-cred-divider" aria-hidden="true">·</span>
        <span className="welcome-cred-inst">
          Developed at Icahn School of Medicine at Mount Sinai · Urology AI
        </span>
      </div>

      {/* Hero section */}
      <section className="welcome-hero" aria-labelledby="hero-heading">
        <div className="welcome-hero-eyebrow">
          <span className="welcome-ribbon-dot" aria-hidden="true" />
          Prostate-Specific Awareness
        </div>
        <h1 id="hero-heading" className="welcome-hero-title">
          Know Your Prostate Cancer Risk
        </h1>
        <p className="welcome-hero-desc">
          Complete an evidence-informed questionnaire to generate a personalized ePSA estimate —
          designed for shared decision-making with your clinician.
        </p>

        <div className="welcome-quick-stats" role="list">
          <div className="welcome-stat" role="listitem">
            <ClipboardListIcon size={16} className="welcome-stat-icon" />
            <span>27 guided questions</span>
          </div>
          <div className="welcome-stat" role="listitem">
            <ClockIcon size={16} className="welcome-stat-icon" />
            <span>~5 minutes total</span>
          </div>
          <div className="welcome-stat" role="listitem">
            <LockIcon size={16} className="welcome-stat-icon" />
            <span>Private by design</span>
          </div>
        </div>
      </section>

      {/* Assessment flow preview */}
      <section className="welcome-steps-section" aria-labelledby="steps-heading">
        <h2 id="steps-heading" className="welcome-section-heading">How It Works</h2>
        <div className="welcome-steps-grid">
          {assessmentSteps.map((step, i) => (
            <div className="welcome-step-card" key={i}>
              <div className="welcome-step-header">
                <div className="welcome-step-num">{step.number}</div>
                <div className="welcome-step-icon">{step.icon}</div>
              </div>
              <div className="welcome-step-title">{step.title}</div>
              <p className="welcome-step-desc">{step.description}</p>
              <div className="welcome-step-time">
                <ClockIcon size={12} />
                <span>{step.time}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Action section */}
      <section className="welcome-action-section">
        {showStorageChoice ? (
          <>
            <p className="welcome-storage-label">Choose how to save your progress</p>
            <div className="welcome-storage-grid">
              <button
                type="button"
                className="btn-storage-local"
                onClick={onBeginLocal}
              >
                <span className="btn-storage-main">Use this device only</span>
                <span className="btn-storage-sub">No sign-in · data stays on this browser</span>
              </button>
              <button
                type="button"
                className="btn-storage-cloud"
                onClick={onBeginCloud}
              >
                <span className="btn-storage-main">
                  Save to cloud
                  <span className="btn-storage-badge">Recommended</span>
                </span>
                <span className="btn-storage-sub">Get a session key · no email required</span>
              </button>
            </div>
          </>
        ) : (
          <button
            className="btn-begin-primary"
            onClick={handleBegin}
            aria-label="Start the ePSA risk assessment"
          >
            <span>Start Assessment</span>
            <ArrowRightIcon size={20} />
          </button>
        )}

        <div className="welcome-secondary-actions">
          {onImport && (
            <button type="button" className="btn-secondary-action" onClick={onImport}>
              <UploadIcon size={15} />
              <span>Import Previous Session</span>
            </button>
          )}
          <button
            type="button"
            className="btn-secondary-action"
            onClick={() => setShowForm(true)}
            title="View Offline Paper Form"
          >
            <FileTextIcon size={15} />
            <span>View Printable Form</span>
          </button>
        </div>
      </section>

      {/* Trust signals */}
      <section className="welcome-trust-section" aria-label="Trust and credibility signals">
        <div className="welcome-trust-grid">
          {trustSignals.map((signal, i) => (
            <div className="welcome-trust-item" key={i}>
              <span className="welcome-trust-icon" aria-hidden="true">{signal.icon}</span>
              <span>{signal.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Guideline badges */}
      <section className="welcome-guidelines" aria-label="Clinical guideline sources">
        <span className="welcome-guidelines-label">Informed by</span>
        <div className="welcome-guideline-badges">
          <span className="welcome-guideline-badge">AUA 2026</span>
          <span className="welcome-guideline-badge">NCCN</span>
          <span className="welcome-guideline-badge">EAU</span>
          <span className="welcome-guideline-badge">SUO 2026</span>
        </div>
      </section>

      {/* Legal disclaimer */}
      <p className="welcome-disclaimer" role="note">
        <strong>Educational use only.</strong> This tool is not a clinical diagnostic and has not been independently
        validated for standalone clinical decision-making. It is intended to supplement — not replace — guidance
        from a licensed healthcare professional.
      </p>
    </div>
  );
};

export default WelcomeScreen;
