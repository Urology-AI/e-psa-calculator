import React, { useState } from 'react';
import './DataImportScreen.css';
import { ArrowLeftIcon, UploadIcon, KeyIcon } from 'lucide-react';

const DataImportScreen = ({ onBack, onImportSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [loadingSession, setLoadingSession] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file) => {
    setImporting(true);
    setError('');

    try {
      const name = (file.name || '').toLowerCase();
      const isJson = file.type === 'application/json' || name.endsWith('.json');

      if (isJson) {
        const text = await file.text();
        const data = JSON.parse(text);
        onImportSuccess(data, 'json');
      } else {
        throw new Error('Please upload a JSON file (from Export Data).');
      }
    } catch (err) {
      setError(err.message || 'Failed to import file. Please check the file format.');
    } finally {
      setImporting(false);
    }
  };

  const handleSessionLogin = async (e) => {
    e.preventDefault();
    setLoadingSession(true);
    setError('');

    try {
      // Validate session ID format (8 characters, alphanumeric)
      const normalizedSessionId = (sessionId || '').toUpperCase().trim();
      if (!/^[A-Z0-9]{8}$/.test(normalizedSessionId)) {
        throw new Error('Please enter a valid 8-character Session ID (letters and numbers only)');
      }

      // Resolve session through backend on the next screen.
      onImportSuccess({
        sessionId: normalizedSessionId
      }, 'session');
    } catch (err) {
      setError(err.message || 'Failed to load session. Please try again.');
    } finally {
      setLoadingSession(false);
    }
  };

  return (
    <div className="import-container">
      <div className="import-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeftIcon size={18} />
          <span>Back</span>
        </button>
        <h1>Import Assessment Data</h1>
        <p>Upload your previous ePSA assessment data to continue where you left off.</p>
      </div>

      <div className="import-methods">
        {/* Session ID Login */}
        <div className="import-section">
          <h3>
            <KeyIcon size={20} />
            Login with Session ID
          </h3>
          <p>Enter your 8-character Session ID to continue your anonymous assessment</p>
          
          <form onSubmit={handleSessionLogin} className="session-login-form">
            <div className="session-input-group">
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value.toUpperCase())}
                placeholder="A1B2C3D4"
                className="session-input"
                maxLength={8}
                style={{ textTransform: 'uppercase' }}
              />
              <button 
                type="submit" 
                disabled={loadingSession || sessionId.length !== 8}
                className="session-login-btn"
              >
                {loadingSession ? 'Loading...' : 'Login'}
              </button>
            </div>
            {error && <div className="import-error">{error}</div>}
          </form>
        </div>

        {/* Upload JSON */}
        <div className="import-section">
          <h3>
            <UploadIcon size={20} />
            Upload JSON data
          </h3>
          <p>Upload your exported assessment data file (JSON from Export Data).</p>
          
          <div 
            className={`file-drop-zone ${dragActive ? 'active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="drop-content">
              <div className="drop-icon">
                <UploadIcon size={48} />
              </div>
              <p>Drag and drop your JSON file here</p>
              <p className="drop-text">or</p>
              <input
                type="file"
                id="data-upload"
                accept=".json,application/json"
                onChange={handleFileInput}
                style={{ display: 'none' }}
              />
              <label htmlFor="data-upload" className="file-select-btn">
                Choose JSON file
              </label>
            </div>
          </div>
        </div>
      </div>

      {importing && (
        <div className="import-loading">
          <div className="spinner"></div>
          <p>Importing your data...</p>
        </div>
      )}

      {error && (
        <div className="import-error">
          <p>Error: {error}</p>
        </div>
      )}

      <div className="import-help">
        <h3>How to import</h3>
        <ul>
          <li><strong>Upload JSON:</strong> Use the JSON file from Export Data on your results screen.</li>
          <li>Your data will be restored and you can complete or edit any missing fields.</li>
          <li>Works with both local and cloud storage.</li>
        </ul>
      </div>
    </div>
  );
};

export default DataImportScreen;
