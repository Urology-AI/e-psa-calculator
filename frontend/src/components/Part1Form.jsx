import React, { useState, useEffect } from 'react';
import './Part1Form.css';
import InfoIcon from './InfoIcon';
import { fieldReferences } from '../utils/fieldReferences';
import { CheckIcon } from 'lucide-react';

const IPSS_QUESTIONS = [
  'Incomplete emptying — not fully emptying your bladder?',
  'Frequency — urinating again within 2 hours?',
  'Intermittency — stopping and starting during urination?',
  'Urgency — difficulty postponing urination?',
  'Weak stream — weak urinary stream?',
  'Straining — pushing or straining to begin?',
  'Nocturia — getting up at night to urinate?',
];

const IPSS_LABELS = ['Not at all', '< 1 in 5', '< Half', '~ Half', '> Half', 'Always'];

const SHIM_QUESTIONS = [
  {
    q: 'How do you rate your confidence that you could get and keep an erection?',
    opts: [[1, 'Very low'], [2, 'Low'], [3, 'Moderate'], [4, 'High'], [5, 'Very high']]
  },
  {
    q: 'When you had erections with sexual stimulation, how often were they hard enough for penetration?',
    opts: [[0, 'No activity'], [1, 'Almost never'], [2, 'A few times'], [3, 'Sometimes'], [4, 'Most times'], [5, 'Almost always']]
  },
  {
    q: 'During intercourse, how often were you able to maintain your erection after penetration?',
    opts: [[0, 'Did not attempt'], [1, 'Almost never'], [2, 'A few times'], [3, 'Sometimes'], [4, 'Most times'], [5, 'Almost always']]
  },
  {
    q: 'During intercourse, how difficult was it to maintain your erection to completion?',
    opts: [[0, 'Did not attempt'], [1, 'Extremely difficult'], [2, 'Very difficult'], [3, 'Difficult'], [4, 'Slightly difficult'], [5, 'Not difficult']]
  },
  {
    q: 'When you attempted intercourse, how often was it satisfactory for you?',
    opts: [[0, 'Did not attempt'], [1, 'Almost never'], [2, 'A few times'], [3, 'Sometimes'], [4, 'Most times'], [5, 'Almost always']]
  },
];

