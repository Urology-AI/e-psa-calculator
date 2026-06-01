import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import './QuickEpsaFlow.css';
import InfoIcon from './InfoIcon.jsx';
import { fieldReferences } from '../utils/fieldReferences';
import { calculateDynamicEPsa } from '../utils/dynamicCalculator';
import { DEFAULT_CALCULATOR_CONFIG } from '../config/calculatorConfig';
import QuickEpsaResult from './QuickEpsaResult.jsx';
import { ZapIcon, ChevronRightIcon, RotateCcwIcon, CheckIcon } from 'lucide-react';

/* ─── BMI helpers ─── */
function calcBmi(ft, inch, lbs) {
  const inches = (parseFloat(ft) || 0) * 12 + (parseFloat(inch) || 0);
  const w = parseFloat(lbs);
  return inches && w ? (703 * w) / (inches * inches) : null;
}
function calcBmiMetric(cm, kg) {
  const h = parseFloat(cm), w = parseFloat(kg);
  return h && w ? w / ((h / 100) * (h / 100)) : null;
}
function deriveBmi(a, mH, mW) {
  if (mH && mW) return calcBmiMetric(a.heightCm, a.weightKg);
  if (!mH && !mW) return calcBmi(a.heightFt, a.heightIn, a.weightLbs);
  const inches = mH ? (parseFloat(a.heightCm) || 0) / 2.54
    : (parseFloat(a.heightFt) || 0) * 12 + (parseFloat(a.heightIn) || 0);
  const lbs = mW ? (parseFloat(a.weightKg) || 0) * 2.20462 : parseFloat(a.weightLbs);
  return inches && lbs ? (703 * lbs) / (inches * inches) : null;
}
function deriveIpss(qol) {
  if (qol <= 1) return [0, 0, 0, 0, 0, 0, 0];
  if (qol === 2) return [1, 1, 1, 1, 1, 1, 1];
  if (qol <= 4) return [3, 3, 3, 3, 3, 3, 3];
  return [5, 5, 5, 5, 5, 5, 5];
}

/* ─── Chip group ─── */
const Chips = ({ options, value, onChange, ariaLabel }) => (
  <div className="qef-chips" role="radiogroup" aria-label={ariaLabel}>
    {options.map((opt) => {
      const sel = String(value) === String(opt.value);
      return (
        <button key={String(opt.value)} type="button" role="radio" aria-checked={sel}
          className={`qef-chip${sel ? ' qef-chip--sel' : ''}`}
          onClick={() => onChange(opt.value)}
        >{opt.label}</button>
      );
    })}
  </div>
);

/* ─── Question card ─── */
const QCard = ({ num, label, info, sublabel, citation, answered, children }) => (
  <div className={`qef-card${answered ? ' qef-card--answered' : ''}`}>
    <div className="qef-card-header">
      <span className={`qef-q-num${answered ? ' qef-q-num--done' : ''}`}>
        {answered ? <CheckIcon size={13} aria-hidden="true" /> : num}
      </span>
      <span className="qef-q-label">{label}</span>
      {info && <InfoIcon {...info} />}
    </div>
    {sublabel && <p className="qef-sublabel">{sublabel}</p>}
    {children}
    {citation && <p className="qef-citation">{citation}</p>}
  </div>
);

