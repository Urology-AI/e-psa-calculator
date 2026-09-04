/**
 * e-PSA Risk Assessment — Mount Sinai landing-page build.
 *
 * Deliberately lean: no Firebase, no accounts, no i18n bundle, no import or
 * admin surfaces. A visitor arriving from mountsinai.org answers Part 1, gets
 * a tier, and is handed a way to act on it. Nothing is transmitted anywhere;
 * answers live in component state only.
 *
 * Scoring is delegated wholesale to @epsa/engine so this build cannot disagree
 * with the full calculator or the bus screening tool about the same patient.
 */
import React, { useMemo, useState } from 'react';
import { calculateDynamicEPsa, validateInputs, DEFAULT_CALCULATOR_CONFIG } from '@epsa/engine';
import {
  IPSS_QUESTIONS,
  IPSS_SCALE,
  IPSS_NOCTURIA_SCALE,
  SHIM_QUESTIONS,
  SHIM_SCALE,
  RACE_OPTIONS,
  EXERCISE_OPTIONS,
  COMORBIDITIES,
} from './questions.js';
import './sinai.css';

const APPOINTMENT_URL =
  'https://raa.mountsinai.org/makeappt/index?pid=00000DDD0000000000127&office_id=00100OOO0000000000127';
const PHONE = '212-241-9955';
const MOBILE_UNIT_URL = 'https://www.mountsinai.org/care/cancer/services/prostate/mobile-screening';

const STEPS = ['About you', 'Health history', 'Urinary symptoms', 'Sexual health'];

const emptyAnswers = {
  age: '',
  race: null,
  heightFt: '',
  heightIn: '',
  weightLb: '',
  familyHistory: null,
  brcaStatus: 'no',
  exercise: null,
  hypertension: null,
  hyperlipidemia: null,
  coronaryArteryDisease: null,
  diabetes: null,
  ipss: Array(7).fill(null),
  shim: Array(5).fill(null),
};

function bmiFrom({ heightFt, heightIn, weightLb }) {
  const inches = (parseInt(heightFt, 10) || 0) * 12 + (parseInt(heightIn, 10) || 0);
  const lb = parseFloat(weightLb);
  if (!inches || !Number.isFinite(lb) || lb <= 0) return null;
  return (703 * lb) / (inches * inches);
}