const Part1Form = ({ formData, setFormData, onNext, onBack, currentStep: part1Step }) => {
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

    const ipssComplete = Array.isArray(localData.ipss) && localData.ipss.length === 7 && localData.ipss.every(v => v !== null && v !== undefined);
    const shimComplete = Array.isArray(localData.shim) && localData.shim.length === 5 && localData.shim.every(v => v !== null && v !== undefined);

    return hasAge && hasRace && hasFamilyHistory && hasInflammationHistory && hasBrca && hasHeight && hasWeight && hasBMI && hasExercise && hasSmoking && hasChem && hasDiet && ipssComplete && shimComplete;
  };

  const renderStep0 = () => {
    const ageNum = parseInt(localData.age, 10);
    const ageValid = localData.age && !isNaN(ageNum) && ageNum >= 18 && ageNum <= 120;
    const raceValid = !!localData.race;
    
    return (
    <div className="part1-step">
      <div className="section-header">About You</div>

      <div className="question-card" style={{ borderColor: ageValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">1</div>
          <div className="question-text">Age</div>
          <InfoIcon {...fieldReferences.age} />
          {ageValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
          <input
            type="number"
            className="input-field"
            style={{ width: '100%' }}
            placeholder="Age (18+)"
            min="18"
            max="120"
            value={localData.age}
            onChange={(e) => updateField('age', e.target.value)}
          />
          {attemptedNext && !ageValid && (
            <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '4px' }}>
              Please enter age (18-120)
            </div>
          )}
        </div>
      </div>

      <div className="question-card" style={{ borderColor: raceValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">2</div>
          <div className="question-text">Race / Ethnicity</div>
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
            <option value="">Select race/ethnicity</option>
            <option value="white">White / Caucasian</option>
            <option value="black">Black / African American</option>
            <option value="hispanic">Hispanic / Latino</option>
            <option value="asian">Asian / Pacific Islander</option>
            <option value="other">Other / Mixed</option>
          </select>
          {attemptedNext && !raceValid && (
            <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '4px' }}>
              Please select your race/ethnicity
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
      <div className="section-header">Family & Genetic Risk</div>

      <div className="question-card" style={{ borderColor: familyHistoryValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">3</div>
          <div className="question-text">Family History of Prostate Cancer</div>
          <InfoIcon {...fieldReferences.familyHistory} />
          {familyHistoryValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
          <div className="option-grid c3">
            {[
              { value: 0, label: 'No' },
              { value: 1, label: 'Yes' },
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
              Please select an option
            </div>
          )}
        </div>
      </div>

      <div className="question-card" style={{ borderColor: inflammationHistoryValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">4</div>
          <div className="question-text">Previous History of Inflammation</div>
          <InfoIcon {...fieldReferences.inflammationHistory} />
          {inflammationHistoryValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
          <div style={{ marginBottom: '12px', fontSize: '14px', color: '#666' }}>
            Have you ever been diagnosed with any inflammatory condition?
            <br />
            <span style={{ fontSize: '13px', fontStyle: 'italic' }}>
              (ex. Ulcerative Colitis, Crohn's disease, chronic prostatitis)
            </span>
          </div>
          <div className="option-grid c3">
            {[
              { value: 0, label: 'No' },
              { value: 1, label: 'Yes' },
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
              Please select an option
            </div>
          )}
        </div>
      </div>

      <div className="question-card" style={{ borderColor: brcaValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">5</div>
          <div className="question-text">Known BRCA1/BRCA2 Mutation</div>
          <InfoIcon {...fieldReferences.brcaStatus} />
          {brcaValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
          <div className="option-grid c3">
            {[
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' },
              { value: 'unknown', label: 'Unknown' },
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
              Please select an option
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
      <div className="section-header">Body Metrics</div>

      <div className="question-card" style={{ borderColor: heightValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">6</div>
          <div className="question-text">Height</div>
          <InfoIcon {...fieldReferences.heightWeight} />
          {heightValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
          <div className="option-grid c2" style={{ marginBottom: '12px' }}>
            <button className={`option-btn ${localData.heightUnit === 'imperial' ? 'selected' : ''}`} onClick={() => updateField('heightUnit', 'imperial')}>
              Feet / Inches
            </button>
            <button className={`option-btn ${localData.heightUnit === 'metric' ? 'selected' : ''}`} onClick={() => updateField('heightUnit', 'metric')}>
              Centimeters
            </button>
          </div>

          {localData.heightUnit === 'imperial' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input type="number" className="input-field" placeholder="Feet (3-8)" value={localData.heightFt} onChange={(e) => updateField('heightFt', e.target.value)} />
              <input type="number" className="input-field" placeholder="Inches (0-11)" value={localData.heightIn} onChange={(e) => updateField('heightIn', e.target.value)} />
            </div>
          ) : (
            <input type="number" className="input-field" placeholder="Height in cm (100-250)" value={localData.heightCm} onChange={(e) => updateField('heightCm', e.target.value)} />
          )}
          {localData.heightUnit === 'imperial' && localData.heightFt && (parseInt(localData.heightFt, 10) < 3 || parseInt(localData.heightFt, 10) > 8) && (
            <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '4px' }}>
              Feet must be between 3 and 8
            </div>
          )}
          {localData.heightUnit === 'imperial' && localData.heightIn && (parseInt(localData.heightIn, 10) < 0 || parseInt(localData.heightIn, 10) > 11) && (
            <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '4px' }}>
              Inches must be between 0 and 11
            </div>
          )}
          {localData.heightUnit === 'metric' && localData.heightCm && (parseFloat(localData.heightCm) < 100 || parseFloat(localData.heightCm) > 250) && (
            <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '4px' }}>
              Height must be between 100 and 250 cm
            </div>
          )}
        </div>
      </div>

      <div className="question-card" style={{ borderColor: weightValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">7</div>
          <div className="question-text">Weight</div>
          <InfoIcon {...fieldReferences.heightWeight} />
          {weightValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
          <div className="option-grid c2" style={{ marginBottom: '12px' }}>
            <button className={`option-btn ${localData.weightUnit === 'lbs' ? 'selected' : ''}`} onClick={() => updateField('weightUnit', 'lbs')}>
              Pounds (lbs)
            </button>
            <button className={`option-btn ${localData.weightUnit === 'kg' ? 'selected' : ''}`} onClick={() => updateField('weightUnit', 'kg')}>
              Kilograms (kg)
            </button>
          </div>

          {localData.weightUnit === 'kg' ? (
            <input type="number" className="input-field" placeholder="Weight in kg (25-250)" value={localData.weightKg} onChange={(e) => updateField('weightKg', e.target.value)} />
          ) : (
            <input type="number" className="input-field" placeholder="Weight in lbs (50-500)" value={localData.weight} onChange={(e) => updateField('weight', e.target.value)} />
          )}
          {localData.weightUnit === 'lbs' && localData.weight && (parseFloat(localData.weight) < 50 || parseFloat(localData.weight) > 500) && (
            <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '4px' }}>
              Weight must be between 50 and 500 lbs
            </div>
          )}
          {localData.weightUnit === 'kg' && localData.weightKg && (parseFloat(localData.weightKg) < 25 || parseFloat(localData.weightKg) > 250) && (
            <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '4px' }}>
              Weight must be between 25 and 250 kg
            </div>
          )}

          <div className="question-note" style={{ marginTop: '8px', fontSize: '14px', color: bmiValid ? '#27AE60' : '#7F8C8D' }}>
            BMI (auto-calculated): <strong>{localData.bmi > 0 ? localData.bmi.toFixed(1) : '—'}</strong>
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
      <div className="section-header">Lifestyle</div>

      <div className="question-card" style={{ borderColor: exerciseValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">8</div>
          <div className="question-text">Exercise Level</div>
          <InfoIcon {...fieldReferences.exercise} />
          {exerciseValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
          <div className="option-grid c3">
            {[
              { value: 0, label: 'Regular (3+ days/week)' },
              { value: 1, label: 'Some (1-2 days/week)' },
              { value: 2, label: 'None' },
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
              Please select an option
            </div>
          )}
        </div>
      </div>

      <div className="question-card" style={{ borderColor: smokingValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">9</div>
          <div className="question-text">Smoking Status</div>
          <InfoIcon {...fieldReferences.smoking} />
          {smokingValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
          <div className="option-grid c3">
            {[
              { value: 2, label: 'Current' },
              { value: 1, label: 'Former' },
              { value: 0, label: 'Never' },
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
              Please select an option
            </div>
          )}
        </div>
      </div>

      <div className="question-card" style={{ borderColor: chemicalValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">10</div>
          <div className="question-text">Chemical Exposure (e.g., Agent Orange or pesticides)</div>
          <InfoIcon {...fieldReferences.chemicalExposure} />
          {chemicalValid && <span style={{ color: '#27AE60', marginLeft: '8px' }}>✓</span>}
        </div>
        <div className="question-body">
          <div className="option-grid c2">
            {[
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' },
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
              Please select an option
            </div>
          )}
        </div>
      </div>
    </div>
  );
  };

  const renderStep4 = () => {
    const dietValid = !!localData.dietPattern;
    
    return (
    <div className="part1-step">
      <div className="section-header">Additional Information</div>

      <div className="question-card" style={{ borderColor: dietValid ? '#27AE60' : attemptedNext ? '#E74C3C' : '#E8ECF0', borderWidth: '2px' }}>
        <div className="question-header">
          <div className="question-number">11</div>
          <div className="question-text">Diet Pattern</div>
          <InfoIcon {...fieldReferences.diet} />
          {dietValid && <CheckIcon size={16} style={{ color: '#27AE60', marginLeft: '8px' }} />}
        </div>
        <div className="question-body">
          <div className="option-grid c2">
            {[
              { value: 'balanced', label: 'Balanced / Mixed' },
              { value: 'plant-forward', label: 'Plant-forward' },
              { value: 'high-fat-red-meat', label: 'High fat / red meat heavy' },
              { value: 'other', label: 'Other / Prefer not to say' },
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
              Please select an option
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
    
    return (
    <div className="part1-step">
      <div className="section-header">
        Urinary Symptoms (IPSS)
        <InfoIcon {...fieldReferences.ipss} />
        {ipssComplete && <CheckIcon size={16} style={{ color: '#27AE60', marginLeft: '12px' }} />}
        {!ipssComplete && attemptedNext && <span style={{ color: '#E74C3C', marginLeft: '12px', fontSize: '14px', fontWeight: '400' }}>({answeredCount}/7 answered)</span>}
        {!ipssComplete && !attemptedNext && <span style={{ color: '#7F8C8D', marginLeft: '12px', fontSize: '14px', fontWeight: '400' }}>({answeredCount}/7 answered)</span>}
      </div>
      <div className="question-note" style={{ marginBottom: '16px', fontSize: '14px', color: '#7F8C8D' }}>
        Over the past month, how often have you had:
      </div>
      {IPSS_QUESTIONS.map((q, index) => (
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
              {IPSS_LABELS.map((label, value) => (
                <button key={value} className={`option-btn ${localData.ipss[index] === value ? 'selected' : ''}`} onClick={() => updateIPSS(index, value)}>
                  <span className="score">({value})</span> {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}
      <div className="score-total" style={{ color: ipssComplete ? '#27AE60' : '#7F8C8D' }}>
        IPSS Total: {ipssComplete ? localData.ipss.reduce((a, b) => a + b, 0) : '—'} / 35
      </div>
    </div>
  );
  };

  const renderStep6 = () => {
    const shimComplete = localData.shim.every(v => v !== null && v !== undefined);
    const answeredCount = localData.shim.filter(v => v !== null && v !== undefined).length;
    
    return (
    <div className="part1-step">
      <div className="section-header">
        Sexual Health (SHIM)
        <InfoIcon {...fieldReferences.shim} />
        {shimComplete && <CheckIcon size={16} style={{ color: '#27AE60', marginLeft: '12px' }} />}
        {!shimComplete && attemptedNext && <span style={{ color: '#E74C3C', marginLeft: '12px', fontSize: '14px', fontWeight: '400' }}>({answeredCount}/5 answered)</span>}
        {!shimComplete && !attemptedNext && <span style={{ color: '#7F8C8D', marginLeft: '12px', fontSize: '14px', fontWeight: '400' }}>({answeredCount}/5 answered)</span>}
      </div>
      <div className="question-note" style={{ marginBottom: '16px', fontSize: '14px', color: '#7F8C8D' }}>
        Over the past 6 months:
      </div>
      {SHIM_QUESTIONS.map((item, index) => (
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
        SHIM Total: {shimComplete ? localData.shim.reduce((a, b) => a + b, 0) : '—'} / 25
      </div>
    </div>
  );
  };

  const steps = [
    { label: 'About You', render: renderStep0 },
    { label: 'Family & Genetic Risk', render: renderStep1 },
    { label: 'Body Metrics', render: renderStep2 },
    { label: 'Lifestyle', render: renderStep3 },
    { label: 'Additional Info', render: renderStep4 },
    { label: 'IPSS', render: renderStep5 },
    { label: 'SHIM', render: renderStep6 },
  ];

  const validateStep = (step) => {
    const errors = [];
    
    if (step === 0) {
      const ageNum = parseInt(localData.age, 10);
      if (!localData.age || isNaN(ageNum) || ageNum < 18 || ageNum > 120) {
        errors.push('Please enter a valid age (18+)');
      }
      if (!localData.race) {
        errors.push('Please select your race/ethnicity');
      }
    }
    
    if (step === 1) {
      if (localData.familyHistory === null || localData.familyHistory === undefined) {
        errors.push('Please answer family history question');
      }
      if (!localData.brcaStatus) {
        errors.push('Please answer BRCA status question');
      }
    }
    
    if (step === 2) {
      if (!hasValidHeight()) {
        errors.push('Please enter valid height');
      }
      if (!hasValidWeight()) {
        errors.push('Please enter valid weight');
      }
      if (localData.bmi <= 0) {
        errors.push('BMI could not be calculated - please check height and weight');
      }
    }
    
    if (step === 3) {
      if (localData.exercise === null || localData.exercise === undefined) {
        errors.push('Please select exercise level');
      }
      if (localData.smoking === null || localData.smoking === undefined) {
        errors.push('Please select smoking status');
      }
      if (!localData.chemicalExposure) {
        errors.push('Please answer chemical exposure question');
      }
    }
    
    if (step === 4) {
      if (!localData.dietPattern) {
        errors.push('Please select your diet pattern');
      }
    }
    
    if (step === 5) {
      const ipssComplete = localData.ipss.every(v => v !== null && v !== undefined);
      if (!ipssComplete) {
        errors.push('Please answer all 7 IPSS questions');
      }
    }
    
    if (step === 6) {
      const shimComplete = localData.shim.every(v => v !== null && v !== undefined);
      if (!shimComplete) {
        errors.push('Please answer all 5 SHIM questions');
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
      <div style={{ 
        background: '#FDEAEA', 
        border: '1px solid #E74C3C', 
        borderRadius: '8px', 
        padding: '12px 16px', 
        marginBottom: '16px' 
      }}>
        <div style={{ color: '#E74C3C', fontWeight: '600', marginBottom: '8px' }}>
          Please complete the following before continuing:
        </div>
        <ul style={{ color: '#E74C3C', margin: 0, paddingLeft: '20px' }}>
          {errors.map((error, idx) => (
            <li key={idx}>{error}</li>
          ))}
        </ul>
      </div>
    );
  };

  const answeredCount = countAnswered();
  const canProceedResult = canProceed();
  const totalQuestions = 22;

  return (
    <div className="part1-form-container">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}></div>
      </div>

      <div className="answer-counter">
        {answeredCount}/{totalQuestions} answered
      </div>
      {renderStepErrors()}
      {steps[part1Step]?.render()}
      <div className="form-navigation">
        <div className="form-navigation-inner">
          {part1Step > 0 && (
            <button className="btn-back" onClick={onBack}>
              ← Back
            </button>
          )}
          {part1Step < steps.length - 1 ? (
            <button className="btn-next" onClick={handleNext}>
              Next →
            </button>
          ) : (
            <button
              className="btn-calculate"
              onClick={onNext}
              disabled={!canProceedResult}
              title={!canProceedResult ? 'Please complete all required fields' : 'Click to calculate your score'}
            >
              {canProceedResult ? 'Calculate My Score ✓' : `Complete all questions (${answeredCount}/${totalQuestions})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Part1Form;
