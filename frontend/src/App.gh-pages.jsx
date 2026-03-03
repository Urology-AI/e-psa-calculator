import React, { useState } from 'react';
import './App.css';

import Part1Form from './components/Part1Form.jsx';
import Part1Results from './components/Part1Results.jsx';

import { calculateDynamicEPsa, getCalculatorConfig } from './utils/dynamicCalculator';

const App = () => {
  const [view, setView] = useState('form'); // 'form' | 'results'
  const [part1Step, setPart1Step] = useState(0);

  // Part 1 data and results (local only for GitHub Pages)
  const [preData, setPreData] = useState({});
  const [preResult, setPreResult] = useState(null);

  const [calculatorConfig] = useState(() => getCalculatorConfig());

  const handlePart1Next = () => {
    if (part1Step < 6) {
      setPart1Step((step) => step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      const result = calculateDynamicEPsa(preData, calculatorConfig);

      if (!result) {
        console.error('calculateDynamicEPsa returned null/undefined', preData);
        alert('Please complete all required fields before calculating the score.');
        return;
      }

      setPreResult(result);
      setView('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error in calculateDynamicEPsa:', error);
      alert('Calculation failed. Please check the answers and try again.');
    }
  };

  const handlePart1Back = () => {
    if (part1Step > 0) {
      setPart1Step((step) => step - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStartOver = () => {
    if (!window.confirm('Start over? This will clear all data for this patient.')) return;
    setPreData({});
    setPreResult(null);
    setPart1Step(0);
    setView('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      className="app"
      style={{
        minHeight: '100vh',
        padding: '2rem 1rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      <div
        className="container"
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '2.5rem',
          background: '#fff',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E8ECF0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <header
          className="app-header"
          style={{ textAlign: 'center', marginBottom: '2rem' }}
        >
          <div
            className="header-logo-container"
            style={{
              textAlign: 'center',
              padding: '32px 20px 20px',
              background: 'white',
              borderRadius: '16px',
              border: '1px solid #E8ECF0',
              marginBottom: '20px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
              minHeight: '120px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src="/e-psa-calculator/logo.png"
              alt="ePSA Logo"
              className="logo"
              style={{
                display: 'block',
                margin: '0 auto 1.5rem',
                maxWidth: '200px',
                maxHeight: '120px',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                transition: 'transform 0.3s ease',
                visibility: 'visible',
                opacity: 1,
              }}
              onError={(e) => {
                console.error('Logo.png failed to load:', e.target.src);
                const currentSrc = e.target.src;
                if (currentSrc.includes('logo.png')) {
                  e.target.src = '/e-psa-calculator/logo.jpg';
                } else {
                  console.warn('Both logo files failed to load');
                  e.target.style.display = 'none';
                }
              }}
            />
          </div>
          <div className="header-text" style={{ textAlign: 'center' }}>
            <h1
              style={{
                fontSize: '42px',
                fontWeight: 800,
                color: '#2E7D32',
                margin: '0 0 4px',
                letterSpacing: '-1px',
                textAlign: 'center',
              }}
            >
              ePSA
            </h1>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#1C2833',
                margin: '0 0 6px',
                textAlign: 'center',
              }}
            >
              Prostate‑Specific Awareness
            </h2>
            <p
              className="subtitle"
              style={{
                fontSize: '14px',
                color: '#7F8C8D',
                fontStyle: 'italic',
                margin: 0,
                textAlign: 'center',
              }}
            >
              A Non‑Validated Educational Risk Tool
            </p>
          </div>
        </header>

        <main className="app-main">
          <section
            style={{
              marginBottom: '1.5rem',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid #E8ECF0',
              background: '#F8FAFC',
              fontSize: '14px',
              color: '#34495E',
            }}
          >
            <strong style={{ display: 'block', marginBottom: '6px' }}>
              Quick workflow for live use
            </strong>
            <ol style={{ margin: 0, paddingLeft: '18px' }}>
              <li>Complete the Part 1 questionnaire together with the patient.</li>
              <li>Review the ePSA result on the next screen.</li>
              <li>Use <strong>Export Data</strong> (JSON) and/or <strong>Export CSV</strong> to save this patient&apos;s responses.</li>
            </ol>
          </section>
          {view === 'form' && (
            <Part1Form
              formData={preData}
              setFormData={setPreData}
              onNext={handlePart1Next}
              onBack={handlePart1Back}
              currentStep={part1Step}
              totalSteps={7}
            />
          )}
          {view === 'results' && (
            <Part1Results
              result={preResult}
              formData={preData}
              storageMode="local"
              onEditAnswers={() => {
                setView('form');
                setPart1Step(0);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onStartOver={handleStartOver}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
