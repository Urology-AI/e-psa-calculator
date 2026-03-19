import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailLink,
  sendSignInLinkToEmail,
  isSignInWithEmailLink
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import './EmailLinkAuth.css';
import { useTranslation } from 'react-i18next';

const EmailLinkAuth = ({ onAuthSuccess, initialEmail = null }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState(initialEmail || '');
  const [mode, setMode] = useState('request'); // 'request' or 'confirm'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [linkSent, setLinkSent] = useState(false);

  // Check if user is arriving via email link
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      setMode('confirm');
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

  const handleSendLink = async (e) => {
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
      
      // Save email to localStorage for verification when user clicks link
      localStorage.setItem('emailForSignIn', email);
      
      setLinkSent(true);
      setMessage(t('emailLinkAuth.checkEmailMessage'));
      setMode('confirm');
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
      const user = result.user;

      // Clear localStorage
      localStorage.removeItem('emailForSignIn');

      // Check if user document exists, create if not
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          uid: user.uid,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          authMethod: 'email-link'
        });
      } else {
        // Update last login
        await setDoc(doc(db, 'users', user.uid), {
          lastLoginAt: new Date().toISOString()
        }, { merge: true });
      }

      onAuthSuccess(user);
    } catch (err) {
      console.error('Email link confirmation error:', err);
      if (err.code === 'auth/invalid-email') {
        setError('The email address is not valid.');
      } else if (err.code === 'auth/user-disabled') {
        setError('This user account has been disabled.');
      } else if (err.code === 'auth/user-not-found') {
        setError('This email is not registered. Please request a new sign-in link.');
      } else if (err.code === 'auth/invalid-action-code') {
        setError('The sign-in link is invalid or has expired. Please request a new link.');
        setMode('request');
        setLinkSent(false);
      } else {
        setError('Failed to sign in. Please try again or request a new link.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendLink = () => {
    setMode('request');
    setLinkSent(false);
    setMessage('');
    setError('');
  };

  if (mode === 'confirm' && !linkSent) {
    return (
      <div className="email-link-auth-container">
        <div className="email-link-auth-card">
          <div className="email-link-auth-header">
            <h2>{t('emailLinkAuth.signingInTitle')}</h2>
            <p className="email-link-auth-subtitle">
              {t('emailLinkAuth.verifyingLink')}
            </p>
          </div>
          {loading && (
            <div className="auth-loading">
              <div className="spinner"></div>
              <p>{t('emailLinkAuth.pleaseWait')}</p>
            </div>
          )}
          {error && <div className="auth-error">{error}</div>}
          {!loading && !error && (
            <button 
              className="auth-resend-btn" 
              onClick={handleResendLink}
            >
              {t('emailLinkAuth.requestNewLink')}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="email-link-auth-container">
      <div className="email-link-auth-card">
        <div className="email-link-auth-header">
          <h2>{linkSent ? t('emailLinkAuth.checkYourEmail') : t('emailLinkAuth.signInWithEmail')}</h2>
          <p className="email-link-auth-subtitle">
            {linkSent 
              ? t('emailLinkAuth.sentLinkTo', { email })
              : t('emailLinkAuth.enterEmailSecureLink')
            }
          </p>
        </div>

        {!linkSent ? (
          <form onSubmit={handleSendLink} className="email-link-auth-form">
            <div className="form-group">
              <label htmlFor="email">{t('emailLinkAuth.emailLabel')}</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!!initialEmail}
                placeholder={t('emailLinkAuth.emailPlaceholder')}
                className="form-input"
              />
            </div>

            {error && <div className="auth-error">{error}</div>}
            {message && <div className="auth-message">{message}</div>}

            <button
              type="submit"
              disabled={loading}
              className="auth-submit-btn"
            >
              {loading ? t('emailLinkAuth.sending') : t('emailLinkAuth.sendSignInLink')}
            </button>
          </form>
        ) : (
          <div className="link-sent-confirmation">
            <div className="success-icon">✉️</div>
            <h3>{t('emailLinkAuth.emailSent')}</h3>
            <p>
              Check your inbox for an email from ePSA. Click the sign-in link to access your assessment.
            </p>
            <p className="email-tips">
              <strong>{t('emailLinkAuth.didNotReceive')}</strong>
              <br />
              • Check your spam folder
              <br />
              • Make sure the email address is correct
              <br />
              • Links expire in 24 hours
            </p>
            <button 
              className="auth-resend-btn" 
              onClick={handleResendLink}
            >
              {t('emailLinkAuth.sendNewLink')}
            </button>
          </div>
        )}

        <div className="auth-footer">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="auth-link-btn"
          >
            {t('emailLinkAuth.goBack')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailLinkAuth;
