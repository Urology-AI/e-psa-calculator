import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserIcon, MailIcon, PhoneIcon, Edit2Icon, SaveIcon, XIcon } from 'lucide-react';
import './ProfileManager.css';

const ProfileManager = ({ sessionId, onProfileUpdate }) => {
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (sessionId) {
      loadUserData();
    }
  }, [sessionId]);

  const loadUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', sessionId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData(data);
        setEditForm({
          email: data.email || '',
          phone: data.phone || ''
        });
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({
      email: userData?.email || '',
      phone: userData?.phone || ''
    });
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate email format if provided
      if (editForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
        throw new Error('Please enter a valid email address');
      }

      // Validate phone format if provided
      if (editForm.phone && !/^\+?[\d\s\-\(\)]+$/.test(editForm.phone)) {
        throw new Error('Please enter a valid phone number');
      }

      // Update Firestore document
      await updateDoc(doc(db, 'users', sessionId), {
        email: editForm.email || null,
        phone: editForm.phone || null,
        lastLoginAt: new Date().toISOString()
      });

      // Update local state
      const updatedData = {
        ...userData,
        email: editForm.email || null,
        phone: editForm.phone || null
      };
      setUserData(updatedData);

      setIsEditing(false);
      setSuccess('Profile updated successfully!');
      
      // Notify parent component
      if (onProfileUpdate) {
        onProfileUpdate(updatedData);
      }

    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    // Simple phone formatting
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  if (!userData) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  return (
    <div className="profile-manager">
      <div className="profile-header">
        <div className="profile-info">
          <div className="session-display">
            <UserIcon size={16} />
            <span className="session-id">Session: {sessionId}</span>
          </div>
        </div>
        {!isEditing && (
          <button className="edit-profile-btn" onClick={handleEdit}>
            <Edit2Icon size={14} />
            Edit Profile
          </button>
        )}
      </div>

      <div className="profile-content">
        {isEditing ? (
          <div className="profile-edit-form">
            <div className="form-group">
              <label>
                <MailIcon size={16} />
                Email Address
              </label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="your@email.com"
              />
            </div>
            
            <div className="form-group">
              <label>
                <PhoneIcon size={16} />
                Phone Number
              </label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="form-actions">
              <button 
                className="save-btn" 
                onClick={handleSave}
                disabled={loading}
              >
                <SaveIcon size={14} />
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button className="cancel-btn" onClick={handleCancel}>
                <XIcon size={14} />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="profile-display">
            <div className="info-item">
              <div className="info-label">
                <MailIcon size={16} />
                Email
              </div>
              <div className="info-value">
                {userData.email ? userData.email : <span className="not-provided">Not provided</span>}
              </div>
            </div>
            
            <div className="info-item">
              <div className="info-label">
                <PhoneIcon size={16} />
                Phone
              </div>
              <div className="info-value">
                {userData.phone ? formatPhoneNumber(userData.phone) : <span className="not-provided">Not provided</span>}
              </div>
            </div>

            <div className="info-item">
              <div className="info-label">Session Created</div>
              <div className="info-value">
                {new Date(userData.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileManager;
