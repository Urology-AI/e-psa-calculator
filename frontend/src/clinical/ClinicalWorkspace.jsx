import React, { useCallback, useMemo, useRef, useState } from 'react';
import { UploadIcon, DownloadIcon, PlayIcon, PlusIcon, XIcon, FileTextIcon, TrashIcon, ArrowLeftIcon } from 'lucide-react';
import Part1Results from '../components/Part1Results.jsx';
import Part2Results from '../components/Part2Results.jsx';
import Part3Results from '../components/Part3Results.jsx';
import { downloadCsv } from '../utils/exportCsv';
import { parseCohortFile, normalisePatient, withPsaMri, buildTemplateCsv } from './cohortParser';
import { runCohort, buildCohortCsvRows } from './cohortRunner';
import { classify, predictedProb, summariseComparison } from './cohortCompare';
import './ClinicalWorkspace.css';

let uidCounter = 1;
const withUid = (p) => ({ ...p, uid: uidCounter++, status: 'pending', results: null, error: null });

const pct = (v) => (v === null || v === undefined ? '—' : `${(v * 100).toFixed(0)}%`);
const sum = (a) => (Array.isArray(a) ? a.reduce((s, v) => s + (v ?? 0), 0) : '—');
const tierClass = (t) => String(t || '').toLowerCase().replace(/[^a-z]+/g, '-');
const GG_OPTIONS = [['', '—'], ['0', 'Benign'], ['1', 'GG1'], ['2', 'GG2'], ['3', 'GG3'], ['4', 'GG4'], ['5', 'GG5']];

const AGREEMENT = {
  TP: { label: 'TP', title: 'Model positive, biopsy GG≥2', cls: 'ok' },
  TN: { label: 'TN', title: 'Model negative, biopsy benign/GG1', cls: 'ok' },
  FP: { label: 'FP', title: 'Model positive, biopsy benign/GG1', cls: 'bad' },
  FN: { label: 'FN', title: 'Model negative, biopsy GG≥2 (missed)', cls: 'bad' },
};

const FH_LABEL = { 0: 'None', 1: 'One', 2: '2+', 3: '2+', unknown: '?' };
// Part 1 answers shown in every row (hideable). `show` renders the cell text.
const ANSWER_COLUMNS = [
  { key: 'race', label: 'Race', show: (f) => f.race ?? '—' },
  { key: 'bmi', label: 'BMI', show: (f) => f.bmi ?? '—' },
  { key: 'ipss', label: 'IPSS', show: (f) => sum(f.ipss) },
  { key: 'shim', label: 'SHIM', show: (f) => sum(f.shim) },
  { key: 'fh', label: 'Fam hx', show: (f) => FH_LABEL[f.familyHistory] ?? f.familyHistory },
  { key: 'brca', label: 'BRCA', show: (f) => f.brcaStatus ?? '—' },
  { key: 'exercise', label: 'Exercise', show: (f) => ['Regular', 'Some', 'None'][f.exercise] ?? f.exercise },
  { key: 'smoking', label: 'Smoking', show: (f) => ['Never', 'Former', 'Current'][f.smoking] ?? f.smoking },
  { key: 'comorb', label: 'Comorb.', show: (f) => f.comorbidityScore },
  { key: 'diet', label: 'Diet', show: (f) => f.dietPattern },
];

const COLUMNS = [
  { key: 'id', label: 'Patient', sort: (p) => p.id },
  { key: 'age', label: 'Age', sort: (p) => p.part1.age },
  { key: 'part1', label: 'Part 1 score', sort: (p) => p.results?.part1?.score ?? -1 },
  { key: 'psa', label: 'PSA', sort: (p) => Number(p.part2?.psa ?? -1) },
  { key: 'pirads', label: 'PI-RADS', sort: (p) => Number(p.part2?.knowPirads ? p.part2.pirads : -1) },
  { key: 'part2', label: 'Part 2 risk', sort: (p) => parseFloat(p.results?.part2?.riskPct) || -1 },
  { key: 'part3', label: 'Part 3 · P(GG≥2)', sort: (p) => predictedProb(p)?.prob ?? -1 },
  { key: 'actual', label: 'Actual biopsy', sort: (p) => p.actual?.gg ?? -1 },
  { key: 'match', label: 'Match', sort: (p) => classify(p) || '' },
];

