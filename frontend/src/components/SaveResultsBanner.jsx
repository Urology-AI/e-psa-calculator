import React, { useState } from 'react';
import { CheckIcon, CopyIcon, CloudIcon, KeyRoundIcon, RefreshCwIcon, Trash2Icon } from 'lucide-react';
import './SaveResultsBanner.css';

/**
 * Sits at the top of the results screens instead of interrupting with a modal.
 *
 * Two states, both non-blocking:
 *  - not saved yet — offers the save, and shows the session key it would save under
 *  - saved         — confirms that further answers update that same session
 *
 * The second state exists because re-entering results (adding a PSA, then an
 * MRI) looks like it might be creating a new record each time. It doesn't: the
 * key is stable for the run, and only Start Over mints a new one.
 */
const SaveResultsBanner = ({ sessionKey, saved, pending, error, onSave, onClearSession }) => {
  const [copied, setCopied] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);

  const handleCopy = async () => {
    if (!sessionKey) return;
    try {
      await navigator.clipboard.writeText(sessionKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the key is shown in full either way.
    }
  };

  const keyChip = sessionKey ? (
    <button
      type="button"
      className="save-results-banner__key"
      onClick={handleCopy}
      title="Copy your session key"
    >
      <KeyRoundIcon size={13} aria-hidden="true" />
      <span className="save-results-banner__key-value">{sessionKey}</span>
      {copied ? <CheckIcon size={12} aria-hidden="true" /> : <CopyIcon size={12} aria-hidden="true" />}
    </button>
  ) : null;

  const clearControl = onClearSession ? (
    confirmingClear ? (
      <span className="save-results-banner__confirm">
        <span className="save-results-banner__confirm-text">
          Clear this session? {saved
            ? 'Your saved copy stays reachable with the key above, but this device starts a new session.'
            : 'These answers and results are deleted from this browser.'}
        </span>
        <button type="button" className="save-results-banner__btn save-results-banner__btn--danger" onClick={onClearSession}>
          Yes, clear it
        </button>
        <button type="button" className="save-results-banner__link" onClick={() => setConfirmingClear(false)}>
          Keep it
        </button>
      </span>
    ) : (
      <button
        type="button"
        className="save-results-banner__link"
        onClick={() => setConfirmingClear(true)}
        title="Clear this session from this device and start a new one"
      >
        <Trash2Icon size={12} aria-hidden="true" />
        Clear session
      </button>
    )
  ) : null;

  if (saved) {
    return (
      <div className="save-results-banner save-results-banner--saved" role="status">
        <CheckIcon size={16} aria-hidden="true" className="save-results-banner__icon" />
        <div className="save-results-banner__text">
          <strong>Saved.</strong> Anything you add next — a PSA result, an MRI score — updates this
          same session. Starting over is what creates a new one.
        </div>
        {keyChip}
        {clearControl}
      </div>
    );
  }

  return (
    <div className="save-results-banner" role="region" aria-label="Save your results">
      <CloudIcon size={16} aria-hidden="true" className="save-results-banner__icon" />
      <div className="save-results-banner__text">
        <strong>Your results aren't saved yet.</strong>{' '}
        {error
          ? error
          : 'They stay in this browser for now — save them to reopen this assessment on any device.'}
      </div>
      {keyChip}
      <button
        type="button"
        className="save-results-banner__btn"
        onClick={onSave}
        disabled={pending}
      >
        {pending ? <RefreshCwIcon size={13} aria-hidden="true" className="save-results-banner__spin" /> : null}
        {pending ? 'Saving…' : 'Save my results'}
      </button>
      {clearControl}
    </div>
  );
};

export default SaveResultsBanner;
