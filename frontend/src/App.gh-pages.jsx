import React, { useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'epsa-gh-pages-part1-v1';

const RACE_OPTIONS = [
  { value: 'white', label: 'White' },
  { value: 'black', label: 'Black' },
  { value: 'hispanic', label: 'Hispanic' },
  { value: 'asian', label: 'Asian' },
  { value: 'other', label: 'Other' }
];
const FAMILY_HISTORY_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 1, label: '1 relative' },
  { value: 2, label: '2+ relatives' }
];
const YES_NO_UNKNOWN = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unknown', label: 'Unknown' }
];

const EXERCISE_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Some activity' },
  { value: 2, label: 'Regular exercise' }
];

const SMOKING_OPTIONS = [
  { value: 0, label: 'Never' },
  { value: 1, label: 'Former' },
  { value: 2, label: 'Current' }
];

const CHEMICAL_EXPOSURE_OPTIONS = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' }
];

const DIET_OPTIONS = [
  { value: 'balanced', label: 'Balanced / Whole foods' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'highProcessed', label: 'High processed foods' }
];

const IPSS_QUESTIONS = [
  'Over the last month, how often have you had a sensation of not emptying your bladder completely after urinating?',
  'Over the last month, how often have you had to urinate again less than 2 hours after finishing urination?',
  'Over the last month, how often have you found you stopped and started again several times when urinating?',
  'Over the last month, how often have you found it difficult to postpone urination?',
  'Over the last month, how often have you had a weak urinary stream?',
  'Over the last month, how often have you had to push or strain to begin urination?',
  'Over the last month, how many times did you typically get up at night to urinate?'
];

const IPSS_OPTIONS = [
  { value: '0', label: '0 · Not at all' },
  { value: '1', label: '1 · Less than 1 in 5 times' },
  { value: '2', label: '2 · Less than half the time' },
  { value: '3', label: '3 · About half the time' },
  { value: '4', label: '4 · More than half the time' },
  { value: '5', label: '5 · Almost always' }
];

const SHIM_QUESTIONS = [
  {
    q: 'How do you rate your confidence that you could get and keep an erection?',
    opts: [[1, 'Very low'], [2, 'Low'], [3, 'Moderate'], [4, 'High'], [5, 'Very high']]
  },
  {
    q: 'When you had erections with sexual stimulation, how often were they hard enough for penetration?',
    opts: [[0, 'No sexual activity'], [1, 'Almost never'], [2, 'A few times'], [3, 'Sometimes'], [4, 'Most times'], [5, 'Almost always']]
  },
  {
    q: 'During intercourse, how often were you able to maintain your erection after penetration?',
    opts: [[0, 'Did not attempt intercourse'], [1, 'Almost never'], [2, 'A few times'], [3, 'Sometimes'], [4, 'Most times'], [5, 'Almost always']]
  },
  {
    q: 'During intercourse, how difficult was it to maintain your erection to completion?',
    opts: [[0, 'Did not attempt intercourse'], [1, 'Extremely difficult'], [2, 'Very difficult'], [3, 'Difficult'], [4, 'Slightly difficult'], [5, 'Not difficult']]
  },
  {
    q: 'When you attempted intercourse, how often was it satisfactory for you?',
    opts: [[0, 'Did not attempt intercourse'], [1, 'Almost never'], [2, 'A few times'], [3, 'Sometimes'], [4, 'Most times'], [5, 'Almost always']]
  }
];

const emptyForm = {
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
  bmi: 0
};

const cardStyle = {
  background: '#fff',
  border: '1px solid #d6e3f4',
  borderRadius: 14,
  padding: 16,
  boxShadow: '0 4px 14px rgba(22, 62, 110, 0.08)'
};

const buttonGroupStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginTop: 8
};

const choiceButton = (active) => ({
  border: active ? '2px solid #1457a8' : '1px solid #b5c9e3',
  background: active ? '#eaf3ff' : '#fff',
  color: '#0f355d',
  borderRadius: 999,
  padding: '8px 12px',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600
});

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #b9c8dc',
  fontSize: 14,
  boxSizing: 'border-box'
};

