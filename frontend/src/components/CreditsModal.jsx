import React from 'react';
import './ModelDocs.css';
import './CreditsModal.css';

const TEAM = [
  {
    name: 'Ashutosh K. Tewari, MD',
    role: 'Original concept & clinical direction',
    affiliation: 'Chair, Urology — Icahn School of Medicine at Mount Sinai',
  },
  {
    name: 'Aditya Dixit',
    role: 'Software, UI & model development',
    affiliation: 'Mount Sinai Urology AI',
  },
  {
    name: 'Daniel Ajabshir',
    role: 'Clinical analysis & model co-development',
    affiliation: 'Mount Sinai Urology',
  },
  {
    name: 'Hannah Sur',
    role: 'Literature framework',
    affiliation: 'Mount Sinai Urology',
  },
  {
    name: 'Yashaswini Agarwal',
    role: 'Data collection',
    affiliation: 'Mount Sinai Urology',
  },
  {
    name: 'Henry Walker Jodka',
    role: 'Data collection',
    affiliation: 'Mount Sinai Urology',
  },
  {
    name: 'Chahat Arora',
    role: 'Data collection',
    affiliation: 'Mount Sinai Urology',
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
            ePSA was developed at the Icahn School of Medicine at Mount Sinai.
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
            <strong>Disclosure:</strong> ePSA is a research and educational tool developed at
            Mount Sinai. Technology disclosure filed with Mount Sinai Innovation Partners (MSIP).
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
