import React, { useState } from 'react';
import './BiopsyForm.css';

const GGG_OPTIONS = [
  { value: 1, label: 'GG1 — Gleason 6 (3+3)', sub: 'Very low grade' },
  { value: 2, label: 'GG2 — Gleason 7 (3+4)', sub: 'Low-intermediate grade' },
  { value: 3, label: 'GG3 — Gleason 7 (4+3)', sub: 'Intermediate grade' },
  { value: 4, label: 'GG4 — Gleason 8',        sub: 'High grade' },
  { value: 5, label: 'GG5 — Gleason 9-10',     sub: 'Very high grade' },
];

const BiopsyForm = ({ onSubmit, preResult }) => {
  const [biopsyGGG, setBiopsyGGG] = useState('');
  const [coresPositive, setCoresPositive] = useState('');
  const [coresTotal, setCoresTotal] = useState('');
  const [maxCorePct, setMaxCorePct] = useState('');
  const [psaValue, setPsaValue] = useState('');
  const [prostateVolume, setProstateVolume] = useState('');
  const [pirads, setPirads] = useState('');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!biopsyGGG) errs.biopsyGGG = 'Gleason Grade Group is required.';
    if (coresPositive === '') errs.coresPositive = 'Number of positive cores is required.';
    if (coresTotal === '') errs.coresTotal = 'Total cores is required.';
    if (coresPositive !== '' && coresTotal !== '' && Number(coresPositive) > Number(coresTotal)) {
      errs.coresPositive = 'Positive cores cannot exceed total cores.';
    }
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onSubmit({
      biopsyGGG: Number(biopsyGGG),
      coresPositive: Number(coresPositive),
      coresTotal: Number(coresTotal),
      maxCorePct: maxCorePct !== '' ? Number(maxCorePct) : null,
      psaValue: psaValue !== '' ? Number(psaValue) : null,
      prostateVolume: prostateVolume !== '' ? Number(prostateVolume) : null,
      pirads: pirads !== '' ? Number(pirads) : null,
    });
  };

  return (
    <form className="biopsy-form" onSubmit={handleSubmit} noValidate>
      <div className="biopsy-form-header">
        <h2 className="biopsy-form-title">Biopsy Results</h2>
        <p className="biopsy-form-sub">
          Enter your biopsy findings below. Required fields are marked with *.
          Your Part 1 risk profile will be combined with these results to assess
          active surveillance suitability.
        </p>
      </div>

      {/* GGG */}
      <div className="biopsy-field">
        <label className="biopsy-label">
          What was your biopsy result? <span className="biopsy-required">*</span>
        </label>
        <p className="biopsy-help">This is on your biopsy report. Ask your urologist if you are unsure.</p>
        <div className="biopsy-radio-group">
          {GGG_OPTIONS.map(({ value, label, sub }) => (
            <label key={value} className={`biopsy-radio-card ${Number(biopsyGGG) === value ? 'biopsy-radio-card--selected' : ''}`}>
              <input
                type="radio"
                name="biopsyGGG"
                value={value}
                checked={Number(biopsyGGG) === value}
                onChange={() => { setBiopsyGGG(value); setErrors(prev => ({ ...prev, biopsyGGG: undefined })); }}
              />
              <span className="biopsy-radio-label">{label}</span>
              <span className="biopsy-radio-sub">{sub}</span>
            </label>
          ))}
        </div>
        {errors.biopsyGGG && <p className="biopsy-error">{errors.biopsyGGG}</p>}
      </div>

      {/* Cores */}
      <div className="biopsy-field-row">
        <div className="biopsy-field">
          <label className="biopsy-label" htmlFor="coresPositive">
            Positive cores <span className="biopsy-required">*</span>
          </label>
          <p className="biopsy-help">How many cores were positive for cancer?</p>
          <input
            id="coresPositive"
            className={`biopsy-input ${errors.coresPositive ? 'biopsy-input--error' : ''}`}
            type="number"
            min="1"
            max="36"
            placeholder="e.g. 2"
            value={coresPositive}
            onChange={e => { setCoresPositive(e.target.value); setErrors(prev => ({ ...prev, coresPositive: undefined })); }}
          />
          {errors.coresPositive && <p className="biopsy-error">{errors.coresPositive}</p>}
        </div>

        <div className="biopsy-field">
          <label className="biopsy-label" htmlFor="coresTotal">
            Total cores <span className="biopsy-required">*</span>
          </label>
          <p className="biopsy-help">How many cores were taken in total?</p>
          <input
            id="coresTotal"
            className={`biopsy-input ${errors.coresTotal ? 'biopsy-input--error' : ''}`}
            type="number"
            min="1"
            max="36"
            placeholder="e.g. 12"
            value={coresTotal}
            onChange={e => { setCoresTotal(e.target.value); setErrors(prev => ({ ...prev, coresTotal: undefined })); }}
          />
          {errors.coresTotal && <p className="biopsy-error">{errors.coresTotal}</p>}
        </div>
      </div>

      {/* Max core % */}
      <div className="biopsy-field">
        <label className="biopsy-label" htmlFor="maxCorePct">
          Highest core involvement %
          <span className="biopsy-optional"> (optional)</span>
        </label>
        <p className="biopsy-help">What was the highest percentage of cancer in any single core? Found on your biopsy report — leave blank if unknown.</p>
        <input
          id="maxCorePct"
          className="biopsy-input biopsy-input--short"
          type="number"
          min="0"
          max="100"
          placeholder="e.g. 15"
          value={maxCorePct}
          onChange={e => setMaxCorePct(e.target.value)}
        />
      </div>

      {/* PSA */}
      <div className="biopsy-field">
        <label className="biopsy-label" htmlFor="psaValue">
          Most recent PSA (ng/mL)
          <span className="biopsy-optional"> (optional)</span>
        </label>
        <input
          id="psaValue"
          className="biopsy-input biopsy-input--short"
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 5.2"
          value={psaValue}
          onChange={e => setPsaValue(e.target.value)}
        />
      </div>

      {/* Prostate volume */}
      <div className="biopsy-field">
        <label className="biopsy-label" htmlFor="prostateVolume">
          Prostate volume in cm³
          <span className="biopsy-optional"> (optional)</span>
        </label>
        <p className="biopsy-help">From MRI or ultrasound — leave blank if not known. Needed to calculate PSA density.</p>
        <input
          id="prostateVolume"
          className="biopsy-input biopsy-input--short"
          type="number"
          min="0"
          step="0.1"
          placeholder="e.g. 35"
          value={prostateVolume}
          onChange={e => setProstateVolume(e.target.value)}
        />
      </div>

      {/* PI-RADS */}
      <div className="biopsy-field">
        <label className="biopsy-label" htmlFor="pirads">
          PI-RADS score from your MRI
          <span className="biopsy-optional"> (optional)</span>
        </label>
        <select
          id="pirads"
          className="biopsy-select"
          value={pirads}
          onChange={e => setPirads(e.target.value)}
        >
          <option value="">— Not done —</option>
          <option value="1">1 — Very low suspicion</option>
          <option value="2">2 — Low suspicion</option>
          <option value="3">3 — Intermediate suspicion</option>
          <option value="4">4 — High suspicion</option>
          <option value="5">5 — Very high suspicion</option>
        </select>
      </div>

      <button type="submit" className="biopsy-submit-btn">
        Evaluate Active Surveillance Suitability
      </button>
    </form>
  );
};

export default BiopsyForm;
