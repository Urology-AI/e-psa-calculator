import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UsersList from './pages/UsersList';
import UserDetail from './pages/UserDetail';
import SessionDetail from './pages/SessionDetail';
import DataExport from './pages/DataExport';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Check if user is admin via Firestore database
        try {
          const { adminLogin } = await import('./services/adminService');
          await adminLogin(user.email);
          setIsAdmin(true);
        } catch (error) {
          console.error('Admin verification failed:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!isAdmin) {
    return (
      <div className="unauthorized-container">
        <h1>Access Denied</h1>
        <p>You need admin privileges to access this dashboard.</p>
        <button onClick={() => auth.signOut()}>Sign Out</button>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <h1>ePSA Admin Dashboard</h1>
          <div className="user-info">
            <span>{user.email}</span>
            <button onClick={() => auth.signOut()}>Sign Out</button>
          </div>
        </header>
        
        <main className="app-main">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/users" element={<UsersList />} />
            <Route path="/users/:userId" element={<UserDetail />} />
            <Route path="/sessions/:sessionId" element={<SessionDetail />} />
            <Route path="/export" element={<DataExport />} />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
