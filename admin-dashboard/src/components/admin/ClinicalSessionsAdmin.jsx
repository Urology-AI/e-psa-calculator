/**
 * ClinicalSessionsAdmin.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Admin view for all kiosk / clinical-mode sessions.
 *
 * Reads from the clinicalSessions/{uid}/records subcollection via a
 * collectionGroup query (admins can read all records per Firestore rules).
 * No PHI beyond what REDCap already holds — sessions store de-identified
 * risk-factor data (age, race, lifestyle, tier, sessionRef).
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  collectionGroup, getDocs, query, orderBy, limit as fsLimit,
  doc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import {
  RefreshCw, Download, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, Clock, Send, Search, FlaskConical,
} from 'lucide-react';
import { adminDb, adminFunctions } from '../../config/adminFirebase';
import { httpsCallable } from 'firebase/functions';
import './ClinicalSessionsAdmin.css';

const TIER_COLORS = { low: '#16a34a', intermediate: '#d97706', elevated: '#dc2626' };
const PAGE_SIZE = 50;

function fmtDate(val) {
  if (!val) return '—';
  const d = val?.toDate ? val.toDate() : new Date(val);
  return isNaN(d) ? '—' : d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function StatusChip({ status }) {
  if (status === 'submitted') return <span className="csa-chip csa-chip--green"><CheckCircle2 size={12} /> In REDCap</span>;
  if (status === 'error')     return <span className="csa-chip csa-chip--red"><AlertCircle size={12} /> Failed</span>;
  return <span className="csa-chip csa-chip--amber"><Clock size={12} /> Pending</span>;
}

const BIOPSY_INITIAL = { performed: '', cancerDetected: '', ggGroup: '', biopsyDate: '' };

function SessionRow({ session, onSave }) {
  const [open, setOpen] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushStatus, setPushStatus] = useState(null);
  const [biopsyOpen, setBiopsyOpen] = useState(false);
  const [biopsy, setBiopsy] = useState(BIOPSY_INITIAL);
  const [biopsySaving, setBiopsySaving] = useState(false);
  const [biopsySaved, setBiopsySaved] = useState(false);
  const [biopsyError, setBiopsyError] = useState(null);

  const tier = session.engineResult?.epsaTierKey ?? 'unknown';
  const tierLabel = session.engineResult?.epsaTierLabel ?? tier;
  const scoreRange = session.engineResult?.displayRange ?? '—';
  const age = session.formData?.age ?? '—';
  const race = session.formData?.race ?? '—';
  const bmi = session.formData?.bmi ?? '—';
  const engineVersion = session.engineVersion ?? session.postResult?.engineVersion ?? '—';
  const existingBiopsy = session.biopsyOutcome;

  async function pushToRedcap() {
    if (!session.formData) return;
    setPushing(true);
    try {
      const fn = httpsCallable(adminFunctions, 'submitRedcap');
      await fn({ record: buildRecord(session) });
      setPushStatus('ok');
    } catch {
      setPushStatus('err');
    } finally {
      setPushing(false);
    }
  }

  function openBiopsyForm() {
    // Pre-populate from existing outcome so "Update biopsy" never overwrites good data with nulls
    if (existingBiopsy) {
      setBiopsy({
        performed:      existingBiopsy.performed === true ? 'yes' : existingBiopsy.performed === false ? 'no' : '',
        cancerDetected: existingBiopsy.cancerDetected === true ? 'yes' : existingBiopsy.cancerDetected === false ? 'no' : '',
        ggGroup:        existingBiopsy.ggGroup != null ? String(existingBiopsy.ggGroup) : '',
        biopsyDate:     existingBiopsy.biopsyDate ?? '',
      });
    } else {
      setBiopsy(BIOPSY_INITIAL);
    }
    setBiopsySaved(false);
    setBiopsyError(null);
    setBiopsyOpen(true);
  }

  function cancelBiopsyForm() {
    setBiopsy(BIOPSY_INITIAL);
    setBiopsyOpen(false);
  }

  async function saveBiopsyOutcome() {
    if (!session.id) return;
    if (!session._firestorePath) {
      setBiopsyError('Cannot save: session path is missing. Please refresh the list.');
      return;
    }
    setBiopsySaving(true);
    setBiopsyError(null);
    try {
      const outcome = {
        performed:      biopsy.performed === 'yes' ? true : biopsy.performed === 'no' ? false : null,
        cancerDetected: biopsy.cancerDetected === 'yes' ? true : biopsy.cancerDetected === 'no' ? false : null,
        ggGroup:        biopsy.ggGroup ? parseInt(biopsy.ggGroup, 10) : null,
        biopsyDate:     biopsy.biopsyDate || null,
        recordedAt:     serverTimestamp(),
        recordedBy:     'admin',
      };
      await updateDoc(doc(adminDb, session._firestorePath), {
        biopsyOutcome: outcome,
        updatedAt: serverTimestamp(),
      });
      setBiopsySaved(true);
      setBiopsyOpen(false);
      onSave?.();   // refresh parent list so detail table reflects new outcome immediately
    } catch (e) {
      setBiopsyError(e.message ?? 'Save failed');
    } finally {
      setBiopsySaving(false);
    }
  }

  function buildRecord(s) {
    const f = s.formData ?? {};
    const chemRaw = f.chemicalExposure;
    return {
      record_id:          s.sessionRef ?? s.id,
      age:                f.age,
      race:               f.race,
      family_history:     f.familyHistory,
      genetic_risk:       f.brcaStatus,
      bmi:                f.bmi != null ? parseFloat(String(f.bmi)).toFixed(1) : undefined,
      exercise:           f.exercise,
      smoking:            f.smoking,
      chemical_exposure:  chemRaw === 'no' ? 'no' : chemRaw === 'unknown' ? 'unknown' : chemRaw ? 'yes' : undefined,
      diet_pattern:       f.dietPattern,
      comorbidities:      f.comorbidityScore ?? 0,
      ipss_qol:           f.ipssQol,
      erection_confidence: f.shim?.[0],
    };
  }

  return (
    <div className="csa-row">
      <button type="button" className="csa-row-header" onClick={() => setOpen(v => !v)}>
        <span className="csa-tier-dot" style={{ background: TIER_COLORS[tier] ?? '#9ca3af' }} />
        <span className="csa-ref">{session.sessionRef ?? '—'}</span>
        <span className="csa-date">{fmtDate(session.createdAt)}</span>
        <span className="csa-meta">Age {age} · {race}</span>
        <span className="csa-tier" style={{ color: TIER_COLORS[tier] ?? '#374151' }}>{tierLabel}</span>
        <span className="csa-score">{scoreRange}</span>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {open && (
        <div className="csa-row-body">
          <div className="csa-row-actions">
            <button
              type="button"
              className={`csa-act-btn${pushStatus === 'ok' ? ' csa-act-btn--ok' : pushStatus === 'err' ? ' csa-act-btn--err' : ''}`}
              onClick={pushToRedcap}
              disabled={pushing}
            >
              <Send size={13} />
              {pushing ? 'Pushing…' : pushStatus === 'ok' ? 'Sent to REDCap' : pushStatus === 'err' ? 'Push failed' : 'Push to REDCap'}
            </button>
            <button
              type="button"
              className={`csa-act-btn${biopsySaved ? ' csa-act-btn--ok' : ''}`}
              onClick={biopsyOpen ? cancelBiopsyForm : openBiopsyForm}
            >
              <FlaskConical size={13} />
              {biopsySaved ? 'Biopsy recorded' : existingBiopsy ? 'Update biopsy' : 'Record biopsy'}
            </button>
          </div>

          <table className="csa-detail-table">
            <tbody>
              <tr><th>Session Ref</th><td>{session.sessionRef ?? session.id}</td></tr>
              <tr><th>Date</th><td>{fmtDate(session.createdAt)}</td></tr>
              <tr><th>Age</th><td>{age}</td></tr>
              <tr><th>Race</th><td>{race}</td></tr>
              <tr><th>BMI</th><td>{bmi}</td></tr>
              <tr><th>Engine version</th><td style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>{engineVersion}</td></tr>
              <tr><th>Risk tier</th><td style={{ color: TIER_COLORS[tier] ?? undefined, fontWeight: 700 }}>{tierLabel} ({scoreRange})</td></tr>
              <tr><th>Family Hx</th><td>{session.formData?.familyHistory ?? '—'}</td></tr>
              <tr><th>BRCA</th><td>{session.formData?.brcaStatus ?? '—'}</td></tr>
              <tr><th>Exercise</th><td>{session.formData?.exercise ?? '—'}</td></tr>
              <tr><th>Smoking</th><td>{session.formData?.smoking ?? '—'}</td></tr>
              <tr><th>Diet</th><td>{session.formData?.dietPattern ?? '—'}</td></tr>
              <tr><th>Comorbidities</th><td>{session.formData?.comorbidityScore ?? '—'}</td></tr>
              <tr><th>IPSS QoL</th><td>{session.formData?.ipssQol ?? '—'}</td></tr>
              <tr><th>SHIM Q1</th><td>{session.formData?.shim?.[0] ?? '—'}</td></tr>
              {session.step2?.psa && <tr><th>PSA</th><td>{session.step2.psa} ng/mL</td></tr>}
              {session.step2?.pirads && session.step2.pirads !== '0' && <tr><th>PI-RADS</th><td>{session.step2.pirads}</td></tr>}
              {existingBiopsy && (
                <>
                  <tr><th>Biopsy performed</th><td>{existingBiopsy.performed === true ? 'Yes' : existingBiopsy.performed === false ? 'No' : '—'}</td></tr>
                  {existingBiopsy.performed && <tr><th>Cancer detected</th><td>{existingBiopsy.cancerDetected === true ? 'Yes' : existingBiopsy.cancerDetected === false ? 'No' : '—'}</td></tr>}
                  {existingBiopsy.ggGroup && <tr><th>GG group</th><td>GG{existingBiopsy.ggGroup}</td></tr>}
                  {existingBiopsy.biopsyDate && <tr><th>Biopsy date</th><td>{existingBiopsy.biopsyDate}</td></tr>}
                </>
              )}
            </tbody>
          </table>

          {biopsyOpen && (
            <div className="csa-biopsy-form">
              <h4 className="csa-biopsy-title"><FlaskConical size={14} /> Record Biopsy Outcome</h4>
              <div className="csa-biopsy-fields">
                <label className="csa-biopsy-label">
                  Biopsy performed?
                  <select value={biopsy.performed} onChange={e => setBiopsy(b => ({ ...b, performed: e.target.value }))} className="csa-biopsy-select">
                    <option value="">— select —</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </label>
                {biopsy.performed === 'yes' && (
                  <>
                    <label className="csa-biopsy-label">
                      Cancer detected?
                      <select value={biopsy.cancerDetected} onChange={e => setBiopsy(b => ({ ...b, cancerDetected: e.target.value }))} className="csa-biopsy-select">
                        <option value="">— select —</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </label>
                    {biopsy.cancerDetected === 'yes' && (
                      <label className="csa-biopsy-label">
                        Gleason Grade Group
                        <select value={biopsy.ggGroup} onChange={e => setBiopsy(b => ({ ...b, ggGroup: e.target.value }))} className="csa-biopsy-select">
                          <option value="">— select —</option>
                          <option value="1">GG1 (Gleason 6)</option>
                          <option value="2">GG2 (Gleason 3+4)</option>
                          <option value="3">GG3 (Gleason 4+3)</option>
                          <option value="4">GG4 (Gleason 8)</option>
                          <option value="5">GG5 (Gleason 9-10)</option>
                        </select>
                      </label>
                    )}
                    <label className="csa-biopsy-label">
                      Biopsy date
                      <input type="date" value={biopsy.biopsyDate} onChange={e => setBiopsy(b => ({ ...b, biopsyDate: e.target.value }))} className="csa-biopsy-input" />
                    </label>
                  </>
                )}
              </div>
              {biopsyError && <p className="csa-biopsy-error"><AlertCircle size={13} /> {biopsyError}</p>}
              <div className="csa-biopsy-actions">
                <button type="button" className="csa-act-btn" onClick={cancelBiopsyForm}>Cancel</button>
                <button
                  type="button"
                  className="csa-act-btn csa-act-btn--primary"
                  onClick={saveBiopsyOutcome}
                  disabled={biopsySaving || !biopsy.performed}
                >
                  {biopsySaving ? 'Saving…' : 'Save outcome'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClinicalSessionsAdmin() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collectionGroup(adminDb, 'records'),
        orderBy('createdAt', 'desc'),
        fsLimit(PAGE_SIZE),
      );
      const snap = await getDocs(q);
      // Only show records that have a sessionRef (clinical mode sessions)
      const docs = snap.docs
        .filter(d => d.ref.parent.parent?.parent?.id === 'clinicalSessions')
        .map(d => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt,
          _firestorePath: d.ref.path,
          _parentUid: d.ref.parent.parent?.id ?? null,
        }));
      setSessions(docs);
    } catch (e) {
      setError(e.message ?? 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function exportCsv() {
    const headers = ['sessionRef', 'date', 'engineVersion', 'age', 'race', 'bmi', 'tier', 'scoreRange', 'familyHistory', 'brca', 'exercise', 'smoking', 'diet', 'comorbidities', 'ipssQol', 'shimQ1', 'psa', 'pirads', 'biopsyPerformed', 'cancerDetected', 'ggGroup', 'biopsyDate'];
    const rows = sessions.map(s => [
      s.sessionRef ?? s.id,
      s.createdAt?.toDate ? s.createdAt.toDate().toISOString() : (s.createdAt ?? ''),
      s.engineVersion ?? s.postResult?.engineVersion ?? '',
      s.formData?.age ?? '',
      s.formData?.race ?? '',
      s.formData?.bmi ?? '',
      s.engineResult?.epsaTierKey ?? '',
      s.engineResult?.displayRange ?? '',
      s.formData?.familyHistory ?? '',
      s.formData?.brcaStatus ?? '',
      s.formData?.exercise ?? '',
      s.formData?.smoking ?? '',
      s.formData?.dietPattern ?? '',
      s.formData?.comorbidityScore ?? '',
      s.formData?.ipssQol ?? '',
      s.formData?.shim?.[0] ?? '',
      s.step2?.psa ?? '',
      s.step2?.pirads ?? '',
      s.biopsyOutcome?.performed != null ? (s.biopsyOutcome.performed ? 'yes' : 'no') : '',
      s.biopsyOutcome?.cancerDetected != null ? (s.biopsyOutcome.cancerDetected ? 'yes' : 'no') : '',
      s.biopsyOutcome?.ggGroup ?? '',
      s.biopsyOutcome?.biopsyDate ?? '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clinical_sessions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = sessions.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.sessionRef ?? '').toLowerCase().includes(q) ||
      String(s.formData?.age ?? '').includes(q) ||
      (s.formData?.race ?? '').toLowerCase().includes(q) ||
      (s.engineResult?.epsaTierKey ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="csa-root">
      <div className="csa-header">
        <div>
          <h2 className="csa-title">Clinical Sessions</h2>
          <p className="csa-subtitle">Kiosk ePSA sessions — de-identified risk factor data only</p>
        </div>
        <div className="csa-header-actions">
          <button type="button" className="csa-btn" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'csa-spin' : ''} /> Refresh
          </button>
          <button type="button" className="csa-btn" onClick={exportCsv} disabled={!sessions.length}>
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      <div className="csa-search-bar">
        <Search size={15} />
        <input
          type="text"
          placeholder="Search by session ID, age, race, tier…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="csa-search-input"
        />
      </div>

      <div className="csa-stats">
        <span>{sessions.length} session{sessions.length !== 1 ? 's' : ''} (last {PAGE_SIZE})</span>
        {filtered.length !== sessions.length && <span> · {filtered.length} matching</span>}
      </div>

      {error && <div className="csa-error"><AlertCircle size={16} /> {error}</div>}

      {loading ? (
        <div className="csa-loading">Loading sessions…</div>
      ) : filtered.length === 0 ? (
        <div className="csa-empty">No clinical sessions found.</div>
      ) : (
        <div className="csa-list">
          {/* Column headers */}
          <div className="csa-list-header">
            <span />
            <span>Session ID</span>
            <span>Date</span>
            <span>Demographics</span>
            <span>Tier</span>
            <span>Score</span>
            <span />
          </div>
          {filtered.map(s => <SessionRow key={s.id} session={s} onSave={load} />)}
        </div>
      )}
    </div>
  );
}
