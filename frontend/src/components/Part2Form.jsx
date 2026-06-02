import React, { useState, useEffect } from 'react';
import './Part2Form.css';
import './epsa-v2-layout.css';
import { useTranslation } from 'react-i18next';
import InfoIcon from './InfoIcon';
import { fieldReferences } from '../utils/fieldReferences';

const PSA_CONTEXT = [
  { max: 2.5,  label: 'Below typical threshold', cls: 'psa-ctx--green',  note: 'PSA below 2.5 ng/mL is generally considered reassuring for most age groups.' },
  { max: 4.0,  label: 'Low-normal range',         cls: 'psa-ctx--teal',   note: 'PSA 2.5–4.0 ng/mL sits at the lower edge of the guideline threshold. Context from your profile matters.' },
  { max: 10.0, label: 'Gray zone',                cls: 'psa-ctx--amber',  note: 'PSA 4–10 ng/mL is the "gray zone." AUA/NCCN often recommend further evaluation at this level.' },
  { max: 20.0, label: 'Elevated',                 cls: 'psa-ctx--orange', note: 'PSA > 10 ng/mL is considered elevated. Your urologist will evaluate further, often with MRI or biopsy.' },
  { max: Infinity, label: 'Significantly elevated', cls: 'psa-ctx--red', note: 'PSA > 20 ng/mL warrants prompt urological evaluation.' },
];

const getPsaContext = (psa) => {
  const v = parseFloat(psa);
  if (!isFinite(v) || v <= 0) return null;
  return PSA_CONTEXT.find(c => v < c.max) || PSA_CONTEXT[PSA_CONTEXT.length - 1];
};

const PIRADS_OPTIONS = [
  { value: '1', label: '1', desc: 'No finding' },
  { value: '2', label: '2', desc: 'Benign' },
  { value: '3', label: '3', desc: 'Equivocal' },
  { value: '4', label: '4', desc: 'Suspicious' },
  { value: '5', label: '5', desc: 'Highly suspicious' },
];

