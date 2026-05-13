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
  submitLive,
  claimOffline,
  buildRedcapRecord,
  downloadSinaiCsv,
} from '../utils/sinaiSubmit';
import './MountSinaiGateScreen.css';

/**
 * SinaiResultsScreen
 * ─────────────────────────────────────────────────────────────────────────
 * Terminal screen after the patient completes the form.
 *
 * Behavior:
 *   - If redcapEnabled: calls submitSinaiCohort (live path). On success,
 *     shows a confirmation + record ID. On failure, shows the error.
 *   - If !redcapEnabled: calls claimCodeOffline to consume the code, then
 *     builds the REDCap-import-ready CSV and triggers a browser download.
 *     The clinical data never leaves the device.
 *
 * Props:
 *   payload       — { clinicCode, sessionId, step1, result, step2?, ... }
 *   redcapEnabled — boolean (from appConfig/sinai)
 *   onStartOver   — () => void
 *   onBackToHome  — () => void
 */
const SinaiResultsScreen = ({
  payload,
  redcapEnabled,
  onStartOver,
  onBackToHome,
}) => {
  // States: submitting | live_ok | offline_ok | error
  const [state, setState] = useState('submitting');
  const [recordId, setRecordId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [downloadedFilename, setDownloadedFilename] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const doLive = async () => {
      try {
        const res = await submitLive(payload);
        if (cancelled) return;
        setRecordId(res?.redcapRecordId || payload.sessionId);
        setState('live_ok');
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(err?.message || 'Submission failed. Please try again.');
        setState('error');
      }
    };

    const doOffline = async () => {
      try {
        await claimOffline(payload.clinicCode, payload.sessionId);
        if (cancelled) return;
        const record = buildRedcapRecord(payload.sessionId, payload);
        const filename = downloadSinaiCsv(record, payload.clinicCode);
        setDownloadedFilename(filename);
        setRecordId(payload.sessionId);
        setState('offline_ok');
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(err?.message || 'Could not complete offline submission. Please try again.');
        setState('error');
      }
    };

    if (redcapEnabled) doLive();
    else doOffline();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownloadAgain = () => {
    const record = buildRedcapRecord(payload.sessionId, payload);
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
              <strong>
                {redcapEnabled ? 'Submitting to Mount Sinai REDCap…' : 'Preparing your data…'}
              </strong>
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
                  database. No clinical data is stored by this app.
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
                <strong>Offline submission — file downloaded</strong>
                <p>
                  The live REDCap connection is not active right now, so your
                  responses were saved to a file on this device. Your clinic code
                  has been recorded as used. <strong>No clinical content was sent
                  to our servers.</strong>
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
                <li>Keep the downloaded CSV file (or transfer it to a Mount Sinai workstation).</li>
                <li>Open REDCap → ePSA project → Data Import Tool.</li>
                <li>Upload this CSV — the column headers map directly to REDCap fields.</li>
                <li>
                  After import, open the ePSA admin dashboard, find this session by clinic
                  code, and mark it as imported with the REDCap record ID.
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
