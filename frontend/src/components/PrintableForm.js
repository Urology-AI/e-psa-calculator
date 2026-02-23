import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './PrintableForm.css';

const PrintableForm = ({ onBack }) => {
  const formRef = useRef(null);

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
          🖨️ Print PDF
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
              <input type="text" className="field-input-inline" placeholder="____" />
            </label>
          </div>
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">2.</span> Race / Ethnicity:
              <label className="checkbox-inline"><input type="checkbox" /> White</label>
              <label className="checkbox-inline"><input type="checkbox" /> Black</label>
              <label className="checkbox-inline"><input type="checkbox" /> Hispanic</label>
              <label className="checkbox-inline"><input type="checkbox" /> Asian</label>
              <label className="checkbox-inline"><input type="checkbox" /> Other</label>
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
              <label className="checkbox-inline"><input type="radio" name="family" value="0" /> None</label>
              <label className="checkbox-inline"><input type="radio" name="family" value="1" /> 1 relative</label>
              <label className="checkbox-inline"><input type="radio" name="family" value="2" /> 2+ relatives</label>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">4.</span> Known BRCA1/BRCA2 mutation:
              <label className="checkbox-inline"><input type="radio" name="brca" value="yes" /> Yes</label>
              <label className="checkbox-inline"><input type="radio" name="brca" value="no" /> No</label>
              <label className="checkbox-inline"><input type="radio" name="brca" value="unknown" /> Unknown</label>
            </label>
            <div className="question-note" style={{ marginTop: '6px', fontSize: '11px', color: '#5a5f82' }}>
              Collected for prospective validation — not included in current model calculation.
            </div>
          </div>
        </div>

        <div className="section-divider">
          <span className="section-label">Body Metrics</span>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">5.</span> Height:
              <label className="checkbox-inline"><input type="checkbox" /> Feet/Inches</label>
              <input type="text" className="field-input-tiny" placeholder="__" /> ft
              <input type="text" className="field-input-tiny" placeholder="__" /> in
              <label className="checkbox-inline"><input type="checkbox" /> Centimeters</label>
              <input type="text" className="field-input-small" placeholder="___ cm" />
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">6.</span> Weight:
              <label className="checkbox-inline"><input type="checkbox" /> lbs</label>
              <input type="text" className="field-input-small" placeholder="____" />
              <label className="checkbox-inline"><input type="checkbox" /> kg</label>
              <input type="text" className="field-input-small" placeholder="____" />
              &nbsp;| BMI: <input type="text" className="field-input-tiny" placeholder="___" />
            </label>
          </div>
        </div>

        <div className="section-divider">
          <span className="section-label">Lifestyle</span>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">7.</span> Exercise level:
              <label className="checkbox-inline"><input type="radio" name="exercise" value="0" /> Regular</label>
              <label className="checkbox-inline"><input type="radio" name="exercise" value="1" /> Some</label>
              <label className="checkbox-inline"><input type="radio" name="exercise" value="2" /> None</label>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">8.</span> Smoking status:
              <label className="checkbox-inline"><input type="radio" name="smoking" value="current" /> Current</label>
              <label className="checkbox-inline"><input type="radio" name="smoking" value="former" /> Former</label>
              <label className="checkbox-inline"><input type="radio" name="smoking" value="never" /> Never</label>
            </label>
            <div className="question-note" style={{ marginTop: '6px', fontSize: '11px', color: '#5a5f82' }}>
              Collected for prospective validation — not included in current model calculation.
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">9.</span> Chemical exposure (Agent Orange/pesticides):
              <label className="checkbox-inline"><input type="radio" name="chemicalExposure" value="yes" /> Yes</label>
              <label className="checkbox-inline"><input type="radio" name="chemicalExposure" value="no" /> No</label>
            </label>
            <div className="question-note" style={{ marginTop: '6px', fontSize: '11px', color: '#5a5f82' }}>
              Collected for prospective validation — not included in current model calculation.
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              Diet pattern:
              <input type="text" className="field-input-inline" placeholder="________________" />
            </label>
            <div className="question-note" style={{ marginTop: '6px', fontSize: '11px', color: '#5a5f82' }}>
              Collected for prospective validation — not included in current model calculation.
            </div>
          </div>
          <div className="form-field-inline">
            <label className="field-label-inline">
              Geographic origin:
              <input type="text" className="field-input-inline" placeholder="________________" />
            </label>
            <div className="question-note" style={{ marginTop: '6px', fontSize: '11px', color: '#5a5f82' }}>
              Collected for prospective validation — not included in current model calculation.
            </div>
          </div>
        </div>

        <div className="section-divider">
          <span className="section-label">Symptoms</span>
        </div>

        <div className="section-divider">
          <span className="section-label">10. Urinary Symptoms (IPSS) — Rate 0-5:</span>
        </div>

        <div className="form-row-compact">
          <div className="form-field-compact">
            <label className="field-label-compact">
              Incomplete emptying
              <div className="scale-compact">
                <label><input type="radio" name="ipss-0" value="0" />0</label>
                <label><input type="radio" name="ipss-0" value="1" />1</label>
                <label><input type="radio" name="ipss-0" value="2" />2</label>
                <label><input type="radio" name="ipss-0" value="3" />3</label>
                <label><input type="radio" name="ipss-0" value="4" />4</label>
                <label><input type="radio" name="ipss-0" value="5" />5</label>
              </div>
            </label>
          </div>
          <div className="form-field-compact">
            <label className="field-label-compact">
              Frequency
              <div className="scale-compact">
                <label><input type="radio" name="ipss-1" value="0" />0</label>
                <label><input type="radio" name="ipss-1" value="1" />1</label>
                <label><input type="radio" name="ipss-1" value="2" />2</label>
                <label><input type="radio" name="ipss-1" value="3" />3</label>
                <label><input type="radio" name="ipss-1" value="4" />4</label>
                <label><input type="radio" name="ipss-1" value="5" />5</label>
              </div>
            </label>
          </div>
        </div>

        <div className="form-row-compact">
          <div className="form-field-compact">
            <label className="field-label-compact">
              Intermittency
              <div className="scale-compact">
                <label><input type="radio" name="ipss-2" value="0" />0</label>
                <label><input type="radio" name="ipss-2" value="1" />1</label>
                <label><input type="radio" name="ipss-2" value="2" />2</label>
                <label><input type="radio" name="ipss-2" value="3" />3</label>
                <label><input type="radio" name="ipss-2" value="4" />4</label>
                <label><input type="radio" name="ipss-2" value="5" />5</label>
              </div>
            </label>
          </div>
          <div className="form-field-compact">
            <label className="field-label-compact">
              Urgency
              <div className="scale-compact">
                <label><input type="radio" name="ipss-3" value="0" />0</label>
                <label><input type="radio" name="ipss-3" value="1" />1</label>
                <label><input type="radio" name="ipss-3" value="2" />2</label>
                <label><input type="radio" name="ipss-3" value="3" />3</label>
                <label><input type="radio" name="ipss-3" value="4" />4</label>
                <label><input type="radio" name="ipss-3" value="5" />5</label>
              </div>
            </label>
          </div>
        </div>

        <div className="form-row-compact">
          <div className="form-field-compact">
            <label className="field-label-compact">
              Weak stream
              <div className="scale-compact">
                <label><input type="radio" name="ipss-4" value="0" />0</label>
                <label><input type="radio" name="ipss-4" value="1" />1</label>
                <label><input type="radio" name="ipss-4" value="2" />2</label>
                <label><input type="radio" name="ipss-4" value="3" />3</label>
                <label><input type="radio" name="ipss-4" value="4" />4</label>
                <label><input type="radio" name="ipss-4" value="5" />5</label>
              </div>
            </label>
          </div>
          <div className="form-field-compact">
            <label className="field-label-compact">
              Straining
              <div className="scale-compact">
                <label><input type="radio" name="ipss-5" value="0" />0</label>
                <label><input type="radio" name="ipss-5" value="1" />1</label>
                <label><input type="radio" name="ipss-5" value="2" />2</label>
                <label><input type="radio" name="ipss-5" value="3" />3</label>
                <label><input type="radio" name="ipss-5" value="4" />4</label>
                <label><input type="radio" name="ipss-5" value="5" />5</label>
              </div>
            </label>
          </div>
        </div>

        <div className="form-row-compact">
          <div className="form-field-compact">
            <label className="field-label-compact">
              Nocturia
              <div className="scale-compact">
                <label><input type="radio" name="ipss-6" value="0" />0</label>
                <label><input type="radio" name="ipss-6" value="1" />1</label>
                <label><input type="radio" name="ipss-6" value="2" />2</label>
                <label><input type="radio" name="ipss-6" value="3" />3</label>
                <label><input type="radio" name="ipss-6" value="4" />4</label>
                <label><input type="radio" name="ipss-6" value="5" />5</label>
              </div>
            </label>
          </div>
          <div className="form-field-compact">
            <label className="field-label-compact">
              IPSS Total: <input type="text" className="field-input-tiny" placeholder="___" /> / 35
            </label>
          </div>
        </div>

        <div className="section-divider">
          <span className="section-label">11. Sexual Health (SHIM):</span>
        </div>

        <div className="form-row-compact">
          <div className="form-field-compact">
            <label className="field-label-compact">
              Confidence
              <div className="scale-compact">
                <label><input type="radio" name="shim-0" value="1" />1</label>
                <label><input type="radio" name="shim-0" value="2" />2</label>
                <label><input type="radio" name="shim-0" value="3" />3</label>
                <label><input type="radio" name="shim-0" value="4" />4</label>
                <label><input type="radio" name="shim-0" value="5" />5</label>
              </div>
            </label>
          </div>
          <div className="form-field-compact">
            <label className="field-label-compact">
              Hard enough
              <div className="scale-compact">
                <label><input type="radio" name="shim-1" value="0" />0</label>
                <label><input type="radio" name="shim-1" value="1" />1</label>
                <label><input type="radio" name="shim-1" value="2" />2</label>
                <label><input type="radio" name="shim-1" value="3" />3</label>
                <label><input type="radio" name="shim-1" value="4" />4</label>
                <label><input type="radio" name="shim-1" value="5" />5</label>
              </div>
            </label>
          </div>
        </div>

        <div className="form-row-compact">
          <div className="form-field-compact">
            <label className="field-label-compact">
              Maintain after
              <div className="scale-compact">
                <label><input type="radio" name="shim-2" value="0" />0</label>
                <label><input type="radio" name="shim-2" value="1" />1</label>
                <label><input type="radio" name="shim-2" value="2" />2</label>
                <label><input type="radio" name="shim-2" value="3" />3</label>
                <label><input type="radio" name="shim-2" value="4" />4</label>
                <label><input type="radio" name="shim-2" value="5" />5</label>
              </div>
            </label>
          </div>
          <div className="form-field-compact">
            <label className="field-label-compact">
              Difficulty maintain
              <div className="scale-compact">
                <label><input type="radio" name="shim-3" value="0" />0</label>
                <label><input type="radio" name="shim-3" value="1" />1</label>
                <label><input type="radio" name="shim-3" value="2" />2</label>
                <label><input type="radio" name="shim-3" value="3" />3</label>
                <label><input type="radio" name="shim-3" value="4" />4</label>
                <label><input type="radio" name="shim-3" value="5" />5</label>
              </div>
            </label>
          </div>
        </div>

        <div className="form-row-compact">
          <div className="form-field-compact">
            <label className="field-label-compact">
              Satisfactory
              <div className="scale-compact">
                <label><input type="radio" name="shim-4" value="0" />0</label>
                <label><input type="radio" name="shim-4" value="1" />1</label>
                <label><input type="radio" name="shim-4" value="2" />2</label>
                <label><input type="radio" name="shim-4" value="3" />3</label>
                <label><input type="radio" name="shim-4" value="4" />4</label>
                <label><input type="radio" name="shim-4" value="5" />5</label>
              </div>
            </label>
          </div>
          <div className="form-field-compact">
            <label className="field-label-compact">
              SHIM Total: <input type="text" className="field-input-tiny" placeholder="___" /> / 25
            </label>
          </div>
        </div>

        <div className="section-divider">
          <span className="section-label">Part 1 Scoring Reference (7-variable model):</span>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              ePSA probability tiers: <strong>Lower &lt;8%</strong> | <strong>Moderate 8%–20%</strong> | <strong>Higher ≥20%</strong>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              Displayed patient range: <strong>Score ±10%</strong>
            </label>
          </div>
        </div>
        <div className="printable-footer">
          <p className="footer-text">
            For educational and research purposes. Not for clinical decision-making without physician review. Part 1 uses 7 variables (Age, Race, Family History, BMI, IPSS, SHIM, Exercise). | Ashutosh K. Tewari, MD — Department of Urology — Mount Sinai Health System
          </p>
        </div>
      </div>
      </div>
    </div>
  );
};

export default PrintableForm;
