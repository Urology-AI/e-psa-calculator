import React, { useMemo, useState } from 'react';
import Part1Results from './Part1Results.jsx';
import './QuickEPsaEntry.css';
import { calculateDynamicEPsa, validateInputs } from '../utils/dynamicCalculator';
import { useTranslation } from 'react-i18next';

// Distribute a total (0..length*maxPerItem) into `length` integer items (0..maxPerItem each).
// The engine uses totals for scoring, so exact per-item allocation is not clinically meaningful here;
// this just satisfies the model's required SHIM/IPSS array inputs.
const distributeTotalToArray = (total, length, maxPerItem) => {
  if (total === '' || total === null || total === undefined) return Array(length).fill(null);
  const parsed = Number(total);
  if (!Number.isFinite(parsed)) return Array(length).fill(null);

  const safeTotal = Math.max(0, parsed);
  const arr = Array(length).fill(0);
  let remaining = safeTotal;

  for (let i = 0; i < length; i += 1) {
    const v = Math.min(maxPerItem, remaining);
    arr[i] = v;
    remaining -= v;
    if (remaining <= 0) break;
  }

  return arr;
};

const QuickEPsaEntry = ({ calculatorConfig, onClose }) => {
  const { t } = useTranslation();
  const [showResults, setShowResults] = useState(false);
  const [preResult, setPreResult] = useState(null);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [editDefaults, setEditDefaults] = useState(false);

  // Pre-fill with the user's example values for speed.
  const [age, setAge] = useState('');
  const [race, setRace] = useState(''); // must be one of the UI options (engine normalizes)
  const [bmi, setBmi] = useState('25.49');
  const [ipssTotal, setIpssTotal] = useState('4');
  const [shimTotal, setShimTotal] = useState('25');

  // Map your "father and grandfather" to "2+ relatives".
  const [familyHistory, setFamilyHistory] = useState(2); // engine uses >0 -> 1

  // Defaults (only editable if editDefaults is enabled)
  // Required by validateInputs:
  const [exercise, setExercise] = useState(0); // 0 regular, 1 some, 2 none
  const [comorbidityScore, setComorbidityScore] = useState(0); // 0, 1, 2

  // Model factors (not required by validateInputs but used in scoring)
  const [smoking, setSmoking] = useState(0); // 0 never, 1 former, 2 current
  const [dietPattern, setDietPattern] = useState('western'); // 'western' adds points; others are less/none
  const [brcaStatus, setBrcaStatus] = useState('no'); // 'yes' adds points
  const [inflammationHistory, setInflammationHistory] = useState(0); // 1 or 'yes' adds points
  const [chemicalExposure, setChemicalExposure] = useState('no'); // 'yes' adds points

  const formData = useMemo(() => {
    const ageNum = age === '' ? '' : Number(age);
    const bmiNum = bmi === '' ? '' : Number(bmi);
    const ipssTotalNum = ipssTotal === '' ? '' : Number(ipssTotal);
    const shimTotalNum = shimTotal === '' ? '' : Number(shimTotal);

    // If totals are blank/invalid, distributeTotalToArray will produce nulls; validateInputs will catch it.
    const ipss = distributeTotalToArray(ipssTotalNum, 7, 5);
    const shim = distributeTotalToArray(shimTotalNum, 5, 5);

    return {
      age: ageNum,
      race: race || null,
      bmi: bmiNum,
      ipss,
      shim,
      exercise,
      familyHistory,

      // Not required by validateInputs, but used in scoring.
      smoking,
      chemicalExposure,
      // Treat "regular diet" as Western / standard American
      dietPattern,
      brcaStatus,
      inflammationHistory,

      comorbidityScore,
      // kept for backward compatibility/printing; not required when comorbidityScore is provided
      hypertension: null,
      hyperlipidemia: null,
      coronaryArteryDisease: null,
      diabetes: null
    };
  }, [age, bmi, ipssTotal, shimTotal, race, familyHistory, exercise, comorbidityScore]);

  const handleCalculate = () => {
    const ipssTotalNum = ipssTotal === '' ? '' : Number(ipssTotal);
    const shimTotalNum = shimTotal === '' ? '' : Number(shimTotal);
    const extraErrors = [];

    if (ipssTotalNum !== '' && (!Number.isFinite(ipssTotalNum) || ipssTotalNum < 0 || ipssTotalNum > 35)) {
      extraErrors.push(t('quickEntry.errors.ipssRange'));
    }
    if (shimTotalNum !== '' && (!Number.isFinite(shimTotalNum) || shimTotalNum < 0 || shimTotalNum > 25)) {
      extraErrors.push(t('quickEntry.errors.shimRange'));
    }

    const validation = validateInputs(formData, calculatorConfig);
    const mergedErrors = [...(validation.errors || []), ...extraErrors];
    setErrors(mergedErrors);
    setWarnings(validation.warnings || []);

    if (mergedErrors.length > 0) {
      setPreResult(null);
      setShowResults(false);
      return;
    }

    const result = calculateDynamicEPsa(formData, calculatorConfig);
    if (!result) {
      setPreResult(null);
      setShowResults(false);
      setErrors([t('quickEntry.errors.calculationFailed')]);
      setWarnings([]);
      return;
    }

    setPreResult(result);
    setShowResults(true);
  };

  const handleReset = () => {
    setShowResults(false);
    setPreResult(null);
    setErrors([]);
    setWarnings([]);
    setEditDefaults(false);

    setAge('');
    setRace('');
    setBmi('25.49');
    setIpssTotal('4');
    setShimTotal('25');
    setFamilyHistory(2);
    setExercise(0);
    setComorbidityScore(0);
    setSmoking(0);
    setDietPattern('western');
    setBrcaStatus('no');
    setInflammationHistory(0);
    setChemicalExposure('no');
  };

  return (
    <div className="quick-epsa">
      <div className="quick-epsa-card">
        <div className="quick-epsa-header">
          <div className="quick-epsa-title">{t('quickEntry.title')}</div>
          <div className="quick-epsa-subtitle">{t('quickEntry.subtitle')}</div>

          <div className="quick-epsa-actions">
            {onClose && (
              <button type="button" className="quick-epsa-close" onClick={onClose}>
                {t('quickEntry.exit')}
              </button>
            )}
          </div>
        </div>

        {showResults && preResult ? (
          <Part1Results
            result={preResult}
            formData={formData}
            storageMode="local"
            cloudAvailable={false}
            sessionId={null}
            userEmail={null}
            userPhone={null}
            onSaveToCloud={undefined}
            onEditAnswers={handleReset}
            onStartOver={handleReset}
          />
        ) : (
          <>
            <form
              className="quick-epsa-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleCalculate();
              }}
            >
              <div className="quick-row">
                <label className="quick-label">
                  {t('quickEntry.ageLabel')}
                  <input
                    className="quick-input"
                    type="number"
                    placeholder={t('quickEntry.agePlaceholder')}
                    min="18"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </label>

                <label className="quick-label">
                  {t('quickEntry.raceLabel')}
                  <select className="quick-select" value={race} onChange={(e) => setRace(e.target.value)}>
                    <option value="">{t('quickEntry.selectRace')}</option>
                    <option value="white">{t('quickEntry.race.white')}</option>
                    <option value="black">{t('quickEntry.race.black')}</option>
                    <option value="hispanic">{t('quickEntry.race.hispanic')}</option>
                    <option value="asian">{t('quickEntry.race.asian')}</option>
                    <option value="other">{t('quickEntry.race.other')}</option>
                  </select>
                </label>
              </div>

              <div className="quick-row">
                <label className="quick-label">
                  {t('quickEntry.bmiLabel')}
                  <input
                    className="quick-input"
                    type="number"
                    placeholder={t('quickEntry.bmiPlaceholder')}
                    min="0"
                    step="0.01"
                    value={bmi}
                    onChange={(e) => setBmi(e.target.value)}
                  />
                  <div className="quick-hint">{t('quickEntry.bmiHint')}</div>
                </label>

                <label className="quick-label">
                  {t('quickEntry.familyHistoryLabel')}
                  <select
                    className="quick-select"
                    value={familyHistory}
                    onChange={(e) => setFamilyHistory(Number(e.target.value))}
                  >
                    <option value={0}>{t('quickEntry.family.none')}</option>
                    <option value={1}>{t('quickEntry.family.one')}</option>
                    <option value={2}>{t('quickEntry.family.twoPlus')}</option>
                  </select>
                </label>
              </div>

              <div className="quick-row">
                <label className="quick-label">
                  {t('quickEntry.ipssLabel')}
                  <input
                    className="quick-input"
                    type="number"
                    placeholder={t('quickEntry.ipssPlaceholder')}
                    min="0"
                    max="35"
                    step="1"
                    value={ipssTotal}
                    onChange={(e) => setIpssTotal(e.target.value)}
                  />
                </label>

                <label className="quick-label">
                  {t('quickEntry.shimLabel')}
                  <input
                    className="quick-input"
                    type="number"
                    placeholder={t('quickEntry.shimPlaceholder')}
                    min="0"
                    max="25"
                    step="1"
                    value={shimTotal}
                    onChange={(e) => setShimTotal(e.target.value)}
                  />
                </label>
              </div>

              <div className="quick-advanced">
                <div className="quick-advanced-title">{t('quickEntry.defaultsTitle')}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editDefaults}
                      onChange={(e) => setEditDefaults(e.target.checked)}
                    />
                    <span>{t('quickEntry.editDefaults')}</span>
                  </label>
                </div>

                {!editDefaults ? (
                  <div className="quick-hint">
                    {t('quickEntry.defaultsHint')}
                  </div>
                ) : (
                  <>
                    <div className="quick-row">
                      <label className="quick-label">
                        {t('quickEntry.exerciseLabel')}
                        <select
                          className="quick-select"
                          value={exercise}
                          onChange={(e) => setExercise(Number(e.target.value))}
                        >
                          <option value={0}>{t('quickEntry.exercise.regular')}</option>
                          <option value={1}>{t('quickEntry.exercise.some')}</option>
                          <option value={2}>{t('quickEntry.exercise.none')}</option>
                        </select>
                      </label>

                      <label className="quick-label">
                        {t('quickEntry.comorbiditiesLabel')}
                        <select
                          className="quick-select"
                          value={comorbidityScore}
                          onChange={(e) => setComorbidityScore(Number(e.target.value))}
                        >
                          <option value={0}>{t('quickEntry.family.none')}</option>
                          <option value={1}>{t('quickEntry.comorbidities.one')}</option>
                          <option value={2}>{t('quickEntry.comorbidities.twoPlus')}</option>
                        </select>
                      </label>
                    </div>

                    <div className="quick-row">
                      <label className="quick-label">
                        {t('quickEntry.smokingLabel')}
                        <select
                          className="quick-select"
                          value={smoking}
                          onChange={(e) => setSmoking(Number(e.target.value))}
                        >
                          <option value={0}>{t('quickEntry.smoking.never')}</option>
                          <option value={1}>{t('quickEntry.smoking.former')}</option>
                          <option value={2}>{t('quickEntry.smoking.current')}</option>
                        </select>
                      </label>

                      <label className="quick-label">
                        {t('quickEntry.dietLabel')}
                        <select
                          className="quick-select"
                          value={dietPattern}
                          onChange={(e) => setDietPattern(e.target.value)}
                        >
                          <option value="western">{t('quickEntry.diet.western')}</option>
                          <option value="mediterranean">{t('quickEntry.diet.mediterranean')}</option>
                          <option value="indian">{t('quickEntry.diet.indian')}</option>
                          <option value="dash">{t('quickEntry.diet.dash')}</option>
                          <option value="plant-based">{t('quickEntry.diet.plantBased')}</option>
                          <option value="pescatarian">{t('quickEntry.diet.pescatarian')}</option>
                          <option value="low-carb-keto">{t('quickEntry.diet.lowCarbKeto')}</option>
                          <option value="other">{t('quickEntry.diet.other')}</option>
                        </select>
                      </label>
                    </div>

                    <div className="quick-row">
                      <label className="quick-label">
                        {t('quickEntry.brcaLabel')}
                        <select
                          className="quick-select"
                          value={brcaStatus}
                          onChange={(e) => setBrcaStatus(e.target.value)}
                        >
                          <option value="no">{t('part1.options.no')}</option>
                          <option value="yes">{t('part1.options.yes')}</option>
                          <option value="unknown">{t('part1.options.unknown')}</option>
                        </select>
                      </label>

                      <label className="quick-label">
                        {t('quickEntry.inflammationLabel')}
                        <select
                          className="quick-select"
                          value={inflammationHistory}
                          onChange={(e) => setInflammationHistory(Number(e.target.value))}
                        >
                          <option value={0}>{t('part1.options.no')}</option>
                          <option value={1}>{t('part1.options.yes')}</option>
                        </select>
                      </label>
                    </div>

                    <div className="quick-row">
                      <label className="quick-label">
                        {t('quickEntry.chemicalExposureLabel')}
                        <select
                          className="quick-select"
                          value={chemicalExposure}
                          onChange={(e) => setChemicalExposure(e.target.value)}
                        >
                          <option value="no">{t('part1.options.no')}</option>
                          <option value="yes">{t('part1.options.yes')}</option>
                        </select>
                      </label>

                      <div className="quick-hint" style={{ alignSelf: 'end' }}>
                        {t('quickEntry.defaultsAffectHint')}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {errors.length > 0 && (
                <div className="quick-messages quick-errors" role="alert">
                  <div className="quick-messages-title">{t('quickEntry.fixToCalculate')}</div>
                  <ul className="quick-list">
                    {errors.map((err, idx) => (
                      <li key={`${err}-${idx}`}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {warnings.length > 0 && (
                <div className="quick-messages quick-warnings">
                  <div className="quick-messages-title">{t('quickEntry.headsUp')}</div>
                  <ul className="quick-list">
                    {warnings.map((w, idx) => (
                      <li key={`${w}-${idx}`}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="quick-submit-row">
                <button className="quick-calc" type="submit">
                  {t('quickEntry.calculate')}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default QuickEPsaEntry;

