import React, { useState, useEffect } from 'react';
import './Part2Form.css';
import { useTranslation } from 'react-i18next';
import InfoIcon from './InfoIcon';
import { fieldReferences } from '../utils/fieldReferences';

const Part2Form = ({ formData, setFormData, preResult, onNext, onBack, currentStep, totalSteps, pathwayMode }) => {
  const { t } = useTranslation();

  // For post_psa / post_mri pathways the user already confirmed they have PSA data.
  // For post_mri they also have PI-RADS. Pre-set the "know" flags so we can skip
  // the toggle questions and go straight to the value inputs.
  const hasPsaPathway  = pathwayMode === 'post_psa' || pathwayMode === 'post_mri';
  const hasMriPathway  = pathwayMode === 'post_mri';
  const totalPart2Steps = hasMriPathway ? 2 : 1;

  const [localData, setLocalData] = useState({
    knowPsa: hasPsaPathway ? true : (formData.knowPsa || false),
    psa: formData.psa || '',
    prostateVolume: formData.prostateVolume || '',
    onHormonalTherapy: formData.onHormonalTherapy || false,
    hormonalTherapyType: formData.hormonalTherapyType || '',
    knowPirads: hasMriPathway ? true : (formData.knowPirads || false),
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

    // Validate optional prostate volume input (for PSA density)
    if (field === 'prostateVolume') {
      if (value === '' || value === null || value === undefined) {
        setLocalData(prev => ({ ...prev, [field]: '' }));
        return;
      }
      const volNum = parseFloat(value);
      if (!Number.isNaN(volNum) && volNum >= 5 && volNum <= 200) {
        setLocalData(prev => ({ ...prev, [field]: value }));
      }
      return;
    }
    
    // For other fields, update normally
    setLocalData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    if (currentStep === 1) {
      if (!localData.knowPsa) return false;
      const psaNum = parseFloat(localData.psa);
      if (isNaN(psaNum) || psaNum <= 0 || psaNum > 100) return false;
      return true;
    }
    if (currentStep === 2) {
      // PI-RADS is optional — can always proceed once PSA is confirmed
      return localData.knowPsa && parseFloat(localData.psa) > 0;
    }
    return true;
  };

  const renderStep1 = () => (
    <div className="part2-step">
      <div className="section-header">
        {hasPsaPathway ? 'Your PSA Result' : t('part2.steps.psa.sectionTitle')}
      </div>

      {/* "Do you know your PSA?" toggle — only shown for users who didn't pre-select a PSA pathway */}
      {!hasPsaPathway && (
        <div className="question-card">
          <div className="question-header">
            <div className="question-number">1</div>
            <div className="question-text">{t('part2.psa.q1')}</div>
            <InfoIcon
              title="PSA Level — evidence sources"
              description="PSA levels are used in Part 2 for educational risk stratification in combination with your baseline profile."
              sources={fieldReferences.part2.psaLevel.sources}
            />
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
                    if (!opt.value) updateField('psa', '');
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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

              <div style={{ marginTop: '10px', fontSize: '0.8125rem', fontWeight: 600, color: '#1C2833' }}>
                Prostate Volume (mL) (optional)
              </div>
              <input
                type="number"
                className="input-field"
                placeholder="e.g. 30"
                step="1"
                min="5"
                max="200"
                value={localData.prostateVolume}
                onChange={(e) => updateField('prostateVolume', e.target.value)}
              />
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
      <div className="section-header">
        {hasMriPathway ? 'Your MRI Results' : t('part2.steps.mri.sectionTitle')}
      </div>

      {/* "Do you know your PI-RADS?" toggle — hidden for post_mri (user confirmed MRI at pathway select) */}
      {!hasMriPathway && (
        <div className="question-card">
          <div className="question-header">
            <div className="question-number">3</div>
            <div className="question-text">{t('part2.mri.q1')}</div>
            <InfoIcon
              title="MRI PI-RADS — evidence sources"
              description="PI-RADS scoring is used in Part 2 (when provided) to help refine educational risk category."
              sources={fieldReferences.part2.pirads.sources}
            />
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
      )}

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

  // Step chip label varies by pathway and step
  const stepChipLabel = (() => {
    if (totalPart2Steps === 1) return 'Your PSA Result';
    if (currentStep === 1) return 'Step 1 of 2 — Your PSA Result';
    return 'Step 2 of 2 — Your MRI Results';
  })();

  // Step title varies by pathway and step
  const stepTitle = (() => {
    if (currentStep === 2) return hasMriPathway ? 'Your MRI Results' : t('part2.steps.mri.sectionTitle');
    return hasPsaPathway ? 'Enter your PSA level' : t('part2.steps.psa.sectionTitle');
  })();

  // Step note varies by pathway
  const stepNote = (() => {
    if (currentStep === 2) {
      return hasMriPathway
        ? 'Enter the PI-RADS score from your MRI report. Your radiologist or urologist will have this.'
        : t('part2.flow.note');
    }
    if (hasMriPathway) return 'Enter your PSA level first. You\'ll add your MRI score on the next screen.';
    if (hasPsaPathway) return 'Enter your PSA level to see how it fits with your full risk profile.';
    return t('part2.flow.note');
  })();

  return (
    <div className="part2-form-container">
      <div className="flow-header">
        <div className="flow-step-chip">{stepChipLabel}</div>
        <h3 className="flow-step-title">{stepTitle}</h3>
        <p className="flow-step-note">{stepNote}</p>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${(currentStep / totalPart2Steps) * 100}%` }} />
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
            <button className="btn-back" onClick={onBack}>← Back</button>
          )}
          {currentStep < totalPart2Steps ? (
            <button className="btn-next" onClick={onNext} disabled={!canProceed()}>
              {t('part2.nav.next')}
            </button>
          ) : (
            <button className="btn-calculate" onClick={onNext} disabled={!canProceed()}>
              {t('part2.nav.calculate')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Part2Form;
