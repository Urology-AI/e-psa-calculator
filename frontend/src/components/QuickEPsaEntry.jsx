import React, { useMemo, useState } from 'react';
import Part1Results from './Part1Results.jsx';
import './QuickEPsaEntry.css';
import { calculateDynamicEPsa, validateInputs } from '../utils/dynamicCalculator';
import { useTranslation } from 'react-i18next';

const DEFAULTS = {
  bmi: '26',
  ipssTotal: '4',
  shimTotal: '22',
  familyHistory: 0,
  exercise: 0,
  comorbidityScore: 0,
  smoking: 0,
  dietPattern: 'western',
  brcaStatus: 'no',
  inflammationHistory: 0,
  chemicalExposure: 'no',
};

// Distribute a total into `length` integer items (0..maxPerItem each).
// The engine scores from totals, so per-item allocation is not clinically meaningful here.
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

const Chips = ({ value, options, onChange, ariaLabel }) => (
  <div className="qe-chips" role="radiogroup" aria-label={ariaLabel}>
    {options.map((opt) => {
      const selected = String(value) === String(opt.value);
      return (
        <button
          key={String(opt.value)}
          type="button"
          role="radio"
          aria-checked={selected}
          className={`qe-chip${selected ? ' qe-chip--selected' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

const DefaultBadge = ({ show, label }) =>
  show ? <span className="qe-default-badge" aria-label={label}>{label}</span> : null;

const QuickEPsaEntry = ({ calculatorConfig, onClose }) => {
  const { t } = useTranslation();
  const [showResults, setShowResults] = useState(false);
  const [preResult, setPreResult] = useState(null);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [useQolFallback, setUseQolFallback] = useState(false);

  // Required (no defaults)
  const [age, setAge] = useState('');
  const [race, setRace] = useState('');

  // Defaulted score modifiers
  const [bmi, setBmi] = useState(DEFAULTS.bmi);
  const [ipssTotal, setIpssTotal] = useState(DEFAULTS.ipssTotal);
  const [shimTotal, setShimTotal] = useState(DEFAULTS.shimTotal);
  const [ipssQol, setIpssQol] = useState('');
  const [familyHistory, setFamilyHistory] = useState(DEFAULTS.familyHistory);

  // Defaulted lifestyle (collapsed)
  const [exercise, setExercise] = useState(DEFAULTS.exercise);
  const [comorbidityScore, setComorbidityScore] = useState(DEFAULTS.comorbidityScore);
  const [smoking, setSmoking] = useState(DEFAULTS.smoking);
  const [dietPattern, setDietPattern] = useState(DEFAULTS.dietPattern);
  const [brcaStatus, setBrcaStatus] = useState(DEFAULTS.brcaStatus);
  const [inflammationHistory, setInflammationHistory] = useState(DEFAULTS.inflammationHistory);
  const [chemicalExposure, setChemicalExposure] = useState(DEFAULTS.chemicalExposure);

  const formData = useMemo(() => {
    const ageNum = age === '' ? '' : Number(age);
    const bmiNum = bmi === '' ? '' : Number(bmi);
    let ipssTotalNum = ipssTotal === '' ? '' : Number(ipssTotal);
    const shimTotalNum = shimTotal === '' ? '' : Number(shimTotal);

    // QoL proxy: scale 0–6 QoL into IPSS 0–30 if user left IPSS blank.
    if ((ipssTotalNum === '' || !Number.isFinite(ipssTotalNum)) && ipssQol !== '') {
      const qol = Number(ipssQol);
      if (Number.isFinite(qol) && qol >= 0 && qol <= 6) {
        ipssTotalNum = Math.round((qol / 6) * 30);
      }
    }

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
      smoking,
      chemicalExposure,
      dietPattern,
      brcaStatus,
      inflammationHistory,
      comorbidityScore,
      hypertension: null,
      hyperlipidemia: null,
      coronaryArteryDisease: null,
      diabetes: null,
    };
  }, [
    age, bmi, ipssTotal, ipssQol, shimTotal, race, familyHistory,
    exercise, comorbidityScore, smoking, dietPattern, brcaStatus,
    inflammationHistory, chemicalExposure,
  ]);

  const resetDefaults = () => {
    setBmi(DEFAULTS.bmi);
    setIpssTotal(DEFAULTS.ipssTotal);
    setShimTotal(DEFAULTS.shimTotal);
    setIpssQol('');
    setFamilyHistory(DEFAULTS.familyHistory);
    setExercise(DEFAULTS.exercise);
    setComorbidityScore(DEFAULTS.comorbidityScore);
    setSmoking(DEFAULTS.smoking);
    setDietPattern(DEFAULTS.dietPattern);
    setBrcaStatus(DEFAULTS.brcaStatus);
    setInflammationHistory(DEFAULTS.inflammationHistory);
    setChemicalExposure(DEFAULTS.chemicalExposure);
    setUseQolFallback(false);
  };

  const handlePrefillFromJsonFile = async (file) => {
    setUploading(true);
    setErrors([]);
    setWarnings([]);
    setShowResults(false);
    setPreResult(null);

    try {
      const name = (file?.name || '').toLowerCase();
      const isJson = file?.type === 'application/json' || name.endsWith('.json');
      if (!isJson) {
        setErrors([t('dataImport.errors.uploadJsonOnly')]);
        return;
      }

      const text = await file.text();
      const parsed = JSON.parse(text);
      const imported = parsed?.formData ?? parsed?.part1Data ?? parsed?.data ?? parsed;
      if (!imported || typeof imported !== 'object') {
        setErrors([t('dataImport.errors.importFailed')]);
        return;
      }

      const num = (v, fallback = '') =>
        v === '' || v === null || v === undefined ? fallback : Number(v);
      const yes = (v) => v === true || v === 'yes' || v === 'Yes' || v === 1 || v === '1';

      const ageNum = num(imported.age);
      const bmiNum = num(imported.bmi);
      const ipssArray = Array.isArray(imported.ipss) ? imported.ipss : null;
      const shimArray = Array.isArray(imported.shim) ? imported.shim : null;
      const ipssTotalNum = ipssArray
        ? ipssArray.reduce((s, v) => s + (v === null || v === undefined || v === '' ? 0 : Number(v) || 0), 0)
        : Number(imported.ipssTotal);
      const shimTotalNum = shimArray
        ? shimArray.reduce((s, v) => s + (v === null || v === undefined || v === '' ? 0 : Number(v) || 0), 0)
        : Number(imported.shimTotal);
      const safeIpss = Number.isFinite(ipssTotalNum) ? ipssTotalNum : '';
      const safeShim = Number.isFinite(shimTotalNum) ? shimTotalNum : '';
      const fhRaw = imported.familyHistory;
      const familyHistoryNum =
        fhRaw === 'unknown' ? 'unknown'
          : fhRaw === null || fhRaw === undefined ? DEFAULTS.familyHistory
          : Number(fhRaw);
      const exerciseNum = num(imported.exercise, DEFAULTS.exercise);

      let comorbidity = imported.comorbidityScore;
      if (comorbidity === null || comorbidity === undefined) {
        const flags = [imported.hypertension, imported.hyperlipidemia, imported.coronaryArteryDisease, imported.diabetes];
        const n = flags.filter(yes).length;
        comorbidity = n >= 2 ? 2 : n;
      }
      const comorbidityNum = comorbidity === '' || comorbidity === null || comorbidity === undefined
        ? DEFAULTS.comorbidityScore
        : Math.min(2, Math.max(0, Number(comorbidity)));

      const smokingNum = num(imported.smoking, DEFAULTS.smoking);
      const diet = typeof imported.dietPattern === 'string' && imported.dietPattern !== ''
        ? imported.dietPattern
        : DEFAULTS.dietPattern;

      const mapBrca = (v) => {
        if (yes(v)) return 'yes';
        if (v === false || v === 'no' || v === 'No' || v === 0 || v === '0') return 'no';
        if (v === 'unknown' || v === 'Unknown') return 'unknown';
        return v === null || v === undefined || v === '' ? DEFAULTS.brcaStatus : String(v);
      };
      const mappedBrca = mapBrca(imported.brcaStatus);
      const mappedInflammation = imported.inflammationHistory === null || imported.inflammationHistory === undefined
        ? DEFAULTS.inflammationHistory
        : (Number(imported.inflammationHistory) ? 1 : 0);
      const chem = imported.chemicalExposure;
      const mappedChem = yes(chem)
        ? 'yes'
        : (chem === 'unknown' || chem === 'Unknown') ? 'unknown' : DEFAULTS.chemicalExposure;

      const raceStr = typeof imported.race === 'string' ? imported.race : '';

      setAge(ageNum === '' ? '' : String(ageNum));
      setRace(raceStr);
      setBmi(bmiNum === '' ? '' : String(bmiNum));
      setIpssTotal(safeIpss === '' ? '' : String(safeIpss));
      setShimTotal(safeShim === '' ? '' : String(safeShim));
      setFamilyHistory(familyHistoryNum === 'unknown' ? 'unknown' : Number.isFinite(familyHistoryNum) ? familyHistoryNum : DEFAULTS.familyHistory);
      setExercise(Number.isFinite(exerciseNum) ? exerciseNum : DEFAULTS.exercise);
      setComorbidityScore(comorbidityNum);
      setSmoking(Number.isFinite(smokingNum) ? smokingNum : DEFAULTS.smoking);
      setDietPattern(diet);
      setBrcaStatus(['yes', 'no', 'unknown'].includes(mappedBrca) ? mappedBrca : DEFAULTS.brcaStatus);
      setInflammationHistory(mappedInflammation);
      setChemicalExposure(mappedChem);

      const localFormData = {
        age: ageNum === '' ? '' : ageNum,
        race: raceStr || null,
        bmi: bmiNum === '' ? '' : bmiNum,
        ipss: distributeTotalToArray(safeIpss, 7, 5),
        shim: distributeTotalToArray(safeShim, 5, 5),
        exercise: Number.isFinite(exerciseNum) ? exerciseNum : DEFAULTS.exercise,
        familyHistory: familyHistoryNum === 'unknown' ? 'unknown' : Number.isFinite(familyHistoryNum) ? familyHistoryNum : DEFAULTS.familyHistory,
        smoking: Number.isFinite(smokingNum) ? smokingNum : DEFAULTS.smoking,
        chemicalExposure: mappedChem,
        dietPattern: diet,
        brcaStatus: mappedBrca,
        inflammationHistory: mappedInflammation,
        comorbidityScore: comorbidityNum,
        hypertension: null, hyperlipidemia: null, coronaryArteryDisease: null, diabetes: null,
      };

      const extraErrors = [];
      if (safeIpss !== '' && (!Number.isFinite(safeIpss) || safeIpss < 0 || safeIpss > 35)) {
        extraErrors.push(t('quickEntry.errors.ipssRange'));
      }
      if (safeShim !== '' && (!Number.isFinite(safeShim) || safeShim < 0 || safeShim > 25)) {
        extraErrors.push(t('quickEntry.errors.shimRange'));
      }

      const validation = validateInputs(localFormData, calculatorConfig);
      const mergedErrors = [...(validation.errors || []), ...extraErrors];
      setWarnings(validation.warnings || []);
      setErrors(mergedErrors);
      if (mergedErrors.length > 0) {
        setPreResult(null);
        setShowResults(false);
        return;
      }
      const result = calculateDynamicEPsa(localFormData, calculatorConfig);
      if (!result) {
        setPreResult(null);
        setShowResults(false);
        setErrors([t('quickEntry.errors.calculationFailed')]);
        setWarnings([]);
        return;
      }
      setPreResult(result);
      setShowResults(true);
    } catch (err) {
      setErrors([err?.message || t('dataImport.errors.importFailed')]);
      setWarnings([]);
      setPreResult(null);
      setShowResults(false);
    } finally {
      setUploading(false);
    }
  };

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

  const handleResetAll = () => {
    setShowResults(false);
    setPreResult(null);
    setErrors([]);
    setWarnings([]);
    setAge('');
    setRace('');
    resetDefaults();
  };

  // Default-tracking helpers (one place so layout stays clean)
  const isDefault = {
    bmi: String(bmi) === String(DEFAULTS.bmi),
    ipss: String(ipssTotal) === String(DEFAULTS.ipssTotal),
    shim: String(shimTotal) === String(DEFAULTS.shimTotal),
    family: String(familyHistory) === String(DEFAULTS.familyHistory),
    exercise: String(exercise) === String(DEFAULTS.exercise),
    comorbid: String(comorbidityScore) === String(DEFAULTS.comorbidityScore),
    smoking: String(smoking) === String(DEFAULTS.smoking),
    diet: dietPattern === DEFAULTS.dietPattern,
    brca: brcaStatus === DEFAULTS.brcaStatus,
    inflam: String(inflammationHistory) === String(DEFAULTS.inflammationHistory),
    chem: chemicalExposure === DEFAULTS.chemicalExposure,
  };
  const defaultLabel = t('quickEntry.usingDefault');

  return (
    <div className="quick-epsa">
      <div className="quick-epsa-card">
        <div className="quick-epsa-header">
          <div>
            <div className="quick-epsa-title">{t('quickEntry.title')}</div>
            <div className="quick-epsa-subtitle">{t('quickEntry.subtitle')}</div>
          </div>
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
            onEditAnswers={handleResetAll}
            onStartOver={handleResetAll}
          />
        ) : (
          <form
            className="quick-epsa-form"
            onSubmit={(e) => { e.preventDefault(); handleCalculate(); }}
          >
            <div className="quick-upload">
              <div className="quick-upload-title">{t('dataImport.uploadJsonData')}</div>
              <div className="quick-upload-desc">{t('dataImport.uploadDescription')}</div>
              <input
                type="file"
                id="quick-prefill-json"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePrefillFromJsonFile(file);
                  e.target.value = '';
                }}
              />
              <label htmlFor="quick-prefill-json" className="quick-upload-btn" role="button" tabIndex={0}>
                {uploading ? t('dataImport.importing') : t('dataImport.chooseJson')}
              </label>
            </div>

            {/* ── Section 1: Required ── */}
            <fieldset className="qe-section qe-section--required">
              <legend className="qe-section-legend">
                {t('quickEntry.requiredLegend')} <span className="qe-required-mark" aria-hidden="true">*</span>
              </legend>
              <div className="quick-row">
                <label className="quick-label">
                  <span className="qe-label-row">
                    {t('quickEntry.ageLabel')} <span className="qe-required-mark" aria-hidden="true">*</span>
                  </span>
                  <input
                    className="quick-input"
                    type="number"
                    placeholder={t('quickEntry.agePlaceholder')}
                    min="18"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    required
                  />
                </label>
                <label className="quick-label">
                  <span className="qe-label-row">
                    {t('quickEntry.raceLabel')} <span className="qe-required-mark" aria-hidden="true">*</span>
                  </span>
                  <select className="quick-select" value={race} onChange={(e) => setRace(e.target.value)} required>
                    <option value="">{t('quickEntry.selectRace')}</option>
                    <option value="white">{t('quickEntry.race.white')}</option>
                    <option value="black">{t('quickEntry.race.black')}</option>
                    <option value="hispanic">{t('quickEntry.race.hispanic')}</option>
                    <option value="asian">{t('quickEntry.race.asian')}</option>
                    <option value="other">{t('quickEntry.race.other')}</option>
                  </select>
                </label>
              </div>
            </fieldset>

            {/* ── Section 2: Score modifiers (defaulted, visible) ── */}
            <fieldset className="qe-section">
              <legend className="qe-section-legend">
                {t('quickEntry.scoreModifiers')}
                <button type="button" className="qe-reset-link" onClick={resetDefaults}>
                  {t('quickEntry.resetDefaults')}
                </button>
              </legend>

              <div className="quick-row">
                <label className="quick-label">
                  <span className="qe-label-row">
                    {t('quickEntry.bmiLabel')}
                    <DefaultBadge show={isDefault.bmi} label={defaultLabel} />
                  </span>
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
                  <span className="qe-label-row">
                    {t('quickEntry.familyHistoryLabel')}
                    <DefaultBadge show={isDefault.family} label={defaultLabel} />
                  </span>
                  <Chips
                    ariaLabel={t('quickEntry.familyHistoryLabel')}
                    value={familyHistory}
                    onChange={(v) => setFamilyHistory(v === 'unknown' ? 'unknown' : Number(v))}
                    options={[
                      { value: 0, label: t('quickEntry.family.none') },
                      { value: 1, label: t('quickEntry.family.one') },
                      { value: 2, label: t('quickEntry.family.twoPlus') },
                      { value: 'unknown', label: t('quickEntry.family.unknown') },
                    ]}
                  />
                  <div className="quick-hint">{t('quickEntry.familyHistoryHint')}</div>
                </label>
              </div>

              <div className="quick-row">
                {!useQolFallback ? (
                  <label className="quick-label">
                    <span className="qe-label-row">
                      {t('quickEntry.ipssLabel')}
                      <DefaultBadge show={isDefault.ipss} label={defaultLabel} />
                    </span>
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
                    <button
                      type="button"
                      className="qe-link"
                      onClick={() => { setIpssTotal(''); setUseQolFallback(true); }}
                    >
                      {t('quickEntry.iDontKnow')}
                    </button>
                  </label>
                ) : (
                  <label className="quick-label">
                    <span className="qe-label-row">{t('quickEntry.ipssQolLabel')}</span>
                    <select
                      className="quick-select"
                      value={ipssQol}
                      onChange={(e) => setIpssQol(e.target.value)}
                    >
                      <option value="">{t('quickEntry.ipssQolPlaceholder')}</option>
                      <option value="0">0 — {t('quickEntry.ipssQol.delighted')}</option>
                      <option value="1">1 — {t('quickEntry.ipssQol.pleased')}</option>
                      <option value="2">2 — {t('quickEntry.ipssQol.mostlySatisfied')}</option>
                      <option value="3">3 — {t('quickEntry.ipssQol.mixed')}</option>
                      <option value="4">4 — {t('quickEntry.ipssQol.mostlyDissatisfied')}</option>
                      <option value="5">5 — {t('quickEntry.ipssQol.unhappy')}</option>
                      <option value="6">6 — {t('quickEntry.ipssQol.terrible')}</option>
                    </select>
                    <button
                      type="button"
                      className="qe-link"
                      onClick={() => { setIpssQol(''); setUseQolFallback(false); setIpssTotal(DEFAULTS.ipssTotal); }}
                    >
                      {t('quickEntry.iDontKnowHide')}
                    </button>
                  </label>
                )}

                <label className="quick-label">
                  <span className="qe-label-row">
                    {t('quickEntry.shimLabel')}
                    <DefaultBadge show={isDefault.shim} label={defaultLabel} />
                  </span>
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
            </fieldset>

            {/* ── Section 3: Lifestyle & history (collapsed by default) ── */}
            <details className="qe-section qe-details">
              <summary className="qe-section-legend qe-details-summary">
                {t('quickEntry.advanced')}
                <span className="qe-details-hint">{t('quickEntry.advancedHint')}</span>
              </summary>

              <div className="quick-row">
                <label className="quick-label">
                  <span className="qe-label-row">
                    {t('quickEntry.exerciseLabel')}
                    <DefaultBadge show={isDefault.exercise} label={defaultLabel} />
                  </span>
                  <Chips
                    ariaLabel={t('quickEntry.exerciseLabel')}
                    value={exercise}
                    onChange={(v) => setExercise(Number(v))}
                    options={[
                      { value: 0, label: t('quickEntry.exercise.regular') },
                      { value: 1, label: t('quickEntry.exercise.some') },
                      { value: 2, label: t('quickEntry.exercise.none') },
                    ]}
                  />
                </label>

                <label className="quick-label">
                  <span className="qe-label-row">
                    {t('quickEntry.comorbiditiesLabel')}
                    <DefaultBadge show={isDefault.comorbid} label={defaultLabel} />
                  </span>
                  <Chips
                    ariaLabel={t('quickEntry.comorbiditiesLabel')}
                    value={comorbidityScore}
                    onChange={(v) => setComorbidityScore(Number(v))}
                    options={[
                      { value: 0, label: t('quickEntry.family.none') },
                      { value: 1, label: t('quickEntry.comorbidities.one') },
                      { value: 2, label: t('quickEntry.comorbidities.twoPlus') },
                    ]}
                  />
                </label>
              </div>

              <div className="quick-row">
                <label className="quick-label">
                  <span className="qe-label-row">
                    {t('quickEntry.smokingLabel')}
                    <DefaultBadge show={isDefault.smoking} label={defaultLabel} />
                  </span>
                  <Chips
                    ariaLabel={t('quickEntry.smokingLabel')}
                    value={smoking}
                    onChange={(v) => setSmoking(Number(v))}
                    options={[
                      { value: 0, label: t('quickEntry.smoking.never') },
                      { value: 1, label: t('quickEntry.smoking.former') },
                      { value: 2, label: t('quickEntry.smoking.current') },
                    ]}
                  />
                </label>

                <label className="quick-label">
                  <span className="qe-label-row">
                    {t('quickEntry.dietLabel')}
                    <DefaultBadge show={isDefault.diet} label={defaultLabel} />
                  </span>
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
                  <span className="qe-label-row">
                    {t('quickEntry.brcaLabel')}
                    <DefaultBadge show={isDefault.brca} label={defaultLabel} />
                  </span>
                  <Chips
                    ariaLabel={t('quickEntry.brcaLabel')}
                    value={brcaStatus}
                    onChange={(v) => setBrcaStatus(v)}
                    options={[
                      { value: 'no', label: t('part1.options.no') },
                      { value: 'yes', label: t('part1.options.yes') },
                      { value: 'unknown', label: t('part1.options.unknown') },
                    ]}
                  />
                </label>

                <label className="quick-label">
                  <span className="qe-label-row">
                    {t('quickEntry.inflammationLabel')}
                    <DefaultBadge show={isDefault.inflam} label={defaultLabel} />
                  </span>
                  <Chips
                    ariaLabel={t('quickEntry.inflammationLabel')}
                    value={inflammationHistory}
                    onChange={(v) => setInflammationHistory(Number(v))}
                    options={[
                      { value: 0, label: t('part1.options.no') },
                      { value: 1, label: t('part1.options.yes') },
                    ]}
                  />
                </label>
              </div>

              <div className="quick-row">
                <label className="quick-label">
                  <span className="qe-label-row">
                    {t('quickEntry.chemicalExposureLabel')}
                    <DefaultBadge show={isDefault.chem} label={defaultLabel} />
                  </span>
                  <Chips
                    ariaLabel={t('quickEntry.chemicalExposureLabel')}
                    value={chemicalExposure}
                    onChange={(v) => setChemicalExposure(v)}
                    options={[
                      { value: 'no', label: t('part1.options.no') },
                      { value: 'yes', label: t('part1.options.yes') },
                    ]}
                  />
                </label>
                <div className="quick-hint" style={{ alignSelf: 'end' }}>
                  {t('quickEntry.defaultsAffectHint')}
                </div>
              </div>
            </details>

            {errors.length > 0 && (
              <div className="quick-messages quick-errors" role="alert">
                <div className="quick-messages-title">{t('quickEntry.fixToCalculate')}</div>
                <ul className="quick-list">
                  {errors.map((err, idx) => <li key={`${err}-${idx}`}>{err}</li>)}
                </ul>
              </div>
            )}

            {warnings.length > 0 && (
              <div className="quick-messages quick-warnings">
                <div className="quick-messages-title">{t('quickEntry.headsUp')}</div>
                <ul className="quick-list">
                  {warnings.map((w, idx) => <li key={`${w}-${idx}`}>{w}</li>)}
                </ul>
              </div>
            )}

            <div className="quick-submit-row">
              <button className="quick-calc" type="submit">{t('quickEntry.calculate')}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default QuickEPsaEntry;
