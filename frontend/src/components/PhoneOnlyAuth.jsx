import React, { useState, useEffect } from 'react';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber
} from 'firebase/auth';
import { auth, firebaseConfig } from '../config/firebase';
import './PhoneOnlyAuth.css';
import { useTranslation } from 'react-i18next';

// Check if using Auth Emulator (reCAPTCHA not needed)
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const usingEmulator = isLocalhost && import.meta.env.VITE_USE_AUTH_EMULATOR === 'true';

// Mock RecaptchaVerifier for Auth Emulator - always resolves successfully
class MockRecaptchaVerifier {
  constructor() {
    this.type = 'recaptcha';
    this._reset = () => Promise.resolve();
    this.clear = () => {};
    this.render = () => Promise.resolve(0);
    this.verify = () => Promise.resolve('mock-token');
  }
  async _reset() {
    return Promise.resolve();
  }
  async verify() {
    return Promise.resolve('mock-token');
  }
  render() {
    return Promise.resolve(0);
  }
  clear() {
    // No-op
  }
}

const PhoneOnlyAuth = ({ onAuthSuccess }) => {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' or 'code'
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Cleanup recaptcha on unmount
    return () => {
      if (window.recaptchaVerifier) {
        try {
          if (typeof window.recaptchaVerifier.clear === 'function') {
            window.recaptchaVerifier.clear();
          }
        } catch (e) {
          // Ignore errors when component unmounts
        } finally {
          window.recaptchaVerifier = null;
        }
      }
    };
  }, []);

  const formatPhoneNumber = (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as US number (can be extended for international)
    if (digits.length <= 10) {
      if (digits.length <= 3) {
        return digits;
      } else if (digits.length <= 6) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      } else {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
      }
    }
    return value;
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Format phone to E.164
      const digits = phone.replace(/\D/g, '');
      const phoneNumber = `+1${digits}`; // US format, adjust for international

      if (digits.length !== 10) {
        throw new Error('Please enter a valid 10-digit phone number');
      }

      // Initialize reCAPTCHA (skip on localhost when using emulator)
      if (!usingEmulator) {
        // Clean up any existing verifier first
        if (window.recaptchaVerifier) {
          try {
            if (typeof window.recaptchaVerifier.clear === 'function') {
              window.recaptchaVerifier.clear();
            }
          } catch (e) {
            // Ignore cleanup errors
          }
        }

        // Create new reCAPTCHA verifier
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: (response) => {
            console.log('reCAPTCHA solved');
          }
        });
      } else {
        // Use mock verifier for emulator
        window.recaptchaVerifier = new MockRecaptchaVerifier();
      }

      // Send verification code
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      setStep('code');
    } catch (err) {
      console.error('Phone auth error:', err);
      if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please try again later.');
      } else if (err.code === 'auth/invalid-phone-number') {
        setError('Invalid phone number format');
      } else {
        setError('Failed to send verification code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!confirmationResult) {
        throw new Error('No verification in progress');
      }

      const result = await confirmationResult.confirm(code);
      onAuthSuccess(result.user);
    } catch (err) {
      console.error('Code verification error:', err);
      if (err.code === 'auth/invalid-verification-code') {
        setError('Invalid verification code. Please try again.');
      } else if (err.code === 'auth/code-expired') {
        setError('Verification code expired. Please request a new code.');
        setStep('phone');
        setCode('');
      } else {
        setError('Failed to verify code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('phone');
    setCode('');
    setError('');
  };

  return (
    <div className="phone-only-auth-container">
      <div className="phone-only-auth-card">
        {/* Header */}
        <div className="phone-only-auth-header">
          <div className="auth-logo">ePSA</div>
          <h1 className="auth-title">{t('phoneOnlyAuth.title')}</h1>
          <p className="auth-subtitle">{t('phoneOnlyAuth.subtitle')}</p>
        </div>

        {/* Phone Step */}
        {step === 'phone' && (
          <>
            <div className="auth-instruction">
              <p>{t('phoneOnlyAuth.enterPhonePrompt')}</p>
            </div>

            <form onSubmit={handlePhoneSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="phone">{t('phoneOnlyAuth.phoneLabel')}</label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                  placeholder={t('phoneOnlyAuth.phonePlaceholder')}
                  className="auth-input"
                  maxLength={14}
                  required
                />
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button 
                type="submit" 
                disabled={loading || phone.replace(/\D/g, '').length !== 10}
                className="auth-submit-btn"
              >
                {loading ? t('phoneOnlyAuth.sending') : t('phoneOnlyAuth.sendCode')}
              </button>
            </form>

            <div className="auth-info">
              <p>{t('phoneOnlyAuth.smsHint')}</p>
            </div>
          </>
        )}

        {/* Code Step */}
        {step === 'code' && (
          <>
            <div className="auth-instruction">
              <p>{t('phoneOnlyAuth.enterCodePrompt')}</p>
              <p className="phone-display">{phone}</p>
            </div>

            <form onSubmit={handleCodeSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="code">{t('phoneOnlyAuth.verificationCodeLabel')}</label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder={t('phoneOnlyAuth.codePlaceholder')}
                  className="auth-input"
                  maxLength={6}
                  required
                />
              </div>

              {error && <div className="auth-error">{error}</div>}

              <div className="auth-buttons">
                <button 
                  type="button" 
                  onClick={handleBack}
                  className="auth-back-btn"
                >
                  {t('phoneOnlyAuth.back')}
                </button>
                <button 
                  type="submit" 
                  disabled={loading || code.length !== 6}
                  className="auth-submit-btn"
                >
                  {loading ? t('phoneOnlyAuth.verifying') : t('phoneOnlyAuth.verifyCode')}
                </button>
              </div>
            </form>

            <div className="auth-info">
              <p>{t('phoneOnlyAuth.didNotReceive')}</p>
            </div>
          </>
        )}

        {/* reCAPTCHA container (invisible) */}
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
};

export default PhoneOnlyAuth;
