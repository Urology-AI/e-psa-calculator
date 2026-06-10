import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import ShareQrCode from './ShareQrCode.jsx';
import './PrintableForm.css';

const CLINICAL_MODE_URL = (() => {
  if (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_PUBLIC_APP_URL) {
    return `${import.meta.env.VITE_PUBLIC_APP_URL.replace(/\/$/, '')}/?mode=bus`;
  }
  if (typeof window !== 'undefined' && window?.location?.origin) {
    const o = window.location.origin;
    if (!o.includes('localhost') && !o.includes('127.0.0.1')) return `${o}/?mode=bus`;
  }
  return 'https://epsa.millionstrongmen.com/?mode=bus';
})();

const ClinicalModePrintForm = ({ onBack, answers = {} }) => {
  const formRef = useRef(null);
  const { t } = useTranslation();

  const chk = (field, value) => {
    const v = answers[field];
    if (v === undefined || v === null) return false;
    return String(v) === String(value);
  };

  const val = (field, fallback = '') => answers[field] ?? fallback;

  const handlePrint = async () => {
    if (!formRef.current) return;
    const btn = document.querySelector('.btn-print');
    if (!btn) return;
    const orig = btn.textContent;
    btn.textContent = t('printableForm.generatingPdf');
    btn.disabled = true;

    try {
      const canvas = await html2canvas(formRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: formRef.current.scrollWidth,
        height: formRef.current.scrollHeight,
        windowWidth: formRef.current.scrollWidth,
        windowHeight: formRef.current.scrollHeight,
      });

      const pdf = new jsPDF('portrait', 'pt', 'letter');
      const margin = 20;
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const cw = pw - margin * 2;
      const ch = ph - margin * 2;
      const fullH = (canvas.height * cw) / canvas.width;

      if (fullH <= ch) {
        pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', margin, margin, cw, fullH, undefined, 'FAST');
      } else {
        const srcPH = Math.floor((ch * canvas.width) / cw);
        let offsetY = 0, page = 0;
        while (offsetY < canvas.height) {
          const srcH = Math.min(srcPH, canvas.height - offsetY);
          const pc = document.createElement('canvas');
          pc.width = canvas.width; pc.height = srcH;
          const ctx = pc.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, pc.width, pc.height);
          ctx.drawImage(canvas, 0, offsetY, canvas.width, srcH, 0, 0, canvas.width, srcH);
          if (page > 0) pdf.addPage();
          pdf.addImage(pc.toDataURL('image/png', 1.0), 'PNG', margin, margin, cw, (srcH * cw) / canvas.width, undefined, 'FAST');
          offsetY += srcH; page++;
        }
      }
      pdf.save('ePSA-Clinical-Screening.pdf');
    } catch {
      window.print();
    }

    btn.textContent = orig;
    btn.disabled = false;
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
      </div>

      <div className="printable-form-content" ref={formRef}>
        <div className="print-instructions">
          <strong>{t('printableForm.howToUseTitle')}</strong> {t('printableForm.howToUseText')}
        </div>

        {/* Header */}
        <div className="printable-header">
          <div className="header-top-row">
            <div className="notes-box">
              <label className="notes-label">{t('printableForm.notesLabel')}</label>
              <textarea className="notes-input" placeholder={t('printableForm.notesPlaceholder')} rows="2" />
            </div>
            <div className="header-center">
              <div className="printable-logo-container">
                <img src="/logo.png" alt={t('printableForm.logoAlt')} className="printable-logo"
                  onError={(e) => { e.target.src = '/logo.jpg'; e.target.onerror = () => { e.target.style.display = 'none'; }; }} />
              </div>
              <div className="printable-title-section">
                <div className="printable-title">{t('printableForm.millionStrongMenTitle')}</div>
                <h1 className="printable-heading">Clinical Screening Form</h1>
                <p className="printable-tagline">Quick-Entry Prostate Cancer Risk Assessment</p>
                <p className="printable-attribution">{t('printableForm.headerAttribution')}</p>
                <p className="printable-header-disclaimer">{t('printableForm.headerDisclaimer')}</p>
              </div>
            </div>
            <div className="phone-box">
              <label className="phone-label">{t('printableForm.phoneLabel')}</label>
              <input type="text" className="phone-input" placeholder={t('printableForm.phonePlaceholder')} />
              <ShareQrCode
                url={CLINICAL_MODE_URL}
                title="Start screening"
                subtitle="Scan to open on your device"
                size={80}
                clickable
                className="cmf-qr"
              />
            </div>
          </div>
        </div>

        <div className="printable-body">

          {/* Section: About You */}
          <div className="section-divider">
            <span className="section-label">{t('printableForm.sectionAboutYou')}</span>
          </div>

          <div className="form-row">
            <div className="form-field-inline">
              <label className="field-label-inline">
                <span className="field-number">1.</span> {t('part1.fields.age.title')} <span className="pf-guideline-badge">{t('part1.guideline.badge')}</span>:
                <input type="text" name="age" className="field-input-inline" placeholder={t('printableForm.blank4')} defaultValue={val('age')} />
              </label>
            </div>
            <div className="form-field-inline">
              <label className="field-label-inline">
                <span className="field-number">2.</span> {t('part1.fields.race.title')} <span className="pf-guideline-badge">{t('part1.guideline.badge')}</span>:
                <label className="checkbox-inline"><input type="radio" name="race" value="african-american" defaultChecked={chk('race', 'african-american')} /> {t('part1.race.african-american')}</label>
                <label className="checkbox-inline"><input type="radio" name="race" value="american-indian"  defaultChecked={chk('race', 'american-indian')} /> {t('part1.race.american-indian')}</label>
                <label className="checkbox-inline"><input type="radio" name="race" value="asian"            defaultChecked={chk('race', 'asian')} /> {t('part1.race.asian')}</label>
                <label className="checkbox-inline"><input type="radio" name="race" value="native-hawaiian"  defaultChecked={chk('race', 'native-hawaiian')} /> {t('part1.race.native-hawaiian')}</label>
                <label className="checkbox-inline"><input type="radio" name="race" value="white"            defaultChecked={chk('race', 'white')} /> {t('part1.race.white')}</label>
                <label className="checkbox-inline"><input type="radio" name="race" value="unknown"          defaultChecked={chk('race', 'unknown')} /> {t('part1.race.unknown')}</label>
              </label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field-inline">
              <label className="field-label-inline">
                <span className="field-number">2b.</span> {t('part1.fields.ethnicity.title')}:
                <label className="checkbox-inline"><input type="radio" name="ethnicity" value="hispanic-latino"     defaultChecked={chk('ethnicity', 'hispanic-latino')} /> {t('part1.ethnicity.hispanic-latino')}</label>
                <label className="checkbox-inline"><input type="radio" name="ethnicity" value="not-hispanic-latino" defaultChecked={chk('ethnicity', 'not-hispanic-latino')} /> {t('part1.ethnicity.not-hispanic-latino')}</label>
                <label className="checkbox-inline"><input type="radio" name="ethnicity" value="unknown"             defaultChecked={chk('ethnicity', 'unknown')} /> {t('part1.ethnicity.unknown')}</label>
              </label>
            </div>
          </div>

          {/* Section: Family / Genetic Risk */}
          <div className="section-divider">
            <span className="section-label">{t('printableForm.sectionFamilyGeneticRisk')}</span>
          </div>

          <div className="form-row">
            <div className="form-field-inline">
              <label className="field-label-inline">
                <span className="field-number">3.</span> {t('part1.step1.familyHistory.title')} <span className="pf-guideline-badge">{t('part1.guideline.badge')}</span>:
                <label className="checkbox-inline"><input type="radio" name="family" value="none"    defaultChecked={chk('familyHistory', 'none')} /> {t('quickEntry.family.none')}</label>
                <label className="checkbox-inline"><input type="radio" name="family" value="one"     defaultChecked={chk('familyHistory', 'one')} /> {t('quickEntry.family.one')}</label>
                <label className="checkbox-inline"><input type="radio" name="family" value="twoplus" defaultChecked={chk('familyHistory', 'twoplus')} /> {t('quickEntry.family.twoPlus')}</label>
                <label className="checkbox-inline"><input type="radio" name="family" value="unknown" defaultChecked={chk('familyHistory', 'unknown')} /> {t('part1.options.unknown')}</label>
              </label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field-inline">
              <label className="field-label-inline">
                <span className="field-number">12.</span> {t('part1.fields.brcaStatus.title')} <span className="pf-guideline-badge">{t('part1.guideline.badge')}</span>:
                <label className="checkbox-inline"><input type="radio" name="brca" value="no"      defaultChecked={chk('brca', 'no')} /> {t('part1.options.no')}</label>
                <label className="checkbox-inline"><input type="radio" name="brca" value="yes"     defaultChecked={chk('brca', 'yes')} /> {t('part1.options.yes')}</label>
                <label className="checkbox-inline"><input type="radio" name="brca" value="unknown" defaultChecked={chk('brca', 'unknown')} /> {t('part1.options.unknown')}</label>
              </label>
            </div>
          </div>

          {/* Section: Body Metrics */}
          <div className="section-divider">
            <span className="section-label">{t('printableForm.sectionBodyMetrics')}</span>
          </div>

          <div className="form-row">
            <div className="form-field-inline">
              <label className="field-label-inline">
                <span className="field-number">5.</span> {t('part1.step2.heightQuestion')} <span className="pf-nonguideline-badge">{t('part1.nonGuideline.badge')}</span>:
                <label className="checkbox-inline"><input type="radio" name="heightUnit" value="imperial" defaultChecked={val('heightUnit') !== 'metric'} /> {t('part1.step2.heightUnit.imperial')}</label>
                <input type="text" name="heightFt" className="field-input-tiny" placeholder={t('printableForm.blank2')} defaultValue={val('heightFt')} /> {t('printableForm.ft')}
                <input type="text" name="heightIn" className="field-input-tiny" placeholder={t('printableForm.blank2')} defaultValue={val('heightIn')} /> {t('printableForm.in')}
                <label className="checkbox-inline"><input type="radio" name="heightUnit" value="metric" defaultChecked={val('heightUnit') === 'metric'} /> {t('part1.step2.heightUnit.metric')}</label>
                <input type="text" name="heightCm" className="field-input-small" placeholder={t('printableForm.blankCm')} defaultValue={val('heightCm')} />
              </label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field-inline">
              <label className="field-label-inline">
                <span className="field-number">6.</span> {t('part1.step2.weightQuestion')} <span className="pf-nonguideline-badge">{t('part1.nonGuideline.badge')}</span>:
                <label className="checkbox-inline"><input type="radio" name="weightUnit" value="lbs" defaultChecked={val('weightUnit') !== 'kg'} /> {t('printableForm.lbs')}</label>
                <input type="text" name="weightLbs" className="field-input-small" placeholder={t('printableForm.blank4')} defaultValue={val('weightLbs')} />
                <label className="checkbox-inline"><input type="radio" name="weightUnit" value="kg" defaultChecked={val('weightUnit') === 'kg'} /> {t('printableForm.kg')}</label>
                <input type="text" name="weightKg" className="field-input-small" placeholder={t('printableForm.blank4')} defaultValue={val('weightKg')} />
              </label>
            </div>
          </div>

          {/* Section: Lifestyle */}
          <div className="section-divider">
            <span className="section-label">{t('printableForm.sectionLifestyle')}</span>
          </div>

          <div className="form-row">
            <div className="form-field-inline">
              <label className="field-label-inline">
                <span className="field-number">7.</span> {t('part1.fields.exercise.title')} <span className="pf-nonguideline-badge">{t('part1.nonGuideline.badge')}</span>:
                <label className="checkbox-inline"><input type="radio" name="exercise" value="0" defaultChecked={chk('exercise', 0) || chk('exercise', '0')} /> {t('part1.step3.exercise.regular')}</label>
                <label className="checkbox-inline"><input type="radio" name="exercise" value="1" defaultChecked={chk('exercise', 1) || chk('exercise', '1')} /> {t('part1.step3.exercise.some')}</label>
                <label className="checkbox-inline"><input type="radio" name="exercise" value="2" defaultChecked={chk('exercise', 2) || chk('exercise', '2')} /> {t('part1.step3.exercise.none')}</label>
              </label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field-inline">
              <label className="field-label-inline">
                <span className="field-number">8.</span> {t('part1.fields.smoking.title')} <span className="pf-nonguideline-badge">{t('part1.nonGuideline.badge')}</span>:
                <label className="checkbox-inline"><input type="radio" name="smoking" value="0" defaultChecked={chk('smoking', 0) || chk('smoking', '0')} /> {t('part1.step3.smoking.never')}</label>
                <label className="checkbox-inline"><input type="radio" name="smoking" value="1" defaultChecked={chk('smoking', 1) || chk('smoking', '1')} /> {t('part1.step3.smoking.former')}</label>
                <label className="checkbox-inline"><input type="radio" name="smoking" value="2" defaultChecked={chk('smoking', 2) || chk('smoking', '2')} /> {t('part1.step3.smoking.current')}</label>
              </label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field-inline">
              <label className="field-label-inline">
                <span className="field-number">9.</span> {t('part1.fields.diet.title')} <span className="pf-nonguideline-badge">{t('part1.nonGuideline.badge')}</span>:
                <label className="checkbox-inline"><input type="radio" name="diet" value="western"       defaultChecked={chk('diet', 'western')} /> {t('part1.step4.diet.western')}</label>
                <label className="checkbox-inline"><input type="radio" name="diet" value="mediterranean" defaultChecked={chk('diet', 'mediterranean')} /> {t('part1.step4.diet.mediterranean')}</label>
                <label className="checkbox-inline"><input type="radio" name="diet" value="indian"        defaultChecked={chk('diet', 'indian')} /> {t('part1.step4.diet.indian')}</label>
                <label className="checkbox-inline"><input type="radio" name="diet" value="dash"          defaultChecked={chk('diet', 'dash')} /> {t('part1.step4.diet.dash')}</label>
                <label className="checkbox-inline"><input type="radio" name="diet" value="plant-based"   defaultChecked={chk('diet', 'plant-based')} /> {t('part1.step4.diet.plantBased')}</label>
                <label className="checkbox-inline"><input type="radio" name="diet" value="pescatarian"   defaultChecked={chk('diet', 'pescatarian')} /> {t('part1.step4.diet.pescatarian')}</label>
                <label className="checkbox-inline"><input type="radio" name="diet" value="low-carb-keto" defaultChecked={chk('diet', 'low-carb-keto')} /> {t('part1.step4.diet.lowCarbKeto')}</label>
                <label className="checkbox-inline"><input type="radio" name="diet" value="other"         defaultChecked={chk('diet', 'other')} /> {t('part1.step4.diet.other')}</label>
              </label>
            </div>
          </div>

          {/* Section: Comorbidities */}
          <div className="section-divider">
            <span className="section-label">{t('printableForm.sectionComorbidities')}</span>
          </div>

          <div className="form-row">
            <div className="form-field-inline">
              <label className="field-label-inline">
                <span className="field-number">10.</span> Major comorbidities (hypertension, hyperlipidemia, CAD, diabetes) <span className="pf-nonguideline-badge">{t('part1.nonGuideline.badge')}</span>:
                <label className="checkbox-inline"><input type="radio" name="comorbidities" value="none" defaultChecked={chk('comorbidities', 'none')} /> None</label>
                <label className="checkbox-inline"><input type="radio" name="comorbidities" value="one"  defaultChecked={chk('comorbidities', 'one')} /> One</label>
                <label className="checkbox-inline"><input type="radio" name="comorbidities" value="two+" defaultChecked={chk('comorbidities', 'two+')} /> Two or more</label>
              </label>
            </div>
          </div>

          {/* Section: Symptoms */}
          <div className="section-divider">
            <span className="section-label">{t('printableForm.sectionSymptoms')}</span>
          </div>

          <div className="form-row">
            <div className="form-field-inline">
              <label className="field-label-inline">
                <span className="field-number">4.</span> {t('part1.steps.ipss.sectionTitle')} — Overall urinary quality of life <span className="pf-nonguideline-badge">{t('part1.nonGuideline.badge')}</span>:
                <label className="checkbox-inline"><input type="radio" name="qol" value="0" defaultChecked={chk('qol', 0) || chk('qol', '0')} /> 0 – Delighted</label>
                <label className="checkbox-inline"><input type="radio" name="qol" value="1" defaultChecked={chk('qol', 1) || chk('qol', '1')} /> 1 – Pleased</label>
                <label className="checkbox-inline"><input type="radio" name="qol" value="2" defaultChecked={chk('qol', 2) || chk('qol', '2')} /> 2 – Mostly satisfied</label>
                <label className="checkbox-inline"><input type="radio" name="qol" value="3" defaultChecked={chk('qol', 3) || chk('qol', '3')} /> 3 – Mixed</label>
                <label className="checkbox-inline"><input type="radio" name="qol" value="4" defaultChecked={chk('qol', 4) || chk('qol', '4')} /> 4 – Mostly dissatisfied</label>
                <label className="checkbox-inline"><input type="radio" name="qol" value="5" defaultChecked={chk('qol', 5) || chk('qol', '5')} /> 5 – Unhappy</label>
                <label className="checkbox-inline"><input type="radio" name="qol" value="6" defaultChecked={chk('qol', 6) || chk('qol', '6')} /> 6 – Terrible</label>
              </label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field-inline">
              <label className="field-label-inline">
                <span className="field-number">11.</span> {t('part1.fields.shim.title')} — Erectile function <span className="pf-nonguideline-badge">{t('part1.nonGuideline.badge')}</span>:
                <label className="checkbox-inline"><input type="radio" name="shim" value="1" defaultChecked={chk('shim', 1) || chk('shim', '1')} /> {t('part1.shimShort.options.severe')}</label>
                <label className="checkbox-inline"><input type="radio" name="shim" value="2" defaultChecked={chk('shim', 2) || chk('shim', '2')} /> {t('part1.shimShort.options.moderate')}</label>
                <label className="checkbox-inline"><input type="radio" name="shim" value="3" defaultChecked={chk('shim', 3) || chk('shim', '3')} /> {t('part1.shimShort.options.mildModerate')}</label>
                <label className="checkbox-inline"><input type="radio" name="shim" value="4" defaultChecked={chk('shim', 4) || chk('shim', '4')} /> {t('part1.shimShort.options.mild')}</label>
                <label className="checkbox-inline"><input type="radio" name="shim" value="5" defaultChecked={chk('shim', 5) || chk('shim', '5')} /> {t('part1.shimShort.options.none')}</label>
              </label>
            </div>
          </div>

          <div className="printable-footer">
            <p className="footer-text">{t('printableForm.footerDisclaimer')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicalModePrintForm;
