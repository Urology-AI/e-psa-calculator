import React, { useState } from 'react';
import './App.css';
import StepNavigation from './components/StepNavigation';
import StepForm from './components/StepForm';
import FormField from './components/FormField';
import PreResults from './components/PreResults';
import Results from './components/Results';
import { calculateEPsaPre } from './utils/epsaPreCalculator';
import { calculateEPsaPost } from './utils/epsaPostCalculator';

const PRE_STEPS = [
  { id: 1, label: 'Basic Info', title: 'Non-Modifiable Risk Factors', description: 'Tell us about factors you cannot change' },
  { id: 2, label: 'History', title: 'Prior Screening History', description: 'Share your screening and medical history' },
  { id: 3, label: 'Priority', title: 'Screening Priority', description: 'View your screening priority recommendation' }
];

const POST_STEPS = [
  { id: 1, label: 'PSA', title: 'PSA Level', description: 'Enter your PSA test result' },
  { id: 2, label: 'MRI', title: 'MRI Results (Optional)', description: 'Share your PIRADS score if available' },
  { id: 3, label: 'Risk', title: 'Risk Assessment', description: 'View your personalized risk assessment' }
];

function App() {
  const [stage, setStage] = useState('pre'); // 'pre' or 'post'
  const [currentStep, setCurrentStep] = useState(1);
  
  // ePSA-Pre form data
  const [preData, setPreData] = useState({
    age: '',
    familyHistory: '',
    geneticRisk: '',
    race: '',
    priorPsa: '',
    priorBiopsy: '',
    finasteride: ''
  });

  // ePSA-Post form data
  const [postData, setPostData] = useState({
    psa: '',
    knowPirads: false,
    pirads: '0'
  });

  const [preResult, setPreResult] = useState(null);
  const [postResult, setPostResult] = useState(null);

  const handlePreChange = (field, value) => {
    setPreData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePostChange = (field, value) => {
    setPostData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePreNext = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 2) {
      // Calculate Pre results
      const result = calculateEPsaPre(preData);
      setPreResult(result);
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePostNext = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 2) {
      // Calculate Post results
      const result = calculateEPsaPost(preResult, postData);
      setPostResult(result);
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePostPrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const canProceedPre = () => {
    switch (currentStep) {
      case 1:
        return preData.age && preData.familyHistory && preData.geneticRisk && preData.race;
      case 2:
        return preData.priorPsa && preData.priorBiopsy && preData.finasteride;
      default:
        return true;
    }
  };

  const canProceedPost = () => {
    switch (currentStep) {
      case 1:
        return postData.psa && parseFloat(postData.psa) > 0;
      case 2:
        return true; // PIRADS is optional
      default:
        return true;
    }
  };

  const renderPreStage = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepForm
            step={1}
            title={PRE_STEPS[0].title}
            description={PRE_STEPS[0].description}
            onNext={handlePreNext}
            onPrevious={handlePrePrevious}
            canProceed={canProceedPre()}
          >
            <FormField
              label="Age Group"
              tooltipText="SEER Database, cancer.gov&#10;Godtman RA, et al., Eur Urol. 2022&#10;Nemesure B, et al., Res Rep Urol. 2022"
              id="age"
            >
              <select
                id="age"
                value={preData.age}
                onChange={(e) => handlePreChange('age', e.target.value)}
              >
                <option value="">Select age group...</option>
                <option value="40-49">40-49</option>
                <option value="50-59">50-59</option>
                <option value="60-69">60-69</option>
                <option value="70+">70+</option>
              </select>
            </FormField>

            <FormField
              label="Family History of Prostate Cancer"
              tooltipText="Hemminki H, et al., Eur Urol Open Sci 2024&#10;Madersbacher S, et al., BJU Int. 2010"
              id="familyHistory"
            >
              <select
                id="familyHistory"
                value={preData.familyHistory}
                onChange={(e) => handlePreChange('familyHistory', e.target.value)}
              >
                <option value="">Select...</option>
                <option value="none">None</option>
                <option value="1-relative">1 first-degree relative</option>
                <option value="2+relatives">2+ first-degree relatives</option>
              </select>
            </FormField>

            <FormField
              label="Known Genetic Mutation"
              tooltipText="Hemminki H, et al., Eur Urol Open Sci 2024&#10;Giri VN, et al., J Clin Oncol. 2018"
              id="geneticRisk"
            >
              <select
                id="geneticRisk"
                value={preData.geneticRisk}
                onChange={(e) => handlePreChange('geneticRisk', e.target.value)}
              >
                <option value="">Select...</option>
                <option value="none">None / Unknown</option>
                <option value="known-mutation">Known high-risk mutation (BRCA2, HOXB13, Lynch, etc.)</option>
              </select>
            </FormField>

            <FormField
              label="Race (Optional, self-identified)"
              tooltipText="Tewari A., et al. Urol Onc 2005&#10;Loeb S, et al., Urology 2006&#10;Brawley O, World J Urol. 2012"
              id="race"
            >
              <select
                id="race"
                value={preData.race}
                onChange={(e) => handlePreChange('race', e.target.value)}
              >
                <option value="">Select...</option>
                <option value="white-asian">White / Asian</option>
                <option value="hispanic">Hispanic</option>
                <option value="black">Black or African American</option>
              </select>
            </FormField>
          </StepForm>
        );

      case 2:
        return (
          <StepForm
            step={2}
            title={PRE_STEPS[1].title}
            description={PRE_STEPS[1].description}
            onNext={handlePreNext}
            onPrevious={handlePrePrevious}
            canProceed={canProceedPre()}
          >
            <FormField
              label="Prior PSA test?"
              tooltipText="Have you had a PSA test before?"
              id="priorPsa"
            >
              <select
                id="priorPsa"
                value={preData.priorPsa}
                onChange={(e) => handlePreChange('priorPsa', e.target.value)}
              >
                <option value="">Select...</option>
                <option value="never">Never</option>
                <option value="normal">Yes – normal</option>
                <option value="elevated">Yes – previously elevated</option>
                <option value="not-sure">Not sure</option>
              </select>
            </FormField>

            <FormField
              label="Prior prostate biopsy?"
              tooltipText="Have you had a prostate biopsy?"
              id="priorBiopsy"
            >
              <select
                id="priorBiopsy"
                value={preData.priorBiopsy}
                onChange={(e) => handlePreChange('priorBiopsy', e.target.value)}
              >
                <option value="">Select...</option>
                <option value="no">No</option>
                <option value="negative">Yes – negative</option>
                <option value="cancer">Yes – cancer diagnosed</option>
              </select>
            </FormField>

            <FormField
              label="Taking finasteride or dutasteride?"
              tooltipText="These medications can affect PSA levels"
              id="finasteride"
            >
              <select
                id="finasteride"
                value={preData.finasteride}
                onChange={(e) => handlePreChange('finasteride', e.target.value)}
              >
                <option value="">Select...</option>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </FormField>
          </StepForm>
        );

      case 3:
        return (
          <div className="pre-results-step">
            {preResult && <PreResults result={preResult} />}
            <div className="stage-actions">
              <button
                onClick={() => {
                  setStage('post');
                  setCurrentStep(1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="btn btn-primary"
                disabled={!preResult || preResult.priority === null}
              >
                Continue to Risk Assessment →
              </button>
              <button
                onClick={() => {
                  setCurrentStep(1);
                  setPreData({
                    age: '',
                    familyHistory: '',
                    geneticRisk: '',
                    race: '',
                    priorPsa: '',
                    priorBiopsy: '',
                    finasteride: ''
                  });
                  setPreResult(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="btn btn-secondary"
              >
                Start Over
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderPostStage = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepForm
            step={1}
            title={POST_STEPS[0].title}
            description={POST_STEPS[0].description}
            onNext={handlePostNext}
            onPrevious={() => {
              setStage('pre');
              setCurrentStep(3);
            }}
            canProceed={canProceedPost()}
          >
            <FormField
              label="Do you know your PSA level?"
              tooltipText="PSA (Prostate-Specific Antigen) is a blood test"
              id="knowPsa"
            >
              <select
                id="knowPsa"
                value={postData.psa ? 'yes' : 'no'}
                onChange={(e) => {
                  if (e.target.value === 'no') {
                    handlePostChange('psa', '');
                  }
                }}
              >
                <option value="no">No, I don't know my PSA</option>
                <option value="yes">Yes, I know my PSA level</option>
              </select>
            </FormField>

            {postData.psa !== '' && (
              <FormField
                label="Enter PSA Level (ng/mL)"
                id="psa"
              >
                <input
                  type="number"
                  id="psa"
                  step="0.1"
                  min="0"
                  value={postData.psa}
                  onChange={(e) => handlePostChange('psa', e.target.value)}
                  placeholder="e.g., 2.5"
                />
              </FormField>
            )}
          </StepForm>
        );

      case 2:
        return (
          <StepForm
            step={2}
            title={POST_STEPS[1].title}
            description={POST_STEPS[1].description}
            onNext={handlePostNext}
            onPrevious={handlePostPrevious}
            canProceed={canProceedPost()}
            isLastStep={true}
          >
            <FormField
              label="Do you know your MRI PIRADS score?"
              tooltipText="Park KJ, et al., J Urol. 2020&#10;Oerther B, et al., Prostate Cancer 2021"
              id="knowPirads"
            >
              <select
                id="knowPirads"
                value={postData.knowPirads ? 'yes' : 'no'}
                onChange={(e) => handlePostChange('knowPirads', e.target.value === 'yes')}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </FormField>

            {postData.knowPirads && (
              <FormField
                label="PIRADS Score on MRI"
                id="pirads"
              >
                <select
                  id="pirads"
                  value={postData.pirads}
                  onChange={(e) => handlePostChange('pirads', e.target.value)}
                >
                  <option value="0">Select...</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </FormField>
            )}
          </StepForm>
        );

      case 3:
        return (
          <div className="post-results-step">
            {postResult && <Results result={postResult} />}
            <div className="stage-actions">
              <button
                onClick={() => {
                  setStage('pre');
                  setCurrentStep(1);
                  setPreData({
                    age: '',
                    familyHistory: '',
                    geneticRisk: '',
                    race: '',
                    priorPsa: '',
                    priorBiopsy: '',
                    finasteride: ''
                  });
                  setPostData({
                    psa: '',
                    knowPirads: false,
                    pirads: '0'
                  });
                  setPreResult(null);
                  setPostResult(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="btn btn-secondary"
              >
                Start Over
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="App">
      <div className="container">
        <header className="app-header">
          <div className="header-text">
            <h1>ePSA</h1>
            <h2>Prostate‑Specific Awareness</h2>
            <p className="subtitle">A Non‑Validated Educational Risk Tool</p>
          </div>
          <div className="stage-indicator">
            {stage === 'pre' ? (
              <span className="stage-badge stage-pre">Stage 1: Screening Priority</span>
            ) : (
              <span className="stage-badge stage-post">Stage 2: Risk Assessment</span>
            )}
          </div>
        </header>

        {stage === 'pre' && currentStep < 3 && (
          <StepNavigation
            currentStep={currentStep}
            totalSteps={2}
            onStepClick={(step) => {
              if (step <= currentStep) {
                setCurrentStep(step);
              }
            }}
            stepLabels={PRE_STEPS.slice(0, 2).map(s => s.label)}
          />
        )}

        {stage === 'post' && currentStep < 3 && (
          <StepNavigation
            currentStep={currentStep}
            totalSteps={2}
            onStepClick={(step) => {
              if (step <= currentStep) {
                setCurrentStep(step);
              }
            }}
            stepLabels={POST_STEPS.slice(0, 2).map(s => s.label)}
          />
        )}

        {stage === 'pre' && renderPreStage()}
        {stage === 'post' && renderPostStage()}
      </div>
    </div>
  );
}

export default App;
