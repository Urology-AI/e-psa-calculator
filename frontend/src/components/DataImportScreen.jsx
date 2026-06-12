import React, { useState } from 'react';
import './DataImportScreen.css';
import { ArrowLeftIcon, UploadIcon, KeyIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DataImportScreen = ({ onBack, onImportSuccess, hideCloudSection = false }) => {
  const { t } = useTranslation();
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
        throw new Error(t('dataImport.errors.uploadJsonOnly'));
      }
    } catch (err) {
      setError(err.message || t('dataImport.errors.importFailed'));
    } finally {
      setImporting(false);
    }
  };

  const handleSessionLogin = async (e) => {
    e.preventDefault();
    setLoadingSession(true);
    setError('');

    try {
      const normalizedSessionId = (sessionId || '').toUpperCase().trim();
      if (/^EP-\d{8}-[A-Z0-9]{4}$/.test(normalizedSessionId)) {
        // Clinical screening ref (EP-YYYYMMDD-XXXX) — resolved from Turso on the next screen.
        onImportSuccess({ sessionRef: normalizedSessionId }, 'clinical');
      } else if (/^[A-Z0-9]{8}$/.test(normalizedSessionId)) {
        // 8-character cloud session key — resolved through backend on the next screen.
        onImportSuccess({ sessionId: normalizedSessionId }, 'session');
      } else {
        throw new Error(t('dataImport.errors.invalidSessionKey'));
      }
      } catch (err) {
        setError(err.message || t('dataImport.errors.loadCloudFailed'));
      } finally {
      setLoadingSession(false);
    }
  };

  return (
    <div className="import-container">
      <div className="import-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeftIcon size={18} />
          <span>{t('dataImport.back')}</span>
        </button>
        <h1>{t('dataImport.title')}</h1>
        <p>{t('dataImport.subtitle')}</p>
      </div>

      <div className="import-methods">
        {!hideCloudSection && (
        <div className="import-section">
          <h3>
            <KeyIcon size={20} />
            {t('dataImport.loadFromCloud')}
          </h3>
          <p>{t('dataImport.cloudDescription')}</p>
          
          <form onSubmit={handleSessionLogin} className="session-login-form">
            <div className="session-input-group">
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value.toUpperCase())}
                placeholder={t('dataImport.sessionPlaceholder')}
                className="session-input"
                maxLength={16}
                style={{ textTransform: 'uppercase' }}
              />
              <button
                type="submit"
                disabled={loadingSession || sessionId.length < 8}
                className="session-login-btn"
              >
                {loadingSession ? t('dataImport.loading') : t('dataImport.load')}
              </button>
            </div>
            {error && !importing && <div className="import-error">{error}</div>}
          </form>
        </div>
        )}

        {/* Upload JSON */}
        <div className="import-section">
          <h3>
            <UploadIcon size={20} />
            {t('dataImport.uploadJsonData')}
          </h3>
          <p>{t('dataImport.uploadDescription')}</p>
          
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
              <p>{t('dataImport.dragDrop')}</p>
              <p className="drop-text">{t('dataImport.or')}</p>
              <input
                type="file"
                id="data-upload"
                accept=".json,application/json"
                onChange={handleFileInput}
                style={{ display: 'none' }}
              />
              <label htmlFor="data-upload" className="file-select-btn">
                {t('dataImport.chooseJson')}
              </label>
            </div>
          </div>
        </div>
      </div>

      {importing && (
        <div className="import-loading">
          <div className="spinner"></div>
          <p>{t('dataImport.importing')}</p>
        </div>
      )}

      {error && (
        <div className="import-error">
          <p>{t('dataImport.errorPrefix')}: {error}</p>
        </div>
      )}

      <div className="import-help">
        <h3>{t('dataImport.howToImport')}</h3>
        <ul>
          <li><strong>{t('dataImport.how.uploadJsonLabel')}</strong> {t('dataImport.how.uploadJsonText')}</li>
          <li>{t('dataImport.how.restoreText')}</li>
          {!hideCloudSection && <li>{t('dataImport.how.cloudLocal')}</li>}
        </ul>
      </div>
    </div>
  );
};

export default DataImportScreen;
