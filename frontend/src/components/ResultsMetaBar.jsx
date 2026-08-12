import React, { useState } from 'react';
import { ClinicalDetail } from './shared/ResultsShared.jsx';
import { useRegionalGuidance } from '../hooks/useRegionalGuidance';
import { DEFAULT_REGION_ID } from '../utils/screeningGuidelines';
import './ResultsMetaBar.css';

const ResultsMetaBar = ({ sessionId = null, computedAt = null, part = 'Part 1' }) => {
  const [open, setOpen] = useState(false);
  const { region, loading: regionLoading } = useRegionalGuidance();

  // Only name a country once we actually have one — otherwise the result is
  // based on the international guidelines alone, and should say so.
  const hasLocalRegion = !regionLoading && region && region.id !== DEFAULT_REGION_ID;
  const guidanceBasis = hasLocalRegion
    ? `International guidelines + ${region.name}`
    : 'International guidelines';

  const ts = (() => {
    const d = computedAt ? new Date(computedAt) : new Date();
    return Number.isFinite(d.getTime()) ? d : new Date();
  })();

  const resultId = (() => {
    const base = sessionId || 'local';
    const stamp = ts.toISOString().replace(/[-:T]/g, '').slice(0, 14);
    return `ePSA-${base.slice(0, 6).toUpperCase()}-${stamp}`;
  })();

  const tsDisplay = ts.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  return (
    <div className={`results-meta-bar${open ? ' results-meta-bar--open' : ''}`} role="region" aria-label="Result information and educational-use notice">
      <button
        type="button"
        className="results-meta-bar__toggle"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span className="results-meta-bar__toggle-icon" aria-hidden="true">ⓘ</span>
        <span className="results-meta-bar__toggle-label">Educational use only — not a medical device</span>
        <span className="results-meta-bar__toggle-caret" aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>

      {/* Always visible: which guidelines this result was measured against. */}
      <p className="results-meta-bar__basis">
        <span className="results-meta-bar__basis-label">Guidance basis</span>
        <span className="results-meta-bar__basis-value">
          {hasLocalRegion && region.emoji && (
            <span aria-hidden="true" style={{ marginRight: '0.25rem' }}>{region.emoji}</span>
          )}
          {guidanceBasis}
        </span>
      </p>

      {open && (
        <div className="results-meta-bar__body">
          <div className="results-meta-bar__top">
            <div className="results-meta-bar__chip">
              <span className="results-meta-bar__chip-label">Result ID</span>
              <code className="results-meta-bar__chip-value">{resultId}</code>
            </div>
            <div className="results-meta-bar__chip">
              <span className="results-meta-bar__chip-label">Computed</span>
              <span className="results-meta-bar__chip-value">{tsDisplay}</span>
            </div>
            <div className="results-meta-bar__chip results-meta-bar__chip--muted">
              <span className="results-meta-bar__chip-label">Pathway</span>
              <span className="results-meta-bar__chip-value">{part}</span>
            </div>
            <div className="results-meta-bar__chip results-meta-bar__chip--muted">
              <span className="results-meta-bar__chip-label">Region</span>
              <span className="results-meta-bar__chip-value">
                {hasLocalRegion ? region.name : 'Not detected'}
              </span>
            </div>
          </div>

          {hasLocalRegion && (
            <p className="results-meta-bar__notice" role="note">
              Your result is scored against the international guidelines (AUA/SUO, NCCN, EAU).
              Screening practice in <strong>{region.name}</strong> is set by {region.body} ({region.year}),
              which may start testing at a different age or interval — so what your own clinician
              offers can differ from what you see here.
            </p>
          )}
          <p className="results-meta-bar__notice" role="note">
            <strong>Educational use only — not a medical device or diagnosis.</strong>
            {' '}
            This result is meant to help guide a conversation with your doctor, not replace one.
          </p>
          <ClinicalDetail label="Show clinical detail" hideLabel="Hide clinical detail">
            <p className="results-meta-bar__notice" role="note" style={{ margin: 0 }}>
              This result is a clinical decision-support aid based on AUA/SUO 2026, NCCN 2024, and EAU 2024 guidance.
              It does not replace clinical judgment — confirm against guideline criteria and patient-specific factors before acting.
              {' '}
              <em>Models are internally validated on the Mount Sinai ePSA cohort only — no external cohort has been used yet.</em>
            </p>
          </ClinicalDetail>
        </div>
      )}
    </div>
  );
};

export default ResultsMetaBar;
