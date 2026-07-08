import React, { useState, useEffect } from 'react';
import './Part2Form.css';
import './epsa-v2-layout.css';
import { useTranslation } from 'react-i18next';
import InfoIcon from './InfoIcon';
import { fieldReferences } from '../utils/fieldReferences';

// Age-adjusted PSA thresholds per AUA/SUO 2026 EDPC (p.11):
// ~2.5 ng/mL (40s), ~3.5 ng/mL (50s), ~4.5 ng/mL (60s), ~6.5 ng/mL (70s+)
const getAgeAdjustedThreshold = (age) => {
  const a = Number(age) || 0;
  if (a < 50) return { threshold: 2.5, band: '40s' };
  if (a < 60) return { threshold: 3.5, band: '50s' };
  if (a < 70) return { threshold: 4.5, band: '60s' };
  return { threshold: 6.5, band: '70s+' };
};

const getPsaContext = (psa, age) => {
  const v = parseFloat(psa);
  if (!isFinite(v) || v <= 0) return null;
  const { threshold, band } = getAgeAdjustedThreshold(age);
  const doubleThreshold = threshold * 2;
  if (v < threshold * 0.625)   return { label: 'Below age-adjusted threshold', cls: 'psa-ctx--green',  note: `PSA below ${(threshold * 0.625).toFixed(1)} ng/mL is reassuring for your age group (${band}). Age-adjusted norm per AUA/SUO 2026: ~${threshold} ng/mL.` };
  if (v < threshold)           return { label: 'Low-normal range',              cls: 'psa-ctx--teal',  note: `PSA ${(threshold * 0.625).toFixed(1)}–${threshold} ng/mL is within the lower range for your age group (${band}). AUA/SUO 2026 age-adjusted threshold: ~${threshold} ng/mL.` };
  if (v < threshold * 2)       return { label: 'Gray zone — above age-adjusted threshold', cls: 'psa-ctx--amber', note: `PSA above ${threshold} ng/mL for your age group (${band}) is in the gray zone per AUA/SUO 2026. A confirmatory repeat PSA is recommended before any further workup.` };
  if (v < threshold * 4.5)     return { label: 'Elevated',                      cls: 'psa-ctx--orange', note: `PSA above ${doubleThreshold} ng/mL for your age group (${band}) is considered elevated. Your urologist will likely recommend further evaluation.` };
  return { label: 'Significantly elevated', cls: 'psa-ctx--red', note: `PSA at this level for your age warrants prompt urological evaluation.` };
};

const Part2Form = ({ formData, setFormData, preResult, onNext, onBack, pathwayMode }) => {
  const { t } = useTranslation();

  // For post_psa / post_mri pathways the user already confirmed they have PSA data —
  // pre-set the "know" flag so we can skip the toggle question and go straight to the value input.
  const hasPsaPathway  = pathwayMode === 'post_psa' || pathwayMode === 'post_mri';

  const [localData, setLocalData] = useState({
    knowPsa: hasPsaPathway ? true : (formData.knowPsa || false),
    psaConfirmed: formData.psaConfirmed || null,
    psa: formData.psa || '',
    prostateVolume: formData.prostateVolume || '',
    onHormonalTherapy: formData.onHormonalTherapy || false,
    hormonalTherapyType: formData.hormonalTherapyType || '',
    // PI-RADS fields belong to Part 3 (MRI) but are carried through here so the
    // full-object-replace `setFormData` pattern doesn't drop them if Part 3 was
    // already visited (e.g. navigating back and forth).
    knowPirads: formData.knowPirads || false,
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
      // Allow partial typing — only reject clearly out-of-range complete values
      const volNum = parseFloat(value);
      if (Number.isNaN(volNum) || volNum <= 200) {
        setLocalData(prev => ({ ...prev, [field]: value }));
      }
      return;
    }
    
    // For other fields, update normally
    setLocalData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    if (!localData.knowPsa) return false;
    const psaNum = parseFloat(localData.psa);
    if (isNaN(psaNum) || psaNum < 0.1 || psaNum > 100) return false;
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
                const ctx = getPsaContext(localData.psa, preResult?.age);
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

              {/* Confirmatory PSA — AUA/SUO 2026 Statement 3 (Expert Opinion) */}
              {(() => {
                const psaNum = parseFloat(localData.psa);
                const { threshold } = getAgeAdjustedThreshold(preResult?.age);
                if (!isFinite(psaNum) || psaNum < threshold) return null;
                return (
                  <div style={{ marginTop: '12px', background: '#fffbeb', border: '0.5px solid #fcd34d', borderLeft: '3px solid #d97706', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#78350f', lineHeight: 1.6 }}>
                    <strong>Has this PSA been confirmed with a second test?</strong>
                    <p style={{ margin: '4px 0 8px' }}>AUA/SUO 2026 Statement 3 (Expert Opinion): for a newly elevated PSA, clinicians should repeat the test before proceeding to imaging, secondary biomarkers, or biopsy. PSA can normalise in 25–40% of cases on retesting.</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {['yes', 'no', 'unknown'].map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => updateField('psaConfirmed', v)}
                          style={{
                            padding: '5px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid',
                            background: localData.psaConfirmed === v ? '#d97706' : 'transparent',
                            color: localData.psaConfirmed === v ? '#fff' : '#92400e',
                            borderColor: localData.psaConfirmed === v ? '#d97706' : '#fcd34d',
                          }}
                        >
                          {v === 'yes' ? 'Yes, confirmed' : v === 'no' ? 'No, this is my first result' : 'Not sure'}
                        </button>
                      ))}
                    </div>
                    {localData.psaConfirmed === 'no' && (
                      <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#92400e', fontStyle: 'italic' }}>
                        Consider asking your clinician to repeat the PSA before any further workup. Proceed here to understand your risk profile, but discuss timing of next steps with your doctor.
                      </p>
                    )}
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

  const stepChipLabel = 'Step 1 of 2 — Your PSA Result';
  const stepTitle = hasPsaPathway ? 'Enter your PSA level' : t('part2.steps.psa.sectionTitle');
  const stepNote = hasPsaPathway
    ? 'Enter your PSA level. You\'ll add your MRI / PI-RADS results next.'
    : t('part2.flow.note');

  return (
    <div className="part2-form-container">
      <div className="flow-header">
        <div className="flow-step-chip">{stepChipLabel}</div>
        <h3 className="flow-step-title">{stepTitle}</h3>
        <p className="flow-step-note">{stepNote}</p>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: '50%' }} />
      </div>

      <div className="v2-p2-layout">
        <div className="v2-p2-form-col">
          {renderStep1()}
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
          <button className="btn-next" onClick={onNext} disabled={!canProceed()}>
            {t('part2.nav.next')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Part2Form;
