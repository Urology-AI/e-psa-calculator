/**
 * User Management Component
 * Modern user management interface for session-based users
 */

import React, { useState, useEffect } from 'react';
import { Users, Shield, Activity, Settings, Eye, Lock, CheckCircle, Search, Filter, Download, Calendar, Mail, Phone, Key, Send } from 'lucide-react';
import { collection, getDocs, query, orderBy, limit, where, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import adminApp, { adminDb } from '../../config/adminFirebase';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingContact, setSavingContact] = useState(false);
  const [contactMessage, setContactMessage] = useState('');

  const functions = getFunctions(adminApp);
  const sendSessionAccessEmail = httpsCallable(functions, 'sendSessionAccessEmail');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const usersQuery = query(
        collection(adminDb, 'users'),
        orderBy('lastLoginAt', 'desc'),
        limit(100)
      );
      
      const snapshot = await getDocs(usersQuery);
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.sessionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || 
      (filterType === 'email' && user.email) ||
      (filterType === 'phone' && user.phone) ||
      (filterType === 'anonymous' && !user.email && !user.phone);
    
    return matchesSearch && matchesFilter;
  });

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setEditEmail(user.email || '');
    setEditPhone(user.phone || '');
    setContactMessage('');
    setShowUserDetails(true);
  };

  const handleUserStatusToggle = async (user) => {
    try {
      await updateDoc(doc(adminDb, 'users', user.id), {
        isActive: !user.isActive,
        lastModified: new Date().toISOString()
      });
      
      setUsers(users.map(u => 
        u.id === user.id ? { ...u, isActive: !u.isActive } : u
      ));
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user session? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(adminDb, 'users', userId));
      setUsers(users.filter(u => u.id !== userId));
      setShowUserDetails(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const exportUsers = () => {
    const csvContent = [
      ['Session ID', 'Email', 'Phone', 'Auth Method', 'Created', 'Last Login', 'Has Firebase User', 'Active'],
      ...filteredUsers.map(user => [
        user.sessionId || user.id,
        user.email || 'N/A',
        user.phone || 'N/A',
        user.authMethod || 'unknown',
        new Date(user.createdAt).toLocaleDateString(),
        new Date(user.lastLoginAt).toLocaleDateString(),
        user.hasFirebaseUser ? 'Yes' : 'No',
        user.isActive !== false ? 'Active' : 'Inactive'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getUserTypeIcon = (user) => {
    if (user.email) return <Mail size={16} />;
    if (user.phone) return <Phone size={16} />;
    return <Key size={16} />;
  };

  const getUserTypeLabel = (user) => {
    if (user.email) return 'Email';
    if (user.phone) return 'Phone';
    return 'Anonymous';
  };

  if (loading) {
    return (
      <div className="user-management">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="user-management-header">
        <div className="header-content">
          <div className="header-title">
            <Users size={28} />
            <h2>User Management</h2>
          </div>
          <div className="header-stats">
            <div className="stat-item">
              <span className="stat-number">{users.length}</span>
              <span className="stat-label">Total Sessions</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{users.filter(u => u.email).length}</span>
              <span className="stat-label">Email Users</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{users.filter(u => u.phone).length}</span>
              <span className="stat-label">Phone Users</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{users.filter(u => !u.email && !u.phone).length}</span>
              <span className="stat-label">Anonymous</span>
            </div>
          </div>
        </div>
      </div>

      <div className="user-management-content">
        <div className="user-controls">
          <div className="search-filter-group">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search by session ID, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="filter-dropdown">
              <Filter size={18} />
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="all">All Users</option>
                <option value="email">Email Users</option>
                <option value="phone">Phone Users</option>
                <option value="anonymous">Anonymous Only</option>
              </select>
            </div>
          </div>
          
          <button className="export-btn" onClick={exportUsers}>
            <Download size={16} />
            Export CSV
          </button>
        </div>

        <div className="users-table">
          <div className="table-header">
            <div className="table-row">
              <div className="table-cell">Session ID</div>
              <div className="table-cell">Type</div>
              <div className="table-cell">Contact</div>
              <div className="table-cell">Created</div>
              <div className="table-cell">Last Login</div>
              <div className="table-cell">Status</div>
              <div className="table-cell">Actions</div>
            </div>
          </div>
          
          <div className="table-body">
            {filteredUsers.map(user => (
              <div key={user.id} className="table-row" onClick={() => handleUserClick(user)}>
                <div className="table-cell session-id">
                  <Key size={14} />
                  <span>{user.sessionId || user.id}</span>
                </div>
                <div className="table-cell user-type">
                  {getUserTypeIcon(user)}
                  <span>{getUserTypeLabel(user)}</span>
                </div>
                <div className="table-cell contact-info">
                  {user.email && <span>{user.email}</span>}
                  {user.phone && <span>{user.phone}</span>}
                  {!user.email && !user.phone && <span className="no-contact">No contact</span>}
                </div>
                <div className="table-cell">
                  {new Date(user.createdAt).toLocaleDateString()}
                </div>
                <div className="table-cell">
                  {new Date(user.lastLoginAt).toLocaleDateString()}
                </div>
                <div className="table-cell">
                  <span className={`status-badge ${user.isActive !== false ? 'active' : 'inactive'}`}>
                    {user.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="table-cell actions">
                  <button 
                    className="action-btn toggle"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUserStatusToggle(user);
                    }}
                  >
                    {user.isActive !== false ? 'Disable' : 'Enable'}
                  </button>
                  <button 
                    className="action-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteUser(user.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {filteredUsers.length === 0 && (
          <div className="no-results">
            <Users size={48} />
            <h3>No users found</h3>
            <p>Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>

      {showUserDetails && selectedUser && (
        <div className="user-details-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>User Details</h3>
              <button className="close-btn" onClick={() => setShowUserDetails(false)}>
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="detail-section">
                <h4>Session Information</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Session ID:</label>
                    <span>{selectedUser.sessionId || selectedUser.id}</span>
                  </div>
                  <div className="detail-item">
                    <label>Auth Method:</label>
                    <span>{selectedUser.authMethod || 'unknown'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Created:</label>
                    <span>{new Date(selectedUser.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <label>Last Login:</label>
                    <span>{new Date(selectedUser.lastLoginAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>Contact Information</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Email:</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="patient@example.com"
                    />
                  </div>
                  <div className="detail-item">
                    <label>Phone:</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div className="detail-item">
                    <label>Firebase User:</label>
                    <span>{selectedUser.hasFirebaseUser ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Status:</label>
                    <span className={`status-badge ${selectedUser.isActive !== false ? 'active' : 'inactive'}`}>
                      {selectedUser.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="detail-section consent-note">
                  <p>
                    By adding an email or phone number here, you confirm that the contact belongs to the patient and that
                    they have consented to receive secure links or messages related to their ePSA session.
                  </p>
                </div>

                <div className="detail-section">
                  <button
                    className="action-btn send-link"
                    disabled={savingContact || (!editEmail && !editPhone)}
                    onClick={async () => {
                      if (!selectedUser) return;
                      setSavingContact(true);
                      setContactMessage('');
                      try {
                        await updateDoc(doc(adminDb, 'users', selectedUser.id), {
                          email: editEmail || null,
                          phone: editPhone || null,
                          lastModified: new Date().toISOString()
                        });

                        const updated = {
                          ...selectedUser,
                          email: editEmail || null,
                          phone: editPhone || null
                        };
                        setSelectedUser(updated);
                        setUsers(prev =>
                          prev.map(u => (u.id === updated.id ? updated : u))
                        );

                        if (editEmail) {
                          await sendSessionAccessEmail({
                            email: editEmail,
                            sessionId: selectedUser.sessionId || selectedUser.id,
                            context: 'admin-added-contact'
                          });
                          setContactMessage('Saved and session access email sent.');
                        } else {
                          setContactMessage('Contact saved (no email provided to send link).');
                        }
                      } catch (error) {
                        console.error('Error saving contact or sending email:', error);
                        setContactMessage('Error saving contact or sending email. Check console for details.');
                      } finally {
                        setSavingContact(false);
                      }
                    }}
                  >
                    <Send size={16} />
                    {savingContact ? 'Saving...' : 'Save & Send Access Email'}
                  </button>
                  {contactMessage && (
                    <p className="contact-message">
                      {contactMessage}
                    </p>
                  )}
                </div>
              </div>

              {selectedUser.importedData && (
                <div className="detail-section">
                  <h4>Imported Data</h4>
                  <div className="imported-data">
                    <p>Import Date: {new Date(selectedUser.importDate).toLocaleString()}</p>
                    <pre>{JSON.stringify(selectedUser.importedData, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