const ClickOptions = ({ options, value, onChange }) => (
  <div style={buttonGroupStyle}>
    {options.map((opt) => {
      const option = typeof opt === 'string' ? { value: opt, label: opt } : opt;
      return (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          style={choiceButton(value === option.value)}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

const App = () => {
  const fileInputRef = useRef(null);
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
      version: '1.0',
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

  const onField = (name, value) => setFormData((prev) => ({ ...prev, [name]: value }));

  const onArrayChange = (arrayName, index, value) => {
    setFormData((prev) => {
      const next = [...prev[arrayName]];
      next[index] = value;
      return { ...prev, [arrayName]: next };
    });
  };

  const handleSave = (event) => {
    event.preventDefault();
    if (!formData.age || !formData.race) {
      setStatusMessage('Please complete at least age and race/ethnicity before saving.');
      return;
    }

    const record = { ...formData, bmi, id: String(Date.now()), createdAt: new Date().toISOString(), shimScore, ipssScore };

    setRecords((prev) => [record, ...prev]);
    setStatusMessage('Record saved locally. Use JSON export/import to move data between Firebase and GitHub page versions.');
  };

  const handleExport = () => {
    const part1Data = {
      ...formData,
      bmi: Number(bmi || 0),
      age: String(formData.age || ''),
      heightFt: String(formData.heightFt || ''),
      heightIn: String(formData.heightIn || ''),
      heightCm: String(formData.heightCm || ''),
      weight: String(formData.weight || ''),
      weightKg: String(formData.weightKg || ''),
      ipss: formData.ipss.map((v) => Number(v || 0)),
      shim: formData.shim.map((v) => Number(v || 0))
    };
    const payload = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      part: 'part1',
      formData: part1Data
    };
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

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const imported = parsed?.formData && parsed?.part === 'part1' ? parsed.formData : parsed.currentDraft;
      if (imported && typeof imported === 'object') {
        setFormData({
          ...emptyForm,
          ...imported,
          ipss: Array.isArray(imported.ipss) ? imported.ipss.map((v) => String(v)) : emptyForm.ipss,
          shim: Array.isArray(imported.shim) ? imported.shim.map((v) => String(v)) : emptyForm.shim
        });
      }
      setStatusMessage('JSON import complete.');
    } catch (error) {
      console.error(error);
      setStatusMessage('Import failed. Please use a valid JSON export file.');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 20, fontFamily: 'Inter, Arial, sans-serif', background: '#f4f8ff' }}>
      <div style={{ ...cardStyle, marginBottom: 14, background: 'linear-gradient(135deg, #f7fbff, #eef5ff)' }}>
        <h1 style={{ marginTop: 0, marginBottom: 6, color: '#0f2e4f' }}>ePSA Questionnaire (GitHub Single-Page)</h1>
        <p style={{ marginTop: 0, color: '#335277' }}>Single-page part 1 flow aligned to Firebase fields and JSON format.</p>
        <p style={{ marginBottom: 0, fontSize: 14 }}>
          Most questions are click-only. Only age/height/weight use numeric inputs.
        </p>
      </div>

      <form onSubmit={handleSave} style={{ display: 'grid', gap: 14 }}>
        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Part 1 - Personal and Risk Profile</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            <div><strong>1. Age</strong><input name="age" type="number" min="18" max="120" value={formData.age} onChange={(e) => onField('age', e.target.value)} style={{ ...inputStyle, marginTop: 8, maxWidth: 200 }} /></div>
            <div><strong>2. Race / Ethnicity</strong><ClickOptions options={RACE_OPTIONS} value={formData.race} onChange={(v) => onField('race', v)} /></div>
            <div><strong>3. Family history of prostate cancer</strong><ClickOptions options={FAMILY_HISTORY_OPTIONS} value={formData.familyHistory} onChange={(v) => onField('familyHistory', v)} /></div>
            <div><strong>4. Previous inflammation (Crohn's, ulcerative colitis, chronic prostatitis)</strong><ClickOptions options={[{ value: 0, label: 'No' }, { value: 1, label: 'Yes' }]} value={formData.inflammationHistory} onChange={(v) => onField('inflammationHistory', v)} /></div>
            <div><strong>5. Known BRCA1/BRCA2 mutation</strong><ClickOptions options={YES_NO_UNKNOWN} value={formData.brcaStatus} onChange={(v) => onField('brcaStatus', v)} /></div>

            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div>
                <strong>6. Height unit</strong>
                <ClickOptions options={[{ value: 'imperial', label: 'Feet / Inches' }, { value: 'metric', label: 'Centimeters' }]} value={formData.heightUnit} onChange={(v) => onField('heightUnit', v)} />
              </div>
              {formData.heightUnit === 'imperial' ? (
                <>
                  <div><strong>Height (ft)</strong><input type="number" min="3" max="8" value={formData.heightFt} onChange={(e) => onField('heightFt', e.target.value)} style={{ ...inputStyle, marginTop: 8 }} /></div>
                  <div><strong>Height (in)</strong><input type="number" min="0" max="11" value={formData.heightIn} onChange={(e) => onField('heightIn', e.target.value)} style={{ ...inputStyle, marginTop: 8 }} /></div>
                </>
              ) : (
                <div><strong>Height (cm)</strong><input type="number" min="100" max="250" value={formData.heightCm} onChange={(e) => onField('heightCm', e.target.value)} style={{ ...inputStyle, marginTop: 8 }} /></div>
              )}

              <div>
                <strong>7. Weight unit</strong>
                <ClickOptions options={[{ value: 'lbs', label: 'lbs' }, { value: 'kg', label: 'kg' }]} value={formData.weightUnit} onChange={(v) => onField('weightUnit', v)} />
              </div>
              {formData.weightUnit === 'lbs' ? (
                <div><strong>Weight (lbs)</strong><input type="number" min="50" max="500" value={formData.weight} onChange={(e) => onField('weight', e.target.value)} style={{ ...inputStyle, marginTop: 8 }} /></div>
              ) : (
                <div><strong>Weight (kg)</strong><input type="number" min="25" max="250" value={formData.weightKg} onChange={(e) => onField('weightKg', e.target.value)} style={{ ...inputStyle, marginTop: 8 }} /></div>
              )}
              <div><strong>BMI (auto)</strong><input value={bmi} readOnly style={{ ...inputStyle, marginTop: 8, background: '#f0f4fa' }} /></div>
            </div>

            <div><strong>8. Exercise</strong><ClickOptions options={EXERCISE_OPTIONS} value={formData.exercise} onChange={(v) => onField('exercise', v)} /></div>
            <div><strong>9. Smoking status</strong><ClickOptions options={SMOKING_OPTIONS} value={formData.smoking} onChange={(v) => onField('smoking', v)} /></div>
            <div><strong>10. Chemical exposure</strong><ClickOptions options={CHEMICAL_EXPOSURE_OPTIONS} value={formData.chemicalExposure} onChange={(v) => onField('chemicalExposure', v)} /></div>
            <div><strong>11. Diet pattern</strong><ClickOptions options={DIET_OPTIONS} value={formData.dietPattern} onChange={(v) => onField('dietPattern', v)} /></div>
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Symptoms - IPSS</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {IPSS_QUESTIONS.map((question, index) => (
              <div key={question} style={{ border: '1px solid #e1ebf8', borderRadius: 12, padding: 12 }}>
                <strong>{index + 1}. {question}</strong>
                <ClickOptions options={IPSS_OPTIONS} value={formData.ipss[index]} onChange={(value) => onArrayChange('ipss', index, value)} />
              </div>
            ))}
          </div>
          <strong style={{ display: 'block', marginTop: 8 }}>IPSS Total: {ipssScore} / 35</strong>
        </section>

        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Sexual Health - SHIM</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {SHIM_QUESTIONS.map((question, index) => (
              <div key={question.q} style={{ border: '1px solid #e1ebf8', borderRadius: 12, padding: 12 }}>
                <strong>{index + 1}. {question.q}</strong>
                <ClickOptions
                  options={question.opts.map(([value, label]) => ({ value: String(value), label: `${value} · ${label}` }))}
                  value={formData.shim[index]}
                  onChange={(value) => onArrayChange('shim', index, value)}
                />
              </div>
            ))}
          </div>
          <strong style={{ display: 'block', marginTop: 8 }}>SHIM Total: {shimScore} / 25</strong>
        </section>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="submit" style={{ padding: '10px 14px', borderRadius: 8, border: 0, background: '#1457a8', color: '#fff' }}>Save Record</button>
          <button type="button" onClick={handleExport} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #1457a8', background: '#fff', color: '#1457a8' }}>Export JSON</button>
          <button type="button" onClick={() => fileInputRef.current?.click()} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #1457a8', background: '#f2f7ff', color: '#1457a8' }}>Import JSON</button>
          <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImport} style={{ display: 'none' }} />
          <button type="button" onClick={() => window.print()} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #9caec5', background: '#f7faff' }}>Print / Save PDF</button>
        </div>
      </form>

      {statusMessage && <p style={{ color: '#1f6f2a' }}>{statusMessage}</p>}
      <p style={{ color: '#4d6786' }}>Saved Records: {records.length}</p>
    </main>
  );
};

export default App;
