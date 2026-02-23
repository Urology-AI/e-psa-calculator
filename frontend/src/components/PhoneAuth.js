import React, { useState, useEffect } from 'react';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber
} from 'firebase/auth';
import { auth, firebaseConfig } from '../config/firebase';
import './PhoneAuth.css';

// Check if using Auth Emulator (reCAPTCHA not needed)
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const usingEmulator = isLocalhost && process.env.REACT_APP_USE_AUTH_EMULATOR === 'true';

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

const PhoneAuth = ({ onAuthSuccess }) => {
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
            // Ignore errors - verifier may already be destroyed
            console.warn('Error clearing old reCAPTCHA (may already be destroyed):', e.message);
          } finally {
            window.recaptchaVerifier = null;
          }
        }

        // Create new reCAPTCHA verifier
        // Firebase automatically handles reCAPTCHA Enterprise
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {
            console.log('reCAPTCHA verified successfully');
          },
          'expired-callback': () => {
            console.error('reCAPTCHA expired');
            setError('reCAPTCHA expired. Please try again.');
            if (window.recaptchaVerifier) {
              try {
                if (typeof window.recaptchaVerifier.clear === 'function') {
                  window.recaptchaVerifier.clear();
                }
              } catch (e) {
                console.warn('Error clearing expired reCAPTCHA:', e.message);
              } finally {
                window.recaptchaVerifier = null;
              }
            }
          }
        });

        // Render reCAPTCHA (this initializes it)
        // Ensure container exists in DOM
        const container = document.getElementById('recaptcha-container');
        if (!container) {
          throw new Error('reCAPTCHA container not found. Please refresh the page.');
        }

        try {
          // Add timeout for reCAPTCHA rendering (30 seconds)
          const renderPromise = window.recaptchaVerifier.render();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('reCAPTCHA initialization timed out. Please try again.')), 30000)
          );
          
          await Promise.race([renderPromise, timeoutPromise]);
          console.log('reCAPTCHA rendered successfully');
        } catch (renderError) {
          console.error('reCAPTCHA render error:', renderError);
          // Clean up on render failure
          if (window.recaptchaVerifier) {
            try {
              if (typeof window.recaptchaVerifier.clear === 'function') {
                window.recaptchaVerifier.clear();
              }
            } catch (e) {
              // Ignore cleanup errors
            }
            window.recaptchaVerifier = null;
          }
          
          // Provide helpful error message
          if (renderError.message && renderError.message.includes('timeout')) {
            throw new Error('reCAPTCHA took too long to load. Please refresh the page and try again, or use a test phone number.');
          }
          throw new Error('Failed to initialize reCAPTCHA. Please refresh the page and try again.');
        }
      }

      // Send OTP with timeout
      // On localhost with emulator, use MockRecaptchaVerifier (reCAPTCHA not needed)
      const appVerifier = usingEmulator ? new MockRecaptchaVerifier() : window.recaptchaVerifier;
      const signInPromise = signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      const signInTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out. Please try again.')), 60000)
      );
      
      const confirmation = await Promise.race([signInPromise, signInTimeoutPromise]);
      setConfirmationResult(confirmation);
      setStep('code');
      setLoading(false);
    } catch (err) {
      console.error('Firebase Auth Error:', err.code, err.message);
      console.error('Full error details:', err);
      console.error('Firebase Config:', {
        apiKey: firebaseConfig.apiKey?.substring(0, 10) + '...',
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId
      });
      
      // Provide helpful error messages
      let errorMessage = 'Failed to send verification code. Please try again.';
      if (err.code === 'auth/billing-not-enabled') {
        errorMessage = 'Phone authentication requires a paid Firebase plan. Please enable billing in Firebase Console.';
      } else if (err.code === 'auth/invalid-app-credential') {
        errorMessage = 'Invalid Firebase configuration. Please verify your Firebase project settings match the app configuration.';
      } else if (err.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format. Please enter a valid 10-digit US phone number.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many verification attempts. Please wait 1-2 hours before trying again, or use a test phone number in Firebase Console for development.';
      } else if (err.message && err.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please refresh the page and try again, or use a test phone number for faster testing.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setLoading(false);
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!confirmationResult) {
        throw new Error('Verification session expired. Please start over.');
      }

      // Verify code
      const result = await confirmationResult.confirm(code);
      const user = result.user;
      
      // Get phone number from user
      const phoneNumber = user.phoneNumber;
      
      // Cleanup recaptcha safely
      if (window.recaptchaVerifier) {
        try {
          if (window.recaptchaVerifier && typeof window.recaptchaVerifier.clear === 'function') {
            window.recaptchaVerifier.clear();
          }
        } catch (e) {
          console.warn('Error clearing reCAPTCHA:', e.message);
        } finally {
          window.recaptchaVerifier = null;
        }
      }

      // Call success callback with user and phone
      onAuthSuccess(user, phoneNumber);
    } catch (err) {
      console.error('Verification Error:', err.code, err.message);
      console.error('Full error details:', err);
      
      let errorMessage = 'Invalid verification code. Please try again.';
      if (err.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid verification code. Please check and try again.';
      } else if (err.code === 'auth/code-expired') {
        errorMessage = 'Verification code expired. Please request a new code.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  return (
    <div className="phone-auth-container">
      <div className="phone-auth-card">
        <h2>Welcome to ePSA</h2>
        <p className="auth-subtitle">Enter your phone number to get started</p>

        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(555) 123-4567"
                required
                maxLength="14"
                className="phone-input"
              />
              <small>We'll send you a verification code via SMS</small>
            </div>

            {/* reCAPTCHA container - must stay in DOM */}
            <div id="recaptcha-container" style={{ minHeight: '1px' }}></div>

            {error && <div className="error-message">{error}</div>}

            <button 
              type="submit" 
              className="btn btn-primary btn-block"
              disabled={loading || phone.replace(/\D/g, '').length !== 10}
            >
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="code">Verification Code</label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                required
                maxLength="6"
                className="code-input"
              />
              <small>Enter the 6-digit code sent to {phone}</small>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="auth-actions">
              <button 
                type="submit" 
                className="btn btn-primary btn-block"
                disabled={loading || code.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setCode('');
                  setError('');
                  if (window.recaptchaVerifier) {
                    window.recaptchaVerifier.clear();
                    window.recaptchaVerifier = null;
                  }
                }}
                className="btn btn-link"
              >
                Change Phone Number
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PhoneAuth;
