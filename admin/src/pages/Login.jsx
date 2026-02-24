import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is already logged in
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // User is logged in, App.jsx will handle admin verification
        console.log('User logged in, checking admin access...');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Sign in with email and password
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log('Login successful, admin verification will be handled by App.jsx');
      
    } catch (error) {
      console.error('Login error:', error);
      if (error.code === 'auth/user-not-found') {
        setError('User not found. Please check your email.');
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo">
            <h1>ePSA</h1>
            <span>Admin Dashboard</span>
          </div>
          <p>HIPAA-Compliant Data Management</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Admin Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@nyulangone.org"
              required
              className="form-input"
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="form-input"
              autoComplete="current-password"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="login-button">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-features">
          <div className="feature">
            <span className="feature-icon">🔒</span>
            <span>HIPAA Compliant</span>
          </div>
          <div className="feature">
            <span className="feature-icon">📊</span>
            <span>Secure Data Access</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🔍</span>
            <span>Audit Logged</span>
          </div>
        </div>

        <div className="login-help">
          <details>
            <summary>Need Help?</summary>
            <div className="help-content">
              <p><strong>Admin Access:</strong></p>
              <p>Admin privileges must be granted in the Firestore database by a project administrator.</p>
              <p><strong>To Grant Admin Access:</strong></p>
              <ol>
                <li>Go to Firebase Console → Firestore Database</li>
                <li>Navigate to the 'admins' collection</li>
                <li>Create a new document with the user's UID as the document ID</li>
                <li>Set the document with: <code>{"{ \"isActive\": true }"}</code></li>
              </ol>
              <p><strong>Support:</strong></p>
              <p>Contact your Firebase project administrator for access issues.</p>
            </div>
          </details>
        </div>
      </div>

      <div className="login-footer">
        <p>© 2026 ePSA - Prostate-Specific Awareness</p>
        <p>Unauthorized access is prohibited and will be logged.</p>
        <div className="compliance-badges">
          <span>HIPAA Compliant</span>
          <span>Audit Enabled</span>
          <span>Secure</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
