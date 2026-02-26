import React, { useState } from 'react';
import { runFirebaseTests } from '../utils/firebaseTest';
import { TestTubeIcon, PlayIcon, CheckCircleIcon, XCircleIcon, AlertTriangleIcon, DownloadIcon } from 'lucide-react';
import './FirebaseTestPanel.css';

const FirebaseTestPanel = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [currentTest, setCurrentTest] = useState('');

  const runTests = async () => {
    setIsRunning(true);
    setResults(null);
    setCurrentTest('Initializing test suite...');

    try {
      const testResults = await runFirebaseTests();
      setResults(testResults);
      setCurrentTest('Tests completed!');
    } catch (error) {
      setCurrentTest(`Tests failed: ${error.message}`);
      console.error('Test error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const downloadResults = () => {
    if (!results) return;

    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `firebase-test-results-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getTestIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon size={16} className="test-success" />;
      case 'error':
        return <XCircleIcon size={16} className="test-error" />;
      case 'warning':
        return <AlertTriangleIcon size={16} className="test-warning" />;
      default:
        return <TestTubeIcon size={16} className="test-info" />;
    }
  };

  return (
    <div className="firebase-test-panel">
      <div className="test-header">
        <div className="test-title">
          <TestTubeIcon size={24} />
          <h2>Firebase Session Testing Suite</h2>
        </div>
        <div className="test-controls">
          <button 
            className="run-tests-btn" 
            onClick={runTests}
            disabled={isRunning}
          >
            <PlayIcon size={16} />
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </button>
          {results && (
            <button className="download-results-btn" onClick={downloadResults}>
              <DownloadIcon size={16} />
              Download Results
            </button>
          )}
        </div>
      </div>

      {isRunning && (
        <div className="test-running">
          <div className="test-spinner"></div>
          <p>Running: {currentTest}</p>
        </div>
      )}

      {results && (
        <div className="test-results">
          <div className="test-summary">
            <h3>Test Summary</h3>
            <div className="summary-stats">
              <div className="stat-item">
                <span className="stat-label">Total Tests:</span>
                <span className="stat-value">{results.summary.total}</span>
              </div>
              <div className="stat-item success">
                <span className="stat-label">Successful:</span>
                <span className="stat-value">{results.summary.successful}</span>
              </div>
              <div className="stat-item error">
                <span className="stat-label">Failed:</span>
                <span className="stat-value">{results.summary.failed}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Success Rate:</span>
                <span className="stat-value">{results.summary.successRate}</span>
              </div>
            </div>
          </div>

          <div className="test-details">
            <h3>Test Details</h3>
            <div className="test-log">
              {results.details.map((test, index) => (
                <div key={index} className={`test-log-item ${test.type}`}>
                  <div className="test-log-header">
                    {getTestIcon(test.type)}
                    <span className="test-timestamp">
                      {new Date(test.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="test-type">{test.type.toUpperCase()}</span>
                  </div>
                  <div className="test-message">{test.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!results && !isRunning && (
        <div className="test-instructions">
          <h3>Test Coverage</h3>
          <div className="test-coverage">
            <div className="coverage-item">
              <CheckCircleIcon size={16} />
              <span>Session Creation (Anonymous, Email, Phone)</span>
            </div>
            <div className="coverage-item">
              <CheckCircleIcon size={16} />
              <span>Profile Updates (Add/Remove Email, Phone)</span>
            </div>
            <div className="coverage-item">
              <CheckCircleIcon size={16} />
              <span>Session Linking (Import with Session ID)</span>
            </div>
            <div className="coverage-item">
              <CheckCircleIcon size={16} />
              <span>JSON Import (With/Without Session ID)</span>
            </div>
            <div className="coverage-item">
              <CheckCircleIcon size={16} />
              <span>Session Unlinking (Deletion)</span>
            </div>
            <div className="coverage-item">
              <CheckCircleIcon size={16} />
              <span>Data Persistence (Assessment, Consent)</span>
            </div>
          </div>
          <p className="test-note">
            Click "Run All Tests" to verify all Firebase session management functionality.
            Tests will create temporary sessions and clean them up automatically.
          </p>
        </div>
      )}
    </div>
  );
};

export default FirebaseTestPanel;
