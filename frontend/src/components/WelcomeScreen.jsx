import React, { useState } from 'react';
import './WelcomeScreen.css';
import PrintableForm from './PrintableForm';
import { ArrowRightIcon, UploadIcon, FileTextIcon } from 'lucide-react';

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

  return (
    <div className="ws-root">

      {/* ── Hero ── */}
      <section className="ws-hero">
        <div className="ws-hero-kicker">
          educational Prostate&#8209;Specific Awareness<br />
          A Non&#8209;Validated Electronic Risk Tool
        </div>
        <h1 className="ws-hero-title">
          Find out if you should discuss<br />PSA testing with your doctor.
        </h1>
        <p className="ws-hero-body">
          ePSA is an evidence-informed questionnaire developed at Mount Sinai that summarises
          your personal risk factors — age, family history, PSA, lifestyle, and symptoms — into
          a single structured report designed to support your conversation with a clinician.
        </p>

        {/* CTA */}
        <div className="ws-cta">
          {showStorageChoice ? (
            <div className="ws-storage-choice">
              <button type="button" className="ws-btn-primary" onClick={onBeginLocal}>
                <span>Start Assessment</span>
                <ArrowRightIcon size={18} />
              </button>
              <button type="button" className="ws-btn-ghost" onClick={onBeginCloud}>
                Save to cloud instead
              </button>
            </div>
          ) : (
            <button className="ws-btn-primary" onClick={handleBegin}>
              <span>Start Assessment</span>
              <ArrowRightIcon size={18} />
            </button>
          )}
          <p className="ws-cta-note">~5 minutes · No account required · Private by design</p>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="ws-flow">
        <div className="ws-flow-step">
          <span className="ws-flow-num">1</span>
          <div>
            <strong>Risk Profile</strong>
            <span> — 27 questions covering demographics, lifestyle, family history, and urinary symptoms.</span>
          </div>
        </div>
        <div className="ws-flow-connector" aria-hidden="true" />
        <div className="ws-flow-step">
          <span className="ws-flow-num">2</span>
          <div>
            <strong>Clinical Data</strong>
            <span> — Optionally add your PSA level and MRI PI-RADS score to refine the estimate.</span>
          </div>
        </div>
        <div className="ws-flow-connector" aria-hidden="true" />
        <div className="ws-flow-step">
          <span className="ws-flow-num">3</span>
          <div>
            <strong>Personalised Results</strong>
            <span> — Receive an ePSA risk tier with printable guidance for your clinician discussion.</span>
          </div>
        </div>
      </section>

      {/* ── Secondary actions ── */}
      <div className="ws-secondary">
        {onImport && (
          <button type="button" className="ws-btn-text" onClick={onImport}>
            <UploadIcon size={14} />
            <span>Import previous session</span>
          </button>
        )}
        <button type="button" className="ws-btn-text" onClick={() => setShowForm(true)}>
          <FileTextIcon size={14} />
          <span>View printable form</span>
        </button>
      </div>

      {/* ── Footer strip ── */}
      <footer className="ws-footer">
        <span className="ws-footer-inst">
          Icahn School of Medicine at Mount Sinai · Urology AI
        </span>
        <span className="ws-footer-sep" aria-hidden="true">·</span>
        <span className="ws-footer-guidelines">Informed by AUA · NCCN · EAU · SUO</span>
        <p className="ws-footer-disclaimer">
          Educational use only. Not a clinical diagnostic. Does not replace guidance from a licensed healthcare professional.
        </p>
      </footer>

    </div>
  );
};

export default WelcomeScreen;
