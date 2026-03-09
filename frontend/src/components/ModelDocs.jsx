import React from 'react';
import './ModelDocs.css';
import { DEFAULT_CALCULATOR_CONFIG } from '../config/calculatorConfig';

/**
 * Model Documentation — Stage 1 (ePSA Screening Priority)
 * Documents the questionnaire and scoring model, not the Risk Assessment (Stage 2) model.
 */
const ModelDocs = ({ onClose, config = DEFAULT_CALCULATOR_CONFIG }) => {
  const part1 = config?.part1 || DEFAULT_CALCULATOR_CONFIG.part1;
  const riskCutoffs = part1?.riskCutoffs || { lower: { threshold: 0.23 }, moderate: { threshold: 0.39 }, higher: { threshold: 1.0 } };
  const recommendThreshold = part1?.recommendThreshold ?? 0.09;

  return (
    <div className="model-docs-overlay">
      <div className="model-docs-container">
        <div className="model-docs-header">
          <h2>Model Documentation (ePSA Screening Priority)</h2>
          <button className="btn-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="model-docs-content">
          <section className="docs-section">
            <h3>Overview</h3>
            <p>
              Stage 1 (Screening Priority) uses a short questionnaire to produce an educational ePSA score (0–100%)
              and risk tier. This helps inform a conversation with a clinician about prostate cancer screening (e.g. PSA testing).
              It is <strong>not a diagnosis</strong> and does not replace clinical judgment.
            </p>
            <div className="info-box warning">
              <strong>Non-validated educational tool.</strong> Screening decisions should be made with a qualified healthcare provider.
              Risk tiers are based on population-level data and guideline thresholds from AUA, NCCN, and EAU, and may recommend earlier evaluation than current thresholds for high-risk demographic profiles. This divergence is intentional and should be interpreted in the context of shared decision-making.
            </div>
          </section>

          <section className="docs-section">
            <h3>Questionnaire Inputs</h3>
            <p>The model uses the following inputs from the questionnaire:</p>
            <ul className="limitations-list">
              <li><strong>Demographics:</strong> Age, race/ethnicity</li>
              <li><strong>Anthropometrics:</strong> Height, weight, BMI</li>
              <li><strong>Family &amp; genetics:</strong> Family history of prostate cancer, BRCA status</li>
              <li><strong>Lifestyle:</strong> Exercise level, smoking, diet pattern, chemical/Agent Orange exposure</li>
              <li><strong>Medical history:</strong> Prostatitis/inflammation, hypertension, hyperlipidemia, coronary artery disease, diabetes</li>
              <li><strong>Validated instruments:</strong> IPSS (urinary symptoms, 7 questions, 0–35) and SHIM (erectile function, 5 questions, 0–25)</li>
            </ul>
          </section>

          <section className="docs-section">
            <h3>How the Score Is Calculated</h3>
            <p>
              The ePSA model uses a point-based (binned) approach. Your answers are converted into risk factors
              (e.g. age 50–59, 60–69, 70+; BMI 25–29.9 or ≥30; IPSS severity; exercise; Black race; family history).
              These are combined into a single score, normalized to a 0–100% scale. A ±5% range is shown to avoid
              over-interpreting small differences.
            </p>
            <p className="formula-note">
              Model type: <strong>{part1?.modelType || 'binned_v1'}</strong>. Risk tiers: LOWER (below 23%), MODERATE (23%–39%), HIGHER (above 39%).
            </p>
          </section>

          <section className="docs-section">
            <h3>Risk Tiers &amp; PSA Recommendation</h3>
            <p>
              Your result is placed into one of three tiers (LOWER, MODERATE, HIGHER). In addition, the model may
              indicate whether PSA testing is &quot;Recommended&quot; or &quot;Not Recommended&quot; based on a threshold
              (e.g. score above ~9% may suggest considering PSA discussion with a clinician). This is for educational
              use only and should be reviewed with your doctor.
            </p>
          </section>

          <section className="docs-section">
            <h3>Limitations</h3>
            <ul className="limitations-list">
              <li>Not diagnostic; does not detect or rule out cancer.</li>
              <li>Based on population-level associations; individual risk may vary.</li>
              <li>Does not replace DRE, PSA, MRI, or biopsy when indicated by a clinician.</li>
            </ul>
          </section>

          <section className="docs-section">
            <h3>References</h3>
            <p>
              For details on the risk assessment stage (PSA, PI-RADS, Stage 2), see the application after completing Stage 1.
              For questions about the model, contact the Department of Urology, Mount Sinai Health System.
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
