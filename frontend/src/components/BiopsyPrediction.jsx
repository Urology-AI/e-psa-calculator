import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MicroscopeIcon, PlusIcon, Trash2Icon, DownloadIcon, AlertTriangleIcon } from 'lucide-react';
import { fetchBiopsyPrediction } from '../utils/biopsyApi';
import './QuickEntry.css';
import './BiopsyPrediction.css';

/**
 * Clinician tool: GG≥2 biopsy-risk estimates for one or more patients from
 * PSA, PI-RADS and (optionally) prostate volume. Replaces the standalone
 * Urology-AI/biopsy-prediction web page; the model itself runs server-side in
 * the predictBiopsyRisk callable (same one Part 3 uses).
 *
 * Nothing entered here is stored — rows live in component state only, and the
 * CSV export is generated in the browser.
 */

const TIER_CLS = {
  biopsy_not_indicated: 'bp-tier--low',
  monitoring_advised: 'bp-tier--below',
  biopsy_discussion_advised: 'bp-tier--mid',
  biopsy_recommended: 'bp-tier--high',
};

let nextId = 1;
const newRow = () => ({ id: nextId++, psa: '', pirads: '', volume: '', result: null, error: null, loading: false });

export default function BiopsyPrediction({ onClose }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState(() => [newRow()]);

  const update = (id, patch) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const edit = (id, patch) => update(id, { ...patch, result: null, error: null });

  const canRun = (r) => parseFloat(r.psa) > 0 && parseInt(r.pirads, 10) >= 1;

  async function run(row) {
    if (!canRun(row)) return;
    update(row.id, { loading: true, error: null });
    try {
      const volume = parseFloat(row.volume);
      const result = await fetchBiopsyPrediction({
        psa: parseFloat(row.psa),
        pirads: parseInt(row.pirads, 10),
        prostateVolume: volume > 0 ? volume : null,
      });
      update(row.id, { result, loading: false });
    } catch (err) {
      update(row.id, { error: err?.message || t('biopsyTool.error'), loading: false });
    }
  }

  const runAll = () => rows.filter(canRun).forEach(run);

  function exportCsv() {
    const done = rows.filter((r) => r.result);
    if (!done.length) return;
    const header = 'Patient,PSA,PI-RADS,Volume (mL),PSAD,P(GG>=2) %,Tier,Model';
    const lines = done.map((r, i) => [
      `P${String(i + 1).padStart(3, '0')}`, r.psa, r.pirads, r.volume || '',
      r.result.psad != null ? r.result.psad.toFixed(3) : '',
      r.result.percent.toFixed(1), r.result.tier?.label ?? '', `"${r.result.model_version}"`,
    ].join(','));
    const url = URL.createObjectURL(new Blob([[header, ...lines].join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'biopsy-predictions.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const done = rows.filter((r) => r.result);

  return (
    <div className="qe-root">
      <div className="qe-header">
        <div className="qe-header-left">
          <MicroscopeIcon size={18} className="qe-header-icon" aria-hidden="true" />
          <div>
            <div className="qe-header-title">{t('biopsyTool.title')}</div>
            <div className="qe-header-subtitle">{t('biopsyTool.subtitle')}</div>
          </div>
        </div>
        {onClose && (
          <button type="button" className="qe-exit-btn" onClick={onClose}>{t('quickEntry.exit')}</button>
        )}
      </div>

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{t('biopsyTool.psa')}</th>
              <th>{t('biopsyTool.pirads')}</th>
              <th>{t('biopsyTool.volume')}</th>
              <th>{t('biopsyTool.result')}</th>
              <th aria-label={t('biopsyTool.actions')} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td className="bp-num">{i + 1}</td>
                <td>
                  <input type="number" min="0.1" step="0.1" inputMode="decimal" placeholder="5.2"
                    aria-label={`${t('biopsyTool.psa')} ${i + 1}`}
                    value={r.psa} onChange={(e) => edit(r.id, { psa: e.target.value })} />
                </td>
                <td>
                  <select aria-label={`${t('biopsyTool.pirads')} ${i + 1}`}
                    value={r.pirads} onChange={(e) => edit(r.id, { pirads: e.target.value })}>
                    <option value="">—</option>
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </td>
                <td>
                  <input type="number" min="1" step="1" inputMode="decimal" placeholder={t('biopsyTool.optional')}
                    aria-label={`${t('biopsyTool.volume')} ${i + 1}`}
                    value={r.volume} onChange={(e) => edit(r.id, { volume: e.target.value })} />
                </td>
                <td className="bp-result" aria-live="polite">
                  {r.loading && <span className="bp-muted">{t('biopsyTool.calculating')}</span>}
                  {r.error && <span className="bp-error">{r.error}</span>}
                  {r.result && (
                    <>
                      <span className={`bp-tier ${TIER_CLS[r.result.tier?.key] ?? ''}`}>
                        <strong>{r.result.percent.toFixed(1)}%</strong> {r.result.tier?.label}
                      </span>
                      <span className="bp-muted">
                        {r.result.psad != null && `PSAD ${r.result.psad.toFixed(3)} · `}{r.result.model_version}
                      </span>
                      {!r.result.reliable && (
                        <span className="bp-warn"><AlertTriangleIcon size={12} aria-hidden="true" /> {t('biopsyTool.unreliable')}</span>
                      )}
                    </>
                  )}
                  {!r.loading && !r.error && !r.result && (
                    <button type="button" className="qe-exit-btn" disabled={!canRun(r)} onClick={() => run(r)}>
                      {t('biopsyTool.calculate')}
                    </button>
                  )}
                </td>
                <td>
                  <button type="button" className="bp-icon-btn" disabled={rows.length === 1}
                    aria-label={t('biopsyTool.remove')} onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}>
                    <Trash2Icon size={14} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bp-actions">
        <button type="button" className="qe-exit-btn" onClick={() => setRows((rs) => [...rs, newRow()])}>
          <PlusIcon size={14} aria-hidden="true" /> {t('biopsyTool.addPatient')}
        </button>
        <button type="button" className="qe-exit-btn" onClick={runAll} disabled={!rows.some(canRun)}>
          {t('biopsyTool.calculateAll')}
        </button>
        <button type="button" className="qe-exit-btn" onClick={exportCsv} disabled={!done.length}>
          <DownloadIcon size={14} aria-hidden="true" /> {t('biopsyTool.exportCsv')}
        </button>
      </div>

      <p className="bp-note">{t('biopsyTool.disclaimer')}</p>
    </div>
  );
}
