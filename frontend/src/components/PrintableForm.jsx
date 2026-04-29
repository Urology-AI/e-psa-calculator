import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './PrintableForm.css';

const PrintableForm = ({ onBack, formData }) => {
  const formRef = useRef(null);
  const { t } = useTranslation();

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
      printButton.textContent = t('printableForm.generatingPdf');
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
            ← {t('printableForm.back')}
          </button>
        )}
        <button className="btn-print" onClick={handlePrint}>
          {t('printableForm.downloadPdf')}
        </button>
        <button type="button" className="btn-export-json" onClick={handleExportJson}>
          {t('printableForm.exportJson')}
        </button>
      </div>
      <div className="printable-form-content" ref={formRef}>
        <div className="print-instructions">
          <strong>{t('printableForm.howToUseTitle')}</strong> {t('printableForm.howToUseText')}
        </div>
        <div className="printable-header">
        <div className="header-top-row">
          <div className="notes-box">
            <label className="notes-label">{t('printableForm.notesLabel')}</label>
            <textarea className="notes-input" placeholder={t('printableForm.notesPlaceholder')} rows="2"></textarea>
          </div>
          <div className="header-center">
            <div className="printable-logo-container">
              <img 
                src="/logo.png"
                alt={t('printableForm.logoAlt')}
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
              <div className="printable-title">{t('printableForm.millionStrongMenTitle')}</div>
              <h1 className="printable-heading">{t('printableForm.questionnaireTitle')}</h1>
              <p className="printable-tagline">{t('printableForm.tagline')}</p>
            </div>
          </div>
          <div className="phone-box">
            <label className="phone-label">{t('printableForm.phoneLabel')}</label>
            <input type="text" className="phone-input" placeholder={t('printableForm.phonePlaceholder')} />
          </div>
        </div>
      </div>

      <div className="printable-body">
        <div className="section-divider">
          <span className="section-label">{t('printableForm.sectionAboutYou')}</span>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">1.</span> {t('part1.fields.age.title')}:
              <input type="text" name="age" className="field-input-inline" placeholder={t('printableForm.blank4')} defaultValue={getFieldValue('age')} />
            </label>
          </div>
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">2.</span> {t('part1.fields.race.title')}:
              <label className="checkbox-inline"><input type="radio" name="race" value="white" defaultChecked={isChecked('race', 'white')} /> {t('part1.race.white')}</label>
              <label className="checkbox-inline"><input type="radio" name="race" value="black" defaultChecked={isChecked('race', 'black')} /> {t('part1.race.black')}</label>
              <label className="checkbox-inline"><input type="radio" name="race" value="hispanic" defaultChecked={isChecked('race', 'hispanic')} /> {t('part1.race.hispanic')}</label>
              <label className="checkbox-inline"><input type="radio" name="race" value="asian" defaultChecked={isChecked('race', 'asian')} /> {t('part1.race.asian')}</label>
              <label className="checkbox-inline"><input type="radio" name="race" value="other" defaultChecked={isChecked('race', 'other')} /> {t('part1.race.other')}</label>
            </label>
          </div>
        </div>

        <div className="section-divider">
          <span className="section-label">{t('printableForm.sectionFamilyGeneticRisk')}</span>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">3.</span> {t('part1.fields.familyHistory.title')}:
              <label className="checkbox-inline"><input type="radio" name="family" value="0" defaultChecked={isChecked('familyHistory', 0)} /> {t('quickEntry.family.none')}</label>
              <label className="checkbox-inline"><input type="radio" name="family" value="1" defaultChecked={isChecked('familyHistory', 1)} /> {t('quickEntry.family.one')}</label>
              <label className="checkbox-inline"><input type="radio" name="family" value="2" defaultChecked={isChecked('familyHistory', 2)} /> {t('quickEntry.family.twoPlus')}</label>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">4.</span> {t('part1.fields.inflammationHistory.title')}:
              <label className="checkbox-inline"><input type="radio" name="inflammation" value="0" defaultChecked={isChecked('inflammationHistory', 0)} /> {t('part1.options.no')}</label>
              <label className="checkbox-inline"><input type="radio" name="inflammation" value="1" defaultChecked={isChecked('inflammationHistory', 1)} /> {t('part1.options.yes')}</label>
              <div style={{ fontSize: '0.6875rem', fontStyle: 'italic', marginTop: '4px', marginLeft: '20px' }}>
                {t('printableForm.inflammationExamples')}
              </div>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">5.</span> {t('part1.fields.brcaStatus.title')}:
              <label className="checkbox-inline"><input type="radio" name="brca" value="yes" defaultChecked={isChecked('brcaStatus', 'yes')} /> {t('part1.options.yes')}</label>
              <label className="checkbox-inline"><input type="radio" name="brca" value="no" defaultChecked={isChecked('brcaStatus', 'no')} /> {t('part1.options.no')}</label>
              <label className="checkbox-inline"><input type="radio" name="brca" value="unknown" defaultChecked={isChecked('brcaStatus', 'unknown')} /> {t('part1.options.unknown')}</label>
            </label>
          </div>
        </div>

        <div className="section-divider">
          <span className="section-label">{t('printableForm.sectionBodyMetrics')}</span>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">6.</span> {t('part1.step2.heightQuestion')}:
              <label className="checkbox-inline"><input type="radio" name="heightUnit" value="imperial" defaultChecked={getFieldValue('heightUnit') !== 'metric'} /> {t('part1.step2.heightUnit.imperial')}</label>
              <input type="text" name="heightFt" className="field-input-tiny" placeholder={t('printableForm.blank2')} defaultValue={getFieldValue('heightFt', '')} /> {t('printableForm.ft')}
              <input type="text" name="heightIn" className="field-input-tiny" placeholder={t('printableForm.blank2')} defaultValue={getFieldValue('heightIn', '')} /> {t('printableForm.in')}
              <label className="checkbox-inline"><input type="radio" name="heightUnit" value="metric" defaultChecked={getFieldValue('heightUnit') === 'metric'} /> {t('part1.step2.heightUnit.metric')}</label>
              <input type="text" name="heightCm" className="field-input-small" placeholder={t('printableForm.blankCm')} defaultValue={getFieldValue('heightCm', '')} />
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">7.</span> {t('part1.step2.weightQuestion')}:
              <label className="checkbox-inline"><input type="radio" name="weightUnit" value="lbs" defaultChecked={getFieldValue('weightUnit') !== 'kg'} /> {t('printableForm.lbs')}</label>
              <input type="text" name="weight" className="field-input-small" placeholder={t('printableForm.blank4')} defaultValue={getFieldValue('weight', '')} />
              <label className="checkbox-inline"><input type="radio" name="weightUnit" value="kg" defaultChecked={getFieldValue('weightUnit') === 'kg'} /> {t('printableForm.kg')}</label>
              <input type="text" name="weightKg" className="field-input-small" placeholder={t('printableForm.blank4')} defaultValue={getFieldValue('weightKg', '')} />
              &nbsp;| {t('part1.step2.bmiLabel')}: <input type="text" name="bmi" className="field-input-tiny" placeholder={t('printableForm.blank3')} defaultValue={getFieldValue('bmi', '')} />
            </label>
          </div>
        </div>

        <div className="section-divider">
          <span className="section-label">{t('printableForm.sectionLifestyle')}</span>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">8.</span> {t('part1.fields.exercise.title')}:
              <label className="checkbox-inline"><input type="radio" name="exercise" value="0" defaultChecked={isChecked('exercise', 0)} /> {t('part1.step3.exercise.regular')}</label>
              <label className="checkbox-inline"><input type="radio" name="exercise" value="1" defaultChecked={isChecked('exercise', 1)} /> {t('part1.step3.exercise.some')}</label>
              <label className="checkbox-inline"><input type="radio" name="exercise" value="2" defaultChecked={isChecked('exercise', 2)} /> {t('part1.step3.exercise.none')}</label>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">9.</span> {t('part1.fields.smoking.title')}:
              <label className="checkbox-inline"><input type="radio" name="smoking" value="0" defaultChecked={isChecked('smoking', 0)} /> {t('part1.step3.smoking.never')}</label>
              <label className="checkbox-inline"><input type="radio" name="smoking" value="1" defaultChecked={isChecked('smoking', 1)} /> {t('part1.step3.smoking.former')}</label>
              <label className="checkbox-inline"><input type="radio" name="smoking" value="2" defaultChecked={isChecked('smoking', 2)} /> {t('part1.step3.smoking.current')}</label>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">10.</span> {t('part1.fields.chemicalExposure.title')}:
              <label className="checkbox-inline"><input type="radio" name="chemicalExposure" value="yes" defaultChecked={isChecked('chemicalExposure', 'yes')} /> {t('part1.options.yes')}</label>
              <label className="checkbox-inline"><input type="radio" name="chemicalExposure" value="no" defaultChecked={isChecked('chemicalExposure', 'no')} /> {t('part1.options.no')}</label>
              <label className="checkbox-inline"><input type="radio" name="chemicalExposure" value="unknown" defaultChecked={isChecked('chemicalExposure', 'unknown')} /> {t('part1.options.unknown')}</label>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">11.</span> {t('part1.fields.diet.title')}:
              <label className="checkbox-inline"><input type="radio" name="dietPattern" value="western" defaultChecked={isChecked('dietPattern', 'western')} /> {t('part1.step4.diet.western')}</label>
              <label className="checkbox-inline"><input type="radio" name="dietPattern" value="mediterranean" defaultChecked={isChecked('dietPattern', 'mediterranean')} /> {t('part1.step4.diet.mediterranean')}</label>
              <label className="checkbox-inline"><input type="radio" name="dietPattern" value="indian" defaultChecked={isChecked('dietPattern', 'indian')} /> {t('part1.step4.diet.indian')}</label>
              <label className="checkbox-inline"><input type="radio" name="dietPattern" value="dash" defaultChecked={isChecked('dietPattern', 'dash')} /> {t('part1.step4.diet.dash')}</label>
              <label className="checkbox-inline"><input type="radio" name="dietPattern" value="plant-based" defaultChecked={isChecked('dietPattern', 'plant-based')} /> {t('part1.step4.diet.plantBased')}</label>
              <label className="checkbox-inline"><input type="radio" name="dietPattern" value="pescatarian" defaultChecked={isChecked('dietPattern', 'pescatarian')} /> {t('part1.step4.diet.pescatarian')}</label>
              <label className="checkbox-inline"><input type="radio" name="dietPattern" value="low-carb-keto" defaultChecked={isChecked('dietPattern', 'low-carb-keto')} /> {t('part1.step4.diet.lowCarbKeto')}</label>
              <label className="checkbox-inline"><input type="radio" name="dietPattern" value="other" defaultChecked={isChecked('dietPattern', 'other')} /> {t('part1.step4.diet.other')}</label>
            </label>
          </div>
        </div>

        <div className="section-divider">
          <span className="section-label">{t('printableForm.sectionComorbidities')}</span>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">12.</span> {t('part1.fields.comorbidities.title')}
            </label>
          </div>
        </div>
        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              {t('printableForm.comorbidityPrompt')}
              <label className="checkbox-inline"><input type="radio" name="comorbidityScore" value="0" defaultChecked={isChecked('comorbidityScore', 0)} /> {t('part1.options.no')}</label>
              <label className="checkbox-inline"><input type="radio" name="comorbidityScore" value="1" defaultChecked={isChecked('comorbidityScore', 1)} /> {t('part1.step4.comorbidities.one')}</label>
              <label className="checkbox-inline"><input type="radio" name="comorbidityScore" value="2" defaultChecked={isChecked('comorbidityScore', 2)} /> {t('part1.step4.comorbidities.twoOrMore')}</label>
            </label>
          </div>
        </div>

        <div className="section-divider">
          <span className="section-label">{t('printableForm.sectionSymptoms')}</span>
        </div>

        <div className="section-divider">
          <span className="section-label">{t('printableForm.sectionIpSs')}</span>
        </div>
        <p className="score-help-text">{t('printableForm.ipssScaleReminder')}</p>

        <div className="form-row-compact">
          <div className="form-field-compact">
            <label className="field-label-compact">
              {t('part1.ipss.q1')}
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
              {t('part1.ipss.q2')}
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
              {t('part1.ipss.q3')}
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
              {t('part1.ipss.q4')}
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
              {t('part1.ipss.q5')}
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
              {t('part1.ipss.q6')}
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
              {t('part1.ipss.q7')}
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
              {t('part1.ipss.totalLabel')}: <input type="text" className="field-input-tiny" placeholder={t('printableForm.blank3')} defaultValue={ipssTotal} /> / 35
            </label>
          </div>
        </div>

        <div className="section-divider">
          <span className="section-label">{t('printableForm.sectionShim')}</span>
        </div>
        <p className="score-help-text">{t('printableForm.shimScaleReminder')}</p>

        <div className="form-row-compact">
          <div className="form-field-compact">
            <label className="field-label-compact">
              {t('part1.shim.q1')}
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
              {t('part1.shim.q2')}
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
              {t('part1.shim.q3')}
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
              {t('part1.shim.q4')}
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
              {t('part1.shim.q5')}
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
              {t('part1.shim.totalLabel')}: <input type="text" className="field-input-tiny" placeholder={t('printableForm.blank3')} defaultValue={shimTotal} /> / 25
            </label>
          </div>
        </div>

        <div className="section-divider">
          <span className="section-label">{t('printableForm.sectionPart2')}</span>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">15.</span> {t('part2.psa.q2')}:
              <input type="text" className="field-input-small" placeholder={t('printableForm.blank4')} defaultValue={getFieldValue('psa', '')} />
            </label>
          </div>
          <div className="form-field-inline">
            <label className="field-label-inline">
              {t('part2.psa.q3')}
              <label className="checkbox-inline"><input type="checkbox" defaultChecked={isChecked('onHormonalTherapy', true)} /> {t('part1.options.yes')}</label>
              <label className="checkbox-inline"><input type="checkbox" defaultChecked={isChecked('onHormonalTherapy', false)} /> {t('part1.options.no')}</label>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              {t('part2.psa.q4Label')}
              <label className="checkbox-inline"><input type="checkbox" defaultChecked={isChecked('hormonalTherapyType', 'finasteride')} /> {t('part2.psa.q4OptFinasteride')}</label>
              <label className="checkbox-inline"><input type="checkbox" defaultChecked={isChecked('hormonalTherapyType', 'dutasteride')} /> {t('part2.psa.q4OptDutasteride')}</label>
              <label className="checkbox-inline"><input type="checkbox" defaultChecked={isChecked('hormonalTherapyType', 'other')} /> {t('part2.psa.q4OptOther')}</label>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field-inline">
            <label className="field-label-inline">
              <span className="field-number">16.</span> {t('part2.mri.q2')}:
              <label className="checkbox-inline"><input type="radio" name="pirads" value="na" defaultChecked={!getFieldValue('knowPirads', false)} /> {t('printableForm.notApplicable')}</label>
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
            {t('printableForm.footerDisclaimer')}
          </p>
        </div>
      </div>
      </div>
    </div>
  );
};

export default PrintableForm;
