import React, { useState, useEffect, useCallback } from 'react';
import {
  TrashIcon, DownloadIcon, UploadIcon, PrinterIcon,
  ChevronDownIcon, ChevronUpIcon, ArrowLeftIcon,
  SendIcon, RefreshCwIcon, PlusIcon, ZapIcon
} from 'lucide-react';
import { getClinicalSessions, deleteClinicalSession, exportSessionsAsJson, importSessionsFromFile, saveClinicalSession } from '../services/clinicalSessionService';
import { submitToRedcap } from '../utils/redcapSubmit';
import ClinicalModeResult from './ClinicalModeResult.jsx';
import './ClinicalSessionsManager.css';

const TIER_COLORS = {
  low: '#16a34a',
  intermediate: '#d97706',
  elevated: '#dc2626',
};

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch { return iso; }
}

function SessionRow({ session, uid, onDelete, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushStatus, setPushStatus] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const tier = session.engineResult?.epsaTierKey || 'unknown';
  const tierLabel = session.engineResult?.epsaTierLabel || tier;
  const scoreRange = session.engineResult?.displayRange || '—';
  const age = session.formData?.age || '—';
  const race = session.formData?.race || '—';
  const hasPost = !!(session.step2 || session.postResult);
  const psa = session.step2?.psa ?? null;
  const pirads = session.step2?.pirads ?? null;
  const ref = session.sessionRef ?? null;

  async function handleDelete() {
    if (!confirming) { setConfirming(true); return; }
    await deleteClinicalSession(uid, session.id);
    onRefresh();
  }

  async function handlePushRedcap() {
    if (!session.formData) return;
    setPushing(true);
    setPushStatus(null);
    try {
      await submitToRedcap(session.formData, session.sessionRef);
      setPushStatus('ok');
    } catch {
      setPushStatus('err');
    } finally {
      setPushing(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleExportThis() {
    exportSessionsAsJson([session]);
  }

  return (
    <div className="csm-row">
      <button
        type="button"
        className="csm-row-header"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
      >
        <span
          className="csm-tier-dot"
          style={{ background: TIER_COLORS[tier] || '#6b7280' }}
          title={tierLabel}
        />
        <span className="csm-row-date">{formatDate(session.createdAt)}</span>
        {ref && <span className="csm-row-ref">{ref}</span>}
        <span className="csm-row-meta">Age {age} · {race}</span>
        <span className="csm-row-tier" style={{ color: TIER_COLORS[tier] || '#6b7280' }}>
          {tierLabel} ({scoreRange})
        </span>
        {hasPost && <span className="csm-row-badge csm-row-badge--full">Part 1+2</span>}
        {expanded ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
      </button>

      {expanded && (
        <div className="csm-row-body">
          <div className="csm-row-actions">
            <button type="button" className="csm-action-btn" onClick={handlePrint} title="Print result">
              <PrinterIcon size={14} /> Print
            </button>
            <button type="button" className="csm-action-btn" onClick={handleExportThis} title="Export this session as JSON">
              <DownloadIcon size={14} /> Export
            </button>
            <button
              type="button"
              className={`csm-action-btn csm-action-btn--redcap${pushStatus === 'ok' ? ' csm-action-btn--ok' : pushStatus === 'err' ? ' csm-action-btn--err' : ''}`}
              onClick={handlePushRedcap}
              disabled={pushing}
              title="Push to REDCap"
            >
              <SendIcon size={14} />
              {pushing ? 'Pushing…' : pushStatus === 'ok' ? 'Sent!' : pushStatus === 'err' ? 'Failed' : 'Push to REDCap'}
            </button>
            <button
              type="button"
              className={`csm-action-btn csm-action-btn--delete${confirming ? ' csm-action-btn--confirm' : ''}`}
              onClick={handleDelete}
              onBlur={() => setConfirming(false)}
              title="Delete session"
            >
              <TrashIcon size={14} />
              {confirming ? 'Confirm delete?' : 'Delete'}
            </button>
          </div>

          {session.engineResult && session.formData && (
            <div className="csm-result-preview print-target">
              <ClinicalModeResult
                result={session.engineResult}
                formData={session.formData}
                sessionRef={ref}
                onEditAnswers={null}
                onStartOver={null}
                onContinue={null}
                onStudyConsent={null}
                readOnly
              />
              {hasPost && (
                <div className="csm-part2-summary">
                  <div className="csm-part2-title">Part 2 — Post-PSA</div>
                  <div className="csm-part2-fields">
                    {psa !== null && <span><strong>PSA:</strong> {psa} ng/mL</span>}
                    {pirads !== null && pirads !== '0' && <span><strong>PI-RADS:</strong> {pirads}</span>}
                    {session.step2?.onHormonalTherapy && <span>On hormonal therapy</span>}
                    {session.postResult?.finalCategory && (
                      <span><strong>Final category:</strong> {session.postResult.finalCategory}</span>
                    )}
                    {session.finalCategory && !session.postResult?.finalCategory && (
                      <span><strong>Final category:</strong> {session.finalCategory}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClinicalSessionsManager({ uid, onBack, onNewSession }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState(null);

  // Check if there's a live ePSA session in sessionStorage to import
  const busflow = (() => {
    try { return JSON.parse(sessionStorage.getItem('busflow_import') || 'null'); } catch { return null; }
  })();
  const hasBusflow = !!(busflow?.engineResult && busflow?.formData);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getClinicalSessions(uid);
      setSessions(data);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const count = await importSessionsFromFile(uid, file);
      setImportMsg(`Imported ${count} session${count !== 1 ? 's' : ''}.`);
      await refresh();
    } catch (err) {
      setImportMsg(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  function handleExportAll() {
    if (!sessions.length) return;
    exportSessionsAsJson(sessions);
  }

  async function handleImportBusflow() {
    if (!hasBusflow) return;
    setImportMsg(null);
    try {
      await saveClinicalSession(uid, {
        formData: busflow.formData,
        engineResult: busflow.engineResult,
      });
      setImportMsg('ePSA session saved successfully.');
      await refresh();
    } catch (err) {
      setImportMsg(`Save failed: ${err.message}`);
    }
  }

  return (
    <div className="csm-root">
      <div className="csm-header">
        <button type="button" className="csm-back-btn" onClick={onBack}>
          <ArrowLeftIcon size={16} /> Back
        </button>
        <h2 className="csm-title">Saved Sessions</h2>
        <div className="csm-header-actions">
          <button type="button" className="csm-icon-btn" onClick={refresh} title="Refresh">
            <RefreshCwIcon size={16} />
          </button>
        </div>
      </div>

      {hasBusflow && (
        <div className="csm-busflow-banner">
          <ZapIcon size={16} className="csm-busflow-icon" />
          <div className="csm-busflow-text">
            <strong>Unsaved ePSA result detected</strong>
            <span>You have a completed ePSA session ready to save.</span>
          </div>
          <button type="button" className="csm-busflow-save-btn" onClick={handleImportBusflow}>
            Save Now
          </button>
        </div>
      )}

      <div className="csm-toolbar">
        <button type="button" className="csm-toolbar-btn csm-toolbar-btn--primary" onClick={onNewSession}>
          <PlusIcon size={15} /> New Session
        </button>
        <button type="button" className="csm-toolbar-btn" onClick={handleExportAll} disabled={!sessions.length}>
          <DownloadIcon size={15} /> Export All
        </button>
        <label className={`csm-toolbar-btn${importing ? ' csm-toolbar-btn--loading' : ''}`}>
          <UploadIcon size={15} /> {importing ? 'Importing…' : 'Import JSON'}
          <input type="file" accept=".json" hidden onChange={handleImport} />
        </label>
      </div>

      {importMsg && (
        <div className={`csm-import-msg${importMsg.startsWith('Import failed') ? ' csm-import-msg--err' : ''}`}>
          {importMsg}
        </div>
      )}

      <div className="csm-list">
        {loading ? (
          <div className="csm-empty">Loading sessions…</div>
        ) : sessions.length === 0 ? (
          <div className="csm-empty">
            No saved sessions yet. Complete a screening to save results here.
          </div>
        ) : (
          sessions.map(s => (
            <SessionRow
              key={s.id}
              session={s}
              uid={uid}
              onDelete={() => {}}
              onRefresh={refresh}
            />
          ))
        )}
      </div>

      <div className="csm-storage-note">
        {uid && !uid.startsWith('dev_')
          ? 'Sessions synced to Firebase (this device).'
          : 'Sessions stored locally on this device.'}
      </div>
    </div>
  );
}
