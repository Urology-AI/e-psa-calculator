import React, { useState, useMemo, useRef, useEffect } from 'react';
import './QuickEpsaFlow.css';
import QuickEpsaResult from './QuickEpsaResult.jsx';
import { calculateDynamicEPsa } from '../utils/dynamicCalculator';

function WelcomeScreen({ onStart }) {
  return (
    <div className="qe-welcome">
      <div className="qe-welcome-hero">
        <img
          src="/sinai_light.png"
          alt="Mount Sinai"
          className="qe-welcome-logo"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <h1 className="qe-welcome-title">Mount Sinai Robert F. Smith<br />Mobile Prostate Cancer Screening</h1>
        <p className="qe-welcome-sub">Bringing state-of-the-art screening directly to your community</p>
      </div>

      <div className="qe-welcome-body">
        <div className="qe-welcome-stats">
          <div className="qe-stat">
            <span className="qe-stat-num">10,000+</span>
            <span className="qe-stat-label">People screened since 2022</span>
          </div>
          <div className="qe-stat">
            <span className="qe-stat-num">1 in 8</span>
            <span className="qe-stat-label">Men affected by prostate cancer</span>
          </div>
        </div>

        <div className="qe-welcome-section">
          <div className="qe-welcome-section-title">Free services available today</div>
          <ul className="qe-welcome-list">
            <li>PSA blood test</li>
            <li>Micro-ultrasound imaging</li>
            <li>Bladder health scan</li>
            <li>Nurse consultation</li>
          </ul>
        </div>

        <div className="qe-welcome-section">
          <div className="qe-welcome-section-title">Who should get screened?</div>
          <p className="qe-welcome-p">Men ages 45–79. Black men and those with a family history of prostate cancer are especially encouraged — your risk may be 2× higher.</p>
        </div>

        <button className="qe-welcome-cta" onClick={onStart} type="button">
          Check My Risk — 10 Questions →
        </button>

        <p className="qe-welcome-walk-in">Walk-ins welcome · No appointment needed<br />Questions? Call <a href="tel:6465318092" className="qe-welcome-tel">646-531-8092</a></p>
      </div>
    </div>
  );
}

const QOL_OPTIONS = [
  { label: 'Delighted', value: 0 },
  { label: 'Pleased', value: 1 },
  { label: 'Mostly Satisfied', value: 2 },
  { label: 'Mixed', value: 3 },
  { label: 'Mostly Dissatisfied', value: 4 },
  { label: 'Unhappy', value: 5 },
  { label: 'Terrible', value: 6 },
];

const SHIM_OPTIONS = [
  { label: 'Very Low', value: 1 },
  { label: 'Low', value: 2 },
  { label: 'Moderate', value: 3 },
  { label: 'High', value: 4 },
  { label: 'Very High', value: 5 },
];

function deriveIpss(qol) {
  if (qol <= 1) return [0, 0, 0, 0, 0, 0, 0];
  if (qol === 2) return [1, 1, 1, 1, 1, 1, 1];
  if (qol <= 4) return [3, 3, 3, 3, 3, 3, 3];
  return [5, 5, 5, 5, 5, 5, 5];
}

function calcBmi(heightFt, heightIn, weightLbs) {
  const totalInches = (parseFloat(heightFt) || 0) * 12 + (parseFloat(heightIn) || 0);
  const w = parseFloat(weightLbs);
  if (!totalInches || !w) return null;
  return (703 * w) / (totalInches * totalInches);
}

function calcBmiMetric(heightCm, weightKg) {
  const h = parseFloat(heightCm);
  const w = parseFloat(weightKg);
  if (!h || !w) return null;
  return w / ((h / 100) * (h / 100));
}

const TOTAL_QUESTIONS = 10;

