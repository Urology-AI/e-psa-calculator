import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './PrintableForm.css';

const PrintableForm = ({ onBack, formData }) => {
  const formRef = useRef(null);

  // Helper function to check if a radio should be checked
  const isChecked = (fieldName, value) => {
    if (!formData) return false;
    
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
    return formData[fieldName] || defaultValue;
  };

  const handlePrint = async () => {
    if (!formRef.current) return;

    try {
      // Show loading state
      const printButton = document.querySelector('.btn-print');
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

      // Create PDF in landscape with margins
      const pdfWidth = 11; // inches (landscape letter width)
      const pdfHeight = 8.5; // inches (landscape letter height)
      const margin = 0.2; // 0.2 inch margin on all sides
      const contentWidth = pdfWidth - (margin * 2);
      const contentHeight = pdfHeight - (margin * 2);
      
      // Calculate scaling to fit content within margins
      const scaleX = contentWidth / canvas.width;
      const scaleY = contentHeight / canvas.height;
      const scale = Math.min(scaleX, scaleY);
      
      const imgWidth = canvas.width * scale;
      const imgHeight = canvas.height * scale;
      
      const pdf = new jsPDF('landscape', 'in', 'letter');
      
      // Add image to PDF with margins
      const imgData = canvas.toDataURL('image/png', 1.0);
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      
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
          Print PDF
        </button>
      </div>
      <div className="printable-form-content" ref={formRef}>
        <div className="printable-header">
        <div className="header-top-row">
          <div className="notes-box">
            <label className="notes-label">Notes:</label>
            <textarea className="notes-input" placeholder="Enter notes here..." rows="2"></textarea>
          </div>
          <div className="header-center">
            <div className="printable-logo-container">
              <img 
                src={(process.env.PUBLIC_URL || '') + '/logo.png'}
                alt="ePSA Logo" 
                className="printable-logo"
                onError={(e) => {
                  if (e.target.src.includes('logo.png')) {
                    e.target.src = (process.env.PUBLIC_URL || '') + '/logo.jpg';
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
              <input type="text" className="field-input-inline" placeholder="____" value={getFieldValue('age')} readOnly />
            </label>
          </div>
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">2.</span> Race / Ethnicity:
              <label className="checkbox-inline"><input type="checkbox" checked={isChecked('race', 'white')} readOnly /> White</label>
              <label className="checkbox-inline"><input type="checkbox" checked={isChecked('race', 'black')} readOnly /> Black</label>
              <label className="checkbox-inline"><input type="checkbox" checked={isChecked('race', 'hispanic')} readOnly /> Hispanic</label>
              <label className="checkbox-inline"><input type="checkbox" checked={isChecked('race', 'asian')} readOnly /> Asian</label>
              <label className="checkbox-inline"><input type="checkbox" checked={isChecked('race', 'other')} readOnly /> Other</label>
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
              <label className="checkbox-inline"><input type="radio" name="family" value="0" checked={isChecked('familyHistory', 0)} readOnly /> None</label>
              <label className="checkbox-inline"><input type="radio" name="family" value="1" checked={isChecked('familyHistory', 1)} readOnly /> 1 relative</label>
              <label className="checkbox-inline"><input type="radio" name="family" value="2" checked={isChecked('familyHistory', 2)} readOnly /> 2+ relatives</label>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">4.</span> Previous History of Inflammation:
              <label className="checkbox-inline"><input type="radio" name="inflammation" value="0" checked={isChecked('inflammationHistory', 0)} readOnly /> No</label>
              <label className="checkbox-inline"><input type="radio" name="inflammation" value="1" checked={isChecked('inflammationHistory', 1)} readOnly /> Yes</label>
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
              <label className="checkbox-inline"><input type="radio" name="brca" value="yes" checked={isChecked('brcaStatus', 'yes')} readOnly /> Yes</label>
              <label className="checkbox-inline"><input type="radio" name="brca" value="no" checked={isChecked('brcaStatus', 'no')} readOnly /> No</label>
              <label className="checkbox-inline"><input type="radio" name="brca" value="unknown" checked={isChecked('brcaStatus', 'unknown')} readOnly /> Unknown</label>
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
              <label className="checkbox-inline"><input type="checkbox" checked={getFieldValue('heightUnit') === 'imperial'} readOnly /> Feet/Inches</label>
              <input type="text" className="field-input-tiny" placeholder="__" value={getFieldValue('heightFt', '')} readOnly /> ft
              <input type="text" className="field-input-tiny" placeholder="__" value={getFieldValue('heightIn', '')} readOnly /> in
              <label className="checkbox-inline"><input type="checkbox" checked={getFieldValue('heightUnit') === 'metric'} readOnly /> Centimeters</label>
              <input type="text" className="field-input-small" placeholder="___ cm" value={getFieldValue('heightCm', '')} readOnly />
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">7.</span> Weight:
              <label className="checkbox-inline"><input type="checkbox" checked={getFieldValue('weightUnit') === 'lbs'} readOnly /> lbs</label>
              <input type="text" className="field-input-small" placeholder="____" value={getFieldValue('weight', '')} readOnly />
              <label className="checkbox-inline"><input type="checkbox" checked={getFieldValue('weightUnit') === 'kg'} readOnly /> kg</label>
              <input type="text" className="field-input-small" placeholder="____" value={getFieldValue('weightKg', '')} readOnly />
              &nbsp;| BMI: <input type="text" className="field-input-tiny" placeholder="___" value={getFieldValue('bmi', '')} readOnly />
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
              <label className="checkbox-inline"><input type="radio" name="exercise" value="0" checked={isChecked('exercise', 0)} readOnly /> Regular</label>
              <label className="checkbox-inline"><input type="radio" name="exercise" value="1" checked={isChecked('exercise', 1)} readOnly /> Some</label>
              <label className="checkbox-inline"><input type="radio" name="exercise" value="2" checked={isChecked('exercise', 2)} readOnly /> None</label>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">9.</span> Smoking status:
              <label className="checkbox-inline"><input type="radio" name="smoking" value="current" checked={isChecked('smoking', 'current')} readOnly /> Current</label>
              <label className="checkbox-inline"><input type="radio" name="smoking" value="former" checked={isChecked('smoking', 'former')} readOnly /> Former</label>
              <label className="checkbox-inline"><input type="radio" name="smoking" value="never" checked={isChecked('smoking', 'never')} readOnly /> Never</label>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">10.</span> Chemical exposure (Agent Orange/pesticides):
              <label className="checkbox-inline"><input type="radio" name="chemicalExposure" value="yes" checked={isChecked('chemicalExposure', 'yes')} readOnly /> Yes</label>
              <label className="checkbox-inline"><input type="radio" name="chemicalExposure" value="no" checked={isChecked('chemicalExposure', 'no')} readOnly /> No</label>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">11.</span> Diet pattern:
              <input type="text" className="field-input-inline" placeholder="________________" value={getFieldValue('dietPattern', '')} readOnly />
            </label>
          </div>
          <div className="form-field-inline">
            <label className="field-label-inline">
              Geographic origin:
              <input type="text" className="field-input-inline" placeholder="________________" value={getFieldValue('geographicOrigin', '')} readOnly />
            </label>
          </div>
        </div>

        <div className="section-divider">
          <span className="section-label">Symptoms</span>
        </div>

        <div className="section-divider">
          <span className="section-label">12. Urinary Symptoms (IPSS) — Rate 0-5:</span>
        </div>

        <div className="form-row-compact">
          <div className="form-field-compact">
            <label className="field-label-compact">
              Incomplete emptying
              <div className="scale-compact">
                <label><input type="radio" name="ipss-0" value="0" checked={isChecked('ipss.0', 0)} readOnly />0</label>
                <label><input type="radio" name="ipss-0" value="1" checked={isChecked('ipss.0', 1)} readOnly />1</label>
                <label><input type="radio" name="ipss-0" value="2" checked={isChecked('ipss.0', 2)} readOnly />2</label>
                <label><input type="radio" name="ipss-0" value="3" checked={isChecked('ipss.0', 3)} readOnly />3</label>
                <label><input type="radio" name="ipss-0" value="4" checked={isChecked('ipss.0', 4)} readOnly />4</label>
                <label><input type="radio" name="ipss-0" value="5" checked={isChecked('ipss.0', 5)} readOnly />5</label>
              </div>
            </label>
          </div>
          <div className="form-field-compact">
            <label className="field-label-compact">
              Frequency
              <div className="scale-compact">
                <label><input type="radio" name="ipss-1" value="0" checked={isChecked('ipss.1', 0)} readOnly />0</label>
                <label><input type="radio" name="ipss-1" value="1" checked={isChecked('ipss.1', 1)} readOnly />1</label>
                <label><input type="radio" name="ipss-1" value="2" checked={isChecked('ipss.1', 2)} readOnly />2</label>
                <label><input type="radio" name="ipss-1" value="3" checked={isChecked('ipss.1', 3)} readOnly />3</label>
                <label><input type="radio" name="ipss-1" value="4" checked={isChecked('ipss.1', 4)} readOnly />4</label>
                <label><input type="radio" name="ipss-1" value="5" checked={isChecked('ipss.1', 5)} readOnly />5</label>
              </div>
            </label>
          </div>
        </div>

        <div className="form-row-compact">
          <div className="form-field-compact">
            <label className="field-label-compact">
              Intermittency
              <div className="scale-compact">
                <label><input type="radio" name="ipss-2" value="0" checked={isChecked('ipss.2', 0)} readOnly />0</label>
                <label><input type="radio" name="ipss-2" value="1" checked={isChecked('ipss.2', 1)} readOnly />1</label>
                <label><input type="radio" name="ipss-2" value="2" checked={isChecked('ipss.2', 2)} readOnly />2</label>
                <label><input type="radio" name="ipss-2" value="3" checked={isChecked('ipss.2', 3)} readOnly />3</label>
                <label><input type="radio" name="ipss-2" value="4" checked={isChecked('ipss.2', 4)} readOnly />4</label>
                <label><input type="radio" name="ipss-2" value="5" checked={isChecked('ipss.2', 5)} readOnly />5</label>
              </div>
            </label>
          </div>
          <div className="form-field-compact">
            <label className="field-label-compact">
              Urgency
              <div className="scale-compact">
                <label><input type="radio" name="ipss-3" value="0" checked={isChecked('ipss.3', 0)} readOnly />0</label>
                <label><input type="radio" name="ipss-3" value="1" checked={isChecked('ipss.3', 1)} readOnly />1</label>
                <label><input type="radio" name="ipss-3" value="2" checked={isChecked('ipss.3', 2)} readOnly />2</label>
                <label><input type="radio" name="ipss-3" value="3" checked={isChecked('ipss.3', 3)} readOnly />3</label>
                <label><input type="radio" name="ipss-3" value="4" checked={isChecked('ipss.3', 4)} readOnly />4</label>
                <label><input type="radio" name="ipss-3" value="5" checked={isChecked('ipss.3', 5)} readOnly />5</label>
              </div>
            </label>
          </div>
        </div>

        <div className="form-row-compact">
          <div className="form-field-compact">
            <label className="field-label-compact">
              Weak stream
              <div className="scale-compact">
                <label><input type="radio" name="ipss-4" value="0" checked={isChecked('ipss.4', 0)} readOnly />0</label>
                <label><input type="radio" name="ipss-4" value="1" checked={isChecked('ipss.4', 1)} readOnly />1</label>
                <label><input type="radio" name="ipss-4" value="2" checked={isChecked('ipss.4', 2)} readOnly />2</label>
                <label><input type="radio" name="ipss-4" value="3" checked={isChecked('ipss.4', 3)} readOnly />3</label>
                <label><input type="radio" name="ipss-4" value="4" checked={isChecked('ipss.4', 4)} readOnly />4</label>
                <label><input type="radio" name="ipss-4" value="5" checked={isChecked('ipss.4', 5)} readOnly />5</label>
              </div>
            </label>
          </div>
          <div className="form-field-compact">
            <label className="field-label-compact">
              Straining
              <div className="scale-compact">
                <label><input type="radio" name="ipss-5" value="0" checked={isChecked('ipss.5', 0)} readOnly />0</label>
                <label><input type="radio" name="ipss-5" value="1" checked={isChecked('ipss.5', 1)} readOnly />1</label>
                <label><input type="radio" name="ipss-5" value="2" checked={isChecked('ipss.5', 2)} readOnly />2</label>
                <label><input type="radio" name="ipss-5" value="3" checked={isChecked('ipss.5', 3)} readOnly />3</label>
                <label><input type="radio" name="ipss-5" value="4" checked={isChecked('ipss.5', 4)} readOnly />4</label>
                <label><input type="radio" name="ipss-5" value="5" checked={isChecked('ipss.5', 5)} readOnly />5</label>
              </div>
            </label>
          </div>
        </div>

        <div className="form-row-compact">
          <div className="form-field-compact">
            <label className="field-label-compact">
              Nocturia
              <div className="scale-compact">
                <label><input type="radio" name="ipss-6" value="0" checked={isChecked('ipss.6', 0)} readOnly />0</label>
                <label><input type="radio" name="ipss-6" value="1" checked={isChecked('ipss.6', 1)} readOnly />1</label>
                <label><input type="radio" name="ipss-6" value="2" checked={isChecked('ipss.6', 2)} readOnly />2</label>
                <label><input type="radio" name="ipss-6" value="3" checked={isChecked('ipss.6', 3)} readOnly />3</label>
                <label><input type="radio" name="ipss-6" value="4" checked={isChecked('ipss.6', 4)} readOnly />4</label>
                <label><input type="radio" name="ipss-6" value="5" checked={isChecked('ipss.6', 5)} readOnly />5</label>
              </div>
            </label>
          </div>
          <div className="form-field-compact">
            <label className="field-label-compact">
              IPSS Total: <input type="text" className="field-input-tiny" placeholder="___" value={getFieldValue('ipssTotal', '')} readOnly /> / 35
            </label>
          </div>
        </div>

        <div className="section-divider">
          <span className="section-label">13. Sexual Health (SHIM):</span>
        </div>

        <div className="form-row-compact">
          <div className="form-field-compact">
            <label className="field-label-compact">
              Confidence
              <div className="scale-compact">
                <label><input type="radio" name="shim-0" value="1" checked={isChecked('shim.0', 1)} readOnly />1</label>
                <label><input type="radio" name="shim-0" value="2" checked={isChecked('shim.0', 2)} readOnly />2</label>
                <label><input type="radio" name="shim-0" value="3" checked={isChecked('shim.0', 3)} readOnly />3</label>
                <label><input type="radio" name="shim-0" value="4" checked={isChecked('shim.0', 4)} readOnly />4</label>
                <label><input type="radio" name="shim-0" value="5" checked={isChecked('shim.0', 5)} readOnly />5</label>
              </div>
            </label>
          </div>
          <div className="form-field-compact">
            <label className="field-label-compact">
              Hard enough
              <div className="scale-compact">
                <label><input type="radio" name="shim-1" value="0" checked={isChecked('shim.1', 0)} readOnly />0</label>
                <label><input type="radio" name="shim-1" value="1" checked={isChecked('shim.1', 1)} readOnly />1</label>
                <label><input type="radio" name="shim-1" value="2" checked={isChecked('shim.1', 2)} readOnly />2</label>
                <label><input type="radio" name="shim-1" value="3" checked={isChecked('shim.1', 3)} readOnly />3</label>
                <label><input type="radio" name="shim-1" value="4" checked={isChecked('shim.1', 4)} readOnly />4</label>
                <label><input type="radio" name="shim-1" value="5" checked={isChecked('shim.1', 5)} readOnly />5</label>
              </div>
            </label>
          </div>
        </div>

        <div className="form-row-compact">
          <div className="form-field-compact">
            <label className="field-label-compact">
              Maintain after
              <div className="scale-compact">
                <label><input type="radio" name="shim-2" value="0" checked={isChecked('shim.2', 0)} readOnly />0</label>
                <label><input type="radio" name="shim-2" value="1" checked={isChecked('shim.2', 1)} readOnly />1</label>
                <label><input type="radio" name="shim-2" value="2" checked={isChecked('shim.2', 2)} readOnly />2</label>
                <label><input type="radio" name="shim-2" value="3" checked={isChecked('shim.2', 3)} readOnly />3</label>
                <label><input type="radio" name="shim-2" value="4" checked={isChecked('shim.2', 4)} readOnly />4</label>
                <label><input type="radio" name="shim-2" value="5" checked={isChecked('shim.2', 5)} readOnly />5</label>
              </div>
            </label>
          </div>
          <div className="form-field-compact">
            <label className="field-label-compact">
              Difficulty maintain
              <div className="scale-compact">
                <label><input type="radio" name="shim-3" value="0" checked={isChecked('shim.3', 0)} readOnly />0</label>
                <label><input type="radio" name="shim-3" value="1" checked={isChecked('shim.3', 1)} readOnly />1</label>
                <label><input type="radio" name="shim-3" value="2" checked={isChecked('shim.3', 2)} readOnly />2</label>
                <label><input type="radio" name="shim-3" value="3" checked={isChecked('shim.3', 3)} readOnly />3</label>
                <label><input type="radio" name="shim-3" value="4" checked={isChecked('shim.3', 4)} readOnly />4</label>
                <label><input type="radio" name="shim-3" value="5" checked={isChecked('shim.3', 5)} readOnly />5</label>
              </div>
            </label>
          </div>
        </div>

        <div className="form-row-compact">
          <div className="form-field-compact">
            <label className="field-label-compact">
              Satisfactory
              <div className="scale-compact">
                <label><input type="radio" name="shim-4" value="0" checked={isChecked('shim.4', 0)} readOnly />0</label>
                <label><input type="radio" name="shim-4" value="1" checked={isChecked('shim.4', 1)} readOnly />1</label>
                <label><input type="radio" name="shim-4" value="2" checked={isChecked('shim.4', 2)} readOnly />2</label>
                <label><input type="radio" name="shim-4" value="3" checked={isChecked('shim.4', 3)} readOnly />3</label>
                <label><input type="radio" name="shim-4" value="4" checked={isChecked('shim.4', 4)} readOnly />4</label>
                <label><input type="radio" name="shim-4" value="5" checked={isChecked('shim.4', 5)} readOnly />5</label>
              </div>
            </label>
          </div>
          <div className="form-field-compact">
            <label className="field-label-compact">
              SHIM Total: <input type="text" className="field-input-tiny" placeholder="___" value={getFieldValue('shimTotal', '')} readOnly /> / 25
            </label>
          </div>
        </div>

        <div className="section-divider">
          <span className="section-label">Part 2: Clinical Data</span>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">12.</span> PSA Level (ng/mL):
              <input type="text" className="field-input-small" placeholder="____" />
            </label>
          </div>
          <div className="form-field-inline">
            <label className="field-label-inline">
              On hormonal therapy affecting PSA:
              <label className="checkbox-inline"><input type="checkbox" /> Yes</label>
              <label className="checkbox-inline"><input type="checkbox" /> No</label>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              Medication:
              <label className="checkbox-inline"><input type="checkbox" /> Finasteride</label>
              <label className="checkbox-inline"><input type="checkbox" /> Dutasteride</label>
              <label className="checkbox-inline"><input type="checkbox" /> Other</label>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">13.</span> MRI PIRADS Score:
              <label className="checkbox-inline"><input type="radio" name="pirads" value="na" /> Not applicable</label>
              <label className="checkbox-inline"><input type="radio" name="pirads" value="1" /> 1</label>
              <label className="checkbox-inline"><input type="radio" name="pirads" value="2" /> 2</label>
              <label className="checkbox-inline"><input type="radio" name="pirads" value="3" /> 3</label>
              <label className="checkbox-inline"><input type="radio" name="pirads" value="4" /> 4</label>
              <label className="checkbox-inline"><input type="radio" name="pirads" value="5" /> 5</label>
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
