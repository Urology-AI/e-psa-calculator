import React, { useState, useEffect } from 'react';
import './Part1Form.css';

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
    geographicOrigin: formData.geographicOrigin || '',
    ipss: formData.ipss || Array(7).fill(null),
    shim: formData.shim || Array(5).fill(null),
  });

  useEffect(() => {
    const toInches = () => {
      if (localData.heightUnit === 'metric') {
        const cm = parseFloat(localData.heightCm);
        if (isNaN(cm) || cm < 100 || cm > 250) return 0;
        return cm / 2.54;
      }
      const ft = parseFloat(localData.heightFt);
      const inches = parseFloat(localData.heightIn);
      if (isNaN(ft) || isNaN(inches) || ft < 3 || ft > 8 || inches < 0 || inches > 11) return 0;
      return (ft * 12) + inches;
    };

    const toPounds = () => {
      if (localData.weightUnit === 'kg') {
        const kg = parseFloat(localData.weightKg);
        if (isNaN(kg) || kg < 25 || kg > 250) return 0;
        return kg * 2.20462;
      }
      const lbs = parseFloat(localData.weight);
      if (isNaN(lbs) || lbs < 50 || lbs > 500) return 0;
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
      const ageNum = parseInt(value, 10);
      if (value === '') return setLocalData(prev => ({ ...prev, age: '' }));
      if (isNaN(ageNum) || ageNum < 30 || ageNum > 95) return;
      return setLocalData(prev => ({ ...prev, age: ageNum.toString() }));
    }

    if (field === 'heightFt') {
      const ft = parseInt(value, 10);
      if (value === '') return setLocalData(prev => ({ ...prev, heightFt: '' }));
      if (isNaN(ft) || ft < 3 || ft > 8) return;
      return setLocalData(prev => ({ ...prev, heightFt: ft.toString() }));
    }

    if (field === 'heightIn') {
      const inch = parseInt(value, 10);
      if (value === '') return setLocalData(prev => ({ ...prev, heightIn: '' }));
      if (isNaN(inch) || inch < 0 || inch > 11) return;
      return setLocalData(prev => ({ ...prev, heightIn: inch.toString() }));
    }

    if (field === 'heightCm') {
      const cm = parseFloat(value);
      if (value === '') return setLocalData(prev => ({ ...prev, heightCm: '' }));
      if (isNaN(cm) || cm < 100 || cm > 250) return;
      return setLocalData(prev => ({ ...prev, heightCm: cm.toString() }));
    }

    if (field === 'weight') {
      const lbs = parseFloat(value);
      if (value === '') return setLocalData(prev => ({ ...prev, weight: '' }));
      if (isNaN(lbs) || lbs < 50 || lbs > 500) return;
      return setLocalData(prev => ({ ...prev, weight: lbs.toString() }));
    }

    if (field === 'weightKg') {
      const kg = parseFloat(value);
      if (value === '') return setLocalData(prev => ({ ...prev, weightKg: '' }));
      if (isNaN(kg) || kg < 25 || kg > 250) return;
      return setLocalData(prev => ({ ...prev, weightKg: kg.toString() }));
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
    if (localData.brcaStatus !== null && localData.brcaStatus !== undefined) count++;
    if (hasValidHeight()) count++;
    if (hasValidWeight()) count++;
    if (localData.exercise !== null && localData.exercise !== undefined) count++;
    if (localData.smoking !== null && localData.smoking !== undefined) count++;
    if (localData.chemicalExposure !== null && localData.chemicalExposure !== undefined) count++;
    if (localData.dietPattern !== '') count++;
    if (localData.geographicOrigin !== '') count++;

    localData.ipss.forEach(v => { if (v !== null && v !== undefined) count++; });
    localData.shim.forEach(v => { if (v !== null && v !== undefined) count++; });

    return count;
  };

  const canProceed = () => {
    const ageNum = parseInt(localData.age, 10);
    const hasAge = localData.age !== '' && !isNaN(ageNum) && ageNum >= 30 && ageNum <= 95;
    const hasRace = localData.race !== null && localData.race !== undefined && localData.race !== '';
    const hasFamilyHistory = localData.familyHistory !== null && localData.familyHistory !== undefined;
    const hasBrca = localData.brcaStatus !== null && localData.brcaStatus !== undefined;
    const hasHeight = hasValidHeight();
    const hasWeight = hasValidWeight();
    const hasBMI = localData.bmi > 0;
    const hasExercise = localData.exercise !== null && localData.exercise !== undefined;
    const hasSmoking = localData.smoking !== null && localData.smoking !== undefined;
    const hasChem = localData.chemicalExposure !== null && localData.chemicalExposure !== undefined;
    const hasDiet = localData.dietPattern !== '';
    const hasGeo = localData.geographicOrigin !== '';

    const ipssComplete = Array.isArray(localData.ipss) && localData.ipss.length === 7 && localData.ipss.every(v => v !== null && v !== undefined);
    const shimComplete = Array.isArray(localData.shim) && localData.shim.length === 5 && localData.shim.every(v => v !== null && v !== undefined);

    return hasAge && hasRace && hasFamilyHistory && hasBrca && hasHeight && hasWeight && hasBMI && hasExercise && hasSmoking && hasChem && hasDiet && hasGeo && ipssComplete && shimComplete;
  };

  const renderStep0 = () => (
    <div className="part1-step">
      <div className="section-header">About You</div>

      <div className="question-card">
        <div className="question-header">
          <div className="question-number">1</div>
          <div className="question-text">Age</div>
        </div>
        <div className="question-body">
          <input
            type="number"
            className="input-field"
            placeholder="Age (30-95)"
            min="30"
            max="95"
            value={localData.age}
            onChange={(e) => updateField('age', e.target.value)}
          />
        </div>
      </div>

      <div className="question-card">
        <div className="question-header">
          <div className="question-number">2</div>
          <div className="question-text">Race / Ethnicity</div>
        </div>
        <div className="question-body">
          <select className="input-field" value={localData.race || ''} onChange={(e) => updateField('race', e.target.value)}>
            <option value="">Select race/ethnicity</option>
            <option value="white">White / Caucasian</option>
            <option value="black">Black / African American</option>
            <option value="hispanic">Hispanic / Latino</option>
            <option value="asian">Asian / Pacific Islander</option>
            <option value="other">Other / Mixed</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="part1-step">
      <div className="section-header">Family & Genetic Risk</div>

      <div className="question-card">
        <div className="question-header">
          <div className="question-number">3</div>
          <div className="question-text">Family History of Prostate Cancer</div>
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
        </div>
      </div>

      <div className="question-card">
        <div className="question-header">
          <div className="question-number">4</div>
          <div className="question-text">Known BRCA1/BRCA2 Mutation</div>
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
          <div className="question-note" style={{ marginTop: '8px', fontSize: '13px', color: '#7F8C8D' }}>
            Collected for prospective validation — not included in current model calculation.
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="part1-step">
      <div className="section-header">Body Metrics</div>

      <div className="question-card">
        <div className="question-header">
          <div className="question-number">5</div>
          <div className="question-text">Height</div>
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
        </div>
      </div>

      <div className="question-card">
        <div className="question-header">
          <div className="question-number">6</div>
          <div className="question-text">Weight</div>
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

          <div className="question-note" style={{ marginTop: '8px', fontSize: '14px' }}>
            BMI (auto-calculated): <strong>{localData.bmi > 0 ? localData.bmi.toFixed(1) : '—'}</strong>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="part1-step">
      <div className="section-header">Lifestyle</div>

      <div className="question-card">
        <div className="question-header">
          <div className="question-number">7</div>
          <div className="question-text">Exercise Level</div>
        </div>
        <div className="question-body">
          <div className="option-grid c3">
            {[
              { value: 0, label: 'Regular (3+ days/week)' },
              { value: 1, label: 'Some (1-2 days/week)' },
              { value: 2, label: 'None' },
            ].map(opt => (
              <button key={opt.value} className={`option-btn ${localData.exercise === opt.value ? 'selected' : ''}`} onClick={() => updateField('exercise', opt.value)}>{opt.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="question-card">
        <div className="question-header">
          <div className="question-number">8</div>
          <div className="question-text">Smoking Status</div>
        </div>
        <div className="question-body">
          <div className="option-grid c3">
            {[
              { value: 2, label: 'Current' },
              { value: 1, label: 'Former' },
              { value: 0, label: 'Never' },
            ].map(opt => (
              <button key={opt.value} className={`option-btn ${localData.smoking === opt.value ? 'selected' : ''}`} onClick={() => updateField('smoking', opt.value)}>{opt.label}</button>
            ))}
          </div>
          <div className="question-note" style={{ marginTop: '8px', fontSize: '13px', color: '#7F8C8D' }}>
            Collected for prospective validation — not included in current model calculation.
          </div>
        </div>
      </div>

      <div className="question-card">
        <div className="question-header">
          <div className="question-number">9</div>
          <div className="question-text">Chemical Exposure (e.g., Agent Orange or pesticides)</div>
        </div>
        <div className="question-body">
          <div className="option-grid c2">
            {[
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' },
            ].map(opt => (
              <button key={opt.value} className={`option-btn ${localData.chemicalExposure === opt.value ? 'selected' : ''}`} onClick={() => updateField('chemicalExposure', opt.value)}>{opt.label}</button>
            ))}
          </div>
          <div className="question-note" style={{ marginTop: '8px', fontSize: '13px', color: '#7F8C8D' }}>
            Collected for prospective validation — not included in current model calculation.
          </div>
        </div>
      </div>

      <div className="question-card">
        <div className="question-header">
          <div className="question-text">Additional Prospective Data</div>
        </div>
        <div className="question-body">
          <div style={{ display: 'grid', gap: '8px' }}>
            <select className="input-field" value={localData.dietPattern} onChange={(e) => updateField('dietPattern', e.target.value)}>
              <option value="">Diet pattern</option>
              <option value="balanced">Balanced / Mixed</option>
              <option value="plant-forward">Plant-forward</option>
              <option value="high-fat-red-meat">High fat / red meat heavy</option>
              <option value="other">Other / Prefer not to say</option>
            </select>

            <select className="input-field" value={localData.geographicOrigin} onChange={(e) => updateField('geographicOrigin', e.target.value)}>
              <option value="">Geographic origin</option>
              <option value="north-america">North America</option>
              <option value="latin-america">Latin America</option>
              <option value="caribbean">Caribbean</option>
              <option value="africa">Africa</option>
              <option value="europe">Europe</option>
              <option value="asia">Asia</option>
              <option value="middle-east">Middle East</option>
              <option value="other">Other / Prefer not to say</option>
            </select>
          </div>
          <div className="question-note" style={{ marginTop: '8px', fontSize: '13px', color: '#7F8C8D' }}>
            Collected for prospective validation — not included in current model calculation.
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="part1-step">
      <div className="section-header">Symptoms</div>

      <div className="question-card">
        <div className="question-header">
          <div className="question-number">10</div>
          <div className="question-text">Urinary Symptoms (IPSS)</div>
        </div>
      </div>

      {IPSS_QUESTIONS.map((q, index) => (
        <div key={index} className="question-card">
          <div className="question-header">
            <div className="question-number">{index + 1}</div>
            <div className="question-text">{q}</div>
          </div>
          <div className="question-body">
            <div className="option-grid c3">
              {IPSS_LABELS.map((label, value) => (
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

      <div className="score-total">
        IPSS Total: {localData.ipss.every(v => v !== null) ? localData.ipss.reduce((a, b) => a + b, 0) : '—'} / 35
      </div>

      <div className="question-card" style={{ marginTop: '16px' }}>
        <div className="question-header">
          <div className="question-number">11</div>
          <div className="question-text">Sexual Health (SHIM)</div>
        </div>
      </div>

      {SHIM_QUESTIONS.map((item, index) => (
        <div key={index} className="question-card">
          <div className="question-header">
            <div className="question-number">{index + 1}</div>
            <div className="question-text">{item.q}</div>
          </div>
          <div className="question-body">
            <div className="option-grid c3">
              {item.opts.map(([score, label]) => (
                <button
                  key={score}
                  className={`option-btn ${localData.shim[index] === score ? 'selected' : ''}`}
                  onClick={() => updateSHIM(index, score)}
                >
                  <span className="score">({score})</span> {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}

      <div className="score-total">
        SHIM Total: {localData.shim.every(v => v !== null) ? localData.shim.reduce((a, b) => a + b, 0) : '—'} / 25
      </div>
    </div>
  );

  const steps = [
    { label: 'About You', render: renderStep0 },
    { label: 'Family & Genetic Risk', render: renderStep1 },
    { label: 'Body Metrics', render: renderStep2 },
    { label: 'Lifestyle', render: renderStep3 },
    { label: 'Symptoms', render: renderStep4 },
  ];

  const answeredCount = countAnswered();
  const canProceedResult = canProceed();
  const totalQuestions = 23;

  return (
    <div className="part1-form-container">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}></div>
      </div>

      <div className="answer-counter">
        {answeredCount}/{totalQuestions} answered
      </div>

      {steps[part1Step]?.render()}

      <div className="form-navigation">
        <div className="form-navigation-inner">
          {part1Step > 0 && (
            <button className="btn-back" onClick={onBack}>
              ← Back
            </button>
          )}
          {part1Step < steps.length - 1 ? (
            <button className="btn-next" onClick={onNext}>
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
