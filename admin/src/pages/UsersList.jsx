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
      setSelectedUser(userId); // Set the selected user
      const info = await getUserPhone(userId);
      setPhoneInfo(info);
      setShowPhoneModal(true);
    } catch (error) {
      console.error('Error fetching phone info:', error);
      setSelectedUser(userId); // Still set the user even on error
      setPhoneInfo(null);
      setShowPhoneModal(true); // Show modal with error message
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
      </div>
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
      {showPhoneModal && (
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
              {phoneInfo ? (
                <div className="phone-info">
                  <div className="info-row">
                    <label>User ID:</label>
                    <span>{selectedUser}</span>
                  </div>
                  {phoneInfo.phoneNumber ? (
                    <div className="info-row">
                      <label>Phone Number:</label>
                      <span className="phone-number">{phoneInfo.phoneNumber}</span>
                    </div>
                  ) : (
                    <div className="info-note">
                      <p>Phone number could not be decrypted: {phoneInfo.note || 'Unknown reason'}</p>
                      {phoneInfo.foundCollection && (
                        <p>Data found in collection: {phoneInfo.foundCollection}</p>
                      )}
                      {phoneInfo.availableFields && (
                        <div>
                          <p>Available fields:</p>
                          <ul>
                            {phoneInfo.availableFields.map(field => (
                              <li key={field}>{field}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  {phoneInfo.phoneHash && (
                    <div className="info-row">
                      <label>Phone Hash:</label>
                      <span className="phone-hash">{phoneInfo.phoneHash}</span>
                    </div>
                  )}
                  <div className="info-row">
                    <label>Stored At:</label>
                    <span>{new Date(phoneInfo.storedAt).toLocaleString()}</span>
                  </div>
                  <div className="info-row">
                    <label>Encryption:</label>
                    <span>{phoneInfo.encryptionMethod || 'AES-256'}</span>
                  </div>
                </div>
              ) : (
                <div className="phone-info">
                  <div className="info-row">
                    <label>User ID:</label>
                    <span>{selectedUser}</span>
                  </div>
                  <div className="info-note">
                    <p>Phone information not available for this user.</p>
                    <p>This could mean:</p>
                    <ul>
                      <li>User hasn't provided phone number</li>
                      <li>Phone data is encrypted but not accessible</li>
                      <li>Technical error occurred</li>
                    </ul>
                  </div>
                </div>
              )}
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
