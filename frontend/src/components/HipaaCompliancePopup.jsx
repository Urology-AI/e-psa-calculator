import React from 'react';
import './ModelDocs.css';

const HipaaCompliancePopup = ({ onClose }) => {
  return (
    <div className="model-docs-overlay">
      <div className="model-docs-container">
        <div className="model-docs-header">
          <h2>HIPAA Compliance</h2>
          <button className="btn-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="model-docs-content">
          <section className="docs-section">
            <h3>Privacy &amp; Data Protection</h3>
            <p>
              The ePSA tool is designed to protect your health information in line with HIPAA considerations.
              We do not collect, store, or link any personally identifiable information (PII) or protected health information (PHI) such as name, email, or phone number.
            </p>
          </section>

          <section className="docs-section">
            <h3>Anonymous Session Key Only</h3>
            <ul className="limitations-list">
              <li>
                <strong>No email or phone:</strong> Cloud storage uses an anonymous session key only. You receive a short key (e.g. A1B2C3D4) to load your data later. We do not collect or store your email address or phone number.
              </li>
              <li>
                <strong>No identity linking:</strong> Your assessment data is not linked to any identifier that could reveal who you are. Only someone with your session key can access that session&apos;s data.
              </li>
              <li>
                <strong>Save your key:</strong> If you lose your session key, we cannot recover your data. We have no way to associate the data with you.
              </li>
            </ul>
          </section>

          <section className="docs-section">
            <h3>Data Import &amp; Cloud</h3>
            <ul className="limitations-list">
              <li>
                <strong>File import:</strong> When you import a JSON file, we do not link that data to any existing cloud session. Data is loaded locally only. You may later choose &quot;Move to cloud&quot; to save it under a new anonymous session key.
              </li>
              <li>
                <strong>Load from cloud:</strong> To continue a previous session, you must enter your session key. We do not use information from imported files to look up or attach to existing sessions.
              </li>
            </ul>
          </section>

          <section className="docs-section">
            <h3>Your Choices</h3>
            <p>
              You can use the tool with data stored only on this device (&quot;This device only&quot;) or save to the cloud using an anonymous session key. No personal contact information is required for cloud storage.
            </p>
          </section>

          <section className="docs-section">
            <div className="info-box info">
              <strong>Disclaimer:</strong> This summary describes how the ePSA application handles data for privacy purposes. It is not legal advice. For questions about HIPAA or your health information, consult your healthcare provider or legal counsel.
            </div>
          </section>
        </div>

        <div className="model-docs-footer">
          <button className="btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default HipaaCompliancePopup;
