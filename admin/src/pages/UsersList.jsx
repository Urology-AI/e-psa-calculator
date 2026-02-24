import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUsersWithConsent, getUserPhone } from '../services/adminService';
import { format } from 'date-fns';
import './UsersList.css';

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneInfo, setPhoneInfo] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await getUsersWithConsent(200);
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPhone = async (userId) => {
    try {
      const info = await getUserPhone(userId);
      setPhoneInfo(info);
      setShowPhoneModal(true);
    } catch (error) {
      console.error('Error fetching phone info:', error);
      alert('Error fetching phone information. Check console for details.');
    }
  };

  const filteredUsers = users.filter(user => 
    user.userId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div className="users-list">
      <div className="users-header">
        <h2>Users with Consent to Contact</h2>
        <div className="users-controls">
          <input
            type="text"
            placeholder="Search by User ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="user-count">{filteredUsers.length} users</span>
        </div>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Consent Date</th>
              <th>Last Active</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.userId}>
                <td className="user-id">
                  <Link to={`/users/${user.userId}`} className="user-link">
                    {user.userId.substring(0, 12)}...
                  </Link>
                </td>
                <td>
                  {user.consentTimestamp 
                    ? format(new Date(user.consentTimestamp), 'MMM dd, yyyy')
                    : 'N/A'
                  }
                </td>
                <td>
                  {user.lastUpdated 
                    ? format(new Date(user.lastUpdated), 'MMM dd, HH:mm')
                    : 'Never'
                  }
                </td>
                <td>
                  <span className={`status ${user.consentToContact ? 'active' : 'inactive'}`}>
                    {user.consentToContact ? 'Consented' : 'No Consent'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <Link 
                      to={`/users/${user.userId}`} 
                      className="btn btn-sm btn-primary"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => handleViewPhone(user.userId)}
                      className="btn btn-sm btn-secondary"
                    >
                      Phone Info
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="no-users">
          <p>No users found matching your search.</p>
        </div>
      )}

      {/* Phone Info Modal */}
      {showPhoneModal && phoneInfo && (
        <div className="modal-overlay" onClick={() => setShowPhoneModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Phone Information</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowPhoneModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="phone-info">
                <div className="info-row">
                  <label>User ID:</label>
                  <span>{phoneInfo.userId}</span>
                </div>
                <div className="info-row">
                  <label>Phone Hash:</label>
                  <span className="phone-hash">{phoneInfo.phoneHash}</span>
                </div>
                <div className="info-row">
                  <label>Consent to Contact:</label>
                  <span className={phoneInfo.consentToContact ? 'consent-yes' : 'consent-no'}>
                    {phoneInfo.consentToContact ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="info-row">
                  <label>Last Updated:</label>
                  <span>
                    {phoneInfo.lastUpdated 
                      ? format(new Date(phoneInfo.lastUpdated), 'MMM dd, yyyy HH:mm')
                      : 'N/A'
                    }
                  </span>
                </div>
                <div className="info-note">
                  <p><strong>Note:</strong> Phone numbers are hashed for privacy. 
                  To access actual phone numbers, use the secure decryption system.</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowPhoneModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersList;
