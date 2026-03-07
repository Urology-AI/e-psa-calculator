import React, { useState } from 'react';
import './ConsentScreen.css';
import { 
  ShieldIcon, 
  SmartphoneIcon, 
  MailIcon,
  CalendarIcon, 
  HospitalIcon 
} from 'lucide-react';

const ConsentScreen = ({ phone, email, onConsentComplete }) => {
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

  const contactInfo = email || phone;
  const isEmail = !!email;
  const hasContact = !!contactInfo;

  return (
    <div className="consent-container">
      <div className="consent-card">
        <div className="consent-header">
          <h2>Follow-Up Communication Consent</h2>
          <p className="consent-intro">
            {hasContact
              ? <>Your {isEmail ? 'email address' : 'phone number'} <strong>{contactInfo}</strong> will be used for:</>
              : <>Your session is stored by key only. No contact info is collected. You may still choose:</>
            }
          </p>
        </div>

        <div className="consent-reasons">
          <ul>
            {hasContact && (
              <li>
                <ShieldIcon size={16} />
                Account login and verification
              </li>
            )}
            <li>
              {hasContact ? (isEmail ? <MailIcon size={16} /> : <SmartphoneIcon size={16} />) : <ShieldIcon size={16} />}
              Screening results follow-up
            </li>
            <li>
              <CalendarIcon size={16} />
              PSA test reminders
            </li>
            <li>
              <HospitalIcon size={16} />
              Connection to Mount Sinai care resources
            </li>
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
              {hasContact
                ? ' If you decline, we will not contact you for follow-up, but you can access your results anytime by logging in.'
                : ' If you decline, we will not contact you. Use your session key to load your data from cloud anytime.'
              }
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
