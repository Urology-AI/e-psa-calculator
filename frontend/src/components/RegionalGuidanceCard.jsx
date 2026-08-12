import React, { useState } from 'react';
import {
  ExternalLinkIcon, ChevronDownIcon,
  CalendarClockIcon, UserPlusIcon, RepeatIcon, ShieldAlertIcon, InfoIcon,
} from 'lucide-react';
import { listRegions, POSTURE } from '../utils/screeningGuidelines';
import { flagFromCountryCode } from '../utils/geoCountry';
import './RegionalGuidanceCard.css';

/* Posture → badge color. Proactive postures read green, restrictive read amber. */
const POSTURE_COLOR = {
  [POSTURE.ORGANISED.id]:      '#1B7A4A',
  [POSTURE.RECOMMENDED.id]:    '#1B7A4A',
  [POSTURE.SHARED.id]:         '#0288d1',
  [POSTURE.TARGETED.id]:       '#b26a00',
  [POSTURE.OPPORTUNISTIC.id]:  '#5b6b7a',
};

/* How we worked out where the user is — shown plainly so they can judge it. */
const SOURCE_LABEL = {
  ip:       'Detected from your approximate location',
  cache:    'Detected from your approximate location',
  locale:   'Based on your browser language settings',
  override: 'You chose this region',
  unknown:  'We could not detect your region',
  pending:  'Detecting your region…',
};

const KEY_FACTS = [
  { key: 'startAge',    label: 'First PSA conversation', icon: CalendarClockIcon },
  { key: 'highRiskAge', label: 'If higher risk',         icon: UserPlusIcon },
  { key: 'interval',    label: 'How often',              icon: RepeatIcon },
  { key: 'stopAge',     label: 'When to stop',           icon: ShieldAlertIcon },
];

/**
 * RegionalGuidanceCard
 *
 * Shows prostate cancer early-detection (pre-screen) guidance for the user's
 * country or region, auto-selected from their approximate location and
 * overridable from a picker.
 *
 * Props come straight from useRegionalGuidance().
 */
const RegionalGuidanceCard = ({
  region,
  country,
  source = 'pending',
  loading = false,
  onSelectRegion,
  onClearSelection,
  accent = '#1a3a52',
}) => {
  const [showDetail, setShowDetail] = useState(false);

  if (!region) return null;

  const postureColor = POSTURE_COLOR[region.posture?.id] || accent;
  const regions = listRegions();
  const detectedByIp = source === 'ip' || source === 'cache';

  // Prefer the actual detected country's flag (🇳🇬 for a Nigerian visitor rather
  // than the generic 🌍 on the Sub-Saharan Africa card). Fall back to the
  // region's own emoji, and to a globe for the international entry.
  const detectedFlag = source === 'override' ? null : flagFromCountryCode(country);
  const flag = detectedFlag || region.emoji || '🌐';

  return (
    <section
      className="rg-card"
      style={{ '--rg-accent': accent, borderLeft: `3px solid ${postureColor}` }}
      aria-label={`Prostate cancer screening guidance for ${region.name}`}
    >
      {/* ── Header: where we think you are, and how to change it ── */}
      <header className="rg-head">
        <div className="rg-head-where">
          <span className="rg-head-flag" aria-hidden="true">
            {loading ? '🌐' : flag}
          </span>
          <div>
            <div className="rg-head-region">
              {loading ? 'Finding your region…' : region.name}
            </div>
            <div className="rg-head-source">
              {SOURCE_LABEL[source] || SOURCE_LABEL.unknown}
              {detectedByIp && country ? ` (${country})` : ''}
            </div>
          </div>
        </div>

        <div className="rg-head-picker">
          <label className="rg-picker-label" htmlFor="rg-region-select">
            Not right? Choose your region
          </label>
          <select
            id="rg-region-select"
            className="rg-select"
            value={region.id}
            onChange={(e) => onSelectRegion?.(e.target.value)}
          >
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.emoji ? `${r.emoji}  ${r.name}` : r.name}
              </option>
            ))}
          </select>
          {source === 'override' && onClearSelection && (
            <button type="button" className="rg-reset" onClick={onClearSelection}>
              Use my detected region
            </button>
          )}
        </div>
      </header>

      {/* ── Posture badge + issuing body ── */}
      <div className="rg-meta-row">
        <span className="rg-posture" style={{ background: postureColor }}>
          {region.posture?.label}
        </span>
        <span className="rg-body-line">{region.body} · {region.year}</span>
      </div>

      {region.posture?.blurb && (
        <p className="rg-posture-blurb">{region.posture.blurb}</p>
      )}

      {/* ── Key facts ── */}
      <dl className="rg-facts">
        {KEY_FACTS.map(({ key, label, icon: Icon }) => (
          region[key] ? (
            <div className="rg-fact" key={key}>
              <dt>
                <Icon size={12} aria-hidden="true" />
                <span>{label}</span>
              </dt>
              <dd>{region[key]}</dd>
            </div>
          ) : null
        ))}
      </dl>

      <p className="rg-summary">{region.summary}</p>

      {/* ── Expandable detail: high-risk groups, local notes, sources ── */}
      <button
        type="button"
        className="rg-detail-toggle"
        onClick={() => setShowDetail((v) => !v)}
        aria-expanded={showDetail}
        style={{ color: accent }}
      >
        <ChevronDownIcon
          size={13}
          aria-hidden="true"
          className={showDetail ? 'rg-chev rg-chev--open' : 'rg-chev'}
        />
        {showDetail ? 'Hide local detail' : 'Higher-risk groups, local notes & sources'}
      </button>

      {showDetail && (
        <div className="rg-detail">
          {region.highRisk?.length > 0 && (
            <div className="rg-detail-block">
              <h4 className="rg-detail-title">Who is considered higher risk here</h4>
              <ul className="rg-list">
                {region.highRisk.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          )}

          {region.notes?.length > 0 && (
            <div className="rg-detail-block">
              <h4 className="rg-detail-title">Worth knowing locally</h4>
              <ul className="rg-list rg-list--notes">
                {region.notes.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          )}

          {region.sources?.length > 0 && (
            <div className="rg-detail-block">
              <h4 className="rg-detail-title">Sources</h4>
              <ul className="rg-sources">
                {region.sources.map((s, i) => (
                  <li key={i}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLinkIcon size={11} aria-hidden="true" />
                      <span>{s.text}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="rg-privacy" role="note">
        <InfoIcon size={11} aria-hidden="true" />
        <span>
          We use your approximate location only to pick which country&apos;s guidance to
          show. No location data, and nothing you enter into ePSA, is stored or shared.
        </span>
      </p>
    </section>
  );
};

export default RegionalGuidanceCard;
