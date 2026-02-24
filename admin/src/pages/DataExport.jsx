import React, { useState, useEffect } from 'react';
import { getUsersWithConsent, exportUsersCSV, exportSessionsCSV, downloadCSV, getUserSessions } from '../services/adminService';
import { format } from 'date-fns';
import './DataExport.css';

const formatDate = (dateValue, formatString = 'MMM dd, yyyy') => {
  if (!dateValue) return 'N/A';
  
  try {
    // Handle Firestore Timestamp
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
      return format(dateValue.toDate(), formatString);
    }
    
    // Handle string dates
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    
    return format(date, formatString);
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'N/A';
  }
};

const DataExport = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else {
      loadSessions();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsersWithConsent(100);
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    setLoading(true);
    try {
      // For now, we'll load sessions from users
      const data = await getUsersWithConsent(50);
      const allSessions = [];
      
      for (const user of data.users || []) {
        try {
          const userSessions = await getUserSessions(user.userId);
          allSessions.push(...(userSessions.sessions || []));
        } catch (error) {
          console.error(`Error loading sessions for user ${user.userId}:`, error);
        }
      }
      
      setSessions(allSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportUsers = async () => {
    setExporting(true);
    try {
      const data = await exportUsersCSV();
      downloadCSV(data.csvContent, data.filename);
    } catch (error) {
      console.error('Error exporting users:', error);
      alert('Failed to export users data');
    } finally {
      setExporting(false);
    }
  };

  const handleExportSessions = async () => {
    setExporting(true);
    try {
      const dateRangeData = dateRange.start && dateRange.end ? dateRange : null;
      const data = await exportSessionsCSV(dateRangeData);
      downloadCSV(data.csvContent, data.filename);
    } catch (error) {
      console.error('Error exporting sessions:', error);
      alert('Failed to export sessions data');
    } finally {
      setExporting(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredSessions = sessions.filter(session =>
    session.sessionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="data-export">
      <div className="export-header">
        <h2>Data Export & Analytics</h2>
        <p>Export and analyze user data in tabular format</p>
      </div>

      <div className="export-tabs">
        <button 
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users ({filteredUsers.length})
        </button>
        <button 
          className={`tab ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          Sessions ({filteredSessions.length})
        </button>
      </div>

      <div className="export-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="export-actions">
          {activeTab === 'users' ? (
            <button 
              onClick={handleExportUsers}
              disabled={exporting || users.length === 0}
              className="btn btn-primary"
            >
              {exporting ? 'Exporting...' : 'Export Users CSV'}
            </button>
          ) : (
            <>
              <div className="date-range">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  className="date-input"
                />
                <span>to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                  className="date-input"
                />
              </div>
              <button 
                onClick={handleExportSessions}
                disabled={exporting || sessions.length === 0}
                className="btn btn-primary"
              >
                {exporting ? 'Exporting...' : 'Export Sessions CSV'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading">Loading data...</div>
        ) : activeTab === 'users' ? (
          <UsersTable users={filteredUsers} />
        ) : (
          <SessionsTable sessions={filteredSessions} />
        )}
      </div>
    </div>
  );
};

const UsersTable = ({ users }) => {
  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>User ID</th>
            <th>Email</th>
            <th>Consent to Contact</th>
            <th>Consent Date</th>
            <th>Research Consent</th>
            <th>Created</th>
            <th>Phone Hash</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan="7" className="no-data">No users found</td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.userId}>
                <td className="user-id">{user.userId.substring(0, 12)}...</td>
                <td>{user.email || 'N/A'}</td>
                <td>
                  <span className={`status ${user.consentToContact ? 'yes' : 'no'}`}>
                    {user.consentToContact ? 'Yes' : 'No'}
                  </span>
                </td>
                <td>
                  {formatDate(user.consentTimestamp)}
                </td>
                <td>
                  <span className={`status ${user.researchConsent ? 'yes' : 'no'}`}>
                    {user.researchConsent ? 'Yes' : 'No'}
                  </span>
                </td>
                <td>
                  {formatDate(user.createdAt)}
                </td>
                <td className="phone-hash">
                  <span title={user.phoneHash}>
                    {user.phoneHash ? `${user.phoneHash.substring(0, 10)}...` : 'N/A'}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

const SessionsTable = ({ sessions }) => {
  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Session ID</th>
            <th>User ID</th>
            <th>Status</th>
            <th>Created</th>
            <th>Last Updated</th>
            <th>Step 1</th>
            <th>Step 2</th>
            <th>Risk Score</th>
          </tr>
        </thead>
        <tbody>
          {sessions.length === 0 ? (
            <tr>
              <td colSpan="8" className="no-data">No sessions found</td>
            </tr>
          ) : (
            sessions.map((session) => (
              <tr key={session.sessionId}>
                <td className="session-id">{session.sessionId.substring(0, 12)}...</td>
                <td className="user-id">{session.userId.substring(0, 12)}...</td>
                <td>
                  <span className={`status ${session.status.toLowerCase().replace('_', '-')}`}>
                    {session.status.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  {formatDate(session.createdAt, 'MMM dd, yyyy HH:mm')}
                </td>
                <td>
                  {formatDate(session.updatedAt, 'MMM dd, yyyy HH:mm')}
                </td>
                <td>
                  {session.step1 ? (
                    <span className="step-indicator complete">✓</span>
                  ) : (
                    <span className="step-indicator incomplete">✗</span>
                  )}
                </td>
                <td>
                  {session.step2 ? (
                    <span className="step-indicator complete">✓</span>
                  ) : (
                    <span className="step-indicator incomplete">✗</span>
                  )}
                </td>
                <td>
                  {session.result ? (
                    <span className={`risk-score ${session.result.risk?.toLowerCase()}`}>
                      {session.result.score}%
                    </span>
                  ) : (
                    'N/A'
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataExport;
