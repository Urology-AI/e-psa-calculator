import React from 'react';
import './VersionFooter.css';

// Persistent version + guideline-date footer.
// Shown on every top-level screen so reviewers and clinicians can cite
// a specific build and verify what guideline corpus produced a result.
const APP_VERSION = '1.1.0';
const GUIDELINE_TAG = 'Multimodal Risk Intelligence · AUA/SUO 2026 · NCCN v1.2024 · EAU 2024';

const VersionFooter = () => (
  <div className="version-footer" aria-label="ePSA build and guideline information">
    <div className="version-footer__block">
      <span className="version-footer__eyebrow">Developed by</span>
      <span className="version-footer__org-primary">Tewari Lab</span>
      <span className="version-footer__org-secondary">Icahn School of Medicine at Mount Sinai</span>
    </div>
    <div className="version-footer__block version-footer__block--meta">
      <span className="version-footer__guidelines">{GUIDELINE_TAG}</span>
      <span className="version-footer__note">Educational Decision Support</span>
      <span className="version-footer__version">Version {APP_VERSION}</span>
      <span className="version-footer__disclaimer">Educational use only — not a medical device</span>
    </div>
  </div>
);

export default VersionFooter;