/* ─── Welcome screen ─── */
function WelcomeScreen({ onStart }) {
  return (
    <div className="qef-welcome">
      <div className="qef-welcome-hero">
        <img src="/sinai_light.png" alt="Mount Sinai" className="qef-logo qef-logo--light" onError={(e) => { e.target.style.display = 'none'; }} />
        <img src="/sinai_dark.png" alt="Mount Sinai" className="qef-logo qef-logo--dark" onError={(e) => { e.target.style.display = 'none'; }} />
        <h1 className="qef-welcome-title">Mount Sinai Robert F. Smith<br />Mobile Prostate Cancer Screening</h1>
        <p className="qef-welcome-sub">Bringing state-of-the-art screening directly to your community</p>
      </div>
      <div className="qef-welcome-body">
        <div className="qef-stats-row">
          <div className="qef-stat">
            <span className="qef-stat-num">10,000+</span>
            <span className="qef-stat-label">People screened since 2022</span>
          </div>
          <div className="qef-stat">
            <span className="qef-stat-num">1 in 8</span>
            <span className="qef-stat-label">Men affected by prostate cancer</span>
          </div>
        </div>
        <div className="qef-info-card">
          <div className="qef-info-title">Free services available today</div>
          <ul className="qef-info-list">
            <li>PSA blood test</li>
            <li>Micro-ultrasound imaging</li>
            <li>Bladder health scan</li>
            <li>Nurse consultation</li>
          </ul>
        </div>
        <div className="qef-info-card">
          <div className="qef-info-title">Who should get screened?</div>
          <p className="qef-info-p">Men ages 45–79. Black men and those with a family history of prostate cancer are especially encouraged — your risk may be 2× higher.</p>
        </div>
        <button className="qef-cta-btn" onClick={onStart} type="button">
          <ZapIcon size={18} aria-hidden="true" />
          Check My Risk — 11 Questions
          <ChevronRightIcon size={18} aria-hidden="true" />
        </button>
        <p className="qef-walkin">Walk-ins welcome · No appointment needed<br />Questions? Call <a href="tel:6465318092" className="qef-tel">646-531-8092</a></p>
      </div>
    </div>
  );
}

const TOTAL = 11;