const Stat = ({ label, value, sub }) => (
  <div className="cw-stat">
    <div className="cw-stat__value">{value}</div>
    <div className="cw-stat__label">{label}</div>
    {sub && <div className="cw-stat__sub">{sub}</div>}
  </div>
);

const PatientDetail = ({ patient, onClose }) => {
  const r = patient.results;
  const p2 = patient.part2;
  const isMri = patient.part1.pathwayMode === 'post_mri';
  const noop = () => {};
  return (
    <aside className="cw-detail" aria-label={`Details for ${patient.id}`}>
      <div className="cw-detail__bar">
        <h2>{patient.id}</h2>
        <button type="button" className="cw-btn" onClick={onClose}><XIcon size={14} aria-hidden="true" /> Close</button>
      </div>
      {patient.assumed.length > 0 && (
        <p className="cw-note">Not in the file, defaults used: {patient.assumed.join(', ')}.</p>
      )}
      {patient.error && <p className="cw-error" role="alert">{patient.error}</p>}
      {r ? (
        <>
          <section><h3>Part 1 · Pre-PSA</h3>
            <Part1Results result={r.part1} formData={patient.part1} storageMode="local" cloudAvailable={false}
              sessionId={null} userEmail={null} userPhone={null} onSaveToCloud={undefined} onEditAnswers={noop} onStartOver={noop} />
          </section>
          {isMri && r.part2 && (
            <section><h3>Part 2 · PSA</h3>
              <Part2Results result={r.part2} postData={{ psa: p2.psa, onHormonalTherapy: p2.onHormonalTherapy, pathwayMode: 'post_psa' }}
                preResult={r.part1} onContinueToMRI={noop} onBack={noop} onStartOver={noop} />
            </section>
          )}
          {isMri && r.part3 && (
            <section><h3>Part 3 · PSA + MRI</h3>
              <Part3Results result={r.part3} preData={{ ...patient.part1 }} preResult={r.part1}
                postData={{ psa: p2.psa, prostateVolume: p2.prostateVolume, pirads: p2.pirads, onHormonalTherapy: p2.onHormonalTherapy, pathwayMode: 'post_mri' }}
                biomarkersEnabled={false} storageMode="local" sessionId={null} userEmail={null} userPhone={null}
                researchConsent={false} onEditAnswers={noop} onStartOver={noop} onShowModelDocs={noop} />
            </section>
          )}
          {!isMri && r.part2 && (
            <section><h3>Part 2 · PSA</h3>
              <Part2Results result={r.part2} postData={{ psa: p2.psa, onHormonalTherapy: p2.onHormonalTherapy, pathwayMode: patient.part1.pathwayMode }}
                preResult={r.part1} onBack={noop} onStartOver={noop} />
            </section>
          )}
        </>
      ) : <p className="cw-note">Run this patient to see full results.</p>}
    </aside>
  );
};

