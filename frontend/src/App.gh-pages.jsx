import React, { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'epsa-gh-pages-records-v2';

const RACE_OPTIONS = ['White', 'Black', 'Hispanic', 'Asian', 'Other'];
const FAMILY_HISTORY_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'one', label: '1 relative' },
  { value: 'twoPlus', label: '2+ relatives' }
];
const YES_NO_UNKNOWN = ['yes', 'no', 'unknown'];

const IPSS_QUESTIONS = [
  'Incomplete emptying',
  'Frequency',
  'Intermittency',
  'Urgency',
  'Weak stream',
  'Straining',
  'Nocturia'
];

const SHIM_QUESTIONS = [
  { label: 'Confidence', min: 1, max: 5 },
  { label: 'Hard enough', min: 0, max: 5 },
  { label: 'Maintain after', min: 0, max: 5 },
  { label: 'Difficulty maintain', min: 0, max: 5 },
  { label: 'Satisfactory', min: 0, max: 5 }
];

const emptyForm = {
  patientId: '',
  assessmentDate: '',
  phoneNumber: '',
  notes: '',
  age: '',
  race: '',
  familyHistory: '',
  inflammationHistory: '',
  brcaStatus: '',
  heightUnit: 'imperial',
  heightFt: '',
  heightIn: '',
  heightCm: '',
  weightUnit: 'lbs',
  weight: '',
  weightKg: '',
  exercise: '',
  smoking: '',
  chemicalExposure: '',
  dietPattern: '',
  ipss: Array(7).fill(''),
  shim: Array(5).fill(''),
  psaValue: '',
  medication: '',
  pirads: '',
  onHormonalTherapy: ''
};

const sectionStyle = {
  background: '#fff',
  border: '1px solid #d9e2ef',
  borderRadius: 12,
  padding: 16,
  boxShadow: '0 4px 14px rgba(31, 68, 115, 0.08)'
};

const labelStyle = { display: 'block', fontWeight: 600, marginBottom: 6, color: '#10365c' };
const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #b9c8dc',
  fontSize: 14,
  boxSizing: 'border-box'
};

