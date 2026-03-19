import React, { useState, useEffect } from 'react';
import './Part1Form.css';
import InfoIcon from './InfoIcon';
import { fieldReferences } from '../utils/fieldReferences';
import { CheckIcon } from 'lucide-react';
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

  const updateField = (field, value) => {
    if (field === 'age') {
      // Always allow typing, only validate on blur or submit
      setLocalData(prev => ({ ...prev, [field]: value }));
      return;
    }

    if (field === 'heightFt') {
      // Always allow typing
      setLocalData(prev => ({ ...prev, [field]: value }));
      return;
    }

    if (field === 'heightIn') {
      // Always allow typing
      setLocalData(prev => ({ ...prev, [field]: value }));
      return;
    }

    if (field === 'heightCm') {
      // Always allow typing
      setLocalData(prev => ({ ...prev, [field]: value }));
      return;
    }

    if (field === 'weight') {
      // Always allow typing
      setLocalData(prev => ({ ...prev, [field]: value }));
      return;
    }

    if (field === 'weightKg') {
      // Always allow typing
      setLocalData(prev => ({ ...prev, [field]: value }));
      return;
    }

    setLocalData(prev => ({ ...prev, [field]: value }));
  };

  const updateIPSS = (index, value) => {
    const next = [...localData.ipss];
    next[index] = parseInt(value, 10);
    setLocalData(prev => ({ ...prev, ipss: next }));
  };

  const updateSHIM = (index, value) => {
    const next = [...localData.shim];
    next[index] = parseInt(value, 10);
    setLocalData(prev => ({ ...prev, shim: next }));
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

  const countAnswered = () => {
    let count = 0;

    if (localData.age) count++;
    if (localData.race !== null && localData.race !== undefined && localData.race !== '') count++;
    if (localData.familyHistory !== null && localData.familyHistory !== undefined) count++;
    if (localData.inflammationHistory !== null && localData.inflammationHistory !== undefined) count++;
    if (localData.brcaStatus !== null && localData.brcaStatus !== undefined) count++;
    if (hasValidHeight()) count++;
    if (hasValidWeight()) count++;
    if (localData.exercise !== null && localData.exercise !== undefined) count++;
    if (localData.smoking !== null && localData.smoking !== undefined) count++;
    if (localData.chemicalExposure !== null && localData.chemicalExposure !== undefined) count++;
    if (localData.dietPattern !== '') count++;
    if (localData.comorbidityScore !== null && localData.comorbidityScore !== undefined) count++;

    localData.ipss.forEach(v => { if (v !== null && v !== undefined) count++; });
    localData.shim.forEach(v => { if (v !== null && v !== undefined) count++; });

    return count;
  };

  const canProceed = () => {
    const ageNum = parseInt(localData.age, 10);
    const hasAge = localData.age !== '' && !isNaN(ageNum) && ageNum >= 18 && ageNum <= 120;
    const hasRace = localData.race !== null && localData.race !== undefined && localData.race !== '';
    const hasFamilyHistory = localData.familyHistory !== null && localData.familyHistory !== undefined;
    const hasInflammationHistory = localData.inflammationHistory !== null && localData.inflammationHistory !== undefined;
    const hasBrca = localData.brcaStatus !== null && localData.brcaStatus !== undefined;
    const hasHeight = hasValidHeight();
    const hasWeight = hasValidWeight();
    const hasBMI = localData.bmi > 0;
    const hasExercise = localData.exercise !== null && localData.exercise !== undefined;
    const hasSmoking = localData.smoking !== null && localData.smoking !== undefined;
    const hasChem = localData.chemicalExposure !== null && localData.chemicalExposure !== undefined;
    const hasDiet = localData.dietPattern !== '';
    const hasComorbidityScore = localData.comorbidityScore !== null && localData.comorbidityScore !== undefined;

    const ipssComplete = Array.isArray(localData.ipss) && localData.ipss.length === 7 && localData.ipss.every(v => v !== null && v !== undefined);
    const shimComplete = Array.isArray(localData.shim) && localData.shim.length === 5 && localData.shim.every(v => v !== null && v !== undefined);

    return hasAge && hasRace && hasFamilyHistory && hasInflammationHistory && hasBrca && hasHeight && hasWeight && hasBMI && hasExercise && hasSmoking && hasChem && hasDiet && hasComorbidityScore && ipssComplete && shimComplete;
  };

  const renderStep0 = () => {
    const ageNum = parseInt(localData.age, 10);
    const ageValid = localData.age && !isNaN(ageNum) && ageNum >= 18 && ageNum <= 120;
    const raceValid = !!localData.race;
    
    return (
    <div className="part1-step">
      <div className="section-header">{t('part1.steps.aboutYou.sectionTitle')}</div>

      <div className="question-card" style={{ borderColor: ageValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">1</div>
          <div className="question-text">{t('part1.fields.age.title')}</div>
          <InfoIcon {...fieldReferences.age} />
          {ageValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
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
            <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '4px' }}>
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
          {raceValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
          <select 
            className="input-field" 
            style={{ width: '100%' }}
            value={localData.race || ''} 
            onChange={(e) => updateField('race', e.target.value)}
          >
            <option value="">{t('part1.fields.race.selectPlaceholder')}</option>
            <option value="white">{t('part1.race.white')}</option>
            <option value="black">{t('part1.race.black')}</option>
            <option value="hispanic">{t('part1.race.hispanic')}</option>
            <option value="asian">{t('part1.race.asian')}</option>
            <option value="other">{t('part1.race.other')}</option>
          </select>
          {attemptedNext && !raceValid && (
            <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '4px' }}>
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
      <div className="section-header">{t('part1.steps.familyGeneticRisk.sectionTitle')}</div>

      <div className="question-card" style={{ borderColor: familyHistoryValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">3</div>
          <div className="question-text">{t('part1.step1.familyHistory.title')}</div>
          <InfoIcon {...fieldReferences.familyHistory} />
          {familyHistoryValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
          <div className="option-grid c3">
            {[
              { value: 0, label: t('part1.options.no') },
              { value: 1, label: t('part1.options.yes') },
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
          {attemptedNext && !familyHistoryValid && (
            <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '8px' }}>
              {t('part1.errors.selectOption')}
            </div>
          )}
        </div>
      </div>

      <div className="question-card" style={{ borderColor: inflammationHistoryValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">4</div>
          <div className="question-text">{t('part1.step1.inflammationHistory.title')}</div>
          <InfoIcon {...fieldReferences.inflammationHistory} />
          {inflammationHistoryValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
          <div style={{ marginBottom: '12px', fontSize: '14px', color: '#666' }}>
            {t('part1.step1.inflammationHistory.prompt')}
            <br />
            <span style={{ fontSize: '13px', fontStyle: 'italic' }}>
              {t('part1.step1.inflammationHistory.example')}
            </span>
          </div>
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
          {attemptedNext && !inflammationHistoryValid && (
            <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '8px' }}>
              {t('part1.errors.selectOption')}
            </div>
          )}
        </div>
      </div>

      <div className="question-card" style={{ borderColor: brcaValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">5</div>
          <div className="question-text">{t('part1.fields.brcaStatus.title')}</div>
          <InfoIcon {...fieldReferences.brcaStatus} />
          {brcaValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
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
          {attemptedNext && !brcaValid && (
            <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '8px' }}>
              {t('part1.errors.selectOption')}
            </div>
          )}
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
      <div className="section-header">{t('part1.steps.bodyMetrics.sectionTitle')}</div>

      <div className="question-card" style={{ borderColor: heightValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">6</div>
          <div className="question-text">{t('part1.step2.heightQuestion')}</div>
          <InfoIcon {...fieldReferences.heightWeight} />
          {heightValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
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
            <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '4px' }}>
              {t('part1.step2.heightImperialFeetError')}
            </div>
          )}
          {localData.heightUnit === 'imperial' && localData.heightIn && (parseInt(localData.heightIn, 10) < 0 || parseInt(localData.heightIn, 10) > 11) && (
            <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '4px' }}>
              {t('part1.step2.heightImperialInchesError')}
            </div>
          )}
          {localData.heightUnit === 'metric' && localData.heightCm && (parseFloat(localData.heightCm) < 100 || parseFloat(localData.heightCm) > 250) && (
            <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '4px' }}>
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
          {weightValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
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
            <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '4px' }}>
              {t('part1.step2.weightImperialError')}
            </div>
          )}
          {localData.weightUnit === 'kg' && localData.weightKg && (parseFloat(localData.weightKg) < 25 || parseFloat(localData.weightKg) > 250) && (
            <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '4px' }}>
              {t('part1.step2.weightMetricError')}
            </div>
          )}

          <div className="question-note" style={{ marginTop: '8px', fontSize: '14px', color: bmiValid ? '#27AE60' : '#7F8C8D' }}>
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
      <div className="section-header">{t('part1.steps.lifestyle.sectionTitle')}</div>

      <div className="question-card" style={{ borderColor: exerciseValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">8</div>
          <div className="question-text">{t('part1.fields.exercise.title')}</div>
          <InfoIcon {...fieldReferences.exercise} />
          {exerciseValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
          <div className="option-grid c3">
            {[
              { value: 0, label: t('part1.step3.exercise.regular') },
              { value: 1, label: t('part1.step3.exercise.some') },
              { value: 2, label: t('part1.step3.exercise.none') },
            ].map(opt => (
              <button
                key={opt.value}
                className={`option-btn ${localData.exercise === opt.value ? 'selected' : ''}`}
                onClick={() => updateField('exercise', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {attemptedNext && !exerciseValid && (
            <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '8px' }}>
              {t('part1.errors.selectOption')}
            </div>
          )}
        </div>
      </div>

      <div className="question-card" style={{ borderColor: smokingValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">9</div>
          <div className="question-text">{t('part1.fields.smoking.title')}</div>
          <InfoIcon {...fieldReferences.smoking} />
          {smokingValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
          <div className="option-grid c3">
            {[
              { value: 2, label: t('part1.step3.smoking.current') },
              { value: 1, label: t('part1.step3.smoking.former') },
              { value: 0, label: t('part1.step3.smoking.never') },
            ].map(opt => (
              <button
                key={opt.value}
                className={`option-btn ${localData.smoking === opt.value ? 'selected' : ''}`}
                onClick={() => updateField('smoking', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {attemptedNext && !smokingValid && (
            <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '8px' }}>
              {t('part1.errors.selectOption')}
            </div>
          )}
        </div>
      </div>

      <div className="question-card" style={{ borderColor: chemicalValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">10</div>
          <div className="question-text">{t('part1.step3.chemicalQuestion')}</div>
          <InfoIcon {...fieldReferences.chemicalExposure} />
          {chemicalValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
          <div className="option-grid c2">
            {[
              { value: 'yes', label: t('part1.options.yes') },
              { value: 'no', label: t('part1.options.no') },
            ].map(opt => (
              <button
                key={opt.value}
                className={`option-btn ${localData.chemicalExposure === opt.value ? 'selected' : ''}`}
                onClick={() => updateField('chemicalExposure', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {attemptedNext && !chemicalValid && (
            <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '8px' }}>
              {t('part1.errors.selectOption')}
            </div>
          )}
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
      <div className="section-header">{t('part1.steps.additionalInfo.sectionTitle')}</div>

      <div className="question-card" style={{ borderColor: dietValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">11</div>
          <div className="question-text">{t('part1.fields.diet.title')}</div>
          <InfoIcon {...fieldReferences.diet} />
          {dietValid && <CheckIcon size={16} style={{ color: '#27AE60', marginLeft: '8px' }} />}
        </div>
        <div className="question-body">
          <div className="option-grid c2">
            {[
              { value: 'western', label: t('part1.step4.diet.western') },
              { value: 'mediterranean', label: t('part1.step4.diet.mediterranean') },
              { value: 'indian', label: t('part1.step4.diet.indian') },
              { value: 'dash', label: t('part1.step4.diet.dash') },
              { value: 'plant-based', label: t('part1.step4.diet.plantBased') },
              { value: 'pescatarian', label: t('part1.step4.diet.pescatarian') },
              { value: 'low-carb-keto', label: t('part1.step4.diet.lowCarbKeto') },
              { value: 'other', label: t('part1.step4.diet.other') },
            ].map(opt => (
              <button
                key={opt.value}
                className={`option-btn ${localData.dietPattern === opt.value ? 'selected' : ''}`}
                onClick={() => updateField('dietPattern', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {attemptedNext && !dietValid && (
            <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '8px' }}>
              {t('part1.errors.selectOption')}
            </div>
          )}
        </div>
      </div>

      <div className="question-card" style={{ borderColor: comorbiditiesValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">12</div>
          <div className="question-text">{t('part1.fields.comorbidities.title')}</div>
          <InfoIcon {...fieldReferences.comorbidities} />
          {comorbiditiesValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
          <div style={{ marginBottom: '12px', fontSize: '14px', color: '#666' }}>
            {t('part1.step4.comorbidities.prompt')}
          </div>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '14px' }}>{t('part1.step4.comorbidities.askAnyLabel')}</div>
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
              <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '14px' }}>{t('part1.step4.comorbidities.howManyLabel')}</div>
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
          {attemptedNext && !comorbiditiesValid && (
            <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '8px' }}>
              {t('part1.errors.comorbidityQuestions')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
  };

  const renderStep5 = () => {
    const ipssComplete = localData.ipss.every(v => v !== null && v !== undefined);
    const answeredCount = localData.ipss.filter(v => v !== null && v !== undefined).length;
    const ipssQuestions = IPSS_QUESTION_KEYS.map((k) => t(k));
    const ipssLabels = [0, 1, 2, 3, 4, 5].map((v) => ({
      value: v,
      label: t(IPSS_LABEL_KEY_BY_VALUE[v]),
    }));
    
    return (
    <div className="part1-step">
      <div className="section-header">
        {t('part1.steps.ipss.sectionTitle')}
        <InfoIcon {...fieldReferences.ipss} />
        {ipssComplete && <CheckIcon size={16} style={{ color: '#27AE60', marginLeft: '12px' }} />}
        {!ipssComplete && attemptedNext && (
          <span style={{ color: '#E74C3C', marginLeft: '12px', fontSize: '14px', fontWeight: '400' }}>
            {t('part1.ipss.answeredCount', { answeredCount, total: 7 })}
          </span>
        )}
        {!ipssComplete && !attemptedNext && (
          <span style={{ color: '#7F8C8D', marginLeft: '12px', fontSize: '14px', fontWeight: '400' }}>
            {t('part1.ipss.answeredCount', { answeredCount, total: 7 })}
          </span>
        )}
      </div>
      <div className="question-note" style={{ marginBottom: '16px', fontSize: '14px', color: '#7F8C8D' }}>
        {t('part1.ipss.note')}
      </div>
      {ipssQuestions.map((q, index) => (
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
      <div className="score-total" style={{ color: ipssComplete ? '#27AE60' : '#7F8C8D' }}>
        {t('part1.ipss.totalLabel')}: {ipssComplete ? localData.ipss.reduce((a, b) => a + b, 0) : '—'} / 35
      </div>
    </div>
  );
  };

  const renderStep6 = () => {
    const shimComplete = localData.shim.every(v => v !== null && v !== undefined);
    const answeredCount = localData.shim.filter(v => v !== null && v !== undefined).length;
    const shimQuestions = SHIM_QUESTION_KEYS.map((item) => ({
      q: t(item.qKey),
      opts: item.opts.map(([score, labelKey]) => [score, t(labelKey)]),
    }));
    
    return (
    <div className="part1-step">
      <div className="section-header">
        {t('part1.steps.shim.sectionTitle')}
        <InfoIcon {...fieldReferences.shim} />
        {shimComplete && <CheckIcon size={16} style={{ color: '#27AE60', marginLeft: '12px' }} />}
        {!shimComplete && attemptedNext && (
          <span style={{ color: '#E74C3C', marginLeft: '12px', fontSize: '14px', fontWeight: '400' }}>
            {t('part1.shim.answeredCount', { answeredCount, total: 5 })}
          </span>
        )}
        {!shimComplete && !attemptedNext && (
          <span style={{ color: '#7F8C8D', marginLeft: '12px', fontSize: '14px', fontWeight: '400' }}>
            {t('part1.shim.answeredCount', { answeredCount, total: 5 })}
          </span>
        )}
      </div>
      <div className="question-note" style={{ marginBottom: '16px', fontSize: '14px', color: '#7F8C8D' }}>
        {t('part1.shim.note')}
      </div>
      {shimQuestions.map((item, index) => (
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
      <div className="score-total" style={{ color: shimComplete ? '#27AE60' : '#7F8C8D' }}>
        {t('part1.shim.totalLabel')}: {shimComplete ? localData.shim.reduce((a, b) => a + b, 0) : '—'} / 25
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
      if (localData.familyHistory === null || localData.familyHistory === undefined) {
        errors.push(t('part1.errors.validate.step1.familyHistoryInvalid'));
      }
      if (!localData.brcaStatus) {
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
      if (localData.exercise === null || localData.exercise === undefined) {
        errors.push(t('part1.errors.validate.step3.exerciseInvalid'));
      }
      if (localData.smoking === null || localData.smoking === undefined) {
        errors.push(t('part1.errors.validate.step3.smokingInvalid'));
      }
      if (!localData.chemicalExposure) {
        errors.push(t('part1.errors.validate.step3.chemicalInvalid'));
      }
    }
    
    if (step === 4) {
      if (!localData.dietPattern) {
        errors.push(t('part1.errors.validate.step4.dietInvalid'));
      }
      if (localData.comorbidityScore === null || localData.comorbidityScore === undefined) {
        errors.push(t('part1.errors.validate.step4.comorbidityInvalid'));
      }
    }
    
    if (step === 5) {
      const ipssComplete = localData.ipss.every(v => v !== null && v !== undefined);
      if (!ipssComplete) {
        errors.push(t('part1.errors.validate.step5.ipssInvalid'));
      }
    }
    
    if (step === 6) {
      const shimComplete = localData.shim.every(v => v !== null && v !== undefined);
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
  const canProceedResult = canProceed();
  // Total distinct answerable items: 11 core + 4 comorbidities + 7 IPSS + 5 SHIM = 27
  const totalQuestions = 27;

  return (
    <div className="part1-form-container">
      <div className="flow-header">
        <div className="flow-step-chip">{t('part1.form.stepChip', { current: part1Step + 1, total: steps.length })}</div>
        <h3 className="flow-step-title">{steps[part1Step]?.label}</h3>
        <p className="flow-step-note">{t('part1.form.flowNote')}</p>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}></div>
      </div>

      <div className="answer-counter">
        {t('part1.form.answeredCounter', { answeredCount, totalQuestions })}
      </div>
      {renderStepErrors()}
      {steps[part1Step]?.render()}
      <div className="form-navigation">
        <div className="form-navigation-inner">
          {part1Step > 0 && (
            <button className="btn-back" onClick={onBack}>
              {t('part1.nav.back')}
            </button>
          )}
          {part1Step < steps.length - 1 ? (
            <button className="btn-next" onClick={handleNext}>
              {t('part1.nav.next')}
            </button>
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
  );
};

export default Part1Form;