function Choice({ value, options, onChange, scale = false }) {
  return (
    <div className={`ms-options${scale ? ' ms-options--scale' : ''}`}>
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          className="ms-option"
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Question({ label, help, children }) {
  return (
    <div className="ms-q">
      <span className="ms-q__label">{label}</span>
      {help ? <p className="ms-q__help">{help}</p> : null}
      {children}
    </div>
  );
}

const YES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export default function SinaiApp() {
  const [screen, setScreen] = useState('intro'); // intro | form | result
  const [step, setStep] = useState(0);
  const [a, setA] = useState(emptyAnswers);
  const [showErrors, setShowErrors] = useState(false);

  const set = (patch) => setA((prev) => ({ ...prev, ...patch }));
  const setAt = (field, i, value) =>
    setA((prev) => {
      const next = [...prev[field]];
      next[i] = value;
      return { ...prev, [field]: next };
    });

  const bmi = bmiFrom(a);

  const formData = useMemo(
    () => ({
      age: a.age,
      race: a.race,
      bmi,
      // The engine counts affected first-degree relatives; it does not parse
      // 'yes'/'no'. Passing the string scored identically to no family history
      // at all, silently dropping one of the strongest factors in the model.
      // The screening tool avoids this with its own FH_MAP for the same reason.
      familyHistory: a.familyHistory === 'yes' ? 1 : 0,
      brcaStatus: a.brcaStatus,
      exercise: a.exercise,
      hypertension: a.hypertension,
      hyperlipidemia: a.hyperlipidemia,
      coronaryArteryDisease: a.coronaryArteryDisease,
      diabetes: a.diabetes,
      ipss: a.ipss,
      shim: a.shim,
    }),
    [a, bmi],
  );

  const stepComplete = (i) => {
    if (i === 0) return Boolean(a.age && a.race && bmi);
    if (i === 1)
      return (
        a.familyHistory !== null &&
        a.exercise !== null &&
        COMORBIDITIES.every((c) => a[c.id] !== null)
      );
    if (i === 2) return a.ipss.every((v) => v !== null);
    if (i === 3) return a.shim.every((v) => v !== null);
    return false;
  };

  const submit = () => {
    const { errors } = validateInputs(formData, DEFAULT_CALCULATOR_CONFIG);
    if (errors.length > 0) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setScreen('result');
    window.scrollTo(0, 0);
  };

  const result = screen === 'result' ? calculateDynamicEPsa(formData) : null;

  const goto = (i) => {
    setStep(i);
    setShowErrors(false);
    window.scrollTo(0, 0);
  };

  return (
    <>
      <div className="ms-masthead">
        <div className="ms-masthead__inner">
          <p className="ms-masthead__eyebrow">Mount Sinai · Department of Urology</p>
          <p className="ms-masthead__title">e-PSA Risk Assessment</p>
        </div>
      </div>

      <main className="ms-shell">
        {screen === 'intro' && <Intro onStart={() => setScreen('form')} />}

        {screen === 'form' && (
          <>
            <div className="ms-progress">
              <div className="ms-progress__track">
                <div
                  className="ms-progress__fill"
                  style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                />
              </div>
              <div className="ms-progress__label">
                <strong>{STEPS[step]}</strong>
                <span>
                  Step {step + 1} of {STEPS.length}
                </span>
              </div>
            </div>

            <div className="ms-card">
              <h1>{STEPS[step]}</h1>

              {step === 0 && (
                <>
                  <Question label="How old are you?">
                    <input
                      type="number"
                      inputMode="numeric"
                      min="18"
                      max="120"
                      value={a.age}
                      onChange={(e) => set({ age: e.target.value })}
                      aria-label="Age in years"
                    />
                  </Question>
                  <Question label="How would you describe your race or ethnicity?">
                    <Choice
                      value={a.race}
                      options={RACE_OPTIONS}
                      onChange={(race) => set({ race })}
                    />
                  </Question>
                  <Question
                    label="Height and weight"
                    help="Used to calculate BMI, one of the factors in the model."
                  >
                    <div className="ms-inline">
                      <input
                        type="number"
                        placeholder="Feet"
                        value={a.heightFt}
                        onChange={(e) => set({ heightFt: e.target.value })}
                        aria-label="Height, feet"
                      />
                      <input
                        type="number"
                        placeholder="Inches"
                        value={a.heightIn}
                        onChange={(e) => set({ heightIn: e.target.value })}
                        aria-label="Height, inches"
                      />
                      <input
                        type="number"
                        placeholder="Pounds"
                        value={a.weightLb}
                        onChange={(e) => set({ weightLb: e.target.value })}
                        aria-label="Weight in pounds"
                      />
                    </div>
                    {bmi ? <span className="ms-bmi">BMI {bmi.toFixed(1)}</span> : null}
                  </Question>
                </>
              )}

              {step === 1 && (
                <>
                  <Question
                    label="Has a father, brother, or son been diagnosed with prostate cancer?"
                    help="Family history is one of the strongest factors in screening guidelines."
                  >
                    <Choice
                      value={a.familyHistory}
                      options={YES_NO}
                      onChange={(familyHistory) => set({ familyHistory })}
                    />
                  </Question>
                  <Question label="Do you know of a BRCA1 or BRCA2 mutation in yourself or your family?">
                    <Choice
                      value={a.brcaStatus}
                      options={[...YES_NO, { value: 'unknown', label: "Don't know" }]}
                      onChange={(brcaStatus) => set({ brcaStatus })}
                    />
                  </Question>
                  <Question label="How often do you exercise?">
                    <Choice
                      value={a.exercise}
                      options={EXERCISE_OPTIONS}
                      onChange={(exercise) => set({ exercise })}
                    />
                  </Question>
                  {COMORBIDITIES.map((c) => (
                    <Question key={c.id} label={`Have you been diagnosed with ${c.label.toLowerCase()}?`}>
                      <Choice
                        value={a[c.id]}
                        options={YES_NO}
                        onChange={(v) => set({ [c.id]: v })}
                      />
                    </Question>
                  ))}
                </>
              )}

              {step === 2 && (
                <>
                  <p className="ms-lede">
                    These seven questions make up the International Prostate Symptom Score,
                    a standard measure of urinary symptoms.
                  </p>
                  {IPSS_QUESTIONS.map((q, i) => (
                    <Question key={i} label={`${i + 1}. ${q}`}>
                      <Choice
                        scale
                        value={a.ipss[i]}
                        options={i === 6 ? IPSS_NOCTURIA_SCALE : IPSS_SCALE}
                        onChange={(v) => setAt('ipss', i, v)}
                      />
                    </Question>
                  ))}
                </>
              )}

              {step === 3 && (
                <>
                  <p className="ms-lede">
                    Sexual function is part of the assessment because it tracks with prostate
                    and vascular health. These answers stay on your device and are never sent
                    anywhere. If a question does not apply, choose &ldquo;Did not attempt.&rdquo;
                  </p>
                  {SHIM_QUESTIONS.map((q, i) => (
                    <Question key={i} label={`${i + 1}. ${q}`}>
                      <Choice
                        scale
                        value={a.shim[i]}
                        options={SHIM_SCALE}
                        onChange={(v) => setAt('shim', i, v)}
                      />
                    </Question>
                  ))}
                </>
              )}

              {showErrors && (
                <p className="ms-error" role="alert">
                  Please answer every question on this page before continuing.
                </p>
              )}

              <div className="ms-actions">
                {step > 0 && (
                  <button type="button" className="ms-btn ms-btn--ghost" onClick={() => goto(step - 1)}>
                    Back
                  </button>
                )}
                {step < STEPS.length - 1 ? (
                  <button
                    type="button"
                    className="ms-btn ms-btn--primary"
                    disabled={!stepComplete(step)}
                    onClick={() => goto(step + 1)}
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    className="ms-btn ms-btn--primary"
                    disabled={!stepComplete(step)}
                    onClick={submit}
                  >
                    See my result
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {screen === 'result' && (
          <Result
            result={result}
            onRestart={() => {
              setA(emptyAnswers);
              setStep(0);
              setScreen('intro');
              window.scrollTo(0, 0);
            }}
          />
        )}

        <Disclaimer />
        <footer className="ms-footer">
          Developed by the Urology AI Lab, Icahn School of Medicine at Mount Sinai.
          Ashutosh K. Tewari, MD, Chair, Department of Urology.
        </footer>
      </main>
    </>
  );
}

function Intro({ onStart }) {
  return (
    <div className="ms-card">
      <h1>Should you talk to your doctor about a PSA test?</h1>
      <p className="ms-lede">
        The American Urological Association recommends that men age 45 and older discuss the
        benefits and risks of prostate cancer screening with a doctor. This brief assessment,
        developed by the Mount Sinai Department of Urology, uses your personal risk factors to
        help you prepare for that conversation.
      </p>
      <ul className="ms-list">
        <li>Takes about five minutes</li>
        <li>No account, no sign-in, nothing to download</li>
        <li>Your answers stay on your device and are never transmitted</li>
      </ul>
      <div className="ms-actions">
        <button type="button" className="ms-btn ms-btn--primary" onClick={onStart}>
          Start the assessment
        </button>
      </div>
      <p className="ms-note" style={{ marginTop: 22 }}>
        If travelling to a medical center is difficult, Mount Sinai also offers screening through
        our <a href={MOBILE_UNIT_URL}>Mobile Prostate Cancer Screening Unit</a>.
      </p>
    </div>
  );
}

function Result({ result, onRestart }) {
  if (!result) {
    return (
      <div className="ms-card">
        <h1>We could not calculate a result</h1>
        <p>
          Something went wrong scoring your answers. To discuss prostate cancer screening,
          call Mount Sinai at <a href={`tel:${PHONE}`}>{PHONE}</a>.
        </p>
      </div>
    );
  }

  const tier = result.part1Tier || {};
  const recommends = Boolean(result.recommendPSA);

  // itemImpacts entries are keyed on `item` (not `label`) and include
  // zero-point and skipped factors; only the ones that actually moved the
  // score are worth showing back to a patient.
  const contributors = (Array.isArray(result.itemImpacts) ? result.itemImpacts : [])
    .filter((it) => it && it.item && !it.wasSkipped && it.points > 0)
    .sort((x, y) => y.points - x.points)
    .slice(0, 6);

  return (
    <div className="ms-card ms-result">
      <h1>Your result</h1>

      <div className="ms-result__tier">
        <p className="ms-result__eyebrow">Your assessment</p>
        <h2>{tier.label || result.risk}</h2>
        <p>{tier.description || result.action}</p>
      </div>

      <TierDial tierKey={tier.key} label={tier.label || result.risk} />

      {result.psaRecommendMessage ? <p>{result.psaRecommendMessage}</p> : null}
      {result.empiricalProbabilityText ? (
        <p className="ms-note">{result.empiricalProbabilityText}</p>
      ) : null}

      <div className="ms-result__cta">
        <h2>{recommends ? 'Next step: talk to a doctor about a PSA test' : 'Next step: keep the conversation going'}</h2>
        <p>
          {recommends
            ? 'Based on your answers, a PSA test is worth discussing. Mount Sinai urologists can walk you through what the test does and does not tell you.'
            : 'Your answers do not point to a PSA test right now, but screening decisions change with age and health. Bring this up at your next visit.'}
        </p>
        <div className="ms-actions" style={{ marginTop: 4 }}>
          <a className="ms-btn ms-btn--primary" href={APPOINTMENT_URL}>
            Request an appointment
          </a>
          <span className="ms-alt">
            or call{' '}
            <a className="ms-phone" href={`tel:${PHONE}`}>
              {PHONE}
            </a>
          </span>
        </div>
      </div>

      {contributors.length > 0 && (
        <>
          <h2>What shaped your result</h2>
          <ul className="ms-factors">
            {contributors.map((it, i) => (
              <li key={i}>
                <dt>{it.item}</dt>
                <span className="ms-factors__value">{humanizeValue(it.value)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="ms-actions">
        <button type="button" className="ms-btn ms-btn--ghost" onClick={() => window.print()}>
          Print or save this page
        </button>
        <button type="button" className="ms-btn ms-btn--ghost" onClick={onRestart}>
          Start over
        </button>
      </div>
    </div>
  );
}

/**
 * The engine's Part 1 tier ladder, low to high (PART1_TIER_DEFS in
 * @epsa/engine). Rendered as a dial rather than a bare label, because
 * "Screening Recommended" reads very differently depending on what sits
 * above and below it.
 */
const TIER_LADDER = [
  { key: 'screening_not_indicated', short: 'Not indicated', color: '#4a7c59' },
  { key: 'discussion_optional', short: 'Optional', color: '#c08a1e' },
  { key: 'discussion_advised_extended_risk', short: 'Advised', color: '#d1651f' },
  { key: 'screening_recommended', short: 'Recommended', color: '#d31f7a' },
];

const DIAL = { cx: 150, cy: 142, r: 104, thickness: 26, gapDeg: 3 };

function polar(cx, cy, r, deg) {
  const rad = ((deg - 180) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

/** Annular-sector path for one segment of the semicircular dial. */
function arcPath(startDeg, endDeg) {
  const { cx, cy, r, thickness } = DIAL;
  const rOuter = r;
  const rInner = r - thickness;
  const [x1, y1] = polar(cx, cy, rOuter, startDeg);
  const [x2, y2] = polar(cx, cy, rOuter, endDeg);
  const [x3, y3] = polar(cx, cy, rInner, endDeg);
  const [x4, y4] = polar(cx, cy, rInner, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${x1} ${y1}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4}`,
    'Z',
  ].join(' ');
}

function TierDial({ tierKey, label }) {
  const idx = TIER_LADDER.findIndex((t) => t.key === tierKey);
  if (idx < 0) return null;

  const n = TIER_LADDER.length;
  const span = 180 / n;
  const active = TIER_LADDER[idx];

  // Needle points at the middle of the active segment.
  const needleDeg = idx * span + span / 2;
  const [nx, ny] = polar(DIAL.cx, DIAL.cy, DIAL.r - DIAL.thickness - 10, needleDeg);

  return (
    <figure className="ms-dial">
      <svg viewBox="0 0 300 176" role="img" aria-label={`Result: ${label}. Level ${idx + 1} of ${n}.`}>
        {TIER_LADDER.map((t, i) => (
          <path
            key={t.key}
            d={arcPath(i * span + (i === 0 ? 0 : DIAL.gapDeg / 2), (i + 1) * span - (i === n - 1 ? 0 : DIAL.gapDeg / 2))}
            fill={t.color}
            opacity={i === idx ? 1 : 0.17}
          />
        ))}
        <line
          x1={DIAL.cx} y1={DIAL.cy} x2={nx} y2={ny}
          stroke="#1a1a24" strokeWidth="4" strokeLinecap="round"
        />
        <circle cx={DIAL.cx} cy={DIAL.cy} r="8" fill="#1a1a24" />
        <text x="14" y="170" className="ms-dial__end">Lower</text>
        <text x="286" y="170" className="ms-dial__end" textAnchor="end">Higher</text>
      </svg>
      <figcaption className="ms-dial__caption" style={{ color: active.color }}>
        {active.short}
        <span className="ms-dial__step"> · level {idx + 1} of {n}</span>
      </figcaption>
    </figure>
  );
}

/**
 * itemImpacts values are written for clinicians ("derived", "Reported").
 * Rewrite the few that read badly to a patient; pass everything else through.
 */
const VALUE_TEXT = {
  derived: 'Present',
  Reported: 'Yes',
  reported: 'Yes',
};

function humanizeValue(value) {
  return VALUE_TEXT[value] ?? value;
}

function Disclaimer() {
  return (
    <div className="ms-disclaimer">
      <strong>This tool is for education only.</strong>
      It does not diagnose prostate cancer and does not replace advice from a qualified
      clinician. No result here — high or low — rules cancer in or out. Always discuss
      screening, PSA testing, imaging, and biopsy decisions with your care team.
    </div>
  );
}
