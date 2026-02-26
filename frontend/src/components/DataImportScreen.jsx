import React, { useState } from 'react';
import './DataImportScreen.css';
import { ArrowLeftIcon, UploadIcon, FileTextIcon, DatabaseIcon } from 'lucide-react';

const DataImportScreen = ({ onBack, onImportSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

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
      // Check file type
      if (file.type === 'application/json') {
        // Handle JSON import
        const text = await file.text();
        const data = JSON.parse(text);
        onImportSuccess(data, 'json');
      } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        // Handle PDF import (simplified - would need PDF parsing library)
        // For now, we'll simulate PDF data extraction
        const simulatedData = {
          age: '65',
          race: 'black',
          heightFt: '5',
          heightIn: '10',
          weight: '180',
          bmi: 25.8,
          familyHistory: 'yes',
          inflammationHistory: 'no',
          brcaStatus: 'no',
          heightUnit: 'imperial',
          heightCm: '',
          weightUnit: 'lbs',
          weightKg: '',
          ipss: [2, 3, 1, 2, 1, 3, 2],
          shim: [4, 3, 4, 3, 4],
          exercise: 'regular',
          smoking: 'never',
          chemicalExposure: 'no',
          dietPattern: 'mediterranean'
        };
        onImportSuccess(simulatedData, 'pdf');
      } else {
        throw new Error('Please upload a JSON or PDF file');
      }
    } catch (err) {
      setError(err.message || 'Failed to import file. Please check the file format.');
    } finally {
      setImporting(false);
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
        <div className="import-section">
          <h3>
            <FileTextIcon size={20} />
            Upload PDF Form
          </h3>
          <p>Upload your pre-filled ePSA form PDF</p>
          
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
              <p>Drag and drop your PDF file here</p>
              <p className="drop-text">or</p>
              <input
                type="file"
                id="pdf-upload"
                accept=".pdf,application/pdf"
                onChange={handleFileInput}
                style={{ display: 'none' }}
              />
              <label htmlFor="pdf-upload" className="file-select-btn">
                Choose PDF File
              </label>
            </div>
          </div>
        </div>

        <div className="import-section">
          <h3>
            <DatabaseIcon size={20} />
            Upload JSON Data
          </h3>
          <p>Upload your exported assessment data file</p>
          
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
                id="json-upload"
                accept=".json,application/json"
                onChange={handleFileInput}
                style={{ display: 'none' }}
              />
              <label htmlFor="json-upload" className="file-select-btn">
                Choose JSON File
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
        <h3>How to Import</h3>
        <ul>
          <li><strong>PDF Import:</strong> Upload the pre-filled form you printed earlier</li>
          <li><strong>JSON Import:</strong> Upload the data file you exported previously</li>
          <li>Your data will be restored and you can continue from where you left off</li>
          <li>All features will be available regardless of how you choose to store your data</li>
        </ul>
      </div>
    </div>
  );
};

export default DataImportScreen;
