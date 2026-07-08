import React from 'react';
import './Part2Form.css';
import './epsa-v2-layout.css';

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
  if (v < threshold * 0.625) return { label: 'Below age-adjusted threshold', color: '#16a34a', note: `Reassuring for your age group (${band}). AUA/SUO 2026 age-adjusted norm: ~${threshold} ng/mL.` };
  if (v < threshold) return { label: 'Low-normal range', color: '#0d9488', note: `Within the lower range for your age group (${band}). AUA/SUO 2026 threshold: ~${threshold} ng/mL.` };
  if (v < threshold * 2) return { label: 'Gray zone — above age-adjusted threshold', color: '#d97706', note: `A confirmatory repeat PSA is recommended before any further workup (AUA/SUO 2026 Statement 3).` };
  return { label: 'Elevated', color: '#dc2626', note: 'Your urologist will likely recommend further evaluation.' };
};

/**
 * Lightweight PSA-only interim result, shown between Part 2 (PSA entry) and
 * Part 3 (MRI / PI-RADS entry + biopsy model). Deliberately minimal — the
 * combined-risk, guideline, and biopsy-recommendation detail all belongs on
 * the Part 3 results screen once MRI data is available.
 */
const Part2PsaResult = ({ postData, preResult, onContinueToMRI, onBack }) => {
  const psaCtx = getPsaContext(postData?.psa, preResult?.age);
  const psaVal = parseFloat(postData?.psa);

  return (
    <div className="part2-form-container">
      <div className="flow-header">
        <div className="flow-step-chip">PSA Result</div>
        <h3 className="flow-step-title">Your PSA Result</h3>
        <p className="flow-step-note">Here's what your PSA level means on its own. Add your MRI / PI-RADS result next for a full biopsy risk assessment.</p>
      </div>

      <div
        className="risk-summary-card res-reveal"
        style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}
      >
        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: psaCtx?.color || 'var(--ink-900)' }}>
          {Number.isFinite(psaVal) ? psaVal.toFixed(1) : '—'} <span style={{ fontSize: '1rem', fontWeight: 500 }}>ng/mL</span>
        </div>
        {psaCtx && (
          <>
            <div style={{ marginTop: '8px', fontWeight: 700, color: psaCtx.color }}>{psaCtx.label}</div>
            <p style={{ marginTop: '6px', fontSize: '0.875rem', color: 'var(--ink-600)', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto' }}>
              {psaCtx.note}
            </p>
          </>
        )}
      </div>

      <div
        role="note"
        style={{ margin: '1rem 0', padding: '0.875rem 1rem', background: '#eef2ff', border: '1px solid #c7d2fe', borderLeft: '4px solid #6366F1', borderRadius: '8px', fontSize: '0.8125rem', color: '#312e81', lineHeight: 1.5 }}
      >
        PSA alone has limited specificity. Adding an MRI PI-RADS score (Part 3) lets ePSA run the validated biopsy-prediction model, which combines PSA density and PI-RADS for a much more informative estimate.
      </div>

      <div className="form-navigation">
        <div className="form-navigation-inner">
          {typeof onBack === 'function' && (
            <button className="btn-back" onClick={onBack}>← Back</button>
          )}
          <button className="btn-calculate" onClick={onContinueToMRI}>
            Continue to MRI Assessment (Part 3) →
          </button>
        </div>
      </div>
    </div>
  );
};

export default Part2PsaResult;
