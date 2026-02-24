import React, { useState } from 'react';
import './WelcomeScreen.css';
import PrintableForm from './PrintableForm';
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
            This 5-minute questionnaire calculates your personalized risk assessment using validated clinical instruments.
          </p>

          <div className="demo-notice-banner">
            <MonitorIcon size={20} className="demo-icon" />
            <div className="demo-text">
              <strong>Demo Version</strong>
              <span>Data stored locally in your browser only</span>
            </div>
          </div>

          <div className="welcome-features">
            <div className="feature-item">
              <ClipboardListIcon size={20} className="feature-icon" />
              <span className="feature-text">23 questions</span>
            </div>
            <div className="feature-item">
              <ClockIcon size={20} className="feature-icon" />
              <span className="feature-text">~5 min</span>
            </div>
            <div className="feature-item">
              <DatabaseIcon size={20} className="feature-icon" />
              <span className="feature-text">Local storage</span>
            </div>
          </div>

          <div className="demo-features">
            <h4>Available in this demo:</h4>
            <ul>
              <li>✅ Complete assessment questionnaire</li>
              <li>✅ Risk calculations and results</li>
              <li>✅ JSON import/export</li>
              <li>✅ Print functionality</li>
            </ul>
            <h4>Not available in demo:</h4>
            <ul>
              <li>❌ Phone authentication</li>
              <li>❌ Cloud storage & sync</li>
              <li>❌ PDF import</li>
            </ul>
          </div>

          <button className="btn-begin-assessment" onClick={onBegin}>
            <span>Start Demo Assessment</span>
            <ArrowRightIcon size={18} />
          </button>

          <button className="btn-import-json" onClick={onImport}>
            <FileTextIcon size={16} />
            <span>Import JSON File</span>
          </button>

          <button className="btn-view-form-bottom" onClick={handleViewForm} title="View Offline Form">
            <FileTextIcon size={16} />
            <span>View Printable Form</span>
          </button>
        </div>

        <p className="welcome-footer">
          <strong>Demo Version:</strong> For educational and research purposes. Not for clinical decision-making without physician review.
        </p>
      </div>
    </div>
  );
};

export default WelcomeScreenGHPages;