export default function QuickEpsaFlow() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [useMetricHeight, setUseMetricHeight] = useState(false);
  const [useMetricWeight, setUseMetricWeight] = useState(false);
  const stickyRef = useRef(null);

  const answeredCount = useMemo(() => {
    const keys = ['age', 'race', 'familyHistory', 'qol', 'height', 'weight', 'exercise', 'smoking', 'diet', 'shim'];
    return keys.filter((k) => {
      const v = answers[k];
      if (v === undefined || v === null || v === '') return false;
      if (k === 'height') {
        if (useMetricHeight) return !!(answers.heightCm);
        return !!(answers.heightFt !== undefined && answers.heightFt !== '') || !!(answers.heightIn !== undefined && answers.heightIn !== '');
      }
      if (k === 'weight') {
        if (useMetricWeight) return !!(answers.weightKg);
        return !!(answers.weightLbs);
      }
      return true;
    }).length;
  }, [answers, useMetricHeight, useMetricWeight]);

  const allAnswered = useMemo(() => {
    const age = parseInt(answers.age);
    if (!age || age < 18 || age > 99) return false;
    if (!answers.race) return false;
    if (answers.familyHistory === undefined || answers.familyHistory === null) return false;
    if (answers.qol === undefined || answers.qol === null) return false;
    if (useMetricHeight) {
      if (!answers.heightCm) return false;
    } else {
      if (answers.heightFt === undefined || answers.heightFt === '') return false;
    }
    if (useMetricWeight) {
      if (!answers.weightKg) return false;
    } else {
      if (!answers.weightLbs) return false;
    }
    if (answers.exercise === undefined || answers.exercise === null) return false;
    if (answers.smoking === undefined || answers.smoking === null) return false;
    if (!answers.diet) return false;
    if (answers.shim === undefined || answers.shim === null) return false;
    return true;
  }, [answers, useMetricHeight, useMetricWeight]);

  const bmi = useMemo(() => {
    if (useMetricHeight && useMetricWeight) return calcBmiMetric(answers.heightCm, answers.weightKg);
    if (!useMetricHeight && !useMetricWeight) return calcBmi(answers.heightFt, answers.heightIn, answers.weightLbs);
    // mixed
    let totalInches;
    if (useMetricHeight) {
      totalInches = (parseFloat(answers.heightCm) || 0) / 2.54;
    } else {
      totalInches = (parseFloat(answers.heightFt) || 0) * 12 + (parseFloat(answers.heightIn) || 0);
    }
    let weightLbs;
    if (useMetricWeight) {
      weightLbs = (parseFloat(answers.weightKg) || 0) * 2.20462;
    } else {
      weightLbs = parseFloat(answers.weightLbs);
    }
    if (!totalInches || !weightLbs) return null;
    return (703 * weightLbs) / (totalInches * totalInches);
  }, [answers, useMetricHeight, useMetricWeight]);

  function set(key, value) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    if (!allAnswered) return;

    const raceMap = {
      white: 'white', black: 'black', hispanic: 'hispanic',
      asian: 'asian', mixed: 'mixed', other: 'other',
    };
    const fhMap = { none: 0, one: 1, two_plus: 2, unknown: 'unknown' };
    const dietMap = {
      'red_meat': 'western',
      'mixed': 'other',
      'plant': 'plant-based',
    };
    const shimVal = answers.shim;

    const formData = {
      age: parseInt(answers.age),
      race: raceMap[answers.race] || 'other',
      familyHistory: fhMap[answers.familyHistory],
      ipss: deriveIpss(answers.qol),
      shim: [shimVal, shimVal, shimVal, shimVal, shimVal],
      diet: dietMap[answers.diet] || 'other',
      exercise: answers.exercise,
      smoking: answers.smoking,
      bmi: bmi ? parseFloat(bmi.toFixed(1)) : 22,
      brcaStatus: 'unknown',
      inflammationHistory: 0,
      chemicalExposure: null,
      comorbidityScore: 0,
      skippedFields: ['brcaStatus', 'inflammationHistory', 'chemicalExposure', 'comorbidityScore'],
      pathwayMode: 'pre_psa',
    };

    const engineResult = calculateDynamicEPsa(formData);
    setResult({ engineResult, qol: answers.qol, shim: answers.shim, answers, bmi });
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleReset() {
    setAnswers({});
    setSubmitted(false);
    setResult(null);
    setShowWelcome(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (showWelcome) {
    return <WelcomeScreen onStart={() => { setShowWelcome(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />;
  }

  if (submitted && result) {
    return <QuickEpsaResult result={result} onReset={handleReset} />;
  }

  return (
    <div className="qe-flow">
      <header className="qe-header">
        <div className="qe-header-brand">Quick ePSA</div>
        <div className="qe-header-sub">Prostate Cancer Risk Pre-Screening</div>
      </header>

      <div className="qe-progress-bar-wrap">
        <div className="qe-progress-text">{answeredCount} of {TOTAL_QUESTIONS} answered</div>
        <div className="qe-progress-track">
          <div className="qe-progress-fill" style={{ width: `${(answeredCount / TOTAL_QUESTIONS) * 100}%` }} />
        </div>
      </div>

      <div className="qe-questions">

        {/* Q1 — Age */}
        <div className="qe-question">
          <div className="qe-q-label"><span className="qe-q-num">1</span> Age</div>
          <input
            className="qe-number-input"
            type="number"
            min={18}
            max={99}
            placeholder="Years (18–99)"
            value={answers.age ?? ''}
            onChange={(e) => set('age', e.target.value)}
          />
        </div>

        {/* Q2 — Race */}
        <div className="qe-question">
          <div className="qe-q-label"><span className="qe-q-num">2</span> Race / ancestry</div>
          <div className="qe-btn-group">
            {[
              { label: 'White', value: 'white' },
              { label: 'Black / African American', value: 'black' },
              { label: 'Hispanic / Latino', value: 'hispanic' },
              { label: 'Asian', value: 'asian' },
              { label: 'Mixed', value: 'mixed' },
              { label: 'Other', value: 'other' },
            ].map(({ label, value }) => (
              <button
                key={value}
                className={`qe-btn ${answers.race === value ? 'qe-btn--selected' : ''}`}
                onClick={() => set('race', value)}
                type="button"
              >{label}</button>
            ))}
          </div>
        </div>

        {/* Q3 — Family history */}
        <div className="qe-question">
          <div className="qe-q-label"><span className="qe-q-num">3</span> Family history of prostate cancer</div>
          <div className="qe-btn-group">
            {[
              { label: 'None', value: 'none' },
              { label: '1 family member', value: 'one' },
              { label: '2 or more', value: 'two_plus' },
              { label: 'Not sure', value: 'unknown' },
            ].map(({ label, value }) => (
              <button
                key={value}
                className={`qe-btn ${answers.familyHistory === value ? 'qe-btn--selected' : ''}`}
                onClick={() => set('familyHistory', value)}
                type="button"
              >{label}</button>
            ))}
          </div>
        </div>

        {/* Q4 — QoL */}
        <div className="qe-question">
          <div className="qe-q-label"><span className="qe-q-num">4</span> Quality of life — urinary symptoms</div>
          <div className="qe-q-sublabel">How would you feel if your urinary symptoms stayed exactly as they are for the rest of your life?</div>
          <div className="qe-btn-group">
            {QOL_OPTIONS.map(({ label, value }) => (
              <button
                key={value}
                className={`qe-btn ${answers.qol === value ? 'qe-btn--selected' : ''}`}
                onClick={() => set('qol', value)}
                type="button"
              >{label}</button>
            ))}
          </div>
          <div className="qe-citation">From the International Prostate Symptom Score (IPSS) — AUA / WHO validated urinary symptom bother scale. Score ≥ 3 warrants clinical evaluation.</div>
        </div>

        {/* Q5 — Height */}
        <div className="qe-question">
          <div className="qe-q-label">
            <span className="qe-q-num">5</span> Height
            <button
              className="qe-unit-toggle"
              type="button"
              onClick={() => setUseMetricHeight((v) => !v)}
            >{useMetricHeight ? 'Switch to ft / in' : 'Switch to cm'}</button>
          </div>
          {useMetricHeight ? (
            <input
              className="qe-number-input"
              type="number"
              min={100}
              max={250}
              placeholder="Height (cm)"
              value={answers.heightCm ?? ''}
              onChange={(e) => set('heightCm', e.target.value)}
            />
          ) : (
            <div className="qe-height-row">
              <input
                className="qe-number-input qe-height-ft"
                type="number"
                min={3}
                max={8}
                placeholder="ft"
                value={answers.heightFt ?? ''}
                onChange={(e) => set('heightFt', e.target.value)}
              />
              <input
                className="qe-number-input qe-height-in"
                type="number"
                min={0}
                max={11}
                placeholder="in"
                value={answers.heightIn ?? ''}
                onChange={(e) => set('heightIn', e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Q6 — Weight + BMI */}
        <div className="qe-question">
          <div className="qe-q-label">
            <span className="qe-q-num">6</span> Weight
            <button
              className="qe-unit-toggle"
              type="button"
              onClick={() => setUseMetricWeight((v) => !v)}
            >{useMetricWeight ? 'Switch to lbs' : 'Switch to kg'}</button>
          </div>
          {useMetricWeight ? (
            <input
              className="qe-number-input"
              type="number"
              min={30}
              max={300}
              placeholder="Weight (kg)"
              value={answers.weightKg ?? ''}
              onChange={(e) => set('weightKg', e.target.value)}
            />
          ) : (
            <input
              className="qe-number-input"
              type="number"
              min={66}
              max={660}
              placeholder="Weight (lbs)"
              value={answers.weightLbs ?? ''}
              onChange={(e) => set('weightLbs', e.target.value)}
            />
          )}
          {bmi !== null && (
            <div className="qe-bmi-display">
              BMI: <strong>{bmi.toFixed(1)}</strong>
              <span className="qe-bmi-label">
                {bmi < 18.5 ? ' — Underweight' : bmi < 25 ? ' — Normal' : bmi < 30 ? ' — Overweight' : ' — Obese'}
              </span>
            </div>
          )}
        </div>

        {/* Q7 — Exercise */}
        <div className="qe-question">
          <div className="qe-q-label"><span className="qe-q-num">7</span> Exercise level</div>
          <div className="qe-btn-group">
            {[
              { label: 'Regular (3+ days/week)', value: 0 },
              { label: 'Some (1–2 days/week)', value: 1 },
              { label: 'Little or none', value: 2 },
            ].map(({ label, value }) => (
              <button
                key={value}
                className={`qe-btn ${answers.exercise === value ? 'qe-btn--selected' : ''}`}
                onClick={() => set('exercise', value)}
                type="button"
              >{label}</button>
            ))}
          </div>
        </div>

        {/* Q8 — Smoking */}
        <div className="qe-question">
          <div className="qe-q-label"><span className="qe-q-num">8</span> Smoking status</div>
          <div className="qe-btn-group">
            {[
              { label: 'Never', value: 0 },
              { label: 'Former', value: 1 },
              { label: 'Current', value: 2 },
            ].map(({ label, value }) => (
              <button
                key={value}
                className={`qe-btn ${answers.smoking === value ? 'qe-btn--selected' : ''}`}
                onClick={() => set('smoking', value)}
                type="button"
              >{label}</button>
            ))}
          </div>
        </div>

        {/* Q9 — Diet */}
        <div className="qe-question">
          <div className="qe-q-label"><span className="qe-q-num">9</span> Diet pattern</div>
          <div className="qe-btn-group">
            {[
              { label: 'Mostly red meat / fast food', value: 'red_meat' },
              { label: 'Mixed / balanced', value: 'mixed' },
              { label: 'Mostly vegetables, fish, or plant-based', value: 'plant' },
            ].map(({ label, value }) => (
              <button
                key={value}
                className={`qe-btn ${answers.diet === value ? 'qe-btn--selected' : ''}`}
                onClick={() => set('diet', value)}
                type="button"
              >{label}</button>
            ))}
          </div>
        </div>

        {/* Q10 — SHIM */}
        <div className="qe-question">
          <div className="qe-q-label"><span className="qe-q-num">10</span> Erectile function</div>
          <div className="qe-q-sublabel">How would you rate your confidence that you could achieve and keep an erection?</div>
          <div className="qe-btn-group">
            {SHIM_OPTIONS.map(({ label, value }) => (
              <button
                key={value}
                className={`qe-btn ${answers.shim === value ? 'qe-btn--selected' : ''}`}
                onClick={() => set('shim', value)}
                type="button"
              >{label}</button>
            ))}
          </div>
          <div className="qe-private-note">Your answer is private and confidential.</div>
          <div className="qe-citation">Sexual Health Inventory for Men (SHIM / IIEF-5), Question 1. Validated erectile function screen. Score ≤ 2 indicates clinically significant erectile dysfunction.</div>
        </div>

      </div>

      <div className="qe-sticky-footer" ref={stickyRef}>
        <div className="qe-sticky-inner">
          <span className="qe-sticky-progress">{answeredCount} of {TOTAL_QUESTIONS} answered</span>
          <button
            className={`qe-submit-btn ${allAnswered ? 'qe-submit-btn--ready' : ''}`}
            disabled={!allAnswered}
            onClick={handleSubmit}
            type="button"
          >See My Result →</button>
        </div>
      </div>
    </div>
  );
}
