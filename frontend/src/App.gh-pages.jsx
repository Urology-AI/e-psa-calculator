/**
 * GitHub Pages app — same as Firebase app but without cloud options.
 * No Firebase imports; local storage only. Same UI: welcome, import, form, results, Model Docs, HIPAA popup.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './App.css';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import DataImportScreen from './components/DataImportScreen.jsx';
import Part1Form from './components/Part1Form.jsx';
import Part1Results from './components/Part1Results.jsx';
import ModelDocs from './components/ModelDocs.jsx';
import HipaaCompliancePopup from './components/HipaaCompliancePopup.jsx';
import BackButton from './components/BackButton.jsx';
import QuickEPsaEntry from './components/QuickEPsaEntry.jsx';
import { LanguageSwitcher, ThemeSwitcher, TextScaleControl } from '@urology-ai/epsa-ui';
import { BookIcon, ShieldCheckIcon } from 'lucide-react';
import { calculateDynamicEPsa, calculateDynamicEPsaPost, getCalculatorConfig } from './utils/dynamicCalculator';

const defaultPreData = {
  age: '',
  race: null,
  heightFt: '',
  heightIn: '',
  weight: '',
  bmi: 0,
  familyHistory: null,
  brcaStatus: null,
  heightUnit: 'imperial',
  heightCm: '',
  weightUnit: 'lbs',
  weightKg: '',
  ipss: Array(7).fill(null),
  shim: Array(5).fill(null),
  exercise: null,
  smoking: null,
  chemicalExposure: null,
  dietPattern: '',
  comorbidityScore: null,
  hypertension: null,
  hyperlipidemia: null,
  coronaryArteryDisease: null,
  diabetes: null,
};

const defaultPostData = {
  psa: '',
  knowPsa: false,
  onHormonalTherapy: false,
  hormonalTherapyType: '',
  knowPirads: false,
  pirads: '0',
};

function App() {
  const { t } = useTranslation();
  const [step, setStep] = useState('welcome'); // 'welcome' | 'import' | 'app'
  const [view, setView] = useState('form'); // 'form' | 'results'
  const [part1Step, setPart1Step] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const [preData, setPreData] = useState({ ...defaultPreData });
  const [preResult, setPreResult] = useState(null);
  const [postData, setPostData] = useState({ ...defaultPostData });
  const [postResult, setPostResult] = useState(null);
  const [showModelDocs, setShowModelDocs] = useState(false);
  const [showHipaaPopup, setShowHipaaPopup] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  const [calculatorConfig] = useState(() => getCalculatorConfig());

  const handleBeginLocal = () => {
    setStep('app');
    setView('form');
    setPart1Step(0);
    setCurrentStep(1);
    setPreData({ ...defaultPreData });
    setPreResult(null);
    setPostData({ ...defaultPostData });
    setPostResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImportSuccess = (importedData, importType) => {
    if (importType === 'session') {
      alert(t('app.alerts.cloudDemoNoSessionKey'));
      return;
    }

    let dataToImport;
    let targetStage = 'pre';

    if (importedData.version && (importedData.formData || importedData.part1Data)) {
      if (importedData.part === 'part1' && importedData.formData) {
        dataToImport = importedData.formData;
      } else if (importedData.part === 'complete' && importedData.part1Data) {
        dataToImport = importedData.part1Data;
        setPostData((prev) => ({ ...prev, ...(importedData.part2Data || {}) }));
        targetStage = 'post';
      } else if (importedData.formData) {
        dataToImport = importedData.formData;
      } else {
        dataToImport = importedData.part1Data || importedData;
        if (importedData.part2Data) setPostData((prev) => ({ ...prev, ...importedData.part2Data }));
        if (importedData.part === 'complete') targetStage = 'post';
      }
    } else {
      dataToImport = importedData;
    }

    const defaultShape = {
      age: '', race: null, heightFt: '', heightIn: '', weight: '', bmi: 0,
      familyHistory: null, brcaStatus: null, heightUnit: 'imperial', heightCm: '',
      weightUnit: 'lbs', weightKg: '', ipss: Array(7).fill(null), shim: Array(5).fill(null),
      exercise: null, smoking: null, chemicalExposure: null, dietPattern: '',
      comorbidityScore: null, hypertension: null, hyperlipidemia: null, coronaryArteryDisease: null, diabetes: null,
    };
    const normalizedImport = { ...defaultShape, ...dataToImport };
    if (!Array.isArray(normalizedImport.ipss) || normalizedImport.ipss.length !== 7) {
      const src = Array.isArray(normalizedImport.ipss) ? normalizedImport.ipss : [];
      normalizedImport.ipss = [...Array(7)].map((_, i) => (src[i] != null && src[i] !== '') ? src[i] : null);
    }
    if (!Array.isArray(normalizedImport.shim) || normalizedImport.shim.length !== 5) {
      const src = Array.isArray(normalizedImport.shim) ? normalizedImport.shim : [];
      normalizedImport.shim = [...Array(5)].map((_, i) => (src[i] != null && src[i] !== '') ? src[i] : null);
    }

    setPreData((prev) => ({ ...prev, ...normalizedImport }));

    const part1Result = calculateDynamicEPsa(normalizedImport, calculatorConfig);
    setPreResult(part1Result || null);

    if (targetStage === 'post' && importedData.part2Data && Object.keys(importedData.part2Data).length > 0 && part1Result) {
      const part2Result = calculateDynamicEPsaPost(part1Result, importedData.part2Data, calculatorConfig);
      setPostResult(part2Result);
    } else {
      setPostResult(null);
    }

    setStep('app');
    if (part1Result) {
      setView('results');
      setPart1Step(4);
      setCurrentStep(3);
    } else {
      setView('form');
      setPart1Step(0);
      setCurrentStep(1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePart1Next = () => {
    if (part1Step < 6) {
      setPart1Step((s) => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    try {
      const result = calculateDynamicEPsa(preData, calculatorConfig);
      if (!result) {
        alert(t('app.alerts.completeRequiredFieldsGh'));
        return;
      }
      setPreResult(result);
      setView('results');
      setCurrentStep(3);
      setPart1Step(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      alert(t('app.alerts.calculationFailedGh'));
    }
  };

  const handlePart1Back = () => {
    if (part1Step > 0) {
      setPart1Step((s) => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStartOver = () => {
    if (!window.confirm(t('app.confirm.startOverClearAllDataGh'))) return;
    setPreData({ ...defaultPreData });
    setPreResult(null);
    setPostData({ ...defaultPostData });
    setPostResult(null);
    setPart1Step(0);
    setCurrentStep(1);
    setView('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToWelcome = () => {
    if (step === 'import') {
      setStep('welcome');
      return;
    }
    if (step === 'app' && view === 'form' && part1Step === 0) {
      setStep('welcome');
      setView('form');
      setPreData({ ...defaultPreData });
      setPreResult(null);
      return;
    }
    if (view === 'results') {
      setView('form');
      setPart1Step(0);
      setCurrentStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (part1Step > 0) {
      setPart1Step((s) => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const showBack = step === 'app' && (view === 'form' ? part1Step > 0 : true);

  return (
    <div className="App">
      <div className="container">
        <BackButton onBack={handleBackToWelcome} show={showBack} />

        <header className="app-header">
          <div className="header-logo-container">
            <img
              src="/e-psa-calculator/logo.png"
              alt="ePSA Logo"
              className="logo"
              onError={(e) => {
                const currentSrc = e.target.src;
                if (currentSrc.includes('logo.png')) e.target.src = '/e-psa-calculator/logo.jpg';
                else e.target.style.display = 'none';
              }}
            />
          </div>
          <div className="header-text">
            <h1 style={{ fontSize: '2.625rem', fontWeight: 800, color: '#2E7D32', margin: '0 0 4px', letterSpacing: '-1px' }}>ePSA</h1>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1C2833', margin: '0 0 6px' }}>{t('app.header.title')}</h2>
            <p className="subtitle" style={{ fontSize: '0.875rem', color: '#7F8C8D', fontStyle: 'italic', margin: 0 }}>{t('app.header.subtitle')}</p>
          </div>
          <div className="header-actions">
            <TextScaleControl />
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </header>

        {quickOpen ? (
          <QuickEPsaEntry calculatorConfig={calculatorConfig} onClose={() => setQuickOpen(false)} />
        ) : (
          <>
            {step === 'welcome' && (
              <>
                <WelcomeScreen
                  onBegin={handleBeginLocal}
                  onBeginLocal={handleBeginLocal}
                  onBeginCloud={undefined}
                  cloudAvailable={false}
                  onImport={() => setStep('import')}
                  onQuickEntry={() => setQuickOpen(true)}
                  formData={{}}
                  urlEmail={null}
                />
                <footer className="app-footer">
                  <div className="footer-content">
                    <p className="footer-text">{t('app.footer.text')}</p>
                    <button type="button" className="btn-model-docs" onClick={() => setShowModelDocs(true)}>
                      <BookIcon size={16} />
                      <span>{t('app.footer.modelDocs')}</span>
                    </button>
                    <button type="button" className="btn-model-docs btn-hipaa" onClick={() => setShowHipaaPopup(true)}>
                      <ShieldCheckIcon size={16} />
                      <span>{t('app.footer.hipaa')}</span>
                    </button>
                  </div>
                </footer>
              </>
            )}

            {step === 'import' && (
              <DataImportScreen
                onBack={() => setStep('welcome')}
                onImportSuccess={handleImportSuccess}
                hideCloudSection={true}
              />
            )}

            {step === 'app' && view === 'form' && (
              <Part1Form
                formData={preData}
                setFormData={setPreData}
                onNext={handlePart1Next}
                onBack={handlePart1Back}
                currentStep={part1Step}
              />
            )}

            {step === 'app' && view === 'results' && preResult && (
              <Part1Results
                result={preResult}
                formData={preData}
                storageMode="local"
                sessionId={null}
                userEmail={null}
                userPhone={null}
                onSaveToCloud={undefined}
                cloudAvailable={false}
                onEditAnswers={() => {
                  setView('form');
                  setPart1Step(0);
                  setCurrentStep(1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onStartOver={handleStartOver}
              />
            )}
          </>
        )}
      </div>

      {showModelDocs && <ModelDocs config={calculatorConfig} onClose={() => setShowModelDocs(false)} />}
      {showHipaaPopup && <HipaaCompliancePopup onClose={() => setShowHipaaPopup(false)} />}
    </div>
  );
}

export default App;
