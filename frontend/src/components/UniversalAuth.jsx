import React, { useState, useEffect } from 'react';
import {
  signInAnonymously,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import './UniversalAuth.css';

// Check if using Auth Emulator
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const usingEmulator = isLocalhost && import.meta.env.VITE_USE_AUTH_EMULATOR === 'true';

// Unused: kept for possible future emulator
const MockRecaptchaVerifier = () => {};

const UniversalAuth = ({ onAuthSuccess, initialEmail = null }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {}, []);

  const formatPhoneNumber = (value) => value;


  const generateSessionId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let sessionId = '';
    for (let i = 0; i < 8; i++) {
      sessionId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
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

  const handleSubmit = (e) => {
    e.preventDefault();
    handleAnonymousAuth();
  };

  return (
    <div className="universal-auth-container">
      <div className="universal-auth-card">
        <div className="auth-instruction">
          <p>Create an anonymous session to save to cloud</p>
          <p className="instruction-subtitle">
            You will get a session key. Save it to load your data later. No email or phone collected.
          </p>
        </div>

        <div className="anonymous-session-info">
          <div className="session-preview">
            <div className="session-label">You&apos;ll get a session key like:</div>
            <div className="session-example">A1B2C3D4</div>
          </div>
          <p className="session-note">
            Save this key to load your assessment from cloud later.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" disabled={loading} className="auth-submit-btn">
            {loading ? 'Creating...' : 'Create session'}
          </button>
        </form>

        <div className="auth-info">
          <p>Your data is stored under this key only. No personal information is collected.</p>
        </div>

        <div id="recaptcha-container" aria-hidden="true" />
      </div>
    </div>
  );
};

export default UniversalAuth;
