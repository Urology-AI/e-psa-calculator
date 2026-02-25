import React, { useState } from 'react';
import './WelcomeScreen2.css';
import RiskAssessmentDocs from './RiskAssessmentDocs';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { DEFAULT_CALCULATOR_CONFIG } from '../config/calculatorConfig';

const WelcomeScreen2 = ({ onBegin, preResult, config = DEFAULT_CALCULATOR_CONFIG }) => {
  const [showModelDetails, setShowModelDetails] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const activeConfig = config || DEFAULT_CALCULATOR_CONFIG;
  const part2 = activeConfig.part2 || DEFAULT_CALCULATOR_CONFIG.part2;
  const riskCategories = part2.riskCategories || [];
  const toPct = (value) => (typeof value === 'number' ? `${Math.round(value * 100)}%` : String(value));
  const getRiskColor = (tier) => {
    switch (tier) {
      case 'Lower': return '#27AE60';
      case 'Moderate': return '#F39C12';
      case 'Higher': return '#E74C3C';
      default: return '#7F8C8D';
    }
  };

  return (
    <div className="welcome-screen-2">
      {showDocs && <RiskAssessmentDocs config={activeConfig} onClose={() => setShowDocs(false)} />}
      
      <div className="welcome2-container">
        <div className="welcome2-header">
          <h1>Stage 2: Risk Assessment</h1>
          <p className="welcome2-subtitle">Detailed evaluation of your prostate cancer risk factors</p>
        </div>

        <div className="welcome2-body">
          {preResult && preResult.probability !== undefined && (
            <div className="pre-result-summary">
              <h3>Your Screening Priority Result</h3>
              <div 
                className="priority-badge"
                style={{ 
                  backgroundColor: getRiskColor(preResult.riskTier),
                  color: 'white'
                }}
              >
                {preResult.riskTier} Risk ({preResult.probability.toFixed(1)}%)
              </div>
              <p className="priority-description">
                Based on your initial assessment, you have a <strong>{preResult.riskTier?.toLowerCase()}</strong> priority 
                for prostate cancer screening. This stage will gather additional clinical information 
                to refine your risk profile.
              </p>
            </div>
          )}

          {showModelDetails ? (
            <div className="model-breakdown-expanded">
              <div className="model-info-section">
                <h3>Risk Assessment Model Details</h3>
                <p>
                  This stage combines your initial screening priority with additional clinical 
                  variables to produce a comprehensive risk score:
                </p>
                
                <div className="model-factors">
                  <div className="factor-card">
                    <span className="factor-icon">🔬</span>
                    <div className="factor-content">
                      <strong>Clinical Measurements</strong>
                      <span>PSA history, DRE findings, urinary symptoms (IPSS)</span>
                    </div>
                  </div>
                  
                  <div className="factor-card">
                    <span className="factor-icon">🏥</span>
                    <div className="factor-content">
                      <strong>Medical History</strong>
                      <span>Previous biopsies, infections, medications</span>
                    </div>
                  </div>
                  
                  <div className="factor-card">
                    <span className="factor-icon">🧬</span>
                    <div className="factor-content">
                      <strong>Genetic & Family Factors</strong>
                      <span>Detailed family history, genetic markers if known</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="model-breakdown">
                <h3>Risk Assessment Model</h3>
                <div className="breakdown-card">
                  <h4>Combined Risk Calculation</h4>
                  <p>
                    This stage combines your initial screening priority with additional clinical 
                    variables to produce a comprehensive risk score:
                  </p>
                  
                  <div className="formula">
                    <div className="formula-row">
                      <span className="formula-label">Stage 1 Score:</span>
                      <span className="formula-value">Baseline probability from initial assessment</span>
                    </div>
                    <div className="formula-row">
                      <span className="formula-label">Stage 2 Adjustments:</span>
                      <span className="formula-value">Baseline carry + PSA points + PI-RADS points/override</span>
                    </div>
                    <div className="formula-row formula-total">
                      <span className="formula-label">Final Risk Score:</span>
                      <span className="formula-value">Dynamic category mapping from total points</span>
                    </div>
                  </div>
                  
                  <div className="risk-tiers">
                    <h5>Risk Categories</h5>
                    {riskCategories.map((category, index) => (
                      <div className="tier-row" key={`welcome2-tier-${index}`}>
                        <span className="tier-badge" style={{ backgroundColor: '#1C2833' }}>
                          {String(category.riskCat || '').replace(/[🟢🟡🟠🔴]/g, '').trim()}
                        </span>
                        <span>{toPct(category.riskPct)} probability</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="disclaimer-box">
                <strong>References:</strong>
                <ul>
                  <li>NCCN Clinical Practice Guidelines for Prostate Cancer Early Detection</li>
                  <li>EAU Guidelines on Prostate Cancer</li>
                  <li>PCPT Risk Calculator 2.0</li>
                </ul>
              </div>

              <button 
                className="btn-hide-details" 
                onClick={() => setShowModelDetails(false)}
              >
                <EyeOffIcon size={16} />
                Hide Details
              </button>
            </div>
          ) : (
            <button 
              className="btn-view-model" 
              onClick={() => setShowModelDetails(true)}
            >
              <EyeIcon size={16} />
              View Risk Assessment Model Details
            </button>
          )}

          <div className="disclaimer-box">
            <strong>Important Note:</strong> This assessment is for educational purposes only 
            and does not constitute medical advice. The risk model is based on published 
            research but should not replace consultation with a qualified healthcare provider.
            Always discuss your results with your doctor before making any health decisions.
          </div>

          <div className="time-estimate">
            Estimated time: ~5-7 minutes
          </div>

          <button className="btn-begin-stage2" onClick={onBegin}>
            Begin Risk Assessment →
          </button>
        </div>
      </div>

      <footer className="welcome2-footer">
        <div className="footer-content">
          <p className="footer-text">
            ePSA Prostate-Specific Awareness | A Non-Validated Educational Risk Tool
          </p>
          <button 
            className="btn-model-docs" 
            onClick={() => setShowDocs(true)}
          >
            View Risk Assessment Documentation
          </button>
        </div>
      </footer>
    </div>
  );
};

export default WelcomeScreen2;
