import React, { useState, useEffect } from 'react';
import './Part2Form.css';

const Part2Form = ({ formData, setFormData, preResult, onNext, onBack, currentStep, totalSteps }) => {
  const [localData, setLocalData] = useState({
    knowPsa: formData.knowPsa || false,
    psa: formData.psa || '',
    onHormonalTherapy: formData.onHormonalTherapy || false,
    hormonalTherapyType: formData.hormonalTherapyType || '',
    knowPirads: formData.knowPirads || false,
    pirads: formData.pirads || '0',
  });

  useEffect(() => {
    // Sync local data to parent
    setFormData(localData);
  }, [localData, setFormData]);

  const updateField = (field, value) => {
    // Validate PSA input
    if (field === 'psa') {
      const psaNum = parseFloat(value);
      if (value === '' || value === null || value === undefined) {
        setLocalData(prev => ({ ...prev, [field]: '' }));
        return;
      }
      if (!isNaN(psaNum) && psaNum >= 0.1 && psaNum <= 100) {
        setLocalData(prev => ({ ...prev, [field]: value }));
      }
      return;
    }
    
    // For other fields, update normally
    setLocalData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    if (currentStep === 1) {
      // Step 1: Must know PSA and have valid PSA value
      if (!localData.knowPsa) return false;
      const psaNum = parseFloat(localData.psa);
      if (isNaN(psaNum) || psaNum <= 0 || psaNum > 100) {
        return false;
      }
      return true;
    }
    if (currentStep === 2) {
      // Step 2: PIRADS is optional, can always proceed if we have PSA
      return localData.knowPsa && parseFloat(localData.psa) > 0;
    }
    return true;
  };

  const renderStep1 = () => (
    <div className="part2-step">
      <div className="section-header">PSA Level</div>
      
      <div className="question-card">
        <div className="question-header">
          <div className="question-number">1</div>
          <div className="question-text">Do you know your PSA level?</div>
        </div>
        <div className="question-body">
          <div className="option-grid c2">
            {[
              { value: false, label: "No, I don't know my PSA" },
              { value: true, label: "Yes, I know my PSA level" },
            ].map(opt => (
              <button
                key={String(opt.value)}
                className={`option-btn ${localData.knowPsa === opt.value ? 'selected' : ''}`}
                onClick={() => {
                  updateField('knowPsa', opt.value);
                  if (!opt.value) {
                    updateField('psa', '');
                  }
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {localData.knowPsa && (
        <>
          <div className="question-card">
            <div className="question-header">
              <div className="question-number">2</div>
              <div className="question-text">Enter PSA Level (ng/mL)</div>
            </div>
            <div className="question-body">
              <input
                type="number"
                className="input-field"
                placeholder="PSA level (0.1-100)"
                step="0.1"
                min="0.1"
                max="100"
                value={localData.psa}
                onChange={(e) => updateField('psa', e.target.value)}
                onBlur={(e) => {
                  const psaNum = parseFloat(e.target.value);
                  if (e.target.value && (isNaN(psaNum) || psaNum < 0.1 || psaNum > 100)) {
                    e.target.setCustomValidity('PSA level must be between 0.1 and 100 ng/mL');
                  } else {
                    e.target.setCustomValidity('');
                  }
                }}
              />
              {localData.psa && (parseFloat(localData.psa) <= 0 || parseFloat(localData.psa) > 100) && (
                <div style={{ color: '#E74C3C', fontSize: '12px', marginTop: '4px' }}>
                  PSA level must be between 0.1 and 100 ng/mL
                </div>
              )}
              <div className="question-note" style={{ marginTop: '8px', fontSize: '13px', color: '#7F8C8D' }}>
                PSA (Prostate-Specific Antigen) is a blood test used to screen for prostate cancer.
              </div>
            </div>
          </div>

          <div className="question-card">
            <div className="question-header">
              <div className="question-number">3</div>
              <div className="question-text">Are you taking any hormonal medications that may affect PSA?</div>
              <span 
                className="info-icon" 
                title="Medications like finasteride (Propecia/Proscar), dutasteride (Avodart), or other 5-alpha reductase inhibitors can lower PSA levels by approximately 50%. This is important for accurate risk assessment."
              >
                ⓘ
              </span>
            </div>
            <div className="question-body">
              <div className="option-grid c2">
                {[
                  { value: false, label: "No / Not sure" },
                  { value: true, label: "Yes, I'm taking hormonal therapy" },
                ].map(opt => (
                  <button
                    key={String(opt.value)}
                    className={`option-btn ${localData.onHormonalTherapy === opt.value ? 'selected' : ''}`}
                    onClick={() => {
                      updateField('onHormonalTherapy', opt.value);
                      if (!opt.value) {
                        updateField('hormonalTherapyType', '');
                      }
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {localData.onHormonalTherapy && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: '#1C2833' }}>
                    Which medication? (optional)
                  </div>
                  <div className="option-grid c2">
                    {[
                      { value: 'finasteride', label: 'Finasteride (Propecia/Proscar)' },
                      { value: 'dutasteride', label: 'Dutasteride (Avodart)' },
                      { value: 'other', label: 'Other / Not sure' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        className={`option-btn ${localData.hormonalTherapyType === opt.value ? 'selected' : ''}`}
                        onClick={() => updateField('hormonalTherapyType', opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="question-note" style={{ marginTop: '8px', fontSize: '12px', color: '#F39C12' }}>
                    Note: These medications can lower PSA by ~50%. Your doctor may need to adjust the PSA value for accurate interpretation.
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="part2-step">
      <div className="section-header">MRI Results (Optional)</div>
      
      <div className="question-card">
        <div className="question-header">
          <div className="question-number">3</div>
          <div className="question-text">Do you know your MRI PIRADS score?</div>
        </div>
        <div className="question-body">
          <div className="option-grid c2">
            {[
              { value: false, label: "No" },
              { value: true, label: "Yes" },
            ].map(opt => (
              <button
                key={String(opt.value)}
                className={`option-btn ${localData.knowPirads === opt.value ? 'selected' : ''}`}
                onClick={() => updateField('knowPirads', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {localData.knowPirads && (
        <div className="question-card">
          <div className="question-header">
            <div className="question-number">4</div>
            <div className="question-text">PIRADS Score on MRI</div>
          </div>
          <div className="question-body">
            <div className="option-grid c3">
              {[
                { value: '1', label: '1' },
                { value: '2', label: '2' },
                { value: '3', label: '3' },
                { value: '4', label: '4' },
                { value: '5', label: '5' },
              ].map(opt => (
                <button
                  key={opt.value}
                  className={`option-btn ${localData.pirads === opt.value ? 'selected' : ''}`}
                  onClick={() => updateField('pirads', opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="question-note" style={{ marginTop: '8px', fontSize: '13px', color: '#7F8C8D' }}>
              PI-RADS (Prostate Imaging Reporting and Data System) scores range from 1-5, with higher scores indicating higher suspicion for clinically significant prostate cancer.
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const steps = [
    { label: "PSA", render: renderStep1 },
    { label: "MRI", render: renderStep2 },
  ];

  // Ensure Part 1 is complete before showing Part 2
  if (!preResult) {
    return (
      <div className="part2-form-container">
        <div className="error-message-box">
          <p>Please complete Part 1 (Screening Priority) before proceeding to Risk Assessment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="part2-form-container">
      <div className="part1-summary-box">
        <div className="summary-label">Part 1 Results:</div>
        <div className="summary-content">
          <span>Score: <strong>{preResult.score}%</strong></span>
          <span>Risk: <strong>{preResult.risk}</strong></span>
        </div>
      </div>
      
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      
      <div className="form-navigation">
        <div className="form-navigation-inner">
          {typeof onBack === 'function' && (
            <button className="btn-back" onClick={onBack}>
              ← Back
            </button>
          )}
          {currentStep < 2 ? (
            <button 
              className="btn-next" 
              onClick={onNext}
              disabled={!canProceed()}
            >
              Next →
            </button>
          ) : (
            <button 
              className="btn-calculate" 
              onClick={onNext}
              disabled={!canProceed()}
            >
              Calculate Risk Assessment ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Part2Form;
