import React, { useState } from 'react';
import { ArrowLeftIcon, ShieldCheckIcon, AlertCircleIcon, Loader2Icon, BuildingIcon } from 'lucide-react';
import { validateCode } from '../utils/sinaiSubmit';
import './MountSinaiGateScreen.css';

/**
 * MountSinaiGateScreen
 * ─────────────────────────────────────────────────────────────────────────
 * Entry point for the Mount Sinai clinic cohort flow (IRB STUDY-14-00050).
 * Asks the patient for their clinic code, validates it against the backend,
 * and on success calls onValidated({ clinicCode }).
 *
 * The form accepts codes in either "XXXX-XXXX-XXXX" or "XXXXXXXXXXXX" form
 * and is permissive about whitespace and case.
 */
const MountSinaiGateScreen = ({ onValidated, onBack }) => {
  const [rawCode, setRawCode] = useState('');
  const [state, setState] = useState('idle'); // idle | checking | error
  const [errorMessage, setErrorMessage] = useState('');

  const normalizeForDisplay = (input) => {
    const cleaned = (input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const groups = [];
    for (let i = 0; i < cleaned.length && i < 12; i += 4) {
      groups.push(cleaned.slice(i, i + 4));
    }
    return groups.join('-');
  };

  const handleChange = (e) => {
    setRawCode(normalizeForDisplay(e.target.value));
    if (state === 'error') {
      setState('idle');
      setErrorMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalized = rawCode.replace(/-/g, '');
    if (normalized.length !== 12) {
      setState('error');
      setErrorMessage('Clinic codes are 12 characters long. Please check your code and try again.');
      return;
    }

    setState('checking');
    setErrorMessage('');

    try {
      const res = await validateCode(normalized);
      if (res?.valid) {
        onValidated({ clinicCode: normalized });
      } else {
        setState('error');
        if (res?.reason === 'malformed') {
          setErrorMessage('That code does not look right. Please double-check the format (XXXX-XXXX-XXXX).');
        } else {
          setErrorMessage(
            'We could not validate that code. It may be incorrect, already used, or expired. ' +
            'Please contact your Mount Sinai study coordinator if you need help.'
          );
        }
      }
    } catch (err) {
      setState('error');
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('rate')) {
        setErrorMessage('Too many attempts. Please wait a minute and try again.');
      } else {
        setErrorMessage(
          'We had trouble reaching the validation service. Please check your connection and try again.'
        );
      }
    }
  };

  return (
    <div className="sinai-gate-container">
      <div className="sinai-gate-card">
        <button
          type="button"
          className="sinai-gate-back"
          onClick={onBack}
          aria-label="Go back"
        >
          <ArrowLeftIcon size={16} />
          <span>Back</span>
        </button>

        <div className="sinai-gate-header">
          <div className="sinai-gate-icon">
            <BuildingIcon size={28} />
          </div>
          <h2>Mount Sinai Research Study</h2>
          <p className="sinai-gate-subtitle">
            For patients enrolled in the ePSA research study at Mount Sinai.
          </p>
        </div>

        <div className="sinai-gate-info">
          <ShieldCheckIcon size={18} className="sinai-gate-info-icon" />
          <div>
            <strong>Why we ask</strong>
            <p>
              Mount Sinai patients participating in IRB-approved study
              <em> STUDY-14-00050</em> use a clinic-issued code to contribute
              their de-identified responses to the research dataset. Your
              study coordinator will have given you this code.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="sinai-gate-form" noValidate>
          <label htmlFor="clinic-code-input" className="sinai-gate-label">
            Clinic code
          </label>
          <input
            id="clinic-code-input"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck="false"
            maxLength={14} // 12 chars + 2 dashes
            placeholder="XXXX-XXXX-XXXX"
            value={rawCode}
            onChange={handleChange}
            disabled={state === 'checking'}
            className={`sinai-gate-input${state === 'error' ? ' sinai-gate-input--error' : ''}`}
            aria-invalid={state === 'error'}
            aria-describedby={state === 'error' ? 'clinic-code-error' : undefined}
          />

          {state === 'error' && (
            <div className="sinai-gate-error" id="clinic-code-error" role="alert">
              <AlertCircleIcon size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            className="sinai-gate-submit"
            disabled={state === 'checking' || rawCode.replace(/-/g, '').length !== 12}
          >
            {state === 'checking' ? (
              <>
                <Loader2Icon size={16} className="sinai-gate-spinner" />
                <span>Validating…</span>
              </>
            ) : (
              <span>Continue</span>
            )}
          </button>

          <p className="sinai-gate-help">
            Don&apos;t have a clinic code? You can still use ePSA without joining the study —
            <button type="button" className="sinai-gate-link" onClick={onBack}>
              go back to the home screen
            </button>
            .
          </p>
        </form>
      </div>
    </div>
  );
};

export default MountSinaiGateScreen;
