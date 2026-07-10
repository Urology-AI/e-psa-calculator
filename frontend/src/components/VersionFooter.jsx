import React from 'react';
import './VersionFooter.css';

// Persistent version + guideline-date footer.
// Shown on every top-level screen so reviewers and clinicians can cite
// a specific build and verify what guideline corpus produced a result.
const APP_VERSION = '1.1.0';
const GUIDELINE_TAG = 'Multimodal Risk Intelligence · AUA/SUO 2026 · NCCN v1.2024 · EAU 2024 · Tewari Lab · Icahn School of Medicine at Mount Sinai';

const VersionFooter = () => (
  <div className="version-footer" aria-label="ePSA build and guideline information">
    <span className="version-footer__brand">ePSA v{APP_VERSION}</span>
    <span className="version-footer__sep" aria-hidden="true">·</span>
    <span className="version-footer__guidelines">{GUIDELINE_TAG}</span>
    <span className="version-footer__sep" aria-hidden="true">·</span>
    <span className="version-footer__note">Educational use only — not a medical device</span>
  </div>
);

export default VersionFooter;
