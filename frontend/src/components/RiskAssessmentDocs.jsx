import React from 'react';
import './ModelDocs.css';
import { DEFAULT_CALCULATOR_CONFIG } from '../config/calculatorConfig';

const RiskAssessmentDocs = ({ onClose, config = DEFAULT_CALCULATOR_CONFIG }) => {
  const activeConfig = config || DEFAULT_CALCULATOR_CONFIG;
  const part2 = activeConfig.part2 || DEFAULT_CALCULATOR_CONFIG.part2;
  const validation = activeConfig.validation || DEFAULT_CALCULATOR_CONFIG.validation;
  const preRanges = part2.preScoreToPoints?.ranges || [];
  const psaPoints = part2.psaPoints || [];
  const piradsPoints = part2.piradsPoints || [];
  const piradsOverrides = part2.piradsOverrides || {};
  const riskCategories = part2.riskCategories || [];

  const pointsList = (items) => items.map((item) => item.points).join(', ');
  const toPct = (value) => (typeof value === 'number' ? `${Math.round(value * 100)}%` : String(value));
  const formatMax = (value) => (value === Infinity ? '∞' : value);

  const piradsOverrideEntries = Object.entries(piradsOverrides)
    .map(([score, data]) => ({ score: Number(score), ...data }))
    .sort((a, b) => a.score - b.score);

  return (
    <div className="model-docs-overlay">
      <div className="model-docs-container">
        <div className="model-docs-header">
          <h2>Risk Assessment Documentation</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        
        <div className="model-docs-content">
          <section className="docs-section">
            <h3>Overview</h3>
            <p>
              The Risk Assessment stage combines your initial educational estimate (Stage 1 ePSA score)
              with additional information (PSA and optional MRI PI-RADS) to create an educational summary.
              It is not a diagnosis and should not be used as a standalone basis for clinical decisions.
            </p>
            <div className="info-box warning">
              <strong>Important:</strong> This is a <strong>Non-Validated Educational Risk Tool</strong>.
              PSA and MRI interpretation depends on clinical context (e.g., PSA trends, prostate size, infection/inflammation, medications),
              and should be reviewed with a qualified healthcare professional.
            </div>
          </section>

          <section className="docs-section">
            <h3>Risk Calculation Formula</h3>
            <div className="formula-box">
              <code>
                <strong>Stage 1 Score:</strong> ePSA baseline (0-100%)<br/><br/>
                <strong>Stage 2 Adjustments:</strong><br/>
                &nbsp;&nbsp;+ Baseline carry points ({part2.baselineCarryPoints})<br/>
                &nbsp;&nbsp;+ PSA points ({pointsList(psaPoints)})<br/>
                &nbsp;&nbsp;+ PIRADS points ({pointsList(piradsPoints)}, or override for PIRADS {piradsOverrideEntries.map((x) => x.score).join('/')})<br/><br/>
                <strong>Total Points → Risk Category</strong>
              </code>
            </div>
            <p className="formula-note">
              {piradsOverrideEntries.map((entry) => `PIRADS ${entry.score} → ${entry.riskPct} risk`).join(' | ')} (automatic override)
            </p>
            <p className="formula-note">
              Active model version: <strong>{activeConfig.version || 'unknown'}</strong>
            </p>
          </section>

          <section className="docs-section">
            <h3>Variable Definitions</h3>
            <table className="vars-table">
              <thead>
                <tr>
                  <th>Variable</th>
                  <th>Type</th>
                  <th>Range</th>
                  <th>Points</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>PSA Level</strong></td>
                  <td>Continuous</td>
                  <td>{validation.minPSA ?? 0}–{validation.maxPSA ?? 1000} ng/mL</td>
                  <td>{pointsList(psaPoints)}</td>
                  <td>Prostate-Specific Antigen blood test. Higher levels increase risk score. Note: 5-alpha reductase inhibitors (finasteride/dutasteride) can lower PSA by ~50%.</td>
                </tr>
                <tr>
                  <td><strong>PI-RADS Score</strong></td>
                  <td>Ordinal</td>
                  <td>1-5 or N/A</td>
                  <td>{pointsList(piradsPoints)} or override</td>
                  <td>MRI-based lesion assessment. Scores {piradsOverrideEntries.map((x) => x.score).join('/')} trigger automatic override regardless of other factors.</td>
                </tr>
                <tr>
                  <td><strong>Stage 1 Baseline</strong></td>
                  <td>Percentage</td>
                  <td>0-100%</td>
                  <td>Piecewise from config ({preRanges.length} ranges)</td>
                  <td>Converted from Stage 1 ePSA probability score to points scale.</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="docs-section">
            <h3>Risk Categories & Next Steps</h3>
            <div className="tiers-grid">
              {riskCategories.map((category, index) => {
                const prevMax = index > 0 ? riskCategories[index - 1].maxPoints : 0;
                const pointsLabel = index === 0
                  ? `0-${formatMax(category.maxPoints)} points`
                  : category.maxPoints === Infinity
                    ? `>${prevMax} points`
                    : `${prevMax + 1}-${category.maxPoints} points`;
                const name = String(category.riskCat || '').replace(/[🟢🟡🟠🔴]/g, '').trim();
                return (
                  <div key={`${name}-${index}`} className="tier-card">
                    <h4>{name} ({pointsLabel})</h4>
                    <div className="tier-range">{toPct(category.riskPct)} (educational display)</div>
                    <p className="tier-action">
                      Category determined dynamically from total points. Consider discussing PSA/MRI follow-up questions with a clinician.
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="docs-section">
            <h3>PI-RADS Override Logic</h3>
            <div className="info-box info">
              {piradsOverrideEntries.map((entry) => (
                <p key={`pirads-override-${entry.score}`}>
                  <strong>PI-RADS {entry.score}:</strong> Automatically sets risk to <strong>{entry.riskPct}</strong>
                </p>
              ))}
              <p style={{marginTop: '10px'}}>
                This override reflects that MRI-detected suspicious lesions can meaningfully change how risk is interpreted.
                This is an educational simplification and should be reviewed with the clinician who interpreted the MRI.
              </p>
            </div>
          </section>

          <section className="docs-section">
            <h3>Hormonal Therapy Considerations</h3>
            <p>
              <strong>5-alpha reductase inhibitors</strong> (finasteride, dutasteride) used for BPH or hair loss 
              can lower PSA levels by approximately 50%.
            </p>
            <ul className="limitations-list">
              <li>
                <strong>Adjusted PSA:</strong> If on these medications, your doctor may multiply reported PSA by 2 
                for accurate interpretation.
              </li>
              <li>
                <strong>Risk calculation:</strong> This calculator uses reported PSA values. Discuss medication 
                history with your physician.
              </li>
            </ul>
          </section>

          <section className="docs-section">
            <h3>Limitations</h3>
            <ul className="limitations-list">
              <li>
                <strong>PSA variability:</strong> PSA can fluctuate due to infection, recent ejaculation, 
                prostate massage, or cycling. Repeat testing may be needed.
              </li>
              <li>
                <strong>Missing factors:</strong> Family history details, genetic markers (BRCA), DRE findings, 
                and prior biopsy history are not fully incorporated.
              </li>
              <li>
                <strong>Not diagnostic:</strong> Risk scores estimate probability, not presence/absence of cancer.
              </li>
            </ul>
          </section>

          <section className="docs-section">
            <h3>References</h3>
            <ul className="limitations-list">
              <li>NCCN Clinical Practice Guidelines for Prostate Cancer Early Detection</li>
              <li>EAU Guidelines on Prostate Cancer (2023)</li>
              <li>PI-RADS v2.1: Prostate Imaging Reporting and Data System</li>
              <li>PCPT Risk Calculator 2.0 (Thompson et al.)</li>
            </ul>
            <p className="reference-note">
              For questions about the risk assessment model, please contact the 
              Department of Urology, Mount Sinai Health System.
            </p>
          </section>
        </div>

        <div className="model-docs-footer">
          <button className="btn-primary" onClick={onClose}>Close Documentation</button>
        </div>
      </div>
    </div>
  );
};

export default RiskAssessmentDocs;
