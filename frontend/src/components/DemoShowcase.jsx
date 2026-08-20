import React, { useEffect, useRef, useState } from 'react';
import './DemoShowcase.css';
import { ArrowRightIcon } from 'lucide-react';

const BEAT_MS = 750;
const READ_RESULT_MS = 2600;

const STEPS = [
  {
    id: 'pre-screen',
    progress: 20,
    beats: [
      { type: 'options', text: 'What is your age?', options: ['40–49', '50–59', '60–69', '70+'], answer: 2 },
      { type: 'options', text: 'What is your race?', options: ['White', 'Black / African American', 'Asian', 'Other'], answer: 0 },
      { type: 'options', text: 'Family history of prostate cancer?', options: ['Yes', 'No'], answer: 0 },
      { type: 'options', text: 'Hereditary cancer gene testing (BRCA1/2, HOXB13)?', options: ['Yes', 'No', 'Unknown'], answer: 2 },
      { type: 'options', text: 'Typical weekly exercise level?', options: ['Sedentary', 'Light', 'Moderate', 'Active'], answer: 2 },
      { type: 'options', text: 'Smoking status?', options: ['Never', 'Former', 'Current'], answer: 0 },
      { type: 'options', text: 'Urinary symptoms (IPSS)?', options: ['None', 'Mild', 'Moderate', 'Severe'], answer: 1 },
    ],
    result: { label: 'Recommendation', badge: 'PSA test recommended', tone: 'amber' },
  },
  {
    id: 'with-psa',
    progress: 60,
    beats: [
      { type: 'options', text: 'Do you know your PSA level?', options: ['Yes', 'No'], answer: 0 },
      { type: 'input', text: 'Enter PSA level (ng/mL)', value: '4.8', unit: 'ng/mL' },
      { type: 'options', text: 'Taking hormonal medication that may affect PSA?', options: ['Yes', 'No'], answer: 1 },
    ],
    result: { label: 'Risk stratification', badge: 'Intermediate risk: MRI advised', tone: 'amber', gauge: 62 },
  },
  {
    id: 'with-mri',
    progress: 95,
    beats: [
      { type: 'options', text: 'Do you know your MRI PI-RADS score?', options: ['Yes', 'No'], answer: 0 },
      { type: 'options', text: 'PI-RADS score on MRI?', options: ['1', '2', '3', '4', '5'], answer: 3, round: true },
      { type: 'options', text: 'Had a prior prostate biopsy?', options: ['Yes', 'No'], answer: 1 },
    ],
    result: { label: 'Refined recommendation', badge: 'Biopsy recommended', tone: 'red' },
  },
];

function QuestionCard({ number, beat, answered }) {
  return (
    <div className="ds-question-card ds-reveal-pop">
      <div className="ds-question-header">
        <span className="ds-question-number">{number}</span>
        <span className="ds-question-text">{beat.text}</span>
      </div>
      {beat.type === 'options' ? (
        <div className={`ds-option-grid${beat.round ? ' ds-option-grid-5' : ''}`}>
          {beat.options.map((opt, i) => (
            <span
              key={opt}
              className={`ds-option-btn${beat.round ? ' ds-option-round' : ''}${answered && i === beat.answer ? ' ds-option-selected' : ''}`}
            >
              {opt}
            </span>
          ))}
        </div>
      ) : (
        <div className={`ds-input-row${answered ? ' ds-input-filled' : ''}`}>
          <span className="ds-input-value">{answered ? beat.value : ''}</span>
          <span className="ds-input-unit">{beat.unit}</span>
        </div>
      )}
    </div>
  );
}

function ResultPanel({ result }) {
  return (
    <div className="ds-mock-result ds-reveal-pop">
      <span className="ds-mock-result-label">{result.label}</span>
      {result.gauge != null && (
        <div className="ds-mock-gauge">
          <div className="ds-mock-gauge-track">
            <div className="ds-mock-gauge-fill" style={{ width: `${result.gauge}%` }} />
          </div>
        </div>
      )}
      <span className={`ds-mock-result-badge ds-mock-badge-${result.tone}`}>{result.badge}</span>
    </div>
  );
}

