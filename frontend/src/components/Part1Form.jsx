import React, { useState, useEffect } from 'react';
import './Part1Form.css';
import './epsa-v2-layout.css';
import InfoIcon from './InfoIcon';
import { fieldReferences } from '../utils/fieldReferences';
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
  <span
    style={{
      display: 'inline-block',
      padding: '3px 10px',
      fontSize: '11px',
      fontWeight: 700,
      letterSpacing: '0.04em',
      borderRadius: '12px',
      background: '#1e40af',
      color: '#fff',
      marginLeft: '8px',
      verticalAlign: 'middle',
      whiteSpace: 'nowrap',
    }}
  >
    AUA/SUO 2026
  </span>
);

const SectionBBadge = () => (
  <span
    style={{
      display: 'inline-block',
      padding: '3px 10px',
      fontSize: '11px',
      fontWeight: 600,
      letterSpacing: '0.03em',
      borderRadius: '12px',
      background: 'transparent',
      color: '#6b7280',
      border: '1.5px solid #d1d5db',
      marginLeft: '8px',
      verticalAlign: 'middle',
    }}
  >
    Research-based
  </span>
);

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
      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem' }}>
        {skipped ? (
          <span style={{ color: '#6B7280', fontStyle: 'italic' }}>
            {t('part1.skip.skippedLabel')}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => skipField(field)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#6B7280',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
              fontSize: '0.8125rem',
            }}
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
    guidelineRegion: formData.guidelineRegion || 'us',
    skippedFields: Array.isArray(formData.skippedFields) ? [...formData.skippedFields] : [],
  });

  const [formErrors, setFormErrors] = useState([]);
  const [attemptedNext, setAttemptedNext] = useState(false);
  const [ipssMode, setIpssMode] = useState('full');
  const [ipssShortChoice, setIpssShortChoice] = useState(null);

  const applyIpssShort = (choice) => {
    setIpssShortChoice(choice);
    const perQ = choice === 'none' ? 0 : choice === 'mild' ? 1 : choice === 'moderate' ? 3 : choice === 'severe' ? 5 : null;
    if (perQ != null) {
      setLocalData(prev => ({ ...prev, ipss: Array(7).fill(perQ) }));
    }
  };

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
    const ipssComplete = isSkipped('ipss') || (Array.isArray(localData.ipss) && localData.ipss.every(v => v !== null && v !== undefined));
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
    if (!isSkipped('inflammationHistory') && (localData.inflammationHistory === null || localData.inflammationHistory === undefined)) {
      errors.push(t('part1.errors.selectOption'));
    }
    if (!isSkipped('chemicalExposure') && !localData.chemicalExposure) {
      errors.push(t('part1.errors.validate.step3.chemicalInvalid'));
    }
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
    const hasInflammationHistory = hasOrSkipped('inflammationHistory', localData.inflammationHistory !== null && localData.inflammationHistory !== undefined);
    const hasBrca = hasOrSkipped('brcaStatus', localData.brcaStatus !== null && localData.brcaStatus !== undefined);
    const hasExercise = hasOrSkipped('exercise', localData.exercise !== null && localData.exercise !== undefined);
    const hasSmoking = hasOrSkipped('smoking', localData.smoking !== null && localData.smoking !== undefined);
    const hasChem = hasOrSkipped('chemicalExposure', localData.chemicalExposure !== null && localData.chemicalExposure !== undefined);
    const hasDiet = hasOrSkipped('dietPattern', localData.dietPattern !== '');
    const hasComorbidityScore = hasOrSkipped('comorbidityScore', localData.comorbidityScore !== null && localData.comorbidityScore !== undefined);
    const ipssComplete = isSkipped('ipss') || (Array.isArray(localData.ipss) && localData.ipss.length === 7 && localData.ipss.every(v => v !== null && v !== undefined));
    return hasAge && hasRace && hasFamilyHistory && hasInflammationHistory && hasBrca && hasHeight && hasWeight && hasBMI && hasExercise && hasSmoking && hasChem && hasDiet && hasComorbidityScore && ipssComplete;
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
  const ipssComplete = localData.ipss.every(v => v !== null && v !== undefined);
  const ipssAnsweredCount = localData.ipss.filter(v => v !== null && v !== undefined).length;
  const ipssQuestions = IPSS_QUESTION_KEYS.map(k => t(k));
  const ipssLabels = [0, 1, 2, 3, 4, 5].map(v => ({ value: v, label: t(IPSS_LABEL_KEY_BY_VALUE[v]) }));

  const exerciseValid = localData.exercise !== null && localData.exercise !== undefined;
  const smokingValid = localData.smoking !== null && localData.smoking !== undefined;
  const chemicalValid = !!localData.chemicalExposure;
  const dietValid = !!localData.dietPattern;
  const inflammationHistoryValid = localData.inflammationHistory !== null && localData.inflammationHistory !== undefined;
  const brcaValid = !!localData.brcaStatus;
  const comorbiditiesValid = localData.comorbidityScore !== null && localData.comorbidityScore !== undefined;

  const totalQuestions = 19; // 12 core + 7 IPSS
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
    return count;
  };

  const answeredCount = countAnswered();
  const canProceedResult = canProceed();

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
      <div className="part1-section-header part1-section-header--a">
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
          {ageValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
          <QuestionSubtext i18nKey="part1.fields.age.helper" />
          <input
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
              <div role="note" style={{ marginTop: '8px', padding: '8px 10px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '6px', fontSize: '0.8rem', color: '#78350f' }}>
                <strong>Age under 40:</strong> PSA screening is not routinely recommended per AUA/NCCN guidelines. You can still complete the questionnaire — your clinician can review the results.
              </div>
            );
            if (n > 75) return (
              <div role="note" style={{ marginTop: '8px', padding: '8px 10px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '6px', fontSize: '0.8rem', color: '#78350f' }}>
                <strong>Age over 75:</strong> Continued PSA screening requires individualized assessment based on health and life expectancy (AUA/NCCN). Discuss with your physician.
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
          {raceValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
          <QuestionSubtext i18nKey="part1.fields.race.helper" />
          <div className="option-grid c2">
            {[
              { value: 'white', label: t('part1.race.white') },
              { value: 'black', label: t('part1.race.black') },
              { value: 'hispanic', label: t('part1.race.hispanic') },
              { value: 'asian', label: t('part1.race.asian') },
              { value: 'mixed', label: t('part1.race.mixed') },
              { value: 'other', label: t('part1.race.other') },
            ].map(opt => (
              <button
                key={opt.value}
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

      {/* Family history */}
      <div className="question-card" style={{ borderColor: familyHistoryValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">3</div>
          <div className="question-text">{t('part1.step1.familyHistory.title')} <GuidelineBadge /></div>
          <InfoIcon {...fieldReferences.familyHistory} />
          {familyHistoryValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
          <QuestionSubtext i18nKey="part1.fields.familyHistory.helper" />
          <div className="option-grid c4">
            {[
              { value: 0, label: t('quickEntry.family.none') },
              { value: 1, label: t('quickEntry.family.one') },
              { value: 2, label: t('quickEntry.family.twoPlus') },
              { value: 'unknown', label: t('part1.options.unknown') },
            ].map(opt => (
              <button
                key={opt.value}
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

      {/* Height */}
      <div className="question-card" style={{ borderColor: heightValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">4</div>
          <div className="question-text">{t('part1.step2.heightQuestion')}</div>
          <InfoIcon {...fieldReferences.heightWeight} />
          {heightValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
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
              <input type="number" className="input-field" placeholder={t('part1.step2.heightImperialFeetPlaceholder')} value={localData.heightFt} onChange={(e) => updateField('heightFt', e.target.value)} />
              <input type="number" className="input-field" placeholder={t('part1.step2.heightImperialInchesPlaceholder')} value={localData.heightIn} onChange={(e) => updateField('heightIn', e.target.value)} />
            </div>
          ) : (
            <input type="number" className="input-field" placeholder={t('part1.step2.heightMetricPlaceholder')} value={localData.heightCm} onChange={(e) => updateField('heightCm', e.target.value)} />
          )}
        </div>
      </div>

      {/* Weight */}
      <div className="question-card" style={{ borderColor: weightValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">5</div>
          <div className="question-text">{t('part1.step2.weightQuestion')}</div>
          <InfoIcon {...fieldReferences.heightWeight} />
          {weightValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
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
            <input type="number" className="input-field" placeholder={t('part1.step2.weightMetricPlaceholder')} value={localData.weightKg} onChange={(e) => updateField('weightKg', e.target.value)} />
          ) : (
            <input type="number" className="input-field" placeholder={t('part1.step2.weightImperialPlaceholder')} value={localData.weight} onChange={(e) => updateField('weight', e.target.value)} />
          )}
          <div className="question-note" style={{ marginTop: '8px', fontSize: '0.875rem', color: bmiValid ? '#27AE60' : undefined }}>
            {t('part1.step2.bmiLabel')}: <strong>{localData.bmi > 0 ? localData.bmi.toFixed(1) : '—'}</strong>
            {bmiValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
          </div>
        </div>
      </div>

      {/* IPSS */}
      <div className="part1-step">
        <div className="question-card" style={{ borderColor: ipssComplete ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px', marginBottom: '8px', paddingBottom: '0.75rem' }}>
          <div className="question-header">
            <div className="question-number">6</div>
            <div className="question-text" style={{ flex: 1 }}>{t('part1.steps.ipss.sectionTitle')} <GuidelineBadge /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <InfoIcon {...fieldReferences.ipss} />
              {ipssComplete ? (
                <CheckIcon size={16} style={{ color: '#27AE60' }} />
              ) : (
                <span style={{ color: attemptedNext ? '#E74C3C' : '#6b7280', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                  {ipssAnsweredCount}/7
                </span>
              )}
            </div>
          </div>
          <div className="question-body" style={{ marginTop: 0 }}>
            <div className="question-note" style={{ marginBottom: 0, fontSize: '0.875rem' }}>
              {t('part1.ipss.note')}
            </div>
          </div>
        </div>
        <div className="question-note" style={{ marginBottom: '16px', fontSize: '0.875rem' }}>
          {t('part1.ipss.note')}
        </div>

        <div className="ipss-short-toggle" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <button type="button" className={`option-btn ${ipssMode === 'full' ? 'selected' : ''}`} style={{ flex: '1 1 200px', fontSize: '0.8125rem' }} onClick={() => { setIpssMode('full'); setIpssShortChoice(null); }}>
            {t('part1.ipssShort.toggleFull')}
          </button>
          <button type="button" className={`option-btn ${ipssMode === 'short' ? 'selected' : ''}`} style={{ flex: '1 1 200px', fontSize: '0.8125rem' }} onClick={() => setIpssMode('short')}>
            {t('part1.ipssShort.toggleShort')}
          </button>
          <button type="button" className="option-btn" style={{ flex: '1 1 200px', fontSize: '0.8125rem' }} onClick={() => { setIpssMode('short'); applyIpssShort('none'); }}>
            {t('part1.ipssShort.skip')}
          </button>
        </div>

        {ipssMode === 'short' && (
          <div className="question-card" style={{ borderColor: ipssShortChoice ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
            <div className="question-header">
              <div className="question-text">{t('part1.ipssShort.singleQuestionLabel')}</div>
              {ipssShortChoice && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
            </div>
            <div className="question-body">
              <div className="option-grid c2">
                {[
                  { value: 'none', label: t('part1.ipssShort.options.none') },
                  { value: 'mild', label: t('part1.ipssShort.options.mild') },
                  { value: 'moderate', label: t('part1.ipssShort.options.moderate') },
                  { value: 'severe', label: t('part1.ipssShort.options.severe') },
                ].map(opt => (
                  <button key={opt.value} type="button" className={`option-btn ${ipssShortChoice === opt.value ? 'selected' : ''}`} onClick={() => applyIpssShort(opt.value)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {ipssMode === 'full' && ipssQuestions.map((q, index) => (
          <div key={index} className="question-card" style={{ borderColor: localData.ipss[index] !== null ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
            <div className="question-header">
              <div className="question-number">{index + 1}</div>
              <div className="question-text">{q}</div>
              {localData.ipss[index] !== null && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
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
        {ipssMode === 'full' && (
          <div className="score-total" style={{ color: ipssComplete ? '#27AE60' : undefined }}>
            {t('part1.ipss.totalLabel')}: {ipssComplete ? localData.ipss.reduce((a, b) => a + b, 0) : '—'} / 35
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          Section divider
          ═══════════════════════════════════════════════════════════ */}
      <div className="part1-section-divider" aria-hidden="true" />

      {/* ═══════════════════════════════════════════════════════════
          SECTION B — Additional Risk Factors
          ═══════════════════════════════════════════════════════════ */}
      <div className="part1-section-header part1-section-header--b">
        <div className="part1-section-header-top">
          <span className="part1-section-letter part1-section-letter--b">B</span>
          <h4 className="part1-section-title">
            Additional Risk Factors
            <SectionBBadge />
          </h4>
        </div>
        <p className="part1-section-subtitle part1-section-subtitle--b">
          These factors are associated with prostate cancer risk in published research but are not part of current AUA/NCCN screening guidelines. They add context to your result.
        </p>
      </div>

      {/* Exercise */}
      <div className="question-card" style={{ borderColor: exerciseValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">7</div>
          <div className="question-text">{t('part1.fields.exercise.title')}</div>
          <NonGuidelineBadge />
          <InfoIcon {...fieldReferences.exercise} />
          {exerciseValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
          <QuestionSubtext i18nKey="part1.fields.exercise.helper" />
          <div className="option-grid c3">
            {[
              { value: 0, label: t('part1.step3.exercise.regular'), Icon: Dumbbell },
              { value: 1, label: t('part1.step3.exercise.some'), Icon: Activity },
              { value: 2, label: t('part1.step3.exercise.none'), Icon: Sofa },
            ].map(opt => (
              <button key={opt.value} className={`option-btn ${localData.exercise === opt.value ? 'selected' : ''}`} onClick={() => updateField('exercise', opt.value)}>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <opt.Icon size={18} />
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
          {smokingValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
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
              { value: 'indian', label: t('part1.step4.diet.indian'), Icon: Flame },
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
          {inflammationHistoryValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
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
          {chemicalValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
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

      {/* BRCA status */}
      <div className="question-card" style={{ borderColor: brcaValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">12</div>
          <div className="question-text">{t('part1.fields.brcaStatus.title')}</div>
          <NonGuidelineBadge />
          <InfoIcon {...fieldReferences.brcaStatus} />
          {brcaValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
          <QuestionSubtext i18nKey="part1.fields.brcaStatus.helper" />
          <div className="option-grid c3">
            {[
              { value: 'yes', label: 'Yes — confirmed mutation' },
              { value: 'no', label: 'Tested — no mutation' },
              { value: 'unknown', label: 'Never tested / unsure' },
            ].map(opt => (
              <button key={opt.value} className={`option-btn ${localData.brcaStatus === opt.value ? 'selected' : ''}`} onClick={() => updateField('brcaStatus', opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
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
          {comorbiditiesValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
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

      {/* Submit */}
      <div className="v2-form-nav">
        <div className="v2-form-nav-inner">
          <div className="v2-form-nav-status">
            <span><strong>{answeredCount} of {totalQuestions}</strong> answered</span>
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
