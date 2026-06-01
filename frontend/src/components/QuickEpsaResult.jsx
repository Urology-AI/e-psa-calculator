import React, { useState } from 'react';
import RiskGauge from './RiskGauge.jsx';
import { ArrowRightIcon, RotateCcwIcon, EditIcon, TrendingUpIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import './QuickEpsaResult.css';

const AUA_FACTORS = new Set(['Age', 'Black ancestry', 'Family history']);

function mapRawToGauge(raw, max, fallback) {
  if (!Number.isFinite(raw) || !Number.isFinite(max) || max <= 0) return fallback ?? 50;
  const c = Math.max(0, Math.min(max, raw));
  if (c <= 10) return Math.round((c / 10) * 33);
  if (c <= 17) return Math.round(34 + ((c - 11) / 6) * 32);
  return Math.round(67 + ((c - 18) / Math.max(1, max - 18)) * 33);
}

const CATEGORIES = [
  { key: 'low',          label: 'Low — Routine Screening',              color: '#16a34a' },
  { key: 'intermediate', label: 'Intermediate — Consider PSA Discussion', color: '#2563eb' },
  { key: 'elevated',     label: 'Strong Candidate for PSA Testing',      color: '#d97706' },
];

export default function QuickEpsaResult({ result, onEditAnswers, onStartOver, onContinue }) {
  const [showAll, setShowAll] = useState(false);

  const {
    epsaTierKey, epsaTierLabel, epsaGuidelineText,
    itemImpacts = [], score, calculationDetails,
  } = result;

  const gaugeScore = mapRawToGauge(
    Number(calculationDetails?.rawScore),
    Number(calculationDetails?.maxScore),
    score,
  );

  const isHigher = epsaTierKey === 'elevated';
  const isLower  = epsaTierKey === 'low';

  const sorted = [...itemImpacts].sort((a, b) => Number(b.points) - Number(a.points));
  const TOP_N = 5;
  const visible = showAll ? sorted : sorted.slice(0, TOP_N);

  const guidelineText = epsaGuidelineText ||
    (isHigher ? 'AUA/SUO 2026 guidelines recommend a PSA test based on your risk profile.'
    : isLower  ? 'Your risk profile is below the AUA/SUO 2026 screening threshold. Continue routine age-based screening.'
    : 'AUA/SUO 2026 guidelines suggest discussing PSA testing with your physician.');

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
      </div>

      {/* ── Guideline recommendation ── */}
      <div className={`qer-guideline-banner qer-guideline-banner--${isHigher ? 'high' : isLower ? 'low' : 'moderate'}`}>
        <div className="qer-guideline-eyebrow">AUA/SUO 2026 Guideline Recommendation</div>
        <p className="qer-guideline-body">{guidelineText}</p>
      </div>

      {/* ── Factors ordered by impact, no points shown ── */}
      {sorted.length > 0 && (
        <div className="qer-section">
          <div className="qer-section-title">
            <TrendingUpIcon size={13} aria-hidden="true" />
            Risk factors — sorted by impact
          </div>
          <div className="qer-factor-list">
            {visible.map((f) => {
              const pts = Number(f.points) || 0;
              const isAua = AUA_FACTORS.has(f.item);
              return (
                <div key={f.item} className={`qer-factor${pts > 0 ? ' qer-factor--elevated' : ''}`}>
                  <div className="qer-factor-left">
                    <span className="qer-factor-name">{f.item}</span>
                    {isAua
                      ? <span className="qer-source-tag qer-source-tag--aua">AUA/SUO 2026</span>
                      : <span className="qer-source-tag qer-source-tag--model">Research-based</span>}
                  </div>
                  {f.value && <span className="qer-factor-val">{f.value}</span>}
                </div>
              );
            })}
          </div>
          {sorted.length > TOP_N && (
            <button type="button" className="qer-show-more" onClick={() => setShowAll(v => !v)}>
              {showAll
                ? <><ChevronUpIcon size={12} /> Show fewer</>
                : <><ChevronDownIcon size={12} /> Show all {sorted.length} factors</>}
            </button>
          )}
        </div>
      )}

      <p className="qer-disclaimer">
        Educational use only · Not a substitute for physician evaluation · AUA/SUO 2026
      </p>

      <div className="qer-actions">
        <button type="button" className="qer-action-btn qer-action-btn--primary" onClick={onContinue}>
          Continue to Full ePSA <ArrowRightIcon size={16} aria-hidden="true" />
        </button>
        <button type="button" className="qer-action-btn qer-action-btn--secondary" onClick={onEditAnswers}>
          <EditIcon size={14} aria-hidden="true" /> Edit Answers
        </button>
        <button type="button" className="qer-action-btn qer-action-btn--ghost" onClick={onStartOver}>
          <RotateCcwIcon size={14} aria-hidden="true" /> Start Over
        </button>
      </div>

    </div>
  );
}
