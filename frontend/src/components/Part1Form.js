import React, { useState, useEffect } from 'react';
import './Part1Form.css';

const IPSS_QUESTIONS = [
  "Incomplete emptying — not fully emptying your bladder?",
  "Frequency — urinating again within 2 hours?",
  "Intermittency — stopping and starting during urination?",
  "Urgency — difficulty postponing urination?",
  "Weak stream — weak urinary stream?",
  "Straining — pushing or straining to begin?",
  "Nocturia — getting up at night to urinate?",
];

const IPSS_LABELS = ["Not at all", "< 1 in 5", "< Half", "~ Half", "> Half", "Always"];

const SHIM_QUESTIONS = [
  {
    q: "How do you rate your confidence that you could get and keep an erection?",
    opts: [[1, "Very low"], [2, "Low"], [3, "Moderate"], [4, "High"], [5, "Very high"]]
  },
  {
    q: "When you had erections with sexual stimulation, how often were they hard enough for penetration?",
    opts: [[0, "No activity"], [1, "Almost never"], [2, "A few times"], [3, "Sometimes"], [4, "Most times"], [5, "Almost always"]]
  },
  {
    q: "During intercourse, how often were you able to maintain your erection after penetration?",
    opts: [[0, "Did not attempt"], [1, "Almost never"], [2, "A few times"], [3, "Sometimes"], [4, "Most times"], [5, "Almost always"]]
  },
  {
    q: "During intercourse, how difficult was it to maintain your erection to completion?",
    opts: [[0, "Did not attempt"], [1, "Extremely difficult"], [2, "Very difficult"], [3, "Difficult"], [4, "Slightly difficult"], [5, "Not difficult"]]
  },
  {
    q: "When you attempted intercourse, how often was it satisfactory for you?",
    opts: [[0, "Did not attempt"], [1, "Almost never"], [2, "A few times"], [3, "Sometimes"], [4, "Most times"], [5, "Almost always"]]
  },
];

