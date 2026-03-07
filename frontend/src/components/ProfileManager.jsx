import React, { useState, useEffect } from 'react';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserIcon, UnlinkIcon, XIcon, AlertTriangleIcon } from 'lucide-react';
import './ProfileManager.css';

const ProfileManager = ({ userDocId, sessionId, onProfileUpdate, onSessionUnlink }) => {
  const [userData, setUserData] = useState(null);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (userDocId) {
      loadUserData();
    }
  }, [userDocId]);

  const loadUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userDocId));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  };

  const handleUnlinkSession = async () => {
    setLoading(true);
    setError('');

    try {
      await deleteDoc(doc(db, 'users', userDocId));

      setSuccess('Session deleted successfully.');

      if (onSessionUnlink) {
        onSessionUnlink();
      }

      setTimeout(() => {
        setShowUnlinkConfirm(false);
      }, 1500);
    } catch (err) {
      console.error('Error deleting session:', err);
      setError('Failed to delete session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCreatedAt = (createdAt) => {
    if (!createdAt) return 'Not available';
    if (typeof createdAt?.toDate === 'function') {
      return createdAt.toDate().toLocaleDateString();
    }
    const parsed = new Date(createdAt);
    if (Number.isNaN(parsed.getTime())) return 'Not available';
    return parsed.toLocaleDateString();
  };

  if (!userData) {
    return <div className="profile-loading">Loading...</div>;
  }

  return (
    <div className="profile-manager">
      <div className="profile-header">
        <div className="profile-info">
          <div className="session-display">
            <UserIcon size={16} />
            <span className="session-id">Session key: {sessionId}</span>
          </div>
        </div>
        <div className="profile-actions">
          {!showUnlinkConfirm && (
            <button className="unlink-session-btn" onClick={() => setShowUnlinkConfirm(true)}>
              <UnlinkIcon size={14} />
              Delete session
            </button>
          )}
        </div>
      </div>

      <div className="profile-content">
        {showUnlinkConfirm ? (
          <div className="unlink-confirm">
            <div className="unlink-warning">
              <AlertTriangleIcon size={24} />
              <h3>Delete session</h3>
              <p>
                This will permanently delete session &quot;{sessionId}&quot; and all associated data.
                This action cannot be undone.
              </p>
              <div className="warning-details">
                <ul>
                  <li>All assessment data will be deleted</li>
                  <li>This session key will no longer work</li>
                  <li>You will need to create a new session to save to cloud again</li>
                </ul>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="form-actions">
              <button
                className="unlink-confirm-btn"
                onClick={handleUnlinkSession}
                disabled={loading}
              >
                <UnlinkIcon size={14} />
                {loading ? 'Deleting...' : 'Delete session'}
              </button>
              <button
                className="cancel-btn"
                onClick={() => setShowUnlinkConfirm(false)}
                disabled={loading}
              >
                <XIcon size={14} />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="profile-display">
            <div className="info-item">
              <div className="info-label">Session key</div>
              <div className="info-value session-key-value">{sessionId}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Created</div>
              <div className="info-value">
                {formatCreatedAt(userData.createdAt)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileManager;
