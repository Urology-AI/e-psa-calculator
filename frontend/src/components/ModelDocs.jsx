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
              The ePSA (Electronic Prostate-Specific Awareness) calculator uses a <strong>point-based educational score</strong> for Part 1.
              Each risk factor (for example age 60+, BMI ≥30, mild urinary symptoms, smoking, high red meat diet, Black race,
              family history, BRCA, inflammation, Agent Orange/chemical exposure, and a low SHIM score) contributes a fixed
              number of points. The total is normalized to a 0–100% scale and displayed with a ±5% range.
            </p>
            <div className="info-box warning">
              <strong>Validation Status:</strong> This is a <strong>Non-Validated Educational Risk Tool</strong>.
              It is not a diagnostic test and not a clinical decision aid. Results should be interpreted with
              clinician review and should not be used as a standalone basis for PSA, MRI, or biopsy decisions.
            </div>
          </section>

          <section className="docs-section">
            <h3>Scoring Formula (Part 1)</h3>
            <div className="formula-box">
              <code>
                rawPoints = sum of risk-factor points<br/>
                maxPoints = 128<br/>
                percentScore = (rawPoints / maxPoints) × 100<br/>
                displayRange = percentScore ± 5% (capped 0–100)
              </code>
            </div>
            <p className="formula-note">
              <strong>PSA Recommended</strong> is generally shown when the lower end of the display range is ≥ {(part1.recommendThreshold ?? 0.09) * 100}%.
              If the range falls entirely below the threshold, PSA is not recommended; if it straddles the threshold, the recommendation is marked as borderline.
              A clinical override is applied so that family history plus age ≥ 40 always recommends PSA.
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
                  <th>Factor group</th>
                  <th>Examples</th>
                  <th>Point pattern</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Age</strong></td>
                  <td>&lt;50, 50–59, 60–69, 70+</td>
                  <td>0 / 0 / 8 / 16 points</td>
                </tr>
                <tr>
                  <td><strong>BMI</strong></td>
                  <td>&lt;25, 25–29.9, ≥30</td>
                  <td>0 / 0 / 8 points</td>
                </tr>
                <tr>
                  <td><strong>IPSS</strong></td>
                  <td>Mild (0–7), Moderate (8–19), Severe (20–35)</td>
                  <td>8 / 4 / 0 points</td>
                </tr>
                <tr>
                  <td><strong>Exercise</strong></td>
                  <td>High, Some, None</td>
                  <td>0 / 8 / 16 points</td>
                </tr>
                <tr>
                  <td><strong>Smoking</strong></td>
                  <td>Never, Former, Current</td>
                  <td>0 / 8 / 16 points</td>
                </tr>
                <tr>
                  <td><strong>Diet</strong></td>
                  <td>Western vs other patterns</td>
                  <td>8 points for Western / high red meat</td>
                </tr>
                <tr>
                  <td><strong>Race</strong></td>
                  <td>Black / African American</td>
                  <td>8 points if Black / African American</td>
                </tr>
                <tr>
                  <td><strong>Family history</strong></td>
                  <td>First-degree relative with prostate cancer</td>
                  <td>16 points if present</td>
                </tr>
                <tr>
                  <td><strong>BRCA</strong></td>
                  <td>Known BRCA mutation</td>
                  <td>16 points if present</td>
                </tr>
                <tr>
                  <td><strong>Inflammation</strong></td>
                  <td>Biopsy-detected or prior inflammatory history</td>
                  <td>4 points if present</td>
                </tr>
                <tr>
                  <td><strong>Chemical exposure</strong></td>
                  <td>Agent Orange or similar exposures</td>
                  <td>4 points if present</td>
                </tr>
                <tr>
                  <td><strong>SHIM</strong></td>
                  <td>Sexual Health Inventory for Men</td>
                  <td>8 points if SHIM &lt; 12</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="docs-section">
            <h3>Risk Tiers</h3>
            <div className="tiers-grid">
              <div className="tier-card lower">
                <h4>Lower Risk</h4>
                <div className="tier-range">Fewer risk flags</div>
                <p>Relatively fewer risk flags based on the point score.</p>
                <p className="tier-action">Consider discussing routine screening with a clinician based on your age and preferences.</p>
              </div>
              <div className="tier-card moderate">
                <h4>Moderate Risk</h4>
                <div className="tier-range">Some risk flags</div>
                <p>Middle-range number of risk flags based on the point score.</p>
                <p className="tier-action">Consider discussing whether PSA testing is appropriate with a clinician.</p>
              </div>
              <div className="tier-card higher">
                <h4>Higher Risk</h4>
                <div className="tier-range">Many risk flags</div>
                <p>More accumulated risk flags based on the point score.</p>
                <p className="tier-action">Consider prioritizing discussion with a clinician about whether additional evaluation makes sense for you.</p>
              </div>
            </div>
            <p className="confidence-note">
              <strong>Displayed Range:</strong> A ±5% display band is shown to reduce over-interpretation of small differences.
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
