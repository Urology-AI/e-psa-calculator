/**
 * SinaiResearch.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Admin dashboard page for the Mount Sinai clinic-cohort flow.
 *
 * Four sub-tabs:
 *   - Sessions    : live list of sinaiSessions/* with per-row actions
 *   - Codes       : clinic code roster (generate, revoke)
 *   - Audit Log   : code lifecycle + admin action audit
 *   - Settings    : REDCap live-mode toggle + config status
 *
 * All mutating actions go through Cloud Functions so each one is
 * audited server-side (adminAccessLog + clinicCodeAuditLog).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlaskConical, FileText, ListChecks, ClipboardList, Settings,
  RefreshCw, CheckCircle2, AlertTriangle, AlertCircle, Clock,
  Download, Upload, Trash2, ShieldOff, X, Plus, Loader2, Copy,
  ToggleLeft, ToggleRight, Search, Building, Globe, Cloud, RotateCw, Link2,
} from 'lucide-react';
import { collection, getDocs, query, orderBy, limit as fsLimit } from 'firebase/firestore';
import { adminDb } from '../../config/adminFirebase';
import {
  listSinaiSessions, getSinaiSession, submitSessionToRedcap,
  deleteSinaiSession, markCodeImported,
  listPublicConsentedSessions, getPublicSession, resyncPublicSession,
  generateClinicCodes, revokeClinicCode,
  listClinicCodeAuditLog, toggleSinaiRedcapEnabled, readSinaiConfig,
  formatCode, buildCsvFromRecord, downloadFile,
} from '../../services/sinaiAdminService';
import './SinaiResearch.css';

const SUBTABS = [
  { id: 'sessions', label: 'Sessions',  Icon: ListChecks },
  { id: 'codes',    label: 'Codes',     Icon: FileText },
  { id: 'audit',    label: 'Audit Log', Icon: ClipboardList },
  { id: 'settings', label: 'Settings',  Icon: Settings },
];

const STATUS_LABELS = {
  pending:            { label: 'Pending REDCap',    color: 'amber',  Icon: Clock },
  submitted_redcap:   { label: 'In REDCap',         color: 'green',  Icon: CheckCircle2 },
  imported_manually:  { label: 'Imported manually', color: 'blue',   Icon: CheckCircle2 },
  redcap_error:       { label: 'REDCap error',      color: 'red',    Icon: AlertCircle },
};

const fmtDate = (millis) => millis ? new Date(millis).toLocaleString() : '—';
const fmtShort = (millis) => millis ? new Date(millis).toLocaleDateString() : '—';

// ─────────────────────────────────────────────────────────────────────────
// Top-level component
// ─────────────────────────────────────────────────────────────────────────

const SinaiResearch = () => {
  const [subtab, setSubtab] = useState('sessions');
  const [config, setConfig] = useState({ redcapEnabled: false, updatedAt: null, updatedBy: null });

  useEffect(() => { readSinaiConfig().then(setConfig); }, []);

  return (
    <div className="sinai-research">
      <header className="sr-header">
        <div className="sr-header-title">
          <div className="sr-header-icon"><Building size={22} /></div>
          <div>
            <h2>Mount Sinai Research</h2>
            <p>Clinic-cohort sessions, codes, and REDCap integration · IRB STUDY-14-00050</p>
          </div>
        </div>
        <div className={`sr-flag-pill ${config.redcapEnabled ? 'sr-flag-pill--on' : 'sr-flag-pill--off'}`}>
          {config.redcapEnabled
            ? (<><ToggleRight size={14} /> Live REDCap submission ENABLED</>)
            : (<><ToggleLeft size={14} /> Live REDCap submission OFF — sessions queue for admin</>)}
        </div>
      </header>

      <nav className="sr-tabs" role="tablist">
        {SUBTABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`sr-tab ${subtab === id ? 'sr-tab--active' : ''}`}
            onClick={() => setSubtab(id)}
            role="tab"
            aria-selected={subtab === id}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sr-body">
        {subtab === 'sessions' && <SessionsTab />}
        {subtab === 'codes'    && <CodesTab />}
        {subtab === 'audit'    && <AuditTab />}
        {subtab === 'settings' && <SettingsTab config={config} onChange={setConfig} />}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Sessions tab — unified view of Sinai + Public-consented research sessions
// ─────────────────────────────────────────────────────────────────────────

const PUBLIC_SYNC_LABELS = {
  synced:   { label: 'In REDCap',  color: 'green', Icon: CheckCircle2 },
  unsynced: { label: 'Awaiting',   color: 'amber', Icon: Clock },
  error:    { label: 'REDCap err', color: 'red',   Icon: AlertCircle },
};

const SessionsTab = () => {
  const [sinaiSessions, setSinaiSessions] = useState([]);
  const [publicSessions, setPublicSessions] = useState([]);
  const [cohortFilter, setCohortFilter] = useState('all'); // all | sinai | public
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [actionMsg, setActionMsg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const tasks = [];
    if (cohortFilter !== 'public') {
      tasks.push(
        listSinaiSessions({ status: statusFilter === 'all' ? 'all' : statusFilter, limit: 100 })
          .then((res) => setSinaiSessions(res.sessions || []))
          .catch((err) => setError((prev) => prev || err?.message || 'Failed to load Sinai sessions.'))
      );
    } else {
      setSinaiSessions([]);
    }
    if (cohortFilter !== 'sinai') {
      const syncStatus =
        statusFilter === 'submitted_redcap' ? 'synced'
        : statusFilter === 'pending' || statusFilter === 'imported_manually' ? 'unsynced'
        : statusFilter === 'redcap_error' ? 'error'
        : 'all';
      tasks.push(
        listPublicConsentedSessions({ syncStatus, limit: 100 })
          .then((res) => setPublicSessions(res.sessions || []))
          .catch((err) => setError((prev) => prev || err?.message || 'Failed to load public sessions.'))
      );
    } else {
      setPublicSessions([]);
    }
    await Promise.allSettled(tasks);
    setLoading(false);
  }, [cohortFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  // Merge + sort the two lists into a unified, badged display
  const unified = useMemo(() => {
    const sinaiRows = sinaiSessions.map((s) => ({
      cohort: 'sinai',
      key: `sinai:${s.sessionId}`,
      sessionId: s.sessionId,
      sortMillis: s.createdAtMillis,
      raw: s,
    }));
    const publicRows = publicSessions.map((s) => ({
      cohort: 'public',
      key: `public:${s.sessionId}`,
      sessionId: s.sessionId,
      sortMillis: s.createdAtMillis,
      raw: s,
    }));
    const all = [...sinaiRows, ...publicRows].sort((a, b) => (b.sortMillis || 0) - (a.sortMillis || 0));

    const q = searchTerm.trim().toLowerCase();
    if (!q) return all;
    return all.filter((row) => {
      const r = row.raw;
      return (
        row.sessionId.toLowerCase().includes(q) ||
        (r.clinicCode || '').toLowerCase().includes(q) ||
        (r.userIdPrefix || '').toLowerCase().includes(q) ||
        (r.redcapRecordId || '').toLowerCase().includes(q)
      );
    });
  }, [sinaiSessions, publicSessions, searchTerm]);

  return (
    <>
      {actionMsg && (
        <div className={`sr-banner sr-banner--${actionMsg.kind}`}>
          {actionMsg.kind === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} aria-label="Dismiss"><X size={14} /></button>
        </div>
      )}

      {/* Cohort filter chips */}
      <div className="sr-cohort-bar">
        {[
          { id: 'all',    label: 'All cohorts',           Icon: ListChecks },
          { id: 'sinai',  label: 'Mount Sinai',           Icon: Building },
          { id: 'public', label: 'Public · Consented',    Icon: Globe },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`sr-cohort-chip ${cohortFilter === id ? `sr-cohort-chip--active sr-cohort-chip--${id}` : ''}`}
            onClick={() => setCohortFilter(id)}
          >
            <Icon size={14} />
            <span>{label}</span>
            <span className="sr-cohort-chip-count">
              {id === 'all'    ? unified.length
                : id === 'sinai'  ? sinaiSessions.length
                : publicSessions.length}
            </span>
          </button>
        ))}
      </div>

      <div className="sr-toolbar">
        <div className="sr-toolbar-left">
          <div className="sr-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search by session ID, clinic code, user prefix, or REDCap record"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="sr-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending REDCap</option>
            <option value="submitted_redcap">In REDCap</option>
            <option value="imported_manually">Imported manually</option>
            <option value="redcap_error">REDCap error</option>
          </select>
        </div>
        <button className="sr-btn-ghost" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'sr-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && <div className="sr-banner sr-banner--error"><AlertCircle size={16} /><span>{error}</span></div>}

      <div className="sr-table-wrap">
        <table className="sr-table">
          <thead>
            <tr>
              <th>Cohort</th>
              <th>Status</th>
              <th>Source</th>
              <th>Created</th>
              <th>Pathway</th>
              <th>Risk</th>
              <th>REDCap ID</th>
              <th aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>
            {unified.length === 0 && !loading && (
              <tr><td colSpan={8} className="sr-empty">No sessions match these filters.</td></tr>
            )}
            {unified.map((row) => {
              const r = row.raw;
              if (row.cohort === 'sinai') {
                const cfg = STATUS_LABELS[r.status] || STATUS_LABELS.pending;
                return (
                  <tr key={row.key}>
                    <td><CohortBadge cohort="sinai" /></td>
                    <td>
                      <span className={`sr-status sr-status--${cfg.color}`}>
                        <cfg.Icon size={12} /> {cfg.label}
                      </span>
                    </td>
                    <td>
                      <code className="sr-code">{formatCode(r.clinicCode)}</code>
                    </td>
                    <td>{fmtShort(r.createdAtMillis)}</td>
                    <td className="sr-mono">{r.pathwayMode}</td>
                    <td>
                      {r.finalCategory ? <span>{r.finalCategory}</span>
                        : r.finalScore !== undefined ? <span>score {r.finalScore}</span>
                        : '—'}
                    </td>
                    <td className="sr-mono">{r.redcapRecordId || '—'}</td>
                    <td>
                      <button className="sr-btn-row" onClick={() => setSelected({ cohort: 'sinai', raw: r })}>View</button>
                    </td>
                  </tr>
                );
              }
              // public row
              const syncKey =
                r.redcapSyncError ? 'error'
                : r.redcapSynced ? 'synced'
                : 'unsynced';
              const cfg = PUBLIC_SYNC_LABELS[syncKey];
              return (
                <tr key={row.key}>
                  <td><CohortBadge cohort="public" linked={!!r.linkedToSinai} /></td>
                  <td>
                    <span className={`sr-status sr-status--${cfg.color}`}>
                      <cfg.Icon size={12} /> {cfg.label}
                    </span>
                  </td>
                  <td className="sr-small">
                    <code className="sr-code-soft">uid:{r.userIdPrefix}…</code>
                    {r.linkedToSinai && (
                      <div style={{ marginTop: 3, fontSize: 11, color: '#64748b' }}>
                        <Link2 size={10} style={{ verticalAlign: 'middle' }} />
                        {' '}linked → <code className="sr-code">{formatCode(r.linkedToSinai.clinicCode)}</code>
                      </div>
                    )}
                  </td>
                  <td>{fmtShort(r.createdAtMillis)}</td>
                  <td className="sr-mono">{r.pathwayMode || r.status}</td>
                  <td>
                    {r.finalCategory ? <span>{r.finalCategory}</span>
                      : r.finalScore !== null ? <span>score {r.finalScore}</span>
                      : '—'}
                  </td>
                  <td className="sr-mono">{r.redcapSynced ? row.sessionId.slice(0, 8) + '…' : '—'}</td>
                  <td>
                    <button className="sr-btn-row" onClick={() => setSelected({ cohort: 'public', raw: r })}>View</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="sr-table-footer">
        <span className="sr-table-meta">
          {unified.length} session{unified.length === 1 ? '' : 's'} shown
          {' · '}
          <span style={{ color: '#94a3b8' }}>
            {sinaiSessions.length} Sinai · {publicSessions.length} public
          </span>
        </span>
      </div>

      {selected?.cohort === 'sinai' && (
        <SessionDetailModal
          summary={selected.raw}
          onClose={() => setSelected(null)}
          onAction={(msg) => { setActionMsg(msg); setSelected(null); load(); }}
        />
      )}
      {selected?.cohort === 'public' && (
        <PublicSessionModal
          summary={selected.raw}
          onClose={() => setSelected(null)}
          onAction={(msg) => { setActionMsg(msg); setSelected(null); load(); }}
        />
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Cohort badge
// ─────────────────────────────────────────────────────────────────────────

const CohortBadge = ({ cohort, linked = false }) => {
  if (cohort === 'sinai') {
    return (
      <span className="sr-cohort-badge sr-cohort-badge--sinai" title="Mount Sinai cohort · IRB STUDY-14-00050">
        <Building size={11} /> <span>Mount Sinai</span>
      </span>
    );
  }
  if (linked) {
    return (
      <span className="sr-cohort-badge sr-cohort-badge--linked" title="Started public, later linked to a Mount Sinai clinic code">
        <Link2 size={11} /> <span>Linked → Sinai</span>
      </span>
    );
  }
  return (
    <span className="sr-cohort-badge sr-cohort-badge--public" title="Public cohort · researchConsent given">
      <Globe size={11} /> <span>Public · Consented</span>
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Session detail modal
// ─────────────────────────────────────────────────────────────────────────

const SessionDetailModal = ({ summary, onClose, onAction }) => {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // 'submit' | 'delete' | 'mark_imported'
  const [error, setError] = useState(null);

  // Mark imported form state
  const [importRecordId, setImportRecordId] = useState('');
  const [importNotes, setImportNotes] = useState('');
  const [showImportForm, setShowImportForm] = useState(false);

  // Delete form state
  const [deleteReason, setDeleteReason] = useState('');
  const [showDeleteForm, setShowDeleteForm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const full = await getSinaiSession(summary.sessionId);
        if (!cancelled) setDoc(full);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load session.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [summary.sessionId]);

  const handleSubmitToRedcap = async () => {
    setBusy('submit'); setError(null);
    try {
      const res = await submitSessionToRedcap(summary.sessionId);
      onAction({ kind: 'success', text: `Submitted to REDCap (record ${res.redcapRecordId})` });
    } catch (err) {
      setError(err?.message || 'REDCap submission failed.');
      setBusy(null);
    }
  };

  const handleMarkImported = async () => {
    if (!importRecordId.trim()) { setError('Please enter the REDCap record ID.'); return; }
    setBusy('mark_imported'); setError(null);
    try {
      await markCodeImported(summary.clinicCode, importRecordId.trim(), importNotes.trim() || null);
      onAction({ kind: 'success', text: `Marked as imported (REDCap record ${importRecordId.trim()})` });
    } catch (err) {
      setError(err?.message || 'Failed to mark as imported.');
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    setBusy('delete'); setError(null);
    try {
      await deleteSinaiSession(summary.sessionId, deleteReason.trim() || null);
      onAction({ kind: 'success', text: 'Session deleted.' });
    } catch (err) {
      setError(err?.message || 'Failed to delete session.');
      setBusy(null);
    }
  };

  const handleDownloadJson = () => {
    if (!doc) return;
    const data = JSON.stringify(doc, null, 2);
    downloadFile(`sinai_${summary.clinicCode}_${summary.sessionId.slice(0, 8)}.json`, data, 'application/json');
  };

  const handleDownloadCsv = () => {
    if (!doc) return;
    // Flatten the doc into a single-row CSV. Keep clinically-meaningful fields.
    const flat = {
      sessionId: doc._id,
      clinicCode: doc.clinicCode,
      status: doc.status,
      pathwayMode: doc.pathwayMode,
      createdAt: fmtDate(doc.createdAt),
      expiresAt: fmtDate(doc.expiresAt),
      redcapRecordId: doc.redcapRecordId || '',
      ...flatten(doc.step1 || {}, 'step1_'),
      ...flatten(doc.step2 || {}, 'step2_'),
      ...flatten(doc.result || {}, 'result_'),
      finalCategory: doc.finalCategory || '',
      finalScore: doc.finalScore ?? '',
    };
    const csv = buildCsvFromRecord(flat);
    downloadFile(`sinai_${summary.clinicCode}_${summary.sessionId.slice(0, 8)}.csv`, csv);
  };

  const status = doc?.status || summary.status;
  const cfg = STATUS_LABELS[status] || STATUS_LABELS.pending;
  const canSubmit = status === 'pending' || status === 'redcap_error';
  const canMark   = status === 'pending' || status === 'redcap_error';

  return (
    <div className="sr-modal-root" role="dialog" aria-modal="true">
      <div className="sr-modal-backdrop" onClick={onClose} />
      <div className="sr-modal-panel sr-modal-panel--wide">
        <header className="sr-modal-header">
          <div>
            <span className={`sr-status sr-status--${cfg.color}`}>
              <cfg.Icon size={12} /> {cfg.label}
            </span>
            <h3>Session detail</h3>
            <p className="sr-modal-sub">
              <code className="sr-code">{formatCode(summary.clinicCode)}</code>
              <span style={{ marginLeft: 8, color: '#94a3b8', fontSize: 12 }}>
                {summary.sessionId}
              </span>
            </p>
          </div>
          <button type="button" className="sr-modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>

        {error && (
          <div className="sr-banner sr-banner--error" style={{ margin: '0 18px 12px' }}>
            <AlertCircle size={16} /><span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="sr-modal-body sr-loading">
            <Loader2 size={20} className="sr-spin" /> Loading session…
          </div>
        )}

        {doc && !loading && (
          <>
            <div className="sr-modal-body">
              <div className="sr-detail-grid">
                <DetailField label="Status" value={cfg.label} />
                <DetailField label="Pathway" value={doc.pathwayMode} mono />
                <DetailField label="Created" value={fmtDate(doc.createdAt)} />
                <DetailField label="Expires (TTL)" value={fmtDate(doc.expiresAt)} />
                <DetailField label="REDCap record" value={doc.redcapRecordId || '—'} mono />
                <DetailField label="REDCap submitted" value={fmtDate(doc.redcapSubmittedAt)} />
                {doc.importedAt && (
                  <>
                    <DetailField label="Marked imported at" value={fmtDate(doc.importedAt)} />
                    <DetailField label="Marked imported by" value={doc.importedBy || '—'} />
                  </>
                )}
                {doc.redcapError && (
                  <DetailField
                    label="Last REDCap error"
                    value={doc.redcapError}
                    span
                    error
                  />
                )}
              </div>

              <DetailSection title="Step 1 — risk factors" data={doc.step1} />
              <DetailSection title="Step 1 result" data={doc.result} />
              {doc.step2 && <DetailSection title="Step 2 — PSA / MRI" data={doc.step2} />}
              {(doc.finalCategory || doc.finalScore !== undefined) && (
                <DetailSection
                  title="Step 2 result"
                  data={{ finalCategory: doc.finalCategory, finalScore: doc.finalScore }}
                />
              )}
            </div>

            {showImportForm && (
              <div className="sr-action-panel">
                <header><span>Mark this session as manually imported</span></header>
                <div className="sr-form-row">
                  <label>REDCap record ID</label>
                  <input
                    type="text"
                    value={importRecordId}
                    onChange={(e) => setImportRecordId(e.target.value)}
                    placeholder="e.g. 1042"
                    disabled={busy === 'mark_imported'}
                  />
                </div>
                <div className="sr-form-row">
                  <label>Notes (optional)</label>
                  <input
                    type="text"
                    value={importNotes}
                    onChange={(e) => setImportNotes(e.target.value)}
                    placeholder="Anything the next reviewer should know"
                    disabled={busy === 'mark_imported'}
                  />
                </div>
                <div className="sr-form-actions">
                  <button className="sr-btn-ghost" onClick={() => setShowImportForm(false)}>Cancel</button>
                  <button className="sr-btn-primary" onClick={handleMarkImported} disabled={busy === 'mark_imported'}>
                    {busy === 'mark_imported' ? <Loader2 size={14} className="sr-spin" /> : <CheckCircle2 size={14} />}
                    <span>Confirm import</span>
                  </button>
                </div>
              </div>
            )}

            {showDeleteForm && (
              <div className="sr-action-panel sr-action-panel--danger">
                <header><span>Delete this session immediately</span></header>
                <p className="sr-action-help">
                  This removes the temporary copy from Firestore. It does not affect any
                  REDCap record that may have already been written.
                </p>
                <div className="sr-form-row">
                  <label>Reason (optional)</label>
                  <input
                    type="text"
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="e.g. patient asked to withdraw"
                    disabled={busy === 'delete'}
                  />
                </div>
                <div className="sr-form-actions">
                  <button className="sr-btn-ghost" onClick={() => setShowDeleteForm(false)}>Cancel</button>
                  <button className="sr-btn-danger" onClick={handleDelete} disabled={busy === 'delete'}>
                    {busy === 'delete' ? <Loader2 size={14} className="sr-spin" /> : <Trash2 size={14} />}
                    <span>Delete session</span>
                  </button>
                </div>
              </div>
            )}

            <footer className="sr-modal-footer">
              <div className="sr-modal-footer-left">
                <button className="sr-btn-ghost" onClick={handleDownloadJson}>
                  <Download size={14} /> JSON
                </button>
                <button className="sr-btn-ghost" onClick={handleDownloadCsv}>
                  <Download size={14} /> REDCap CSV
                </button>
                <button
                  className="sr-btn-danger-ghost"
                  onClick={() => setShowDeleteForm((s) => !s)}
                  disabled={busy != null}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
              <div className="sr-modal-footer-right">
                {canMark && (
                  <button
                    className="sr-btn-ghost"
                    onClick={() => setShowImportForm((s) => !s)}
                    disabled={busy != null}
                  >
                    <Upload size={14} /> Mark imported
                  </button>
                )}
                {canSubmit && (
                  <button
                    className="sr-btn-primary"
                    onClick={handleSubmitToRedcap}
                    disabled={busy != null}
                  >
                    {busy === 'submit'
                      ? <Loader2 size={14} className="sr-spin" />
                      : <Upload size={14} />}
                    <span>Submit to REDCap</span>
                  </button>
                )}
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
};

const DetailField = ({ label, value, mono = false, span = false, error = false }) => (
  <div className={`sr-detail-field ${span ? 'sr-detail-field--span' : ''} ${error ? 'sr-detail-field--error' : ''}`}>
    <span className="sr-detail-field-label">{label}</span>
    <span className={`sr-detail-field-value ${mono ? 'sr-mono' : ''}`}>{value ?? '—'}</span>
  </div>
);

const DetailSection = ({ title, data }) => {
  if (!data) return null;
  const entries = Object.entries(data).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (entries.length === 0) return null;
  return (
    <details className="sr-detail-section" open>
      <summary>{title}</summary>
      <div className="sr-detail-section-grid">
        {entries.map(([k, v]) => (
          <DetailField key={k} label={k} value={renderValue(v)} mono />
        ))}
      </div>
    </details>
  );
};

const renderValue = (v) => {
  if (Array.isArray(v)) return `[${v.join(', ')}]`;
  if (typeof v === 'object' && v !== null) return JSON.stringify(v);
  return String(v);
};

const flatten = (obj, prefix) => {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) out[prefix + k] = v.join(';');
    else if (typeof v === 'object') out[prefix + k] = JSON.stringify(v);
    else out[prefix + k] = v;
  }
  return out;
};

// ─────────────────────────────────────────────────────────────────────────
// Public session detail modal
// ─────────────────────────────────────────────────────────────────────────

const PublicSessionModal = ({ summary, onClose, onAction }) => {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const full = await getPublicSession(summary.sessionId);
        if (!cancelled) setDoc(full);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load session.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [summary.sessionId]);

  const handleResync = async () => {
    setBusy('resync'); setError(null);
    try {
      await resyncPublicSession(summary.sessionId);
      onAction({ kind: 'success', text: 'Resync requested — the syncToRedcap trigger will re-run shortly.' });
    } catch (err) {
      setError(err?.message || 'Failed to request resync.');
      setBusy(null);
    }
  };

  const handleDownloadJson = () => {
    if (!doc) return;
    downloadFile(
      `public_${summary.userIdPrefix}_${summary.sessionId.slice(0, 8)}.json`,
      JSON.stringify(doc, null, 2),
      'application/json'
    );
  };

  const handleDownloadCsv = () => {
    if (!doc) return;
    const session = doc.session || {};
    const flat = {
      sessionId: doc._id,
      cohort: 'public_consented',
      userIdPrefix: doc.userIdPrefix,
      researchConsent: doc.researchConsent,
      researchTimestamp: doc.researchTimestampMillis ? new Date(doc.researchTimestampMillis).toISOString() : '',
      consentBasis: doc.consentBasis || '',
      status: session.status || '',
      pathwayMode: session.pathwayMode || '',
      createdAt: session.createdAt ? new Date(session.createdAt).toISOString() : '',
      redcapSynced: session.redcapSynced === true,
      redcapSyncedAt: session.redcapSyncedAt ? new Date(session.redcapSyncedAt).toISOString() : '',
      ...flatten(session.step1 || {}, 'step1_'),
      ...flatten(session.step2 || {}, 'step2_'),
      ...flatten(session.result || {}, 'result_'),
      finalCategory: session.finalCategory || '',
      finalScore: session.finalScore ?? '',
    };
    downloadFile(
      `public_${summary.userIdPrefix}_${summary.sessionId.slice(0, 8)}.csv`,
      buildCsvFromRecord(flat)
    );
  };

  const session = doc?.session || {};
  const syncKey =
    session.redcapSyncError ? 'error'
    : session.redcapSynced ? 'synced'
    : 'unsynced';
  const cfg = PUBLIC_SYNC_LABELS[syncKey];
  const canResync = !session.redcapSynced;

  return (
    <div className="sr-modal-root" role="dialog" aria-modal="true">
      <div className="sr-modal-backdrop" onClick={onClose} />
      <div className="sr-modal-panel sr-modal-panel--wide">
        <header className="sr-modal-header">
          <div>
            <CohortBadge cohort="public" linked={!!summary.linkedToSinai} />
            <h3 style={{ marginTop: 8 }}>Public-cohort session</h3>
            <p className="sr-modal-sub">
              <code className="sr-code-soft">uid:{summary.userIdPrefix}…</code>
              <span style={{ marginLeft: 8, color: '#94a3b8', fontSize: 12 }}>
                {summary.sessionId}
              </span>
            </p>
          </div>
          <button type="button" className="sr-modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>

        {error && (
          <div className="sr-banner sr-banner--error" style={{ margin: '0 18px 12px' }}>
            <AlertCircle size={16} /><span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="sr-modal-body sr-loading">
            <Loader2 size={20} className="sr-spin" /> Loading session…
          </div>
        )}

        {doc && !loading && (
          <>
            <div className="sr-modal-body">
              <div className="sr-detail-grid">
                <DetailField label="Cohort" value="Public · Consented" />
                <DetailField label="REDCap sync status" value={cfg.label} />
                <DetailField label="Pathway" value={session.pathwayMode} mono />
                <DetailField label="Session status" value={session.status} mono />
                <DetailField label="Created" value={fmtDate(session.createdAt)} />
                <DetailField label="REDCap synced at" value={fmtDate(session.redcapSyncedAt)} />
                <DetailField label="Research consent given" value={doc.researchConsent ? 'Yes' : 'No'} />
                <DetailField label="Consent timestamp" value={fmtDate(doc.researchTimestampMillis)} />
                <DetailField label="Consent basis" value={doc.consentBasis || '—'} mono />
                <DetailField label="User ID" value={`${doc.userId.slice(0, 24)}…`} mono />
                {summary.linkedToSinai && (
                  <DetailField
                    label="Linked to Sinai code"
                    value={`${formatCode(summary.linkedToSinai.clinicCode)} at ${fmtDate(summary.linkedToSinai.linkedAtMillis)}`}
                    span
                  />
                )}
                {session.redcapSyncError && (
                  <DetailField label="Last REDCap error" value={session.redcapSyncError} span error />
                )}
              </div>

              <DetailSection title="Step 1 — risk factors" data={session.step1} />
              <DetailSection title="Step 1 result" data={session.result} />
              {session.step2 && <DetailSection title="Step 2 — PSA / MRI" data={session.step2} />}
              {(session.finalCategory || session.finalScore !== undefined) && (
                <DetailSection
                  title="Step 2 result"
                  data={{ finalCategory: session.finalCategory, finalScore: session.finalScore }}
                />
              )}
            </div>

            <footer className="sr-modal-footer">
              <div className="sr-modal-footer-left">
                <button className="sr-btn-ghost" onClick={handleDownloadJson}>
                  <Download size={14} /> JSON
                </button>
                <button className="sr-btn-ghost" onClick={handleDownloadCsv}>
                  <Download size={14} /> REDCap CSV
                </button>
              </div>
              <div className="sr-modal-footer-right">
                {canResync && (
                  <button className="sr-btn-primary" onClick={handleResync} disabled={busy != null}>
                    {busy === 'resync' ? <Loader2 size={14} className="sr-spin" /> : <RotateCw size={14} />}
                    <span>Re-trigger REDCap sync</span>
                  </button>
                )}
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Codes tab
// ─────────────────────────────────────────────────────────────────────────

const CodesTab = () => {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all | unused | used | revoked
  const [showGenerate, setShowGenerate] = useState(false);
  const [generated, setGenerated] = useState(null); // result of last mint

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(query(collection(adminDb, 'clinicCodes'), orderBy('issuedAt', 'desc'), fsLimit(500)));
      const list = snap.docs.map((d) => {
        const data = d.data() || {};
        return {
          id: d.id,
          code: data.code || d.id,
          issuedBy: data.issuedBy,
          issuedAtMillis: data.issuedAt?.toMillis?.() ?? null,
          expiresAtMillis: data.expiresAt?.toMillis?.() ?? null,
          used: data.used === true,
          usedAtMillis: data.usedAt?.toMillis?.() ?? null,
          sessionId: data.sessionId || null,
          redcapRecordId: data.redcapRecordId || null,
          submittedToRedcap: data.submittedToRedcap === true,
          revoked: data.revoked === true,
          revokedReason: data.revokedReason || null,
        };
      });
      setCodes(list);
    } catch (err) {
      setError(err?.message || 'Failed to load codes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (filter === 'all') return codes;
    if (filter === 'unused') return codes.filter((c) => !c.used && !c.revoked);
    if (filter === 'used') return codes.filter((c) => c.used);
    if (filter === 'revoked') return codes.filter((c) => c.revoked);
    return codes;
  }, [codes, filter]);

  const handleRevoke = async (code) => {
    const reason = window.prompt(`Revoke clinic code ${formatCode(code)}? Optional reason:`);
    if (reason === null) return;
    try {
      await revokeClinicCode(code, reason.trim() || null);
      await load();
    } catch (err) {
      alert(err?.message || 'Failed to revoke code.');
    }
  };

  return (
    <>
      {error && <div className="sr-banner sr-banner--error"><AlertCircle size={16} /><span>{error}</span></div>}

      <div className="sr-toolbar">
        <div className="sr-toolbar-left">
          <select className="sr-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All codes</option>
            <option value="unused">Unused</option>
            <option value="used">Used</option>
            <option value="revoked">Revoked</option>
          </select>
          <span className="sr-toolbar-counter">{filtered.length} of {codes.length}</span>
        </div>
        <div className="sr-toolbar-right">
          <button className="sr-btn-ghost" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'sr-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button className="sr-btn-primary" onClick={() => setShowGenerate(true)}>
            <Plus size={14} /> <span>Generate codes</span>
          </button>
        </div>
      </div>

      <div className="sr-table-wrap">
        <table className="sr-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Status</th>
              <th>Issued by</th>
              <th>Issued</th>
              <th>Expires</th>
              <th>Used at</th>
              <th>REDCap ID</th>
              <th aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && !loading && (
              <tr><td colSpan={8} className="sr-empty">No codes match this filter.</td></tr>
            )}
            {filtered.map((c) => {
              const statusInfo =
                c.revoked ? { label: 'Revoked', color: 'red', Icon: ShieldOff }
                : c.used ? { label: 'Used', color: 'green', Icon: CheckCircle2 }
                : { label: 'Unused', color: 'amber', Icon: Clock };
              return (
                <tr key={c.id}>
                  <td>
                    <span className="sr-code-cell">
                      <code className="sr-code">{formatCode(c.code)}</code>
                      <button
                        type="button"
                        className="sr-copy-btn"
                        title="Copy"
                        onClick={() => navigator.clipboard?.writeText(formatCode(c.code))}
                      >
                        <Copy size={12} />
                      </button>
                    </span>
                  </td>
                  <td>
                    <span className={`sr-status sr-status--${statusInfo.color}`}>
                      <statusInfo.Icon size={12} /> {statusInfo.label}
                    </span>
                  </td>
                  <td className="sr-small">{c.issuedBy || '—'}</td>
                  <td>{fmtShort(c.issuedAtMillis)}</td>
                  <td>{c.expiresAtMillis ? fmtShort(c.expiresAtMillis) : 'never'}</td>
                  <td>{fmtShort(c.usedAtMillis)}</td>
                  <td className="sr-mono">{c.redcapRecordId || '—'}</td>
                  <td>
                    {!c.revoked && !c.used && (
                      <button className="sr-btn-row sr-btn-row--danger" onClick={() => handleRevoke(c.code)}>
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showGenerate && (
        <GenerateCodesModal
          onClose={() => { setShowGenerate(false); setGenerated(null); }}
          onGenerated={(result) => { setGenerated(result); load(); }}
          result={generated}
        />
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Generate codes modal
// ─────────────────────────────────────────────────────────────────────────

const GenerateCodesModal = ({ onClose, onGenerated, result }) => {
  const [count, setCount] = useState(10);
  const [expiresInDays, setExpiresInDays] = useState(90);
  const [neverExpires, setNeverExpires] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setBusy(true); setError(null);
    try {
      const res = await generateClinicCodes(
        Number(count),
        neverExpires ? null : Number(expiresInDays)
      );
      onGenerated(res);
    } catch (err) {
      setError(err?.message || 'Failed to generate codes.');
    } finally {
      setBusy(false);
    }
  };

  const handleCopyAll = () => {
    if (!result?.codes) return;
    const text = result.codes.map((c) => c.display).join('\n');
    navigator.clipboard?.writeText(text);
  };

  const handleDownloadAll = () => {
    if (!result?.codes) return;
    const csv = ['code\n', ...result.codes.map((c) => `${c.display}\n`)].join('');
    downloadFile(`clinic_codes_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <div className="sr-modal-root" role="dialog" aria-modal="true">
      <div className="sr-modal-backdrop" onClick={onClose} />
      <div className="sr-modal-panel">
        <header className="sr-modal-header">
          <div>
            <h3>Generate clinic codes</h3>
            <p className="sr-modal-sub">Codes are random 12-char strings using a phone-readable charset.</p>
          </div>
          <button type="button" className="sr-modal-close" onClick={onClose}><X size={16} /></button>
        </header>

        {!result && (
          <div className="sr-modal-body">
            {error && (
              <div className="sr-banner sr-banner--error" style={{ marginBottom: 12 }}>
                <AlertCircle size={16} /><span>{error}</span>
              </div>
            )}
            <div className="sr-form-row">
              <label>How many?</label>
              <input
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                disabled={busy}
              />
            </div>
            <div className="sr-form-row">
              <label>Expires in</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <input
                  type="number"
                  min={1}
                  max={730}
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Math.max(1, Math.min(730, Number(e.target.value) || 1)))}
                  disabled={busy || neverExpires}
                  style={{ width: 100 }}
                />
                <span style={{ color: '#94a3b8', fontSize: 13 }}>days</span>
                <label className="sr-checkbox" style={{ marginLeft: 12 }}>
                  <input
                    type="checkbox"
                    checked={neverExpires}
                    onChange={(e) => setNeverExpires(e.target.checked)}
                    disabled={busy}
                  />
                  <span>Never expires</span>
                </label>
              </div>
            </div>
            <div className="sr-modal-help">
              You can revoke any code from the codes table later.
            </div>
          </div>
        )}

        {result && (
          <div className="sr-modal-body">
            <div className="sr-banner sr-banner--success" style={{ marginBottom: 12 }}>
              <CheckCircle2 size={16} />
              <span>Generated {result.codes.length} code{result.codes.length === 1 ? '' : 's'}.</span>
            </div>
            <ul className="sr-code-list">
              {result.codes.map((c) => (
                <li key={c.code}>
                  <code className="sr-code">{c.display}</code>
                  <button
                    type="button"
                    className="sr-copy-btn"
                    onClick={() => navigator.clipboard?.writeText(c.display)}
                    title="Copy"
                  >
                    <Copy size={12} />
                  </button>
                </li>
              ))}
            </ul>
            <p className="sr-modal-help" style={{ marginTop: 12 }}>
              Save or distribute these codes now — they can be revoked but not re-shown in full.
            </p>
          </div>
        )}

        <footer className="sr-modal-footer">
          <div className="sr-modal-footer-left">
            {result && (
              <>
                <button className="sr-btn-ghost" onClick={handleCopyAll}>
                  <Copy size={14} /> Copy all
                </button>
                <button className="sr-btn-ghost" onClick={handleDownloadAll}>
                  <Download size={14} /> CSV
                </button>
              </>
            )}
          </div>
          <div className="sr-modal-footer-right">
            <button className="sr-btn-ghost" onClick={onClose}>{result ? 'Done' : 'Cancel'}</button>
            {!result && (
              <button className="sr-btn-primary" onClick={handleGenerate} disabled={busy}>
                {busy ? <Loader2 size={14} className="sr-spin" /> : <Plus size={14} />}
                <span>Generate</span>
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Audit log tab
// ─────────────────────────────────────────────────────────────────────────

const AuditTab = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);

  const load = useCallback(async (reset = true) => {
    setLoading(true); setError(null);
    try {
      const res = await listClinicCodeAuditLog({
        limit: 100,
        ...(reset ? {} : nextCursor ? { startAfterMillis: nextCursor } : {}),
      });
      setEntries(reset ? res.entries : [...entries, ...res.entries]);
      setNextCursor(res.nextStartAfterMillis);
    } catch (err) {
      setError(err?.message || 'Failed to load audit log.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextCursor]);

  useEffect(() => { load(true); /* eslint-disable-next-line */ }, []);

  return (
    <>
      {error && <div className="sr-banner sr-banner--error"><AlertCircle size={16} /><span>{error}</span></div>}

      <div className="sr-toolbar">
        <span className="sr-toolbar-counter">{entries.length} entries</span>
        <button className="sr-btn-ghost" onClick={() => load(true)} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'sr-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="sr-table-wrap">
        <table className="sr-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Action</th>
              <th>Outcome</th>
              <th>Code (hash prefix)</th>
              <th>Caller</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && !loading && (
              <tr><td colSpan={6} className="sr-empty">No audit entries yet.</td></tr>
            )}
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="sr-small">{fmtDate(e.timestampMillis)}</td>
                <td className="sr-mono">{e.action}</td>
                <td>
                  <span className={`sr-status sr-status--${outcomeColor(e.outcome)}`}>
                    {String(e.outcome)}
                  </span>
                </td>
                <td className="sr-mono sr-small">{e.codeHashPrefix || '—'}</td>
                <td className="sr-small">{e.callerKey || '—'}</td>
                <td className="sr-small">
                  {e.errorMessage && <span style={{ color: '#dc2626' }}>{e.errorMessage}</span>}
                  {e.redcapRecordId && <span> · REDCap: {e.redcapRecordId}</span>}
                  {e.metadata && <span> · {JSON.stringify(e.metadata)}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sr-table-footer">
        {nextCursor && (
          <button className="sr-btn-ghost" onClick={() => load(false)} disabled={loading}>
            Load more
          </button>
        )}
      </div>
    </>
  );
};

const outcomeColor = (outcome) => {
  if (!outcome) return 'gray';
  const s = String(outcome);
  if (s === 'valid' || s === 'submitted_redcap' || s === 'submitted_pending' ||
      s === 'marked_imported' || s === 'minted' || s === 'ok' || s === 'toggled') return 'green';
  if (s === 'malformed' || s === 'redcap_error' || s === 'unauthorized') return 'red';
  if (s === 'not_found' || s === 'already_used' || s === 'expired' || s === 'revoked' || s === 'deleted') return 'amber';
  return 'gray';
};

// ─────────────────────────────────────────────────────────────────────────
// Settings tab
// ─────────────────────────────────────────────────────────────────────────

const SettingsTab = ({ config, onChange }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleToggle = async () => {
    const newValue = !config.redcapEnabled;
    if (newValue && !window.confirm(
      'Enable live REDCap submission?\n\n' +
      'New Sinai sessions will be pushed to REDCap immediately on submit. ' +
      'Make sure the Sinai REDCap project is configured and the API token is set.'
    )) return;

    setBusy(true); setError(null);
    try {
      await toggleSinaiRedcapEnabled(newValue);
      const refreshed = await readSinaiConfig();
      onChange(refreshed);
    } catch (err) {
      setError(err?.message || 'Failed to update flag.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sr-settings">
      {error && <div className="sr-banner sr-banner--error"><AlertCircle size={16} /><span>{error}</span></div>}

      <div className="sr-settings-card">
        <div className="sr-settings-card-header">
          <FlaskConical size={18} />
          <h3>Live REDCap submission</h3>
        </div>
        <p className="sr-settings-desc">
          When enabled, completed Sinai sessions are pushed to Mount Sinai REDCap immediately.
          When disabled, sessions are stored in <code>sinaiSessions</code> with a 30-day TTL
          and admins submit each one manually from the Sessions tab. Either way, every
          submission writes a row that admins can review here.
        </p>

        <div className="sr-settings-toggle">
          <div>
            <strong>Status:</strong>{' '}
            {config.redcapEnabled
              ? <span style={{ color: '#16a34a', fontWeight: 600 }}>ENABLED</span>
              : <span style={{ color: '#d97706', fontWeight: 600 }}>DISABLED (admin queue)</span>}
            {config.updatedAt && (
              <div className="sr-settings-meta">
                Last changed {fmtDate(config.updatedAt)} by {config.updatedBy || 'unknown'}
              </div>
            )}
          </div>
          <button
            type="button"
            className={`sr-toggle-btn ${config.redcapEnabled ? 'sr-toggle-btn--on' : ''}`}
            onClick={handleToggle}
            disabled={busy}
            aria-label="Toggle live REDCap submission"
          >
            {busy
              ? <Loader2 size={16} className="sr-spin" />
              : (config.redcapEnabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />)}
          </button>
        </div>
      </div>

      <div className="sr-settings-card">
        <div className="sr-settings-card-header">
          <AlertTriangle size={18} />
          <h3>Deploy checklist</h3>
        </div>
        <p className="sr-settings-desc">
          Before enabling live submission, make sure all of these are in place. The flag
          alone is not enough — these need to happen on the Firebase side.
        </p>
        <ul className="sr-checklist">
          <li>REDCap API URL and token set:
            <pre>firebase functions:config:set \
  redcap.sinai_api_url="https://redcap.mssm.edu/api/" \
  redcap.sinai_api_token="&lt;token&gt;"</pre>
          </li>
          <li>Functions redeployed: <code>firebase deploy --only functions</code></li>
          <li>Firestore TTL policy active on <code>sinaiSessions.expiresAt</code>:
            <pre>gcloud firestore fields ttls update expiresAt \
  --collection-group=sinaiSessions --enable-ttl</pre>
          </li>
          <li>Sinai REDCap data dictionary imported (matches the backend mapper field names)</li>
          <li>Test submission with a throwaway code — verify it lands in REDCap</li>
        </ul>
      </div>
    </div>
  );
};

export default SinaiResearch;
