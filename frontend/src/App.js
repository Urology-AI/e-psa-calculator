import React, { useState, useMemo } from 'react';
import './App.css';
import StepNavigation from './components/StepNavigation';
import StepForm from './components/StepForm';
import FormField from './components/FormField';
import Results from './components/Results';
import { calculateRisk, calculateBMI } from './utils/riskCalculator';

const STEPS = [
  { id: 1, label: 'Basic Info', title: 'Non-Modifiable Risk Factors', description: 'Tell us about factors you cannot change' },
  { id: 2, label: 'Biomarkers', title: 'Biomarkers and Imaging', description: 'Share any test results you may have' },
  { id: 3, label: 'Lifestyle', title: 'Modifiable Risk Factors', description: 'Help us understand your lifestyle factors' },
  { id: 4, label: 'Symptoms', title: 'Urinary Symptoms', description: 'Rate your urinary symptoms (IPSS)' },
  { id: 5, label: 'Results', title: 'Your Risk Assessment', description: 'View your personalized results' }
];

function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    age: '0',
    familyHistory: '1',
    race: '20',
    geneticRisk: '0',
    comorbidities: '0',
    smoking: '0',
    exercise: '5',
    diet: '5',
    heightFeet: '',
    heightInches: '',
    weight: '',
    knowPsa: false,
    psa: '',
    knowPirads: false,
    pirads: '0',
    ipssScores: ['0', '0', '0', '0', '0', '0', '0']
  });

  const [result, setResult] = useState(null);

  const bmi = useMemo(() => {
    return calculateBMI(
      parseInt(formData.heightFeet) || 0,
      parseInt(formData.heightInches) || 0,
      parseFloat(formData.weight) || 0
    );
  }, [formData.heightFeet, formData.heightInches, formData.weight]);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleIPSSChange = (index, value) => {
    const newScores = [...formData.ipssScores];
    newScores[index] = value;
    setFormData(prev => ({
      ...prev,
      ipssScores: newScores
    }));
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 4) {
      // Calculate and show results
      const calculatedResult = calculateRisk(formData);
      setResult(calculatedResult);
      setCurrentStep(5);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStepClick = (stepNum) => {
    if (stepNum <= currentStep || stepNum === 5) {
      setCurrentStep(stepNum);
      if (stepNum === 5 && result) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.age !== '';
      case 2:
        return true; // Optional fields
      case 3:
        return formData.heightFeet && formData.weight;
      case 4:
        return formData.ipssScores.every(score => score !== '');
      default:
        return true;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepForm
            step={1}
            title={STEPS[0].title}
            description={STEPS[0].description}
            onNext={handleNext}
            onPrevious={handlePrevious}
            canProceed={canProceed()}
          >
            <FormField
              label="Age Group"
              tooltipText="SEER Database, cancer.gov&#10;Godtman RA, et al., Eur Urol. 2022&#10;Nemesure B, et al., Res Rep Urol. 2022"
              id="age"
            >
              <select
                id="age"
                value={formData.age}
                onChange={(e) => handleChange('age', e.target.value)}
              >
                <option value="0">40-49</option>
                <option value="10">50-59</option>
                <option value="20">60-69</option>
                <option value="30">70+</option>
              </select>
            </FormField>

            <FormField
              label="Family History of Prostate Cancer"
              tooltipText="Hemminki H, et al., Eur Urol Open Sci 2024&#10;Madersbacher S, et al., BJU Int. 2010"
              id="familyHistory"
            >
              <select
                id="familyHistory"
                value={formData.familyHistory}
                onChange={(e) => handleChange('familyHistory', e.target.value)}
              >
                <option value="1">No history</option>
                <option value="2.2">1 first-degree relative (2.2x risk)</option>
                <option value="3.7">2+ relatives (3.7x risk)</option>
              </select>
            </FormField>

            <FormField
              label="Genetic Risk (Mutation)"
              tooltipText="Hemminki H, et al., Eur Urol Open Sci 2024&#10;Giri VN, et al., J Clin Oncol. 2018"
              id="geneticRisk"
            >
              <select
                id="geneticRisk"
                value={formData.geneticRisk}
                onChange={(e) => handleChange('geneticRisk', e.target.value)}
              >
                <option value="0">No Mutations or Unknown</option>
                <option value="20">High-risk mutation (BRCA2, BRCA1, HOXB13, CHEK2, PALB2, ATM)</option>
              </select>
            </FormField>

            <FormField
              label="Race"
              tooltipText="Tewari A., et al. Urol Onc 2005&#10;Loeb S, et al., Urology 2006&#10;Brawley O, World J Urol. 2012"
              id="race"
            >
              <select
                id="race"
                value={formData.race}
                onChange={(e) => handleChange('race', e.target.value)}
              >
                <option value="20">Black or African American</option>
                <option value="0">White</option>
                <option value="0">Asian</option>
                <option value="10">Hispanic</option>
              </select>
            </FormField>
          </StepForm>
        );

      case 2:
        return (
          <StepForm
            step={2}
            title={STEPS[1].title}
            description={STEPS[1].description}
            onNext={handleNext}
            onPrevious={handlePrevious}
            canProceed={canProceed()}
          >
            <FormField
              label="Do you know your PSA level?"
              tooltipText="Loeb S, et al., Urology 2006&#10;AUA/SUO Screening Guidelines 2023"
              id="knowPsa"
            >
              <select
                id="knowPsa"
                value={formData.knowPsa ? 'yes' : 'no'}
                onChange={(e) => handleChange('knowPsa', e.target.value === 'yes')}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </FormField>

            {formData.knowPsa && (
              <FormField
                label="Enter PSA Level (ng/mL)"
                id="psa"
              >
                <input
                  type="number"
                  id="psa"
                  step="0.1"
                  value={formData.psa}
                  onChange={(e) => handleChange('psa', e.target.value)}
                  placeholder="e.g., 2.5"
                />
              </FormField>
            )}

            <FormField
              label="Do you know your MRI PIRADS score?"
              tooltipText="Park KJ, et al., J Urol. 2020&#10;Oerther B, et al., Prostate Cancer 2021"
              id="knowPirads"
            >
              <select
                id="knowPirads"
                value={formData.knowPirads ? 'yes' : 'no'}
                onChange={(e) => handleChange('knowPirads', e.target.value === 'yes')}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </FormField>

            {formData.knowPirads && (
              <FormField
                label="PIRADS Score on MRI"
                id="pirads"
              >
                <select
                  id="pirads"
                  value={formData.pirads}
                  onChange={(e) => handleChange('pirads', e.target.value)}
                >
                  <option value="0">Select...</option>
                  <option value="0">1</option>
                  <option value="10">2</option>
                  <option value="20">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </FormField>
            )}
          </StepForm>
        );

      case 3:
        return (
          <StepForm
            step={3}
            title={STEPS[2].title}
            description={STEPS[2].description}
            onNext={handleNext}
            onPrevious={handlePrevious}
            canProceed={canProceed()}
          >
            <FormField
              label="Comorbidities"
              tooltipText="Blanc-Lapierre A, et al., BMC Public Health 2015&#10;Zhu D, et al., Clin Genitourin Cancer 2022"
              id="comorbidities"
            >
              <select
                id="comorbidities"
                value={formData.comorbidities}
                onChange={(e) => handleChange('comorbidities', e.target.value)}
              >
                <option value="0">None</option>
                <option value="5">Diabetes</option>
                <option value="5">Cardiovascular Disease (e.g. high blood pressure)</option>
                <option value="15">Both conditions</option>
              </select>
            </FormField>

            <FormField
              label="Height"
              id="height"
              className="height-weight-group"
            >
              <div className="height-inputs">
                <input
                  type="number"
                  id="heightFeet"
                  placeholder="ft"
                  min="0"
                  value={formData.heightFeet}
                  onChange={(e) => handleChange('heightFeet', e.target.value)}
                />
                <span>ft</span>
                <input
                  type="number"
                  id="heightInches"
                  placeholder="in"
                  min="0"
                  max="11"
                  value={formData.heightInches}
                  onChange={(e) => handleChange('heightInches', e.target.value)}
                />
                <span>in</span>
              </div>
            </FormField>

            <FormField
              label="Weight"
              id="weight"
              className="height-weight-group"
            >
              <div className="weight-input">
                <input
                  type="number"
                  id="weight"
                  value={formData.weight}
                  onChange={(e) => handleChange('weight', e.target.value)}
                  placeholder="lbs"
                />
                <span>lbs</span>
              </div>
            </FormField>

            <FormField
              label={`BMI: ${bmi.value} (${bmi.category})`}
              tooltipText="Zhu D, et al., Clin Genitourin Cancer 2022"
              id="bmi"
            >
              <div className="bmi-display"></div>
            </FormField>

            <FormField
              label="Smoking Status"
              tooltipText="Plaskon LA, et al., Cancer Epidemiol Biomarkers Prev. 2003"
              id="smoking"
            >
              <select
                id="smoking"
                value={formData.smoking}
                onChange={(e) => handleChange('smoking', e.target.value)}
              >
                <option value="0">Never</option>
                <option value="10">Former Smoker</option>
                <option value="20">Current Smoker</option>
              </select>
            </FormField>

            <FormField
              label="Exercise Frequency"
              tooltipText="Rogers LQ, et al., BMC Public Health 2008"
              id="exercise"
            >
              <select
                id="exercise"
                value={formData.exercise}
                onChange={(e) => handleChange('exercise', e.target.value)}
              >
                <option value="5">Some Exercise</option>
                <option value="0">Regular Exercise</option>
                <option value="10">No Exercise</option>
              </select>
            </FormField>

            <FormField
              label="Diet Type"
              tooltipText="Su ZT, et al., JAMA Oncol. 2024&#10;Andersson SO, et al., Int J Cancer. 1996"
              id="diet"
            >
              <select
                id="diet"
                value={formData.diet}
                onChange={(e) => handleChange('diet', e.target.value)}
              >
                <option value="5">Mixed diet</option>
                <option value="0">Healthy diet (plant-based, high in vegetables)</option>
                <option value="10">High red meat</option>
              </select>
            </FormField>
          </StepForm>
        );

      case 4:
        return (
          <StepForm
            step={4}
            title={STEPS[3].title}
            description={STEPS[3].description}
            onNext={handleNext}
            onPrevious={handlePrevious}
            canProceed={canProceed()}
            isLastStep={true}
          >
            {[
              'Incomplete emptying',
              'Frequency',
              'Intermittency',
              'Urgency',
              'Weak stream',
              'Straining',
              'Nocturia'
            ].map((question, index) => (
              <FormField
                key={index}
                label={`${index + 1}. ${question}:`}
                id={`q${index + 1}`}
              >
                <select
                  id={`q${index + 1}`}
                  value={formData.ipssScores[index]}
                  onChange={(e) => handleIPSSChange(index, e.target.value)}
                >
                  <option value="0">0 - Never</option>
                  <option value="1">1 - Less than 1/5 times</option>
                  <option value="2">2 - Less than half the time</option>
                  <option value="3">3 - About half the time</option>
                  <option value="4">4 - More than half the time</option>
                  <option value="5">5 - Almost always</option>
                </select>
              </FormField>
            ))}
          </StepForm>
        );

      case 5:
        return (
          <div className="results-step">
            {result ? (
              <Results result={result} />
            ) : (
              <div className="loading-results">Calculating your risk...</div>
            )}
            <div className="results-actions">
              <button
                onClick={() => {
                  setCurrentStep(1);
                  setResult(null);
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
        </header>

        {currentStep < 5 && (
          <StepNavigation
            currentStep={currentStep}
            totalSteps={4}
            onStepClick={handleStepClick}
            stepLabels={STEPS.slice(0, 4).map(s => s.label)}
          />
        )}

        {renderStepContent()}
      </div>
    </div>
  );
}

export default App;
