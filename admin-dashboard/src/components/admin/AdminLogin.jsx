/**
 * Admin Login — 6-digit email OTP flow
 * Step 1: enter email  →  Step 2: enter 6-digit code  →  signed in
 */

import React, { useState, useRef } from 'react';
import { Mail, Lock, AlertCircle, CheckCircle, ArrowRight, Loader2, KeyRound } from 'lucide-react';
import { adminAuthService } from '../../services/adminAuthService';
import './AdminLogin.css';

const AdminLogin = ({ onLoginSuccess }) => {
  const [email, setEmail]       = useState('');
  const [code, setCode]         = useState('');
  const [step, setStep]         = useState('email'); // 'email' | 'code'
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage]   = useState({ type: '', text: '' });
  const codeInputRef = useRef(null);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email) { setMessage({ type: 'error', text: 'Please enter your email address' }); return; }

    setIsLoading(true);
    setMessage({ type: '', text: '' });
    const result = await adminAuthService.sendAdminOTP(email);
    setIsLoading(false);

    if (result.success) {
      setStep('code');
      setMessage({ type: 'success', text: `A 6-digit code was sent to ${email}. It expires in 10 minutes.` });
      setTimeout(() => codeInputRef.current?.focus(), 100);
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!code || code.length < 6) { setMessage({ type: 'error', text: 'Enter the 6-digit code from your email' }); return; }

    setIsLoading(true);
    setMessage({ type: 'info', text: 'Verifying code...' });
    const result = await adminAuthService.verifyAdminOTP(email, code);
    setIsLoading(false);

    if (result.success) {
      setMessage({ type: 'success', text: 'Login successful!' });
      setTimeout(() => onLoginSuccess({ email }), 800);
    } else {
      setMessage({ type: 'error', text: result.message });
      if (result.message.includes('expired') || result.message.includes('new code')) {
        setStep('email');
        setCode('');
      }
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    setCode('');
    setMessage({ type: 'info', text: 'Sending new code...' });
    const result = await adminAuthService.sendAdminOTP(email);
    setIsLoading(false);
    if (result.success) {
      setMessage({ type: 'success', text: `New code sent to ${email}.` });
      setTimeout(() => codeInputRef.current?.focus(), 100);
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <div className="sinai-wordmark">
            <div className="sinai-logo-mark">MS</div>
            <div className="sinai-wordmark-text">
              <span className="institution">Mount Sinai</span>
              <span className="app-name">ePSA Research Portal</span>
            </div>
          </div>
          <p>IRB Study STUDY-14-00050 · Admin Access</p>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.type === 'error'   && <AlertCircle size={20} />}
            {message.type === 'success' && <CheckCircle size={20} />}
            {message.type === 'info'    && <AlertCircle size={20} />}
            <span>{message.text}</span>
          </div>
        )}

        {step === 'email' && (
          <div className="admin-login-form">
            <div className="login-header">
              <div className="admin-icon"><Lock size={32} /></div>
              <h1>Admin Login</h1>
              <p>Enter your admin email to receive a one-time login code</p>
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
                    autoFocus
                  />
                </div>
              </div>
              <button type="submit" className="login-button" disabled={isLoading || !email}>
                {isLoading ? <><Loader2 size={20} className="animate-spin" /> Sending Code...</> : <>Send Code <ArrowRight size={20} /></>}
              </button>
            </form>
          </div>
        )}

        {step === 'code' && (
          <div className="admin-login-form">
            <div className="login-header">
              <div className="admin-icon success"><KeyRound size={32} /></div>
              <h1>Enter Your Code</h1>
              <p>Check <strong>{email}</strong> for a 6-digit code</p>
            </div>
            <form onSubmit={handleVerifyOTP} className="login-form">
              <div className="form-group">
                <label htmlFor="code">6-Digit Code</label>
                <div className="input-wrapper">
                  <KeyRound size={20} className="input-icon" />
                  <input
                    type="text"
                    id="code"
                    ref={codeInputRef}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    disabled={isLoading}
                    style={{ letterSpacing: '0.3em', fontSize: '1.4rem', textAlign: 'center' }}
                  />
                </div>
              </div>
              <button type="submit" className="login-button" disabled={isLoading || code.length < 6}>
                {isLoading ? <><Loader2 size={20} className="animate-spin" /> Verifying...</> : <>Verify Code <ArrowRight size={20} /></>}
              </button>
            </form>
            <div className="email-actions">
              <button onClick={handleResend} className="resend-button" disabled={isLoading}>
                {isLoading ? <><Loader2 size={16} className="animate-spin" /> Resending...</> : 'Resend Code'}
              </button>
              <button onClick={() => { setStep('email'); setCode(''); setMessage({ type: '', text: '' }); }} className="back-button">
                Use Different Email
              </button>
            </div>
          </div>
        )}

        <div className="admin-login-footer">
          <p>Need access? Contact your system administrator.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
