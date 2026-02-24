import React, { useState } from 'react';
import './ConsentScreen.css';

const ConsentScreen = ({ phone, onConsentComplete }) => {
  const [consent, setConsent] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (consent === null) {
      setError('Please select an option to continue');
      return;
    }

    const consentData = {
      consentToContact: consent === 'yes',
      consentTimestamp: new Date().toISOString()
    };

    onConsentComplete(consentData);
  };

  return (
    <div className="consent-container">
      <div className="consent-card">
        <div className="consent-header">
          <h2>Follow-Up Communication Consent</h2>
          <p className="consent-intro">
            Your phone number <strong>{phone}</strong> will be used for:
          </p>
        </div>

        <div className="consent-reasons">
          <ul>
            <li>🔐 Account login and verification</li>
            <li>📲 Screening results follow-up</li>
            <li>📅 PSA test reminders</li>
            <li>🏥 Connection to Mount Sinai care resources</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="consent-form">
          <div className="consent-question">
            <p className="question-text">
              <strong>May we contact you regarding your screening results or follow-up care?</strong>
            </p>

            <div className="consent-options">
              <label className={`consent-option ${consent === 'yes' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="consent"
                  value="yes"
                  checked={consent === 'yes'}
                  onChange={(e) => {
                    setConsent(e.target.value);
                    setError('');
                  }}
                />
                <span>Yes, I agree to be contacted</span>
              </label>

              <label className={`consent-option ${consent === 'no' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="consent"
                  value="no"
                  checked={consent === 'no'}
                  onChange={(e) => {
                    setConsent(e.target.value);
                    setError('');
                  }}
                />
                <span>No</span>
              </label>
            </div>

            {error && <div className="error-message">{error}</div>}
          </div>

          <div className="consent-disclaimer">
            <p>
              <strong>Note:</strong> You can still use the ePSA tool regardless of your choice. 
              If you decline, we will not contact you for follow-up, but you can access your results 
              anytime by logging in.
            </p>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={consent === null}
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConsentScreen;
