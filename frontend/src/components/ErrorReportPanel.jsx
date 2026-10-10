import React, { useEffect, useState } from 'react';
import { clearErrorReports, formatErrorReport, getErrorReports } from '../utils/errorReport';

export const BUG_REPORT_EMAIL = 'aditya.dixit@mssm.edu';
// mailto: URLs break in some clients past ~2000 chars, so the body is trimmed.
const MAX_MAIL_BODY = 1500;

/**
 * Shows the locally saved error report with copy / download / clear. Used by
 * the scoring-failed banner and the crash screen. Nothing here is sent
 * anywhere — the patient chooses what to do with the text.
 */
const ErrorReportPanel = ({ onClose, style }) => {
  const [entries, setEntries] = useState(getErrorReports);
  // Re-read after mount: a crash boundary saves the error in componentDidCatch,
  // which runs after this panel's first render.
  useEffect(() => { setEntries(getErrorReports()); }, []);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState('');
  const [shotState, setShotState] = useState('idle');
  const text = formatErrorReport(entries);

  const mailtoHref = () => {
    const body = [
      note.trim() ? `What happened:\n${note.trim()}\n` : 'What happened: (please describe)\n',
      text.length > MAX_MAIL_BODY ? `${text.slice(0, MAX_MAIL_BODY)}\n…(trimmed — full report attached/downloaded)` : text,
      '\nIf you saved a screenshot, please attach it to this email.',
    ].join('\n');
    return `mailto:${BUG_REPORT_EMAIL}?subject=${encodeURIComponent('ePSA bug report')}&body=${encodeURIComponent(body)}`;
  };

  // The screenshot is taken in the browser and saved to the user's own device;
  // it is never uploaded. It can show answers on screen, so the user reviews
  // it before attaching it to an email.
  const saveScreenshot = async () => {
    setShotState('working');
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(document.body, {
        logging: false,
        ignoreElements: (el) => el.getAttribute?.('data-error-report-overlay') === 'true',
      });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('empty screenshot');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `epsa-screenshot-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setShotState('done');
    } catch {
      setShotState('failed');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked: the text is selectable below */ }
  };

  const download = () => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `epsa-error-report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const btn = { padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: 14 };

  return (
    <div role="dialog" aria-label="Error report" style={{ background: '#fff', color: '#111827', border: '1px solid #cbd5e1', borderRadius: 10, padding: 16, maxWidth: 720, margin: '16px auto', textAlign: 'left', ...style }}>
      <h2 style={{ fontSize: 18, margin: '0 0 6px' }}>Error report</h2>
      <p style={{ margin: '0 0 10px', fontSize: 14, lineHeight: 1.5 }}>
        Saved on this device only. It contains no answers or results. Copy or download it and send it
        to the ePSA team so they can fix the problem.
      </p>
      <label style={{ display: 'block', fontSize: 14, margin: '0 0 10px' }}>
        What were you doing? (optional — please don't include your name or other personal details)
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          style={{ display: 'block', width: '100%', marginTop: 4, padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', font: 'inherit', boxSizing: 'border-box' }}
        />
      </label>
      <pre data-testid="error-report-text" style={{ maxHeight: 260, overflow: 'auto', background: '#f1f5f9', padding: 10, borderRadius: 6, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{text}</pre>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        <a href={mailtoHref()} style={{ ...btn, textDecoration: 'none', color: 'inherit', background: '#e8f1f8' }}>Email to the team</a>
        <button type="button" style={btn} onClick={saveScreenshot} disabled={shotState === 'working'}>
          {shotState === 'working' ? 'Saving screenshot…' : 'Save screenshot'}
        </button>
        <button type="button" style={btn} onClick={copy}>{copied ? 'Copied' : 'Copy report'}</button>
        <button type="button" style={btn} onClick={download}>Download report</button>
        <button type="button" style={btn} onClick={() => { clearErrorReports(); setEntries([]); }}>Clear report</button>
        {onClose && <button type="button" style={btn} onClick={onClose}>Close</button>}
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 12, color: '#475569' }} role="status">
        {shotState === 'done' && 'Screenshot saved to your downloads — attach it to the email. Check it first: it shows what was on screen. '}
        {shotState === 'failed' && "Couldn't capture a screenshot — use your device's screenshot shortcut instead. "}
        “Email to the team” opens your own email app; nothing is sent until you press send.
      </p>
    </div>
  );
};

export default ErrorReportPanel;
