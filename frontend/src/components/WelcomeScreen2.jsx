import React, { useState } from 'react';
import './WelcomeScreen2.css';
import RiskAssessmentDocs from './RiskAssessmentDocs';
import { EyeIcon, EyeOffIcon, FlaskConicalIcon, HospitalIcon, DnaIcon } from 'lucide-react';
import { DEFAULT_CALCULATOR_CONFIG } from '@epsa/engine';
import { useTranslation } from 'react-i18next';

const WelcomeScreen2 = ({ onBegin, preResult, config = DEFAULT_CALCULATOR_CONFIG }) => {
  const [showModelDetails, setShowModelDetails] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const activeConfig = config || DEFAULT_CALCULATOR_CONFIG;
  const part2 = activeConfig.part2 || DEFAULT_CALCULATOR_CONFIG.part2;
  const riskCategories = part2.riskCategories || [];
  const toPct = (value) => (typeof value === 'number' ? `${Math.round(value * 100)}%` : String(value));
  const { t } = useTranslation();
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
          <h1>{t('welcome2.stage2Title')}</h1>
          <p className="welcome2-subtitle">{t('welcome2.stage2Subtitle')}</p>
        </div>

        <div className="welcome2-body">
          {preResult && preResult.probability !== undefined && (
            <div className="pre-result-summary">
              <h3>{t('welcome2.priorityResultHeading')}</h3>
              <div 
                className="priority-badge"
                style={{ 
                  backgroundColor: getRiskColor(preResult.riskTier),
                  color: 'white'
                }}
              >
                {t('welcome2.priorityBadge', {
                  riskTier: preResult.riskTier,
                  probability: preResult.probability.toFixed(1),
                })}
              </div>
              <p className="priority-description">
                {t('welcome2.priorityDescription', {
                  priorityTierLower: preResult.riskTier?.toLowerCase(),
                })}
              </p>
            </div>
          )}

          {showModelDetails ? (
            <div className="model-breakdown-expanded">
              <div className="model-info-section">
                <h3>{t('welcome2.modelDetails.heading')}</h3>
                <p>{t('welcome2.modelDetails.intro')}</p>
                
                <div className="model-factors">
                  <div className="factor-card">
                    <FlaskConicalIcon size={18} className="factor-icon" aria-hidden="true" />
                    <div className="factor-content">
                      <strong>{t('welcome2.modelDetails.factors.clinical.title')}</strong>
                      <span>{t('welcome2.modelDetails.factors.clinical.desc')}</span>
                    </div>
                  </div>
                  
                  <div className="factor-card">
                    <HospitalIcon size={18} className="factor-icon" aria-hidden="true" />
                    <div className="factor-content">
                      <strong>{t('welcome2.modelDetails.factors.history.title')}</strong>
                      <span>{t('welcome2.modelDetails.factors.history.desc')}</span>
                    </div>
                  </div>
                  
                  <div className="factor-card">
                    <DnaIcon size={18} className="factor-icon" aria-hidden="true" />
                    <div className="factor-content">
                      <strong>{t('welcome2.modelDetails.factors.genetic.title')}</strong>
                      <span>{t('welcome2.modelDetails.factors.genetic.desc')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="model-breakdown">
                <h3>{t('welcome2.modelBreakdown.heading')}</h3>
                <div className="breakdown-card">
                  <h4>{t('welcome2.modelBreakdown.combined.heading')}</h4>
                  <p>{t('welcome2.modelBreakdown.combined.desc')}</p>
                  
                  <div className="formula">
                    <div className="formula-row">
                      <span className="formula-label">{t('welcome2.modelBreakdown.formula.stage1.label')}</span>
                      <span className="formula-value">{t('welcome2.modelBreakdown.formula.stage1.value')}</span>
                    </div>
                    <div className="formula-row">
                      <span className="formula-label">{t('welcome2.modelBreakdown.formula.stage2.label')}</span>
                      <span className="formula-value">{t('welcome2.modelBreakdown.formula.stage2.value')}</span>
                    </div>
                    <div className="formula-row formula-total">
                      <span className="formula-label">{t('welcome2.modelBreakdown.formula.final.label')}</span>
                      <span className="formula-value">{t('welcome2.modelBreakdown.formula.final.value')}</span>
                    </div>
                  </div>
                  
                  <div className="risk-tiers">
                    <h5>{t('welcome2.modelBreakdown.riskCategories.heading')}</h5>
                    {riskCategories.map((category, index) => (
                      <div className="tier-row" key={`welcome2-tier-${index}`}>
                        <span className="tier-badge" style={{ backgroundColor: '#1C2833' }}>
                          {String(category.riskCat || '').replace(/[🟢🟡🟠🔴]/g, '').trim()}
                        </span>
                        <span>{toPct(category.riskPct)} {t('welcome2.modelBreakdown.riskCategories.probabilityLabel')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="disclaimer-box">
                <strong>{t('welcome2.references.label')}</strong>
                <ul>
                  <li>{t('welcome2.references.item1')}</li>
                  <li>{t('welcome2.references.item2')}</li>
                  <li>{t('welcome2.references.item3')}</li>
                </ul>
              </div>

              <button 
                className="btn-hide-details" 
                onClick={() => setShowModelDetails(false)}
              >
                <EyeOffIcon size={16} />
                {t('welcome2.hideDetails')}
              </button>
            </div>
          ) : (
            <button 
              className="btn-view-model" 
              onClick={() => setShowModelDetails(true)}
            >
              <EyeIcon size={16} />
              {t('welcome2.viewModelDetails')}
            </button>
          )}

          <div className="disclaimer-box">
            <strong>{t('welcome2.importantNote.label')}</strong> {t('welcome2.importantNote.text')}
          </div>

          <div className="time-estimate">
            {t('welcome2.estimatedTime')}
          </div>

          <button className="btn-begin-stage2" onClick={onBegin}>
            {t('welcome2.beginStage2Button')}
          </button>
        </div>
      </div>

      <footer className="welcome2-footer">
        <div className="footer-content">
          <p className="footer-text">{t('welcome2.footerText')}</p>
          <button 
            className="btn-model-docs" 
            onClick={() => setShowDocs(true)}
          >
            {t('welcome2.viewDocsButton')}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default WelcomeScreen2;