const Part2Form = ({ formData, setFormData, preResult, onNext, onBack, currentStep, totalSteps, pathwayMode }) => {
  const { t } = useTranslation();

  // For post_psa / post_mri pathways the user already confirmed they have PSA data.
  // For post_mri they also have PI-RADS. Pre-set the "know" flags so we can skip
  // the toggle questions and go straight to the value inputs.
  const hasPsaPathway  = pathwayMode === 'post_psa' || pathwayMode === 'post_mri';
  const hasMriPathway  = pathwayMode === 'post_mri';
  const totalPart2Steps = 2; // MRI is always available as optional Step 2

  const [localData, setLocalData] = useState({
    knowPsa: hasPsaPathway ? true : (formData.knowPsa || false),
    psa: formData.psa || '',
    prostateVolume: formData.prostateVolume || '',
    onHormonalTherapy: formData.onHormonalTherapy || false,
    hormonalTherapyType: formData.hormonalTherapyType || '',
    knowPirads: hasMriPathway ? true : (formData.knowPirads || false),
    pirads: formData.pirads || '0',
    piradsLesions: Array.isArray(formData.piradsLesions) ? formData.piradsLesions : [],
  });

  useEffect(() => {
    setFormData(localData);
  }, [localData]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateField = (field, value) => {
    // Validate PSA input
    if (field === 'psa') {
      if (value === '' || value === null || value === undefined) {
        setLocalData(prev => ({ ...prev, [field]: '' }));
        return;
      }
      // Store the value even if out of range so the inline error message renders;
      // canProceed() blocks advancing until the value is valid
      const psaNum = parseFloat(value);
      if (!isNaN(psaNum) && psaNum >= 0) {
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
      if (isNaN(psaNum) || psaNum < 0.1 || psaNum > 100) return false;
      return true;
    }
    if (currentStep === 2) {
      // PI-RADS is optional — can always proceed once PSA is confirmed
      const p = parseFloat(localData.psa);
      return localData.knowPsa && p >= 0.1 && p <= 100;
    }
    return true;
  };

  const renderStep1 = () => (
    <div className="part2-step">
      <div className="v2-section-label">
        <span className="v2-section-eyebrow">Section 1 · PSA</span>
        <span className="v2-section-title">{hasPsaPathway ? 'Your PSA Result' : t('part2.steps.psa.sectionTitle')}</span>
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
              <label htmlFor="field-psa" className="sr-only">{t('part2.psa.q2')}</label>
              <input
                id="field-psa"
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
              {localData.psa && (parseFloat(localData.psa) < 0.1 || parseFloat(localData.psa) > 100) && (
                <div role="alert" aria-live="polite" style={{ color: '#E74C3C', fontSize: '0.75rem', marginTop: '4px' }}>
                  {t('part2.psa.psaInvalid')}
                </div>
              )}

              {/* PSA contextual feedback */}
              {(() => {
                const ctx = getPsaContext(localData.psa);
                if (!ctx) return null;
                const psaNum = parseFloat(localData.psa);
                if (psaNum < 0.1 || psaNum > 100) return null;
                return (
                  <div className={`psa-ctx ${ctx.cls}`} role="status" aria-live="polite">
                    <span className="psa-ctx-label">{ctx.label}</span>
                    <span className="psa-ctx-note">{ctx.note}</span>
                  </div>
                );
              })()}

              <label htmlFor="field-prostate-volume" style={{ display: 'block', marginTop: '10px', fontSize: '0.8125rem', fontWeight: 600 }}>
                Prostate Volume (mL) <span style={{ fontWeight: 400, color: '#6b7280' }}>(optional — from MRI or ultrasound report)</span>
              </label>
              <input
                id="field-prostate-volume"
                type="number"
                className="input-field"
                placeholder="e.g. 30"
                step="1"
                min="5"
                max="200"
                value={localData.prostateVolume}
                onChange={(e) => updateField('prostateVolume', e.target.value)}
              />
              <div className="question-note" style={{ marginTop: '8px', fontSize: '0.8125rem' }}>
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
                  <div className="question-subtext" style={{ fontSize: '0.8125rem', fontWeight: '500', marginBottom: '8px' }}>
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
                  <div className="question-note" style={{ marginTop: '8px', fontSize: '0.75rem', color: '#92400e' }}> {/* darkened from #F39C12 for WCAG AA contrast */}
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
      <div className="v2-section-label">
        <span className="v2-section-eyebrow">Section 2 · MRI</span>
        <span className="v2-section-title">{hasMriPathway ? 'Your MRI Results' : t('part2.steps.mri.sectionTitle')}</span>
      </div>

      {/* "Do you know your PI-RADS?" toggle — hidden for post_mri (user confirmed MRI at pathway select) */}
      {!hasMriPathway && (
        <div className="question-card">
          <div className="question-header">
            <div className="question-number">1</div>
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
            <div className="question-number">{hasMriPathway ? 1 : 2}</div>
            <div className="question-text">{t('part2.mri.q2')}</div>
          </div>
          <div className="question-body">
            {(() => {
              // Multi-lesion support: array of PI-RADS scores per detected lesion.
              // The engine takes the maximum (worst-lesion drives clinical decision).
              // We keep `localData.pirads` in sync with the max for backward compat.
              const lesionsRaw = Array.isArray(localData.piradsLesions) ? localData.piradsLesions : [];
              const lesions = lesionsRaw.length > 0 ? lesionsRaw : [localData.pirads ?? null];
              const updateLesions = (next) => {
                const cleaned = next.map(v => (v === '' || v === null || v === undefined) ? null : String(v));
                const maxVal = cleaned
                  .filter(v => v != null)
                  .map(v => Number(v))
                  .reduce((a, b) => (b > a ? b : a), 0);
                updateField('piradsLesions', cleaned);
                updateField('pirads', maxVal > 0 ? String(maxVal) : null);
              };
              return (
                <>
                  {lesions.map((lesionVal, idx) => (
                    <div key={idx} className={idx < lesions.length - 1 ? 'lesion-item' : undefined}>
                      {lesions.length > 1 && (
                        <div className="lesion-header">
                          <span className="lesion-label">Lesion {idx + 1}</span>
                          <button
                            type="button"
                            className="lesion-remove-btn"
                            onClick={() => {
                              const next = lesions.filter((_, i) => i !== idx);
                              updateLesions(next.length > 0 ? next : [null]);
                            }}
                            aria-label={`Remove lesion ${idx + 1}`}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                      <div className="pirads-grid" role="radiogroup" aria-label={`PI-RADS score for lesion ${idx + 1}`}>
                        {PIRADS_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            role="radio"
                            aria-checked={lesionVal === opt.value}
                            className={`pirads-btn ${lesionVal === opt.value ? 'selected' : ''}`}
                            aria-label={`PI-RADS ${opt.value}: ${opt.desc}`}
                            onClick={() => {
                              const next = [...lesions];
                              next[idx] = opt.value;
                              updateLesions(next);
                            }}
                          >
                            <span className="pirads-btn-num">{opt.label}</span>
                            <span className="pirads-btn-desc">{opt.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="lesion-add-btn"
                    onClick={() => updateLesions([...lesions, null])}
                  >
                    + Add another lesion
                  </button>
                </>
              );
            })()}
            <div className="question-note" style={{ marginTop: '8px', fontSize: '0.8125rem' }}>
              {t('part2.mri.q2Note')} If multiple lesions are present, add each one — the highest PI-RADS drives the assessment.
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

  const stepChipLabel = currentStep === 1
    ? 'Step 1 of 2 — Your PSA Result'
    : 'Step 2 of 2 — MRI Results (Optional)';

  const stepTitle = currentStep === 2
    ? (hasMriPathway ? 'Your MRI Results' : 'MRI Results (Optional)')
    : (hasPsaPathway ? 'Enter your PSA level' : t('part2.steps.psa.sectionTitle'));

  const stepNote = (() => {
    if (currentStep === 2) {
      return hasMriPathway
        ? 'Enter the PI-RADS score from your MRI report. Your radiologist or urologist will have this.'
        : 'If you have MRI results, enter your PI-RADS score below — this improves accuracy. You can also skip this step and calculate without MRI data.';
    }
    if (hasMriPathway) return 'Enter your PSA level first. You\'ll add your MRI score on the next screen.';
    if (hasPsaPathway) return 'Enter your PSA level. You\'ll have the option to add MRI results on the next screen.';
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

      <div className="v2-p2-layout">
        <div className="v2-p2-form-col">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
        </div>

        <div className="v2-p1-summary-card">
          <div className="v2-p1-summary-head">Part 1 Baseline</div>
          <div className="v2-p1-summary-body">
            <div className="v2-p1-summary-score">
              {preResult.score}<span className="v2-p1-summary-max">%</span>
            </div>
            <span className="v2-p1-summary-tier" style={{ background: 'var(--surface-subtle)', color: 'var(--ink-700)' }}>
              {preResult.risk || preResult.epsaTierLabel}
            </span>
          </div>
        </div>
      </div>

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
