import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useTranslation } from 'react-i18next';
import './AnonymousAuth.css';

const AnonymousAuth = ({ onAuthSuccess }) => {
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    generateSessionId();
  }, []);

  const generateSessionId = () => {
    // Generate a random 8-character session ID
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 8; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSessionId(id);
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Create anonymous user document in Firestore
      const userDoc = {
        uid: sessionId,
        sessionId: sessionId,
        authMethod: 'anonymous',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        isAnonymous: true
      };

      await setDoc(doc(db, 'users', sessionId), userDoc);

      // Create a mock user object for compatibility
      const mockUser = {
        uid: sessionId,
        isAnonymous: true,
        sessionId: sessionId
      };

      setCreated(true);
      onAuthSuccess(mockUser);
    } catch (err) {
      console.error('Anonymous session creation error:', err);
      setError(`${err.message || 'Failed to create session.'}${err.code ? ` (${err.code})` : ''}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateId = () => {
    generateSessionId();
    setCreated(false);
    setError('');
  };

  return (
    <div className="anonymous-auth-container">
      <div className="anonymous-auth-card">
        {/* Header */}
        <div className="auth-header">
          <h1 className="auth-title">{t('anonymousAuth.header.title')}</h1>
          <p className="auth-subtitle">{t('anonymousAuth.header.subtitle')}</p>
        </div>

        {!created ? (
          <>
            <div className="auth-instruction">
              <p>{t('anonymousAuth.instruction.title')}</p>
              <p className="instruction-subtitle">
                {t('anonymousAuth.instruction.subtitle')}
              </p>
            </div>

            <div className="session-id-display">
              <div className="session-id-label">{t('anonymousAuth.sessionIdLabel')}</div>
              <div className="session-id-value">{sessionId}</div>
              <button 
                type="button" 
                onClick={handleRegenerateId}
                className="regenerate-btn"
                disabled={loading}
              >
                {'🔄'} {t('anonymousAuth.regenerate')}
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="auth-form">
              {error && <div className="auth-error">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="auth-submit-btn"
              >
                {loading ? t('anonymousAuth.creatingSession') : t('anonymousAuth.startAssessment')}
              </button>
            </form>

            <div className="auth-info">
              <p>
                <strong>{t('anonymousAuth.saveSessionIdStrong')}</strong> {t('anonymousAuth.saveSessionIdRest')}
              </p>
            </div>
          </>
        ) : (
          <div className="session-created">
            <div className="success-icon">✅</div>
            <h3>{t('anonymousAuth.sessionCreatedTitle')}</h3>
            <div className="session-confirmation">
              <div className="session-id-label">{t('anonymousAuth.sessionIdLabel')}</div>
              <div className="session-id-value large">{sessionId}</div>
            </div>
            <p className="session-warning">
              <strong>{t('anonymousAuth.importantStrong')}</strong> {t('anonymousAuth.sessionWarningRest')}
            </p>
          </div>
        )}

        <div className="auth-footer">
          <div className="footer-options">
            <p>{t('anonymousAuth.otherWaysTitle')}</p>
            <div className="auth-alternatives">
              <span>📱 {t('anonymousAuth.phoneNumber')}</span>
              <span>📧 {t('anonymousAuth.email')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnonymousAuth;