export default function QuickEpsaFlow() {
  const { t } = useTranslation();
  const [screen, setScreen] = useState('welcome');
  const [answers, setAnswers] = useState({});
  const [metricH, setMetricH] = useState(false);
  const [metricW, setMetricW] = useState(false);
  const [result, setResult] = useState(null);
  const [ageError, setAgeError] = useState('');

  const set = (key, val) => setAnswers((p) => ({ ...p, [key]: val }));

  const bmi = useMemo(() => deriveBmi(answers, metricH, metricW), [answers, metricH, metricW]);

  // Per-question answered state
  const isAnswered = useMemo(() => {
    const age = parseInt(answers.age);
    const heightOk = metricH ? !!answers.heightCm : (answers.heightFt !== undefined && answers.heightFt !== '');
    const weightOk = metricW ? !!answers.weightKg : !!answers.weightLbs;
    return {
      age:           !!(age && age >= 18 && age <= 99),
      race:          !!answers.race,
      familyHistory: answers.familyHistory !== undefined && answers.familyHistory !== null && answers.familyHistory !== '',
      qol:           answers.qol !== undefined && answers.qol !== null && answers.qol !== '',
      height:        heightOk,
      weight:        weightOk,
      exercise:      answers.exercise !== undefined && answers.exercise !== null && answers.exercise !== '',
      smoking:       answers.smoking  !== undefined && answers.smoking  !== null && answers.smoking  !== '',
      diet:          !!answers.diet,
      shim:          answers.shim !== undefined && answers.shim !== null && answers.shim !== '',
      brca:          !!answers.brca,
    };
  }, [answers, metricH, metricW]);

  const answered = Object.values(isAnswered).filter(Boolean).length;
  const ready = answered === TOTAL;

  function handleAgeBlur() {
    const age = parseInt(answers.age);
    if (answers.age === '' || answers.age === undefined) { setAgeError(''); return; }
    if (!age || age < 18 || age > 99) setAgeError('Please enter an age between 18 and 99.');
    else setAgeError('');
  }

  function handleSubmit() {
    if (!ready) return;
    const fhMap = { none: 0, one: 1, two_plus: 2, unknown: 'unknown' };
    const dietMap = { red_meat: 'western', mixed: 'other', plant: 'plant-based' };
    const shimVal = answers.shim;
    const formData = {
      age: parseInt(answers.age),
      race: answers.race,
      familyHistory: fhMap[answers.familyHistory] ?? 0,
      ipss: deriveIpss(answers.qol),
      shim: [shimVal, shimVal, shimVal, shimVal, shimVal],
      dietPattern: dietMap[answers.diet] || 'other',
      exercise: answers.exercise,
      smoking: answers.smoking,
      bmi: bmi ? parseFloat(bmi.toFixed(1)) : 22,
      brcaStatus: answers.brca,
      inflammationHistory: 0,
      chemicalExposure: 'no',
      comorbidityScore: 0,
      hypertension: null, hyperlipidemia: null, coronaryArteryDisease: null, diabetes: null,
    };
    const engineResult = calculateDynamicEPsa(formData, DEFAULT_CALCULATOR_CONFIG);
    setResult({ engineResult, formData });
    setScreen('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleReset() {
    setAnswers({}); setMetricH(false); setMetricW(false); setResult(null); setAgeError('');
    setScreen('welcome');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleEditAnswers() {
    setScreen('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleContinue() {
    // Strip ?mode=bus and go to full app
    window.location.href = window.location.origin + window.location.pathname;
  }

  if (screen === 'welcome') {
    return <WelcomeScreen onStart={() => { setScreen('form'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />;
  }

  if (screen === 'result' && result?.engineResult) {
    return (
      <div className="qef-root">
        <div className="qef-result-header">
          <img src="/sinai_dark.png" alt="Mount Sinai" style={{ height: '1.5rem', width: 'auto' }} onError={(e) => { e.target.style.display = 'none'; }} />
          <span className="qef-result-header-title">Your Results</span>
        </div>
        <QuickEpsaResult
          result={result.engineResult}
          formData={result.formData}
          onEditAnswers={handleEditAnswers}
          onStartOver={handleReset}
          onContinue={handleContinue}
        />
      </div>
    );
  }

  const bmiLabel = bmi
    ? `${t('part1.step2.bmiLabel')}: ${bmi.toFixed(1)} — ${bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese'}`
    : null;

  return (
    <div className="qef-root">
      {/* ── Sticky progress bar ── */}
      <div className="qef-progress-bar">
        <div className="qef-progress-text">{answered} of {TOTAL} answered</div>
        <div className="qef-progress-track">
          <div className="qef-progress-fill" style={{ width: `${(answered / TOTAL) * 100}%` }} />
        </div>
      </div>

      <div className="qef-questions">

        {/* Q1 — Age */}
        <QCard num={1} label={t('part1.fields.age.title')} info={fieldReferences.age}
          sublabel={t('part1.fields.age.helper')} answered={isAnswered.age}>
          <input className={`qef-input${ageError ? ' qef-input--error' : ''}`}
            type="number" min={18} max={99}
            placeholder={t('part1.fields.age.placeholder')}
            value={answers.age ?? ''}
            onChange={(e) => { set('age', e.target.value); setAgeError(''); }}
            onBlur={handleAgeBlur}
          />
          {ageError && <p className="qef-field-error">{ageError}</p>}
        </QCard>

        {/* Q2 — Race */}
        <QCard num={2} label={t('part1.fields.race.title')} info={fieldReferences.race} answered={isAnswered.race}>
          <Chips ariaLabel={t('part1.fields.race.title')} value={answers.race ?? ''} onChange={(v) => set('race', v)}
            options={[
              { value: 'white',    label: t('part1.race.white') },
              { value: 'black',    label: t('part1.race.black') },
              { value: 'hispanic', label: t('part1.race.hispanic') },
              { value: 'asian',    label: t('part1.race.asian') },
              { value: 'mixed',    label: t('part1.race.mixed') },
              { value: 'other',    label: t('part1.race.other') },
            ]}
          />
        </QCard>

        {/* Q3 — Family history */}
        <QCard num={3} label={t('part1.step1.familyHistory.title')} info={fieldReferences.familyHistory}
          sublabel={t('part1.fields.familyHistory.helper')} answered={isAnswered.familyHistory}>
          <Chips ariaLabel={t('part1.step1.familyHistory.title')} value={answers.familyHistory ?? ''} onChange={(v) => set('familyHistory', v)}
            options={[
              { value: 'none',     label: t('quickEntry.family.none') },
              { value: 'one',      label: t('quickEntry.family.one') },
              { value: 'two_plus', label: t('quickEntry.family.twoPlus') },
              { value: 'unknown',  label: t('part1.options.unknown') },
            ]}
          />
        </QCard>

        {/* Q4 — Urinary QoL */}
        <QCard num={4} label={t('part1.steps.ipss.sectionTitle')} info={fieldReferences.ipss}
          sublabel={t('quickEntry.ipssQolLabel')} answered={isAnswered.qol}
          citation="International Prostate Symptom Score (IPSS) — AUA/WHO validated. Score ≥ 3 warrants clinical evaluation.">
          <Chips ariaLabel={t('part1.steps.ipss.sectionTitle')} value={answers.qol ?? ''} onChange={(v) => set('qol', v)}
            options={[
              { value: 0, label: t('quickEntry.ipssQol.delighted') },
              { value: 1, label: t('quickEntry.ipssQol.pleased') },
              { value: 2, label: t('quickEntry.ipssQol.mostlySatisfied') },
              { value: 3, label: t('quickEntry.ipssQol.mixed') },
              { value: 4, label: t('quickEntry.ipssQol.mostlyDissatisfied') },
              { value: 5, label: t('quickEntry.ipssQol.unhappy') },
              { value: 6, label: t('quickEntry.ipssQol.terrible') },
            ]}
          />
        </QCard>

        {/* Q5 — Height */}
        <QCard num={5} label={t('part1.step2.heightQuestion')} info={fieldReferences.heightWeight} answered={isAnswered.height}>
          <div className="qef-unit-row">
            <button type="button" className="qef-unit-toggle" onClick={() => setMetricH((v) => !v)}>
              {metricH ? t('part1.step2.heightUnit.metric') : t('part1.step2.heightUnit.imperial')}
            </button>
          </div>
          {metricH ? (
            <input className="qef-input" type="number" min={100} max={250}
              placeholder={t('part1.step2.heightMetricPlaceholder')}
              value={answers.heightCm ?? ''} onChange={(e) => set('heightCm', e.target.value)} />
          ) : (
            <div className="qef-height-row">
              <input className="qef-input qef-input--sm" type="number" min={3} max={8}
                placeholder={t('part1.step2.heightImperialFeetPlaceholder')}
                value={answers.heightFt ?? ''} onChange={(e) => set('heightFt', e.target.value)} />
              <input className="qef-input qef-input--sm" type="number" min={0} max={11}
                placeholder={t('part1.step2.heightImperialInchesPlaceholder')}
                value={answers.heightIn ?? ''} onChange={(e) => set('heightIn', e.target.value)} />
            </div>
          )}
        </QCard>

        {/* Q6 — Weight + live BMI */}
        <QCard num={6} label={t('part1.step2.weightQuestion')} info={fieldReferences.heightWeight}
          sublabel={t('part1.step2.weightHelper')} answered={isAnswered.weight}>
          <div className="qef-unit-row">
            <button type="button" className="qef-unit-toggle" onClick={() => setMetricW((v) => !v)}>
              {metricW ? t('part1.step2.weightUnit.lbs') : t('part1.step2.weightUnit.kg')}
            </button>
          </div>
          {metricW ? (
            <input className="qef-input" type="number" min={30} max={300}
              placeholder={t('part1.step2.weightMetricPlaceholder')}
              value={answers.weightKg ?? ''} onChange={(e) => set('weightKg', e.target.value)} />
          ) : (
            <input className="qef-input" type="number" min={66} max={660}
              placeholder={t('part1.step2.weightImperialPlaceholder')}
              value={answers.weightLbs ?? ''} onChange={(e) => set('weightLbs', e.target.value)} />
          )}
          {bmiLabel && <div className="qef-bmi-badge">{bmiLabel}</div>}
        </QCard>

        {/* Q7 — Exercise */}
        <QCard num={7} label={t('part1.fields.exercise.title')} info={fieldReferences.exercise}
          sublabel={t('part1.fields.exercise.helper')} answered={isAnswered.exercise}>
          <Chips ariaLabel={t('part1.fields.exercise.title')} value={answers.exercise ?? ''} onChange={(v) => set('exercise', v)}
            options={[
              { value: 0, label: t('part1.step3.exercise.regular') },
              { value: 1, label: t('part1.step3.exercise.some') },
              { value: 2, label: t('part1.step3.exercise.none') },
            ]}
          />
        </QCard>

        {/* Q8 — Smoking */}
        <QCard num={8} label={t('part1.fields.smoking.title')} info={fieldReferences.smoking}
          sublabel={t('part1.fields.smoking.helper')} answered={isAnswered.smoking}>
          <Chips ariaLabel={t('part1.fields.smoking.title')} value={answers.smoking ?? ''} onChange={(v) => set('smoking', v)}
            options={[
              { value: 0, label: t('part1.step3.smoking.never') },
              { value: 1, label: t('part1.step3.smoking.former') },
              { value: 2, label: t('part1.step3.smoking.current') },
            ]}
          />
        </QCard>

        {/* Q9 — Diet */}
        <QCard num={9} label={t('part1.fields.diet.title')} info={fieldReferences.diet}
          sublabel={t('part1.fields.diet.helper')} answered={isAnswered.diet}>
          <Chips ariaLabel={t('part1.fields.diet.title')} value={answers.diet ?? ''} onChange={(v) => set('diet', v)}
            options={[
              { value: 'red_meat', label: 'Mostly red meat / fast food' },
              { value: 'mixed',    label: t('part1.step4.diet.other') },
              { value: 'plant',    label: t('part1.step4.diet.plantBased') },
            ]}
          />
        </QCard>

        {/* Q10 — SHIM */}
        <QCard num={10} label={t('part1.fields.shim.title')} info={fieldReferences.shim}
          sublabel={t('part1.shimShort.singleQuestionLabel')} answered={isAnswered.shim}
          citation="Sexual Health Inventory for Men (SHIM / IIEF-5). Your answer is private and confidential.">
          <Chips ariaLabel={t('part1.fields.shim.title')} value={answers.shim ?? ''} onChange={(v) => set('shim', v)}
            options={[
              { value: 1, label: t('part1.shimShort.options.severe') },
              { value: 2, label: t('part1.shimShort.options.moderate') },
              { value: 3, label: t('part1.shimShort.options.mildModerate') },
              { value: 4, label: t('part1.shimShort.options.mild') },
              { value: 5, label: t('part1.shimShort.options.none') },
            ]}
          />
        </QCard>

        {/* Q11 — BRCA / Genetic testing */}
        <QCard num={11} label={t('part1.fields.brcaStatus.title')} info={fieldReferences.brcaStatus}
          sublabel={t('part1.fields.brcaStatus.helper')} answered={isAnswered.brca}>
          <Chips ariaLabel={t('part1.fields.brcaStatus.title')} value={answers.brca ?? ''} onChange={(v) => set('brca', v)}
            options={[
              { value: 'no',      label: t('part1.options.no') },
              { value: 'yes',     label: t('part1.options.yes') },
              { value: 'unknown', label: t('part1.options.unknown') },
            ]}
          />
        </QCard>

      </div>

      {/* ── Sticky footer ── */}
      <div className="qef-footer">
        <div className="qef-footer-inner">
          <button type="button" className="qef-reset-link" onClick={handleReset}>
            <RotateCcwIcon size={13} aria-hidden="true" />
            Start over
          </button>
          <button type="button"
            className={`qef-submit-btn${ready ? ' qef-submit-btn--ready' : ''}`}
            disabled={!ready} onClick={handleSubmit}
          >
            {ready ? 'See My Result' : `${answered} / ${TOTAL} answered`}
            <ChevronRightIcon size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
