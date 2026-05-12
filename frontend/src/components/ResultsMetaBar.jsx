import React, { useMemo } from 'react';
import './ResultsMetaBar.css';

// Persistent meta strip at the top of every results screen.
// Carries: result ID + timestamp (for clinician citation/audit-trail) +
// a top-line "educational use only / not a medical device" disclaimer that
// reviewers expect to see above-the-fold rather than hidden in a collapsible.
const ResultsMetaBar = ({ sessionId = null, computedAt = null, part = 'Part 1' }) => {
  const ts = useMemo(() => {
    const d = computedAt ? new Date(computedAt) : new Date();
    return Number.isFinite(d.getTime()) ? d : new Date();
  }, [computedAt]);

  const resultId = useMemo(() => {
    const base = sessionId || 'local';
    const stamp = ts.toISOString().replace(/[-:T]/g, '').slice(0, 14);
    return `ePSA-${base.slice(0, 6).toUpperCase()}-${stamp}`;
  }, [sessionId, ts]);

  const tsDisplay = ts.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  return (
    <div className="results-meta-bar" role="region" aria-label="Result information and educational-use notice">
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
      </div>
      <p className="results-meta-bar__notice" role="note">
        <span className="results-meta-bar__notice-icon" aria-hidden="true">ⓘ</span>
        <strong>Educational use only — not a medical device or diagnosis.</strong>
        {' '}
        This result is a screening-conversation aid based on AUA/SUO 2026, NCCN 2024, and EAU 2024 guidance.
        Discuss every result with a clinician before any health decision.
      </p>
    </div>
  );
};

export default ResultsMetaBar;
