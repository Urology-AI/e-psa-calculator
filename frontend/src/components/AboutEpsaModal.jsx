import React from 'react';
import './ModelDocs.css';

const AboutEpsaModal = ({ onClose }) => (
  <div className="model-docs-overlay" role="dialog" aria-modal="true" aria-labelledby="about-epsa-title">
    <div className="model-docs-container">
      <div className="model-docs-header">
        <h2 id="about-epsa-title">About ePSA</h2>
        <button className="btn-close" onClick={onClose} aria-label="Close About ePSA">×</button>
      </div>

      <div className="model-docs-content">
        <section className="docs-section">
          <h3>Purpose</h3>
          <p>
            ePSA (Prostate-Specific Awareness) is an educational decision-support tool that
            estimates an individual's likelihood of clinically significant prostate cancer,
            combining personal risk factors, PSA, and MRI findings with current screening
            guidelines. It is designed to inform — not replace — a conversation with a
            qualified clinician.
          </p>
        </section>

        <section className="docs-section">
          <h3>Intended Users</h3>
          <p>
            ePSA is built for two audiences: <strong>patients</strong>, who use it to understand
            their baseline risk and prepare for a physician visit, and <strong>clinicians</strong>,
            who use it to review guideline-referenced recommendations, model calibration, and
            supporting evidence alongside a patient's results.
          </p>
        </section>

        <section className="docs-section">
          <h3>Development</h3>
          <p>
            ePSA is developed by the <strong>Tewari Lab</strong> at the{' '}
            <strong>Icahn School of Medicine at Mount Sinai</strong>, Department of Urology,
            under the direction of Ashutosh K. Tewari, MD.
          </p>
        </section>

        <section className="docs-section">
          <h3>Guideline Alignment</h3>
          <p>
            Recommendations are cross-referenced against AUA/SUO 2026, NCCN v1.2024, and EAU 2024
            prostate cancer early detection guidelines. Where ePSA's model-based estimate diverges
            from a guideline-only recommendation, both are shown so the difference is transparent.
          </p>
        </section>

        <section className="docs-section">
          <h3>Validation Status &amp; Version History</h3>
          <div className="info-box info">
            Current version: <strong>ePSA v1.0.0</strong>. The biopsy-risk model (Grade Group ≥2)
            is trained and validated on a Mount Sinai referral cohort. See{' '}
            <strong>Model Documentation</strong> for detailed methodology, cohort size, and
            performance metrics.
          </div>
        </section>

        <section className="docs-section">
          <div className="info-box" style={{ background: 'var(--warning-50)', borderColor: 'var(--warning-600)', color: 'var(--warning-600)' }}>
            <strong>Not a medical device.</strong> ePSA is not FDA-cleared and does not provide a
            diagnosis. Always consult a qualified healthcare provider before making medical
            decisions.
          </div>
        </section>

        <section className="docs-section">
          <h3>Research Feedback</h3>
          <p>
            Clinicians and researchers with feedback on ePSA's methodology or results can reach
            the Tewari Lab through the Department of Urology at the Icahn School of Medicine at
            Mount Sinai.
          </p>
        </section>
      </div>

      <div className="model-docs-footer">
        <button className="btn-primary" onClick={onClose}>Close</button>
      </div>
    </div>
  </div>
);

export default AboutEpsaModal;
