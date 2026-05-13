/**
 * Admin Login Component with Email OTP
 * Secure authentication for admin dashboard
 */

import React, { useState, useEffect } from 'react';
import { Mail, Lock, AlertCircle, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { adminAuthService } from '../../services/adminAuthService';
import { adminAuth } from '../../config/adminFirebase';
import { isSignInWithEmailLink } from 'firebase/auth';
import './AdminLogin.css';

const AdminLogin = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState('email'); // 'email' | 'sent' | 'confirm' | 'checking'
  const [message, setMessage] = useState({ type: '', text: '' });
  const [sentEmail, setSentEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');

  useEffect(() => {
    // If the URL is a Firebase email sign-in link, show a confirmation step.
    // We do NOT auto-invoke sign-in here: link-scanning email security tools
    // (Outlook Safe Links, Mimecast, etc.) pre-fetch URLs and would consume
    // the single-use oobCode before the real user clicks.
    if (isSignInWithEmailLink(adminAuth, window.location.href)) {
      const storedEmail = window.localStorage.getItem('adminEmailForSignIn') || '';
      setConfirmEmail(storedEmail);
      setStep('confirm');
    }
  }, []);

  const handleConfirmSignIn = async (e) => {
    e.preventDefault();
    if (!confirmEmail) {
      setMessage({ type: 'error', text: 'Please enter the email this link was sent to' });
      return;
    }

    setIsLoading(true);
    setMessage({ type: 'info', text: 'Verifying your login link...' });

    // Ensure the service uses the email entered here so the email check matches.
    window.localStorage.setItem('adminEmailForSignIn', confirmEmail);
    const result = await adminAuthService.completeAdminSignIn(window.location.href);

    if (result && result.success) {
      setMessage({ type: 'success', text: result.message });
      // Strip oobCode from URL so a refresh doesn't re-trigger the flow.
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => onLoginSuccess(result.user), 1000);
    } else {
      const text = result?.message || 'Could not verify login link.';
      if (text.includes('invalid-action-code') || text.toLowerCase().includes('expired')) {
        setMessage({ type: 'error', text: '⏰ This login link is no longer valid. Request a new one below.' });
      } else {
        setMessage({ type: 'error', text });
      }
      setStep('email');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    setIsLoading(false);
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email) { 
      setMessage({ type: 'error', text: 'Please enter your email address' }); 
      return; 
    }
    
    setIsLoading(true);
    const result = await adminAuthService.sendAdminOTP(email);
    
    if (result.success) { 
      setSentEmail(email);
      setStep('sent');
      setMessage({ type: 'success', text: '✅ Admin login link sent! Open the email in this same browser and click the link within 24 hours. Don\'t hover or preview the link first — that can invalidate it.' });
    } else { 
      if (result.message.includes('invalid-action-code') || result.message.includes('expired')) {
        setMessage({ type: 'error', text: '⏰ Login link expired. Please request a new one below.' });
        setStep('email');
      } else {
        setMessage({ type: 'error', text: result.message }); 
      }
    }
    setIsLoading(false);
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    setMessage({ type: 'info', text: 'Resending login link...' });

    const result = await adminAuthService.sendAdminOTP(sentEmail);

    if (result.success) {
      setMessage({ type: 'success', text: result.message });
    } else {
      setMessage({ type: 'error', text: result.message });
    }

    setIsLoading(false);
  };

  const renderEmailStep = () => (
    <div className="admin-login-form">
      <div className="login-header">
        <div className="admin-icon">
          <Lock size={32} />
        </div>
        <h1>Admin Login</h1>
        <p>Enter your admin email to receive a secure login link</p>
      </div>

      <form onSubmit={handleSendOTP} className="login-form">
        <div className="form-group">
          <label htmlFor="email">Admin Email</label>
          <div className="input-wrapper">
            <Mail size={20} className="input-icon" />
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@urology-ai.com"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <button 
          type="submit" 
          className="login-button"
          disabled={isLoading || !email}
        >
          {isLoading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Sending Link...
            </>
          ) : (
            <>
              Send Login Link
              <ArrowRight size={20} />
            </>
          )}
        </button>
      </form>

      <div className="login-info">
        <AlertCircle size={16} />
        <p>
          A secure login link will be sent to your email. 
          Click the link to access the admin dashboard.
        </p>
      </div>
    </div>
  );

  const renderSentStep = () => (
    <div className="admin-login-form">
      <div className="login-header">
        <div className="admin-icon success">
          <Mail size={32} />
        </div>
        <h1>Check Your Email</h1>
        <p>We've sent a secure login link to</p>
        <p className="email-display">{sentEmail}</p>
      </div>

      <div className="success-message">
        <CheckCircle size={24} />
        <div>
          <h3>Login Link Sent!</h3>
          <p>Open your email and click the link to access the admin dashboard.</p>
        </div>
      </div>

      <div className="email-actions">
        <button 
          onClick={handleResendOTP}
          className="resend-button"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Resending...
            </>
          ) : (
            'Resend Link'
          )}
        </button>
        
        <button 
          onClick={() => {
            setStep('email');
            setMessage({ type: '', text: '' });
          }}
          className="back-button"
        >
          Use Different Email
        </button>
      </div>

      <div className="login-info">
        <AlertCircle size={16} />
        <p>
          <strong>Didn't receive the email?</strong> Check your spam folder 
          or click "Resend Link" to try again.
        </p>
      </div>
    </div>
  );

  const renderConfirmStep = () => (
    <div className="admin-login-form">
      <div className="login-header">
        <div className="admin-icon">
          <Lock size={32} />
        </div>
        <h1>Confirm Sign-In</h1>
        <p>Confirm the email this login link was sent to.</p>
      </div>

      <form onSubmit={handleConfirmSignIn} className="login-form">
        <div className="form-group">
          <label htmlFor="confirm-email">Admin Email</label>
          <div className="input-wrapper">
            <Mail size={20} className="input-icon" />
            <input
              type="email"
              id="confirm-email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder="admin@urology-ai.com"
              required
              disabled={isLoading}
              autoFocus
            />
          </div>
        </div>

        <button
          type="submit"
          className="login-button"
          disabled={isLoading || !confirmEmail}
        >
          {isLoading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              Complete Sign-In
              <ArrowRight size={20} />
            </>
          )}
        </button>
      </form>

      <div className="login-info">
        <AlertCircle size={16} />
        <p>
          For security, the email must match the one this link was sent to.
          Login links expire 24 hours after they're issued and can only be used once.
        </p>
      </div>
    </div>
  );

  const renderCheckingStep = () => (
    <div className="admin-login-form">
      <div className="login-header">
        <div className="admin-icon checking">
          <Loader2 size={32} className="animate-spin" />
        </div>
        <h1>Verifying Login</h1>
        <p>{message.text}</p>
      </div>
    </div>
  );

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <h2>ePSA Admin Dashboard</h2>
          <p>Secure Admin Access</p>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.type === 'error' && <AlertCircle size={20} />}
            {message.type === 'success' && <CheckCircle size={20} />}
            {message.type === 'info' && <AlertCircle size={20} />}
            <span>{message.text}</span>
          </div>
        )}

        {step === 'email' && renderEmailStep()}
        {step === 'sent' && renderSentStep()}
        {step === 'confirm' && renderConfirmStep()}
        {step === 'checking' && renderCheckingStep()}

        <div className="admin-login-footer">
          <p>
            Need access? Contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
