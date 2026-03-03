import React, { useState, useEffect } from 'react';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  signInAnonymously,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { sendSessionAccessEmail } from '../services/phiBackendService';
import './UniversalAuth.css';

// Check if using Auth Emulator (reCAPTCHA not needed)
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const usingEmulator = isLocalhost && import.meta.env.VITE_USE_AUTH_EMULATOR === 'true';

// Mock RecaptchaVerifier for Auth Emulator
class MockRecaptchaVerifier {
  constructor() {
    this.type = 'recaptcha';
    this._reset = () => Promise.resolve();
    this.clear = () => {};
    this.render = () => Promise.resolve(0);
    this.verify = () => Promise.resolve('mock-token');
  }
  async _reset() { return Promise.resolve(); }
  async verify() { return Promise.resolve('mock-token'); }
  render() { return Promise.resolve(0); }
  clear() { /* No-op */ }
}

const UniversalAuth = ({ onAuthSuccess, initialEmail = null }) => {
  const [authMethod, setAuthMethod] = useState('phone'); // 'phone', 'email', or 'anonymous'
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(initialEmail || '');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('input'); // 'input', 'verify', 'confirm'
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [linkSent, setLinkSent] = useState(false);

  const getAnonymousAuthErrorMessage = (err) => {
    if (!err) return 'Failed to create session. Please try again.';
    if (err.code === 'auth/operation-not-allowed') {
      return 'Anonymous sign-in is disabled. Enable Anonymous provider in Auth (or Auth Emulator) and retry.';
    }
    if (err.code === 'auth/admin-restricted-operation') {
      // this usually means the project is preventing client-side creation of
      // anonymous accounts (e.g. provider is turned off or the project is locked)
      return 'Anonymous sign-in is restricted in this Firebase project. "Enable Anonymous provider" in Authentication settings or use the emulator with the correct config.';
    }
    if (err.code === 'permission-denied' || err.code === 'firestore/permission-denied') {
      return 'Session created but Firestore write was denied. Check Firestore rules/emulator and retry.';
    }
    if (err.code === 'unavailable' || err.code === 'firestore/unavailable') {
      return 'Firestore is unavailable. Make sure the Firestore emulator is running.';
    }
    return `${err.message || 'Failed to create session.'}${err.code ? ` (${err.code})` : ''}`;
  };

  // Check if user is arriving via email link
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      setAuthMethod('email');
      setStep('confirm');
      // Get email from localStorage or URL
      let storedEmail = localStorage.getItem('emailForSignIn');
      if (!storedEmail) {
        storedEmail = window.prompt('Please provide your email for confirmation:');
      }
      if (storedEmail) {
        setEmail(storedEmail);
        handleEmailLinkConfirmation(storedEmail);
      }
    }
  }, []);

  const formatPhoneNumber = (value) => {
    const digits = value.replace(/\D/g, '');
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


  const generateSessionId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let sessionId = '';
    for (let i = 0; i < 8; i++) {
      sessionId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return sessionId;
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const digits = phone.replace(/\D/g, '');
      const phoneNumber = `+1${digits}`;

      if (digits.length !== 10) {
        throw new Error('Please enter a valid 10-digit phone number');
      }

      // Initialize reCAPTCHA
      if (!usingEmulator) {
        if (window.recaptchaVerifier) {
          try {
            if (typeof window.recaptchaVerifier.clear === 'function') {
              window.recaptchaVerifier.clear();
            }
          } catch (e) { /* Ignore cleanup errors */ }
        }
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: (response) => console.log('reCAPTCHA solved')
        });
      } else {
        window.recaptchaVerifier = new MockRecaptchaVerifier();
      }

      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      setStep('verify');
    } catch (err) {
      console.error('Phone auth error:', err);
      if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please try again later.');
      } else if (err.code === 'auth/admin-restricted-operation') {
        setError('Phone sign-in is restricted in this Firebase project. Enable Phone provider and add this domain in Authentication settings.');
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
      const sessionId = await saveUserToFirestore(result.user, 'phone', {
        phone: result.user?.phoneNumber || null,
        email: result.user?.email || null
      });

      // If we have an email address at signup time, send a session access email.
      const emailForAccess = result.user?.email || null;
      if (emailForAccess) {
        sendSessionAccessEmail({
          email: emailForAccess,
          sessionId,
          context: 'signup-phone-with-email'
        });
      }

      onAuthSuccess(result.user, {
        method: 'phone',
        phone: result.user?.phoneNumber || null,
        email: result.user?.email || null,
        sessionId
      });
    } catch (err) {
      console.error('Code verification error:', err);
      if (err.code === 'auth/invalid-verification-code') {
        setError('Invalid verification code. Please try again.');
      } else if (err.code === 'auth/code-expired') {
        setError('Verification code expired. Please request a new code.');
        setStep('input');
        setCode('');
      } else {
        setError('Failed to verify code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setMessage('');

    try {
      const actionCodeSettings = {
        url: `${window.location.origin}?email=${email}`,
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      localStorage.setItem('emailForSignIn', email);
      
      setLinkSent(true);
      setMessage('Check your email for a sign-in link!');
      setStep('verify');
    } catch (err) {
      console.error('Send link error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please check your email for the sign-in link.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address');
      } else {
        setError('Failed to send sign-in link. Please try again');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLinkConfirmation = async (emailToConfirm) => {
    setLoading(true);
    setError('');

    try {
      const result = await signInWithEmailLink(auth, emailToConfirm, window.location.href);
      localStorage.removeItem('emailForSignIn');

      const confirmedEmail = result.user?.email || emailToConfirm || null;
      const sessionId = await saveUserToFirestore(result.user, 'email-link', {
        email: confirmedEmail,
        phone: result.user?.phoneNumber || null
      });

      // Send access email with consent language after successful email-link signin.
      if (confirmedEmail) {
        sendSessionAccessEmail({
          email: confirmedEmail,
          sessionId,
          context: 'signup-email-link'
        });
      }

      onAuthSuccess(result.user, {
        method: 'email',
        email: confirmedEmail,
        phone: result.user?.phoneNumber || null,
        sessionId
      });
    } catch (err) {
      console.error('Email link confirmation error:', err);
      if (err.code === 'auth/invalid-action-code') {
        setError('The sign-in link is invalid or has expired. Please request a new link.');
        setStep('input');
        setLinkSent(false);
      } else {
        setError('Failed to sign in. Please try again or request a new link.');
      }
    } finally {
      setLoading(false);
    }
  };

  const saveUserToFirestore = async (user, authMethod, overrides = {}) => {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    const existing = userDoc.exists() ? userDoc.data() : null;
    const sessionId = existing?.sessionId || generateSessionId();

    await setDoc(userRef, {
      uid: user.uid,
      sessionId,
      authMethod,
      isAnonymous: user.isAnonymous === true,
      email: overrides.email ?? user.email ?? existing?.email ?? null,
      phone: overrides.phone ?? user.phoneNumber ?? existing?.phone ?? null,
      lastLoginAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
      createdAt: existing?.createdAt || serverTimestamp()
    }, { merge: true });

    return sessionId;
  };

  const handleAnonymousAuth = async () => {
    setLoading(true);
    setError('');

    try {
      const sessionId = generateSessionId();

      const authResult = await signInAnonymously(auth);
      const firebaseUser = authResult.user;
      console.log('[AnonymousAuth] Firebase anonymous user created', {
        uid: firebaseUser?.uid,
        isAnonymous: firebaseUser?.isAnonymous
      });
      await firebaseUser.getIdToken();
      console.log('[AnonymousAuth] ID token ready, writing session document', {
        uid: firebaseUser?.uid,
        sessionId
      });

      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          uid: firebaseUser.uid,
          sessionId,
          authMethod: 'anonymous',
          isAnonymous: true,
          email: null,
          phone: null,
          lastLoginAt: new Date().toISOString(),
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        }, { merge: true });
        console.log('[AnonymousAuth] Session document write success', {
          uid: firebaseUser?.uid,
          sessionId
        });
      } catch (writeErr) {
        // If Firestore rules block direct user writes, continue with anonymous auth
        // so the calculator can still be used; backend can manage user docs separately.
        console.warn('[AnonymousAuth] user document write failed, continuing anyway', {
          code: writeErr?.code,
          message: writeErr?.message
        });
      }

      onAuthSuccess(firebaseUser, { method: 'anonymous', sessionId });
      console.log('[AnonymousAuth] onAuthSuccess dispatched', {
        uid: firebaseUser?.uid,
        sessionId
      });
    } catch (err) {
      console.error('[AnonymousAuth] failure', {
        code: err?.code,
        message: err?.message,
        stack: err?.stack
      });
      setError(getAnonymousAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneAuth = async () => {
    // First create session, then link phone
    await handleAnonymousAuth();
    // Phone will be added after session is created
  };

  const handleEmailAuth = async () => {
    // First create session, then link email  
    await handleAnonymousAuth();
    // Email will be added after session is created
  };

  const handleBack = () => {
    setStep('input');
    setCode('');
    setError('');
    setMessage('');
  };

  const handleResendLink = () => {
    setStep('input');
    setLinkSent(false);
    setMessage('');
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[AuthForm] submit', { authMethod });

    if (authMethod === 'phone') {
      handlePhoneSubmit(e);
    } else if (authMethod === 'email') {
      handleEmailSubmit(e);
    } else if (authMethod === 'anonymous') {
      handleAnonymousAuth();
    }
  };

  const toggleAuthMethod = () => {
    setAuthMethod(authMethod === 'phone' ? 'email' : 'phone');
    setStep('input');
    setError('');
    setMessage('');
    setCode('');
    setLinkSent(false);
  };

  if (step === 'confirm' && !linkSent) {
    return (
      <div className="universal-auth-container">
        <div className="universal-auth-card">
          {loading && (
            <div className="auth-loading">
              <div className="spinner"></div>
              <p>Signing you in...</p>
            </div>
          )}
          {error && <div className="auth-error">{error}</div>}
          {!loading && !error && (
            <button className="auth-back-btn" onClick={handleBack}>
              Back
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="universal-auth-container">
      <div className="universal-auth-card">
        {/* Auth Method Toggle */}
        {step === 'input' && (
          <div className="auth-method-toggle">
            <button
              type="button"
              className={`auth-method-btn ${authMethod === 'phone' ? 'active' : ''}`}
              onClick={() => setAuthMethod('phone')}
            >
              Phone
            </button>
            <button
              type="button"
              className={`auth-method-btn ${authMethod === 'email' ? 'active' : ''}`}
              onClick={() => setAuthMethod('email')}
            >
              Email
            </button>
            <button
              type="button"
              className={`auth-method-btn ${authMethod === 'anonymous' ? 'active' : ''}`}
              onClick={() => setAuthMethod('anonymous')}
            >
              Anonymous
            </button>
          </div>
        )}

        {/* Input Step */}
        {step === 'input' && (
          <>
            <div className="auth-instruction">
              <p>
                {authMethod === 'phone' 
                  ? 'Enter your phone number to get started'
                  : authMethod === 'email'
                  ? 'Enter your email to get started'
                  : 'Create an anonymous session to get started'
                }
              </p>
              {authMethod === 'anonymous' && (
                <p className="instruction-subtitle">
                  Your session will be tracked with a unique ID. No personal information required.
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {authMethod === 'phone' ? (
                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                    placeholder="(555) 123-4567"
                    className="auth-input"
                    maxLength={14}
                    required
                  />
                </div>
              ) : authMethod === 'email' ? (
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="auth-input"
                    disabled={!!initialEmail}
                    required
                  />
                </div>
              ) : (
                <div className="anonymous-session-info">
                  <div className="session-preview">
                    <div className="session-label">You'll get a Session ID like:</div>
                    <div className="session-example">A1B2C3D4</div>
                  </div>
                  <p className="session-note">
                    Save this ID to access your results later. No personal information required.
                  </p>
                </div>
              )}

              {error && <div className="auth-error">{error}</div>}

              <button
                type="submit"
                disabled={loading || (authMethod === 'phone' ? phone.replace(/\D/g, '').length !== 10 : authMethod === 'email' ? !email : false)}
                className="auth-submit-btn"
              >
                {loading 
                  ? 'Creating...' 
                  : authMethod === 'phone' 
                  ? 'Send Verification Code' 
                  : authMethod === 'email'
                  ? 'Send Sign-In Link'
                  : 'Create Anonymous Session'
                }
              </button>
            </form>

            <div className="auth-info">
              <p>
                {authMethod === 'phone' 
                  ? "We'll send you a verification code via SMS"
                  : authMethod === 'email'
                  ? "We'll send you a secure sign-in link via email"
                  : "Your session will be tracked with a unique ID. Save it to access results later."
                }
              </p>
            </div>
          </>
        )}

        {/* Phone Verification Step */}
        {step === 'verify' && authMethod === 'phone' && (
          <>
            <div className="auth-instruction">
              <p>Enter the verification code sent to:</p>
              <p className="contact-display">{phone}</p>
            </div>

            <form onSubmit={handleCodeSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="code">Verification Code</label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit code"
                  className="auth-input"
                  maxLength={6}
                  required
                />
              </div>

              {error && <div className="auth-error">{error}</div>}

              <div className="auth-buttons">
                <button type="button" onClick={handleBack} className="auth-back-btn">
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="auth-submit-btn"
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </button>
              </div>
            </form>

            <div className="auth-info">
              <p>Didn't receive the code? Check your messages or try again.</p>
            </div>
          </>
        )}

        {/* Email Link Sent Step */}
        {step === 'verify' && authMethod === 'email' && (
          <div className="link-sent-confirmation">
            <div className="success-icon">✉️</div>
            <h3>Email Sent!</h3>
            <p>
              Check your inbox for an email from ePSA. Click the sign-in link to access your assessment.
            </p>
            <p className="contact-display">{email}</p>
            <p className="email-tips">
              <strong>Didn't receive it?</strong>
              <br />
              • Check your spam folder
              <br />
              • Make sure the email address is correct
              <br />
              • Links expire in 24 hours
            </p>
            <button className="auth-back-btn" onClick={handleResendLink}>
              Send New Link
            </button>
          </div>
        )}

        {/* reCAPTCHA container */}
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
};

export default UniversalAuth;
