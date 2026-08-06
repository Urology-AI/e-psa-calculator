import React, { useState, useEffect } from 'react';
import './Part2Form.css';
import './epsa-v2-layout.css';
import './Part1Form.css';
import { InfoIcon } from '@urology-ai/epsa-ui';
import { CheckIcon } from 'lucide-react';
import { biomarkerReferences } from '../utils/fieldReferences';

// Merged source lists for biomarker questions that cover multiple tests at once.
const urineBiomarkerRef = {
  title: 'Urine-Based Biomarker Tests',
  description: 'MPS2, ExoDx, PCA3, and SelectMDx are non-invasive, pre-biopsy urine tests used as an adjunct to PSA to help decide whether a biopsy or MRI referral is warranted.',
  sources: [
    ...biomarkerReferences.mps2.sources,
    ...biomarkerReferences.exodx.sources,
    ...biomarkerReferences.pca3.sources,
    ...biomarkerReferences.selectMdx.sources,
  ],
};
const bloodBiomarkerRef = {
  title: 'Blood-Based Biomarker Tests (beyond PSA)',
  description: 'Stockholm3, PHI, and 4Kscore each combine multiple blood analytes into a single risk score to improve specificity over PSA alone.',
  sources: [
    ...biomarkerReferences.stockholm3.sources,
    ...biomarkerReferences.phi.sources,
    ...biomarkerReferences.fourKScore.sources,
  ],
};
const genomicTestRef = {
  title: 'Tissue-Based Genomic Tests',
  description: 'Decipher, OncotypeDX GPS, and Prolaris are genomic assays run directly on biopsy or surgical tissue that estimate aggressiveness or metastatic risk to guide treatment vs. active surveillance decisions.',
  sources: [
    ...biomarkerReferences.decipher.sources,
    ...biomarkerReferences.oncodx.sources,
    ...biomarkerReferences.prolaris.sources,
  ],
};

// Per-test clinical threshold context, shown once a specific urine/blood test is selected.
const URINE_TEST_CONTEXT = {
  mps2: 'MPS2 (MyProstateScore 2.0): Score > 10 is the clinical threshold for elevated risk (95% sensitivity for Grade Group ≥2). Your report shows a score from 0–100+.',
  exodx: 'ExoDx Prostate IntelliScore: Score ≥ 15.6 is the threshold for recommending biopsy. Reported as 0–100.',
  pca3: 'PCA3: Score > 25 is the FDA-cleared threshold for re-biopsy decisions. Score > 35 is used by some centers.',
  selectmdx: 'SelectMDx: Reports a low/high risk classification for aggressive prostate cancer based on mRNA in urine — no separate numeric score to enter.',
};
const BLOOD_TEST_CONTEXT = {
  stockholm3: 'Stockholm 3 (STHLM3): A score ≥ 0.11 is the clinical referral threshold for biopsy. Your report will show a score between 0 and 1.',
  phi: 'Prostate Health Index (PHI): Score < 25 = low risk, 25–35 = intermediate, > 35 = elevated. Your report will show a PHI score (typically 10–120).',
  '4k': '4Kscore: Reported as a % probability of aggressive cancer. < 7.5% = low, 7.5–20% = intermediate, > 20% = high.',
};

const PRECISE_OPTIONS = [
  { value: 1, label: 'No suspicious finding', detail: 'Very low suspicion' },
  { value: 2, label: 'Likely benign', detail: 'Low suspicion, benign-appearing lesion' },
  { value: 3, label: 'Indeterminate', detail: 'Equivocal — cannot exclude malignancy' },
  { value: 4, label: 'Suspicious', detail: 'Focal hypoechoic or heterogeneous lesion' },
  { value: 5, label: 'Highly suspicious', detail: 'Distinct hypoechoic lesion, strong suspicion for cancer' },
];

/**
 * Part 3 — Advanced Biomarkers. Entirely optional; results are shown as
 * context alongside the ePSA score on the PSA & Biomarker results screen.
 */
