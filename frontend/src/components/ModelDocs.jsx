import React from 'react';
import './ModelDocs.css';
import { DEFAULT_CALCULATOR_CONFIG } from '../config/calculatorConfig';

const BINNED_VAR_DESCRIPTIONS = {
  age_50_59: 'Age 50–59 (ref: 40–49)',
  age_60_69: 'Age 60–69',
  age_70_plus: 'Age 70+',
  bmi_25_29_9: 'BMI 25–29.9 kg/m² (ref: <25)',
  bmi_ge_30: 'BMI ≥30 kg/m²',
  ipss_moderate: 'IPSS moderate (8–19) (ref: mild 0–7)',
  ipss_severe: 'IPSS severe (20–35)',
  exercise_some: 'Exercise some (1–2 days/week) (ref: regular 3+)',
  exercise_none: 'Exercise none',
  raceBlack: 'Black / African American (config-driven list)',
  fhBinary: 'Family history of prostate cancer (first-degree)'
};

const ModelDocs = ({ onClose, config = DEFAULT_CALCULATOR_CONFIG }) => {
  const activeConfig = config || DEFAULT_CALCULATOR_CONFIG;
  const part1 = activeConfig.part1 || DEFAULT_CALCULATOR_CONFIG.part1;
  const variables = part1.variables || [];
  const isBinned = part1.modelType === 'binned_v1';
  const pct = (value) => `${Math.round(Number(value) * 100)}%`;

  return (
    <div className="model-docs-overlay">
      <div className="model-docs-container">
        <div className="model-docs-header">
          <h2>ePSA Model Documentation</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        
        <div className="model-docs-content">
          <section className="docs-section">
            <h3>Overview</h3>
            <p>
              The ePSA (Electronic Prostate-Specific Awareness) calculator uses a <strong>logistic regression model</strong> on
              binned inputs (age, BMI, IPSS severity, exercise, race, family history) to generate an educational estimate
              of the likelihood of PSA &gt; 4. It is intended to support learning and conversations with a healthcare professional.
            </p>
            <div className="info-box warning">
              <strong>Validation Status:</strong> This is a <strong>Non-Validated Educational Risk Tool</strong>.
              It is not a diagnostic test and not a clinical decision aid. Results should be interpreted with
              clinician review and should not be used as a standalone basis for PSA, MRI, or biopsy decisions.
            </div>
          </section>

          <section className="docs-section">
            <h3>Model Formula</h3>
            <p className="formula-note">
              Model type: <strong>{part1.modelType || 'binned_v1'}</strong>. Logit = intercept + Σ (coefficient × dummy).
            </p>
            <div className="formula-box">
              <code>
                logit = {Number(part1.intercept ?? 0).toFixed(4)}
                {variables.slice(0, 8).map((v) => {
                  const wv = Number(v.weight ?? 0);
                  return <React.Fragment key={v.id}><br/>&nbsp;&nbsp;{wv >= 0 ? '+' : ''}{wv.toFixed(4)} × {v.id}</React.Fragment>;
                })}
                {variables.length > 8 ? <><br/>&nbsp;&nbsp;… + {variables.length - 8} more terms (see table)</> : null}
              </code>
            </div>
            <p className="formula-note">
              Raw probability = 1 / (1 + e<sup>-logit</sup>). Optional calibration: <em>calibratedLogit = slope × logit + interceptShift</em>; then probability from calibrated logit. Displayed score is probability × 100%.
            </p>
            <p className="formula-note">
              <strong>PSA Recommended</strong> is shown when probability ≥ {Number(part1.recommendThreshold ?? 0).toFixed(3)} (sensitivity-based threshold from training).
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
                  <th>Coefficient</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {isBinned && variables.length > 0 ? (
                  variables.map((v) => (
                    <tr key={v.id}>
                      <td><strong>{v.id}</strong></td>
                      <td>{v.type || 'binary'}</td>
                      <td>{(Number(v.weight) >= 0 ? '+' : '') + Number(v.weight).toFixed(4)}</td>
                      <td>{BINNED_VAR_DESCRIPTIONS[v.id] || 'Binary dummy from binned encoding.'}</td>
                    </tr>
                  ))
                ) : (
                  variables.map((v) => (
                    <tr key={v.id}>
                      <td><strong>{v.id}</strong></td>
                      <td>{v.type || 'binary'}</td>
                      <td>{(Number(v.weight) >= 0 ? '+' : '') + Number(v.weight).toFixed(4)}</td>
                      <td>—</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <section className="docs-section">
            <h3>Risk Tiers</h3>
            <div className="tiers-grid">
              <div className="tier-card lower">
                <h4>Lower Risk</h4>
                <div className="tier-range">&lt; {pct(part1.riskCutoffs?.lower?.threshold ?? 0.08)}</div>
                <p>Lower estimated likelihood relative to the model’s reference data.</p>
                <p className="tier-action">Consider discussing routine screening with a clinician based on your age and preferences.</p>
              </div>
              <div className="tier-card moderate">
                <h4>Moderate Risk</h4>
                <div className="tier-range">{pct(part1.riskCutoffs?.lower?.threshold ?? 0.08)} – {pct(part1.riskCutoffs?.moderate?.threshold ?? 0.20)}</div>
                <p>Middle-range estimated likelihood relative to the model’s reference data.</p>
                <p className="tier-action">Consider discussing whether PSA testing is appropriate with a clinician.</p>
              </div>
              <div className="tier-card higher">
                <h4>Higher Risk</h4>
                <div className="tier-range">≥ {pct(part1.riskCutoffs?.moderate?.threshold ?? 0.20)}</div>
                <p>Higher estimated likelihood relative to the model’s reference data.</p>
                <p className="tier-action">Consider prioritizing discussion with a clinician about whether additional evaluation makes sense for you.</p>
              </div>
            </div>
            <p className="confidence-note">
              <strong>Displayed Range:</strong> A ±10% display band is shown to reduce over-interpretation of small differences.
              This is <strong>not</strong> a statistical confidence interval and should not be interpreted as measurement precision.
            </p>
          </section>

          <section className="docs-section">
            <h3>Performance Metrics</h3>
            <table className="metrics-table">
              <tbody>
                <tr>
                  <td>Derivation cohort (refit)</td>
                  <td>n = 100 patients</td>
                </tr>
                <tr>
                  <td>Outcome</td>
                  <td>PSA &gt; 4 (binary)</td>
                </tr>
                <tr>
                  <td>Out-of-fold AUC</td>
                  <td>~0.51 (refit run)</td>
                </tr>
                <tr>
                  <td>Recommendation threshold</td>
                  <td>Sensitivity-based (e.g. 95% target); value in config</td>
                </tr>
              </tbody>
            </table>
            <div className="info-box info">
              <strong>Note on AUC:</strong> The Area Under the ROC Curve measures discrimination. 
              Coefficients and threshold come from the training scripts; see <code>training/README.md</code> for refit details.
            </div>
          </section>

          <section className="docs-section">
            <h3>Limitations & Considerations</h3>
            <ul className="limitations-list">
              <li>
                <strong>Small derivation sample (n=100):</strong> The model was trained on a limited 
                cohort, which may lead to unstable coefficient estimates and reduced generalizability.
              </li>
              <li>
                <strong>Lack of prospective validation:</strong> The model has not been tested on a 
                large, independent population to confirm performance.
              </li>
              <li>
                <strong>Coefficient stability:</strong> Coefficients may be sensitive to the cohort used for fitting.
                They should not be interpreted as causal effects.
              </li>
              <li>
                <strong>Not a diagnostic tool:</strong> This calculator estimates screening priority 
                risk, not the presence or absence of cancer. All patients should follow standard 
                screening protocols regardless of ePSA score.
              </li>
              <li>
                <strong>Missing variables:</strong> PSA level, DRE findings, MRI results, and other 
                clinical factors are not included in this model.
              </li>
            </ul>
          </section>

          <section className="docs-section">
            <h3>Clinical Use</h3>
            <p>
              The ePSA calculator is intended as an <strong>educational tool</strong> to help patients 
              understand factors that influence prostate cancer risk and to facilitate discussions with 
              healthcare providers. It should not replace clinical judgment or established screening 
              guidelines.
            </p>
            <p>
              <strong>Recommended workflow:</strong>
            </p>
            <ol>
              <li>Patient completes ePSA questionnaire (7 questions)</li>
              <li>System calculates risk tier based on model</li>
              <li>Patient receives educational output with risk tier and recommended action</li>
              <li>Patient discusses results with physician</li>
              <li>Physician orders appropriate screening (PSA, DRE, imaging as indicated)</li>
            </ol>
          </section>

          <section className="docs-section">
            <h3>References</h3>
            <p className="reference">
              Tewari AK, et al. Development of an electronic Prostate-Specific Awareness (ePSA) tool 
              for risk stratification in prostate cancer screening. [Citation pending - manuscript 
              in preparation]
            </p>
            <p className="reference-note">
              For questions about the model or collaboration opportunities, please contact the 
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

export default ModelDocs;
