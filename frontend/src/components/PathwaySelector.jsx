import React from 'react';
import './PathwaySelector.css';

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pathway-card-icon-svg" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const ActivityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pathway-card-icon-svg" aria-hidden="true">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const LayersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pathway-card-icon-svg" aria-hidden="true">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const BiopsyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pathway-card-icon-svg" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="12" y2="17" />
  </svg>
);

const PATHWAYS = [
  {
    mode: 'pre_psa',
    Icon: ShieldIcon,
    headline: 'Should I get a PSA test?',
    body: "You haven't had a PSA test yet. Find out whether your risk profile suggests you should.",
    button: 'Start Assessment',
    accentClass: 'pathway-card--pre',
  },
  {
    mode: 'post_psa',
    Icon: ActivityIcon,
    headline: 'I have a PSA result',
    body: 'You already have a PSA number. Find out what it means in the context of your full risk profile.',
    button: 'Enter My PSA',
    accentClass: 'pathway-card--post',
  },
  {
    mode: 'post_mri',
    Icon: LayersIcon,
    headline: 'I had a PSA and an MRI',
    body: 'You have both a PSA result and an MRI report (PI-RADS score). Get guidance on next steps.',
    button: 'Enter My Results',
    accentClass: 'pathway-card--mri',
  },
  {
    mode: 'post_biopsy',
    Icon: BiopsyIcon,
    headline: "I've had a biopsy",
    body: 'You have biopsy results in hand. The Active Surveillance decision tool will help determine whether monitoring or treatment is appropriate. Opens in a new tab.',
    button: 'Open Active Surveillance Tool ↗',
    accentClass: 'pathway-card--biopsy',
    isExternal: true,
  },
];

const PathwaySelector = ({ onSelect }) => (
  <section className="pathway-selector" aria-labelledby="pathway-selector-heading">
    <div className="pathway-selector-header">
      <h2 id="pathway-selector-heading" className="pathway-selector-title">
        Where are you in your prostate health journey?
      </h2>
      <p className="pathway-selector-sub">
        Select the option that best describes your situation. Each pathway gives you a result tailored to where you are right now.
      </p>
    </div>
    <div className="pathway-cards" role="list">
      {PATHWAYS.map(({ mode, Icon, headline, body, button, accentClass, isExternal }) => (
        <div
          key={mode}
          className={`pathway-card ${accentClass}`}
          role="listitem"
          onClick={() => onSelect(mode)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(mode); } }}
          tabIndex={0}
          style={{ cursor: 'pointer' }}
        >
          <div className="pathway-card-icon-wrap" aria-hidden="true">
            <Icon />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h3 className="pathway-card-headline" style={{ margin: 0 }}>{headline}</h3>
            {isExternal && (
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '999px', background: 'rgba(0,0,0,0.08)', color: 'inherit', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                EXTERNAL TOOL
              </span>
            )}
          </div>
          <p className="pathway-card-body">{body}</p>
          {isExternal && (
            <div style={{ fontSize: '11px', color: 'inherit', opacity: 0.75, marginBottom: '8px', lineHeight: 1.5 }}>
              Per AUA/SUO 2026 (Statements 19–32): after a negative biopsy, screening should not be discontinued; continue at 2–4 year intervals and consider repeat biopsy based on risk reassessment.
            </div>
          )}
          <button
            type="button"
            className="pathway-card-btn"
            onClick={(e) => { e.stopPropagation(); onSelect(mode); }}
            aria-label={`${button} — ${headline}`}
            tabIndex={-1}
            aria-hidden="true"
          >
            {button}
          </button>
        </div>
      ))}
    </div>
  </section>
);

export default PathwaySelector;
