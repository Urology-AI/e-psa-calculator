import React from 'react';
import './LegalPage.css';

const platforms = [
  {
    label: 'ePSA Web App',
    privacy: '/legal/web/privacy',
    terms: '/legal/web/terms',
  },
  {
    label: 'ePSA iOS App',
    privacy: '/legal/ios/privacy',
    terms: '/legal/ios/terms',
  },
  {
    label: 'ePSA Android App',
    privacy: '/legal/android/privacy',
    terms: '/legal/android/terms',
  },
];

const LegalHub = () => {
  return (
    <div className="legal-page">
      <div className="legal-page-inner">
        <a className="legal-back-link" href="/">&larr; Back to ePSA</a>

        <div className="legal-header">
          <h1>Legal</h1>
          <div className="legal-updated">
            Privacy policies and terms of service for every ePSA app
          </div>
        </div>

        <div className="legal-body" style={{ paddingTop: '1.5rem' }}>
          <p>
            ePSA is offered as three separate apps — a web app, an iOS app,
            and an Android app — each with its own data flows (for example,
            the iOS app runs AI chat entirely on-device, while the web app
            stores assessment data under an anonymous session key). Because
            the apps differ, each has its own privacy policy and terms of
            service below.
          </p>
        </div>

        <div className="legal-hub-grid">
          {platforms.map((p) => (
            <div className="legal-hub-card" key={p.label}>
              <h2>{p.label}</h2>
              <a href={p.privacy}>Privacy Policy</a>
              <a href={p.terms}>Terms of Service</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LegalHub;
