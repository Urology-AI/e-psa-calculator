import React, { useMemo, useState } from 'react';
import Part1Results from './Part1Results.jsx';
import InfoIcon from './InfoIcon.jsx';
import { fieldReferences } from '../utils/fieldReferences';
import './QuickEPsaEntry.css';
import { calculateDynamicEPsa, validateInputs } from '../utils/dynamicCalculator';
import { useTranslation } from 'react-i18next';
import { ZapIcon, UploadIcon, RotateCcwIcon, ChevronDownIcon, AlertCircleIcon, AlertTriangleIcon } from 'lucide-react';

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

const FieldRow = ({ label, info, badge, hint, children, required }) => (
  <div className="qe-field">
    <div className="qe-field-label">
      <span className="qe-field-label-text">
        {label}
        {required && <span className="qe-required-mark" aria-hidden="true"> *</span>}
      </span>
      {badge && <span className="qe-default-badge">{badge}</span>}
      {info && <InfoIcon {...info} />}
    </div>
    {children}
    {hint && <div className="qe-hint">{hint}</div>}
  </div>
);

const QuickEPsaEntry = ({ calculatorConfig, onClose }) => {
  const { t } = useTranslation();
  const [showResults, setShowResults] = useState(false);
  const [preResult, setPreResult] = useState(null);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [useQolFallback, setUseQolFallback] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [age, setAge] = useState('');
  const [race, setRace] = useState('');
  const [bmi, setBmi] = useState(DEFAULTS.bmi);
  const [ipssTotal, setIpssTotal] = useState(DEFAULTS.ipssTotal);
  const [shimTotal, setShimTotal] = useState(DEFAULTS.shimTotal);
  const [ipssQol, setIpssQol] = useState('');
  const [familyHistory, setFamilyHistory] = useState(DEFAULTS.familyHistory);
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

    if ((ipssTotalNum === '' || !Number.isFinite(ipssTotalNum)) && ipssQol !== '') {
      const qol = Number(ipssQol);
      if (Number.isFinite(qol) && qol >= 0 && qol <= 6) {
        ipssTotalNum = Math.round((qol / 6) * 30);
      }
    }

    return {
      age: ageNum,
      race: race || null,
      bmi: bmiNum,
      ipss: distributeTotalToArray(ipssTotalNum, 7, 5),
      shim: distributeTotalToArray(shimTotalNum, 5, 5),
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
  }, [age, bmi, ipssTotal, ipssQol, shimTotal, race, familyHistory,
      exercise, comorbidityScore, smoking, dietPattern, brcaStatus,
      inflammationHistory, chemicalExposure]);

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
      if (!isJson) { setErrors([t('dataImport.errors.uploadJsonOnly')]); return; }

      const text = await file.text();
      const parsed = JSON.parse(text);
      const imported = parsed?.formData ?? parsed?.part1Data ?? parsed?.data ?? parsed;
      if (!imported || typeof imported !== 'object') { setErrors([t('dataImport.errors.importFailed')]); return; }

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
        ? imported.dietPattern : DEFAULTS.dietPattern;

      const mapBrca = (v) => {
        if (yes(v)) return 'yes';
        if (v === false || v === 'no' || v === 'No' || v === 0 || v === '0') return 'no';
        if (v === 'unknown' || v === 'Unknown') return 'unknown';
        return v === null || v === undefined || v === '' ? DEFAULTS.brcaStatus : String(v);
      };
      const mappedBrca = mapBrca(imported.brcaStatus);
      const mappedInflammation = imported.inflammationHistory === null || imported.inflammationHistory === undefined
        ? DEFAULTS.inflammationHistory : (Number(imported.inflammationHistory) ? 1 : 0);
      const chem = imported.chemicalExposure;
      const mappedChem = yes(chem) ? 'yes'
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
        age: ageNum === '' ? '' : ageNum, race: raceStr || null, bmi: bmiNum === '' ? '' : bmiNum,
        ipss: distributeTotalToArray(safeIpss, 7, 5), shim: distributeTotalToArray(safeShim, 5, 5),
        exercise: Number.isFinite(exerciseNum) ? exerciseNum : DEFAULTS.exercise,
        familyHistory: familyHistoryNum === 'unknown' ? 'unknown' : Number.isFinite(familyHistoryNum) ? familyHistoryNum : DEFAULTS.familyHistory,
        smoking: Number.isFinite(smokingNum) ? smokingNum : DEFAULTS.smoking,
        chemicalExposure: mappedChem, dietPattern: diet, brcaStatus: mappedBrca,
        inflammationHistory: mappedInflammation, comorbidityScore: comorbidityNum,
        hypertension: null, hyperlipidemia: null, coronaryArteryDisease: null, diabetes: null,
      };

      const extraErrors = [];
      if (safeIpss !== '' && (!Number.isFinite(safeIpss) || safeIpss < 0 || safeIpss > 35)) extraErrors.push(t('quickEntry.errors.ipssRange'));
      if (safeShim !== '' && (!Number.isFinite(safeShim) || safeShim < 0 || safeShim > 25)) extraErrors.push(t('quickEntry.errors.shimRange'));

      const validation = validateInputs(localFormData, calculatorConfig);
      const mergedErrors = [...(validation.errors || []), ...extraErrors];
      setWarnings(validation.warnings || []);
      setErrors(mergedErrors);
      if (mergedErrors.length > 0) { setPreResult(null); setShowResults(false); return; }
      const result = calculateDynamicEPsa(localFormData, calculatorConfig);
      if (!result) { setPreResult(null); setShowResults(false); setErrors([t('quickEntry.errors.calculationFailed')]); setWarnings([]); return; }
      setPreResult(result);
      setShowResults(true);
    } catch (err) {
      setErrors([err?.message || t('dataImport.errors.importFailed')]);
      setWarnings([]); setPreResult(null); setShowResults(false);
    } finally {
      setUploading(false);
    }
  };

  const handleCalculate = () => {
    const ipssTotalNum = ipssTotal === '' ? '' : Number(ipssTotal);
    const shimTotalNum = shimTotal === '' ? '' : Number(shimTotal);
    const extraErrors = [];
    if (ipssTotalNum !== '' && (!Number.isFinite(ipssTotalNum) || ipssTotalNum < 0 || ipssTotalNum > 35)) extraErrors.push(t('quickEntry.errors.ipssRange'));
    if (shimTotalNum !== '' && (!Number.isFinite(shimTotalNum) || shimTotalNum < 0 || shimTotalNum > 25)) extraErrors.push(t('quickEntry.errors.shimRange'));
    const validation = validateInputs(formData, calculatorConfig);
    const mergedErrors = [...(validation.errors || []), ...extraErrors];
    setErrors(mergedErrors);
    setWarnings(validation.warnings || []);
    if (mergedErrors.length > 0) { setPreResult(null); setShowResults(false); return; }
    const result = calculateDynamicEPsa(formData, calculatorConfig);
    if (!result) { setPreResult(null); setShowResults(false); setErrors([t('quickEntry.errors.calculationFailed')]); setWarnings([]); return; }
    setPreResult(result);
    setShowResults(true);
  };

  const handleResetAll = () => {
    setShowResults(false); setPreResult(null); setErrors([]); setWarnings([]);
    setAge(''); setRace(''); resetDefaults();
  };

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

  if (showResults && preResult) {
    return (
      <div className="qe-results-wrapper">
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
      </div>
    );
  }

  return (
    <div className="qe-root">
      {/* ── Header ── */}
      <div className="qe-header">
        <div className="qe-header-left">
          <ZapIcon size={18} className="qe-header-icon" aria-hidden="true" />
          <div>
            <div className="qe-header-title">{t('quickEntry.title')}</div>
            <div className="qe-header-subtitle">{t('quickEntry.subtitle')}</div>
          </div>
        </div>
        {onClose && (
          <button type="button" className="qe-exit-btn" onClick={onClose}>
            {t('quickEntry.exit')}
          </button>
        )}
      </div>

      <form className="qe-form" onSubmit={(e) => { e.preventDefault(); handleCalculate(); }}>

        {/* ── JSON import strip ── */}
        <div className="qe-import-strip">
          <div className="qe-import-left">
            <UploadIcon size={14} className="qe-import-icon" aria-hidden="true" />
            <div>
              <div className="qe-import-title">{t('dataImport.uploadJsonData')}</div>
              <div className="qe-import-desc">{t('dataImport.uploadDescription')}</div>
            </div>
          </div>
          <input
            type="file" id="qe-json-input" accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePrefillFromJsonFile(f); e.target.value = ''; }}
          />
          <label htmlFor="qe-json-input" className="qe-import-btn" role="button" tabIndex={0}>
            {uploading ? t('dataImport.importing') : t('dataImport.chooseJson')}
          </label>
        </div>

        {/* ── Section A: Required ── */}
        <div className="qe-section">
          <div className="qe-section-header qe-section-header--required">
            <span className="qe-section-title">{t('quickEntry.requiredLegend')}</span>
            <span className="qe-aua-badge">AUA/SUO 2026</span>
          </div>
          <div className="qe-grid-2">
            <FieldRow
              label={t('part1.fields.age.title')}
              info={fieldReferences.age}
              required
            >
              <input
                className="qe-input" type="number"
                placeholder={t('part1.fields.age.placeholder')}
                min="18" max="120"
                value={age} onChange={(e) => setAge(e.target.value)} required
              />
              <div className="qe-hint">{t('part1.fields.age.helper')}</div>
            </FieldRow>

            <FieldRow
              label={t('part1.fields.race.title')}
              info={fieldReferences.race}
              required
            >
              <select className="qe-select" value={race} onChange={(e) => setRace(e.target.value)} required>
                <option value="">{t('part1.fields.race.selectPlaceholder')}</option>
                <option value="white">{t('part1.race.white')}</option>
                <option value="black">{t('part1.race.black')}</option>
                <option value="hispanic">{t('part1.race.hispanic')}</option>
                <option value="asian">{t('part1.race.asian')}</option>
                <option value="other">{t('part1.race.other')}</option>
              </select>
            </FieldRow>
          </div>
        </div>

        {/* ── Section B: Score modifiers ── */}
        <div className="qe-section">
          <div className="qe-section-header qe-section-header--modifiers">
            <span className="qe-section-title">{t('quickEntry.scoreModifiers')}</span>
            <button type="button" className="qe-reset-link" onClick={resetDefaults}>
              <RotateCcwIcon size={11} aria-hidden="true" />
              {t('quickEntry.resetDefaults')}
            </button>
          </div>

          <div className="qe-grid-2">
            <FieldRow
              label={t('part1.fields.heightWeight.title')}
              info={fieldReferences.heightWeight}
              badge={isDefault.bmi ? defaultLabel : null}
              hint={t('part1.step2.weightHelper')}
            >
              <input
                className="qe-input" type="number"
                placeholder={t('part1.step2.bmiLabel')}
                min="0" step="0.01"
                value={bmi} onChange={(e) => setBmi(e.target.value)}
              />
            </FieldRow>

            <FieldRow
              label={t('part1.step1.familyHistory.title')}
              info={fieldReferences.familyHistory}
              badge={isDefault.family ? defaultLabel : null}
              hint={t('part1.fields.familyHistory.helper')}
            >
              <Chips
                ariaLabel={t('part1.step1.familyHistory.title')}
                value={familyHistory}
                onChange={(v) => setFamilyHistory(v === 'unknown' ? 'unknown' : Number(v))}
                options={[
                  { value: 0, label: t('quickEntry.family.none') },
                  { value: 1, label: t('quickEntry.family.one') },
                  { value: 2, label: t('quickEntry.family.twoPlus') },
                  { value: 'unknown', label: t('part1.options.unknown') },
                ]}
              />
            </FieldRow>
          </div>

          <div className="qe-grid-2">
            {!useQolFallback ? (
              <FieldRow
                label={t('part1.steps.ipss.sectionTitle')}
                info={fieldReferences.ipss}
                badge={isDefault.ipss ? defaultLabel : null}
              >
                <input
                  className="qe-input" type="number"
                  placeholder={t('part1.ipss.totalLabel')}
                  min="0" max="35" step="1"
                  value={ipssTotal} onChange={(e) => setIpssTotal(e.target.value)}
                />
                <button type="button" className="qe-link"
                  onClick={() => { setIpssTotal(''); setUseQolFallback(true); }}>
                  {t('quickEntry.iDontKnow')}
                </button>
              </FieldRow>
            ) : (
              <FieldRow label={t('quickEntry.ipssQolLabel')}>
                <select className="qe-select" value={ipssQol} onChange={(e) => setIpssQol(e.target.value)}>
                  <option value="">{t('quickEntry.ipssQolPlaceholder')}</option>
                  <option value="0">0 — {t('quickEntry.ipssQol.delighted')}</option>
                  <option value="1">1 — {t('quickEntry.ipssQol.pleased')}</option>
                  <option value="2">2 — {t('quickEntry.ipssQol.mostlySatisfied')}</option>
                  <option value="3">3 — {t('quickEntry.ipssQol.mixed')}</option>
                  <option value="4">4 — {t('quickEntry.ipssQol.mostlyDissatisfied')}</option>
                  <option value="5">5 — {t('quickEntry.ipssQol.unhappy')}</option>
                  <option value="6">6 — {t('quickEntry.ipssQol.terrible')}</option>
                </select>
                <button type="button" className="qe-link"
                  onClick={() => { setIpssQol(''); setUseQolFallback(false); setIpssTotal(DEFAULTS.ipssTotal); }}>
                  {t('quickEntry.iDontKnowHide')}
                </button>
              </FieldRow>
            )}

            <FieldRow
              label={t('part1.fields.shim.title')}
              info={fieldReferences.shim}
              badge={isDefault.shim ? defaultLabel : null}
            >
              <input
                className="qe-input" type="number"
                placeholder={t('part1.shim.totalLabel')}
                min="0" max="25" step="1"
                value={shimTotal} onChange={(e) => setShimTotal(e.target.value)}
              />
            </FieldRow>
          </div>
        </div>

        {/* ── Section C: Lifestyle & history (collapsible) ── */}
        <div className="qe-section qe-section--collapsible">
          <button
            type="button"
            className="qe-section-header qe-section-toggle"
            onClick={() => setAdvancedOpen((o) => !o)}
            aria-expanded={advancedOpen}
          >
            <span className="qe-section-title">{t('quickEntry.advanced')}</span>
            <span className="qe-section-toggle-right">
              <span className="qe-details-hint">{t('quickEntry.advancedHint')}</span>
              <ChevronDownIcon
                size={16}
                className={`qe-chevron${advancedOpen ? ' qe-chevron--open' : ''}`}
                aria-hidden="true"
              />
            </span>
          </button>

          {advancedOpen && (
            <div className="qe-advanced-body">
              <div className="qe-grid-2">
                <FieldRow
                  label={t('part1.fields.exercise.title')}
                  info={fieldReferences.exercise}
                  badge={isDefault.exercise ? defaultLabel : null}
                  hint={t('part1.fields.exercise.helper')}
                >
                  <Chips
                    ariaLabel={t('part1.fields.exercise.title')}
                    value={exercise}
                    onChange={(v) => setExercise(Number(v))}
                    options={[
                      { value: 0, label: t('part1.step3.exercise.regular') },
                      { value: 1, label: t('part1.step3.exercise.some') },
                      { value: 2, label: t('part1.step3.exercise.none') },
                    ]}
                  />
                </FieldRow>

                <FieldRow
                  label={t('part1.fields.comorbidities.title')}
                  info={fieldReferences.comorbidities}
                  badge={isDefault.comorbid ? defaultLabel : null}
                >
                  <Chips
                    ariaLabel={t('part1.fields.comorbidities.title')}
                    value={comorbidityScore}
                    onChange={(v) => setComorbidityScore(Number(v))}
                    options={[
                      { value: 0, label: t('part1.options.no') },
                      { value: 1, label: t('part1.step4.comorbidities.one') },
                      { value: 2, label: t('part1.step4.comorbidities.twoOrMore') },
                    ]}
                  />
                </FieldRow>
              </div>

              <div className="qe-grid-2">
                <FieldRow
                  label={t('part1.fields.smoking.title')}
                  info={fieldReferences.smoking}
                  badge={isDefault.smoking ? defaultLabel : null}
                  hint={t('part1.fields.smoking.helper')}
                >
                  <Chips
                    ariaLabel={t('part1.fields.smoking.title')}
                    value={smoking}
                    onChange={(v) => setSmoking(Number(v))}
                    options={[
                      { value: 0, label: t('part1.step3.smoking.never') },
                      { value: 1, label: t('part1.step3.smoking.former') },
                      { value: 2, label: t('part1.step3.smoking.current') },
                    ]}
                  />
                </FieldRow>

                <FieldRow
                  label={t('part1.fields.diet.title')}
                  info={fieldReferences.diet}
                  badge={isDefault.diet ? defaultLabel : null}
                  hint={t('part1.fields.diet.helper')}
                >
                  <select className="qe-select" value={dietPattern} onChange={(e) => setDietPattern(e.target.value)}>
                    <option value="western">{t('part1.step4.diet.western')}</option>
                    <option value="mediterranean">{t('part1.step4.diet.mediterranean')}</option>
                    <option value="indian">{t('part1.step4.diet.indian')}</option>
                    <option value="dash">{t('part1.step4.diet.dash')}</option>
                    <option value="plant-based">{t('part1.step4.diet.plantBased')}</option>
                    <option value="pescatarian">{t('part1.step4.diet.pescatarian')}</option>
                    <option value="low-carb-keto">{t('part1.step4.diet.lowCarbKeto')}</option>
                    <option value="other">{t('part1.step4.diet.other')}</option>
                  </select>
                </FieldRow>
              </div>

              <div className="qe-grid-2">
                <FieldRow
                  label={t('part1.fields.brcaStatus.title')}
                  info={fieldReferences.brcaStatus}
                  badge={isDefault.brca ? defaultLabel : null}
                  hint={t('part1.fields.brcaStatus.helper')}
                >
                  <Chips
                    ariaLabel={t('part1.fields.brcaStatus.title')}
                    value={brcaStatus}
                    onChange={(v) => setBrcaStatus(v)}
                    options={[
                      { value: 'no', label: t('part1.options.no') },
                      { value: 'yes', label: t('part1.options.yes') },
                      { value: 'unknown', label: t('part1.options.unknown') },
                    ]}
                  />
                </FieldRow>

                <FieldRow
                  label={t('part1.step1.inflammationHistory.title')}
                  info={fieldReferences.inflammationHistory}
                  badge={isDefault.inflam ? defaultLabel : null}
                  hint={`${t('part1.step1.inflammationHistory.prompt')} ${t('part1.step1.inflammationHistory.example')}`}
                >
                  <Chips
                    ariaLabel={t('part1.step1.inflammationHistory.title')}
                    value={inflammationHistory}
                    onChange={(v) => setInflammationHistory(Number(v))}
                    options={[
                      { value: 0, label: t('part1.options.no') },
                      { value: 1, label: t('part1.options.yes') },
                    ]}
                  />
                </FieldRow>
              </div>

              <div className="qe-grid-2">
                <FieldRow
                  label={t('part1.step3.chemicalQuestion')}
                  info={fieldReferences.chemicalExposure}
                  badge={isDefault.chem ? defaultLabel : null}
                  hint={t('part1.fields.chemicalExposure.helper')}
                >
                  <Chips
                    ariaLabel={t('part1.fields.chemicalExposure.title')}
                    value={chemicalExposure}
                    onChange={(v) => setChemicalExposure(v)}
                    options={[
                      { value: 'no', label: t('part1.options.no') },
                      { value: 'yes', label: t('part1.options.yes') },
                      { value: 'unknown', label: t('part1.options.unknown') },
                    ]}
                  />
                </FieldRow>
                <div />
              </div>
            </div>
          )}
        </div>

        {/* ── Validation messages ── */}
        {errors.length > 0 && (
          <div className="qe-message qe-message--error" role="alert">
            <AlertCircleIcon size={16} className="qe-message-icon" aria-hidden="true" />
            <div>
              <div className="qe-message-title">{t('quickEntry.fixToCalculate')}</div>
              <ul className="qe-message-list">
                {errors.map((err, idx) => <li key={`${err}-${idx}`}>{err}</li>)}
              </ul>
            </div>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="qe-message qe-message--warning">
            <AlertTriangleIcon size={16} className="qe-message-icon" aria-hidden="true" />
            <div>
              <div className="qe-message-title">{t('quickEntry.headsUp')}</div>
              <ul className="qe-message-list">
                {warnings.map((w, idx) => <li key={`${w}-${idx}`}>{w}</li>)}
              </ul>
            </div>
          </div>
        )}

        <div className="qe-submit-row">
          <button className="qe-calc-btn" type="submit">
            <ZapIcon size={16} aria-hidden="true" />
            {t('quickEntry.calculate')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuickEPsaEntry;
