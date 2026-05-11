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

const SHIM_QUESTION_KEYS = [
  {
    qKey: 'part1.shim.q1',
    opts: [
      [1, 'part1.shim.q1.opt1'],
      [2, 'part1.shim.q1.opt2'],
      [3, 'part1.shim.q1.opt3'],
      [4, 'part1.shim.q1.opt4'],
      [5, 'part1.shim.q1.opt5'],
    ],
  },
  {
    qKey: 'part1.shim.q2',
    opts: [
      [0, 'part1.shim.q2.opt0'],
      [1, 'part1.shim.q2.opt1'],
      [2, 'part1.shim.q2.opt2'],
      [3, 'part1.shim.q2.opt3'],
      [4, 'part1.shim.q2.opt4'],
      [5, 'part1.shim.q2.opt5'],
    ],
  },
  {
    qKey: 'part1.shim.q3',
    opts: [
      [0, 'part1.shim.q3.opt0'],
      [1, 'part1.shim.q3.opt1'],
      [2, 'part1.shim.q3.opt2'],
      [3, 'part1.shim.q3.opt3'],
      [4, 'part1.shim.q3.opt4'],
      [5, 'part1.shim.q3.opt5'],
    ],
  },
  {
    qKey: 'part1.shim.q4',
    opts: [
      [0, 'part1.shim.q4.opt0'],
      [1, 'part1.shim.q4.opt1'],
      [2, 'part1.shim.q4.opt2'],
      [3, 'part1.shim.q4.opt3'],
      [4, 'part1.shim.q4.opt4'],
      [5, 'part1.shim.q4.opt5'],
    ],
  },
  {
    qKey: 'part1.shim.q5',
    opts: [
      [0, 'part1.shim.q5.opt0'],
      [1, 'part1.shim.q5.opt1'],
      [2, 'part1.shim.q5.opt2'],
      [3, 'part1.shim.q5.opt3'],
      [4, 'part1.shim.q5.opt4'],
      [5, 'part1.shim.q5.opt5'],
    ],
  },
];