const App = () => {
  const [formData, setFormData] = useState(emptyForm);
  const [records, setRecords] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (Array.isArray(saved.records)) setRecords(saved.records);
      if (saved.currentDraft && typeof saved.currentDraft === 'object') {
        setFormData({ ...emptyForm, ...saved.currentDraft });
      }
    } catch (error) {
      console.error('Failed to load local data', error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 3,
      savedAt: new Date().toISOString(),
      currentDraft: formData,
      records
    }));
  }, [formData, records]);

  const shimScore = useMemo(
    () => formData.shim.reduce((sum, value) => sum + Number(value || 0), 0),
    [formData.shim]
  );

  const ipssScore = useMemo(
    () => formData.ipss.reduce((sum, value) => sum + Number(value || 0), 0),
    [formData.ipss]
  );

  const bmi = useMemo(() => {
    const imperialInches = Number(formData.heightFt || 0) * 12 + Number(formData.heightIn || 0);
    const imperialWeight = Number(formData.weight || 0);

    if (formData.heightUnit === 'imperial' && imperialInches > 0 && imperialWeight > 0) {
      return ((imperialWeight / (imperialInches * imperialInches)) * 703).toFixed(1);
    }

    const cm = Number(formData.heightCm || 0);
    const kg = Number(formData.weightKg || 0);
    if (formData.heightUnit === 'metric' && cm > 0 && kg > 0) {
      const meters = cm / 100;
      return (kg / (meters * meters)).toFixed(1);
    }

    return '';
  }, [formData.heightFt, formData.heightIn, formData.weight, formData.heightCm, formData.weightKg, formData.heightUnit]);

  const onChange = ({ target: { name, value } }) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onArrayChange = (arrayName, index, value) => {
    setFormData((prev) => {
      const next = [...prev[arrayName]];
      next[index] = value;
      return { ...prev, [arrayName]: next };
    });
  };

  const handleSave = (event) => {
    event.preventDefault();
    if (!formData.age || !formData.race || !formData.psaValue) {
      setStatusMessage('Please complete at least age, race/ethnicity, and PSA level before saving.');
      return;
    }

    const record = {
      ...formData,
      id: String(Date.now()),
      createdAt: new Date().toISOString(),
      shimScore,
      ipssScore,
      bmi
    };

    setRecords((prev) => [record, ...prev]);
    setStatusMessage('Record saved locally. You can export JSON or print to PDF.');
  };

  const handleExport = () => {
    const payload = { exportedAt: new Date().toISOString(), version: 3, records };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `epsa-records-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const scoreOptions = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => String(i + start));

  return (
    <main style={{ maxWidth: 1080, margin: '0 auto', padding: 20, fontFamily: 'Inter, Arial, sans-serif', background: '#f4f8ff' }}>
      <div style={{ ...sectionStyle, marginBottom: 14, background: 'linear-gradient(135deg, #f7fbff, #eef5ff)' }}>
        <h1 style={{ marginTop: 0, marginBottom: 6, color: '#0f2e4f' }}>MILLION STRONG MEN - ePSA Questionnaire</h1>
        <p style={{ marginTop: 0, color: '#335277' }}>Prostate-Specific Awareness | A Non-Validated Educational Risk Tool</p>
        <p style={{ marginBottom: 0, fontSize: 14 }}>
          <strong>How to use this form:</strong> Please review each section with the patient and fill in blank fields.
          If a value is already shown, confirm it is correct. Use Notes for medications, recent lab history,
          symptoms, and follow-up plans.
        </p>
      </div>

      <form onSubmit={handleSave} style={{ display: 'grid', gap: 14 }}>
        <section style={sectionStyle}>
          <h2 style={{ marginTop: 0 }}>Header Details</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
            <div>
              <label style={labelStyle}>Patient ID</label>
              <input name="patientId" value={formData.patientId} onChange={onChange} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Assessment Date</label>
              <input name="assessmentDate" type="date" value={formData.assessmentDate} onChange={onChange} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Phone Number</label>
              <input name="phoneNumber" value={formData.phoneNumber} onChange={onChange} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={labelStyle}>Notes</label>
            <textarea name="notes" value={formData.notes} onChange={onChange} style={{ ...inputStyle, minHeight: 80 }} />
          </div>
        </section>

        <section style={sectionStyle}>
          <h2 style={{ marginTop: 0 }}>Part 1 - About You, Family Risk, Body Metrics & Lifestyle</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <div><label style={labelStyle}>1. Age</label><input name="age" type="number" value={formData.age} onChange={onChange} style={inputStyle} /></div>
            <div>
              <label style={labelStyle}>2. Race / Ethnicity</label>
              <select name="race" value={formData.race} onChange={onChange} style={inputStyle}>
                <option value="">Select...</option>
                {RACE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>3. Family History of prostate cancer</label>
              <select name="familyHistory" value={formData.familyHistory} onChange={onChange} style={inputStyle}>
                <option value="">Select...</option>
                {FAMILY_HISTORY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>4. Previous History of Inflammation</label>
              <select name="inflammationHistory" value={formData.inflammationHistory} onChange={onChange} style={inputStyle}>
                <option value="">Select...</option>
                <option value="no">No</option>
                <option value="yes">Yes (Ulcerative Colitis, Crohn&apos;s, chronic prostatitis)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>5. Known BRCA1/BRCA2 mutation</label>
              <select name="brcaStatus" value={formData.brcaStatus} onChange={onChange} style={inputStyle}>
                <option value="">Select...</option>
                {YES_NO_UNKNOWN.map((opt) => <option key={opt} value={opt}>{opt.toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 12, display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div>
              <label style={labelStyle}>6. Height Unit</label>
              <select name="heightUnit" value={formData.heightUnit} onChange={onChange} style={inputStyle}>
                <option value="imperial">Feet/Inches</option>
                <option value="metric">Centimeters</option>
              </select>
            </div>
            {formData.heightUnit === 'imperial' ? (
              <>
                <div><label style={labelStyle}>Height (ft)</label><input name="heightFt" value={formData.heightFt} onChange={onChange} style={inputStyle} /></div>
                <div><label style={labelStyle}>Height (in)</label><input name="heightIn" value={formData.heightIn} onChange={onChange} style={inputStyle} /></div>
              </>
            ) : (
              <div><label style={labelStyle}>Height (cm)</label><input name="heightCm" value={formData.heightCm} onChange={onChange} style={inputStyle} /></div>
            )}

            <div>
              <label style={labelStyle}>7. Weight Unit</label>
              <select name="weightUnit" value={formData.weightUnit} onChange={onChange} style={inputStyle}>
                <option value="lbs">lbs</option>
                <option value="kg">kg</option>
              </select>
            </div>
            {formData.weightUnit === 'lbs' ? (
              <div><label style={labelStyle}>Weight (lbs)</label><input name="weight" value={formData.weight} onChange={onChange} style={inputStyle} /></div>
            ) : (
              <div><label style={labelStyle}>Weight (kg)</label><input name="weightKg" value={formData.weightKg} onChange={onChange} style={inputStyle} /></div>
            )}
            <div><label style={labelStyle}>BMI (auto)</label><input value={bmi} readOnly style={{ ...inputStyle, background: '#f0f4fa' }} /></div>
            <div><label style={labelStyle}>8. Exercise level</label><input name="exercise" value={formData.exercise} onChange={onChange} placeholder="Regular / Some / None" style={inputStyle} /></div>
            <div><label style={labelStyle}>9. Smoking status</label><input name="smoking" value={formData.smoking} onChange={onChange} placeholder="Current / Former / Never" style={inputStyle} /></div>
            <div><label style={labelStyle}>10. Chemical exposure</label><input name="chemicalExposure" value={formData.chemicalExposure} onChange={onChange} placeholder="Yes / No" style={inputStyle} /></div>
            <div><label style={labelStyle}>11. Diet pattern</label><input name="dietPattern" value={formData.dietPattern} onChange={onChange} style={inputStyle} /></div>
          </div>
        </section>

        <section style={sectionStyle}>
          <h2 style={{ marginTop: 0 }}>Symptoms</h2>
          <p style={{ marginTop: 0 }}>12. URINARY SYMPTOMS (IPSS) - Rate 0-5</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            {IPSS_QUESTIONS.map((question, index) => (
              <div key={question}>
                <label style={labelStyle}>{question}</label>
                <select value={formData.ipss[index]} onChange={(e) => onArrayChange('ipss', index, e.target.value)} style={inputStyle}>
                  <option value="">Select...</option>
                  {scoreOptions(0, 5).map((score) => <option key={score} value={score}>{score}</option>)}
                </select>
              </div>
            ))}
          </div>
          <strong style={{ display: 'block', marginTop: 8 }}>IPSS Total: {ipssScore} / 35</strong>

          <p style={{ marginBottom: 8, marginTop: 14 }}>13. SEXUAL HEALTH (SHIM)</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            {SHIM_QUESTIONS.map((question, index) => (
              <div key={question.label}>
                <label style={labelStyle}>{question.label}</label>
                <select value={formData.shim[index]} onChange={(e) => onArrayChange('shim', index, e.target.value)} style={inputStyle}>
                  <option value="">Select...</option>
                  {scoreOptions(question.min, question.max).map((score) => <option key={score} value={score}>{score}</option>)}
                </select>
              </div>
            ))}
          </div>
          <strong style={{ display: 'block', marginTop: 8 }}>SHIM Total: {shimScore} / 25</strong>
        </section>

        <section style={sectionStyle}>
          <h2 style={{ marginTop: 0 }}>Part 2 - Clinical Data</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <div><label style={labelStyle}>12. PSA Level (ng/mL)</label><input name="psaValue" type="number" step="0.01" min="0" value={formData.psaValue} onChange={onChange} style={inputStyle} /></div>
            <div><label style={labelStyle}>Medication</label><input name="medication" value={formData.medication} onChange={onChange} placeholder="Finasteride / Dutasteride / Other" style={inputStyle} /></div>
            <div><label style={labelStyle}>13. MRI PIRADS Score</label><input name="pirads" value={formData.pirads} onChange={onChange} placeholder="N/A or 1-5" style={inputStyle} /></div>
            <div><label style={labelStyle}>On hormonal therapy affecting PSA</label><input name="onHormonalTherapy" value={formData.onHormonalTherapy} onChange={onChange} placeholder="Yes / No" style={inputStyle} /></div>
          </div>
        </section>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="submit" style={{ padding: '10px 14px', borderRadius: 8, border: 0, background: '#1457a8', color: '#fff' }}>Save Record</button>
          <button type="button" onClick={handleExport} disabled={!records.length} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #1457a8', background: '#fff', color: '#1457a8' }}>Export JSON</button>
          <button type="button" onClick={() => window.print()} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #9caec5', background: '#f7faff' }}>Print / Save PDF</button>
        </div>
      </form>

      {statusMessage && <p style={{ color: '#1f6f2a' }}>{statusMessage}</p>}
      <p style={{ color: '#4d6786' }}>Saved Records: {records.length}</p>
    </main>
  );
};

export default App;
