import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './PrintableForm.css';

const PrintableForm = ({ onBack, formData }) => {
  const formRef = useRef(null);

  // Collect current form values from the DOM (for Export JSON after filling out the form)
  const getFormDataFromPrintForm = (container) => {
    if (!container) return null;
    const getRadio = (name) => {
      const el = container.querySelector(`input[name="${name}"]:checked`);
      return el ? el.value : '';
    };
    const getInput = (selector) => {
      const el = container.querySelector(selector);
      return el ? el.value.trim() : '';
    };
    const ipss = [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const v = getRadio(`ipss-${i}`);
      return v === '' ? null : parseInt(v, 10);
    });
    const shim = [0, 1, 2, 3, 4].map((i) => {
      const v = getRadio(`shim-${i}`);
      return v === '' ? null : parseInt(v, 10);
    });
    const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
    const formDataOut = {
      age: getInput('input[name="age"]'),
      race: getRadio('race') || null,
      familyHistory: num(getRadio('family')),
      inflammationHistory: num(getRadio('inflammation')),
      brcaStatus: getRadio('brca') || null,
      heightUnit: getRadio('heightUnit') || 'imperial',
      heightFt: getInput('input[name="heightFt"]'),
      heightIn: getInput('input[name="heightIn"]'),
      heightCm: getInput('input[name="heightCm"]'),
      weightUnit: getRadio('weightUnit') || 'lbs',
      weight: getInput('input[name="weight"]'),
      weightKg: getInput('input[name="weightKg"]'),
      bmi: num(getInput('input[name="bmi"]')) || null,
      exercise: num(getRadio('exercise')),
      smoking: num(getRadio('smoking')),
      chemicalExposure: getRadio('chemicalExposure') || null,
      dietPattern: getRadio('dietPattern') || null,
      comorbidityScore: (() => {
        const v = getRadio('comorbidityScore');
        return v === '' ? null : Math.min(2, Math.max(0, parseInt(v, 10)));
      })(),
      hypertension: num(getRadio('hypertension')),
      hyperlipidemia: num(getRadio('hyperlipidemia')),
      coronaryArteryDisease: num(getRadio('coronaryArteryDisease')),
      diabetes: num(getRadio('diabetes')),
      ipss,
      shim,
    };
    return formDataOut;
  };

  const handleExportJson = () => {
    const data = getFormDataFromPrintForm(formRef.current);
    if (!data) return;
    const payload = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      part: 'part1',
      formData: data,
      userInfo: { email: null, phone: null, sessionId: null },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `epsa-part1-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper function to check if a radio should be checked
  const isChecked = (fieldName, value) => {
    if (!formData) return false;
    
    if (fieldName === 'comorbidityScore') {
      const s = formData.comorbidityScore;
      if (s !== undefined && s !== null) return Number(s) === Number(value);
      const h = formData.hypertension; const hld = formData.hyperlipidemia; const cad = formData.coronaryArteryDisease; const d = formData.diabetes;
      const isY = (v) => v === 'yes' || v === true || v === 1;
      const n = [h, hld, cad, d].filter(isY).length;
      const derived = n >= 2 ? 2 : n;
      return Number(derived) === Number(value);
    }
    
    // Handle array fields like ipss and shim
    if (fieldName.includes('.')) {
      const [arrayName, index] = fieldName.split('.');
      const array = formData[arrayName];
      if (Array.isArray(array)) {
        return array[parseInt(index)] === value;
      }
    }
    
    return formData[fieldName] === value;
  };

  // Helper function to get field value
  const getFieldValue = (fieldName, defaultValue = '') => {
    if (!formData) return defaultValue;
    return formData[fieldName] ?? defaultValue;
  };

  const getArrayTotal = (fieldName) => {
    const values = formData?.[fieldName];
    if (!Array.isArray(values)) return '';

    const answeredValues = values.filter((value) => value !== null && value !== undefined && value !== '');
    if (!answeredValues.length) return '';

    return answeredValues.reduce((sum, value) => sum + Number(value), 0);
  };

  const ipssTotal = getFieldValue('ipssTotal', getArrayTotal('ipss'));
  const shimTotal = getFieldValue('shimTotal', getArrayTotal('shim'));

  const handlePrint = async () => {
    if (!formRef.current) return;

    try {
      // Show loading state
      const printButton = document.querySelector('.btn-print');
      if (!printButton) return;
      const originalText = printButton.textContent;
      printButton.textContent = 'Generating PDF...';
      printButton.disabled = true;

      // Convert form to canvas
      const canvas = await html2canvas(formRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: formRef.current.scrollWidth,
        height: formRef.current.scrollHeight,
        windowWidth: formRef.current.scrollWidth,
        windowHeight: formRef.current.scrollHeight,
        allowTaint: false,
        removeContainer: false,
      });

      const pdf = new jsPDF('portrait', 'pt', 'letter');
      const margin = 20;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;

      const fullImageHeight = (canvas.height * contentWidth) / canvas.width;

      // If the form fits on one page, keep output simple.
      if (fullImageHeight <= contentHeight) {
        const imgData = canvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, fullImageHeight, undefined, 'FAST');
      } else {
        // Split tall forms across pages so the PDF is fully readable.
        const sourcePageHeight = Math.floor((contentHeight * canvas.width) / contentWidth);
        let sourceOffsetY = 0;
        let pageIndex = 0;

        while (sourceOffsetY < canvas.height) {
          const pageCanvas = document.createElement('canvas');
          const remainingHeight = canvas.height - sourceOffsetY;
          const thisSourceHeight = Math.min(sourcePageHeight, remainingHeight);

          pageCanvas.width = canvas.width;
          pageCanvas.height = thisSourceHeight;

          const pageContext = pageCanvas.getContext('2d');
          if (!pageContext) break;

          pageContext.fillStyle = '#ffffff';
          pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          pageContext.drawImage(
            canvas,
            0,
            sourceOffsetY,
            canvas.width,
            thisSourceHeight,
            0,
            0,
            canvas.width,
            thisSourceHeight,
          );

          if (pageIndex > 0) {
            pdf.addPage();
          }

          const pageImageHeight = (thisSourceHeight * contentWidth) / canvas.width;
          const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
          pdf.addImage(pageImgData, 'PNG', margin, margin, contentWidth, pageImageHeight, undefined, 'FAST');

          sourceOffsetY += thisSourceHeight;
          pageIndex += 1;
        }
      }
      
      // Save PDF
      pdf.save('ePSA-Questionnaire.pdf');

      // Restore button
      printButton.textContent = originalText;
      printButton.disabled = false;
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback to regular print
      window.print();
      const printButton = document.querySelector('.btn-print');
      printButton.disabled = false;
    }
  };

  return (
    <div className="printable-form-container">
      <div className="form-actions">
        {onBack && (
          <button className="btn-back" onClick={onBack}>
            ← Back
          </button>
        )}
        <button className="btn-print" onClick={handlePrint}>
          Download PDF
        </button>
        <button type="button" className="btn-export-json" onClick={handleExportJson}>
          Export JSON
        </button>
      </div>
      <div className="printable-form-content" ref={formRef}>
        <div className="print-instructions">
          <strong>How to use this form:</strong> Please review each section with the patient and fill in any blank fields.
          If a value is already shown, confirm it is correct. Use the <strong>Notes</strong> box for details such as medications,
          recent lab history, symptoms, or follow-up plans.
        </div>
        <div className="printable-header">
        <div className="header-top-row">
          <div className="notes-box">
            <label className="notes-label">Notes:</label>
            <textarea className="notes-input" placeholder="Enter notes here..." rows="2"></textarea>
          </div>
          <div className="header-center">
            <div className="printable-logo-container">
              <img 
                src="/logo.png"
                alt="ePSA Logo" 
                className="printable-logo"
                onError={(e) => {
                  if (e.target.src.includes('logo.png')) {
                    e.target.src = '/logo.jpg';
                  } else {
                    e.target.style.display = 'none';
                  }
                }}
              />
            </div>
            <div className="printable-title-section">
              <div className="printable-title">Million Strong Men — ePSA</div>
              <h1 className="printable-heading">ePSA Questionnaire</h1>
              <p className="printable-tagline">Prostate-Specific Awareness | A Non-Validated Educational Risk Tool</p>
            </div>
          </div>
          <div className="phone-box">
            <label className="phone-label">Phone Number:</label>
            <input type="text" className="phone-input" placeholder="(___)-___-____" />
          </div>
        </div>
      </div>

      <div className="printable-body">
        <div className="section-divider">
          <span className="section-label">About You</span>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">1.</span> Age:
              <input type="text" name="age" className="field-input-inline" placeholder="____" defaultValue={getFieldValue('age')} />
            </label>
          </div>
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">2.</span> Race / Ethnicity:
              <label className="checkbox-inline"><input type="radio" name="race" value="white" defaultChecked={isChecked('race', 'white')} /> White</label>
              <label className="checkbox-inline"><input type="radio" name="race" value="black" defaultChecked={isChecked('race', 'black')} /> Black</label>
              <label className="checkbox-inline"><input type="radio" name="race" value="hispanic" defaultChecked={isChecked('race', 'hispanic')} /> Hispanic</label>
              <label className="checkbox-inline"><input type="radio" name="race" value="asian" defaultChecked={isChecked('race', 'asian')} /> Asian</label>
              <label className="checkbox-inline"><input type="radio" name="race" value="other" defaultChecked={isChecked('race', 'other')} /> Other</label>
            </label>
          </div>
        </div>

        <div className="section-divider">
          <span className="section-label">Family & Genetic Risk</span>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">3.</span> Family History of prostate cancer:
              <label className="checkbox-inline"><input type="radio" name="family" value="0" defaultChecked={isChecked('familyHistory', 0)} /> None</label>
              <label className="checkbox-inline"><input type="radio" name="family" value="1" defaultChecked={isChecked('familyHistory', 1)} /> 1 relative</label>
              <label className="checkbox-inline"><input type="radio" name="family" value="2" defaultChecked={isChecked('familyHistory', 2)} /> 2+ relatives</label>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">4.</span> Previous History of Inflammation:
              <label className="checkbox-inline"><input type="radio" name="inflammation" value="0" defaultChecked={isChecked('inflammationHistory', 0)} /> No</label>
              <label className="checkbox-inline"><input type="radio" name="inflammation" value="1" defaultChecked={isChecked('inflammationHistory', 1)} /> Yes</label>
              <div style={{ fontSize: '11px', fontStyle: 'italic', marginTop: '4px', marginLeft: '20px' }}>
                (ex. Ulcerative Colitis, Crohn's disease, chronic prostatitis)
              </div>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">5.</span> Known BRCA1/BRCA2 mutation:
              <label className="checkbox-inline"><input type="radio" name="brca" value="yes" defaultChecked={isChecked('brcaStatus', 'yes')} /> Yes</label>
              <label className="checkbox-inline"><input type="radio" name="brca" value="no" defaultChecked={isChecked('brcaStatus', 'no')} /> No</label>
              <label className="checkbox-inline"><input type="radio" name="brca" value="unknown" defaultChecked={isChecked('brcaStatus', 'unknown')} /> Unknown</label>
            </label>
          </div>
        </div>

        <div className="section-divider">
          <span className="section-label">Body Metrics</span>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">6.</span> Height:
              <label className="checkbox-inline"><input type="radio" name="heightUnit" value="imperial" defaultChecked={getFieldValue('heightUnit') !== 'metric'} /> Feet/Inches</label>
              <input type="text" name="heightFt" className="field-input-tiny" placeholder="__" defaultValue={getFieldValue('heightFt', '')} /> ft
              <input type="text" name="heightIn" className="field-input-tiny" placeholder="__" defaultValue={getFieldValue('heightIn', '')} /> in
              <label className="checkbox-inline"><input type="radio" name="heightUnit" value="metric" defaultChecked={getFieldValue('heightUnit') === 'metric'} /> Centimeters</label>
              <input type="text" name="heightCm" className="field-input-small" placeholder="___ cm" defaultValue={getFieldValue('heightCm', '')} />
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">7.</span> Weight:
              <label className="checkbox-inline"><input type="radio" name="weightUnit" value="lbs" defaultChecked={getFieldValue('weightUnit') !== 'kg'} /> lbs</label>
              <input type="text" name="weight" className="field-input-small" placeholder="____" defaultValue={getFieldValue('weight', '')} />
              <label className="checkbox-inline"><input type="radio" name="weightUnit" value="kg" defaultChecked={getFieldValue('weightUnit') === 'kg'} /> kg</label>
              <input type="text" name="weightKg" className="field-input-small" placeholder="____" defaultValue={getFieldValue('weightKg', '')} />
              &nbsp;| BMI: <input type="text" name="bmi" className="field-input-tiny" placeholder="___" defaultValue={getFieldValue('bmi', '')} />
            </label>
          </div>
        </div>

        <div className="section-divider">
          <span className="section-label">Lifestyle</span>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">8.</span> Exercise level:
              <label className="checkbox-inline"><input type="radio" name="exercise" value="0" defaultChecked={isChecked('exercise', 0)} /> Regular</label>
              <label className="checkbox-inline"><input type="radio" name="exercise" value="1" defaultChecked={isChecked('exercise', 1)} /> Some</label>
              <label className="checkbox-inline"><input type="radio" name="exercise" value="2" defaultChecked={isChecked('exercise', 2)} /> None</label>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">9.</span> Smoking status:
              <label className="checkbox-inline"><input type="radio" name="smoking" value="0" defaultChecked={isChecked('smoking', 0)} /> Never</label>
              <label className="checkbox-inline"><input type="radio" name="smoking" value="1" defaultChecked={isChecked('smoking', 1)} /> Former</label>
              <label className="checkbox-inline"><input type="radio" name="smoking" value="2" defaultChecked={isChecked('smoking', 2)} /> Current</label>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">10.</span> Chemical exposure (Agent Orange/pesticides):
              <label className="checkbox-inline"><input type="radio" name="chemicalExposure" value="yes" defaultChecked={isChecked('chemicalExposure', 'yes')} /> Yes</label>
              <label className="checkbox-inline"><input type="radio" name="chemicalExposure" value="no" defaultChecked={isChecked('chemicalExposure', 'no')} /> No</label>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">11.</span> Diet pattern:
              <label className="checkbox-inline"><input type="radio" name="dietPattern" value="western" defaultChecked={isChecked('dietPattern', 'western')} /> Western</label>
              <label className="checkbox-inline"><input type="radio" name="dietPattern" value="mediterranean" defaultChecked={isChecked('dietPattern', 'mediterranean')} /> Mediterranean</label>
              <label className="checkbox-inline"><input type="radio" name="dietPattern" value="indian" defaultChecked={isChecked('dietPattern', 'indian')} /> Indian</label>
              <label className="checkbox-inline"><input type="radio" name="dietPattern" value="dash" defaultChecked={isChecked('dietPattern', 'dash')} /> DASH</label>
              <label className="checkbox-inline"><input type="radio" name="dietPattern" value="plant-based" defaultChecked={isChecked('dietPattern', 'plant-based')} /> Plant-based</label>
              <label className="checkbox-inline"><input type="radio" name="dietPattern" value="pescatarian" defaultChecked={isChecked('dietPattern', 'pescatarian')} /> Pescatarian</label>
              <label className="checkbox-inline"><input type="radio" name="dietPattern" value="low-carb-keto" defaultChecked={isChecked('dietPattern', 'low-carb-keto')} /> Low-carb/Keto</label>
              <label className="checkbox-inline"><input type="radio" name="dietPattern" value="other" defaultChecked={isChecked('dietPattern', 'other')} /> Other</label>
            </label>
          </div>
        </div>

        <div className="section-divider">
          <span className="section-label">Comorbidities.</span>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">12.</span> Have you been diagnosed with any of these? (Hypertension, Hyperlipidemia, CAD, Diabetes)
            </label>
          </div>
        </div>
        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              Have you had any of these conditions?
              <label className="checkbox-inline"><input type="radio" name="comorbidityScore" value="0" defaultChecked={isChecked('comorbidityScore', 0)} /> No</label>
              <label className="checkbox-inline"><input type="radio" name="comorbidityScore" value="1" defaultChecked={isChecked('comorbidityScore', 1)} /> Yes, one</label>
              <label className="checkbox-inline"><input type="radio" name="comorbidityScore" value="2" defaultChecked={isChecked('comorbidityScore', 2)} /> Yes, two or more</label>
            </label>
          </div>
        </div>

        <div className="section-divider">
          <span className="section-label">Symptoms</span>
        </div>

        <div className="section-divider">
          <span className="section-label">13. Urinary Symptoms (IPSS) — Rate 0-5:</span>
        </div>
        <p className="score-help-text">IPSS scale reminder: 0 = Not at all, 1 = &lt; 1 in 5, 2 = &lt; Half, 3 = ~ Half, 4 = &gt; Half, 5 = Always.</p>

        <div className="form-row-compact">
          <div className="form-field-compact">
            <label className="field-label-compact">
              Incomplete emptying
              <div className="scale-compact">
                <label><input type="radio" name="ipss-0" value="0" defaultChecked={isChecked('ipss.0', 0)} />0</label>
                <label><input type="radio" name="ipss-0" value="1" defaultChecked={isChecked('ipss.0', 1)} />1</label>
                <label><input type="radio" name="ipss-0" value="2" defaultChecked={isChecked('ipss.0', 2)} />2</label>
                <label><input type="radio" name="ipss-0" value="3" defaultChecked={isChecked('ipss.0', 3)} />3</label>
                <label><input type="radio" name="ipss-0" value="4" defaultChecked={isChecked('ipss.0', 4)} />4</label>
                <label><input type="radio" name="ipss-0" value="5" defaultChecked={isChecked('ipss.0', 5)} />5</label>
              </div>
            </label>
          </div>
          <div className="form-field-compact">
            <label className="field-label-compact">
              Frequency
              <div className="scale-compact">
                <label><input type="radio" name="ipss-1" value="0" defaultChecked={isChecked('ipss.1', 0)} />0</label>
                <label><input type="radio" name="ipss-1" value="1" defaultChecked={isChecked('ipss.1', 1)} />1</label>
                <label><input type="radio" name="ipss-1" value="2" defaultChecked={isChecked('ipss.1', 2)} />2</label>
                <label><input type="radio" name="ipss-1" value="3" defaultChecked={isChecked('ipss.1', 3)} />3</label>
                <label><input type="radio" name="ipss-1" value="4" defaultChecked={isChecked('ipss.1', 4)} />4</label>
                <label><input type="radio" name="ipss-1" value="5" defaultChecked={isChecked('ipss.1', 5)} />5</label>
              </div>
            </label>
          </div>
        </div>

        <div className="form-row-compact">
          <div className="form-field-compact">
            <label className="field-label-compact">
              Intermittency
              <div className="scale-compact">
                <label><input type="radio" name="ipss-2" value="0" defaultChecked={isChecked('ipss.2', 0)} />0</label>
                <label><input type="radio" name="ipss-2" value="1" defaultChecked={isChecked('ipss.2', 1)} />1</label>
                <label><input type="radio" name="ipss-2" value="2" defaultChecked={isChecked('ipss.2', 2)} />2</label>
                <label><input type="radio" name="ipss-2" value="3" defaultChecked={isChecked('ipss.2', 3)} />3</label>
                <label><input type="radio" name="ipss-2" value="4" defaultChecked={isChecked('ipss.2', 4)} />4</label>
                <label><input type="radio" name="ipss-2" value="5" defaultChecked={isChecked('ipss.2', 5)} />5</label>
              </div>
            </label>
          </div>
          <div className="form-field-compact">
            <label className="field-label-compact">
              Urgency
              <div className="scale-compact">
                <label><input type="radio" name="ipss-3" value="0" defaultChecked={isChecked('ipss.3', 0)} />0</label>
                <label><input type="radio" name="ipss-3" value="1" defaultChecked={isChecked('ipss.3', 1)} />1</label>
                <label><input type="radio" name="ipss-3" value="2" defaultChecked={isChecked('ipss.3', 2)} />2</label>
                <label><input type="radio" name="ipss-3" value="3" defaultChecked={isChecked('ipss.3', 3)} />3</label>
                <label><input type="radio" name="ipss-3" value="4" defaultChecked={isChecked('ipss.3', 4)} />4</label>
                <label><input type="radio" name="ipss-3" value="5" defaultChecked={isChecked('ipss.3', 5)} />5</label>
              </div>
            </label>
          </div>
        </div>

        <div className="form-row-compact">
          <div className="form-field-compact">
            <label className="field-label-compact">
              Weak stream
              <div className="scale-compact">
                <label><input type="radio" name="ipss-4" value="0" defaultChecked={isChecked('ipss.4', 0)} />0</label>
                <label><input type="radio" name="ipss-4" value="1" defaultChecked={isChecked('ipss.4', 1)} />1</label>
                <label><input type="radio" name="ipss-4" value="2" defaultChecked={isChecked('ipss.4', 2)} />2</label>
                <label><input type="radio" name="ipss-4" value="3" defaultChecked={isChecked('ipss.4', 3)} />3</label>
                <label><input type="radio" name="ipss-4" value="4" defaultChecked={isChecked('ipss.4', 4)} />4</label>
                <label><input type="radio" name="ipss-4" value="5" defaultChecked={isChecked('ipss.4', 5)} />5</label>
              </div>
            </label>
          </div>
          <div className="form-field-compact">
            <label className="field-label-compact">
              Straining
              <div className="scale-compact">
                <label><input type="radio" name="ipss-5" value="0" defaultChecked={isChecked('ipss.5', 0)} />0</label>
                <label><input type="radio" name="ipss-5" value="1" defaultChecked={isChecked('ipss.5', 1)} />1</label>
                <label><input type="radio" name="ipss-5" value="2" defaultChecked={isChecked('ipss.5', 2)} />2</label>
                <label><input type="radio" name="ipss-5" value="3" defaultChecked={isChecked('ipss.5', 3)} />3</label>
                <label><input type="radio" name="ipss-5" value="4" defaultChecked={isChecked('ipss.5', 4)} />4</label>
                <label><input type="radio" name="ipss-5" value="5" defaultChecked={isChecked('ipss.5', 5)} />5</label>
              </div>
            </label>
          </div>
        </div>

        <div className="form-row-compact">
          <div className="form-field-compact">
            <label className="field-label-compact">
              Nocturia
              <div className="scale-compact">
                <label><input type="radio" name="ipss-6" value="0" defaultChecked={isChecked('ipss.6', 0)} />0</label>
                <label><input type="radio" name="ipss-6" value="1" defaultChecked={isChecked('ipss.6', 1)} />1</label>
                <label><input type="radio" name="ipss-6" value="2" defaultChecked={isChecked('ipss.6', 2)} />2</label>
                <label><input type="radio" name="ipss-6" value="3" defaultChecked={isChecked('ipss.6', 3)} />3</label>
                <label><input type="radio" name="ipss-6" value="4" defaultChecked={isChecked('ipss.6', 4)} />4</label>
                <label><input type="radio" name="ipss-6" value="5" defaultChecked={isChecked('ipss.6', 5)} />5</label>
              </div>
            </label>
          </div>
          <div className="form-field-compact">
            <label className="field-label-compact">
              IPSS Total: <input type="text" className="field-input-tiny" placeholder="___" defaultValue={ipssTotal} /> / 35
            </label>
          </div>
        </div>

        <div className="section-divider">
          <span className="section-label">14. Sexual Health (SHIM):</span>
        </div>
        <p className="score-help-text">SHIM scale reminder: choose one score per item (Q1 scores 1-5; Q2-Q5 score 0-5). Higher total = better erectile function.</p>

        <div className="form-row-compact">
          <div className="form-field-compact">
            <label className="field-label-compact">
              Confidence
              <div className="scale-compact">
                <label><input type="radio" name="shim-0" value="1" defaultChecked={isChecked('shim.0', 1)} />1</label>
                <label><input type="radio" name="shim-0" value="2" defaultChecked={isChecked('shim.0', 2)} />2</label>
                <label><input type="radio" name="shim-0" value="3" defaultChecked={isChecked('shim.0', 3)} />3</label>
                <label><input type="radio" name="shim-0" value="4" defaultChecked={isChecked('shim.0', 4)} />4</label>
                <label><input type="radio" name="shim-0" value="5" defaultChecked={isChecked('shim.0', 5)} />5</label>
              </div>
            </label>
          </div>
          <div className="form-field-compact">
            <label className="field-label-compact">
              Hard enough
              <div className="scale-compact">
                <label><input type="radio" name="shim-1" value="0" defaultChecked={isChecked('shim.1', 0)} />0</label>
                <label><input type="radio" name="shim-1" value="1" defaultChecked={isChecked('shim.1', 1)} />1</label>
                <label><input type="radio" name="shim-1" value="2" defaultChecked={isChecked('shim.1', 2)} />2</label>
                <label><input type="radio" name="shim-1" value="3" defaultChecked={isChecked('shim.1', 3)} />3</label>
                <label><input type="radio" name="shim-1" value="4" defaultChecked={isChecked('shim.1', 4)} />4</label>
                <label><input type="radio" name="shim-1" value="5" defaultChecked={isChecked('shim.1', 5)} />5</label>
              </div>
            </label>
          </div>
        </div>

        <div className="form-row-compact">
          <div className="form-field-compact">
            <label className="field-label-compact">
              Maintain after
              <div className="scale-compact">
                <label><input type="radio" name="shim-2" value="0" defaultChecked={isChecked('shim.2', 0)} />0</label>
                <label><input type="radio" name="shim-2" value="1" defaultChecked={isChecked('shim.2', 1)} />1</label>
                <label><input type="radio" name="shim-2" value="2" defaultChecked={isChecked('shim.2', 2)} />2</label>
                <label><input type="radio" name="shim-2" value="3" defaultChecked={isChecked('shim.2', 3)} />3</label>
                <label><input type="radio" name="shim-2" value="4" defaultChecked={isChecked('shim.2', 4)} />4</label>
                <label><input type="radio" name="shim-2" value="5" defaultChecked={isChecked('shim.2', 5)} />5</label>
              </div>
            </label>
          </div>
          <div className="form-field-compact">
            <label className="field-label-compact">
              Difficulty maintain
              <div className="scale-compact">
                <label><input type="radio" name="shim-3" value="0" defaultChecked={isChecked('shim.3', 0)} />0</label>
                <label><input type="radio" name="shim-3" value="1" defaultChecked={isChecked('shim.3', 1)} />1</label>
                <label><input type="radio" name="shim-3" value="2" defaultChecked={isChecked('shim.3', 2)} />2</label>
                <label><input type="radio" name="shim-3" value="3" defaultChecked={isChecked('shim.3', 3)} />3</label>
                <label><input type="radio" name="shim-3" value="4" defaultChecked={isChecked('shim.3', 4)} />4</label>
                <label><input type="radio" name="shim-3" value="5" defaultChecked={isChecked('shim.3', 5)} />5</label>
              </div>
            </label>
          </div>
        </div>

        <div className="form-row-compact">
          <div className="form-field-compact">
            <label className="field-label-compact">
              Satisfactory
              <div className="scale-compact">
                <label><input type="radio" name="shim-4" value="0" defaultChecked={isChecked('shim.4', 0)} />0</label>
                <label><input type="radio" name="shim-4" value="1" defaultChecked={isChecked('shim.4', 1)} />1</label>
                <label><input type="radio" name="shim-4" value="2" defaultChecked={isChecked('shim.4', 2)} />2</label>
                <label><input type="radio" name="shim-4" value="3" defaultChecked={isChecked('shim.4', 3)} />3</label>
                <label><input type="radio" name="shim-4" value="4" defaultChecked={isChecked('shim.4', 4)} />4</label>
                <label><input type="radio" name="shim-4" value="5" defaultChecked={isChecked('shim.4', 5)} />5</label>
              </div>
            </label>
          </div>
          <div className="form-field-compact">
            <label className="field-label-compact">
              SHIM Total: <input type="text" className="field-input-tiny" placeholder="___" defaultValue={shimTotal} /> / 25
            </label>
          </div>
        </div>

        <div className="section-divider">
          <span className="section-label">Part 2: Clinical Data</span>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">15.</span> PSA Level (ng/mL):
              <input type="text" className="field-input-small" placeholder="____" defaultValue={getFieldValue('psa', '')} />
            </label>
          </div>
          <div className="form-field-inline">
            <label className="field-label-inline">
              On hormonal therapy affecting PSA:
              <label className="checkbox-inline"><input type="checkbox" defaultChecked={isChecked('onHormonalTherapy', true)} /> Yes</label>
              <label className="checkbox-inline"><input type="checkbox" defaultChecked={isChecked('onHormonalTherapy', false)} /> No</label>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              Medication:
              <label className="checkbox-inline"><input type="checkbox" defaultChecked={isChecked('hormonalTherapyType', 'finasteride')} /> Finasteride</label>
              <label className="checkbox-inline"><input type="checkbox" defaultChecked={isChecked('hormonalTherapyType', 'dutasteride')} /> Dutasteride</label>
              <label className="checkbox-inline"><input type="checkbox" defaultChecked={isChecked('hormonalTherapyType', 'other')} /> Other</label>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">16.</span> MRI PIRADS Score:
              <label className="checkbox-inline"><input type="radio" name="pirads" value="na" defaultChecked={!getFieldValue('knowPirads', false)} /> Not applicable</label>
              <label className="checkbox-inline"><input type="radio" name="pirads" value="1" defaultChecked={getFieldValue('knowPirads', false) && isChecked('pirads', '1')} /> 1</label>
              <label className="checkbox-inline"><input type="radio" name="pirads" value="2" defaultChecked={getFieldValue('knowPirads', false) && isChecked('pirads', '2')} /> 2</label>
              <label className="checkbox-inline"><input type="radio" name="pirads" value="3" defaultChecked={getFieldValue('knowPirads', false) && isChecked('pirads', '3')} /> 3</label>
              <label className="checkbox-inline"><input type="radio" name="pirads" value="4" defaultChecked={getFieldValue('knowPirads', false) && isChecked('pirads', '4')} /> 4</label>
              <label className="checkbox-inline"><input type="radio" name="pirads" value="5" defaultChecked={getFieldValue('knowPirads', false) && isChecked('pirads', '5')} /> 5</label>
            </label>
          </div>
        </div>

        <div className="printable-footer">
          <p className="footer-text">
            For educational and research purposes. Not for clinical decision-making without physician review. | Ashutosh K. Tewari, MD — Department of Urology — Mount Sinai Health System
          </p>
        </div>
      </div>
      </div>
    </div>
  );
};

export default PrintableForm;
