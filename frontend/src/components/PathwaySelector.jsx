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
      {PATHWAYS.map(({ mode, Icon, headline, body, button, accentClass }) => (
        <div key={mode} className={`pathway-card ${accentClass}`} role="listitem">
          <div className="pathway-card-icon-wrap" aria-hidden="true">
            <Icon />
          </div>
          <h3 className="pathway-card-headline">{headline}</h3>
          <p className="pathway-card-body">{body}</p>
          <button
            type="button"
            className="pathway-card-btn"
            onClick={() => onSelect(mode)}
            aria-label={`${button} — ${headline}`}
          >
            {button}
          </button>
        </div>
      ))}
    </div>
  </section>
);

export default PathwaySelector;
