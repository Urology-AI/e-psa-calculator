import React, { useState, useEffect } from 'react';

/* ─── Shared PSA Testing Priority Gauge ───
 * Used by Part 1 results to show how strongly the ePSA model + AUA/NCCN
 * guidelines support discussing PSA testing for this profile.
 * Props:
 *   score      — 0-100 numeric; controls needle position
 *   tierKey    — 'low' | 'intermediate' | 'elevated' (active arc)
 *   tierLabel  — caption shown below the gauge
 *   tiers      — optional [{ key, label, color }] overrides for the three ranges
 */
const DEFAULT_TIERS = [
  { key: 'low',          label: 'Lower Priority',        color: '#16a34a' },
  { key: 'intermediate', label: 'Consider Discussion',   color: '#2563eb' },
  { key: 'elevated',     label: 'Strong Candidate',      color: '#d97706' },
];

const RiskGauge = ({ score, tierKey, tierLabel, tiers = DEFAULT_TIERS }) => {
  const [animScore, setAnimScore] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimScore(score), 60);
    return () => clearTimeout(t);
  }, [score]);

  const cx = 140, cy = 130, r = 100, strokeW = 22;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const arcPath = (startDeg, endDeg) => {
    const x1 = cx + r * Math.cos(toRad(startDeg));
    const y1 = cy - r * Math.sin(toRad(startDeg));
    const x2 = cx + r * Math.cos(toRad(endDeg));
    const y2 = cy - r * Math.sin(toRad(endDeg));
    const large = Math.abs(startDeg - endDeg) > 180 ? 1 : 0;
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 0 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };
  const needleLen = r - strokeW - 2;
  // Needle drawn pointing up (toward negative Y from hub), rotated into position.
  // svgRotate: -90° = left (score 0), 0° = up (score 50), +90° = right (score 100)
  const clampedAnim = Math.min(100, Math.max(0, Number(animScore) || 0));
  const svgRotate = (clampedAnim / 100) * 180 - 90;

  const trackColor = '#e2eaf2';
  const [low, mid, high] = tiers;
  const activeColor =
    tierKey === low.key ? low.color :
    tierKey === high.key ? high.color :
    mid.color;
  const caption = tierLabel || 'Risk';
  return (
    <figure className="risk-gauge-figure" aria-label={`PSA testing priority: ${caption}`}>
      <svg viewBox="0 0 280 145" xmlns="http://www.w3.org/2000/svg" className="risk-gauge-svg" aria-hidden="true">
        <path d={arcPath(182, -2)} fill="none" stroke={trackColor} strokeWidth={strokeW + 6} strokeLinecap="butt" />
        <path d={arcPath(180, 122)} fill="none" stroke={low.color}  strokeWidth={strokeW} strokeLinecap="butt" opacity={tierKey === low.key ? '1' : '0.3'} />
        <path d={arcPath(118, 62)}  fill="none" stroke={mid.color}  strokeWidth={strokeW} strokeLinecap="butt" opacity={tierKey === mid.key ? '1' : '0.3'} />
        <path d={arcPath(58, 0)}    fill="none" stroke={high.color} strokeWidth={strokeW} strokeLinecap="butt" opacity={tierKey === high.key ? '1' : '0.3'} />
        {/* Needle drawn vertically upward, rotated to the scored position */}
        <g
          transform={`rotate(${svgRotate}, ${cx}, ${cy})`}
          style={{ transition: 'transform 1.1s cubic-bezier(0.34, 1.3, 0.64, 1)' }}
        >
          <line x1={cx} y1={cy + 2} x2={cx} y2={cy - needleLen + 2} stroke="rgba(0,0,0,0.10)" strokeWidth="4" strokeLinecap="round" />
          <line x1={cx} y1={cy} x2={cx} y2={cy - needleLen} stroke="#1e3a5f" strokeWidth="3" strokeLinecap="round" />
        </g>
        <circle cx={cx} cy={cy} r="8" fill="#1e3a5f" />
        <circle cx={cx} cy={cy} r="4.5" fill="#fff" />
      </svg>
      <div className="risk-gauge-labels">
        {tiers.map((t) => (
          <span key={t.key}
            className={`risk-gauge-range-pill ${tierKey === t.key ? 'risk-gauge-range-pill--active' : ''}`}
            style={{ color: t.color }}>
            {t.label}
          </span>
        ))}
      </div>
      <figcaption className="risk-gauge-caption" style={{ color: activeColor }}>{caption}</figcaption>
    </figure>
  );
};

export default RiskGauge;