function ScreenWalkthrough() {
  const [active, setActive] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [continuePressed, setContinuePressed] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [paused, setPaused] = useState(false);
  const screenRef = useRef(null);
  const pausedRef = useRef(false);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    setAnsweredCount(0);
    setContinuePressed(false);
    setShowResult(false);

    const step = STEPS[active];
    const timeouts = [];
    let elapsed = 350;

    for (let i = 1; i <= step.beats.length; i += 1) {
      timeouts.push(setTimeout(() => setAnsweredCount(i), elapsed));
      elapsed += BEAT_MS;
    }

    timeouts.push(setTimeout(() => setContinuePressed(true), elapsed));
    elapsed += BEAT_MS * 0.6;

    timeouts.push(setTimeout(() => setShowResult(true), elapsed));
    elapsed += READ_RESULT_MS;

    const tryAdvance = () => {
      if (pausedRef.current) {
        timeouts.push(setTimeout(tryAdvance, 300));
      } else {
        setActive(a => (a + 1) % STEPS.length);
      }
    };
    timeouts.push(setTimeout(tryAdvance, elapsed));

    return () => timeouts.forEach(clearTimeout);
  }, [active]);

  useEffect(() => {
    if (screenRef.current) {
      screenRef.current.scrollTo({ top: screenRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [answeredCount, showResult]);

  const step = STEPS[active];

  return (
    <div
      className="ds-walkthrough"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="ds-walkthrough-left">
        <div className="ds-phone-frame">
          <div className="ds-phone-notch" />
          <div className="ds-phone-statusbar">
            <span>9:41</span>
            <span className="ds-phone-statusbar-icons">●●●</span>
          </div>
          <div className="ds-phone-screen" ref={screenRef}>
            <div className="ds-app-header">
              <span className="ds-app-logo">ePSA</span>
              <div className="ds-app-progress-track">
                <div className="ds-app-progress-fill" style={{ width: `${step.progress}%` }} />
              </div>
            </div>

            {step.beats.slice(0, Math.min(answeredCount + 1, step.beats.length)).map((beat, i) => (
              <QuestionCard key={`${active}-${i}`} number={i + 1} beat={beat} answered={i < answeredCount} />
            ))}

            <span className={`ds-continue-btn${continuePressed ? ' ds-continue-pressed' : ''}`}>Continue</span>

            {showResult && <ResultPanel result={step.result} />}
          </div>
        </div>

        <div className="ds-phone-dots">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              className={`ds-phone-dot${i === active ? ' ds-phone-dot-active' : ''}`}
              onClick={() => setActive(i)}
              aria-label={`Show step ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <aside className="ds-walkthrough-right">
        <div className="ds-qr-card">
          <img src="/epsa-qr.svg" alt="QR code linking to epsa.millionstrongmen.com" className="ds-qr-img" width="180" height="180" />
          <p className="ds-qr-title">Scan to try it yourself</p>
          <p className="ds-qr-url">epsa.millionstrongmen.com</p>
        </div>
      </aside>
    </div>
  );
}

export default function DemoShowcase() {
  return (
    <div className="ds-root">
      <header className="ds-header">
        <div className="ds-header-inner">
          <div className="ds-brand">
            <img src="/logo.png" alt="ePSA" className="ds-logo" onError={e => { e.target.style.display = 'none'; }} />
            <span className="ds-brand-name">ePSA</span>
          </div>
        </div>
      </header>

      <main className="ds-main">
        <div className="ds-hero">
          <p className="ds-kicker">Live Walkthrough</p>
          <h1 className="ds-hero-title">See ePSA in Action</h1>
          <p className="ds-hero-body">
            ePSA is an easy-to-use educational online tool that helps men understand their personal risk for prostate cancer before they even get tested.
            It walks you through a short set of questions to give you a personalized picture of your prostate health. It only takes about a few minutes,
            with results that adapt as you answer, meeting you wherever you are in your journey. Grounded in AUA and NCCN screening standards and enriched
            with additional risk factors like lifestyle, family history, and symptoms, so what you get is both clinically grounded and personalized for you.
          </p>
          <p className="ds-hero-body">
            Watch a patient answer the actual questions ePSA asks: demographics, family history, PSA results, and MRI findings,
            and see how the recommendation updates at every stage. Scan the QR code to try it on your own device.
          </p>
        </div>

        <ScreenWalkthrough />

        <div className="ds-bottom-cta">
          <p className="ds-bottom-cta-text">Ready to assess a patient?</p>
          <a href="/" className="ds-btn-primary">
            Open ePSA <ArrowRightIcon size={16} />
          </a>
          <p className="ds-disclaimer">
            For educational and clinical decision-support use only. Does not replace physician judgment.
            Developed by Dr. Ashutosh K. Tewari and team · Tewari Lab, Icahn School of Medicine at Mount Sinai.
          </p>
        </div>
      </main>
    </div>
  );
}