const Part1Form = ({ formData, setFormData, onNext, onBack, currentStep: part1Step, totalSteps }) => {
  const [localData, setLocalData] = useState({
    age: formData.age || '',
    race: formData.race || null,
    heightFt: formData.heightFt || '',
    heightIn: formData.heightIn || '',
    weight: formData.weight || '',
    bmi: formData.bmi || 0,
    familyHistory: formData.familyHistory || null,
    ipss: formData.ipss || Array(7).fill(null),
    shim: formData.shim || Array(5).fill(null),
    exercise: formData.exercise || null,
    smoking: formData.smoking || null,
    diabetes: formData.diabetes || null,
    conditions: formData.conditions || [],
    medications: formData.medications || [],
  });

  useEffect(() => {
    // Calculate BMI when height/weight changes
    const ft = parseFloat(localData.heightFt) || 0;
    const inches = parseFloat(localData.heightIn) || 0;
    const weight = parseFloat(localData.weight) || 0;
    const totalInches = ft * 12 + inches;
    
    if (totalInches > 0 && weight > 0) {
      const bmi = (weight / (totalInches * totalInches)) * 703;
      setLocalData(prev => ({ ...prev, bmi }));
    } else {
      setLocalData(prev => ({ ...prev, bmi: 0 }));
    }
  }, [localData.heightFt, localData.heightIn, localData.weight]);

  useEffect(() => {
    // Sync local data to parent
    console.log('Part1Form: Syncing localData to parent:', localData);
    setFormData(localData);
  }, [localData, setFormData]);

  const updateField = (field, value) => {
    // Validate numeric fields
    if (field === 'age') {
      // Age must be between 30 and 95
      const ageNum = parseInt(value, 10);
      if (value === '' || value === null || value === undefined) {
        setLocalData(prev => ({ ...prev, [field]: '' }));
        return;
      }
      if (isNaN(ageNum) || ageNum < 30 || ageNum > 95) {
        // Don't update if invalid, but allow typing
        return;
      }
      setLocalData(prev => ({ ...prev, [field]: ageNum.toString() }));
      return;
    }
    
    if (field === 'heightFt') {
      // Height feet: 3-8 feet
      const ftNum = parseInt(value, 10);
      if (value === '' || value === null || value === undefined) {
        setLocalData(prev => ({ ...prev, [field]: '' }));
        return;
      }
      if (isNaN(ftNum) || ftNum < 3 || ftNum > 8) {
        return;
      }
      setLocalData(prev => ({ ...prev, [field]: ftNum.toString() }));
      return;
    }
    
    if (field === 'heightIn') {
      // Height inches: 0-11 inches
      const inNum = parseInt(value, 10);
      if (value === '' || value === null || value === undefined) {
        setLocalData(prev => ({ ...prev, [field]: '' }));
        return;
      }
      if (isNaN(inNum) || inNum < 0 || inNum > 11) {
        return;
      }
      setLocalData(prev => ({ ...prev, [field]: inNum.toString() }));
      return;
    }
    
    if (field === 'weight') {
      // Weight: 50-500 lbs (reasonable range)
      const weightNum = parseFloat(value);
      if (value === '' || value === null || value === undefined) {
        setLocalData(prev => ({ ...prev, [field]: '' }));
        return;
      }
      if (isNaN(weightNum) || weightNum < 50 || weightNum > 500) {
        return;
      }
      setLocalData(prev => ({ ...prev, [field]: weightNum.toString() }));
      return;
    }
    
    // For non-numeric fields, update normally
    setLocalData(prev => ({ ...prev, [field]: value }));
  };

  const updateIPSS = (index, value) => {
    const newIPSS = [...localData.ipss];
    newIPSS[index] = parseInt(value);
    setLocalData(prev => ({ ...prev, ipss: newIPSS }));
  };

  const updateSHIM = (index, value) => {
    const newSHIM = [...localData.shim];
    newSHIM[index] = parseInt(value);
    setLocalData(prev => ({ ...prev, shim: newSHIM }));
  };

  const toggleCheckbox = (field, value) => {
    const current = localData[field] || [];
    const index = current.indexOf(value);
    if (index > -1) {
      const updated = current.filter(item => item !== value);
      setLocalData(prev => ({ ...prev, [field]: updated }));
    } else {
      setLocalData(prev => ({ ...prev, [field]: [...current, value] }));
    }
  };

  const countAnswered = () => {
    let count = 0;
    // Demographics (4 questions)
    const ageNum = parseInt(localData.age, 10);
    if (localData.age && localData.age !== '' && !isNaN(ageNum) && ageNum >= 30 && ageNum <= 95) count++;
    
    if (localData.race !== null && localData.race !== undefined && localData.race !== '') count++;
    
    // BMI only counts if height and weight are valid
    const ftNum = parseInt(localData.heightFt, 10);
    const inNum = parseInt(localData.heightIn, 10);
    const weightNum = parseFloat(localData.weight);
    const hasValidHeight = !isNaN(ftNum) && ftNum >= 3 && ftNum <= 8 && 
                           !isNaN(inNum) && inNum >= 0 && inNum <= 11;
    const hasValidWeight = !isNaN(weightNum) && weightNum >= 50 && weightNum <= 500;
    if (localData.bmi > 0 && hasValidHeight && hasValidWeight) count++;
    
    if (localData.familyHistory !== null && localData.familyHistory !== undefined) count++;
    // IPSS (7 questions)
    localData.ipss.forEach(v => { if (v !== null && v !== undefined) count++; });
    // SHIM (5 questions)
    localData.shim.forEach(v => { if (v !== null && v !== undefined) count++; });
    // Lifestyle (2 required questions - exercise and smoking)
    // Diabetes is NOT counted in the 18 required questions
    if (localData.exercise !== null && localData.exercise !== undefined) count++;
    if (localData.smoking !== null && localData.smoking !== undefined) count++;
    // Total: 4 + 7 + 5 + 2 = 18
    return count;
  };

  const canProceed = () => {
    // Check all required fields (18 questions total, excluding diabetes)
    const ageNum = parseInt(localData.age, 10);
    const hasAge = localData.age && localData.age !== '' && !isNaN(ageNum) && ageNum >= 30 && ageNum <= 95;
    
    const hasRace = localData.race !== null && localData.race !== undefined && localData.race !== '';
    
    // Validate height and weight are valid numbers
    const ftNum = parseInt(localData.heightFt, 10);
    const inNum = parseInt(localData.heightIn, 10);
    const weightNum = parseFloat(localData.weight);
    const hasValidHeight = !isNaN(ftNum) && ftNum >= 3 && ftNum <= 8 && 
                           !isNaN(inNum) && inNum >= 0 && inNum <= 11;
    const hasValidWeight = !isNaN(weightNum) && weightNum >= 50 && weightNum <= 500;
    const hasBMI = localData.bmi > 0 && !isNaN(localData.bmi) && hasValidHeight && hasValidWeight;
    
    const hasFamilyHistory = localData.familyHistory !== null && localData.familyHistory !== undefined;
    const ipssComplete = Array.isArray(localData.ipss) && localData.ipss.length === 7 && localData.ipss.every(v => v !== null && v !== undefined);
    const shimComplete = Array.isArray(localData.shim) && localData.shim.length === 5 && localData.shim.every(v => v !== null && v !== undefined);
    const hasExercise = localData.exercise !== null && localData.exercise !== undefined;
    const hasSmoking = localData.smoking !== null && localData.smoking !== undefined;
    
    const canProceedResult = hasAge && hasRace && hasBMI && hasFamilyHistory && ipssComplete && shimComplete && hasExercise && hasSmoking;
    
    // Debug logging to help identify missing fields
    const currentCount = countAnswered();
    if (!canProceedResult && currentCount >= 17) {
      console.log('Validation check (18/18 shown but button disabled):', {
        hasAge,
        hasRace,
        hasBMI,
        hasValidHeight,
        hasValidWeight,
        hasFamilyHistory,
        ipssComplete,
        shimComplete,
        hasExercise,
        hasSmoking,
        age: localData.age,
        ageNum,
        race: localData.race,
        heightFt: localData.heightFt,
        heightIn: localData.heightIn,
        weight: localData.weight,
        bmi: localData.bmi,
        familyHistory: localData.familyHistory,
        ipss: localData.ipss,
        ipssLength: localData.ipss?.length,
        shim: localData.shim,
        shimLength: localData.shim?.length,
        exercise: localData.exercise,
        smoking: localData.smoking,
        answeredCount: currentCount
      });
    }
    
    return canProceedResult;
  };

  const renderStep0 = () => (
    <div className="part1-step">
      <div className="section-header">Demographics</div>
      
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
            onBlur={(e) => {
              const ageNum = parseInt(e.target.value, 10);
              if (e.target.value && (isNaN(ageNum) || ageNum < 30 || ageNum > 95)) {
                e.target.setCustomValidity('Age must be between 30 and 95');
              } else {
                e.target.setCustomValidity('');
              }
            }}
          />
          {localData.age && (parseInt(localData.age, 10) < 30 || parseInt(localData.age, 10) > 95) && (
            <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '4px' }}>
              Age must be between 30 and 95
            </div>
          )}
        </div>
      </div>

      <div className="question-card">
        <div className="question-header">
          <div className="question-number">2</div>
          <div className="question-text">Race / Ethnicity</div>
        </div>
        <div className="question-body">
          <div className="option-grid c3">
            {[
              { value: "white", label: "White" },
              { value: "black", label: "Black / African American" },
              { value: "hispanic", label: "Hispanic" },
              { value: "asian", label: "Asian" },
              { value: "other", label: "Other" },
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
        </div>
      </div>

      <div className="question-card">
        <div className="question-header">
          <div className="question-number">3</div>
          <div className="question-text">Height & Weight</div>
        </div>
        <div className="question-body">
          <div className="input-row">
            <input
              type="number"
              className="input-field input-sm"
              placeholder="ft (3-8)"
              min="3"
              max="8"
              value={localData.heightFt}
              onChange={(e) => updateField('heightFt', e.target.value)}
              onBlur={(e) => {
                const ftNum = parseInt(e.target.value, 10);
                if (e.target.value && (isNaN(ftNum) || ftNum < 3 || ftNum > 8)) {
                  e.target.setCustomValidity('Height must be between 3 and 8 feet');
                } else {
                  e.target.setCustomValidity('');
                }
              }}
            />
            <span>ft</span>
            <input
              type="number"
              className="input-field input-sm"
              placeholder="in (0-11)"
              min="0"
              max="11"
              value={localData.heightIn}
              onChange={(e) => updateField('heightIn', e.target.value)}
              onBlur={(e) => {
                const inNum = parseInt(e.target.value, 10);
                if (e.target.value && (isNaN(inNum) || inNum < 0 || inNum > 11)) {
                  e.target.setCustomValidity('Inches must be between 0 and 11');
                } else {
                  e.target.setCustomValidity('');
                }
              }}
            />
            <span>in</span>
            <input
              type="number"
              className="input-field"
              placeholder="lbs (50-500)"
              min="50"
              max="500"
              step="0.1"
              style={{ width: '80px' }}
              value={localData.weight}
              onChange={(e) => updateField('weight', e.target.value)}
              onBlur={(e) => {
                const weightNum = parseFloat(e.target.value);
                if (e.target.value && (isNaN(weightNum) || weightNum < 50 || weightNum > 500)) {
                  e.target.setCustomValidity('Weight must be between 50 and 500 lbs');
                } else {
                  e.target.setCustomValidity('');
                }
              }}
            />
            <span>lbs</span>
          </div>
          {localData.heightFt && (parseInt(localData.heightFt, 10) < 3 || parseInt(localData.heightFt, 10) > 8) && (
            <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '4px' }}>
              Height (feet) must be between 3 and 8
            </div>
          )}
          {localData.heightIn && (parseInt(localData.heightIn, 10) < 0 || parseInt(localData.heightIn, 10) > 11) && (
            <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '4px' }}>
              Height (inches) must be between 0 and 11
            </div>
          )}
          {localData.weight && (parseFloat(localData.weight) < 50 || parseFloat(localData.weight) > 500) && (
            <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '4px' }}>
              Weight must be between 50 and 500 lbs
            </div>
          )}
          {localData.bmi > 0 && (
            <div className="bmi-display">BMI: {localData.bmi.toFixed(1)}</div>
          )}
          {localData.heightFt && localData.heightIn && localData.weight && localData.bmi === 0 && (
            <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '4px' }}>
              Please enter valid height and weight values
            </div>
          )}
        </div>
      </div>

      <div className="question-card">
        <div className="question-header">
          <div className="question-number">4</div>
          <div className="question-text">Family History of Prostate Cancer</div>
        </div>
        <div className="question-body">
          <div className="option-grid c3">
            {[
              { value: 0, label: "No" },
              { value: 1, label: "Yes, 1 relative" },
              { value: 2, label: "Yes, 2+" },
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
    </div>
  );

  const renderStep1 = () => (
    <div className="part1-step">
      <div className="section-header">🏃 Urinary Symptoms (IPSS)</div>
      
      {IPSS_QUESTIONS.map((question, index) => (
        <div key={index} className="question-card">
          <div className="question-header">
            <div className="question-number">{index + 5}</div>
            <div className="question-text">{question}</div>
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
    </div>
  );

  const renderStep2 = () => (
    <div className="part1-step">
      <div className="section-header">🏃 Sexual Health (SHIM)</div>
      
      {SHIM_QUESTIONS.map((item, index) => (
        <div key={index} className="question-card">
          <div className="question-header">
            <div className="question-number">{index + 12}</div>
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

  const renderStep3 = () => (
    <div className="part1-step">
      <div className="section-header">🏃 Lifestyle & Medical History</div>
      
      <div className="question-card">
        <div className="question-header">
          <div className="question-number">17</div>
          <div className="question-text">Exercise Frequency</div>
        </div>
        <div className="question-body">
          <div className="option-grid c3">
            {[
              { value: 2, label: "No regular exercise" },
              { value: 1, label: "1–2 days/week" },
              { value: 0, label: "3+ days/week" },
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
        </div>
      </div>

      <div className="question-card">
        <div className="question-header">
          <div className="question-number">18</div>
          <div className="question-text">Smoking History</div>
        </div>
        <div className="question-body">
          <div className="option-grid c3">
            {[
              { value: 0, label: "Never smoked" },
              { value: 1, label: "Former smoker" },
              { value: 2, label: "Current smoker" },
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
        </div>
      </div>

      <div className="question-card">
        <div className="question-header">
          <div className="question-number">19</div>
          <div className="question-text">Diabetes</div>
        </div>
        <div className="question-body">
          <div className="option-grid c2">
            {[
              { value: 0, label: "No" },
              { value: 1, label: "Yes" },
            ].map(opt => (
              <button
                key={opt.value}
                className={`option-btn ${localData.diabetes === opt.value ? 'selected' : ''}`}
                onClick={() => updateField('diabetes', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="question-card">
        <div className="question-header">
          <div className="question-number">20</div>
          <div className="question-text">Medical Conditions</div>
        </div>
        <div className="question-body">
          {["High blood pressure", "High cholesterol", "Heart disease", "None"].map(item => (
            <label key={item} className="checkbox-row">
              <input
                type="checkbox"
                checked={localData.conditions.includes(item)}
                onChange={() => toggleCheckbox('conditions', item)}
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="question-card">
        <div className="question-header">
          <div className="question-number">21</div>
          <div className="question-text">Medications</div>
        </div>
        <div className="question-body">
          {["Finasteride / Dutasteride", "Testosterone therapy", "Statin", "None"].map(item => (
            <label key={item} className="checkbox-row">
              <input
                type="checkbox"
                checked={localData.medications.includes(item)}
                onChange={() => toggleCheckbox('medications', item)}
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const steps = [
    { label: "Demographics", render: renderStep0 },
    { label: "Urinary Symptoms", render: renderStep1 },
    { label: "Sexual Health", render: renderStep2 },
    { label: "Lifestyle", render: renderStep3 },
  ];

  const answeredCount = countAnswered();
  const canProceedResult = canProceed();

  return (
    <div className="part1-form-container">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${(answeredCount / 18) * 100}%` }}></div>
      </div>
      
      <div className="answer-counter">
        {answeredCount}/18 answered
        {answeredCount === 18 && !canProceedResult && (
          <span style={{ color: '#E74C3C', fontSize: '12px', marginLeft: '8px' }}>
            (Please check all fields are valid)
          </span>
        )}
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
              title={!canProceedResult ? "Please complete all required fields" : "Click to calculate your score"}
            >
              {canProceedResult ? "Calculate My Score ✓" : `Complete all questions (${answeredCount}/18)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Part1Form;
