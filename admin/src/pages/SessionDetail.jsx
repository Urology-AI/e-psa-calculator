import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSession } from '../services/adminService';
import { format } from 'date-fns';
import './SessionDetail.css';

const SessionDetail = () => {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      loadSessionData();
    }
  }, [sessionId]);

  const loadSessionData = async () => {
    try {
      const sessionData = await getSession(sessionId);
      setSession(sessionData);
    } catch (error) {
      console.error('Error loading session data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderRiskAssessment = (result) => {
    if (!result) return null;

    const riskColors = {
      LOWER: '#27AE60',
      MODERATE: '#D4AF37',
      HIGHER: '#C0392B'
    };

    return (
      <div className="risk-assessment">
        <h3>Risk Assessment</h3>
        <div className="risk-score">
          <div 
            className="score-circle" 
            style={{ borderColor: riskColors[result.risk] }}
          >
            <span className="score-value">{result.score}%</span>
          </div>
          <div className="risk-category">
            <span 
              className="category-label"
              style={{ color: riskColors[result.risk] }}
            >
              {result.risk} RISK
            </span>
          </div>
        </div>
        {result.confidenceLow !== undefined && result.confidenceHigh !== undefined && (
          <div className="confidence-range">
            <span>Confidence Interval: {result.confidenceLow}% - {result.confidenceHigh}%</span>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Loading session data...</div>;
  }

  if (!session) {
    return <div className="error">Session not found</div>;
  }

  return (
    <div className="session-detail">
      <div className="session-header">
        <div className="session-info">
          <h2>Session Details</h2>
          <p className="session-id">ID: {sessionId}</p>
          <p className="session-user">User: {session.userId}</p>
        </div>
        <div className="session-actions">
          <Link to={`/users/${session.userId}`} className="btn btn-primary">
            View User
          </Link>
          <Link to="/users" className="btn btn-outline">
            Back to Users
          </Link>
        </div>
      </div>

      <div className="session-meta">
        <div className="meta-item">
          <label>Status:</label>
          <span className={`status ${session.status}`}>
            {session.status.replace('_', ' ')}
          </span>
        </div>
        <div className="meta-item">
          <label>Created:</label>
          <span>{format(new Date(session.createdAt), 'PPPpp')}</span>
        </div>
        {session.updatedAt && (
          <div className="meta-item">
            <label>Updated:</label>
            <span>{format(new Date(session.updatedAt), 'PPPpp')}</span>
          </div>
        )}
      </div>

      <div className="session-content">
        {session.step1 && (
          <div className="assessment-section">
            <h3>Part 1 - Pre-PSA Assessment</h3>
            <div className="data-grid">
              <div className="data-item">
                <label>Age:</label>
                <span>{session.step1.age} years</span>
              </div>
              <div className="data-item">
                <label>Race:</label>
                <span>{session.step1.race}</span>
              </div>
              <div className="data-item">
                <label>BMI:</label>
                <span>{session.step1.bmi} kg/m²</span>
              </div>
              <div className="data-item">
                <label>Height:</label>
                <span>
                  {session.step1.heightFt && session.step1.heightIn 
                    ? `${session.step1.heightFt}'${session.step1.heightIn}"`
                    : session.step1.heightCm 
                    ? `${session.step1.heightCm} cm`
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="data-item">
                <label>Weight:</label>
                <span>
                  {session.step1.weightUnit === 'lbs' 
                    ? `${session.step1.weight} lbs`
                    : `${session.step1.weight} kg`
                  }
                </span>
              </div>
              <div className="data-item">
                <label>Family History:</label>
                <span>
                  {session.step1.familyHistory === 0 ? 'None' :
                   session.step1.familyHistory === 1 ? '1 relative' :
                   session.step1.familyHistory === 2 ? '2 relatives' :
                   '3+ relatives'}
                </span>
              </div>
              <div className="data-item">
                <label>BRCA Status:</label>
                <span>{session.step1.brcaStatus || 'Unknown'}</span>
              </div>
              <div className="data-item">
                <label>Exercise:</label>
                <span>
                  {session.step1.exercise === 0 ? 'Regular' :
                   session.step1.exercise === 1 ? 'Some' :
                   'None'}
                </span>
              </div>
            </div>

            {session.step1.ipss && (
              <div className="symptom-scores">
                <h4>IPSS Symptoms (Urinary)</h4>
                <div className="score-list">
                  {session.step1.ipss.map((score, index) => (
                    <div key={index} className="score-item">
                      <span className="question-label">Question {index + 1}:</span>
                      <span className="score-value">{score}/5</span>
                    </div>
                  ))}
                  <div className="total-score">
                    <strong>Total IPSS: {session.step1.ipss.reduce((a, b) => a + b, 0)}/35</strong>
                  </div>
                </div>
              </div>
            )}

            {session.step1.shim && (
              <div className="symptom-scores">
                <h4>SHIM Symptoms (Sexual)</h4>
                <div className="score-list">
                  {session.step1.shim.map((score, index) => (
                    <div key={index} className="score-item">
                      <span className="question-label">Question {index + 1}:</span>
                      <span className="score-value">{score}/5</span>
                    </div>
                  ))}
                  <div className="total-score">
                    <strong>Total SHIM: {session.step1.shim.reduce((a, b) => a + b, 0)}/25</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {session.step2 && (
          <div className="assessment-section">
            <h3>Part 2 - PSA & MRI Assessment</h3>
            <div className="data-grid">
              <div className="data-item">
                <label>PSA Level:</label>
                <span>{session.step2.psa} ng/mL</span>
              </div>
              <div className="data-item">
                <label>Knows PSA:</label>
                <span>{session.step2.knowPsa ? 'Yes' : 'No'}</span>
              </div>
              <div className="data-item">
                <label>PIRADS Score:</label>
                <span>{session.step2.pirads}</span>
              </div>
              <div className="data-item">
                <label>Knows PIRADS:</label>
                <span>{session.step2.knowPirads ? 'Yes' : 'No'}</span>
              </div>
              {session.step2.onHormonalTherapy !== undefined && (
                <>
                  <div className="data-item">
                    <label>On Hormonal Therapy:</label>
                    <span>{session.step2.onHormonalTherapy ? 'Yes' : 'No'}</span>
                  </div>
                  {session.step2.onHormonalTherapy && session.step2.hormonalTherapyType && (
                    <div className="data-item">
                      <label>Therapy Type:</label>
                      <span>{session.step2.hormonalTherapyType || 'Not specified'}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {session.result && renderRiskAssessment(session.result)}
      </div>
    </div>
  );
};

export default SessionDetail;
