import React, { useEffect, useState } from 'react';
import {
  CheckCircle2Icon,
  AlertTriangleIcon,
  AlertCircleIcon,
  DownloadIcon,
  RefreshCwIcon,
  HomeIcon,
  Loader2Icon,
  FlaskConicalIcon,
} from 'lucide-react';
import {
  submitSession,
  buildRedcapRecord,
  downloadSinaiCsv,
} from '../utils/sinaiSubmit';
import './MountSinaiGateScreen.css';

/**
 * SinaiResultsScreen
 * ─────────────────────────────────────────────────────────────────────────
 * Terminal screen after the patient completes the form.
 *
 * Calls the unified submitSinaiSession backend callable, which:
 *   - Always persists the session to sinaiSessions/{sessionId} (30-day TTL)
 *   - Conditionally POSTs to Sinai REDCap based on appConfig/sinai
 *
 * The response tells us which path the backend took so we can show
 * appropriate UI:
 *   - redcapSubmitted: true   → "Submitted to REDCap"
 *   - redcapSubmitted: false  → "Saved for processing; offer CSV download"
 *
 * Props:
 *   payload       — { clinicCode, sessionId, step1, result, step2?, ... }
 *   onStartOver   — () => void
 *   onBackToHome  — () => void
 */
const SinaiResultsScreen = ({
  payload,
  onStartOver,
  onBackToHome,
}) => {
  // States: submitting | live_ok | offline_ok | error
  const [state, setState] = useState('submitting');
  const [recordId, setRecordId] = useState(null);
  const [ttlDays, setTtlDays] = useState(30);
  const [errorMessage, setErrorMessage] = useState('');
  const [downloadedFilename, setDownloadedFilename] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const res = await submitSession(payload);
        if (cancelled) return;
        setRecordId(res?.redcapRecordId || res?.sessionId || payload.sessionId);
        setTtlDays(typeof res?.ttlDays === 'number' ? res.ttlDays : 30);

        if (res?.redcapSubmitted) {
          setState('live_ok');
        } else {
          // Backend persisted the session but didn't push to REDCap.
          // Build and download the import-ready CSV for the clinician.
          const record = buildRedcapRecord(res?.sessionId || payload.sessionId, payload);
          const filename = downloadSinaiCsv(record, payload.clinicCode);
          setDownloadedFilename(filename);
          setState('offline_ok');
        }
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(err?.message || 'Submission failed. Please try again.');
        setState('error');
      }
    };

    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownloadAgain = () => {
    const record = buildRedcapRecord(recordId || payload.sessionId, payload);
    const filename = downloadSinaiCsv(record, payload.clinicCode);
    setDownloadedFilename(filename);
  };

  return (
    <div className="sinai-results-container">
      <div className="sinai-results-card">
        <div className="sinai-gate-header">
          <div className="sinai-gate-icon">
            <FlaskConicalIcon size={28} />
          </div>
          <h2>Thank you for participating</h2>
          <p className="sinai-gate-subtitle">
            Mount Sinai ePSA Study — IRB Protocol STUDY-14-00050
          </p>
        </div>

        {state === 'submitting' && (
          <div className="sinai-results-status sinai-results-status--success">
            <Loader2Icon size={20} className="sinai-results-status-icon sinai-gate-spinner" />
            <div>
              <strong>Submitting your responses…</strong>
              <p>This usually takes just a moment.</p>
            </div>
          </div>
        )}

        {state === 'live_ok' && (
          <>
            <div className="sinai-results-status sinai-results-status--success">
              <CheckCircle2Icon size={22} className="sinai-results-status-icon" />
              <div>
                <strong>Submission complete</strong>
                <p>
                  Your responses have been recorded in the Mount Sinai ePSA research
                  database (REDCap). The temporary processing copy is automatically
                  deleted after {ttlDays} days.
                </p>
                {recordId && (
                  <div className="sinai-results-record-id">
                    Record ID: {recordId}
                  </div>
                )}
              </div>
            </div>
            <div className="sinai-results-instructions">
              <strong>What happens next?</strong>
              <p>
                The study team will analyze your de-identified responses as part of
                IRB study STUDY-14-00050. If you have questions, please contact your
                Mount Sinai study coordinator.
              </p>
            </div>
          </>
        )}

        {state === 'offline_ok' && (
          <>
            <div className="sinai-results-status sinai-results-status--offline">
              <AlertTriangleIcon size={22} className="sinai-results-status-icon" />
              <div>
                <strong>Saved — REDCap upload pending</strong>
                <p>
                  Your responses are securely stored in the study database, identified
                  only by your clinic code. A member of the study team will submit
                  them to REDCap. The temporary processing copy auto-deletes after{' '}
                  {ttlDays} days.
                </p>
                <p style={{ marginTop: 8 }}>
                  A copy of the data has also been downloaded to this device as a
                  CSV file in case the clinician wants to upload it manually.
                </p>
                {downloadedFilename && (
                  <div className="sinai-results-record-id">
                    File: {downloadedFilename}
                  </div>
                )}
                <button
                  type="button"
                  className="sinai-results-download"
                  onClick={handleDownloadAgain}
                >
                  <DownloadIcon size={16} />
                  <span>Download again</span>
                </button>
              </div>
            </div>
            <div className="sinai-results-instructions">
              <strong>For the study team / clinician:</strong>
              <ol>
                <li>
                  In the ePSA admin dashboard, find this session by clinic code and
                  click <em>Submit to REDCap</em> — the data is already there, no
                  manual upload needed once the live flag is enabled.
                </li>
                <li>
                  Alternatively, use the downloaded CSV with REDCap&apos;s Data Import Tool
                  and then mark this session as imported in the admin dashboard.
                </li>
              </ol>
            </div>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="sinai-results-status sinai-results-status--error">
              <AlertCircleIcon size={22} className="sinai-results-status-icon" />
              <div>
                <strong>Something went wrong</strong>
                <p>{errorMessage}</p>
              </div>
            </div>
            <div className="sinai-results-instructions">
              <strong>Your code has not been consumed.</strong>
              <p>
                You can try again, or contact your Mount Sinai study coordinator
                if the problem continues.
              </p>
            </div>
          </>
        )}

        <div className="sinai-results-actions">
          <button type="button" className="sinai-results-action" onClick={onBackToHome}>
            <HomeIcon size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Home
          </button>
          {state === 'error' && (
            <button
              type="button"
              className="sinai-results-action sinai-results-action--primary"
              onClick={onStartOver}
            >
              <RefreshCwIcon size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SinaiResultsScreen;
