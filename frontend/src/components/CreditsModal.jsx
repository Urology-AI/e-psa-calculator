import React from 'react';
import './ModelDocs.css';
import './CreditsModal.css';

const TEAM = [
  {
    name: 'Ashutosh K. Tewari, MD',
    role: 'Original concept & clinical direction',
    affiliation: 'Chair, Urology · Tewari Lab, Icahn School of Medicine at Mount Sinai',
  },
  {
    name: 'Aditya Dixit',
    role: 'Software, UI & model development',
    affiliation: 'Tewari Lab, Icahn School of Medicine at Mount Sinai',
  },
  {
    name: 'Daniel Ajabshir',
    role: 'Clinical analysis & model co-development',
    affiliation: 'Tewari Lab, Icahn School of Medicine at Mount Sinai',
  },
  {
    name: 'Hannah Sur',
    role: 'Literature framework',
    affiliation: 'Tewari Lab, Icahn School of Medicine at Mount Sinai',
  },
  {
    name: 'Yashaswini Agarwal',
    role: 'Data collection',
    affiliation: 'Tewari Lab, Icahn School of Medicine at Mount Sinai',
  },
  {
    name: 'Henry Walker Jodka',
    role: 'Data collection',
    affiliation: 'Tewari Lab, Icahn School of Medicine at Mount Sinai',
  },
  {
    name: 'Chahat Arora',
    role: 'Data collection',
    affiliation: 'Tewari Lab, Icahn School of Medicine at Mount Sinai',
  },
];

const CreditsModal = ({ onClose }) => (
  <div className="model-docs-overlay" role="dialog" aria-modal="true" aria-labelledby="credits-title">
    <div className="model-docs-container credits-container">
      <div className="model-docs-header">
        <h2 id="credits-title">Project Team</h2>
        <button className="btn-close" onClick={onClose} aria-label="Close credits">×</button>
      </div>

      <div className="model-docs-content">
        <section className="docs-section">
          <p className="credits-intro">
            ePSA was developed by the Tewari Lab at the Icahn School of Medicine at Mount Sinai.
            It is available to any clinician or patient for prostate cancer screening guidance.
          </p>
          <ul className="credits-list">
            {TEAM.map(({ name, role, affiliation }) => (
              <li key={name} className="credits-item">
                <span className="credits-name">{name}</span>
                <span className="credits-role">{role}</span>
                <span className="credits-affiliation">{affiliation}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="docs-section">
          <div className="info-box info">
            <strong>Availability:</strong> ePSA is a free research and educational screening tool
            open to all users — any doctor, patient, or individual may use it.
            Technology disclosure filed with Mount Sinai Innovation Partners (MSIP).
          </div>
          <div className="info-box" style={{ marginTop: '0.75rem', background: 'var(--warning-50)', borderColor: 'var(--warning-600)', color: 'var(--warning-600)' }}>
            <strong>Disclaimer:</strong> ePSA is not a medical device and does not provide a
            diagnosis. Results are for educational and screening guidance only. Always consult
            a qualified healthcare provider for medical decisions.
          </div>
        </section>
      </div>

      <div className="model-docs-footer">
        <button className="btn-primary" onClick={onClose}>Close</button>
      </div>
    </div>
  </div>
);

export default CreditsModal;
