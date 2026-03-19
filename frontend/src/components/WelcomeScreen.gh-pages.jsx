import React, { useState } from 'react';
import './WelcomeScreen.css';
import PrintableForm from './PrintableForm';
import { useTranslation } from 'react-i18next';
import { 
  FileTextIcon, 
  ClipboardListIcon, 
  ClockIcon, 
  LockIcon, 
  ArrowRightIcon,
  MonitorIcon,
  DatabaseIcon
} from 'lucide-react';

const WelcomeScreenGHPages = ({ onBegin, onImport, formData }) => {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);

  const handleViewForm = () => {
    setShowForm(true);
  };

  const handleBack = () => {
    setShowForm(false);
  };

  if (showForm) {
    return <PrintableForm onBack={handleBack} formData={formData} />;
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-container">
        <div className="welcome-body">
          <p className="welcome-description">
            {t('welcomeGh.description')}
          </p>

          <div className="demo-notice-banner">
            <MonitorIcon size={20} className="demo-icon" />
            <div className="demo-text">
              <strong>{t('welcomeGh.demoVersion')}</strong>
              <span>{t('welcomeGh.demoStorage')}</span>
            </div>
          </div>

          <div className="welcome-features">
            <div className="feature-item">
              <ClipboardListIcon size={20} className="feature-icon" />
              <span className="feature-text">{t('welcomeGh.featureQuestions')}</span>
            </div>
            <div className="feature-item">
              <ClockIcon size={20} className="feature-icon" />
              <span className="feature-text">{t('welcomeGh.featureTime')}</span>
            </div>
            <div className="feature-item">
              <DatabaseIcon size={20} className="feature-icon" />
              <span className="feature-text">{t('welcomeGh.featureLocalStorage')}</span>
            </div>
          </div>

          <div className="demo-features">
            <h4>{t('welcomeGh.availableInDemo')}</h4>
            <ul>
              <li>{t('welcomeGh.availableItems.questionnaire')}</li>
              <li>{t('welcomeGh.availableItems.results')}</li>
              <li>{t('welcomeGh.availableItems.json')}</li>
              <li>{t('welcomeGh.availableItems.print')}</li>
            </ul>
            <h4>{t('welcomeGh.notAvailableInDemo')}</h4>
            <ul>
              <li>{t('welcomeGh.notAvailableItems.phoneAuth')}</li>
              <li>{t('welcomeGh.notAvailableItems.cloudSync')}</li>
              <li>{t('welcomeGh.notAvailableItems.pdfImport')}</li>
            </ul>
          </div>

          <button className="btn-begin-assessment" onClick={onBegin}>
            <span>{t('welcomeGh.startDemo')}</span>
            <ArrowRightIcon size={18} />
          </button>

          <button className="btn-import-json" onClick={onImport}>
            <FileTextIcon size={16} />
            <span>{t('welcomeGh.importJson')}</span>
          </button>

          <button className="btn-view-form-bottom" onClick={handleViewForm} title={t('welcomeGh.viewOfflineFormTitle')}>
            <FileTextIcon size={16} />
            <span>{t('welcome.viewPrintableForm')}</span>
          </button>
        </div>

        <p className="welcome-footer">
          <strong>{t('welcomeGh.demoVersion')}:</strong> {t('welcomeGh.footerDisclaimer')}
        </p>
      </div>
    </div>
  );
};

export default WelcomeScreenGHPages;