const ClinicalWorkspace = ({ onClose }) => {
  const [patients, setPatients] = useState([]);
  const [files, setFiles] = useState([]);
  const [running, setRunning] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState({ key: null, dir: 1 });
  const [selectedUid, setSelectedUid] = useState(null);
  const [showAnswers, setShowAnswers] = useState(true);
  const abortRef = useRef(null);
  const inputRef = useRef(null);

  const patch = useCallback((uid, changes) => {
    setPatients((ps) => ps.map((p) => (p.uid === uid ? { ...p, ...changes } : p)));
  }, []);

  const addFiles = async (fileList) => {
    const parsed = await Promise.all(Array.from(fileList).map(parseCohortFile));
    setFiles((fs) => [...fs, ...parsed.map((f) => ({ name: f.name, count: f.patients.length, error: f.error || null }))]);
    setPatients((ps) => [...ps, ...parsed.flatMap((f) => f.patients).map(withUid)]);
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragActive(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const addBlankPatient = () => {
    const n = patients.length + 1;
    const blank = normalisePatient({ patientId: `Manual ${n}` }, n - 1, 'manual');
    setPatients((ps) => [...ps, withUid(blank)]);
  };

  const run = async (onlyPending = true) => {
    const targets = onlyPending ? patients : patients.map((p) => ({ ...p, status: 'pending' }));
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setRunning(true);
    try {
      await runCohort(targets, { signal: ctrl.signal, onUpdate: patch });
    } finally {
      setRunning(false);
    }
  };
  const stop = () => abortRef.current?.abort();

  // Adding / editing PSA, volume or PI-RADS invalidates that patient's results.
  const editPsaMri = (p, field, value) => {
    const cur = { psa: p.part2?.psa ?? '', prostateVolume: p.part2?.prostateVolume ?? '', pirads: p.part2?.knowPirads ? p.part2.pirads : '' };
    const next = withPsaMri(p, { ...cur, [field]: value });
    patch(p.uid, { ...next, status: 'pending', results: null, error: null });
  };
  const editActual = (p, gg) => {
    const v = gg === '' ? null : Number(gg);
    patch(p.uid, { actual: { ...p.actual, gg: v, gg2: v === null ? null : v >= 2 } });
  };
  const remove = (uid) => {
    setPatients((ps) => ps.filter((p) => p.uid !== uid));
    if (selectedUid === uid) setSelectedUid(null);
  };
  const clearAll = () => { abortRef.current?.abort(); setPatients([]); setFiles([]); setSelectedUid(null); };

  const comparison = useMemo(() => summariseComparison(patients), [patients]);
  const counts = useMemo(() => ({
    done: patients.filter((p) => p.status === 'done').length,
    error: patients.filter((p) => p.status === 'error').length,
    pending: patients.filter((p) => p.status === 'pending' || p.status === 'running').length,
  }), [patients]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = patients.filter((p) => {
      if (q && !`${p.id} ${p.source}`.toLowerCase().includes(q)) return false;
      if (filter === 'errors') return p.status === 'error';
      if (filter === 'high') return /high/i.test(String(p.results?.part3?.riskClass || p.results?.part2?.riskClass || p.results?.part1?.tierRisk || ''));
      if (filter === 'mismatch') return ['FP', 'FN'].includes(classify(p));
      if (filter === 'outcome') return p.actual?.gg2 !== null && p.actual?.gg2 !== undefined;
      return true;
    });
    const col = COLUMNS.find((c) => c.key === sort.key);
    if (col) rows = [...rows].sort((a, b) => {
      const x = col.sort(a); const y = col.sort(b);
      return (x > y ? 1 : x < y ? -1 : 0) * sort.dir;
    });
    return rows;
  }, [patients, query, filter, sort]);

  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: 1 }));
  const selected = patients.find((p) => p.uid === selectedUid) || null;

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([buildTemplateCsv()], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'epsa-cohort-template.csv'; a.click();
    URL.revokeObjectURL(url);
  };
  const exportAll = () => downloadCsv('epsa-clinical-cohort.csv', buildCohortCsvRows(patients));

  return (
    <div className="cw-root">
      <div className="cw-header">
        <div>
          <h1>Clinical Workspace</h1>
          <p>Load several patient files, add PSA and MRI, run Parts 1–3 for everyone, and compare the model with actual biopsy results.</p>
        </div>
        {onClose && <button type="button" className="cw-btn" onClick={onClose}><ArrowLeftIcon size={14} aria-hidden="true" /> Exit</button>}
      </div>
      <p className="cw-privacy">
        Patient data stays in this tab only: nothing is saved, and it is gone when you close or reload the page.
        Scoring runs through the ePSA scoring service, which stores nothing. Exported CSVs contain PHI.
      </p>

      <div
        className={`cw-drop${dragActive ? ' cw-drop--active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
      >
        <UploadIcon size={20} aria-hidden="true" />
        <div>
          <strong>Drop CSV or JSON files here</strong> — several at once, one patient per CSV row.
          <div className="cw-hint">
            Part 1 answers, plus optional PSA, prostate volume, PI-RADS and actual biopsy grade (<code>actualGG</code>: 0 = benign, 1–5).
            The app’s own exports load as-is.
          </div>
        </div>
        <input ref={inputRef} type="file" accept=".csv,.json,.tsv,.txt" multiple hidden
          onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ''; }} />
        <button type="button" className="cw-btn cw-btn--primary" onClick={() => inputRef.current?.click()}>Choose files</button>
        <button type="button" className="cw-btn" onClick={downloadTemplate}><DownloadIcon size={14} aria-hidden="true" /> Template</button>
      </div>

      {files.length > 0 && (
        <ul className="cw-files" aria-label="Loaded files">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className={f.error ? 'cw-file cw-file--bad' : 'cw-file'}>
              <FileTextIcon size={13} aria-hidden="true" /> {f.name} — {f.error ? f.error : `${f.count} patient${f.count === 1 ? '' : 's'}`}
            </li>
          ))}
        </ul>
      )}

      <div className="cw-toolbar">
        <button type="button" className="cw-btn cw-btn--primary" disabled={running || patients.length === 0 || counts.pending === 0} onClick={() => run(true)}>
          <PlayIcon size={14} aria-hidden="true" /> {running ? 'Running…' : `Run ${counts.pending || ''} pending`}
        </button>
        {running && <button type="button" className="cw-btn" onClick={stop}>Stop</button>}
        {!running && counts.done > 0 && <button type="button" className="cw-btn" onClick={() => run(false)}>Re-run all</button>}
        <button type="button" className="cw-btn" onClick={addBlankPatient}><PlusIcon size={14} aria-hidden="true" /> Add patient</button>
        <input className="cw-search" type="search" placeholder="Search patient or file" aria-label="Search patients" value={query} onChange={(e) => setQuery(e.target.value)} />
        <label className="cw-check"><input type="checkbox" checked={showAnswers} onChange={(e) => setShowAnswers(e.target.checked)} /> Part 1 answers</label>
        <select className="cw-select" aria-label="Filter patients" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All patients</option>
          <option value="high">Higher risk</option>
          <option value="outcome">With actual result</option>
          <option value="mismatch">Model disagrees (FP / FN)</option>
          <option value="errors">Errors</option>
        </select>
        <span className="cw-spacer" />
        <button type="button" className="cw-btn" disabled={patients.length === 0} onClick={exportAll}><DownloadIcon size={14} aria-hidden="true" /> Export CSV</button>
        <button type="button" className="cw-btn" disabled={patients.length === 0} onClick={clearAll}><TrashIcon size={14} aria-hidden="true" /> Clear all</button>
      </div>

      {patients.length > 0 && (
        <div className="cw-stats">
          <Stat label="Patients" value={patients.length} sub={`${counts.done} scored · ${counts.error} errors`} />
          <Stat label="Compared with biopsy" value={comparison.compared} sub={`${comparison.withOutcome} have a result`} />
          <Stat label="Accuracy" value={pct(comparison.accuracy)} sub={comparison.compared ? `${comparison.TP + comparison.TN}/${comparison.compared} agree` : 'needs actual GG'} />
          <Stat label="Sensitivity" value={pct(comparison.sensitivity)} sub={`TP ${comparison.TP} · FN ${comparison.FN}`} />
          <Stat label="Specificity" value={pct(comparison.specificity)} sub={`TN ${comparison.TN} · FP ${comparison.FP}`} />
          <Stat label="AUC" value={comparison.auc === null ? '—' : comparison.auc.toFixed(2)} sub={comparison.meanPredicted === null ? '' : `predicted ${pct(comparison.meanPredicted)} vs observed ${pct(comparison.observed)}`} />
        </div>
      )}

      {patients.length === 0 ? (
        <div className="cw-empty">No patients yet. Drop files above, or add a patient and type the answers in.</div>
      ) : (
        <div className="cw-layout">
          <div className="cw-tablewrap">
            <table className="cw-table">
              <thead>
                <tr>
                  {COLUMNS.flatMap((c) => [
                    <th key={c.key} scope="col" aria-sort={sort.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                      <button type="button" onClick={() => toggleSort(c.key)}>{c.label}{sort.key === c.key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}</button>
                    </th>,
                    ...(c.key === 'age' && showAnswers ? ANSWER_COLUMNS.map((a) => <th key={a.key} scope="col" className="cw-ans">{a.label}</th>) : []),
                  ])}
                  <th scope="col" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => {
                  const r = p.results;
                  const pred = predictedProb(p);
                  const k = classify(p);
                  const ag = k && AGREEMENT[k];
                  return (
                    <tr key={p.uid} className={selectedUid === p.uid ? 'cw-row--selected' : ''}>
                      <th scope="row" className="cw-id">
                        <button type="button" onClick={() => setSelectedUid(p.uid)} title="Open full results">{p.id}</button>
                        <div className="cw-src">{p.source}</div>
                      </th>
                      <td>{p.part1.age ?? '—'}</td>
                      {showAnswers && ANSWER_COLUMNS.map((a) => <td key={a.key} className="cw-ans">{a.show(p.part1)}</td>)}
                      <td>
                        {p.status === 'running' && <span className="cw-muted">running…</span>}
                        {p.status === 'error' && <span className="cw-err" title={p.error}>⚠ {p.error?.slice(0, 40)}</span>}
                        {p.status === 'pending' && <span className="cw-muted">not run</span>}
                        {r?.part1 && (<span className={`cw-pill cw-pill--${tierClass(r.part1.tierRisk || r.part1.risk)}`}>{r.part1.score}% · {r.part1.tierRisk || r.part1.risk}</span>)}
                      </td>
                      <td><input className="cw-cell" type="number" min="0" step="0.1" aria-label={`PSA for ${p.id}`} placeholder="ng/mL"
                        defaultValue={p.part2?.psa ?? ''} key={`psa-${p.uid}-${p.part2?.psa ?? ''}`}
                        onBlur={(e) => { if (e.target.value !== (p.part2?.psa ?? '')) editPsaMri(p, 'psa', e.target.value); }} /></td>
                      <td>
                        <select className="cw-cell" aria-label={`PI-RADS for ${p.id}`} value={p.part2?.knowPirads ? p.part2.pirads : ''}
                          onChange={(e) => editPsaMri(p, 'pirads', e.target.value)}>
                          <option value="">—</option>
                          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <input className="cw-cell cw-cell--vol" type="number" min="1" step="1" aria-label={`Prostate volume for ${p.id}`} placeholder="cc"
                          defaultValue={p.part2?.prostateVolume ?? ''} key={`vol-${p.uid}-${p.part2?.prostateVolume ?? ''}`}
                          onBlur={(e) => { if (e.target.value !== (p.part2?.prostateVolume ?? '')) editPsaMri(p, 'prostateVolume', e.target.value); }} />
                      </td>
                      <td>{r?.part2 ? <span className={`cw-pill cw-pill--${tierClass(r.part2.riskClass)}`}>{r.part2.riskPct}</span> : '—'}</td>
                      <td>
                        {pred ? (
                          <span className={`cw-pill cw-pill--${pred.prob >= pred.threshold ? 'high' : 'lower'}`}>
                            {(pred.prob * 100).toFixed(1)}%{pred.reliable ? '' : ' ⚠'}
                          </span>
                        ) : r?.part3?.apiPredictionFailed ? <span className="cw-err">unavailable</span> : '—'}
                      </td>
                      <td>
                        <select className="cw-cell" aria-label={`Actual biopsy grade for ${p.id}`} value={p.actual?.gg ?? ''} onChange={(e) => editActual(p, e.target.value)}>
                          {GG_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </td>
                      <td>{ag ? <span className={`cw-match cw-match--${ag.cls}`} title={ag.title}>{ag.label}</span> : '—'}</td>
                      <td><button type="button" className="cw-icon" aria-label={`Remove ${p.id}`} onClick={() => remove(p.uid)}><XIcon size={14} aria-hidden="true" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {visible.length === 0 && <div className="cw-empty">No patients match this filter.</div>}
          </div>
          {selected && <PatientDetail patient={selected} onClose={() => setSelectedUid(null)} />}
        </div>
      )}
      <p className="cw-fine">
        Match compares the Part 3 biopsy model (P(GG≥2) against its own decision threshold) with actual pathology. Educational and research use;
        small or single-site cohorts give wide uncertainty.
      </p>
    </div>
  );
};

export default ClinicalWorkspace;
