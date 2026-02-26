import React from 'react';
import './ModelDocs.css';
import { DEFAULT_CALCULATOR_CONFIG } from '../config/calculatorConfig';

const ModelDocs = ({ onClose, config = DEFAULT_CALCULATOR_CONFIG }) => {
  const activeConfig = config || DEFAULT_CALCULATOR_CONFIG;
  const part1 = activeConfig.part1 || DEFAULT_CALCULATOR_CONFIG.part1;
  const variables = part1.variables || [];

  const getVar = (id) => variables.find(v => v.id === id) || {};
  const pct = (value) => `${Math.round(Number(value) * 100)}%`;
  const w = (id) => Number(getVar(id).weight ?? 0).toFixed(4);

  const ageVar = getVar('age');
  const bmiVar = getVar('bmi');
  const ipssVar = getVar('ipssTotal');
  const shimVar = getVar('shimTotal');
  const inflammationVar = getVar('inflammationHx');
  const hasInflammationVar = Boolean(inflammationVar && inflammationVar.id);

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
              The ePSA (Electronic Prostate-Specific Awareness) calculator uses a logistic regression model
              to generate an educational estimate based on the information entered. It is intended to support
              learning and conversations with a healthcare professional.
            </p>
            <div className="info-box warning">
              <strong>Validation Status:</strong> This is a <strong>Non-Validated Educational Risk Tool</strong>.
              It is not a diagnostic test and not a clinical decision aid. Results should be interpreted with
              clinician review and should not be used as a standalone basis for PSA, MRI, or biopsy decisions.
            </div>
          </section>

          <section className="docs-section">
            <h3>Model Formula</h3>
            <div className="formula-box">
              <code>
                logit = {Number(part1.intercept ?? 0).toFixed(4)}<br/>
                &nbsp;&nbsp;{Number(w('age')) >= 0 ? '+' : '-'} {Math.abs(Number(w('age'))).toFixed(4)} × Age (years)<br/>
                &nbsp;&nbsp;{Number(w('raceBlack')) >= 0 ? '+' : '-'} {Math.abs(Number(w('raceBlack'))).toFixed(4)} × Race_Black (1=Black, 0=other)<br/>
                &nbsp;&nbsp;{Number(w('bmi')) >= 0 ? '+' : '-'} {Math.abs(Number(w('bmi'))).toFixed(4)} × BMI (kg/m²)<br/>
                &nbsp;&nbsp;{Number(w('ipssTotal')) >= 0 ? '+' : '-'} {Math.abs(Number(w('ipssTotal'))).toFixed(4)} × IPSS ({ipssVar.min ?? 0}–{ipssVar.max ?? 35})<br/>
                &nbsp;&nbsp;{Number(w('exerciseCode')) >= 0 ? '+' : '-'} {Math.abs(Number(w('exerciseCode'))).toFixed(4)} × Exercise (0=regular, 1=some, 2=none)<br/>
                &nbsp;&nbsp;{Number(w('fhBinary')) >= 0 ? '+' : '-'} {Math.abs(Number(w('fhBinary'))).toFixed(4)} × FH (1=yes, 0=no)<br/>
                &nbsp;&nbsp;{Number(w('shimTotal')) >= 0 ? '+' : '-'} {Math.abs(Number(w('shimTotal'))).toFixed(4)} × SHIM ({shimVar.min ?? 0}–{shimVar.max ?? 25})
                {hasInflammationVar ? (
                  <>
                    <br/>
                    &nbsp;&nbsp;{Number(w('inflammationHx')) >= 0 ? '+' : '-'} {Math.abs(Number(w('inflammationHx'))).toFixed(4)} × InflammationHx (1=yes, 0=no)
                  </>
                ) : null}
              </code>
            </div>
            <p className="formula-note">
              Probability = 1 / (1 + e<sup>-logit</sup>)
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
                  <th>Coefficient</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Age</strong></td>
                  <td>Continuous</td>
                  <td>{ageVar.min ?? 18}–{ageVar.max ?? 120} years</td>
                  <td>{Number(w('age')) >= 0 ? '+' : '-'}{Math.abs(Number(w('age'))).toFixed(4)}</td>
                  <td>Patient age in years. Higher age increases risk score.</td>
                </tr>
                <tr>
                  <td><strong>Race_Black</strong></td>
                  <td>Binary</td>
                  <td>0 or 1</td>
                  <td>{Number(w('raceBlack')) >= 0 ? '+' : '-'}{Math.abs(Number(w('raceBlack'))).toFixed(4)}</td>
                  <td>Encoding: 1 if Black/African American, 0 otherwise (config-driven list). The UI captures multiple race/ethnicity groups for patient-facing inclusivity.</td>
                </tr>
                <tr>
                  <td><strong>BMI</strong></td>
                  <td>Continuous</td>
                  <td>{bmiVar.min ?? 15}–{bmiVar.max ?? 60} kg/m²</td>
                  <td>{Number(w('bmi')) >= 0 ? '+' : '-'}{Math.abs(Number(w('bmi'))).toFixed(4)}</td>
                  <td>Body Mass Index (kg/m²). Auto-calculated from height and weight. Higher BMI increases risk.</td>
                </tr>
                <tr>
                  <td><strong>IPSS</strong></td>
                  <td>Sum (7 items)</td>
                  <td>{ipssVar.min ?? 0}–{ipssVar.max ?? 35}</td>
                  <td>{Number(w('ipssTotal')) >= 0 ? '+' : '-'}{Math.abs(Number(w('ipssTotal'))).toFixed(4)}</td>
                  <td>International Prostate Symptom Score. Sum of 7 urinary symptom questions (0-5 each). Lower scores = fewer symptoms.</td>
                </tr>
                <tr>
                  <td><strong>SHIM</strong></td>
                  <td>Sum (5 items)</td>
                  <td>{shimVar.min ?? 0}–{shimVar.max ?? 25}</td>
                  <td>{Number(w('shimTotal')) >= 0 ? '+' : '-'}{Math.abs(Number(w('shimTotal'))).toFixed(4)}</td>
                  <td>Sexual Health Inventory for Men. Sum of 5 sexual function questions. Higher scores = better function.</td>
                </tr>
                <tr>
                  <td><strong>Exercise</strong></td>
                  <td>Ordinal</td>
                  <td>0, 1, 2</td>
                  <td>{Number(w('exerciseCode')) >= 0 ? '+' : '-'}{Math.abs(Number(w('exerciseCode'))).toFixed(4)}</td>
                  <td>0=Regular (3+ days/week), 1=Some (1-2 days/week), 2=None.</td>
                </tr>
                <tr>
                  <td><strong>Family History</strong></td>
                  <td>Binary</td>
                  <td>0 or 1</td>
                  <td>{Number(w('fhBinary')) >= 0 ? '+' : '-'}{Math.abs(Number(w('fhBinary'))).toFixed(4)}</td>
                  <td>1 if any first-degree relative with prostate cancer, 0 otherwise.</td>
                </tr>
                {hasInflammationVar ? (
                  <tr>
                    <td><strong>InflammationHx</strong></td>
                    <td>Binary</td>
                    <td>0 or 1</td>
                    <td>{Number(w('inflammationHx')) >= 0 ? '+' : '-'}{Math.abs(Number(w('inflammationHx'))).toFixed(4)}</td>
                    <td>History of inflammatory condition (e.g., UC, Crohn’s, chronic prostatitis). Optional if not collected.</td>
                  </tr>
                ) : null}
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
                  <td>Derivation Cohort</td>
                  <td>n = 100 patients</td>
                </tr>
                <tr>
                  <td>ePSA AUC</td>
                  <td>0.673</td>
                </tr>
                <tr>
                  <td>Screening Prevalence</td>
                  <td>Recalibrated to ~15%</td>
                </tr>
                <tr>
                  <td>Primary Endpoint</td>
                  <td>Clinically significant prostate cancer (csPCa)</td>
                </tr>
              </tbody>
            </table>
            <div className="info-box info">
              <strong>Note on AUC:</strong> The Area Under the ROC Curve (AUC) measures discrimination 
              (ability to distinguish high vs. low risk). An AUC of 0.673 indicates modest discrimination 
              (better than chance at 0.5, but less than excellent at 0.8+).
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
