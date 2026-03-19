import React, { useState, useEffect } from 'react';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserIcon, UnlinkIcon, XIcon, AlertTriangleIcon } from 'lucide-react';
import './ProfileManager.css';
import { useTranslation } from 'react-i18next';

const ProfileManager = ({ userDocId, sessionId, onProfileUpdate, onSessionUnlink }) => {
  const { t } = useTranslation();
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

      setSuccess(t('profileManager.successDeleted'));

      if (onSessionUnlink) {
        onSessionUnlink();
      }

      setTimeout(() => {
        setShowUnlinkConfirm(false);
      }, 1500);
    } catch (err) {
      console.error('Error deleting session:', err);
      setError(t('profileManager.errorDeleteFailed'));
    } finally {
      setLoading(false);
    }
  };

  const formatCreatedAt = (createdAt) => {
    if (!createdAt) return t('profileManager.notAvailable');
    if (typeof createdAt?.toDate === 'function') {
      return createdAt.toDate().toLocaleDateString();
    }
    const parsed = new Date(createdAt);
    if (Number.isNaN(parsed.getTime())) return t('profileManager.notAvailable');
    return parsed.toLocaleDateString();
  };

  if (!userData) {
    return <div className="profile-loading">{t('profileManager.loading')}</div>;
  }

  return (
    <div className="profile-manager">
      <div className="profile-header">
        <div className="profile-info">
          <div className="session-display">
            <UserIcon size={16} />
            <span className="session-id">{t('profileManager.sessionKeyLabel')}: {sessionId}</span>
          </div>
        </div>
        <div className="profile-actions">
          {!showUnlinkConfirm && (
            <button className="unlink-session-btn" onClick={() => setShowUnlinkConfirm(true)}>
              <UnlinkIcon size={14} />
              {t('profileManager.deleteSession')}
            </button>
          )}
        </div>
      </div>

      <div className="profile-content">
        {showUnlinkConfirm ? (
          <div className="unlink-confirm">
            <div className="unlink-warning">
              <AlertTriangleIcon size={24} />
              <h3>{t('profileManager.deleteSession')}</h3>
              <p>
                {t('profileManager.deleteWarning', { sessionId })}
              </p>
              <div className="warning-details">
                <ul>
                  <li>{t('profileManager.warningItem1')}</li>
                  <li>{t('profileManager.warningItem2')}</li>
                  <li>{t('profileManager.warningItem3')}</li>
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
                {loading ? t('profileManager.deleting') : t('profileManager.deleteSession')}
              </button>
              <button
                className="cancel-btn"
                onClick={() => setShowUnlinkConfirm(false)}
                disabled={loading}
              >
                <XIcon size={14} />
                {t('profileManager.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className="profile-display">
            <div className="info-item">
              <div className="info-label">{t('profileManager.sessionKeyTitle')}</div>
              <div className="info-value session-key-value">{sessionId}</div>
            </div>
            <div className="info-item">
              <div className="info-label">{t('profileManager.created')}</div>
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
