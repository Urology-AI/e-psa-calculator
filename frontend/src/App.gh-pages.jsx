import React, { useState } from 'react';
import './App.css';

// Import components (excluding Firebase-dependent ones)
import WelcomeScreenGHPages from './components/WelcomeScreen.gh-pages.jsx';
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

// Import unified calculator utilities (no Firebase dependencies)
import { calculateDynamicEPsa, calculateDynamicEPsaPost, getCalculatorConfig } from './utils/dynamicCalculator';

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

  const [calculatorConfig] = useState(() => getCalculatorConfig());

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
              const result = calculateDynamicEPsa(importedData.formData, calculatorConfig);
              setPreResult(result);
              setAuthStep('app');
              setStage('pre');
              setCurrentStep(3);
              setPart1Step(4);
            } else if (importedData.part === 'complete') {
              setPreData(importedData.part1Data);
              setPostData(importedData.part2Data || {});
              const part1Result = calculateDynamicEPsa(importedData.part1Data, calculatorConfig);
              setPreResult(part1Result);
              if (importedData.part2Data) {
                const part2Result = calculateDynamicEPsaPost(part1Result, importedData.part2Data, calculatorConfig);
                setPostResult(part2Result);
              }
              setAuthStep('app');
              setStage('post');
              setCurrentStep(3);
            }
          } else {
            // Legacy format
            setPreData(importedData);
            const result = calculateDynamicEPsa(importedData, calculatorConfig);
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
      try {
        const result = calculateDynamicEPsa(updatedData, calculatorConfig);
        if (result) {
          setPreResult(result);
        } else {
          console.error('calculateDynamicEPsa returned null/undefined');
          setPreResult({ error: 'Calculation failed' });
        }
      } catch (error) {
        console.error('Error in calculateDynamicEPsa:', error);
        setPreResult({ error: 'Calculation failed' });
      }
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
      const result = calculateDynamicEPsaPost(preResult, updatedData, calculatorConfig);
      setPostResult(result);
      setCurrentStep(3);
    }
  };

  // Render welcome screen
  const renderWelcome = () => {
    return (
      <div className="welcome-container">
        <WelcomeScreenGHPages 
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
            {preResult && !preResult.error ? (
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
            ) : preResult?.error ? (
              <div className="error-results">
                <p>There was an error calculating your results. Please try again.</p>
                <button onClick={() => {
                  setPreResult(null);
                  setCurrentStep(1);
                  setPart1Step(0);
                }}>
                  Try Again
                </button>
              </div>
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
                disabled={!preResult || preResult.error}
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
    <div className="app" style={{ minHeight: '100vh', padding: '2rem 1rem', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
      <GlobalBackButton 
        onBack={handleGlobalBack} 
        show={shouldShowBackButton()} 
      />
      
      <div className="container" style={{ maxWidth: '900px', margin: '0 auto', padding: '2.5rem', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)', border: '1px solid #E8ECF0', display: 'flex', flexDirection: 'column' }}>
        <header className={`app-header ${shouldShowBackButton() ? 'with-back-button' : ''}`} style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="header-logo-container" style={{ textAlign: 'center', padding: '32px 20px 20px', background: 'white', borderRadius: '16px', border: '1px solid #E8ECF0', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)', minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img 
              src="/e-psa-calculator/logo.png"
              alt="ePSA Logo" 
              className="logo"
              style={{ display: 'block', margin: '0 auto 1.5rem', maxWidth: '200px', maxHeight: '120px', width: 'auto', height: 'auto', objectFit: 'contain', transition: 'transform 0.3s ease', visibility: 'visible', opacity: 1 }}
              onError={(e) => {
                console.error('Logo.png failed to load:', e.target.src);
                const currentSrc = e.target.src;
                if (currentSrc.includes('logo.png')) {
                  e.target.src = "/e-psa-calculator/logo.jpg";
                } else {
                  console.warn('Both logo files failed to load');
                  e.target.style.display = 'none';
                }
              }} 
            />
          </div>
          <div className="header-text" style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '42px', fontWeight: 800, color: '#2E7D32', margin: '0 0 4px', letterSpacing: '-1px', textAlign: 'center' }}>ePSA</h1>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1C2833', margin: '0 0 6px', textAlign: 'center' }}>Prostate‑Specific Awareness</h2>
            <p className="subtitle" style={{ fontSize: '14px', color: '#7F8C8D', fontStyle: 'italic', margin: 0, textAlign: 'center' }}>A Non‑Validated Educational Risk Tool</p>
          </div>
        </header>

        <main className="app-main">
          {authStep === 'welcome' && renderWelcome()}
          {authStep === 'app' && stage === 'pre' && renderPreStage()}
          {authStep === 'app' && stage === 'post' && renderPostStage()}
        </main>
      </div>
    </div>
  );
};

export default App;
