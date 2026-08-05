import React, { useState, useEffect } from 'react';
import './Part2Form.css';
import './epsa-v2-layout.css';
import { useTranslation } from 'react-i18next';
import { InfoIcon } from '@urology-ai/epsa-ui';
import { fieldReferences } from '../utils/fieldReferences';

const PIRADS_OPTIONS = [
  { value: '1', label: '1', desc: 'No finding' },
  { value: '2', label: '2', desc: 'Benign' },
  { value: '3', label: '3', desc: 'Equivocal' },
  { value: '4', label: '4', desc: 'Suspicious' },
  { value: '5', label: '5', desc: 'Highly suspicious' },
];

const Part3Form = ({ formData, setFormData, preResult, onNext, onBack, pathwayMode }) => {
  const { t } = useTranslation();

  // On the PSA+MRI pathway the user already confirmed they have an MRI/PI-RADS result
  // at pathway selection — skip the toggle question and require a score before proceeding.
  const hasMriPathway = pathwayMode === 'post_mri';

  const [localData, setLocalData] = useState({
    // PSA + biomarker fields carried through from Part 2 — preserved because
    // `setFormData` replaces the whole shared postData object on every change.
    knowPsa: formData.knowPsa ?? true,
    psaConfirmed: formData.psaConfirmed || null,
    psa: formData.psa || '',
    prostateVolume: formData.prostateVolume || '',
    onHormonalTherapy: formData.onHormonalTherapy || false,
    hormonalTherapyType: formData.hormonalTherapyType || '',
    polygenicrisk: formData.polygenicrisk ?? null,
    polygenicScore: formData.polygenicScore || '',
    urineBiomarker: formData.urineBiomarker ?? null,
    urineBiomarkerResult: formData.urineBiomarkerResult ?? null,
    urineBiomarkerScore: formData.urineBiomarkerScore || '',
    bloodBiomarker: formData.bloodBiomarker ?? null,
    bloodBiomarkerResult: formData.bloodBiomarkerResult ?? null,
    bloodBiomarkerScore: formData.bloodBiomarkerScore || '',
    genomicTest: formData.genomicTest ?? null,
    genomicResult: formData.genomicResult ?? null,
    exactvuDone: formData.exactvuDone ?? null,
    exactvuPrecise: formData.exactvuPrecise ?? null,
    knowPirads: hasMriPathway ? true : (formData.knowPirads || false),
    pirads: formData.pirads || '0',
    piradsLesions: Array.isArray(formData.piradsLesions) ? formData.piradsLesions : [],
  });

  useEffect(() => {
    setFormData(prev => ({ ...prev, ...localData }));
  }, [localData]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateField = (field, value) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    // On the PSA+MRI pathway, PI-RADS is required — this is the biopsy model input.
    // '0' is the unselected sentinel default (PIRADS_OPTIONS only defines '1'-'5').
    if (hasMriPathway) {
      return localData.pirads !== null && localData.pirads !== undefined && localData.pirads !== '' && localData.pirads !== '0';
    }
    // Otherwise (post_psa pathway that opted in to add MRI later), PI-RADS stays optional.
    return true;
  };

  // Ensure Part 1 is complete before showing Part 3
  if (!preResult) {
    return (
      <div className="part2-form-container">
        <div className="error-message-box">
          <p>{t('part2.form.errorPreResult')}</p>
        </div>
      </div>
    );
  }

  const stepChipLabel = hasMriPathway ? 'Part 3 — MRI Results' : 'Part 3 — MRI Results (Optional)';
  const stepTitle = hasMriPathway ? 'Your MRI Results' : 'MRI Results (Optional)';
  const stepNote = hasMriPathway
    ? 'Enter the PI-RADS score from your MRI report. Your radiologist or urologist will have this.'
    : 'If you have MRI results, enter your PI-RADS score below — this improves accuracy. You can also skip this step and calculate without MRI data.';

  return (
    <div className="part2-form-container">
      <div className="flow-header">
        <div className="flow-step-chip">{stepChipLabel}</div>
        <h3 className="flow-step-title">{stepTitle}</h3>
        <p className="flow-step-note">{stepNote}</p>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: '100%' }} />
      </div>

      <div className="v2-p2-layout">
        <div className="v2-p2-form-col">
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
                    description="PI-RADS scoring is used in Part 3 (when provided) to run the validated biopsy prediction model."
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
          <button className="btn-calculate" onClick={onNext} disabled={!canProceed()}>
            {t('part2.nav.calculate')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Part3Form;
