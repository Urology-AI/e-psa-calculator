import React from 'react';
import { RISK_COLORS } from '../utils/riskColors';
import RiskGauge from './RiskGauge.jsx';
import { ArrowRightIcon, RotateCcwIcon, EditIcon, TrendingUpIcon } from 'lucide-react';
import './QuickEpsaResult.css';

function mapRawToGauge(raw, max, fallback) {
  if (!Number.isFinite(raw) || !Number.isFinite(max) || max <= 0) return fallback ?? 50;
  const c = Math.max(0, Math.min(max, raw));
  if (c <= 10) return Math.round((c / 10) * 33);
  if (c <= 17) return Math.round(34 + ((c - 11) / 6) * 32);
  return Math.round(67 + ((c - 18) / Math.max(1, max - 18)) * 33);
}

const CATEGORIES = [
  { key: 'low',          label: 'Lower Priority',      color: '#16a34a' },
  { key: 'intermediate', label: 'Consider Discussion', color: '#2563eb' },
  { key: 'elevated',     label: 'Strong Candidate',    color: '#d97706' },
];

function factorColor(points) {
  if (points >= 10) return '#c0392b';
  if (points >= 5)  return '#d97706';
  if (points > 0)   return '#c97b00';
  return '#6e6e77';
}

export default function QuickEpsaResult({ result, onEditAnswers, onStartOver, onContinue }) {
  const {
    epsaTierKey, epsaTierLabel, epsaGuidelineText,
    recommendPSA, itemImpacts = [],
    score, calculationDetails,
  } = result;

  const gaugeScore = mapRawToGauge(
    Number(calculationDetails?.rawScore),
    Number(calculationDetails?.maxScore),
    score,
  );

  const isHigher = epsaTierKey === 'elevated';
  const isLower  = epsaTierKey === 'low';

  const topFactors = [...itemImpacts]
    .filter((f) => f.points > 0)
    .sort((a, b) => Number(b.points) - Number(a.points))
    .slice(0, 5);

  return (
    <div className="qer-root">

      {/* ── Gauge + categories ── */}
      <div className="qer-gauge-section">
        <RiskGauge score={gaugeScore} tierKey={epsaTierKey} tierLabel={epsaTierLabel} />
        <div className="qer-categories">
          {CATEGORIES.map(({ key, label, color }) => (
            <div key={key}
              className={`qer-cat${epsaTierKey === key ? ' qer-cat--active' : ''}`}
              style={epsaTierKey === key ? { borderColor: color, color } : {}}
            >
              <span className="qer-cat-dot" style={{ background: color }} />
              {label}
            </div>
          ))}
        </div>
        {epsaGuidelineText && <p className="qer-guideline-text">{epsaGuidelineText}</p>}
      </div>

      {/* ── PSA recommendation — short ── */}
      <div className={`qer-psa-banner qer-psa-banner--${isHigher ? 'high' : isLower ? 'low' : 'moderate'}`}>
        <span className="qer-psa-label">PSA Recommendation</span>
        <span className="qer-psa-value">
          {isHigher ? 'PSA test recommended' : isLower ? 'Routine screening' : 'Discuss with physician'}
        </span>
      </div>

      {/* ── Key risk factors ── */}
      {topFactors.length > 0 && (
        <div className="qer-section">
          <div className="qer-section-title">
            <TrendingUpIcon size={13} aria-hidden="true" />
            Key risk factors
          </div>
          <div className="qer-factors">
            {topFactors.map((f) => {
              const color = factorColor(Number(f.points));
              return (
                <div key={f.item} className="qer-factor" style={{ borderLeftColor: color }}>
                  <span className="qer-factor-dot" style={{ background: color }} />
                  <span className="qer-factor-name">{f.item}</span>
                  {f.value && <span className="qer-factor-val">{f.value}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Disclaimer ── */}
      <p className="qer-disclaimer">
        Educational use only · Not a substitute for physician evaluation · AUA/SUO 2026
      </p>

      {/* ── Actions ── */}
      <div className="qer-actions">
        <button type="button" className="qer-action-btn qer-action-btn--primary" onClick={onContinue}>
          Continue to Full ePSA
          <ArrowRightIcon size={16} aria-hidden="true" />
        </button>
        <button type="button" className="qer-action-btn qer-action-btn--secondary" onClick={onEditAnswers}>
          <EditIcon size={14} aria-hidden="true" />
          Edit Answers
        </button>
        <button type="button" className="qer-action-btn qer-action-btn--ghost" onClick={onStartOver}>
          <RotateCcwIcon size={14} aria-hidden="true" />
          Start Over
        </button>
      </div>

    </div>
  );
}