const Part1Form = ({ formData, setFormData, onNext, onBack, currentStep: part1Step }) => {
  const { t } = useTranslation();
  const QuestionSubtext = ({ i18nKey, children, style }) => (
    <div className="question-subtext" style={{ marginBottom: '12px', fontSize: '0.875rem', lineHeight: 1.5, ...style }}>
      {i18nKey ? t(i18nKey) : children}
    </div>
  );

  // Compact badge showing whether this Part 1 question is an AUA/NCCN screening
  // guideline factor or an ePSA-model-only factor. Rendered next to each question's
  // InfoIcon so users can see at a glance which inputs map to the official guidelines.
  const GuidelineBadge = ({ field }) => {
    const ref = fieldReferences[field];
    if (!ref || typeof ref.isGuideline !== 'boolean') return null;
    const guideline = ref.isGuideline;
    return (
      <span
        title={guideline ? t('info.guidelineNote') : t('info.modelOnlyNote')}
        style={{
          marginLeft: '8px',
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '999px',
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          background: guideline ? '#ecfdf5' : '#fff7ed',
          border: guideline ? '1px solid #10b981' : '1px solid #f59e0b',
          color: guideline ? '#047857' : '#b45309',
          whiteSpace: 'nowrap',
        }}
      >
        {guideline ? t('part1.guidelineBadge.guideline') : t('part1.guidelineBadge.modelOnly')}
      </span>
    );
  };

  // Small "Prefer not to say" control under skippable question cards.
  // Uses neutral defaults from SKIP_DEFAULTS so the engine still receives valid values.
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
              fontSize: '0.8125rem'
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
    shim: formData.shim || Array(5).fill(null),
    guidelineRegion: formData.guidelineRegion || 'us',
    skippedFields: Array.isArray(formData.skippedFields) ? [...formData.skippedFields] : [],
  });

  const [stepErrors, setStepErrors] = useState({});
  const [attemptedNext, setAttemptedNext] = useState(false);

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
    localData.weightKg
  ]);

  useEffect(() => {
    setFormData(localData);
  }, [localData, setFormData]);

  // Neutral defaults used to satisfy the engine when a user explicitly skips
  // a non-essential question. These are population-typical / lowest-leverage values
  // that minimize the influence of the skipped factor on the final score.
  const SKIP_DEFAULTS = {
    familyHistory: 0,
    inflammationHistory: 0,
    brcaStatus: 'unknown',
    exercise: 1,           // "some"
    smoking: 0,            // "never"
    chemicalExposure: 'unknown',
    dietPattern: 'other',
    comorbidityScore: 0,
    ipss: Array(7).fill(0),
    shim: [4, 4, 4, 4, 4], // total 20 — population-typical for mid-age males (mild range)
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
    if (field === 'age') {
      // Always allow typing, only validate on blur or submit
      setLocalData(prev => ({ ...prev, [field]: value, skippedFields: clearSkip(prev, field) }));
      return;
    }

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

  // Counts a field as "answered" only if it has a real value AND is not in skippedFields.
  // Skipped fields carry neutral defaults but should not count toward answered totals.
  const countAnswered = () => {
    let count = 0;
    const skipped = (f) => isSkipped(f);

    if (localData.age) count++;
    if (localData.race !== null && localData.race !== undefined && localData.race !== '') count++;
    if (!skipped('familyHistory') && localData.familyHistory !== null && localData.familyHistory !== undefined) count++;
    if (!skipped('inflammationHistory') && localData.inflammationHistory !== null && localData.inflammationHistory !== undefined) count++;
    if (!skipped('brcaStatus') && localData.brcaStatus !== null && localData.brcaStatus !== undefined) count++;
    if (hasValidHeight()) count++;
    if (hasValidWeight()) count++;
    if (!skipped('exercise') && localData.exercise !== null && localData.exercise !== undefined) count++;
    if (!skipped('smoking') && localData.smoking !== null && localData.smoking !== undefined) count++;
    if (!skipped('chemicalExposure') && localData.chemicalExposure !== null && localData.chemicalExposure !== undefined) count++;
    if (!skipped('dietPattern') && localData.dietPattern !== '') count++;
    if (!skipped('comorbidityScore') && localData.comorbidityScore !== null && localData.comorbidityScore !== undefined) count++;

    if (!skipped('ipss')) {
      localData.ipss.forEach(v => { if (v !== null && v !== undefined) count++; });
    }
    if (!skipped('shim')) {
      localData.shim.forEach(v => { if (v !== null && v !== undefined) count++; });
    }

    return count;
  };

  const countSkipped = () => {
    if (!Array.isArray(localData.skippedFields)) return 0;
    let n = 0;
    for (const f of localData.skippedFields) {
      if (f === 'ipss') n += 7;
      else if (f === 'shim') n += 5;
      else n += 1;
    }
    return n;
  };

  // canProceed allows skipped fields (which carry neutral defaults) to satisfy the engine.
  // Only age + race are strictly required. Height/weight require valid numeric input
  // (no skip option for BMI — the calculator needs it for adiposity scoring).
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
    const shimComplete = isSkipped('shim') || (Array.isArray(localData.shim) && localData.shim.length === 5 && localData.shim.every(v => v !== null && v !== undefined));

    return hasAge && hasRace && hasFamilyHistory && hasInflammationHistory && hasBrca && hasHeight && hasWeight && hasBMI && hasExercise && hasSmoking && hasChem && hasDiet && hasComorbidityScore && ipssComplete && shimComplete;
  };

  const renderStep0 = () => {
    const ageNum = parseInt(localData.age, 10);
    const ageValid = localData.age && !isNaN(ageNum) && ageNum >= 18 && ageNum <= 120;
    const raceValid = !!localData.race;
    
    return (
    <div className="part1-step">
      <div className="v2-section-label">
        <span className="v2-section-eyebrow">Section 1 · 2 questions</span>
        <span className="v2-section-title">{t('part1.steps.aboutYou.sectionTitle')}</span>
      </div>

      <div className="question-card" style={{ borderColor: ageValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">1</div>
          <div className="question-text">{t('part1.fields.age.title')}</div>
          <InfoIcon {...fieldReferences.age} />
          <GuidelineBadge field="age" />
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
            <div style={{ color: '#E74C3C', fontSize: '0.75rem', marginTop: '4px' }}>
              {t('part1.errors.step0.ageInline')}
            </div>
          )}
        </div>
      </div>

      <div className="question-card" style={{ borderColor: raceValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">2</div>
          <div className="question-text">{t('part1.fields.race.title')}</div>
          <InfoIcon {...fieldReferences.race} />
          <GuidelineBadge field="race" />
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
            <div style={{ color: '#E74C3C', fontSize: '0.75rem', marginTop: '4px' }}>
              {t('part1.errors.step0.raceInline')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
  };

  const renderStep1 = () => {
    const familyHistoryValid = localData.familyHistory !== null && localData.familyHistory !== undefined;
    const inflammationHistoryValid = localData.inflammationHistory !== null && localData.inflammationHistory !== undefined;
    const brcaValid = !!localData.brcaStatus;
    
    return (
    <div className="part1-step">
      <div className="v2-section-label">
        <span className="v2-section-eyebrow">Section 2 · 3 questions</span>
        <span className="v2-section-title">{t('part1.steps.familyGeneticRisk.sectionTitle')}</span>
      </div>

      <div className="question-card" style={{ borderColor: familyHistoryValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">3</div>
          <div className="question-text">{t('part1.step1.familyHistory.title')}</div>
          <InfoIcon {...fieldReferences.familyHistory} />
          <GuidelineBadge field="familyHistory" />
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
            <div style={{ color: '#E74C3C', fontSize: '0.75rem', marginTop: '8px' }}>
              {t('part1.errors.selectOption')}
            </div>
          )}
          <SkipLink field="familyHistory" />
        </div>
      </div>

      <div className="question-card" style={{ borderColor: inflammationHistoryValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">4</div>
          <div className="question-text">{t('part1.step1.inflammationHistory.title')}</div>
          <InfoIcon {...fieldReferences.inflammationHistory} />
          <GuidelineBadge field="inflammationHistory" />
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
              <button
                key={opt.value}
                className={`option-btn ${localData.inflammationHistory === opt.value ? 'selected' : ''}`}
                onClick={() => updateField('inflammationHistory', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {attemptedNext && !inflammationHistoryValid && !isSkipped('inflammationHistory') && (
            <div style={{ color: '#E74C3C', fontSize: '0.75rem', marginTop: '8px' }}>
              {t('part1.errors.selectOption')}
            </div>
          )}
          <SkipLink field="inflammationHistory" />
        </div>
      </div>

      <div className="question-card" style={{ borderColor: brcaValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">5</div>
          <div className="question-text">{t('part1.fields.brcaStatus.title')}</div>
          <InfoIcon {...fieldReferences.brcaStatus} />
          <GuidelineBadge field="brcaStatus" />
          {brcaValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
          <QuestionSubtext i18nKey="part1.fields.brcaStatus.helper" />
          <div className="option-grid c3">
            {[
              { value: 'yes', label: t('part1.options.yes') },
              { value: 'no', label: t('part1.options.no') },
              { value: 'unknown', label: t('part1.options.unknown') },
            ].map(opt => (
              <button
                key={opt.value}
                className={`option-btn ${localData.brcaStatus === opt.value ? 'selected' : ''}`}
                onClick={() => updateField('brcaStatus', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {attemptedNext && !brcaValid && !isSkipped('brcaStatus') && (
            <div style={{ color: '#E74C3C', fontSize: '0.75rem', marginTop: '8px' }}>
              {t('part1.errors.selectOption')}
            </div>
          )}
          <SkipLink field="brcaStatus" />
        </div>
      </div>
    </div>
  );
  };

  const renderStep2 = () => {
    const heightValid = hasValidHeight();
    const weightValid = hasValidWeight();
    const bmiValid = localData.bmi > 0;
    
    return (
    <div className="part1-step">
      <div className="v2-section-label">
        <span className="v2-section-eyebrow">Section 3 · 2 measurements</span>
        <span className="v2-section-title">{t('part1.steps.bodyMetrics.sectionTitle')}</span>
      </div>

      <div className="question-card" style={{ borderColor: heightValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">6</div>
          <div className="question-text">{t('part1.step2.heightQuestion')}</div>
          <InfoIcon {...fieldReferences.heightWeight} />
          <GuidelineBadge field="heightWeight" />
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
          {localData.heightUnit === 'imperial' && localData.heightFt && (parseInt(localData.heightFt, 10) < 3 || parseInt(localData.heightFt, 10) > 8) && (
            <div style={{ color: '#E74C3C', fontSize: '0.75rem', marginTop: '4px' }}>
              {t('part1.step2.heightImperialFeetError')}
            </div>
          )}
          {localData.heightUnit === 'imperial' && localData.heightIn && (parseInt(localData.heightIn, 10) < 0 || parseInt(localData.heightIn, 10) > 11) && (
            <div style={{ color: '#E74C3C', fontSize: '0.75rem', marginTop: '4px' }}>
              {t('part1.step2.heightImperialInchesError')}
            </div>
          )}
          {localData.heightUnit === 'metric' && localData.heightCm && (parseFloat(localData.heightCm) < 100 || parseFloat(localData.heightCm) > 250) && (
            <div style={{ color: '#E74C3C', fontSize: '0.75rem', marginTop: '4px' }}>
              {t('part1.step2.heightMetricError')}
            </div>
          )}
        </div>
      </div>

      <div className="question-card" style={{ borderColor: weightValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">7</div>
          <div className="question-text">{t('part1.step2.weightQuestion')}</div>
          <InfoIcon {...fieldReferences.heightWeight} />
          <GuidelineBadge field="heightWeight" />
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
          {localData.weightUnit === 'lbs' && localData.weight && (parseFloat(localData.weight) < 50 || parseFloat(localData.weight) > 500) && (
            <div style={{ color: '#E74C3C', fontSize: '0.75rem', marginTop: '4px' }}>
              {t('part1.step2.weightImperialError')}
            </div>
          )}
          {localData.weightUnit === 'kg' && localData.weightKg && (parseFloat(localData.weightKg) < 25 || parseFloat(localData.weightKg) > 250) && (
            <div style={{ color: '#E74C3C', fontSize: '0.75rem', marginTop: '4px' }}>
              {t('part1.step2.weightMetricError')}
            </div>
          )}

          <div className="question-note" style={{ marginTop: '8px', fontSize: '0.875rem', color: bmiValid ? '#27AE60' : undefined }}>
            {t('part1.step2.bmiLabel')}: <strong>{localData.bmi > 0 ? localData.bmi.toFixed(1) : '—'}</strong>
            {bmiValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
          </div>
        </div>
      </div>
    </div>
  );
  };

  const renderStep3 = () => {
    const exerciseValid = localData.exercise !== null && localData.exercise !== undefined;
    const smokingValid = localData.smoking !== null && localData.smoking !== undefined;
    const chemicalValid = !!localData.chemicalExposure;
    
    return (
    <div className="part1-step">
      <div className="v2-section-label">
        <span className="v2-section-eyebrow">Section 4 · 3 questions</span>
        <span className="v2-section-title">{t('part1.steps.lifestyle.sectionTitle')}</span>
      </div>

      <div className="question-card" style={{ borderColor: exerciseValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">8</div>
          <div className="question-text">{t('part1.fields.exercise.title')}</div>
          <InfoIcon {...fieldReferences.exercise} />
          <GuidelineBadge field="exercise" />
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
              <button
                key={opt.value}
                className={`option-btn ${localData.exercise === opt.value ? 'selected' : ''}`}
                onClick={() => updateField('exercise', opt.value)}
              >
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <opt.Icon size={18} />
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
          {attemptedNext && !exerciseValid && !isSkipped('exercise') && (
            <div style={{ color: '#E74C3C', fontSize: '0.75rem', marginTop: '8px' }}>
              {t('part1.errors.selectOption')}
            </div>
          )}
          <SkipLink field="exercise" />
        </div>
      </div>

      <div className="question-card" style={{ borderColor: smokingValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">9</div>
          <div className="question-text">{t('part1.fields.smoking.title')}</div>
          <InfoIcon {...fieldReferences.smoking} />
          <GuidelineBadge field="smoking" />
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
              <button
                key={opt.value}
                className={`option-btn ${localData.smoking === opt.value ? 'selected' : ''}`}
                onClick={() => updateField('smoking', opt.value)}
              >
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <opt.Icon size={18} />
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
          {attemptedNext && !smokingValid && !isSkipped('smoking') && (
            <div style={{ color: '#E74C3C', fontSize: '0.75rem', marginTop: '8px' }}>
              {t('part1.errors.selectOption')}
            </div>
          )}
          <SkipLink field="smoking" />
        </div>
      </div>

      <div className="question-card" style={{ borderColor: chemicalValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">10</div>
          <div className="question-text">{t('part1.step3.chemicalQuestion')}</div>
          <InfoIcon {...fieldReferences.chemicalExposure} />
          <GuidelineBadge field="chemicalExposure" />
          {chemicalValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
          <QuestionSubtext i18nKey="part1.fields.chemicalExposure.helper" />
          <div className="option-grid c3">
            {[
              { value: 'yes', label: t('part1.options.yes'), Icon: AlertTriangle },
              { value: 'no', label: t('part1.options.no'), Icon: CheckCircle2 },
              { value: 'unknown', label: t('part1.options.unknown'), Icon: HelpCircle },
            ].map(opt => (
              <button
                key={opt.value}
                className={`option-btn ${localData.chemicalExposure === opt.value ? 'selected' : ''}`}
                onClick={() => updateField('chemicalExposure', opt.value)}
              >
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <opt.Icon size={18} />
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
          {attemptedNext && !chemicalValid && !isSkipped('chemicalExposure') && (
            <div style={{ color: '#E74C3C', fontSize: '0.75rem', marginTop: '8px' }}>
              {t('part1.errors.selectOption')}
            </div>
          )}
          <SkipLink field="chemicalExposure" />
        </div>
      </div>
    </div>
  );
  };

  const renderStep4 = () => {
    const dietValid = !!localData.dietPattern;
    const htnValid = localData.hypertension !== null && localData.hypertension !== undefined;
    const hldValid = localData.hyperlipidemia !== null && localData.hyperlipidemia !== undefined;
    const cadValid = localData.coronaryArteryDisease !== null && localData.coronaryArteryDisease !== undefined;
    const diabetesValid = localData.diabetes !== null && localData.diabetes !== undefined;
    const comorbiditiesValid = localData.comorbidityScore !== null && localData.comorbidityScore !== undefined;
    
    return (
    <div className="part1-step">
      <div className="v2-section-label">
        <span className="v2-section-eyebrow">Section 5 · 2 questions</span>
        <span className="v2-section-title">{t('part1.steps.additionalInfo.sectionTitle')}</span>
      </div>

      <div className="question-card" style={{ borderColor: dietValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">11</div>
          <div className="question-text">{t('part1.fields.diet.title')}</div>
          <InfoIcon {...fieldReferences.diet} />
          <GuidelineBadge field="diet" />
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
              <button
                key={opt.value}
                className={`option-btn ${localData.dietPattern === opt.value ? 'selected' : ''}`}
                onClick={() => updateField('dietPattern', opt.value)}
              >
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <opt.Icon size={18} />
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
          {attemptedNext && !dietValid && !isSkipped('dietPattern') && (
            <div style={{ color: '#E74C3C', fontSize: '0.75rem', marginTop: '8px' }}>
              {t('part1.errors.selectOption')}
            </div>
          )}
          <SkipLink field="dietPattern" />
        </div>
      </div>

      <div className="question-card" style={{ borderColor: comorbiditiesValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">12</div>
          <div className="question-text">{t('part1.fields.comorbidities.title')}</div>
          <InfoIcon {...fieldReferences.comorbidities} />
          <GuidelineBadge field="comorbidities" />
          {comorbiditiesValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
          <QuestionSubtext>
            {t('part1.step4.comorbidities.prompt')}
          </QuestionSubtext>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '0.875rem' }}>{t('part1.step4.comorbidities.askAnyLabel')}</div>
            <div className="option-grid c2">
              <button
                type="button"
                className={`option-btn ${localData.comorbidityScore === 0 ? 'selected' : ''}`}
                onClick={() => setLocalData(prev => ({ ...prev, comorbidityScore: 0 }))}
              >
                {t('part1.options.no')}
              </button>
              <button
                type="button"
                className={`option-btn ${localData.comorbidityScore === 1 || localData.comorbidityScore === 2 ? 'selected' : ''}`}
                onClick={() => setLocalData(prev => ({ ...prev, comorbidityScore: prev.comorbidityScore === 1 || prev.comorbidityScore === 2 ? prev.comorbidityScore : 1 }))}
              >
                {t('part1.options.yes')}
              </button>
            </div>
          </div>
          {(localData.comorbidityScore === 1 || localData.comorbidityScore === 2) && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '0.875rem' }}>{t('part1.step4.comorbidities.howManyLabel')}</div>
              <div className="option-grid c2">
                <button
                  type="button"
                  className={`option-btn ${localData.comorbidityScore === 1 ? 'selected' : ''}`}
                  onClick={() => setLocalData(prev => ({ ...prev, comorbidityScore: 1 }))}
                >
                  {t('part1.step4.comorbidities.one')}
                </button>
                <button
                  type="button"
                  className={`option-btn ${localData.comorbidityScore === 2 ? 'selected' : ''}`}
                  onClick={() => setLocalData(prev => ({ ...prev, comorbidityScore: 2 }))}
                >
                  {t('part1.step4.comorbidities.twoOrMore')}
                </button>
              </div>
            </div>
          )}
          {attemptedNext && !comorbiditiesValid && !isSkipped('comorbidityScore') && (
            <div style={{ color: '#E74C3C', fontSize: '0.75rem', marginTop: '8px' }}>
              {t('part1.errors.comorbidityQuestions')}
            </div>
          )}
          <SkipLink field="comorbidityScore" />
        </div>
      </div>
    </div>
  );
  };

  const renderStep5 = () => {
    const ipssSkipped = isSkipped('ipss');
    const ipssComplete = ipssSkipped || localData.ipss.every(v => v !== null && v !== undefined);
    const answeredCount = localData.ipss.filter(v => v !== null && v !== undefined).length;
    const ipssQuestions = IPSS_QUESTION_KEYS.map((k) => t(k));
    const ipssLabels = [0, 1, 2, 3, 4, 5].map((v) => ({
      value: v,
      label: t(IPSS_LABEL_KEY_BY_VALUE[v]),
    }));

    return (
    <div className="part1-step">
      <div className="v2-section-label" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <span className="v2-section-eyebrow">Section 6 · 7 questions</span>
          <span className="v2-section-title">{t('part1.steps.ipss.sectionTitle')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
          <InfoIcon {...fieldReferences.ipss} />
          <GuidelineBadge field="ipss" />
          {ipssComplete && <CheckIcon size={16} style={{ color: '#27AE60' }} />}
          {!ipssComplete && attemptedNext && (
            <span style={{ color: '#E74C3C', fontSize: '0.75rem' }}>
              {t('part1.ipss.answeredCount', { answeredCount, total: 7 })}
            </span>
          )}
          {!ipssComplete && !attemptedNext && (
            <span className="question-subtext" style={{ fontSize: '0.75rem' }}>
              {t('part1.ipss.answeredCount', { answeredCount, total: 7 })}
            </span>
          )}
        </div>
      </div>
      <div className="question-note" style={{ marginBottom: '16px', fontSize: '0.875rem' }}>
        {t('part1.ipss.note')}
      </div>

      {/* Skip whole IPSS section */}
      <div style={{ marginBottom: '16px', padding: '10px 12px', border: '1px solid #E8ECF0', borderRadius: '8px', background: '#FAFBFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ fontSize: '0.8125rem', color: '#4B5563' }}>
          {ipssSkipped ? t('part1.skip.sectionSkippedNote') : t('part1.skip.sectionPrompt')}
        </div>
        {ipssSkipped ? (
          <button
            type="button"
            onClick={() => setLocalData(prev => ({ ...prev, skippedFields: clearSkip(prev, 'ipss'), ipss: Array(7).fill(null) }))}
            style={{ background: 'transparent', border: '1px solid #CBD5E1', color: '#374151', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8125rem' }}
          >
            {t('part1.skip.answerInstead')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => skipField('ipss')}
            style={{ background: 'transparent', border: '1px solid #CBD5E1', color: '#374151', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8125rem' }}
          >
            {t('part1.skip.skipSection')}
          </button>
        )}
      </div>

      {!ipssSkipped && ipssQuestions.map((q, index) => (
        <div key={index} className="question-card" style={{ 
          borderColor: localData.ipss[index] !== null ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', 
          borderWidth: '2px' 
        }}>
          <div className="question-header">
            <div className="question-number">{index + 1}</div>
            <div className="question-text">{q}</div>
            {localData.ipss[index] !== null && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
          </div>
          <div className="question-body">
            <QuestionSubtext i18nKey="part1.ipss.helper" />
            <div className="option-grid c3">
              {ipssLabels.map(({ value, label }) => (
                <button
                  key={value}
                  className={`option-btn ${localData.ipss[index] === value ? 'selected' : ''}`}
                  onClick={() => updateIPSS(index, value)}
                >
                  <span className="score">({value})</span> {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}
      {!ipssSkipped && (
        <div className="score-total" style={{ color: ipssComplete ? '#27AE60' : undefined }}>
          {t('part1.ipss.totalLabel')}: {ipssComplete ? localData.ipss.reduce((a, b) => a + b, 0) : '—'} / 35
        </div>
      )}
    </div>
  );
  };

  const renderStep6 = () => {
    const shimSkipped = isSkipped('shim');
    const shimComplete = shimSkipped || localData.shim.every(v => v !== null && v !== undefined);
    const answeredCount = localData.shim.filter(v => v !== null && v !== undefined).length;
    const shimQuestions = SHIM_QUESTION_KEYS.map((item) => ({
      q: t(item.qKey),
      opts: item.opts.map(([score, labelKey]) => [score, t(labelKey)]),
    }));

    const region = localData.guidelineRegion === 'eau_uk' ? 'eau_uk' : 'us';
    const isEau = region === 'eau_uk';
    const shimTotal = shimComplete ? localData.shim.reduce((a, b) => a + b, 0) : null;

    const SEVERITY_BANDS = [
      { key: 'severe',       labelKey: 'part1.shim.severitySevere',       range: '1–7',   color: '#dc2626', bg: '#fef2f2', min: 1,  max: 7  },
      { key: 'moderate',     labelKey: 'part1.shim.severityModerate',     range: '8–11',  color: '#ea580c', bg: '#fff7ed', min: 8,  max: 11 },
      { key: 'mildModerate', labelKey: 'part1.shim.severityMildModerate', range: '12–16', color: '#d97706', bg: '#fffbeb', min: 12, max: 16 },
      { key: 'mild',         labelKey: 'part1.shim.severityMild',         range: '17–21', color: '#2563eb', bg: '#eff6ff', min: 17, max: 21 },
      { key: 'none',         labelKey: 'part1.shim.severityNone',         range: '22–25', color: '#16a34a', bg: '#f0fdf4', min: 22, max: 25 },
    ];
    const activeBandKey = shimTotal == null ? null : (SEVERITY_BANDS.find(b => shimTotal >= b.min && shimTotal <= b.max)?.key || null);

    return (
    <div className="part1-step">
      <div className="v2-section-label" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <span className="v2-section-eyebrow">Section 7 · 5 questions</span>
          <span className="v2-section-title">
            {isEau ? t('part1.steps.shim.sectionTitleIief') : t('part1.steps.shim.sectionTitle')}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
          <InfoIcon {...fieldReferences.shim} />
          <GuidelineBadge field="shim" />
          {shimComplete && <CheckIcon size={16} style={{ color: '#27AE60' }} />}
          {!shimComplete && (
            <span className={!attemptedNext ? 'question-subtext' : undefined} style={{ color: attemptedNext ? '#E74C3C' : undefined, fontSize: '0.75rem' }}>
              {t('part1.shim.answeredCount', { answeredCount, total: 5 })}
            </span>
          )}
        </div>
      </div>

      {/* Guideline region toggle (SHIM ↔ IIEF-5 label switch) */}
      <div
        role="radiogroup"
        aria-label={t('part1.shim.regionLabel')}
        style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px',
          margin: '0 0 10px', padding: '8px 10px',
          background: '#f3f8fc', border: '1px solid #d6e6f1', borderRadius: '8px',
          fontSize: '0.8125rem',
        }}
      >
        <span style={{ fontWeight: 600, color: '#1a5c86' }}>{t('part1.shim.regionLabel')}:</span>
        {[
          { val: 'us',      label: t('part1.shim.regionUs') },
          { val: 'eau_uk',  label: t('part1.shim.regionEau') },
        ].map(({ val, label }) => {
          const active = region === val;
          return (
            <button
              key={val}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setLocalData(prev => ({ ...prev, guidelineRegion: val }))}
              style={{
                padding: '4px 10px', borderRadius: '20px',
                border: `1px solid ${active ? '#1a5c86' : '#cbd9e6'}`,
                background: active ? '#1a5c86' : '#fff',
                color: active ? '#fff' : '#3a5a72',
                fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="question-subtext" style={{ marginBottom: '12px', fontSize: '0.8125rem', lineHeight: 1.5, color: '#5a7a92' }}>
        {isEau ? t('part1.shim.regionNoteEau') : t('part1.shim.regionNoteUs')}
      </div>

      <div className="question-note" style={{ marginBottom: '16px', fontSize: '0.875rem' }}>
        {t('part1.shim.note')}
      </div>

      {/* Skip whole SHIM section */}
      <div style={{ marginBottom: '16px', padding: '10px 12px', border: '1px solid #E8ECF0', borderRadius: '8px', background: '#FAFBFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ fontSize: '0.8125rem', color: '#4B5563' }}>
          {shimSkipped ? t('part1.skip.sectionSkippedNote') : t('part1.skip.sectionPrompt')}
        </div>
        {shimSkipped ? (
          <button
            type="button"
            onClick={() => setLocalData(prev => ({ ...prev, skippedFields: clearSkip(prev, 'shim'), shim: Array(5).fill(null) }))}
            style={{ background: 'transparent', border: '1px solid #CBD5E1', color: '#374151', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8125rem' }}
          >
            {t('part1.skip.answerInstead')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => skipField('shim')}
            style={{ background: 'transparent', border: '1px solid #CBD5E1', color: '#374151', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8125rem' }}
          >
            {t('part1.skip.skipSection')}
          </button>
        )}
      </div>

      {!shimSkipped && shimQuestions.map((item, index) => (
        <div key={index} className="question-card" style={{
          borderColor: localData.shim[index] !== null ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0',
          borderWidth: '2px'
        }}>
          <div className="question-header">
            <div className="question-number">{index + 1}</div>
            <div className="question-text">{item.q}</div>
            {localData.shim[index] !== null && <CheckIcon size={16} style={{ color: '#27AE60', marginLeft: '8px' }} />}
          </div>
          <div className="question-body">
            <QuestionSubtext i18nKey="part1.shim.helper" />
            <div className="option-grid c3">
              {item.opts.map(([score, label]) => (
                <button key={score} className={`option-btn ${localData.shim[index] === score ? 'selected' : ''}`} onClick={() => updateSHIM(index, score)}>
                  <span className="score">({score})</span> {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}
      {!shimSkipped && (
        <div className="score-total" style={{ color: shimComplete ? '#27AE60' : undefined }}>
          {isEau ? t('part1.shim.totalLabelIief') : t('part1.shim.totalLabel')}: {shimComplete ? shimTotal : '—'} / 25
        </div>
      )}

      {/* Severity bands — always visible to clarify mild vs moderate ED */}
      <div style={{ marginTop: '12px', padding: '12px 14px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#374151', marginBottom: '8px' }}>
          {t('part1.shim.severityHeading')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '6px' }}>
          {SEVERITY_BANDS.map(band => {
            const isActive = activeBandKey === band.key;
            return (
              <div
                key={band.key}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: isActive ? band.bg : '#fff',
                  border: `1.5px solid ${isActive ? band.color : '#e5e7eb'}`,
                  display: 'flex', flexDirection: 'column', gap: '2px',
                }}
                aria-current={isActive ? 'true' : undefined}
              >
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: isActive ? band.color : '#374151' }}>
                  {t(band.labelKey)}
                </span>
                <span style={{ fontSize: '0.75rem', color: isActive ? band.color : '#6b7280', fontWeight: 600 }}>
                  Score {band.range}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
  };

  const steps = [
    { label: t('part1.steps.aboutYou.shortLabel'), render: renderStep0 },
    { label: t('part1.steps.familyGeneticRisk.shortLabel'), render: renderStep1 },
    { label: t('part1.steps.bodyMetrics.shortLabel'), render: renderStep2 },
    { label: t('part1.steps.lifestyle.shortLabel'), render: renderStep3 },
    { label: t('part1.steps.additionalInfo.shortLabel'), render: renderStep4 },
    { label: t('part1.steps.ipss.shortLabel'), render: renderStep5 },
    { label: t('part1.steps.shim.shortLabel'), render: renderStep6 },
  ];

  const validateStep = (step) => {
    const errors = [];
    
    if (step === 0) {
      const ageNum = parseInt(localData.age, 10);
      if (!localData.age || isNaN(ageNum) || ageNum < 18 || ageNum > 120) {
        errors.push(t('part1.errors.validate.step0.ageInvalid'));
      }
      if (!localData.race) {
        errors.push(t('part1.errors.validate.step0.raceInvalid'));
      }
    }
    
    if (step === 1) {
      if (!isSkipped('familyHistory') && (localData.familyHistory === null || localData.familyHistory === undefined)) {
        errors.push(t('part1.errors.validate.step1.familyHistoryInvalid'));
      }
      if (!isSkipped('brcaStatus') && !localData.brcaStatus) {
        errors.push(t('part1.errors.validate.step1.brcaInvalid'));
      }
    }
    
    if (step === 2) {
      if (!hasValidHeight()) {
        errors.push(t('part1.errors.validate.step2.heightInvalid'));
      }
      if (!hasValidWeight()) {
        errors.push(t('part1.errors.validate.step2.weightInvalid'));
      }
      if (localData.bmi <= 0) {
        errors.push(t('part1.errors.validate.step2.bmiInvalid'));
      }
    }
    
    if (step === 3) {
      if (!isSkipped('exercise') && (localData.exercise === null || localData.exercise === undefined)) {
        errors.push(t('part1.errors.validate.step3.exerciseInvalid'));
      }
      if (!isSkipped('smoking') && (localData.smoking === null || localData.smoking === undefined)) {
        errors.push(t('part1.errors.validate.step3.smokingInvalid'));
      }
      if (!isSkipped('chemicalExposure') && !localData.chemicalExposure) {
        errors.push(t('part1.errors.validate.step3.chemicalInvalid'));
      }
    }

    if (step === 4) {
      if (!isSkipped('dietPattern') && !localData.dietPattern) {
        errors.push(t('part1.errors.validate.step4.dietInvalid'));
      }
      if (!isSkipped('comorbidityScore') && (localData.comorbidityScore === null || localData.comorbidityScore === undefined)) {
        errors.push(t('part1.errors.validate.step4.comorbidityInvalid'));
      }
    }

    if (step === 5) {
      const ipssComplete = isSkipped('ipss') || localData.ipss.every(v => v !== null && v !== undefined);
      if (!ipssComplete) {
        errors.push(t('part1.errors.validate.step5.ipssInvalid'));
      }
    }

    if (step === 6) {
      const shimComplete = isSkipped('shim') || localData.shim.every(v => v !== null && v !== undefined);
      if (!shimComplete) {
        errors.push(t('part1.errors.validate.step6.shimInvalid'));
      }
    }
    
    return errors;
  };

  const handleNext = () => {
    const errors = validateStep(part1Step);
    setAttemptedNext(true);
    if (errors.length > 0) {
      setStepErrors({ ...stepErrors, [part1Step]: errors });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setStepErrors({ ...stepErrors, [part1Step]: [] });
    setAttemptedNext(false);
    onNext();
  };

  const renderStepErrors = () => {
    const errors = stepErrors[part1Step];
    if (!errors || errors.length === 0) return null;

    return (
      <div className="step-error-box">
        <div className="step-error-title">{t('part1.errors.stepErrorTitle')}</div>
        <ul className="step-error-list">
          {errors.map((error, idx) => (
            <li key={idx}>{error}</li>
          ))}
        </ul>
      </div>
    );
  };

  const answeredCount = countAnswered();
  const skippedCount = countSkipped();
  const canProceedResult = canProceed();
  // Total distinct answerable items: 11 core + 4 comorbidities + 7 IPSS + 5 SHIM = 27
  const totalQuestions = 27;

  const remainingOnStep = (() => {
    const stepValidation = validateStep(part1Step);
    return stepValidation.length;
  })();

  return (
    <div className="part1-form-container">
      {/* v2 flow header */}
      <div className="flow-header">
        <div className="v2-flow-head">
          <div>
            <div className="v2-flow-eyebrow">Step {part1Step + 1} of {steps.length} · Part 1 · Baseline</div>
            <h3 className="v2-flow-title">{steps[part1Step]?.label}</h3>
          </div>
          <div className="v2-flow-estimate">
            <span className="v2-flow-estimate-lbl">Answered</span>
            <div className="v2-flow-estimate-val">{answeredCount}<span className="v2-flow-estimate-max">/{totalQuestions}</span></div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${((part1Step + 1) / steps.length) * 100}%` }}></div>
      </div>

      {/* Step dots */}
      <div className="v2-step-dots">
        {steps.map((_, i) => {
          const isComplete = validateStep(i).length === 0;
          const isCurrent = i === part1Step;
          return (
            <div
              key={i}
              className={`v2-step-dot ${isCurrent ? 'v2-step-dot--current' : isComplete ? 'v2-step-dot--done' : ''}`}
            />
          );
        })}
      </div>

      {renderStepErrors()}
      {steps[part1Step]?.render()}

      {/* v2 sticky bottom nav */}
      <div className="v2-form-nav">
        <div className="v2-form-nav-inner">
          <div className="v2-form-nav-status">
            <span><strong>{answeredCount} of {totalQuestions}</strong> answered</span>
            {skippedCount > 0 && <span>{skippedCount} skipped</span>}
            {remainingOnStep > 0 && <span>{remainingOnStep} remaining on this step</span>}
          </div>
          <div className="v2-form-nav-btns">
            {part1Step > 0 && (
              <button className="btn-back" onClick={onBack}>{t('part1.nav.back')}</button>
            )}
            {part1Step < steps.length - 1 ? (
              <button className="btn-next" onClick={handleNext}>{t('part1.nav.next')}</button>
            ) : (
              <button
                className="btn-calculate"
                onClick={onNext}
                disabled={!canProceedResult}
                title={!canProceedResult ? t('part1.nav.calculateTitleDisabled') : t('part1.nav.calculateTitleEnabled')}
              >
                {canProceedResult
                  ? t('part1.nav.calculate')
                  : t('part1.nav.calculateIncomplete', { answeredCount, totalQuestions })}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Part1Form;
