import React from 'react';
import './ModelDocs.css';

const ModelDocs = ({ onClose }) => {
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
              The ePSA (Electronic Prostate-Specific Awareness) calculator uses a 7-variable logistic regression 
              model to estimate the probability of clinically significant prostate cancer (csPCa). This tool 
              is designed for educational and screening prioritization purposes.
            </p>
            <div className="info-box warning">
              <strong>Validation Status:</strong> This model was derived from a small cohort (n=100) and has 
              not been prospectively validated. Results should be interpreted with physician review and 
              used as an adjunct to standard screening protocols, not as a standalone diagnostic tool.
            </div>
          </section>

          <section className="docs-section">
            <h3>Model Formula</h3>
            <div className="formula-box">
              <code>
                logit = -3.8347<br/>
                &nbsp;&nbsp;+ 0.0454 × Age (years)<br/>
                &nbsp;&nbsp;- 0.0253 × Race_Black (1=Black, 0=other)<br/>
                &nbsp;&nbsp;+ 0.0195 × BMI (kg/m²)<br/>
                &nbsp;&nbsp;- 0.0292 × IPSS (0–35)<br/>
                &nbsp;&nbsp;- 0.5947 × Exercise (0=regular, 1=some, 2=none)<br/>
                &nbsp;&nbsp;- 0.8911 × Family_History (1=yes, 0=no)<br/>
                &nbsp;&nbsp;- 0.0358 × SHIM (1–25)
              </code>
            </div>
            <p className="formula-note">
              Probability = 1 / (1 + e<sup>-logit</sup>)
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
                  <td>30–95 years</td>
                  <td>+0.0454</td>
                  <td>Patient age in years. Higher age increases risk score.</td>
                </tr>
                <tr>
                  <td><strong>Race_Black</strong></td>
                  <td>Binary</td>
                  <td>0 or 1</td>
                  <td>-0.0253</td>
                  <td>Backend encoding: 1 if Black/African American, 0 otherwise. UI still captures multiple race/ethnicity groups for patient-facing inclusivity.</td>
                </tr>
                <tr>
                  <td><strong>BMI</strong></td>
                  <td>Continuous</td>
                  <td>Calculated</td>
                  <td>+0.0195</td>
                  <td>Body Mass Index (kg/m²). Auto-calculated from height and weight. Higher BMI increases risk.</td>
                </tr>
                <tr>
                  <td><strong>IPSS</strong></td>
                  <td>Sum (7 items)</td>
                  <td>0–35</td>
                  <td>-0.0292</td>
                  <td>International Prostate Symptom Score. Sum of 7 urinary symptom questions (0-5 each). Lower scores = fewer symptoms.</td>
                </tr>
                <tr>
                  <td><strong>SHIM</strong></td>
                  <td>Sum (5 items)</td>
                  <td>1–25</td>
                  <td>-0.0358</td>
                  <td>Sexual Health Inventory for Men. Sum of 5 sexual function questions. Higher scores = better function.</td>
                </tr>
                <tr>
                  <td><strong>Exercise</strong></td>
                  <td>Ordinal</td>
                  <td>0, 1, 2</td>
                  <td>-0.5947</td>
                  <td>0=Regular (3+ days/week), 1=Some (1-2 days/week), 2=None. No exercise increases risk.</td>
                </tr>
                <tr>
                  <td><strong>Family History</strong></td>
                  <td>Binary</td>
                  <td>0 or 1</td>
                  <td>-0.8911</td>
                  <td>1 if any first-degree relative with prostate cancer, 0 otherwise. Family history significantly increases risk.</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="docs-section">
            <h3>Risk Tiers</h3>
            <div className="tiers-grid">
              <div className="tier-card lower">
                <h4>Lower Risk</h4>
                <div className="tier-range">&lt; 8%</div>
                <p>Continue routine screening as recommended for age group.</p>
                <p className="tier-action">Action: Follow standard age-based screening guidelines.</p>
              </div>
              <div className="tier-card moderate">
                <h4>Moderate Risk</h4>
                <div className="tier-range">8% – 20%</div>
                <p>Consider PSA blood testing for additional risk stratification.</p>
                <p className="tier-action">Action: Discuss PSA blood test with your doctor.</p>
              </div>
              <div className="tier-card higher">
                <h4>Higher Risk</h4>
                <div className="tier-range">≥ 20%</div>
                <p>Elevated risk suggests need for comprehensive evaluation.</p>
                <p className="tier-action">Action: Schedule PSA test and urology consultation.</p>
              </div>
            </div>
            <p className="confidence-note">
              <strong>Displayed Range:</strong> A ±10% confidence interval is shown to patients 
              (e.g., score of 15% displays as "5%–25%") to acknowledge model uncertainty.
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
                <strong>Counterintuitive coefficients:</strong> Some coefficients (e.g., negative for 
                race and IPSS) may reflect specific characteristics of the derivation cohort rather 
                than true biological relationships.
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
