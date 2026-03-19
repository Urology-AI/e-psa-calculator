import React, { useState, useEffect } from 'react';
import {
  signInAnonymously,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import './UniversalAuth.css';
import { useTranslation } from 'react-i18next';

// Check if using Auth Emulator
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const usingEmulator = isLocalhost && import.meta.env.VITE_USE_AUTH_EMULATOR === 'true';

// Unused: kept for possible future emulator
const MockRecaptchaVerifier = () => {};

const UniversalAuth = ({ onAuthSuccess, initialEmail = null }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  const getAnonymousAuthErrorMessage = (err) => {
    if (!err) return t('auth.errors.generic');
    if (err.code === 'auth/operation-not-allowed') {
      return t('auth.errors.operationNotAllowed');
    }
    if (err.code === 'auth/admin-restricted-operation') {
      // this usually means the project is preventing client-side creation of
      // anonymous accounts (e.g. provider is turned off or the project is locked)
      return t('auth.errors.adminRestricted');
    }
    if (err.code === 'permission-denied' || err.code === 'firestore/permission-denied') {
      return t('auth.errors.permissionDenied');
    }
    if (err.code === 'unavailable' || err.code === 'firestore/unavailable') {
      return t('auth.errors.firestoreUnavailable');
    }
    return `${err.message || t('auth.errors.generic')}${err.code ? ` (${err.code})` : ''}`;
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
          <p>{t('auth.createSessionHeading')}</p>
          <p className="instruction-subtitle">{t('auth.subtitle')}</p>
        </div>

        <div className="anonymous-session-info">
          <div className="session-preview">
            <div className="session-label">{t('auth.sessionPreviewLabel')}</div>
            <div className="session-example">{t('auth.sessionExample')}</div>
          </div>
          <p className="session-note">{t('auth.sessionNote')}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" disabled={loading} className="auth-submit-btn">
            {loading ? t('auth.buttonCreating') : t('auth.buttonCreateSession')}
          </button>
        </form>

        <div className="auth-info">
          <p>{t('auth.infoLine')}</p>
        </div>

        <div id="recaptcha-container" aria-hidden="true" />
      </div>
    </div>
  );
};

export default UniversalAuth;
