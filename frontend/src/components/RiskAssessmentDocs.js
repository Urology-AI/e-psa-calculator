import React from 'react';
import './ModelDocs.css';

const RiskAssessmentDocs = ({ onClose }) => {
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
              The Risk Assessment stage combines your initial screening priority (Stage 1 ePSA score) 
              with additional clinical data to produce a comprehensive risk evaluation. This two-stage 
              approach provides more accurate risk stratification for prostate cancer screening decisions.
            </p>
            <div className="info-box warning">
              <strong>Important:</strong> This assessment incorporates PSA levels and MRI findings when available. 
              PIRADS 4 or 5 scores on MRI may significantly elevate risk regardless of other factors.
            </div>
          </section>

          <section className="docs-section">
            <h3>Risk Calculation Formula</h3>
            <div className="formula-box">
              <code>
                <strong>Stage 1 Score:</strong> ePSA baseline (0-100%)<br/><br/>
                <strong>Stage 2 Adjustments:</strong><br/>
                &nbsp;&nbsp;+ PSA points (0, 5, 10, 20, or 40)<br/>
                &nbsp;&nbsp;+ PIRADS points (0 or 10, or override for PIRADS 4/5)<br/><br/>
                <strong>Total Points → Risk Category</strong>
              </code>
            </div>
            <p className="formula-note">
              PIRADS 4 → 52% risk | PIRADS 5 → 89% risk (automatic high-risk)
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
                  <td>0.1-100+ ng/mL</td>
                  <td>0-40</td>
                  <td>Prostate-Specific Antigen blood test. Higher levels increase risk score. Note: 5-alpha reductase inhibitors (finasteride/dutasteride) can lower PSA by ~50%.</td>
                </tr>
                <tr>
                  <td><strong>PI-RADS Score</strong></td>
                  <td>Ordinal</td>
                  <td>1-5 or N/A</td>
                  <td>0-10 or override</td>
                  <td>MRI-based lesion assessment. Scores 4-5 trigger automatic high-risk classification regardless of other factors.</td>
                </tr>
                <tr>
                  <td><strong>Stage 1 Baseline</strong></td>
                  <td>Percentage</td>
                  <td>0-100%</td>
                  <td>0-160+</td>
                  <td>Converted from Stage 1 ePSA probability score to points scale.</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="docs-section">
            <h3>Risk Categories & Next Steps</h3>
            <div className="tiers-grid">
              <div className="tier-card lower">
                <h4>Low Risk (0-40 points)</h4>
                <div className="tier-range">0–10% probability</div>
                <p className="tier-action">
                  Continue routine screening. Focus on healthy lifestyle.
                </p>
              </div>
              <div className="tier-card moderate">
                <h4>Moderate Risk (41-80 points)</h4>
                <div className="tier-range">10–20% probability</div>
                <p className="tier-action">
                  Consider PSA testing. Discuss with your doctor, especially if age 50+.
                </p>
              </div>
              <div className="tier-card higher">
                <h4>High Risk (81-120 points)</h4>
                <div className="tier-range">20–40% probability</div>
                <p className="tier-action">
                  Schedule urology consultation. Consider MRI if PSA elevated.
                </p>
              </div>
              <div className="tier-card" style={{borderColor: '#8B0000', background: '#FFF5F5'}}>
                <h4>Very High Risk (&gt;120 points)</h4>
                <div className="tier-range">40–70% probability</div>
                <p className="tier-action">
                  Prompt urology referral. PSA + MRI + possible biopsy recommended.
                </p>
              </div>
            </div>
          </section>

          <section className="docs-section">
            <h3>PI-RADS Override Logic</h3>
            <div className="info-box info">
              <p><strong>PI-RADS 4:</strong> Automatically sets risk to <strong>52% (43–61%)</strong></p>
              <p><strong>PI-RADS 5:</strong> Automatically sets risk to <strong>89% (76–97%)</strong></p>
              <p style={{marginTop: '10px'}}>
                This override reflects that MRI-detected suspicious lesions are strong independent 
                predictors of clinically significant prostate cancer.
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
