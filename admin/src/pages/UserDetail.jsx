import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getUser, getUserSessions, deleteUserData, getUserPhone } from '../services/adminService';
import SessionDetail from './SessionDetail';
import SectionLocks from '../components/SectionLocks';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './UserDetail.css';

const UserDetail = () => {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [phoneInfo, setPhoneInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [scannedPdf, setScannedPdf] = useState(null);

  useEffect(() => {
    if (userId) {
      loadUserData();
    }
  }, [userId]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const [userData, sessionsData] = await Promise.all([
        getUser(userId),
        getUserSessions(userId)
      ]);
      setUser(userData);
      setSessions(sessionsData);
      
      // Try to get phone info separately (it might fail if not available)
      try {
        const phoneData = await getUserPhone(userId);
        setPhoneInfo(phoneData);
      } catch (phoneError) {
        console.log('Phone info not available:', phoneError.message);
        setPhoneInfo(null);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    const element = document.getElementById('user-report');
    if (!element) return;

    try {
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`ePSA-Report-${userId.substring(0, 8)}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const handlePdfUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setScannedPdf(file);
      console.log('PDF uploaded:', file.name);
    }
  };

  const formatDate = (dateValue) => {
  if (!dateValue) return 'N/A';
  
  try {
    // Handle Firestore Timestamp
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
      return format(dateValue.toDate(), 'MMM dd, yyyy HH:mm');
    }
    
    // Handle string dates
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    
    return format(date, 'MMM dd, yyyy HH:mm');
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'N/A';
  }
};

const renderSessionData = (session) => {
  return (
      <div className="session-data">
        {session.step1 && (
          <div className="step-data">
            <h4>Part 1 - Pre-PSA Assessment</h4>
            <div className="data-grid">
              <div className="data-item">
                <label>Age:</label>
                <span>{session.step1.age}</span>
              </div>
              <div className="data-item">
                <label>Race:</label>
                <span>{session.step1.race}</span>
              </div>
              <div className="data-item">
                <label>BMI:</label>
                <span>{session.step1.bmi}</span>
              </div>
              <div className="data-item">
                <label>Family History:</label>
                <span>{session.step1.familyHistory > 0 ? 'Yes' : 'No'}</span>
              </div>
              <div className="data-item">
                <label>Exercise:</label>
                <span>{['Regular', 'Some', 'None'][session.step1.exercise] || 'N/A'}</span>
              </div>
              <div className="data-item">
                <label>IPSS Total:</label>
                <span>{session.step1.ipss?.reduce((a, b) => a + b, 0) || 0}</span>
              </div>
            </div>
          </div>
        )}

        {session.step2 && (
          <div className="step-data">
            <h4>Part 2 - PSA & MRI Assessment</h4>
            <div className="data-grid">
              <div className="data-item">
                <label>PSA:</label>
                <span>{session.step2.psa} ng/mL</span>
              </div>
              <div className="data-item">
                <label>Know PSA:</label>
                <span>{session.step2.knowPsa ? 'Yes' : 'No'}</span>
              </div>
              <div className="data-item">
                <label>PIRADS:</label>
                <span>{session.step2.pirads}</span>
              </div>
              <div className="data-item">
                <label>Know PIRADS:</label>
                <span>{session.step2.knowPirads ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        )}

        {session.result && (
          <div className="result-data">
            <h4>Risk Assessment Result</h4>
            <div className="result-summary">
              <div className="score-display">
                <span className="score-label">Risk Score:</span>
                <span className="score-value">{session.result.score}%</span>
              </div>
              <div className="risk-category">
                <span className="category-label">Risk Category:</span>
                <span className={`category-value ${session.result.risk?.toLowerCase()}`}>
                  {session.result.risk}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Loading user data...</div>;
  }

  if (!user) {
    return <div className="error">User not found</div>;
  }

  return (
    <div className="user-detail">
      <div className="user-header">
        <div className="user-info">
          <h2>User Details</h2>
          <p className="user-id">ID: {userId}</p>
        </div>
        <div className="user-actions">
          <button onClick={generatePDF} className="btn btn-primary">
            Generate PDF Report
          </button>
          <button 
            onClick={() => setShowPdfModal(true)} 
            className="btn btn-secondary"
          >
            Upload Scanned PDF
          </button>
          <Link to="/users" className="btn btn-outline">
            Back to Users
          </Link>
        </div>
      </div>

      <div className="user-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          Sessions ({sessions.length})
        </button>
        <button 
          className={`tab ${activeTab === 'contact' ? 'active' : ''}`}
          onClick={() => setActiveTab('contact')}
        >
          Contact
        </button>
        <button 
          className={`tab ${activeTab === 'locks' ? 'active' : ''}`}
          onClick={() => setActiveTab('locks')}
        >
          Section Locks
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-content">
            <div className="user-overview">
              <div className="overview-card">
                <h3>User Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>User ID:</label>
                    <span>{userId}</span>
                  </div>
                  <div className="info-item">
                    <label>Created:</label>
                    <span>{formatDate(user.createdAt)}</span>
                  </div>
                  <div className="info-item">
                    <label>Last Updated:</label>
                    <span>{formatDate(user.updatedAt)}</span>
                  </div>
                  <div className="info-item">
                    <label>Consent to Contact:</label>
                    <span className={user.consentToContact ? 'consent-yes' : 'consent-no'}>
                      {user.consentToContact ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="overview-card">
                <h3>Session Summary</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="summary-label">Total Sessions:</span>
                    <span className="summary-value">{Array.isArray(sessions) ? sessions.length : 0}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Completed:</span>
                    <span className="summary-value">
                      {Array.isArray(sessions) ? sessions.filter(s => s.status === 'STEP2_COMPLETE').length : 0}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">In Progress:</span>
                    <span className="summary-value">
                      {Array.isArray(sessions) ? sessions.filter(s => s.status === 'STEP1_COMPLETE').length : 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="sessions-content">
            {!Array.isArray(sessions) || sessions.length === 0 ? (
              <p>No sessions found for this user.</p>
            ) : (
              <div className="sessions-list">
                {sessions.map((session) => (
                  <div key={session.sessionId} className="session-card">
                    <div className="session-header">
                      <h4>Session: {session.sessionId.substring(0, 12)}...</h4>
                      <span className={`status ${session.status}`}>
                        {session.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="session-dates">
                      <span>
                        Created: {formatDate(session.createdAt)}
                      </span>
                      {session.updatedAt && (
                        <span>
                          Updated: {formatDate(session.updatedAt)}
                        </span>
                      )}
                    </div>
                    {renderSessionData(session)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="contact-content">
            <div className="contact-card">
              <h3>Phone Information</h3>
              <div className="contact-info">
                {phoneInfo ? (
                  <React.Fragment>
                    <div className="info-row">
                      <label>Phone Number:</label>
                      <span className="phone-number">{phoneInfo.phoneNumber}</span>
                    </div>
                    {phoneInfo.phoneHash && (
                      <div className="info-row">
                        <label>Phone Hash:</label>
                        <span className="phone-hash">{phoneInfo.phoneHash}</span>
                      </div>
                    )}
                    <div className="info-row">
                      <label>Stored At:</label>
                      <span>{formatDate(phoneInfo.storedAt)}</span>
                    </div>
                    <div className="info-row">
                      <label>Encryption:</label>
                      <span>{phoneInfo.encryptionMethod || 'AES-256'}</span>
                    </div>
                  </React.Fragment>
                ) : (
                  <div className="info-note">
                    <p>Phone information not available or encrypted.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'locks' && (
          <SectionLocks userId={userId} />
        )}
      </div>

      {/* PDF Upload Modal */}
      {showPdfModal && (
        <div className="modal-overlay" onClick={() => setShowPdfModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Upload Scanned PDF</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowPdfModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="upload-area">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  id="pdf-upload"
                  style={{ display: 'none' }}
                />
                <label htmlFor="pdf-upload" className="upload-label">
                  {scannedPdf ? scannedPdf.name : 'Choose PDF file or drag and drop'}
                </label>
                {scannedPdf && (
                  <div className="file-info">
                    <p>File selected: {scannedPdf.name}</p>
                    <p>Size: {(scannedPdf.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowPdfModal(false)}
              >
                Cancel
              </button>
              {scannedPdf && (
                <button className="btn btn-primary">
                  Upload PDF
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDetail;
