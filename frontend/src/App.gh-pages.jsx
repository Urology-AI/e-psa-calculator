import React, { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'epsa-gh-pages-records-v1';

const SHIM_OPTIONS = [
  { value: '0', label: '0 - No sexual activity' },
  { value: '1', label: '1 - Very low / Almost never' },
  { value: '2', label: '2 - Low / A few times' },
  { value: '3', label: '3 - Moderate / Sometimes' },
  { value: '4', label: '4 - Good / Most times' },
  { value: '5', label: '5 - Very good / Almost always' }
];

const IPSS_OPTIONS = [
  { value: '0', label: '0 - Not at all' },
  { value: '1', label: '1 - Less than 1 time in 5' },
  { value: '2', label: '2 - Less than half the time' },
  { value: '3', label: '3 - About half the time' },
  { value: '4', label: '4 - More than half the time' },
  { value: '5', label: '5 - Almost always' }
];

const IPSS_QOL_OPTIONS = [
  { value: '0', label: '0 - Delighted' },
  { value: '1', label: '1 - Pleased' },
  { value: '2', label: '2 - Mostly satisfied' },
  { value: '3', label: '3 - Mixed (equally satisfied/dissatisfied)' },
  { value: '4', label: '4 - Mostly dissatisfied' },
  { value: '5', label: '5 - Unhappy' },
  { value: '6', label: '6 - Terrible' }
];

const SHIM_QUESTIONS = [
  { key: 'shim1', label: 'SHIM Q1: Confidence in getting and keeping an erection' },
  { key: 'shim2', label: 'SHIM Q2: Erections hard enough for penetration' },
  { key: 'shim3', label: 'SHIM Q3: Ability to maintain erection after penetration' },
  { key: 'shim4', label: 'SHIM Q4: Difficulty maintaining erection to completion' },
  { key: 'shim5', label: 'SHIM Q5: Satisfaction with sexual intercourse' }
];

const IPSS_QUESTIONS = [
  { key: 'ipss1', label: 'IPSS Q1: Incomplete emptying sensation after urinating' },
  { key: 'ipss2', label: 'IPSS Q2: Need to urinate again within 2 hours' },
  { key: 'ipss3', label: 'IPSS Q3: Stopping and starting stream while urinating' },
  { key: 'ipss4', label: 'IPSS Q4: Difficulty postponing urination' },
  { key: 'ipss5', label: 'IPSS Q5: Weak urinary stream' },
  { key: 'ipss6', label: 'IPSS Q6: Need to strain/push to begin urination' },
  { key: 'ipss7', label: 'IPSS Q7: Nighttime urination frequency' }
];

const emptyForm = {
  patientId: '',
  assessmentDate: '',
  age: '',
  psaValue: '',
  notes: '',
  shim1: '', shim2: '', shim3: '', shim4: '', shim5: '',
  ipss1: '', ipss2: '', ipss3: '', ipss4: '', ipss5: '', ipss6: '', ipss7: '',
  ipssQol: ''
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
      version: 2,
      savedAt: new Date().toISOString(),
      currentDraft: formData,
      records
    }));
  }, [formData, records]);

  const shimScore = useMemo(
    () => SHIM_QUESTIONS.reduce((sum, question) => sum + Number(formData[question.key] || 0), 0),
    [formData]
  );

  const ipssScore = useMemo(
    () => IPSS_QUESTIONS.reduce((sum, question) => sum + Number(formData[question.key] || 0), 0),
    [formData]
  );

  const onChange = ({ target: { name, value } }) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = (event) => {
    event.preventDefault();
    if (!formData.patientId || !formData.assessmentDate || !formData.age || !formData.psaValue) {
      setStatusMessage('Fill patient ID, assessment date, age, and PSA value before saving.');
      return;
    }

    const record = {
      ...formData,
      id: String(Date.now()),
      createdAt: new Date().toISOString(),
      shimScore,
      ipssScore
    };

    setRecords((prev) => [record, ...prev]);
    setStatusMessage('Record saved locally. Use Export JSON to download.');
  };

  const handleExport = () => {
    const payload = { exportedAt: new Date().toISOString(), version: 2, records };
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

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h1>ePSA One-Page Intake (GitHub Pages)</h1>
      <p>Single-page form for collecting data, print/PDF, and JSON export.</p>

      <form onSubmit={handleSave} style={{ display: 'grid', gap: 10 }}>
        <h2>Patient Information</h2>
        <input name="patientId" value={formData.patientId} onChange={onChange} placeholder="Patient ID" />
        <input name="assessmentDate" type="date" value={formData.assessmentDate} onChange={onChange} />
        <input name="age" type="number" value={formData.age} onChange={onChange} placeholder="Age" min="0" />
        <input name="psaValue" type="number" step="0.01" min="0" value={formData.psaValue} onChange={onChange} placeholder="PSA Value (ng/mL)" />

        <h2>SHIM Questions (0-5 each)</h2>
        {SHIM_QUESTIONS.map((question) => (
          <label key={question.key}>
            {question.label}
            <select name={question.key} value={formData[question.key]} onChange={onChange} style={{ marginLeft: 8 }}>
              <option value="">Select score</option>
              {SHIM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        ))}
        <strong>SHIM Total: {shimScore} / 25</strong>

        <h2>IPSS Questions (0-5 each)</h2>
        {IPSS_QUESTIONS.map((question) => (
          <label key={question.key}>
            {question.label}
            <select name={question.key} value={formData[question.key]} onChange={onChange} style={{ marginLeft: 8 }}>
              <option value="">Select score</option>
              {IPSS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        ))}
        <label>
          IPSS Quality of Life: “If your urinary condition stays this way, how would you feel?”
          <select name="ipssQol" value={formData.ipssQol} onChange={onChange} style={{ marginLeft: 8 }}>
            <option value="">Select score</option>
            {IPSS_QOL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <strong>IPSS Total: {ipssScore} / 35</strong>

        <textarea name="notes" value={formData.notes} onChange={onChange} placeholder="Notes" rows={4} />

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="submit">Save Record</button>
          <button type="button" onClick={handleExport} disabled={!records.length}>Export JSON</button>
          <button type="button" onClick={() => window.print()}>Print / Save PDF</button>
        </div>
      </form>

      {statusMessage && <p style={{ color: '#1f6f2a' }}>{statusMessage}</p>}
      <h3>Saved Records: {records.length}</h3>
    </main>
  );
};

export default App;
