import React, { useState } from 'react';
import './App.css';

// Import components (excluding Firebase-dependent ones)
import WelcomeScreen from './components/WelcomeScreen.jsx';
import WelcomeScreen2 from './components/WelcomeScreen2.jsx';
import Part1Form from './components/Part1Form.jsx';
import Part2Form from './components/Part2Form.jsx';
import Part1Results from './components/Part1Results.jsx';
import Part2Results from './components/Part2Results.jsx';
import PrintableForm from './components/PrintableForm.jsx';
import ResultsPrint from './components/ResultsPrint.jsx';
import DataImportScreen from './components/DataImportScreen.jsx';
import ConsentScreen from './components/ConsentScreen.jsx';
import GlobalBackButton from './components/GlobalBackButton.jsx';

// Import utilities (no Firebase dependencies)
import { calculateEPsa } from './utils/epsaCalculator';
import { calculateEPsaPost } from './utils/epsaPostCalculator';

const App = () => {
  const [authStep, setAuthStep] = useState('welcome');
  const [stage, setStage] = useState('pre');
  const [currentStep, setCurrentStep] = useState(1);
  const [part1Step, setPart1Step] = useState(0);

  // Form data states
  const [preData, setPreData] = useState({});
  const [postData, setPostData] = useState({});
  const [preResult, setPreResult] = useState(null);
  const [postResult, setPostResult] = useState(null);

  // Handle local file import
  const handleLocalImport = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          
          // Handle new export format
          if (importedData.version && importedData.formData) {
            if (importedData.part === 'part1') {
              setPreData(importedData.formData);
              const result = calculateEPsa(importedData.formData);
              setPreResult(result);
              setAuthStep('app');
              setStage('pre');
              setCurrentStep(3);
              setPart1Step(4);
            } else if (importedData.part === 'complete') {
              setPreData(importedData.part1Data);
              setPostData(importedData.part2Data || {});
              const part1Result = calculateEPsa(importedData.part1Data);
              setPreResult(part1Result);
              if (importedData.part2Data) {
                const part2Result = calculateEPsaPost(part1Result, importedData.part2Data);
                setPostResult(part2Result);
              }
              setAuthStep('app');
              setStage('post');
              setCurrentStep(3);
            }
          } else {
            // Legacy format
            setPreData(importedData);
            const result = calculateEPsa(importedData);
            setPreResult(result);
            setAuthStep('app');
            setStage('pre');
            setCurrentStep(3);
            setPart1Step(4);
          }
        } catch (error) {
          alert('Error importing file. Please make sure it\'s a valid ePSA JSON export file.');
        }
      };
      reader.readAsText(file);
    } else {
      alert('Please select a valid JSON file. PDF import is not available in the demo version.');
    }
  };

  // Handle Part1 form completion
  const handlePart1Next = (stepData) => {
    const updatedData = { ...preData, ...stepData };
    setPreData(updatedData);
    
    if (part1Step < 3) {
      setPart1Step(part1Step + 1);
    } else {
      // Calculate Part1 results
      const result = calculateEPsa(updatedData);
      setPreResult(result);
      setCurrentStep(3);
    }
  };

  // Handle Part2 form completion
  const handlePostNext = (stepData) => {
    const updatedData = { ...postData, ...stepData };
    setPostData(updatedData);
    
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    } else {
      // Calculate Part2 results
      const result = calculateEPsaPost(preResult, updatedData);
      setPostResult(result);
      setCurrentStep(3);
    }
  };

  // Render welcome screen
  const renderWelcome = () => {
    return (
      <div className="welcome-container">
        <WelcomeScreen 
          onBegin={() => {
            // Skip storage choice for demo - go directly to app with local storage
            setAuthStep('app');
            setStage('pre');
            setCurrentStep(1);
          }}
          onImport={() => {
            // Trigger file import
            document.getElementById('file-import').click();
          }}
        />
        <input
          id="file-import"
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleLocalImport}
        />
      </div>
    );
  };

  // Render pre-assessment stage
  const renderPreStage = () => {
    switch (currentStep) {
      case 1:
      case 2:
        return (
          <Part1Form
            formData={preData}
            setFormData={setPreData}
            onNext={handlePart1Next}
            onBack={() => {
              if (part1Step > 0) {
                setPart1Step(part1Step - 1);
              } else {
                setAuthStep('welcome');
              }
            }}
            currentStep={part1Step}
            totalSteps={7}
          />
        );

      case 3:
        return (
          <div className="pre-results-step">
            {preResult ? (
              <Part1Results
                result={preResult}
                formData={preData}
                storageMode="local"
                onEditAnswers={() => {
                  setPart1Step(0);
                  setCurrentStep(1);
                }}
                onStartOver={() => {
                  if (window.confirm('Start over? This will clear all data.')) {
                    setPreData({});
                    setPreResult(null);
                    setCurrentStep(1);
                    setPart1Step(0);
                  }
                }}
              />
            ) : (
              <div className="loading-results">
                <p>Loading your results...</p>
              </div>
            )}
            <div className="stage-actions">
              <button
                onClick={() => {
                  setStage('post');
                  setCurrentStep(0);
                }}
                className="btn btn-primary"
                disabled={!preResult}
              >
                Continue to Risk Assessment →
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Render post-assessment stage
  const renderPostStage = () => {
    switch (currentStep) {
      case 0:
        return (
          <WelcomeScreen2
            preResult={preResult}
            onBegin={() => setCurrentStep(1)}
          />
        );
      
      case 1:
      case 2:
        return (
          <Part2Form
            formData={postData}
            setFormData={setPostData}
            preResult={preResult}
            onNext={handlePostNext}
            onBack={() => {
              if (currentStep === 1) {
                setStage('pre');
                setCurrentStep(3);
              } else {
                setCurrentStep(currentStep - 1);
              }
            }}
            currentStep={currentStep}
            totalSteps={2}
          />
        );

      case 3:
        return (
          <div className="post-results-step">
            {postResult && (
              <Part2Results
                result={postResult}
                preResult={preResult}
                postData={postData}
                storageMode="local"
                onEditAnswers={() => {
                  setCurrentStep(1);
                }}
                onStartOver={() => {
                  if (window.confirm('Start over? This will clear all data.')) {
                    setAuthStep('welcome');
                    setStage('pre');
                    setCurrentStep(1);
                    setPart1Step(0);
                    setPreData({});
                    setPostData({});
                    setPreResult(null);
                    setPostResult(null);
                  }
                }}
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Check if global back button should show
  const shouldShowBackButton = () => {
    return authStep === 'app' && 
           !(authStep === 'app' && stage === 'pre' && currentStep === 3);
  };

  const handleGlobalBack = () => {
    if (authStep === 'app') {
      if (stage === 'pre') {
        if (currentStep === 1) {
          setAuthStep('welcome');
          setPart1Step(0);
          setCurrentStep(1);
        } else if (currentStep === 3) {
          setPart1Step(0);
          setCurrentStep(1);
        }
      } else if (stage === 'post') {
        if (currentStep === 1) {
          setCurrentStep(3);
          setStage('pre');
        } else if (currentStep === 3) {
          setCurrentStep(1);
        }
      }
    }
  };

  return (
    <div className="app">
      {shouldShowBackButton() && (
        <GlobalBackButton onBack={handleGlobalBack} />
      )}
      
      <div className="container">
        <header className="app-header">
          <div className="app-logo">ePSA</div>
          <div className="app-subtitle">Prostate-Specific Awareness</div>
        </header>

        <main className="app-main">
          {authStep === 'welcome' && renderWelcome()}
          {authStep === 'app' && stage === 'pre' && renderPreStage()}
          {authStep === 'app' && stage === 'post' && renderPostStage()}
        </main>

        <footer className="app-footer">
          <div className="demo-notice">
            <strong>🚀 Demo Version:</strong> This is a static demonstration. 
            <br />
            • Data stored locally in browser only
            <br />
            • JSON import/export supported
            <br />
            • No PDF import (requires server processing)
            <br />
            • No cloud storage or synchronization
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
