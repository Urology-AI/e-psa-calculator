import React from 'react';
import { UserIcon, TestTubeIcon, ScanIcon, ClipboardCheckIcon, PrinterIcon, DownloadIcon, MapPinIcon } from 'lucide-react';

/**
 * Question-framed stage metadata — patients think "what decision comes next,"
 * not "Pre-PSA / PSA-adjusted / MRI pathway." Used by the header eyebrow,
 * the desktop AssessmentSidebar, and anywhere else that needs a consistent
 * per-stage icon/label/question across Part1/2/3Results.jsx and the summary view.
 */
export const ASSESSMENT_STEPS = [
  { key: 'pre', step: 1, icon: UserIcon, label: 'Step 1', question: 'Should I get screened?' },
  { key: 'psa', step: 2, icon: TestTubeIcon, label: 'Step 2', question: 'How should I interpret my PSA?' },
  { key: 'mri', step: 3, icon: ScanIcon, label: 'Step 3', question: 'Should I consider MRI or biopsy?' },
  { key: 'summary', step: 4, icon: ClipboardCheckIcon, label: 'Summary', question: 'My Care Plan' },
];

/**
 * Desktop-only left sidebar (hidden under ~1180px via CSS — see .assessment-sidebar
 * in App.css). Usage: render as a SIBLING immediately before your existing
 * `.results-container` div, and add the `results-container--with-sidebar`
 * class to that div so its CSS margin makes room. Both are no-ops on mobile.
 *
 * @param {string} currentStepKey - one of 'pre' | 'psa' | 'mri' | 'summary'
 * @param {string} riskLabel - e.g. "High Risk" — omit while not yet computed
 * @param {string} riskColor - CSS color for the risk label
 * @param {() => void} [onPrint]
 * @param {() => void} [onDownload]
 * @param {() => void} [onFindUrologist]
 */
export const AssessmentSidebar = ({ currentStepKey, riskLabel, riskColor, onPrint, onDownload, onFindUrologist }) => {
  const currentIdx = ASSESSMENT_STEPS.findIndex((s) => s.key === currentStepKey);
  return (
    <nav className="assessment-sidebar" aria-label="Assessment progress">
      <div className="assessment-sidebar__steps">
        {ASSESSMENT_STEPS.map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          const Icon = s.icon;
          return (
            <div
              key={s.key}
              className={`assessment-sidebar__step${active ? ' assessment-sidebar__step--active' : ''}${done ? ' assessment-sidebar__step--done' : ''}`}
              aria-current={active ? 'step' : undefined}
            >
              <span className="assessment-sidebar__step-marker">
                <Icon size={14} aria-hidden="true" />
              </span>
              <span className="assessment-sidebar__step-text">
                <span className="assessment-sidebar__step-label">{s.label}</span>
                <span className="assessment-sidebar__step-question">{s.question}</span>
              </span>
            </div>
          );
        })}
      </div>

      {riskLabel && (
        <div className="assessment-sidebar__risk">
          <span className="assessment-sidebar__risk-label">Overall Risk</span>
          <span className="assessment-sidebar__risk-value" style={{ color: riskColor }}>{riskLabel}</span>
        </div>
      )}

      <div className="assessment-sidebar__actions">
        {onPrint && (
          <button type="button" className="assessment-sidebar__action" onClick={onPrint}>
            <PrinterIcon size={14} aria-hidden="true" /><span>Print</span>
          </button>
        )}
        {onDownload && (
          <button type="button" className="assessment-sidebar__action" onClick={onDownload}>
            <DownloadIcon size={14} aria-hidden="true" /><span>Download</span>
          </button>
        )}
        {onFindUrologist && (
          <button type="button" className="assessment-sidebar__action" onClick={onFindUrologist}>
            <MapPinIcon size={14} aria-hidden="true" /><span>Find Urologist</span>
          </button>
        )}
      </div>
    </nav>
  );
};
