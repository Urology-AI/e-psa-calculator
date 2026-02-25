/**
 * Admin App Entry Point
 * Separate application for admin subdomain with email OTP authentication
 */

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/admin/AdminLogin';
import { adminAuthService } from './services/adminAuthService';
import './index.css';

// Admin App with Email OTP Authentication
const AdminApp = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminUser, setAdminUser] = useState(null);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    setIsLoading(true);
    
    // First check if user is already authenticated
    if (adminAuthService.isAdminAuthenticated()) {
      const user = adminAuthService.getCurrentAdmin();
      setAdminUser(user);
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }
    
    // Check if user is coming from email link
    const linkResult = await adminAuthService.checkForEmailLink();
    if (linkResult && linkResult.success) {
      setAdminUser(linkResult.user);
      setIsAuthenticated(true);
    }
    
    setIsLoading(false);
  };

  const handleLoginSuccess = (user) => {
    setAdminUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    const result = await adminAuthService.logoutAdmin();
    if (result.success) {
      setAdminUser(null);
      setIsAuthenticated(false);
    } else {
      console.error('Logout failed:', result.message);
    }
  };

  if (isLoading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Initializing admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return <AdminDashboard onLogout={handleLogout} adminUser={adminUser} />;
};

// Render the admin app
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<AdminApp />);
