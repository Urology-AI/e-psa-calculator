import React, { useState } from 'react';
import { signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';
import { auth } from '../config/firebase';
import './Login.css';

const Login = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' or 'code'

  // Initialize reCAPTCHA
  React.useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response) => {
          // reCAPTCHA solved, allow signInWithPhoneNumber
        }
      });
    }
  }, []);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber}`;
      const result = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
      setConfirmationResult(result);
      setStep('code');
    } catch (error) {
      console.error('Error sending code:', error);
      setError('Failed to send verification code. Please check the phone number and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await confirmationResult.confirm(verificationCode);
      
      // Check if user has admin claims
      const idTokenResult = await result.user.getIdTokenResult();
      if (idTokenResult.claims.admin !== true) {
        setError('Access denied. You need admin privileges to access this dashboard.');
        await auth.signOut();
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      setError('Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>ePSA Admin Dashboard</h1>
          <p>HIPAA-compliant data management</p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleSendCode} className="login-form">
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 (555) 123-4567"
                required
                className="form-input"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" disabled={loading} className="login-button">
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>

            <div className="login-note">
              <p>Enter your admin phone number to receive a verification code.</p>
              <p>You must have admin privileges to access this dashboard.</p>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="login-form">
            <div className="form-group">
              <label htmlFor="code">Verification Code</label>
              <input
                type="text"
                id="code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                required
                maxLength={6}
                className="form-input"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" disabled={loading} className="login-button">
              {loading ? 'Verifying...' : 'Sign In'}
            </button>

            <button 
              type="button" 
              onClick={() => {
                setStep('phone');
                setError('');
                setVerificationCode('');
              }} 
              className="back-button"
            >
              Back
            </button>

            <div className="login-note">
              <p>Enter the 6-digit code sent to your phone.</p>
            </div>
          </form>
        )}

        <div id="recaptcha-container"></div>
      </div>

      <div className="login-footer">
        <p>© 2026 ePSA - Prostate-Specific Awareness</p>
        <p>Unauthorized access is prohibited and will be logged.</p>
      </div>
    </div>
  );
};

export default Login;
