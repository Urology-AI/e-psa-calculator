import React, { useState } from 'react';
import {
  Users, FlaskConical, CalendarDays, AlertTriangle,
  RotateCcw, ScanEye, Microscope, CheckCircle2,
  Clock, Ban, Stethoscope, ArrowRight,
  ChevronDown, ChevronUp, BookOpen,
} from 'lucide-react';
import './GuidelineJourney.css';

/*
 * GuidelineJourney
 *
 * Renders a horizontal step-by-step clinical pathway diagram.
 * Each step has a Lucide icon, a label, and optional sub-label.
 * The active step (patient's current position) is highlighted.
 *
 * Props:
 *   steps           — array of { id, icon, label, sublabel, variant? }
 *   activeId        — id of the step the patient is currently on
 *   completedIds    — ids of steps already completed
 *   caption         — short description of what this diagram shows
 *   source          — optional source citation string
 *   expandableDetail — optional JSX rendered inside a "View guideline detail" toggle
 */
const GuidelineJourney = ({ steps = [], activeId, completedIds = [], caption, source, expandableDetail }) => {
  const [detailOpen, setDetailOpen] = useState(false);
  return (
    <div className="gj-root" role="figure" aria-label="Clinical pathway journey">
      {caption && <p className="gj-caption">{caption}</p>}

      <div className="gj-track">
        {steps.map((step, i) => {
          const isActive    = step.id === activeId;
          const isCompleted = completedIds.includes(step.id);
          const isUpcoming  = !isActive && !isCompleted;

          const cls = [
            'gj-step',
            isActive    ? 'gj-step--active'    : '',
            isCompleted ? 'gj-step--completed' : '',
            isUpcoming  ? 'gj-step--upcoming'  : '',
            step.variant ? `gj-step--${step.variant}` : '',
          ].filter(Boolean).join(' ');

          return (
            <React.Fragment key={step.id}>
              <div className={cls}>
                <div className="gj-step__icon-wrap" aria-hidden="true">
                  {isCompleted
                    ? <CheckCircle2 size={18} strokeWidth={2} />
                    : React.cloneElement(step.icon, { size: 18, strokeWidth: 2 })}
                </div>
                <div className="gj-step__text">
                  <span className="gj-step__label">{step.label}</span>
                  {step.sublabel && (
                    <span className="gj-step__sublabel">{step.sublabel}</span>
                  )}
                </div>
                {isActive && <span className="gj-step__you-badge">You are here</span>}
              </div>
              {i < steps.length - 1 && (
                <div className={`gj-connector${isCompleted ? ' gj-connector--completed' : ''}`} aria-hidden="true">
                  <ArrowRight size={12} strokeWidth={2.5} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {expandableDetail && (
        <div className="gj-detail-toggle-wrap">
          <button
            className="gj-detail-toggle"
            onClick={() => setDetailOpen(o => !o)}
            aria-expanded={detailOpen}
          >
            <BookOpen size={13} strokeWidth={2} aria-hidden="true" />
            {detailOpen ? 'Hide guideline detail' : 'View AUA/SUO guideline statements'}
            {detailOpen
              ? <ChevronUp  size={13} strokeWidth={2.5} aria-hidden="true" />
              : <ChevronDown size={13} strokeWidth={2.5} aria-hidden="true" />}
          </button>
          {detailOpen && (
            <div className="gj-detail-panel">
              {expandableDetail}
            </div>
          )}
        </div>
      )}

      {source && <p className="gj-source">{source}</p>}
    </div>
  );
};

export default GuidelineJourney;

/* ─── Part 1 Journey ───────────────────────────────────────────────────────────
 * Shows AUA/SUO 2026 initial screening pathway.
 * Patient is at the "Get PSA Test" step (Part 1 = no PSA result yet for most).
 * If a result is available, highlight the outcome step.
 *
 * Props:
 *   age          — numeric patient age
 *   isHighRisk   — boolean
 *   priority     — 'routine' | 'priority' | 'urgent' | null
 * ─────────────────────────────────────────────────────────────────────────── */
export const Part1GuidelineJourney = ({ age, isHighRisk = false, priority, expandableDetail }) => {
  const ageNum = Number(age) || 0;
  const under40Avg = ageNum < 40 && !isHighRisk;
  const under40HR  = ageNum < 40 && isHighRisk;
  const is4044HR   = ageNum >= 40 && ageNum < 45 && isHighRisk;
  const is4549     = ageNum >= 45 && ageNum < 50;
  const is5069     = ageNum >= 50 && ageNum <= 69;
  const is70plus   = ageNum >= 70;

  const STEPS = [
    {
      id: 'sdm',
      icon: <Users />,
      label: 'Shared Decision-Making',
      sublabel: 'Discuss risks & values with clinician',
    },
    {
      id: 'age_risk',
      icon: <CalendarDays />,
      label: 'Age & Risk Assessment',
      sublabel: isHighRisk
        ? 'High-risk profile identified'
        : `Age ${ageNum} — average risk`,
    },
    {
      id: 'psa_test',
      icon: <FlaskConical />,
      label: 'PSA Screening',
      sublabel: under40Avg
        ? 'Not recommended before age 40 (avg risk)'
        : under40HR || is4044HR
        ? 'Discuss from age 40 (high risk)'
        : is4549
        ? 'Baseline PSA offered (age 45–49)'
        : is5069
        ? 'Every 2–4 years (age 50–69) · Grade A'
        : 'Shared decision required (age 70+)',
      variant: under40Avg ? 'skip' : undefined,
    },
    {
      id: 'result',
      icon: priority === 'routine'
        ? <CheckCircle2 />
        : priority === 'urgent'
        ? <AlertTriangle />
        : <Stethoscope />,
      label: 'Review & Next Steps',
      sublabel: priority === 'routine'
        ? 'Routine monitoring'
        : priority === 'urgent' || priority === 'priority'
        ? 'Clinician review recommended'
        : 'Awaiting PSA result',
      variant: priority === 'urgent' ? 'urgent' : priority === 'priority' ? 'priority' : undefined,
    },
  ];

  let activeId;
  if (under40Avg) {
    activeId = 'age_risk';
  } else if (priority) {
    activeId = 'result';
  } else {
    activeId = 'psa_test';
  }

  const completedIds = [];
  const stepOrder = STEPS.map(s => s.id);
  const activeIdx = stepOrder.indexOf(activeId);
  for (let i = 0; i < activeIdx; i++) completedIds.push(stepOrder[i]);

  return (
    <GuidelineJourney
      steps={STEPS}
      activeId={activeId}
      completedIds={completedIds}
      caption="AUA/SUO 2026 — PSA Early Detection Pathway"
      source="Lin et al., J Urol 215:491–501, May 2026 · AUA/SUO Early Detection of Prostate Cancer Guideline (2026)"
      expandableDetail={expandableDetail}
    />
  );
};

/* ─── Part 2 Journey ───────────────────────────────────────────────────────────
 * Shows AUA/SUO 2026 elevated PSA workup pathway (Figure 2: Elevated Risk Evaluation).
 * Patient has an elevated PSA; shows progress through the evaluation steps.
 *
 * Props:
 *   psaValue           — numeric PSA (ng/mL)
 *   piradsVal          — null | 1–5
 *   biopsyRecommended  — boolean
 *   pathwayMode        — 'post_psa' | 'post_mri'
 *   epsaTierKey        — 'low' | 'intermediate-low' | 'intermediate-high' | 'high'
 * ─────────────────────────────────────────────────────────────────────────── */
export const Part2GuidelineJourney = ({
  psaValue,
  piradsVal,
  biopsyRecommended,
  pathwayMode,
  epsaTierKey,
  expandableDetail,
}) => {
  const hasMri = pathwayMode === 'post_mri' || piradsVal != null;
  const piradsNum = piradsVal != null ? Number(piradsVal) : null;

  const mriOutcomeSublabel = (() => {
    if (piradsNum === null) return 'Recommended before biopsy (Grade A)';
    if (piradsNum <= 2) return `PI-RADS ${piradsNum} — low suspicion`;
    if (piradsNum === 3) return `PI-RADS 3 — equivocal`;
    if (piradsNum === 4) return `PI-RADS 4 — likely significant`;
    return `PI-RADS 5 — highly suspicious`;
  })();

  const biopsySublabel = (() => {
    if (!biopsyRecommended) return 'Monitoring recommended';
    if (piradsNum != null && piradsNum >= 4) return 'Targeted + systematic biopsy';
    if (piradsNum != null && piradsNum === 3) return 'Biopsy with PSA density guidance';
    return 'Systematic biopsy';
  })();

  const STEPS = [
    {
      id: 'elevated_psa',
      icon: <AlertTriangle />,
      label: 'Elevated PSA Detected',
      sublabel: psaValue ? `PSA ${parseFloat(psaValue).toFixed(2)} ng/mL` : 'PSA result elevated',
      variant: 'urgent',
    },
    {
      id: 'confirm_psa',
      icon: <RotateCcw />,
      label: 'Confirmatory PSA',
      sublabel: 'Repeat PSA before further workup',
    },
    {
      id: 'risk_assess',
      icon: <Stethoscope />,
      label: 'Clinical Risk Assessment',
      sublabel: epsaTierKey
        ? `ePSA tier: ${epsaTierKey.replace('-', ' ')}`
        : 'ePSA multi-factor evaluation',
    },
    {
      id: 'mri',
      icon: <ScanEye />,
      label: 'Pre-Biopsy MRI',
      sublabel: mriOutcomeSublabel,
      variant: !hasMri ? 'optional' : undefined,
    },
    {
      id: 'biopsy',
      icon: <Microscope />,
      label: 'Biopsy Decision',
      sublabel: biopsySublabel,
      variant: biopsyRecommended ? 'urgent' : undefined,
    },
  ];

  let activeId;
  if (!hasMri) {
    activeId = 'mri';
  } else if (!biopsyRecommended) {
    activeId = 'risk_assess';
  } else {
    activeId = 'biopsy';
  }

  const completedIds = [];
  const stepOrder = STEPS.map(s => s.id);
  const activeIdx = stepOrder.indexOf(activeId);
  for (let i = 0; i < activeIdx; i++) completedIds.push(stepOrder[i]);

  return (
    <GuidelineJourney
      steps={STEPS}
      activeId={activeId}
      completedIds={completedIds}
      caption="AUA/SUO 2026 — Elevated PSA Evaluation Pathway (Fig. 2)"
      source="Lin et al., J Urol 215:491–501, May 2026 · AUA/SUO Early Detection of Prostate Cancer Guideline (2026)"
      expandableDetail={expandableDetail}
    />
  );
};