const Part2BiomarkersForm = ({ formData, setFormData, preResult, onNext, onBack }) => {
  const [localData, setLocalData] = useState({
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
  });

  useEffect(() => {
    setFormData(prev => ({ ...prev, ...localData }));
  }, [localData]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateField = (field, value) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="part2-form-container">
      <div className="flow-header">
        <div className="flow-step-chip">Part 3 — Advanced Biomarkers</div>
        <h3 className="flow-step-title">Advanced Biomarkers</h3>
        <p className="flow-step-note">If you've had any of these tests, enter the results. All optional — skip anything you haven't had.</p>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: '67%' }} />
      </div>

      <div className="v2-p2-layout">
        <div className="v2-p2-form-col">
          <div className="part2-step">
            {/* Polygenic risk score */}
            <div className="question-card" style={{ borderColor: localData.polygenicrisk !== null ? '#27AE60' : '#E8ECF0', borderWidth: '2px' }}>
              <div className="question-header">
                <div className="question-text">Have you had a polygenic risk score (PRS) test for prostate cancer?</div>
                <InfoIcon {...biomarkerReferences.polygenicRiskScore} />
                {localData.polygenicrisk !== null && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
              </div>
              <div className="question-body">
                <div className="question-subtext" style={{ marginBottom: '10px' }}>
                  Polygenic risk scores (e.g., Polygenic Health, Ambry Genetics, Color, Myriad) test hundreds of inherited DNA variants. Results are often reported as a risk multiplier (e.g., "1.8× average") or a category. Select what your report indicated.
                </div>
                <div className="option-grid c2">
                  {[
                    { value: 'not_tested', label: "Not tested — I haven't taken a PRS test" },
                    { value: 'below_average', label: 'Below average — my report showed below-average inherited risk' },
                    { value: 'average', label: 'Average risk — near the population average' },
                    { value: 'above_average', label: 'Above average — my report showed above-average risk (e.g., 1.5–2× average)' },
                    { value: 'high', label: 'High risk — my report showed high inherited risk (e.g., 2× or more above average)' },
                  ].map(opt => (
                    <button key={opt.value} type="button" className={`option-btn ${localData.polygenicrisk === opt.value ? 'selected' : ''}`} onClick={() => updateField('polygenicrisk', opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {localData.polygenicrisk && localData.polygenicrisk !== 'not_tested' && (
                  <div style={{ marginTop: '12px' }}>
                    <label htmlFor="field-prs-score" className="sr-only">PRS score or multiplier (if known)</label>
                    <input
                      id="field-prs-score"
                      type="text"
                      className="input-field"
                      placeholder="Numeric PRS score or multiplier, if known (optional)"
                      value={localData.polygenicScore}
                      onChange={(e) => updateField('polygenicScore', e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Urine biomarker */}
            <div className="question-card" style={{ borderColor: localData.urineBiomarker !== null ? '#27AE60' : '#E8ECF0', borderWidth: '2px' }}>
              <div className="question-header">
                <div className="question-text">Have you had a urine-based prostate biomarker test?</div>
                <InfoIcon {...urineBiomarkerRef} />
                {localData.urineBiomarker !== null && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
              </div>
              <div className="question-body">
                <div className="question-subtext" style={{ marginBottom: '10px' }}>
                  Pre-biopsy urine tests that use RNA or exosomes in urine to assess prostate cancer risk. Done before or instead of biopsy. Examples: MPS2 (18-gene), ExoDx (exosome), PCA3, SelectMDx.
                </div>
                <div className="option-grid c2">
                  {[
                    { value: 'none', label: 'None / Not tested' },
                    { value: 'mps2', label: 'MPS2 (MyProstateScore 2.0 — 18-gene urine test)' },
                    { value: 'exodx', label: 'ExoDx Prostate (IntelliScore — urine exosome test)' },
                    { value: 'pca3', label: 'PCA3' },
                    { value: 'selectmdx', label: 'SelectMDx' },
                  ].map(opt => (
                    <button key={opt.value} type="button" className={`option-btn ${localData.urineBiomarker === opt.value ? 'selected' : ''}`} onClick={() => updateField('urineBiomarker', opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {localData.urineBiomarker && localData.urineBiomarker !== 'none' && (
                  <>
                    {URINE_TEST_CONTEXT[localData.urineBiomarker] && (
                      <div className="question-note" style={{ marginTop: '10px', fontSize: '0.8125rem' }}>
                        {URINE_TEST_CONTEXT[localData.urineBiomarker]}
                      </div>
                    )}
                    {localData.urineBiomarker !== 'selectmdx' && (
                      <div style={{ marginTop: '10px' }}>
                        <label htmlFor="field-urine-score" className="sr-only">Urine biomarker score (if known)</label>
                        <input
                          id="field-urine-score"
                          type="text"
                          className="input-field"
                          placeholder="My score (if known, optional)"
                          value={localData.urineBiomarkerScore}
                          onChange={(e) => updateField('urineBiomarkerScore', e.target.value)}
                        />
                      </div>
                    )}
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '0.875rem' }}>What was the result?</div>
                      <div className="option-grid c3">
                        {[
                          { value: 'low', label: 'Low risk' },
                          { value: 'intermediate', label: 'Intermediate' },
                          { value: 'high', label: 'High risk' },
                        ].map(opt => (
                          <button key={opt.value} type="button" className={`option-btn ${localData.urineBiomarkerResult === opt.value ? 'selected' : ''}`} onClick={() => updateField('urineBiomarkerResult', opt.value)}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Blood biomarker */}
            <div className="question-card" style={{ borderColor: localData.bloodBiomarker !== null ? '#27AE60' : '#E8ECF0', borderWidth: '2px' }}>
              <div className="question-header">
                <div className="question-text">Have you had a blood-based prostate biomarker test beyond standard PSA?</div>
                <InfoIcon {...bloodBiomarkerRef} />
                {localData.bloodBiomarker !== null && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
              </div>
              <div className="question-body">
                <div className="question-subtext" style={{ marginBottom: '10px' }}>
                  e.g., Stockholm 3 (STHLM3), Prostate Health Index (PHI), 4Kscore
                </div>
                <div className="option-grid c2">
                  {[
                    { value: 'none', label: 'None / Not tested' },
                    { value: 'stockholm3', label: 'Stockholm 3 (STHLM3)' },
                    { value: 'phi', label: 'Prostate Health Index (PHI)' },
                    { value: '4k', label: '4Kscore' },
                  ].map(opt => (
                    <button key={opt.value} type="button" className={`option-btn ${localData.bloodBiomarker === opt.value ? 'selected' : ''}`} onClick={() => updateField('bloodBiomarker', opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {localData.bloodBiomarker && localData.bloodBiomarker !== 'none' && (
                  <>
                    {BLOOD_TEST_CONTEXT[localData.bloodBiomarker] && (
                      <div className="question-note" style={{ marginTop: '10px', fontSize: '0.8125rem' }}>
                        {BLOOD_TEST_CONTEXT[localData.bloodBiomarker]}
                      </div>
                    )}
                    <div style={{ marginTop: '10px' }}>
                      <label htmlFor="field-blood-score" className="sr-only">Blood biomarker score (if known)</label>
                      <input
                        id="field-blood-score"
                        type="text"
                        className="input-field"
                        placeholder="My score (if known, optional)"
                        value={localData.bloodBiomarkerScore}
                        onChange={(e) => updateField('bloodBiomarkerScore', e.target.value)}
                      />
                    </div>
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '0.875rem' }}>What was the result category?</div>
                      <div className="option-grid c3">
                        {[
                          { value: 'low', label: 'Low risk' },
                          { value: 'intermediate', label: 'Intermediate' },
                          { value: 'high', label: 'High risk' },
                        ].map(opt => (
                          <button key={opt.value} type="button" className={`option-btn ${localData.bloodBiomarkerResult === opt.value ? 'selected' : ''}`} onClick={() => updateField('bloodBiomarkerResult', opt.value)}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Genomic / tissue test */}
            <div className="question-card" style={{ borderColor: localData.genomicTest !== null ? '#27AE60' : '#E8ECF0', borderWidth: '2px' }}>
              <div className="question-header">
                <div className="question-text">Have you had a genomic test on prostate biopsy or surgical tissue?</div>
                <InfoIcon {...genomicTestRef} />
                {localData.genomicTest !== null && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
              </div>
              <div className="question-body">
                <div className="question-subtext" style={{ marginBottom: '10px' }}>
                  These tests require actual biopsy or surgical tissue. They are done after a biopsy to assess aggressiveness and guide treatment decisions. Examples: Decipher, OncotypeDX GPS, Prolaris.
                </div>
                <div className="option-grid c2">
                  {[
                    { value: 'none', label: "None / Not applicable (haven't had a biopsy)" },
                    { value: 'decipher', label: 'Decipher Genomics (Genomic Classifier — biopsy or surgical tissue)' },
                    { value: 'oncodx', label: 'OncotypeDX GPS (Genomic Prostate Score — biopsy tissue)' },
                    { value: 'prolaris', label: 'Prolaris (Myriad — biopsy tissue, predicts 10-year metastasis risk)' },
                  ].map(opt => (
                    <button key={opt.value} type="button" className={`option-btn ${localData.genomicTest === opt.value ? 'selected' : ''}`} onClick={() => updateField('genomicTest', opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {localData.genomicTest && localData.genomicTest !== 'none' && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '0.875rem' }}>What was the result?</div>
                    <div className="option-grid c3">
                      {[
                        { value: 'low', label: 'Low risk' },
                        { value: 'intermediate', label: 'Intermediate' },
                        { value: 'high', label: 'High risk' },
                      ].map(opt => (
                        <button key={opt.value} type="button" className={`option-btn ${localData.genomicResult === opt.value ? 'selected' : ''}`} onClick={() => updateField('genomicResult', opt.value)}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ExactVu micro-ultrasound */}
            <div className="question-card" style={{ borderColor: localData.exactvuDone !== null ? '#27AE60' : '#E8ECF0', borderWidth: '2px' }}>
              <div className="question-header">
                <div className="question-text">Have you had an ExactVu micro-ultrasound (high-resolution transrectal ultrasound)?</div>
                <InfoIcon {...biomarkerReferences.exactvu} />
                {localData.exactvuDone !== null && <CheckIcon size={15} color="#27AE60" style={{ marginLeft: '8px', flexShrink: 0 }} aria-hidden="true" />}
              </div>
              <div className="question-body">
                <div className="question-subtext" style={{ marginBottom: '10px' }}>
                  ExactVu operates at 29 MHz — approximately 3× the resolution of standard TRUS. Used for targeted biopsy and lesion characterization.
                </div>
                <div className="option-grid c2">
                  {[
                    { value: 'no', label: 'No / Not available' },
                    { value: 'yes', label: 'Yes' },
                  ].map(opt => (
                    <button key={opt.value} type="button" className={`option-btn ${localData.exactvuDone === opt.value ? 'selected' : ''}`} onClick={() => updateField('exactvuDone', opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {localData.exactvuDone === 'yes' && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '0.875rem' }}>What was the PRECISE score?</div>
                    <div className="question-note" style={{ marginBottom: '10px', fontSize: '0.8125rem' }}>
                      The PRECISE scale (1–5) is scored by your urologist during the ExactVu micro-ultrasound exam. Check your procedure report or ask your urologist for your PRECISE score. A score of 3–5 indicates increasing suspicion for cancer.
                    </div>
                    <div className="option-grid c3">
                      {PRECISE_OPTIONS.map(opt => (
                        <button key={opt.value} type="button" className={`option-btn ${localData.exactvuPrecise === opt.value ? 'selected' : ''}`} onClick={() => updateField('exactvuPrecise', opt.value)}>
                          <span style={{ display: 'block', fontWeight: 700 }}>{opt.value} — {opt.label}</span>
                          <span style={{ display: 'block', fontWeight: 400, fontSize: '0.75rem', marginTop: '2px' }}>{opt.detail}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="v2-p1-summary-card">
          <div className="v2-p1-summary-head">Part 1 Baseline</div>
          <div className="v2-p1-summary-body">
            <div className="v2-p1-summary-score">
              {preResult?.score}<span className="v2-p1-summary-max">%</span>
            </div>
            <span className="v2-p1-summary-tier" style={{ background: 'var(--surface-subtle)', color: 'var(--ink-700)' }}>
              {preResult?.risk || preResult?.epsaTierLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="form-navigation">
        <div className="form-navigation-inner">
          {typeof onBack === 'function' && (
            <button className="btn-back" onClick={onBack}>← Back</button>
          )}
          <button className="btn-next" onClick={onNext}>
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};

export default Part2BiomarkersForm;
