import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import './AnonymousAuth.css';

const AnonymousAuth = ({ onAuthSuccess }) => {
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(false);

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
      setError('Failed to create session. Please try again.');
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
          <h1 className="auth-title">Prostate‑Specific Awareness</h1>
          <p className="auth-subtitle">A Non‑Validated Educational Risk Tool</p>
        </div>

        {!created ? (
          <>
            <div className="auth-instruction">
              <p>Create an anonymous session to get started</p>
              <p className="instruction-subtitle">
                Your session will be tracked with a unique ID. No personal information required.
              </p>
            </div>

            <div className="session-id-display">
              <div className="session-id-label">Your Session ID:</div>
              <div className="session-id-value">{sessionId}</div>
              <button 
                type="button" 
                onClick={handleRegenerateId}
                className="regenerate-btn"
                disabled={loading}
              >
                🔄 Regenerate
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="auth-form">
              {error && <div className="auth-error">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="auth-submit-btn"
              >
                {loading ? 'Creating Session...' : 'Start Assessment'}
              </button>
            </form>

            <div className="auth-info">
              <p>
                <strong>Save this Session ID:</strong> You'll need it to access your results later.
                Take a screenshot or write it down.
              </p>
            </div>
          </>
        ) : (
          <div className="session-created">
            <div className="success-icon">✅</div>
            <h3>Session Created!</h3>
            <div className="session-confirmation">
              <div className="session-id-label">Your Session ID:</div>
              <div className="session-id-value large">{sessionId}</div>
            </div>
            <p className="session-warning">
              <strong>Important:</strong> Save this Session ID to access your results later.
              Without it, you won't be able to return to your assessment.
            </p>
          </div>
        )}

        <div className="auth-footer">
          <div className="footer-options">
            <p>Other ways to sign in:</p>
            <div className="auth-alternatives">
              <span>📱 Phone Number</span>
              <span>📧 Email</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnonymousAuth;
