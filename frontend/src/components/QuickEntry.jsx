import React, { useMemo, useState } from 'react';
import Part1Results from './Part1Results.jsx';
import Part2Results from './Part2Results.jsx';
import Part3Results from './Part3Results.jsx';
import InfoIcon from './InfoIcon.jsx';
import { fieldReferences } from '../utils/fieldReferences';
import './QuickEntry.css';
import { calculateDynamicEPsa, calculateDynamicEPsaPost, validateInputs } from '../utils/dynamicCalculator';
import { fetchBiopsyPrediction } from '../utils/biopsyApi';
import { useTranslation } from 'react-i18next';
import { ZapIcon, UploadIcon, RotateCcwIcon, ChevronDownIcon, AlertCircleIcon, AlertTriangleIcon, ArrowLeftIcon } from 'lucide-react';

// Sensible demo defaults so a single click produces a full Part 1 → 2 → 3 result
// without forcing every field to be filled in first.
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
  psa: '4.5',
  prostateVolume: '40',
  pirads: '3',
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

const QuickEntry = ({ calculatorConfig, onClose }) => {
  const { t } = useTranslation();
  const [showResults, setShowResults] = useState(false);
  const [preResult, setPreResult] = useState(null);
  const [part2Result, setPart2Result] = useState(null); // PSA-only interim (Part 2), shown alongside Part 3 when MRI is included
  const [postResult, setPostResult] = useState(null);
  const [priorResult, setPriorResult] = useState(null); // snapshot for before/after comparison
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [useQolFallback, setUseQolFallback] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [mriOpen, setMriOpen] = useState(true);

  const [age, setAge] = useState('');
  const [race, setRace] = useState('');
  const [ethnicity, setEthnicity] = useState('');
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

  // Part 2/3 — PSA + MRI, so one click yields the full model instead of stopping at Part 1.
  const [psa, setPsa] = useState(DEFAULTS.psa);
  const [prostateVolume, setProstateVolume] = useState(DEFAULTS.prostateVolume);
  const [includeMri, setIncludeMri] = useState(true);
  const [pirads, setPirads] = useState(DEFAULTS.pirads);
  const [onHormonalTherapy, setOnHormonalTherapy] = useState(false);

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
      ethnicity: ethnicity || null,
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
      pathwayMode: includeMri ? 'post_mri' : 'post_psa',
    };
  }, [age, bmi, ipssTotal, ipssQol, shimTotal, race, ethnicity, familyHistory,
      exercise, comorbidityScore, smoking, dietPattern, brcaStatus,
      inflammationHistory, chemicalExposure, includeMri]);

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
    setPsa(DEFAULTS.psa);
    setProstateVolume(DEFAULTS.prostateVolume);
    setPirads(DEFAULTS.pirads);
    setOnHormonalTherapy(false);
    setUseQolFallback(false);
  };

  const runFullModel = async (localFormData) => {
    const extraErrors = [];
    const ipssTotalNum = Array.isArray(localFormData.ipss)
      ? localFormData.ipss.reduce((s, v) => s + (v ?? 0), 0)
      : null;
    const shimTotalNum = Array.isArray(localFormData.shim)
      ? localFormData.shim.reduce((s, v) => s + (v ?? 0), 0)
      : null;
    if (ipssTotalNum !== null && (ipssTotalNum < 0 || ipssTotalNum > 35)) extraErrors.push(t('quickEntry.errors.ipssRange'));
    if (shimTotalNum !== null && (shimTotalNum < 0 || shimTotalNum > 25)) extraErrors.push(t('quickEntry.errors.shimRange'));

    const validation = validateInputs(localFormData, calculatorConfig);
    const mergedErrors = [...(validation.errors || []), ...extraErrors];
    setWarnings(validation.warnings || []);
    setErrors(mergedErrors);
    if (mergedErrors.length > 0) { setPreResult(null); setPart2Result(null); setPostResult(null); setShowResults(false); return; }

    const part1Result = calculateDynamicEPsa(localFormData, calculatorConfig);
    if (!part1Result) {
      setPreResult(null); setPart2Result(null); setPostResult(null); setShowResults(false);
      setErrors([t('quickEntry.errors.calculationFailed')]); setWarnings([]);
      return;
    }

    // Snapshot the previous run (if any) so the results page can show a before/after delta.
    setPriorResult((prev) => (showResults && postResult ? postResult : prev));

    const pathwayMode = localFormData.pathwayMode;
    const psaNum = psa === '' ? null : Number(psa);
    const volumeNum = prostateVolume === '' ? null : Number(prostateVolume);
    const piradsNum = includeMri ? Number(pirads) : 0;

    const localPostData = {
      psa: psaNum === null ? '' : String(psaNum),
      knowPsa: psaNum !== null,
      onHormonalTherapy,
      hormonalTherapyType: '',
      knowPirads: includeMri,
      pirads: includeMri ? String(pirads) : '0',
      prostateVolume: volumeNum === null ? '' : String(volumeNum),
      pathwayMode,
    };

    setCalculating(true);
    try {
      // When MRI data is included, also compute the PSA-only Part 2 interim result
      // (mirrors the wizard's step between the PSA form and the MRI form) so Quick
      // Entry doesn't skip straight from Part 1 to the combined Part 3 screen.
      const interimPart2Result = includeMri
        ? calculateDynamicEPsaPost(part1Result, { ...localPostData, pathwayMode: 'post_psa' }, calculatorConfig)
        : null;

      const result = calculateDynamicEPsaPost(part1Result, localPostData, calculatorConfig);
      if (!result) {
        setPreResult(part1Result); setPart2Result(null); setPostResult(null); setShowResults(false);
        setErrors([t('quickEntry.errors.calculationFailed')]); setWarnings([]);
        return;
      }

      if (includeMri && Number.isFinite(psaNum) && Number.isFinite(piradsNum)) {
        try {
          const apiPrediction = await fetchBiopsyPrediction({
            psa: psaNum,
            pirads: piradsNum,
            prostateVolume: Number.isFinite(volumeNum) && volumeNum > 0 ? volumeNum : null,
          });
          result.apiPrediction = apiPrediction;
        } catch (err) {
          result.apiPrediction = null;
          result.apiPredictionFailed = true;
        }
      }

      setPreResult(part1Result);
      setPart2Result(interimPart2Result);
      setPostResult(result);
      setShowResults(true);
    } finally {
      setCalculating(false);
    }
  };

  const handlePrefillFromJsonFile = async (file) => {
    setUploading(true);
    setErrors([]);
    setWarnings([]);
    setShowResults(false);

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
      const psaImported = num(imported.psa, DEFAULTS.psa);
      const volumeImported = num(imported.prostateVolume, DEFAULTS.prostateVolume);
      const piradsImported = imported.pirads !== undefined && imported.pirads !== null ? String(imported.pirads) : DEFAULTS.pirads;

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
      setPsa(psaImported === '' ? DEFAULTS.psa : String(psaImported));
      setProstateVolume(volumeImported === '' ? DEFAULTS.prostateVolume : String(volumeImported));
      setPirads(piradsImported);

      const localFormData = {
        age: ageNum === '' ? '' : ageNum, race: raceStr || null, bmi: bmiNum === '' ? '' : bmiNum,
        ipss: distributeTotalToArray(safeIpss, 7, 5), shim: distributeTotalToArray(safeShim, 5, 5),
        exercise: Number.isFinite(exerciseNum) ? exerciseNum : DEFAULTS.exercise,
        familyHistory: familyHistoryNum === 'unknown' ? 'unknown' : Number.isFinite(familyHistoryNum) ? familyHistoryNum : DEFAULTS.familyHistory,
        smoking: Number.isFinite(smokingNum) ? smokingNum : DEFAULTS.smoking,
        chemicalExposure: mappedChem, dietPattern: diet, brcaStatus: mappedBrca,
        inflammationHistory: mappedInflammation, comorbidityScore: comorbidityNum,
        hypertension: null, hyperlipidemia: null, coronaryArteryDisease: null, diabetes: null,
        pathwayMode: includeMri ? 'post_mri' : 'post_psa',
      };

      await runFullModel(localFormData);
    } catch (err) {
      setErrors([err?.message || t('dataImport.errors.importFailed')]);
      setWarnings([]); setShowResults(false);
    } finally {
      setUploading(false);
    }
  };

  const handleCalculate = () => {
    runFullModel(formData);
  };

  const handleResetAll = () => {
    setShowResults(false); setPreResult(null); setPart2Result(null); setPostResult(null); setPriorResult(null);
    setErrors([]); setWarnings([]);
    setAge(''); setRace(''); setEthnicity(''); resetDefaults();
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
    psa: String(psa) === String(DEFAULTS.psa),
    volume: String(prostateVolume) === String(DEFAULTS.prostateVolume),
    pirads: String(pirads) === String(DEFAULTS.pirads),
  };
  const defaultLabel = t('quickEntry.usingDefault');

  const backToForm = () => {
    setShowResults(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (showResults && preResult && postResult) {
    const priorScore = priorResult?.score ?? priorResult?.combinedScore ?? null;
    const currentScore = postResult?.score ?? postResult?.combinedScore ?? preResult?.score ?? null;
    const delta = priorScore !== null && currentScore !== null ? currentScore - priorScore : null;

    return (
      <div className="qe-results-wrapper">
        <div className="qe-results-toolbar">
          <button type="button" className="qe-back-btn" onClick={backToForm}>
            <ArrowLeftIcon size={14} aria-hidden="true" />
            {t('quickEntry.editAndCompare')}
          </button>
          {delta !== null && (
            <div className={`qe-compare-strip${delta === 0 ? '' : delta > 0 ? ' qe-compare-strip--up' : ' qe-compare-strip--down'}`}>
              <span>{t('quickEntry.previousScore')}: {priorScore}</span>
              <span className="qe-compare-arrow">→</span>
              <span>{t('quickEntry.currentScore')}: {currentScore}</span>
              <span className="qe-compare-delta">
                ({delta > 0 ? '+' : ''}{delta})
              </span>
            </div>
          )}
          {onClose && (
            <button type="button" className="qe-exit-btn" onClick={onClose}>
              {t('quickEntry.exit')}
            </button>
          )}
        </div>

        <div className="qe-results-section">
          <div className="qe-results-section-title">{t('quickEntry.part1Title')}</div>
          <Part1Results
            result={preResult}
            formData={formData}
            storageMode="local"
            cloudAvailable={false}
            sessionId={null}
            userEmail={null}
            userPhone={null}
            onSaveToCloud={undefined}
            onEditAnswers={backToForm}
            onStartOver={handleResetAll}
          />
        </div>

        {postResult.pathwayMode === 'post_mri' && part2Result && (
          <div className="qe-results-section">
            <div className="qe-results-section-title">{t('quickEntry.part2Title')}</div>
            <Part2Results
              result={part2Result}
              postData={{ psa, onHormonalTherapy, pathwayMode: 'post_psa' }}
              preResult={preResult}
              onContinueToMRI={() => {}}
              onBack={backToForm}
              onStartOver={handleResetAll}
            />
          </div>
        )}

        <div className="qe-results-section">
          <div className="qe-results-section-title">
            {postResult.pathwayMode === 'post_mri' ? t('quickEntry.part3Title') : t('quickEntry.part2Title')}
          </div>
          {postResult.pathwayMode === 'post_mri' ? (
            <Part3Results
              result={postResult}
              preData={{ ...formData, pathwayMode: postResult.pathwayMode }}
              preResult={preResult}
              postData={{ psa, prostateVolume, pirads, onHormonalTherapy, pathwayMode: postResult.pathwayMode }}
              biomarkersEnabled={false}
              storageMode="local"
              sessionId={null}
              userEmail={null}
              userPhone={null}
              researchConsent={false}
              onEditAnswers={backToForm}
              onStartOver={handleResetAll}
              onShowModelDocs={() => {}}
            />
          ) : (
            <Part2Results
              result={postResult}
              postData={{ psa, onHormonalTherapy, pathwayMode: postResult.pathwayMode }}
              preResult={preResult}
              onBack={backToForm}
              onStartOver={handleResetAll}
            />
          )}
        </div>
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
                <option value="african-american">{t('part1.race.african-american')}</option>
                <option value="american-indian">{t('part1.race.american-indian')}</option>
                <option value="asian">{t('part1.race.asian')}</option>
                <option value="native-hawaiian">{t('part1.race.native-hawaiian')}</option>
                <option value="white">{t('part1.race.white')}</option>
                <option value="unknown">{t('part1.race.unknown')}</option>
              </select>
            </FieldRow>
            <FieldRow
              label={t('part1.fields.ethnicity.title')}
              info={fieldReferences.race}
            >
              <select className="qe-select" value={ethnicity} onChange={(e) => setEthnicity(e.target.value)}>
                <option value="">{t('part1.fields.ethnicity.selectPlaceholder')}</option>
                <option value="hispanic-latino">{t('part1.ethnicity.hispanic-latino')}</option>
                <option value="not-hispanic-latino">{t('part1.ethnicity.not-hispanic-latino')}</option>
                <option value="unknown">{t('part1.ethnicity.unknown')}</option>
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

        {/* ── Section C: PSA + MRI (drives Part 2/3) ── */}
        <div className="qe-section">
          <div className="qe-section-header qe-section-header--modifiers">
            <span className="qe-section-title">{t('quickEntry.psaAndMriTitle')}</span>
          </div>
          <div className="qe-grid-2">
            <FieldRow
              label={t('part2.fields.psa.title', { defaultValue: 'PSA (ng/mL)' })}
              info={fieldReferences.part2.psaLevel}
              badge={isDefault.psa ? defaultLabel : null}
            >
              <input
                className="qe-input" type="number"
                min="0" step="0.1"
                value={psa} onChange={(e) => setPsa(e.target.value)}
              />
            </FieldRow>
            <FieldRow
              label={t('part2.fields.hormonalTherapy.title', { defaultValue: 'On hormonal therapy?' })}
            >
              <Chips
                ariaLabel="hormonal therapy"
                value={onHormonalTherapy ? 'yes' : 'no'}
                onChange={(v) => setOnHormonalTherapy(v === 'yes')}
                options={[
                  { value: 'no', label: t('part1.options.no') },
                  { value: 'yes', label: t('part1.options.yes') },
                ]}
              />
            </FieldRow>
          </div>

          <div className="qe-field">
            <div className="qe-field-label">
              <span className="qe-field-label-text">{t('quickEntry.includeMri')}</span>
            </div>
            <Chips
              ariaLabel="include MRI"
              value={includeMri ? 'yes' : 'no'}
              onChange={(v) => setIncludeMri(v === 'yes')}
              options={[
                { value: 'yes', label: t('part1.options.yes') },
                { value: 'no', label: t('part1.options.no') },
              ]}
            />
          </div>

          {includeMri && (
            <div className="qe-grid-2">
              <FieldRow
                label={t('part2.piradsInfo.title', { defaultValue: 'PI-RADS score' })}
                info={fieldReferences.part2.pirads}
                badge={isDefault.pirads ? defaultLabel : null}
              >
                <select className="qe-select" value={pirads} onChange={(e) => setPirads(e.target.value)}>
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </FieldRow>
              <FieldRow
                label={t('part2.fields.prostateVolume.title', { defaultValue: 'Prostate volume (mL)' })}
                badge={isDefault.volume ? defaultLabel : null}
              >
                <input
                  className="qe-input" type="number"
                  min="0" step="1"
                  value={prostateVolume} onChange={(e) => setProstateVolume(e.target.value)}
                />
              </FieldRow>
            </div>
          )}
        </div>

        {/* ── Section D: Lifestyle & history (collapsible) ── */}
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
                    <option value="asian">{t('part1.step4.diet.asian')}</option>
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
          <button className="qe-calc-btn" type="submit" disabled={calculating}>
            <ZapIcon size={16} aria-hidden="true" />
            {calculating ? t('quickEntry.calculating') : t('quickEntry.calculateFull')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuickEntry;
