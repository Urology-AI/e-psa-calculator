import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { deriveIpssFromQol, expandShimSingle } from '../utils/epsaFormUtils';
import './Part1Form.css';
import './epsa-v2-layout.css';
import InfoIcon from './InfoIcon';
import { fieldReferences, biomarkerReferences } from '../utils/fieldReferences';
import { CheckIcon, Dumbbell, Activity, Sofa, Cigarette, CigaretteOff, Flame, Fish, Leaf, Heart, Beef, Salad, AlertTriangle, CheckCircle2, Apple, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const IPSS_QUESTION_KEYS = [
  'part1.ipss.q1',
  'part1.ipss.q2',
  'part1.ipss.q3',
  'part1.ipss.q4',
  'part1.ipss.q5',
  'part1.ipss.q6',
  'part1.ipss.q7',
];

const IPSS_LABEL_KEY_BY_VALUE = {
  0: 'part1.ipss.label0',
  1: 'part1.ipss.label1',
  2: 'part1.ipss.label2',
  3: 'part1.ipss.label3',
  4: 'part1.ipss.label4',
  5: 'part1.ipss.label5',
};

// Section badge components
const SectionABadge = () => (
  <span className="section-a-badge">AUA/SUO 2026</span>
);

const SectionBBadge = () => (
  <span className="section-b-badge">Research-based</span>
);

const SectionCBadge = () => (
  <span className="section-c-badge">Research · Optional</span>
);

// Merged source lists for Section C questions that cover multiple tests at once.
const urineBiomarkerRef = {
  title: 'Urine-Based Biomarker Tests',
  description: 'MPS2, PCA3, and SelectMDx are non-invasive urine tests used as an adjunct to PSA to help decide whether a biopsy or MRI referral is warranted.',
  sources: [
    ...biomarkerReferences.mps2.sources,
    ...biomarkerReferences.pca3.sources,
    ...biomarkerReferences.selectMdx.sources,
  ],
};
const bloodBiomarkerRef = {
  title: 'Blood-Based Biomarker Tests (beyond PSA)',
  description: 'Stockholm3, PHI, and 4Kscore each combine multiple blood analytes into a single risk score to improve specificity over PSA alone.',
  sources: [
    ...biomarkerReferences.stockholm3.sources,
    ...biomarkerReferences.phi.sources,
    ...biomarkerReferences.fourKScore.sources,
  ],
};
const genomicTestRef = {
  title: 'Tissue-Based Genomic Tests',
  description: 'Decipher, ExoDx, and Oncotype DX (OncoDx) are tissue or urine molecular assays that estimate aggressiveness or metastatic risk to guide treatment vs. active surveillance decisions.',
  sources: [
    ...biomarkerReferences.decipher.sources,
    ...biomarkerReferences.exodx.sources,
    ...biomarkerReferences.oncodx.sources,
  ],
};

const Part1Form = ({ formData, setFormData, onNext }) => {
  const { t } = useTranslation();

  const QuestionSubtext = ({ i18nKey, children, style }) => (
    <div className="question-subtext" style={{ marginBottom: '12px', fontSize: '0.875rem', lineHeight: 1.5, ...style }}>
      {i18nKey ? t(i18nKey) : children}
    </div>
  );

  const NonGuidelineBadge = () => (
    <span
      className="non-guideline-badge"
      title={t('part1.nonGuideline.badgeTooltip')}
      aria-label={t('part1.nonGuideline.badgeTooltip')}
    >
      {t('part1.nonGuideline.badge')}
    </span>
  );

  const GuidelineBadge = () => (
    <span
      className="guideline-badge"
      title={t('part1.guideline.badgeTooltip')}
      aria-label={t('part1.guideline.badgeTooltip')}
    >
      {t('part1.guideline.badge')}
    </span>
  );

  const SkipLink = ({ field }) => {
    const skipped = isSkipped(field);
    return (
      <div className="skip-link-row">
        {skipped ? (
          <button
            type="button"
            className="skip-btn skip-btn--skipped"
            onClick={() => skipField(field)}
            aria-label="Question skipped — select to undo"
          >
            <CheckIcon size={11} />
            {t('part1.skip.skippedLabel')}
          </button>
        ) : (
          <button
            type="button"
            className="skip-btn"
            onClick={() => skipField(field)}
          >
            {t('part1.skip.preferNotToSay')}
          </button>
        )}
      </div>
    );
  };

  const [localData, setLocalData] = useState({
    age: formData.age || '',
    race: formData.race || null,
    familyHistory: formData.familyHistory ?? null,
    inflammationHistory: formData.inflammationHistory ?? null,
    brcaStatus: formData.brcaStatus ?? null,
    heightUnit: formData.heightUnit || 'imperial',
    heightFt: formData.heightFt || '',
    heightIn: formData.heightIn || '',
    heightCm: formData.heightCm || '',
    weightUnit: formData.weightUnit || 'lbs',
    weight: formData.weight || '',
    weightKg: formData.weightKg || '',
    bmi: formData.bmi || 0,
    exercise: formData.exercise ?? null,
    smoking: formData.smoking ?? null,
    chemicalExposure: formData.chemicalExposure ?? null,
    dietPattern: formData.dietPattern || '',
    comorbidityScore: formData.comorbidityScore ?? (() => {
      const h = formData.hypertension; const hld = formData.hyperlipidemia; const cad = formData.coronaryArteryDisease; const d = formData.diabetes;
      const isY = (v) => v === 'yes' || v === true || v === 1;
      const n = [h, hld, cad, d].filter(isY).length;
      if (n > 0) return n >= 2 ? 2 : 1;
      if (h === 'no' || h === false || h === 0) return 0;
      return null;
    })(),
    hypertension: formData.hypertension ?? null,
    hyperlipidemia: formData.hyperlipidemia ?? null,
    coronaryArteryDisease: formData.coronaryArteryDisease ?? null,
    diabetes: formData.diabetes ?? null,
    ipss: formData.ipss || Array(7).fill(null),
    ipssQol: formData.ipssQol ?? null,
    shim: formData.shim || Array(5).fill(null),
    guidelineRegion: formData.guidelineRegion || 'us',
    skippedFields: Array.isArray(formData.skippedFields) ? [...formData.skippedFields] : [],

    // Section C — Advanced Biomarkers (all optional)
    previousBiopsy: formData.previousBiopsy ?? null,
    previousBiopsyResult: formData.previousBiopsyResult || '',
    polygenicrisk: formData.polygenicrisk ?? null,
    polygenicScore: formData.polygenicScore || '',
    urineBiomarker: formData.urineBiomarker ?? null,
    urineBiomarkerResult: formData.urineBiomarkerResult ?? null,
    bloodBiomarker: formData.bloodBiomarker ?? null,
    bloodBiomarkerResult: formData.bloodBiomarkerResult ?? null,
    genomicTest: formData.genomicTest ?? null,
    genomicResult: formData.genomicResult ?? null,
    exactvuDone: formData.exactvuDone ?? null,
    exactvuPrecise: formData.exactvuPrecise ?? null,
  });

  const [formErrors, setFormErrors] = useState([]);
  const [attemptedNext, setAttemptedNext] = useState(false);
  const sectionARef = useRef(null);
  const sectionBRef = useRef(null);
  const sectionCRef = useRef(null);
  const [activeSectionTab, setActiveSectionTab] = useState('A');
  // 'quick' = single proxy question; 'full' = all questions
  // Infer initial mode from imported data: if all 7 ipss are non-null → full, else quick
  const [ipssMode, setIpssMode] = useState(() =>
    Array.isArray(formData.ipss) && formData.ipss.every(v => v !== null) ? 'full' : 'quick'
  );
  const [shimMode, setShimMode] = useState(() =>
    Array.isArray(formData.shim) && formData.shim.length === 5 && formData.shim.every(v => v !== null) ? 'full' : 'quick'
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveSectionTab(entry.target.dataset.section);
          }
        });
      },
      { threshold: 0.15, rootMargin: '-10% 0px -55% 0px' }
    );
    if (sectionARef.current) observer.observe(sectionARef.current);
    if (sectionBRef.current) observer.observe(sectionBRef.current);
    if (sectionCRef.current) observer.observe(sectionCRef.current);
    return () => observer.disconnect();
  }, []);

  const scrollToSection = useCallback((ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    const toInches = () => {
      if (localData.heightUnit === 'metric') {
        const cm = parseFloat(localData.heightCm);
        if (isNaN(cm) || cm <= 0) return 0;
        return cm / 2.54;
      }
      const ft = parseFloat(localData.heightFt);
      const inches = parseFloat(localData.heightIn);
      if (isNaN(ft) || isNaN(inches)) return 0;
      return (ft * 12) + inches;
    };

    const toPounds = () => {
      if (localData.weightUnit === 'kg') {
        const kg = parseFloat(localData.weightKg);
        if (isNaN(kg) || kg <= 0) return 0;
        return kg * 2.20462;
      }
      const lbs = parseFloat(localData.weight);
      if (isNaN(lbs) || lbs <= 0) return 0;
      return lbs;
    };

    const totalInches = toInches();
    const weightLbs = toPounds();

    if (totalInches > 0 && weightLbs > 0) {
      const bmi = (weightLbs / (totalInches * totalInches)) * 703;
      setLocalData(prev => ({ ...prev, bmi }));
    } else {
      setLocalData(prev => ({ ...prev, bmi: 0 }));
    }
  }, [
    localData.heightUnit,
    localData.heightFt,
    localData.heightIn,
    localData.heightCm,
    localData.weightUnit,
    localData.weight,
    localData.weightKg,
  ]);

  useEffect(() => {
    setFormData(localData);
  }, [localData, setFormData]);

  const SKIP_DEFAULTS = {
    familyHistory: 0,
    inflammationHistory: 0,
    brcaStatus: 'unknown',
    exercise: 1,
    smoking: 0,
    chemicalExposure: 'unknown',
    dietPattern: 'other',
    comorbidityScore: 0,
    ipss: Array(7).fill(0),
    shim: Array(5).fill(0),
    previousBiopsy: 'no',
    polygenicrisk: 'not_tested',
    urineBiomarker: 'none',
    bloodBiomarker: 'none',
    genomicTest: 'none',
    exactvuDone: 'no',
  };

  const skipField = (field) => {
    setLocalData(prev => {
      const next = { ...prev };
      next[field] = SKIP_DEFAULTS[field] !== undefined ? SKIP_DEFAULTS[field] : null;
      const set = new Set(prev.skippedFields || []);
      set.add(field);
      next.skippedFields = Array.from(set);
      return next;
    });
  };

  const isSkipped = (field) => Array.isArray(localData.skippedFields) && localData.skippedFields.includes(field);

  const clearSkip = (prev, field) => {
    if (!Array.isArray(prev.skippedFields) || !prev.skippedFields.includes(field)) return prev.skippedFields;
    return prev.skippedFields.filter(f => f !== field);
  };

  const updateField = (field, value) => {
    setLocalData(prev => ({ ...prev, [field]: value, skippedFields: clearSkip(prev, field) }));
  };

  const updateIPSS = (index, value) => {
    setLocalData(prev => {
      const next = [...prev.ipss];
      next[index] = parseInt(value, 10);
      return { ...prev, ipss: next, skippedFields: clearSkip(prev, 'ipss') };
    });
  };

  const updateSHIM = (index, value) => {
    setLocalData(prev => {
      const next = [...prev.shim];
      next[index] = parseInt(value, 10);
      return { ...prev, shim: next, skippedFields: clearSkip(prev, 'shim') };
    });
  };

  const hasValidHeight = () => {
    if (localData.heightUnit === 'metric') {
      const cm = parseFloat(localData.heightCm);
      return !isNaN(cm) && cm >= 100 && cm <= 250;
    }
    const ft = parseInt(localData.heightFt, 10);
    const inch = parseInt(localData.heightIn, 10);
    return !isNaN(ft) && ft >= 3 && ft <= 8 && !isNaN(inch) && inch >= 0 && inch <= 11;
  };

  const hasValidWeight = () => {
    if (localData.weightUnit === 'kg') {
      const kg = parseFloat(localData.weightKg);
      return !isNaN(kg) && kg >= 25 && kg <= 250;
    }
    const lbs = parseFloat(localData.weight);
    return !isNaN(lbs) && lbs >= 50 && lbs <= 500;
  };

  const validateAll = () => {
    const errors = [];
    const ageNum = parseInt(localData.age, 10);
    if (!localData.age || isNaN(ageNum) || ageNum < 18 || ageNum > 120) {
      errors.push(t('part1.errors.validate.step0.ageInvalid'));
    }
    if (!localData.race) {
      errors.push(t('part1.errors.validate.step0.raceInvalid'));
    }
    if (!isSkipped('familyHistory') && (localData.familyHistory === null || localData.familyHistory === undefined)) {
      errors.push(t('part1.errors.validate.step1.familyHistoryInvalid'));
    }
    if (!hasValidHeight()) {
      errors.push(t('part1.errors.validate.step2.heightInvalid'));
    }
    if (!hasValidWeight()) {
      errors.push(t('part1.errors.validate.step2.weightInvalid'));
    }
    if (localData.bmi <= 0) {
      errors.push(t('part1.errors.validate.step2.bmiInvalid'));
    }
    const ipssComplete = isSkipped('ipss') ||
      (ipssMode === 'quick' ? localData.ipssQol !== null && localData.ipssQol !== undefined
        : Array.isArray(localData.ipss) && localData.ipss.every(v => v !== null && v !== undefined));
    if (!ipssComplete) {
      errors.push(t('part1.errors.validate.step5.ipssInvalid'));
    }
    if (!isSkipped('exercise') && (localData.exercise === null || localData.exercise === undefined)) {
      errors.push(t('part1.errors.validate.step3.exerciseInvalid'));
    }
    if (!isSkipped('smoking') && (localData.smoking === null || localData.smoking === undefined)) {
      errors.push(t('part1.errors.validate.step3.smokingInvalid'));
    }
    if (!isSkipped('dietPattern') && !localData.dietPattern) {
      errors.push(t('part1.errors.validate.step4.dietInvalid'));
    }
    // Inflammation history is optional — null treated as 0 by the engine
    // Chemical exposure is optional — null treated as 'unknown' by the engine
    if (!isSkipped('brcaStatus') && !localData.brcaStatus) {
      errors.push(t('part1.errors.validate.step1.brcaInvalid'));
    }
    if (!isSkipped('comorbidityScore') && (localData.comorbidityScore === null || localData.comorbidityScore === undefined)) {
      errors.push(t('part1.errors.validate.step4.comorbidityInvalid'));
    }
    return errors;
  };

  const canProceed = () => {
    const ageNum = parseInt(localData.age, 10);
    const hasAge = localData.age !== '' && !isNaN(ageNum) && ageNum >= 18 && ageNum <= 120;
    const hasRace = localData.race !== null && localData.race !== undefined && localData.race !== '';
    const hasHeight = hasValidHeight();
    const hasWeight = hasValidWeight();
    const hasBMI = localData.bmi > 0;
    const hasOrSkipped = (field, hasVal) => isSkipped(field) || hasVal;
    const hasFamilyHistory = hasOrSkipped('familyHistory', localData.familyHistory !== null && localData.familyHistory !== undefined);
    const hasBrca = hasOrSkipped('brcaStatus', localData.brcaStatus !== null && localData.brcaStatus !== undefined);
    const hasExercise = hasOrSkipped('exercise', localData.exercise !== null && localData.exercise !== undefined);
    const hasSmoking = hasOrSkipped('smoking', localData.smoking !== null && localData.smoking !== undefined);
    const hasDiet = hasOrSkipped('dietPattern', localData.dietPattern !== '');
    const hasComorbidityScore = hasOrSkipped('comorbidityScore', localData.comorbidityScore !== null && localData.comorbidityScore !== undefined);
    const ipssComplete = isSkipped('ipss') ||
      (ipssMode === 'quick' ? localData.ipssQol !== null && localData.ipssQol !== undefined
        : Array.isArray(localData.ipss) && localData.ipss.length === 7 && localData.ipss.every(v => v !== null && v !== undefined));
    const shimComplete = isSkipped('shim') ||
      (shimMode === 'quick' ? localData.shim[0] !== null && localData.shim[0] !== undefined
        : Array.isArray(localData.shim) && localData.shim.length === 5 && localData.shim.every(v => v !== null && v !== undefined));
    // Chemical exposure and inflammation history are optional
    return hasAge && hasRace && hasFamilyHistory && hasBrca && hasHeight && hasWeight && hasBMI && hasExercise && hasSmoking && hasDiet && hasComorbidityScore && ipssComplete && shimComplete;
  };

  const handleSubmit = () => {
    const errors = validateAll();
    setAttemptedNext(true);
    if (errors.length > 0) {
      setFormErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setFormErrors([]);
    // Normalise optional fields before handing off to the engine
    const patch = {};
    if (!localData.chemicalExposure) patch.chemicalExposure = 'unknown';
    if (localData.inflammationHistory === null || localData.inflammationHistory === undefined) patch.inflammationHistory = 0;
    if (Object.keys(patch).length) setLocalData(p => ({ ...p, ...patch }));
    onNext();
  };

  // ─── Question rendering ───────────────────────────────────────────────────

  const ageNum = parseInt(localData.age, 10);
  const ageValid = localData.age && !isNaN(ageNum) && ageNum >= 18 && ageNum <= 120;
  const raceValid = !!localData.race;
  const familyHistoryValid = localData.familyHistory !== null && localData.familyHistory !== undefined;
  const heightValid = hasValidHeight();
  const weightValid = hasValidWeight();
  const bmiValid = localData.bmi > 0;
  const ipssComplete = ipssMode === 'quick'
    ? localData.ipssQol !== null && localData.ipssQol !== undefined
    : localData.ipss.every(v => v !== null && v !== undefined);
  const ipssAnsweredCount = ipssMode === 'quick'
    ? (localData.ipssQol !== null ? 1 : 0)
    : localData.ipss.filter(v => v !== null && v !== undefined).length;
  const shimComplete = shimMode === 'quick'
    ? localData.shim[0] !== null && localData.shim[0] !== undefined
    : localData.shim.every(v => v !== null && v !== undefined);
  const shimAnsweredCount = shimMode === 'quick'
    ? (localData.shim[0] !== null ? 1 : 0)
    : localData.shim.filter(v => v !== null && v !== undefined).length;
  const ipssQuestions = IPSS_QUESTION_KEYS.map(k => t(k));
  const ipssLabels = [0, 1, 2, 3, 4, 5].map(v => ({ value: v, label: t(IPSS_LABEL_KEY_BY_VALUE[v]) }));

  const exerciseValid = localData.exercise !== null && localData.exercise !== undefined;
  const smokingValid = localData.smoking !== null && localData.smoking !== undefined;
  const chemicalValid = !!localData.chemicalExposure;
  const dietValid = !!localData.dietPattern;
  const inflammationHistoryValid = localData.inflammationHistory !== null && localData.inflammationHistory !== undefined;
  const brcaValid = !!localData.brcaStatus;
  const comorbiditiesValid = localData.comorbidityScore !== null && localData.comorbidityScore !== undefined;

  const totalQuestions = 31; // 12 core + 7 IPSS + 1 QoL + 5 SHIM + 6 Section C (optional)
  const countAnswered = () => {
    let count = 0;
    const skipped = (f) => isSkipped(f);
    if (localData.age && ageValid) count++;
    if (localData.race) count++;
    if (!skipped('familyHistory') && familyHistoryValid) count++;
    if (!skipped('inflammationHistory') && inflammationHistoryValid) count++;
    if (!skipped('brcaStatus') && brcaValid) count++;
    if (heightValid) count++;
    if (weightValid) count++;
    if (!skipped('exercise') && exerciseValid) count++;
    if (!skipped('smoking') && smokingValid) count++;
    if (!skipped('chemicalExposure') && chemicalValid) count++;
    if (!skipped('dietPattern') && dietValid) count++;
    if (!skipped('comorbidityScore') && comorbiditiesValid) count++;
    if (!skipped('ipss')) {
      localData.ipss.forEach(v => { if (v !== null && v !== undefined) count++; });
    }
    if (localData.ipssQol !== null && localData.ipssQol !== undefined) count++;
    if (!skipped('shim')) {
      localData.shim.forEach(v => { if (v !== null && v !== undefined) count++; });
    }
    if (localData.previousBiopsy !== null) count++;
    if (localData.polygenicrisk !== null) count++;
    if (localData.urineBiomarker !== null) count++;
    if (localData.bloodBiomarker !== null) count++;
    if (localData.genomicTest !== null) count++;
    if (localData.exactvuDone !== null) count++;
    return count;
  };

  const answeredCount = countAnswered();
  const canProceedResult = canProceed();

  // Section A: guideline factors (age, race, family history, IPSS)
  const sectionATotal = 4;
  const sectionAAnswered = [
    ageValid,
    raceValid,
    familyHistoryValid || isSkipped('familyHistory'),
    ipssComplete || isSkipped('ipss'),
  ].filter(Boolean).length;
  const sectionADone = sectionAAnswered === sectionATotal;

  // Section B: additional factors (height, weight, exercise, smoking, diet, BRCA, comorbidities, SHIM)
  // Chemical exposure and inflammation history are optional — counted toward progress but not required for sectionBDone
  const sectionBTotal = 8;
  const sectionBAnswered = [
    hasValidHeight(),
    hasValidWeight(),
    exerciseValid || isSkipped('exercise'),
    smokingValid || isSkipped('smoking'),
    dietValid || isSkipped('dietPattern'),
    brcaValid || isSkipped('brcaStatus'),
    comorbiditiesValid || isSkipped('comorbidityScore'),
    shimComplete || isSkipped('shim'),
  ].filter(Boolean).length;
  const sectionBDone = sectionBAnswered === sectionBTotal;

  // Section C: advanced biomarkers — entirely optional, never gates submission
  const sectionCTotal = 6;
  const sectionCAnswered = [
    localData.previousBiopsy !== null,
    localData.polygenicrisk !== null,
    localData.urineBiomarker !== null,
    localData.bloodBiomarker !== null,
    localData.genomicTest !== null,
    localData.exactvuDone !== null,
  ].filter(Boolean).length;
  const sectionCDone = sectionCAnswered === sectionCTotal;

  const progressPct = Math.round((answeredCount / totalQuestions) * 100);

  return (
    <div className="part1-form-container">
      {/* Header */}
      <div className="flow-header">
        <div className="v2-flow-head">
          <div>
            <div className="v2-flow-eyebrow">Part 1 · Baseline Assessment</div>
            <h3 className="v2-flow-title">Your Prostate Health Profile</h3>
          </div>
          <div className="v2-flow-estimate">
            <span className="v2-flow-estimate-lbl">Answered</span>
            <div className="v2-flow-estimate-val">{answeredCount}<span className="v2-flow-estimate-max">/{totalQuestions}</span></div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="form-progress-track" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100} aria-label={`${answeredCount} of ${totalQuestions} questions answered`}>
          <div className="form-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        {/* Section navigator */}
        <div className="section-tab-nav" role="tablist" aria-label="Form sections">
          <button
            type="button"
            role="tab"
            aria-selected={activeSectionTab === 'A'}
            className={`section-tab ${activeSectionTab === 'A' ? 'section-tab--active' : ''} ${sectionADone ? 'section-tab--done' : ''}`}
            onClick={() => scrollToSection(sectionARef)}
          >
            <span className="section-tab-letter">A</span>
            <span className="section-tab-name">Guideline Factors</span>
            <span className={`section-tab-count ${sectionADone ? 'section-tab-count--done' : ''}`}>
              {sectionAAnswered}/{sectionATotal}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSectionTab === 'B'}
            className={`section-tab ${activeSectionTab === 'B' ? 'section-tab--active' : ''} ${sectionBDone ? 'section-tab--done' : ''}`}
            onClick={() => scrollToSection(sectionBRef)}
          >
            <span className="section-tab-letter section-tab-letter--b">B</span>
            <span className="section-tab-name">Lifestyle Factors</span>
            <span className={`section-tab-count ${sectionBDone ? 'section-tab-count--done' : ''}`}>
              {sectionBAnswered}/{sectionBTotal}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSectionTab === 'C'}
            className={`section-tab section-tab--c ${activeSectionTab === 'C' ? 'section-tab--active' : ''} ${sectionCDone ? 'section-tab--done' : ''}`}
            onClick={() => scrollToSection(sectionCRef)}
          >
            <span className="section-tab-letter section-tab-letter--c">C</span>
            <span className="section-tab-name">Biomarkers</span>
            <span className={`section-tab-count ${sectionCDone ? 'section-tab-count--done' : ''}`}>
              {sectionCAnswered}/{sectionCTotal}
            </span>
          </button>
        </div>
      </div>

      {/* Validation error summary */}
      {formErrors.length > 0 && (
        <div className="step-error-box" role="alert">
          <div className="step-error-title">{t('part1.errors.stepErrorTitle')}</div>
          <ul className="step-error-list">
            {formErrors.map((error, idx) => <li key={idx}>{error}</li>)}
          </ul>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          SECTION A — Guideline-Recommended Factors
          ═══════════════════════════════════════════════════════════ */}
      <div ref={sectionARef} data-section="A" className="part1-section-header part1-section-header--a">
        <div className="part1-section-header-top">
          <span className="part1-section-letter">A</span>
          <h4 className="part1-section-title">
            Guideline-Recommended Factors
            <SectionABadge />
          </h4>
        </div>
        <p className="part1-section-subtitle">
          Based on AUA/SUO 2026 and NCCN 2026 Early Detection Guidelines
        </p>
      </div>

      {/* Age */}
      <div className="question-card" style={{ borderColor: ageValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">1</div>
          <div className="question-text">{t('part1.fields.age.title')} <GuidelineBadge /></div>
          <InfoIcon {...fieldReferences.age} />
          {ageValid && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
        </div>
        <div className="question-body">
          <QuestionSubtext i18nKey="part1.fields.age.helper" />
          <label htmlFor="field-age" className="sr-only">{t('part1.fields.age.title')}</label>
          <input
            id="field-age"
            type="number"
            className="input-field"
            style={{ width: '100%' }}
            placeholder={t('part1.fields.age.placeholder')}
            min="18"
            max="120"
            value={localData.age}
            onChange={(e) => updateField('age', e.target.value)}
          />
          {attemptedNext && !ageValid && (
            <div role="alert" aria-live="polite" style={{ color: '#E74C3C', fontSize: '0.75rem', marginTop: '4px' }}>
              {t('part1.errors.step0.ageInline')}
            </div>
          )}
          {(() => {
            const n = parseInt(localData.age, 10);
            if (!Number.isFinite(n)) return null;
            if (n < 40) return (
              <div role="note" className="age-warning">
                <strong>Age under 40:</strong> PSA screening is not routinely recommended per AUA/NCCN guidelines. You can still complete the questionnaire — your clinician can review the results.
              </div>
            );
            if (n >= 70) return (
              <div role="note" className="age-warning">
                <strong>Age 70+:</strong> AUA/SUO 2026 (Statement 7) requires shared decision-making — screening benefit depends on life expectancy, PSA level, and personal values. Discuss with your physician whether to continue or stop screening.
              </div>
            );
            return null;
          })()}
        </div>
      </div>

      {/* Race */}
      <div className="question-card" style={{ borderColor: raceValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">2</div>
          <div className="question-text">{t('part1.fields.race.title')} <GuidelineBadge /></div>
          <InfoIcon {...fieldReferences.race} />
          {raceValid && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
        </div>
        <div className="question-body">
          <QuestionSubtext i18nKey="part1.fields.race.helper" />
          <div className="option-grid c2" role="radiogroup" aria-label={t('part1.fields.race.title')}>
            {[
              { value: 'african-american', label: t('part1.race.african-american') },
              { value: 'american-indian', label: t('part1.race.american-indian') },
              { value: 'asian', label: t('part1.race.asian') },
              { value: 'native-hawaiian', label: t('part1.race.native-hawaiian') },
              { value: 'white', label: t('part1.race.white') },
              { value: 'unknown', label: t('part1.race.unknown') },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={localData.race === opt.value}
                className={`option-btn ${localData.race === opt.value ? 'selected' : ''}`}
                onClick={() => updateField('race', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {attemptedNext && !raceValid && (
            <div role="alert" aria-live="polite" style={{ color: '#E74C3C', fontSize: '0.75rem', marginTop: '4px' }}>
              {t('part1.errors.step0.raceInline')}
            </div>
          )}
        </div>
      </div>

      {/* Ethnicity */}
      <div className="question-card" style={{ borderColor: '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">2b</div>
          <div className="question-text">{t('part1.fields.ethnicity.title')}</div>
        </div>
        <div className="question-body">
          <QuestionSubtext i18nKey="part1.fields.ethnicity.helper" />
          <div className="option-grid c2" role="radiogroup" aria-label={t('part1.fields.ethnicity.title')}>
            {[
              { value: 'hispanic-latino', label: t('part1.ethnicity.hispanic-latino') },
              { value: 'not-hispanic-latino', label: t('part1.ethnicity.not-hispanic-latino') },
              { value: 'unknown', label: t('part1.ethnicity.unknown') },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={localData.ethnicity === opt.value}
                className={`option-btn ${localData.ethnicity === opt.value ? 'selected' : ''}`}
                onClick={() => updateField('ethnicity', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Family history */}
      <div className="question-card" style={{ borderColor: familyHistoryValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">3</div>
          <div className="question-text">{t('part1.step1.familyHistory.title')} <GuidelineBadge /></div>
          <InfoIcon {...fieldReferences.familyHistory} />
          {familyHistoryValid && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
        </div>
        <div className="question-body">
          <QuestionSubtext i18nKey="part1.fields.familyHistory.helper" />
          <div className="option-grid c4" role="radiogroup" aria-label={t('part1.fields.familyHistory.title')}>
            {[
              { value: 0, label: t('quickEntry.family.none') },
              { value: 1, label: t('quickEntry.family.one') },
              { value: 2, label: t('quickEntry.family.twoPlus') },
              { value: 'unknown', label: t('part1.options.unknown') },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={localData.familyHistory === opt.value}
                className={`option-btn ${localData.familyHistory === opt.value ? 'selected' : ''}`}
                onClick={() => updateField('familyHistory', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {attemptedNext && !familyHistoryValid && !isSkipped('familyHistory') && (
            <div role="alert" aria-live="polite" style={{ color: '#E74C3C', fontSize: '0.75rem', marginTop: '8px' }}>
              {t('part1.errors.selectOption')}
            </div>
          )}
          <SkipLink field="familyHistory" />
        </div>
      </div>

      {/* IPSS */}
      <div className="part1-step">
        <div className="question-card" style={{ borderColor: ipssComplete ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px', marginBottom: '8px', paddingBottom: '0.75rem' }}>
          <div className="question-header">
            <div className="question-number">4</div>
            <div className="question-text" style={{ flex: 1 }}>{t('part1.steps.ipss.sectionTitle')} <GuidelineBadge /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <InfoIcon {...fieldReferences.ipss} />
              {ipssComplete
                ? <CheckIcon size={16} style={{ color: '#27AE60' }} />
                : <span style={{ color: attemptedNext ? '#E74C3C' : '#6b7280', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {ipssMode === 'quick' ? (localData.ipssQol !== null ? '1/1' : '0/1') : `${ipssAnsweredCount}/7`}
                  </span>
              }
            </div>
          </div>
          <div className="question-body" style={{ marginTop: 0 }}>
            <div className="question-note" style={{ marginBottom: '8px', fontSize: '0.875rem' }}>{t('part1.ipss.note')}</div>
            <div className="mode-toggle" role="group" aria-label="IPSS detail level">
              <button
                type="button"
                className={`mode-toggle-btn${ipssMode === 'quick' ? ' mode-toggle-btn--active' : ''}`}
                onClick={() => {
                  setIpssMode('quick');
                  setLocalData(p => ({ ...p, ipss: Array(7).fill(null) }));
                }}
              >Quick — 1 question</button>
              <button
                type="button"
                className={`mode-toggle-btn${ipssMode === 'full' ? ' mode-toggle-btn--active' : ''}`}
                onClick={() => {
                  setIpssMode('full');
                  setLocalData(p => ({ ...p, ipssQol: null }));
                }}
              >Full IPSS — 8 questions</button>
            </div>
          </div>
        </div>

        {ipssMode === 'quick' ? (
          /* Quick: just Q8 Quality of Life */
          <div className="question-card" style={{ borderColor: localData.ipssQol !== null ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
            <div className="question-header">
              <div className="question-number">Q8</div>
              <div className="question-text">If you were to spend the rest of your life with your urinary condition the way it is now, how would you feel about that? <GuidelineBadge /></div>
              {localData.ipssQol !== null && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
            </div>
            <div className="question-body">
              <div className="question-note" style={{ fontSize: '0.8rem', marginBottom: '8px' }}>Quality of Life — this single question estimates your overall urinary symptom burden.</div>
              <div className="option-grid c2">
                {[
                  { value: 0, label: 'Delighted' }, { value: 1, label: 'Pleased' },
                  { value: 2, label: 'Mostly satisfied' }, { value: 3, label: 'Mixed' },
                  { value: 4, label: 'Mostly dissatisfied' }, { value: 5, label: 'Unhappy' },
                  { value: 6, label: 'Terrible' },
                ].map(opt => (
                  <button key={opt.value} className={`option-btn ${localData.ipssQol === opt.value ? 'selected' : ''}`}
                    onClick={() => {
                      const derived = deriveIpssFromQol(opt.value);
                      setLocalData(p => ({ ...p, ipssQol: opt.value, ipss: derived }));
                    }}>
                    <span className="score">({opt.value})</span> {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Full: all 7 symptom questions + Q8 */
          <>
            {ipssQuestions.map((q, index) => (
              <div key={index} className="question-card" style={{ borderColor: localData.ipss[index] !== null ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
                <div className="question-header">
                  <div className="question-number">{index + 1}</div>
                  <div className="question-text">{q}</div>
                  {localData.ipss[index] !== null && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
                </div>
                <div className="question-body">
                  <QuestionSubtext i18nKey="part1.ipss.helper" />
                  <div className="option-grid c3">
                    {ipssLabels.map(({ value, label }) => (
                      <button key={value} className={`option-btn ${localData.ipss[index] === value ? 'selected' : ''}`} onClick={() => updateIPSS(index, value)}>
                        <span className="score">({value})</span> {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            <div className="score-total" style={{ color: ipssComplete ? '#27AE60' : undefined }}>
              {t('part1.ipss.totalLabel')}: {ipssComplete ? localData.ipss.reduce((a, b) => a + b, 0) : '—'} / 35
            </div>
            {/* Q8 Quality of Life */}
            <div className="question-card" style={{ borderColor: localData.ipssQol !== null ? '#27AE60' : '#E8ECF0', borderWidth: '2px', marginTop: '12px' }}>
              <div className="question-header">
                <div className="question-number">Q8</div>
                <div className="question-text">If you were to spend the rest of your life with your urinary condition the way it is now, how would you feel about that? <GuidelineBadge /></div>
                {localData.ipssQol !== null && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
              </div>
              <div className="question-body">
                <div className="option-grid c2">
                  {[
                    { value: 0, label: 'Delighted' }, { value: 1, label: 'Pleased' },
                    { value: 2, label: 'Mostly satisfied' }, { value: 3, label: 'Mixed' },
                    { value: 4, label: 'Mostly dissatisfied' }, { value: 5, label: 'Unhappy' },
                    { value: 6, label: 'Terrible' },
                  ].map(opt => (
                    <button key={opt.value} className={`option-btn ${localData.ipssQol === opt.value ? 'selected' : ''}`} onClick={() => updateField('ipssQol', opt.value)}>
                      <span className="score">({opt.value})</span> {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          Section divider
          ═══════════════════════════════════════════════════════════ */}
      <div className="part1-section-divider" aria-hidden="true" />

      {/* ═══════════════════════════════════════════════════════════
          SECTION B — Additional Risk Factors
          ═══════════════════════════════════════════════════════════ */}
      <div ref={sectionBRef} data-section="B" className="part1-section-header part1-section-header--b">
        <div className="part1-section-header-top">
          <span className="part1-section-letter part1-section-letter--b">B</span>
          <h4 className="part1-section-title">
            Lifestyle Factors
            <SectionBBadge />
          </h4>
        </div>
        <p className="part1-section-subtitle part1-section-subtitle--b">
          These factors are associated with prostate cancer risk in published research but are not part of current AUA/NCCN screening guidelines. They add context to your result.
        </p>
      </div>

      {/* Height */}
      <div className="question-card" style={{ borderColor: heightValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">5</div>
          <div className="question-text">{t('part1.step2.heightQuestion')}</div>
          <NonGuidelineBadge />
          <InfoIcon {...fieldReferences.heightWeight} />
          {heightValid && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
        </div>
        <div className="question-body">
          <QuestionSubtext i18nKey="part1.step2.heightHelper" />
          <div className="option-grid c2" style={{ marginBottom: '12px' }}>
            <button className={`option-btn ${localData.heightUnit === 'imperial' ? 'selected' : ''}`} onClick={() => updateField('heightUnit', 'imperial')}>
              {t('part1.step2.heightUnit.imperial')}
            </button>
            <button className={`option-btn ${localData.heightUnit === 'metric' ? 'selected' : ''}`} onClick={() => updateField('heightUnit', 'metric')}>
              {t('part1.step2.heightUnit.metric')}
            </button>
          </div>
          {localData.heightUnit === 'imperial' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <label htmlFor="field-height-ft" className="sr-only">{t('part1.step2.heightImperialFeetPlaceholder')}</label>
              <input id="field-height-ft" type="number" className="input-field" placeholder={t('part1.step2.heightImperialFeetPlaceholder')} value={localData.heightFt} onChange={(e) => updateField('heightFt', e.target.value)} />
              <label htmlFor="field-height-in" className="sr-only">{t('part1.step2.heightImperialInchesPlaceholder')}</label>
              <input id="field-height-in" type="number" className="input-field" placeholder={t('part1.step2.heightImperialInchesPlaceholder')} value={localData.heightIn} onChange={(e) => updateField('heightIn', e.target.value)} />
            </div>
          ) : (
            <>
              <label htmlFor="field-height-cm" className="sr-only">{t('part1.step2.heightMetricPlaceholder')}</label>
              <input id="field-height-cm" type="number" className="input-field" placeholder={t('part1.step2.heightMetricPlaceholder')} value={localData.heightCm} onChange={(e) => updateField('heightCm', e.target.value)} />
            </>
          )}
        </div>
      </div>

      {/* Weight */}
      <div className="question-card" style={{ borderColor: weightValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">6</div>
          <div className="question-text">{t('part1.step2.weightQuestion')}</div>
          <NonGuidelineBadge />
          <InfoIcon {...fieldReferences.heightWeight} />
          {weightValid && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
        </div>
        <div className="question-body">
          <QuestionSubtext i18nKey="part1.step2.weightHelper" />
          <div className="option-grid c2" style={{ marginBottom: '12px' }}>
            <button className={`option-btn ${localData.weightUnit === 'lbs' ? 'selected' : ''}`} onClick={() => updateField('weightUnit', 'lbs')}>
              {t('part1.step2.weightUnit.lbs')}
            </button>
            <button className={`option-btn ${localData.weightUnit === 'kg' ? 'selected' : ''}`} onClick={() => updateField('weightUnit', 'kg')}>
              {t('part1.step2.weightUnit.kg')}
            </button>
          </div>
          {localData.weightUnit === 'kg' ? (
            <>
              <label htmlFor="field-weight-kg" className="sr-only">{t('part1.step2.weightMetricPlaceholder')}</label>
              <input id="field-weight-kg" type="number" className="input-field" placeholder={t('part1.step2.weightMetricPlaceholder')} value={localData.weightKg} onChange={(e) => updateField('weightKg', e.target.value)} />
            </>
          ) : (
            <>
              <label htmlFor="field-weight-lbs" className="sr-only">{t('part1.step2.weightImperialPlaceholder')}</label>
              <input id="field-weight-lbs" type="number" className="input-field" placeholder={t('part1.step2.weightImperialPlaceholder')} value={localData.weight} onChange={(e) => updateField('weight', e.target.value)} />
            </>
          )}
          <div className="question-note" style={{ marginTop: '8px', fontSize: '0.875rem', color: bmiValid ? '#27AE60' : undefined }}>
            {t('part1.step2.bmiLabel')}: <strong>{localData.bmi > 0 ? localData.bmi.toFixed(1) : '—'}</strong>
            {bmiValid && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
          </div>
        </div>
      </div>

      {/* Exercise */}
      <div className="question-card" style={{ borderColor: exerciseValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">7</div>
          <div className="question-text">{t('part1.fields.exercise.title')}</div>
          <NonGuidelineBadge />
          <InfoIcon {...fieldReferences.exercise} />
          {exerciseValid && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
        </div>
        <div className="question-body">
          <QuestionSubtext i18nKey="part1.fields.exercise.helper" />
          <div className="option-grid c3" role="radiogroup" aria-label={t('part1.fields.exercise.title')}>
            {[
              { value: 0, label: t('part1.step3.exercise.regular'), Icon: Dumbbell },
              { value: 1, label: t('part1.step3.exercise.some'), Icon: Activity },
              { value: 2, label: t('part1.step3.exercise.none'), Icon: Sofa },
            ].map(opt => (
              <button key={opt.value} type="button" role="radio" aria-checked={localData.exercise === opt.value} className={`option-btn ${localData.exercise === opt.value ? 'selected' : ''}`} onClick={() => updateField('exercise', opt.value)}>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <opt.Icon size={18} aria-hidden="true" />
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
          {attemptedNext && !exerciseValid && !isSkipped('exercise') && (
            <div role="alert" aria-live="polite" style={{ color: '#E74C3C', fontSize: '0.75rem', marginTop: '8px' }}>
              {t('part1.errors.selectOption')}
            </div>
          )}
          <SkipLink field="exercise" />
        </div>
      </div>

      {/* Smoking */}
      <div className="question-card" style={{ borderColor: smokingValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">8</div>
          <div className="question-text">{t('part1.fields.smoking.title')}</div>
          <NonGuidelineBadge />
          <InfoIcon {...fieldReferences.smoking} />
          {smokingValid && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
        </div>
        <div className="question-body">
          <QuestionSubtext i18nKey="part1.fields.smoking.helper" />
          <div className="option-grid c3">
            {[
              { value: 2, label: t('part1.step3.smoking.current'), Icon: Flame },
              { value: 1, label: t('part1.step3.smoking.former'), Icon: Cigarette },
              { value: 0, label: t('part1.step3.smoking.never'), Icon: CigaretteOff },
            ].map(opt => (
              <button key={opt.value} className={`option-btn ${localData.smoking === opt.value ? 'selected' : ''}`} onClick={() => updateField('smoking', opt.value)}>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <opt.Icon size={18} />
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
          {attemptedNext && !smokingValid && !isSkipped('smoking') && (
            <div role="alert" aria-live="polite" style={{ color: '#E74C3C', fontSize: '0.75rem', marginTop: '8px' }}>
              {t('part1.errors.selectOption')}
            </div>
          )}
          <SkipLink field="smoking" />
        </div>
      </div>

      {/* Diet */}
      <div className="question-card" style={{ borderColor: dietValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">9</div>
          <div className="question-text">{t('part1.fields.diet.title')}</div>
          <NonGuidelineBadge />
          <InfoIcon {...fieldReferences.diet} />
          {dietValid && <CheckIcon size={16} style={{ color: '#27AE60', marginLeft: '8px' }} />}
        </div>
        <div className="question-body">
          <QuestionSubtext i18nKey="part1.fields.diet.helper" />
          <div className="option-grid c2">
            {[
              { value: 'western', label: t('part1.step4.diet.western'), Icon: Beef },
              { value: 'mediterranean', label: t('part1.step4.diet.mediterranean'), Icon: Salad },
              { value: 'asian', label: t('part1.step4.diet.asian'), Icon: Flame },
              { value: 'dash', label: t('part1.step4.diet.dash'), Icon: Heart },
              { value: 'plant-based', label: t('part1.step4.diet.plantBased'), Icon: Leaf },
              { value: 'pescatarian', label: t('part1.step4.diet.pescatarian'), Icon: Fish },
              { value: 'low-carb-keto', label: t('part1.step4.diet.lowCarbKeto'), Icon: Apple },
              { value: 'other', label: t('part1.step4.diet.other'), Icon: CheckCircle2 },
            ].map(opt => (
              <button key={opt.value} className={`option-btn ${localData.dietPattern === opt.value ? 'selected' : ''}`} onClick={() => updateField('dietPattern', opt.value)}>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <opt.Icon size={18} />
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
          {attemptedNext && !dietValid && !isSkipped('dietPattern') && (
            <div role="alert" aria-live="polite" style={{ color: '#E74C3C', fontSize: '0.75rem', marginTop: '8px' }}>
              {t('part1.errors.selectOption')}
            </div>
          )}
          <SkipLink field="dietPattern" />
        </div>
      </div>

      {/* Inflammation history */}
      <div className="question-card" style={{ borderColor: inflammationHistoryValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">10</div>
          <div className="question-text">{t('part1.step1.inflammationHistory.title')}</div>
          <NonGuidelineBadge />
          <InfoIcon {...fieldReferences.inflammationHistory} />
          {inflammationHistoryValid && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
        </div>
        <div className="question-body">
          <QuestionSubtext>
            {t('part1.step1.inflammationHistory.prompt')}
            <br />
            <span style={{ fontSize: '0.8125rem', fontStyle: 'italic' }}>
              {t('part1.step1.inflammationHistory.example')}
            </span>
          </QuestionSubtext>
          <div className="option-grid c3">
            {[
              { value: 0, label: t('part1.options.no') },
              { value: 1, label: t('part1.options.yes') },
            ].map(opt => (
              <button key={opt.value} className={`option-btn ${localData.inflammationHistory === opt.value ? 'selected' : ''}`} onClick={() => updateField('inflammationHistory', opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
          {attemptedNext && !inflammationHistoryValid && !isSkipped('inflammationHistory') && (
            <div role="alert" aria-live="polite" style={{ color: '#E74C3C', fontSize: '0.75rem', marginTop: '8px' }}>
              {t('part1.errors.selectOption')}
            </div>
          )}
          <SkipLink field="inflammationHistory" />
        </div>
      </div>

      {/* Chemical / Agent Orange exposure */}
      <div className="question-card" style={{ borderColor: chemicalValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">11</div>
          <div className="question-text">{t('part1.step3.chemicalQuestion')}</div>
          <NonGuidelineBadge />
          <InfoIcon {...fieldReferences.chemicalExposure} />
          {chemicalValid && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
        </div>
        <div className="question-body">
          <QuestionSubtext i18nKey="part1.fields.chemicalExposure.helper" />
          <div className="option-grid c2">
            {[
              { value: 'agent_orange', label: t('part1.chemicalExposureOptions.agentOrange'), Icon: AlertTriangle, evidence: t('part1.chemicalExposureOptions.evidenceProven') },
              { value: 'nine_eleven', label: t('part1.chemicalExposureOptions.nineEleven'), Icon: AlertTriangle, evidence: t('part1.chemicalExposureOptions.evidenceProven') },
              { value: 'other_chemical', label: t('part1.chemicalExposureOptions.otherChemical'), Icon: AlertTriangle, evidence: t('part1.chemicalExposureOptions.evidenceUnspecified') },
              { value: 'none', label: t('part1.chemicalExposureOptions.none'), Icon: CheckCircle2 },
              { value: 'unknown', label: t('part1.chemicalExposureOptions.unknown'), Icon: HelpCircle },
            ].map(opt => (
              <button key={opt.value} className={`option-btn ${localData.chemicalExposure === opt.value ? 'selected' : ''}`} onClick={() => updateField('chemicalExposure', opt.value)}>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <opt.Icon size={18} />
                  <span>{opt.label}</span>
                  {opt.evidence && <span style={{ fontSize: '0.65rem', opacity: 0.75, fontWeight: 400 }}>{opt.evidence}</span>}
                </span>
              </button>
            ))}
          </div>
          {attemptedNext && !chemicalValid && !isSkipped('chemicalExposure') && (
            <div role="alert" aria-live="polite" style={{ color: '#E74C3C', fontSize: '0.75rem', marginTop: '8px' }}>
              {t('part1.errors.selectOption')}
            </div>
          )}
          <SkipLink field="chemicalExposure" />
        </div>
      </div>

      {/* Known pathogenic germline variant (AUA/SUO 2026 Statement 5) */}
      <div className="question-card" style={{ borderColor: brcaValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">12</div>
          <div className="question-text">Do you have a known pathogenic germline variant (inherited gene mutation)?</div>
          <GuidelineBadge />
          <InfoIcon {...fieldReferences.brcaStatus} />
          {brcaValid && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
        </div>
        <div className="question-body">
          <QuestionSubtext>
            AUA/SUO 2026 (Statement 5): BRCA1/2, Lynch syndrome genes (MLH1, MSH2, MSH6, PMS2), ATM, CHEK2, HOXB13, and NBS1 mutations are all associated with elevated prostate cancer risk and earlier screening starting at age 40–45.
          </QuestionSubtext>
          <div className="option-grid c2" style={{ marginBottom: '10px' }}>
            {[
              { value: 'yes', label: 'Yes — BRCA1 or BRCA2' },
              { value: 'lynch', label: 'Yes — Lynch syndrome (MLH1/MSH2/MSH6/PMS2)' },
              { value: 'other_elevated', label: 'Yes — ATM, CHEK2, HOXB13, or NBS1' },
              { value: 'other_unknown', label: 'Yes — other or unknown variant' },
              { value: 'no', label: 'Tested — no pathogenic variant found' },
              { value: 'unknown', label: 'Never tested / unsure' },
            ].map(opt => (
              <button key={opt.value} className={`option-btn ${localData.brcaStatus === opt.value ? 'selected' : ''}`} onClick={() => updateField('brcaStatus', opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
          {(localData.brcaStatus === 'yes' || localData.brcaStatus === 'lynch' || localData.brcaStatus === 'other_elevated' || localData.brcaStatus === 'other_unknown') && (
            <div className="p1-amber-note">
              Your germline variant qualifies you for earlier PSA screening starting at age 40–45 per AUA/SUO 2026 Statement 5 (Strong Recommendation; Grade B).
            </div>
          )}
          {attemptedNext && !brcaValid && !isSkipped('brcaStatus') && (
            <div role="alert" aria-live="polite" style={{ color: '#E74C3C', fontSize: '0.75rem', marginTop: '8px' }}>
              {t('part1.errors.selectOption')}
            </div>
          )}
          <SkipLink field="brcaStatus" />
        </div>
      </div>

      {/* Comorbidities */}
      <div className="question-card" style={{ borderColor: comorbiditiesValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">13</div>
          <div className="question-text">{t('part1.fields.comorbidities.title')}</div>
          <NonGuidelineBadge />
          <InfoIcon {...fieldReferences.comorbidities} />
          {comorbiditiesValid && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
        </div>
        <div className="question-body">
          <QuestionSubtext>{t('part1.step4.comorbidities.prompt')}</QuestionSubtext>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '0.875rem' }}>{t('part1.step4.comorbidities.askAnyLabel')}</div>
            <div className="option-grid c2">
              <button type="button" className={`option-btn ${localData.comorbidityScore === 0 ? 'selected' : ''}`} onClick={() => setLocalData(prev => ({ ...prev, comorbidityScore: 0 }))}>
                {t('part1.options.no')}
              </button>
              <button type="button" className={`option-btn ${localData.comorbidityScore === 1 || localData.comorbidityScore === 2 ? 'selected' : ''}`} onClick={() => setLocalData(prev => ({ ...prev, comorbidityScore: prev.comorbidityScore === 1 || prev.comorbidityScore === 2 ? prev.comorbidityScore : 1 }))}>
                {t('part1.options.yes')}
              </button>
            </div>
          </div>
          {(localData.comorbidityScore === 1 || localData.comorbidityScore === 2) && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '0.875rem' }}>{t('part1.step4.comorbidities.howManyLabel')}</div>
              <div className="option-grid c2">
                <button type="button" className={`option-btn ${localData.comorbidityScore === 1 ? 'selected' : ''}`} onClick={() => setLocalData(prev => ({ ...prev, comorbidityScore: 1 }))}>
                  {t('part1.step4.comorbidities.one')}
                </button>
                <button type="button" className={`option-btn ${localData.comorbidityScore === 2 ? 'selected' : ''}`} onClick={() => setLocalData(prev => ({ ...prev, comorbidityScore: 2 }))}>
                  {t('part1.step4.comorbidities.twoOrMore')}
                </button>
              </div>
            </div>
          )}
          {attemptedNext && !comorbiditiesValid && !isSkipped('comorbidityScore') && (
            <div role="alert" aria-live="polite" style={{ color: '#E74C3C', fontSize: '0.75rem', marginTop: '8px' }}>
              {t('part1.errors.comorbidityQuestions')}
            </div>
          )}
          <SkipLink field="comorbidityScore" />
        </div>
      </div>

      {/* SHIM */}
      {(() => {
        const SHIM_QUESTIONS = [
          { key: 'erection_confidence', label: 'How do you rate your confidence that you could get and keep an erection?',
            options: [{ value: 1, label: 'Very low' }, { value: 2, label: 'Low' }, { value: 3, label: 'Moderate' }, { value: 4, label: 'High' }, { value: 5, label: 'Very high' }] },
          { key: 'erection_penetration', label: 'When you had erections with sexual stimulation, how often were your erections hard enough for penetration?',
            options: [{ value: 0, label: 'No sexual activity' }, { value: 1, label: 'Almost never' }, { value: 2, label: 'A few times' }, { value: 3, label: 'Sometimes' }, { value: 4, label: 'Most times' }, { value: 5, label: 'Almost always' }] },
          { key: 'maintain_erection', label: 'During sexual intercourse, how often were you able to maintain your erection after you had penetrated your partner?',
            options: [{ value: 0, label: 'Did not attempt' }, { value: 1, label: 'Almost never' }, { value: 2, label: 'A few times' }, { value: 3, label: 'Sometimes' }, { value: 4, label: 'Most times' }, { value: 5, label: 'Almost always' }] },
          { key: 'complete_erection', label: 'During sexual intercourse, how difficult was it to maintain your erection to completion of intercourse?',
            options: [{ value: 0, label: 'Did not attempt' }, { value: 1, label: 'Extremely difficult' }, { value: 2, label: 'Very difficult' }, { value: 3, label: 'Difficult' }, { value: 4, label: 'Slightly difficult' }, { value: 5, label: 'Not difficult' }] },
          { key: 'satisfactory', label: 'When you attempted sexual intercourse, how often was it satisfactory for you?',
            options: [{ value: 0, label: 'Did not attempt' }, { value: 1, label: 'Almost never' }, { value: 2, label: 'A few times' }, { value: 3, label: 'Sometimes' }, { value: 4, label: 'Most times' }, { value: 5, label: 'Almost always' }] },
        ];
        return (
          <div className="part1-step">
            <div className="question-card" style={{ borderColor: shimComplete ? '#27AE60' : '#E8ECF0', borderWidth: '2px', marginBottom: '8px', paddingBottom: '0.75rem' }}>
              <div className="question-header">
                <div className="question-number">14</div>
                <div className="question-text" style={{ flex: 1 }}>SHIM — Sexual Health Inventory <NonGuidelineBadge /></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {shimComplete
                    ? <CheckIcon size={16} style={{ color: '#27AE60' }} />
                    : <span style={{ color: '#6b7280', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        {shimMode === 'quick' ? (localData.shim[0] !== null ? '1/1' : '0/1') : `${shimAnsweredCount}/5`}
                      </span>
                  }
                </div>
              </div>
              <div className="question-body" style={{ marginTop: 0 }}>
                <div className="question-note" style={{ marginBottom: '8px', fontSize: '0.875rem' }}>
                  Over the past 6 months — select the answer that best describes your experience.
                </div>
                <div className="mode-toggle" role="group" aria-label="SHIM detail level">
                  <button
                    type="button"
                    className={`mode-toggle-btn${shimMode === 'quick' ? ' mode-toggle-btn--active' : ''}`}
                    onClick={() => {
                      setShimMode('quick');
                      setLocalData(p => ({ ...p, shim: Array(5).fill(null) }));
                    }}
                  >Quick — 1 question</button>
                  <button
                    type="button"
                    className={`mode-toggle-btn${shimMode === 'full' ? ' mode-toggle-btn--active' : ''}`}
                    onClick={() => {
                      setShimMode('full');
                      setLocalData(p => ({ ...p, shim: Array(5).fill(null) }));
                    }}
                  >Full SHIM — 5 questions</button>
                </div>
              </div>
            </div>

            {shimMode === 'quick' ? (
              /* Quick: just Q1 erection confidence */
              <div className="question-card" style={{ borderColor: localData.shim[0] !== null ? '#27AE60' : '#E8ECF0', borderWidth: '2px' }}>
                <div className="question-header">
                  <div className="question-number">1</div>
                  <div className="question-text">{SHIM_QUESTIONS[0].label}</div>
                  {localData.shim[0] !== null && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
                </div>
                <div className="question-body">
                  <div className="question-note" style={{ fontSize: '0.8rem', marginBottom: '8px' }}>This single question estimates your overall erectile function score.</div>
                  <div className="option-grid c3">
                    {SHIM_QUESTIONS[0].options.map(opt => (
                      <button key={opt.value} className={`option-btn ${localData.shim[0] === opt.value ? 'selected' : ''}`}
                        onClick={() => {
                          const derived = expandShimSingle(opt.value);
                          setLocalData(p => ({ ...p, shim: derived }));
                        }}>
                        <span className="score">({opt.value})</span> {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Full: all 5 questions */
              <>
                {SHIM_QUESTIONS.map((q, index) => (
                  <div key={q.key} className="question-card" style={{ borderColor: localData.shim[index] !== null ? '#27AE60' : '#E8ECF0', borderWidth: '2px' }}>
                    <div className="question-header">
                      <div className="question-number">{index + 1}</div>
                      <div className="question-text">{q.label}</div>
                      {localData.shim[index] !== null && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
                    </div>
                    <div className="question-body">
                      <div className="option-grid c3">
                        {q.options.map(opt => (
                          <button key={opt.value} className={`option-btn ${localData.shim[index] === opt.value ? 'selected' : ''}`} onClick={() => updateSHIM(index, opt.value)}>
                            <span className="score">({opt.value})</span> {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {shimComplete && (
                  <div className="score-total" style={{ color: '#27AE60' }}>
                    SHIM Total: {localData.shim.reduce((a, b) => a + b, 0)} / 25
                  </div>
                )}
              </>
            )}
            <SkipLink field="shim" />
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════
          Section divider
          ═══════════════════════════════════════════════════════════ */}
      <div className="part1-section-divider" aria-hidden="true" />

      {/* ═══════════════════════════════════════════════════════════
          SECTION C — Advanced Biomarkers (optional)
          ═══════════════════════════════════════════════════════════ */}
      <div ref={sectionCRef} data-section="C" className="part1-section-header part1-section-header--c">
        <div className="part1-section-header-top">
          <span className="part1-section-letter part1-section-letter--c">C</span>
          <h4 className="part1-section-title">
            Advanced Biomarkers
            <SectionCBadge />
          </h4>
        </div>
        <p className="part1-section-subtitle part1-section-subtitle--c">
          If you've had any of these tests, enter the results. All optional — skip anything you haven't had. These data points improve future model accuracy and personalize your result context.
        </p>
      </div>

      {/* C1: Previous biopsy */}
      <div className="question-card" style={{ borderColor: localData.previousBiopsy !== null ? '#27AE60' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">15</div>
          <div className="question-text">Have you had a prostate biopsy before?</div>
          <InfoIcon {...biomarkerReferences.previousBiopsy} />
          {localData.previousBiopsy !== null && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
        </div>
        <div className="question-body">
          <div className="option-grid c2">
            {[
              { value: 'no', label: 'No' },
              { value: 'yes', label: 'Yes' },
            ].map(opt => (
              <button key={opt.value} type="button" className={`option-btn ${localData.previousBiopsy === opt.value ? 'selected' : ''}`} onClick={() => updateField('previousBiopsy', opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
          {localData.previousBiopsy === 'yes' && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '0.875rem' }}>What was the result?</div>
              <div className="option-grid c3">
                {[
                  { value: 'negative', label: 'Negative (no cancer)' },
                  { value: 'gg1', label: 'Grade Group 1 (GG1)' },
                  { value: 'gg2plus', label: 'Grade Group 2 or higher (GG2+)' },
                ].map(opt => (
                  <button key={opt.value} type="button" className={`option-btn ${localData.previousBiopsyResult === opt.value ? 'selected' : ''}`} onClick={() => updateField('previousBiopsyResult', opt.value)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <SkipLink field="previousBiopsy" />
        </div>
      </div>

      {/* C2: Polygenic risk score */}
      <div className="question-card" style={{ borderColor: localData.polygenicrisk !== null ? '#27AE60' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">16</div>
          <div className="question-text">Have you had a polygenic risk score (PRS) test for prostate cancer?</div>
          <InfoIcon {...biomarkerReferences.polygenicRiskScore} />
          {localData.polygenicrisk !== null && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
        </div>
        <div className="question-body">
          <QuestionSubtext style={{ marginBottom: '10px' }}>
            PRS tests (e.g., Polygenic Health, Ambry Genetics, Color) assess inherited DNA risk across hundreds of genetic variants.
          </QuestionSubtext>
          <div className="option-grid c2">
            {[
              { value: 'not_tested', label: 'Not tested' },
              { value: 'average', label: 'Average risk (near population median)' },
              { value: 'elevated', label: 'Elevated risk (>75th percentile)' },
              { value: 'high', label: 'High risk (>90th percentile)' },
            ].map(opt => (
              <button key={opt.value} type="button" className={`option-btn ${localData.polygenicrisk === opt.value ? 'selected' : ''}`} onClick={() => updateField('polygenicrisk', opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
          {localData.polygenicrisk && localData.polygenicrisk !== 'not_tested' && (
            <div style={{ marginTop: '12px' }}>
              <label htmlFor="field-prs-score" className="sr-only">PRS score (if known)</label>
              <input
                id="field-prs-score"
                type="number"
                className="input-field"
                placeholder="Numeric PRS score, if known (optional)"
                value={localData.polygenicScore}
                onChange={(e) => updateField('polygenicScore', e.target.value)}
              />
            </div>
          )}
          <SkipLink field="polygenicrisk" />
        </div>
      </div>

      {/* C3: Urine biomarker */}
      <div className="question-card" style={{ borderColor: localData.urineBiomarker !== null ? '#27AE60' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">17</div>
          <div className="question-text">Have you had a urine-based prostate biomarker test?</div>
          <InfoIcon {...urineBiomarkerRef} />
          {localData.urineBiomarker !== null && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
        </div>
        <div className="question-body">
          <QuestionSubtext style={{ marginBottom: '10px' }}>
            e.g., MyProstateScore 2.0 (MPS2 / 18-gene), PCA3, SelectMDx
          </QuestionSubtext>
          <div className="option-grid c2">
            {[
              { value: 'none', label: 'None / Not tested' },
              { value: 'mps2', label: 'MPS2 (MyProstateScore 2.0)' },
              { value: 'pca3', label: 'PCA3' },
              { value: 'selectmdx', label: 'SelectMDx' },
            ].map(opt => (
              <button key={opt.value} type="button" className={`option-btn ${localData.urineBiomarker === opt.value ? 'selected' : ''}`} onClick={() => updateField('urineBiomarker', opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
          {localData.urineBiomarker && localData.urineBiomarker !== 'none' && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '0.875rem' }}>What was the result?</div>
              <div className="option-grid c3">
                {[
                  { value: 'low', label: 'Low risk' },
                  { value: 'intermediate', label: 'Intermediate' },
                  { value: 'high', label: 'High risk' },
                ].map(opt => (
                  <button key={opt.value} type="button" className={`option-btn ${localData.urineBiomarkerResult === opt.value ? 'selected' : ''}`} onClick={() => updateField('urineBiomarkerResult', opt.value)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <SkipLink field="urineBiomarker" />
        </div>
      </div>

      {/* C4: Blood biomarker */}
      <div className="question-card" style={{ borderColor: localData.bloodBiomarker !== null ? '#27AE60' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">18</div>
          <div className="question-text">Have you had a blood-based prostate biomarker test beyond standard PSA?</div>
          <InfoIcon {...bloodBiomarkerRef} />
          {localData.bloodBiomarker !== null && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
        </div>
        <div className="question-body">
          <QuestionSubtext style={{ marginBottom: '10px' }}>
            e.g., Stockholm 3 (STHLM3), Prostate Health Index (PHI), 4Kscore
          </QuestionSubtext>
          <div className="option-grid c2">
            {[
              { value: 'none', label: 'None / Not tested' },
              { value: 'stockholm3', label: 'Stockholm 3 (STHLM3)' },
              { value: 'phi', label: 'Prostate Health Index (PHI)' },
              { value: '4k', label: '4Kscore' },
            ].map(opt => (
              <button key={opt.value} type="button" className={`option-btn ${localData.bloodBiomarker === opt.value ? 'selected' : ''}`} onClick={() => updateField('bloodBiomarker', opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
          {localData.bloodBiomarker && localData.bloodBiomarker !== 'none' && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '0.875rem' }}>What was the result category?</div>
              <div className="option-grid c3">
                {[
                  { value: 'low', label: 'Low risk' },
                  { value: 'intermediate', label: 'Intermediate' },
                  { value: 'high', label: 'High risk' },
                ].map(opt => (
                  <button key={opt.value} type="button" className={`option-btn ${localData.bloodBiomarkerResult === opt.value ? 'selected' : ''}`} onClick={() => updateField('bloodBiomarkerResult', opt.value)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <SkipLink field="bloodBiomarker" />
        </div>
      </div>

      {/* C5: Genomic / tissue test */}
      <div className="question-card" style={{ borderColor: localData.genomicTest !== null ? '#27AE60' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">19</div>
          <div className="question-text">Have you had a prostate genomic test (tissue-based)?</div>
          <InfoIcon {...genomicTestRef} />
          {localData.genomicTest !== null && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
        </div>
        <div className="question-body">
          <QuestionSubtext style={{ marginBottom: '10px' }}>
            e.g., Decipher Genomics (post-biopsy), ExoDx Prostate, OncoDx
          </QuestionSubtext>
          <div className="option-grid c2">
            {[
              { value: 'none', label: 'None / Not tested' },
              { value: 'decipher', label: 'Decipher' },
              { value: 'exodx', label: 'ExoDx' },
              { value: 'oncodx', label: 'OncoDx' },
            ].map(opt => (
              <button key={opt.value} type="button" className={`option-btn ${localData.genomicTest === opt.value ? 'selected' : ''}`} onClick={() => updateField('genomicTest', opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
          {localData.genomicTest && localData.genomicTest !== 'none' && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '0.875rem' }}>What was the result?</div>
              <div className="option-grid c3">
                {[
                  { value: 'low', label: 'Low risk' },
                  { value: 'intermediate', label: 'Intermediate' },
                  { value: 'high', label: 'High risk' },
                ].map(opt => (
                  <button key={opt.value} type="button" className={`option-btn ${localData.genomicResult === opt.value ? 'selected' : ''}`} onClick={() => updateField('genomicResult', opt.value)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <SkipLink field="genomicTest" />
        </div>
      </div>

      {/* C6: ExactVu micro-ultrasound */}
      <div className="question-card" style={{ borderColor: localData.exactvuDone !== null ? '#27AE60' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">20</div>
          <div className="question-text">Have you had an ExactVu micro-ultrasound (high-resolution transrectal ultrasound)?</div>
          <InfoIcon {...biomarkerReferences.exactvu} />
          {localData.exactvuDone !== null && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
        </div>
        <div className="question-body">
          <QuestionSubtext style={{ marginBottom: '10px' }}>
            ExactVu operates at 29 MHz — approximately 3× the resolution of standard TRUS. Used for targeted biopsy and lesion characterization.
          </QuestionSubtext>
          <div className="option-grid c2">
            {[
              { value: 'no', label: 'No / Not available' },
              { value: 'yes', label: 'Yes' },
            ].map(opt => (
              <button key={opt.value} type="button" className={`option-btn ${localData.exactvuDone === opt.value ? 'selected' : ''}`} onClick={() => updateField('exactvuDone', opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
          {localData.exactvuDone === 'yes' && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '0.875rem' }}>What was the PRECISE score? (1–5)</div>
              <div className="option-grid c3">
                {[1, 2, 3, 4, 5].map(v => (
                  <button key={v} type="button" className={`option-btn ${localData.exactvuPrecise === v ? 'selected' : ''}`} onClick={() => updateField('exactvuPrecise', v)}>
                    {v} {v === 1 ? '(very low suspicion)' : v === 5 ? '(very high suspicion)' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}
          <SkipLink field="exactvuDone" />
        </div>
      </div>

      {/* Submit */}
      <div className="v2-form-nav">
        <div className="v2-form-nav-inner">
          <div className="v2-form-nav-status">
            <button
              type="button"
              className={`nav-section-chip ${sectionADone ? 'nav-section-chip--done' : ''}`}
              onClick={() => scrollToSection(sectionARef)}
              aria-label={`Section A: ${sectionAAnswered} of ${sectionATotal} answered`}
            >
              A {sectionADone ? <CheckIcon size={12} aria-hidden="true" /> : `${sectionAAnswered}/${sectionATotal}`}
            </button>
            <button
              type="button"
              className={`nav-section-chip ${sectionBDone ? 'nav-section-chip--done' : ''}`}
              onClick={() => scrollToSection(sectionBRef)}
              aria-label={`Section B: ${sectionBAnswered} of ${sectionBTotal} answered`}
            >
              B {sectionBDone ? <CheckIcon size={12} aria-hidden="true" /> : `${sectionBAnswered}/${sectionBTotal}`}
            </button>
            <button
              type="button"
              className={`nav-section-chip ${sectionCDone ? 'nav-section-chip--done' : ''}`}
              onClick={() => scrollToSection(sectionCRef)}
              aria-label={`Section C: ${sectionCAnswered} of ${sectionCTotal} answered`}
            >
              C {sectionCDone ? <CheckIcon size={12} aria-hidden="true" /> : `${sectionCAnswered}/${sectionCTotal}`}
            </button>
          </div>
          <div className="v2-form-nav-btns">
            <button
              className="btn-calculate"
              onClick={handleSubmit}
              disabled={!canProceedResult}
              title={!canProceedResult ? t('part1.nav.calculateTitleDisabled') : t('part1.nav.calculateTitleEnabled')}
            >
              {canProceedResult
                ? t('part1.nav.calculate')
                : t('part1.nav.calculateIncomplete', { answeredCount, totalQuestions })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Part1Form;
