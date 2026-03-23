import React, { useState, useEffect } from 'react';
import './Part2Form.css';
import { useTranslation } from 'react-i18next';

const Part2Form = ({ formData, setFormData, preResult, onNext, onBack, currentStep, totalSteps }) => {
  const { t } = useTranslation();
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
      <div className="section-header">{t('part2.steps.psa.sectionTitle')}</div>
      
      <div className="question-card">
        <div className="question-header">
          <div className="question-number">1</div>
          <div className="question-text">{t('part2.psa.q1')}</div>
        </div>
        <div className="question-body">
          <div className="option-grid c2">
            {[
              { value: false, label: t('part2.psa.q1OptNo') },
              { value: true, label: t('part2.psa.q1OptYes') },
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
              <div className="question-text">{t('part2.psa.q2')}</div>
            </div>
            <div className="question-body">
              <input
                type="number"
                className="input-field"
                placeholder={t('part2.psa.psaPlaceholder')}
                step="0.1"
                min="0.1"
                max="100"
                value={localData.psa}
                onChange={(e) => updateField('psa', e.target.value)}
                onBlur={(e) => {
                  const psaNum = parseFloat(e.target.value);
                  if (e.target.value && (isNaN(psaNum) || psaNum < 0.1 || psaNum > 100)) {
                    e.target.setCustomValidity(t('part2.psa.psaInvalidValidity'));
                  } else {
                    e.target.setCustomValidity('');
                  }
                }}
              />
              {localData.psa && (parseFloat(localData.psa) <= 0 || parseFloat(localData.psa) > 100) && (
                <div style={{ color: '#E74C3C', fontSize: '0.75rem', marginTop: '4px' }}>
                  {t('part2.psa.psaInvalid')}
                </div>
              )}
              <div className="question-note" style={{ marginTop: '8px', fontSize: '0.8125rem', color: '#7F8C8D' }}>
                {t('part2.psa.psaNote')}
              </div>
            </div>
          </div>

          <div className="question-card">
            <div className="question-header">
              <div className="question-number">3</div>
              <div className="question-text">{t('part2.psa.q3')}</div>
              <span 
                className="info-icon" 
                title={t('part2.psa.q3InfoTitle')}
              >
                ⓘ
              </span>
            </div>
            <div className="question-body">
              <div className="option-grid c2">
                {[
                  { value: false, label: t('part2.psa.q3OptNo') },
                  { value: true, label: t('part2.psa.q3OptYes') },
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
                  <div style={{ fontSize: '0.8125rem', fontWeight: '500', marginBottom: '8px', color: '#1C2833' }}>
                    {t('part2.psa.q4Label')}
                  </div>
                  <div className="option-grid c2">
                    {[
                      { value: 'finasteride', label: t('part2.psa.q4OptFinasteride') },
                      { value: 'dutasteride', label: t('part2.psa.q4OptDutasteride') },
                      { value: 'other', label: t('part2.psa.q4OptOther') },
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
                  <div className="question-note" style={{ marginTop: '8px', fontSize: '0.75rem', color: '#F39C12' }}>
                    {t('part2.psa.q4Note')}
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
      <div className="section-header">{t('part2.steps.mri.sectionTitle')}</div>
      
      <div className="question-card">
        <div className="question-header">
          <div className="question-number">3</div>
          <div className="question-text">{t('part2.mri.q1')}</div>
        </div>
        <div className="question-body">
          <div className="option-grid c2">
            {[
              { value: false, label: t('part2.mri.q1OptNo') },
              { value: true, label: t('part2.mri.q1OptYes') },
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
            <div className="question-text">{t('part2.mri.q2')}</div>
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
            <div className="question-note" style={{ marginTop: '8px', fontSize: '0.8125rem', color: '#7F8C8D' }}>
              {t('part2.mri.q2Note')}
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
          <p>{t('part2.form.errorPreResult')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="part2-form-container">
      <div className="flow-header">
        <div className="flow-step-chip">{t('part2.flow.stepChip', { current: currentStep })}</div>
        <h3 className="flow-step-title">{t(`part2.steps.${currentStep === 1 ? 'psa' : 'mri'}.sectionTitle`)}</h3>
        <p className="flow-step-note">{t('part2.flow.note')}</p>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${(currentStep / 2) * 100}%` }}></div>
      </div>
      <div className="part1-summary-box">
        <div className="summary-label">{t('part2.summary.label')}</div>
        <div className="summary-content">
          <span>{t('part2.summary.scoreLabel')}: <strong>{preResult.score}%</strong></span>
          <span>{t('part2.summary.riskLabel')}: <strong>{preResult.risk}</strong></span>
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
              {t('part2.nav.next')}
            </button>
          ) : (
            <button 
              className="btn-calculate" 
              onClick={onNext}
              disabled={!canProceed()}
            >
              {t('part2.nav.calculate')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Part2Form;
