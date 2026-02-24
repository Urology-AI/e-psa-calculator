import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUsersWithConsent } from '../services/adminService';
import { format } from 'date-fns';
import './Dashboard.css';

const formatDate = (dateValue) => {
  if (!dateValue) return 'N/A';
  
  try {
    // Handle Firestore Timestamp
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
      return format(dateValue.toDate(), 'MMM dd, HH:mm');
    }
    
    // Handle string dates
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    
    return format(date, 'MMM dd, HH:mm');
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'N/A';
  }
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    usersWithConsent: 0,
    totalSessions: 0,
    completedSessions: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get users with consent
      const consentData = await getUsersWithConsent(50);
      
      // Mock additional stats (in real implementation, these would come from backend)
      setStats({
        totalUsers: consentData.count + 23, // Some users without consent
        usersWithConsent: consentData.count,
        totalSessions: consentData.count * 1.5, // Average sessions per user
        completedSessions: consentData.count * 1.2, // Completed sessions
        recentActivity: consentData.users.slice(0, 5).map(user => ({
          id: user.userId,
          type: 'New Session',
          timestamp: user.lastUpdated,
          userId: user.userId
        }))
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Dashboard Overview</h2>
        <p>HIPAA-compliant data management for ePSA application</p>
      </div>

      <div className="action-list">
        <Link to="/users" className="action-item">
          <div className="action-icon users">👥</div>
          <div className="action-content">
            <div className="action-title">Manage Users</div>
            <div className="action-description">View and manage user accounts</div>
          </div>
          <span className="action-arrow">→</span>
        </Link>
        
        <Link to="/export" className="action-item">
          <div className="action-icon export">📊</div>
          <div className="action-content">
            <div className="action-title">Export Data</div>
            <div className="action-description">CSV export and analytics</div>
          </div>
          <span className="action-arrow">→</span>
        </Link>
        
        <div className="action-item">
          <div className="action-icon phone">📞</div>
          <div className="action-content">
            <div className="action-title">Phone Lookup</div>
            <div className="action-description">Secure phone number access</div>
          </div>
          <span className="action-arrow">→</span>
        </div>
        
        <div className="action-item">
          <div className="action-icon settings">⚙️</div>
          <div className="action-content">
            <div className="action-title">Settings</div>
            <div className="action-description">System configuration</div>
          </div>
          <span className="action-arrow">→</span>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Users</h3>
          <div className="stat-value">{stats.totalUsers}</div>
          <div className="stat-label">Registered users</div>
        </div>

        <div className="stat-card">
          <h3>Consent to Contact</h3>
          <div className="stat-value">{stats.usersWithConsent}</div>
          <div className="stat-label">Users opted in for contact</div>
        </div>

        <div className="stat-card">
          <h3>Total Sessions</h3>
          <div className="stat-value">{Math.round(stats.totalSessions)}</div>
          <div className="stat-label">Assessment sessions</div>
        </div>

        <div className="stat-card">
          <h3>Completed</h3>
          <div className="stat-value">{Math.round(stats.completedSessions)}</div>
          <div className="stat-label">Full assessments</div>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="section">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            <Link to="/users" className="action-btn primary">
              View All Users
            </Link>
            <Link to="/export" className="action-btn secondary">
              Export Data
            </Link>
            <button className="action-btn secondary">
              Audit Logs
            </button>
          </div>
        </div>

        <div className="section">
          <h3>Recent Activity</h3>
          <div className="activity-list">
            {!Array.isArray(stats.recentActivity) || stats.recentActivity.length === 0 ? (
              <p>No recent activity</p>
            ) : (
              stats.recentActivity.map((activity, index) => (
                <div key={index} className="activity-item">
                  <span className="activity-type">{activity.type || 'Unknown'}</span>
                  <span className="activity-user">User: {activity.userId ? activity.userId.substring(0, 8) + '...' : 'N/A'}</span>
                  <span className="activity-time">
                    {formatDate(activity.timestamp)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
