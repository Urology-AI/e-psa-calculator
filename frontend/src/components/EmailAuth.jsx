import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import './EmailAuth.css';

const EmailAuth = ({ onAuthSuccess, initialEmail = null }) => {
  const [email, setEmail] = useState(initialEmail || '');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin'); // 'signin', 'signup', 'forgot'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // If email is pre-filled from URL, only allow sign in
  useEffect(() => {
    if (initialEmail) {
      setMode('signin');
    }
  }, [initialEmail]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if user document exists, create if not
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          uid: user.uid,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          authMethod: 'email'
        });
      } else {
        // Update last login
        await setDoc(doc(db, 'users', user.uid), {
          lastLoginAt: new Date().toISOString()
        }, { merge: true });
      }

      onAuthSuccess(user);
    } catch (err) {
      console.error('Sign in error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later or reset your password');
      } else {
        setError('Failed to sign in. Please try again');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user document
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        uid: user.uid,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        authMethod: 'email'
      });

      onAuthSuccess(user);
    } catch (err) {
      console.error('Sign up error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address');
      } else {
        setError('Failed to create account. Please try again');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setMessage('');

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Check your inbox.');
    } catch (err) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address');
      } else {
        setError('Failed to send reset email. Please try again');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'signin') {
      handleSignIn(e);
    } else if (mode === 'signup') {
      handleSignUp(e);
    } else if (mode === 'forgot') {
      handlePasswordReset(e);
    }
  };

  const toggleMode = (newMode) => {
    setMode(newMode);
    setError('');
    setMessage('');
    setPassword('');
  };

  return (
    <div className="email-auth-container">
      <div className="email-auth-card">
        <div className="email-auth-header">
          <h2>{mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Reset Password'}</h2>
          <p className="email-auth-subtitle">
            {mode === 'signin' 
              ? 'Access your ePSA assessment results'
              : mode === 'signup' 
              ? 'Start your prostate health assessment'
              : 'We\'ll send you a password reset link'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="email-auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={!!initialEmail}
              placeholder="your@email.com"
              className="form-input"
            />
          </div>

          {mode !== 'forgot' && (
            <div className="form-group">
              <label htmlFor="password">
                {mode === 'signin' ? 'Password' : 'Create Password'}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder={mode === 'signin' ? 'Enter your password' : 'Create a strong password'}
                className="form-input"
                minLength="6"
              />
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-message">{message}</div>}

          <button
            type="submit"
            disabled={loading}
            className="auth-submit-btn"
          >
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Email'}
          </button>
        </form>

        <div className="auth-footer">
          {mode === 'signin' && (
            <>
              <button
                type="button"
                onClick={() => toggleMode('forgot')}
                className="auth-link-btn"
              >
                Forgot password?
              </button>
              {!initialEmail && (
                <button
                  type="button"
                  onClick={() => toggleMode('signup')}
                  className="auth-link-btn"
                >
                  Need an account? Sign up
                </button>
              )}
            </>
          )}
          {mode === 'signup' && (
            <button
              type="button"
              onClick={() => toggleMode('signin')}
              className="auth-link-btn"
            >
              Already have an account? Sign in
            </button>
          )}
          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => toggleMode('signin')}
              className="auth-link-btn"
            >
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailAuth;
