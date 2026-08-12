/**
 * Shared result screen components — used by Part1Results and Part2Results.
 * Extracted to eliminate duplication and ensure bug fixes apply once.
 */
import React, { useState, useEffect } from 'react';
import { ChevronUpIcon, ChevronDownIcon, AlertTriangleIcon, AlertCircleIcon, InfoIcon, CheckIcon, CircleIcon, StethoscopeIcon, ArrowRightIcon, ShieldCheckIcon, MoreHorizontalIcon } from 'lucide-react';
import { useDoctorMode, modeAtLeast } from '../../context/DoctorModeContext.jsx';

// ─── Collapsible Section ──────────────────────────────────────────────────────
// `minMode` marks a section as clinician-oriented content (guideline
// statements, model internals) — once the view mode reaches that tier
// ('clinical'), the section auto-expands so the reader doesn't have to click
// through every disclosure individually. It also
// auto-collapses again on dropping back below that tier. Sections that aren't
// audience-specific (e.g. "Find a Urologist") should leave `minMode` unset so
// switching modes doesn't force-open things patients still want closed.
// `advanced` is a legacy alias for `minMode="clinical"`.
export const CollapsibleSection = ({
  title,
  children,
  defaultOpen = false,
  id,
  highlight = false,
  className = '',
  advanced = false,
  minMode = null,
}) => {
  const { viewMode } = useDoctorMode();
  const effectiveMinMode = minMode || (advanced ? 'clinical' : null);
  const gated = effectiveMinMode ? modeAtLeast(viewMode, effectiveMinMode) : false;
  const [open, setOpen] = useState(defaultOpen || gated);
  useEffect(() => {
    if (effectiveMinMode) setOpen(defaultOpen || gated);
  }, [effectiveMinMode, gated]);
  return (
    <div
      id={id}
      className={`collapsible-section${highlight ? ' collapsible-section--highlight' : ''}${className ? ` ${className}` : ''}`}
    >
      <button
        className="collapsible-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        type="button"
      >
        <span>{title}</span>
        {open ? <ChevronUpIcon size={16} aria-hidden="true" /> : <ChevronDownIcon size={16} aria-hidden="true" />}
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  );
};

// ─── Clinical Detail Disclosure ───────────────────────────────────────────────
// Progressive-disclosure wrapper: the public/default view of ePSA is written in
// plain, patient-facing language. Clinicians (or anyone who wants the underlying
// rigor — guideline citations, cited studies, model/guideline terminology) can
// reveal it on demand via this toggle rather than it being removed or hidden away
// in a separate mode. Keep the plain-language content OUTSIDE this wrapper (always
// visible) and put the guideline/citation/technical language INSIDE (opt-in).
export const ClinicalDetail = ({
  children,
  label = 'Show clinical detail',
  hideLabel = 'Hide clinical detail',
  defaultOpen = false,
  className = '',
  minMode = 'clinical',
}) => {
  const { viewMode } = useDoctorMode();
  const gated = modeAtLeast(viewMode, minMode);
  const [open, setOpen] = useState(defaultOpen || gated);
  useEffect(() => {
    setOpen(defaultOpen || gated);
  }, [gated]);
  return (
    <div className={`clinical-detail${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className="clinical-detail__toggle"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          margin: '6px 0 0',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 600,
          color: '#2563eb',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        {open ? <ChevronUpIcon size={12} aria-hidden="true" /> : <ChevronDownIcon size={12} aria-hidden="true" />}
        {open ? hideLabel : label}
      </button>
      {open && (
        <div
          className="clinical-detail__body"
          style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed rgba(0,0,0,0.12)' }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

// ─── Guardrail Banner ─────────────────────────────────────────────────────────
// Uses semantic CSS variables (App.css, with .theme-dark overrides) so this renders
// correctly in both light and dark mode.
const GUARDRAIL_CONFIG = {
  critical: { bg: 'var(--error-50)', border: 'var(--error-600)', labelColor: 'var(--error-600)', Icon: AlertCircleIcon },
  warning:  { bg: 'var(--warning-50)', border: 'var(--warning-600)', labelColor: 'var(--warning-600)', Icon: AlertTriangleIcon },
  info:     { bg: 'var(--brand-50)', border: 'var(--brand-500)', labelColor: 'var(--brand-700)', Icon: InfoIcon },
};

export const GuardrailBanner = ({ alert }) => {
  const cfg = GUARDRAIL_CONFIG[alert?.level] || GUARDRAIL_CONFIG.info;
  return (
    <div
      role="alert"
      style={{
        background: cfg.bg,
        borderLeft: `4px solid ${cfg.border}`,
        borderRadius: '8px',
        padding: '12px 14px',
        margin: '8px 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <cfg.Icon size={15} aria-hidden="true" color={cfg.labelColor} />
        <span style={{ fontWeight: 700, fontSize: '13px', color: cfg.labelColor }}>{alert?.title}</span>
      </div>
      <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-800)', lineHeight: 1.5 }}>{alert?.message}</p>
    </div>
  );
};

// ─── SDM Conversation Guide (AHRQ SHARE Approach) ─────────────────────────────
// Renders the engine's `sdmGuide` field (Seek/Help/Assess/Reach/Evaluate) as a
// "prepare for your visit" stacked-card list. Falls back to the caller's
// children (the prior static disclosure card) when sdmGuide is null.
const SHARE_STEPS = [
  { key: 'seek', label: 'Seek', listKey: null },
  { key: 'help', label: 'Help', listKey: 'options' },
  { key: 'assess', label: 'Assess', listKey: 'considerations' },
  { key: 'reach', label: 'Reach', listKey: null },
  { key: 'evaluate', label: 'Evaluate', listKey: null },
];

export const SdmConversationGuide = ({ sdmGuide, fallback = null }) => {
  if (!sdmGuide) return fallback;
  return (
    <div
      role="note"
      aria-label="Shared decision-making conversation guide"
      style={{
        background: '#f0fdf4',
        border: '0.5px solid #86efac',
        borderLeft: '3px solid #16a34a',
        borderRadius: '8px',
        padding: '10px 12px',
        fontSize: '12px',
        color: '#166534',
        lineHeight: 1.5,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
        <CheckIcon size={14} aria-hidden="true" style={{ color: '#16a34a', flexShrink: 0 }} />
        <span style={{ fontWeight: 700 }}>Prepare for your visit — {sdmGuide.topic}</span>
      </div>
      {SHARE_STEPS.map(({ key, label, listKey }) => {
        const step = sdmGuide[key];
        if (!step) return null;
        const items = listKey ? step[listKey] : null;
        return (
          <div key={key} style={{ margin: '6px 0', paddingTop: '6px', borderTop: '1px solid #bbf7d0' }}>
            <div style={{ fontWeight: 600 }}>{label}</div>
            <div>{step.prompt}</div>
            {Array.isArray(items) && items.length > 0 && (
              <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                {items.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            )}
          </div>
        );
      })}
      {sdmGuide.source && (
        <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #bbf7d0', fontSize: '11px', color: '#166534', opacity: 0.85 }}>
          Source: {sdmGuide.source}
        </div>
      )}
    </div>
  );
};

// ─── SDM Timeline ──────────────────────────────────────────────────────────
// Static 4-step visual reinforcing that ePSA feeds a conversation, not a verdict.
const SDM_TIMELINE_STEPS = ['Questionnaire', 'ePSA Assessment', 'Shared Decision-Making', 'Personalized Care Plan'];

const SdmTimeline = () => (
  <div
    aria-hidden="true"
    style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px', margin: '4px 0 14px', fontSize: 'var(--font-size-caption, 12px)' }}
  >
    {SDM_TIMELINE_STEPS.map((step, i) => (
      <React.Fragment key={step}>
        <span
          style={{
            padding: '4px 10px',
            borderRadius: '999px',
            fontWeight: step === 'Shared Decision-Making' ? 700 : 500,
            color: step === 'Shared Decision-Making' ? '#fff' : 'var(--ink-700, #374151)',
            background: step === 'Shared Decision-Making' ? 'var(--brand-700, #1d3a59)' : 'var(--ink-50, #f3f4f6)',
            border: step === 'Shared Decision-Making' ? 'none' : '1px solid var(--ink-200, #e5e7eb)',
          }}
        >
          {step}
        </span>
        {i < SDM_TIMELINE_STEPS.length - 1 && <ArrowRightIcon size={12} aria-hidden="true" style={{ color: 'var(--ink-400, #9ca3af)', flexShrink: 0 }} />}
      </React.Fragment>
    ))}
  </div>
);

// ─── Ask-Your-Doctor question bank ────────────────────────────────────────
const ASK_YOUR_DOCTOR_QUESTIONS = [
  'What does my ePSA assessment mean for me?',
  'Should I repeat my PSA test?',
  'Would an MRI provide additional information?',
  'Do I need to see a urologist?',
  'What are the benefits and risks of a biopsy?',
  'How do my family history and other risk factors influence my care?',
];

/**
 * SdmCard — the dedicated, prominent "Shared Decision-Making" card. Placed
 * directly below the Overall Assessment card on every results screen
 * (Part1/2/3Results.jsx), reinforcing that ePSA informs a conversation with a
 * clinician rather than making the decision itself. Wraps the existing
 * patient-customized `SdmConversationGuide` (SHARE steps) as an optional
 * "Prepare for your visit" sub-section so that content isn't duplicated.
 *
 * @param {string} stageNote - one-line, stage-specific framing, e.g.
 *   "Discuss whether PSA screening is appropriate." (Pre-PSA),
 *   "Review your PSA result together with your clinician." (PSA),
 *   "Discuss MRI findings and whether a biopsy is appropriate." (MRI)
 * @param {object|null} sdmGuide - result?.sdmGuide from the engine, same prop
 *   already passed to SdmConversationGuide elsewhere.
 */
export const SdmCard = ({ stageNote, sdmGuide = null, showFullGuide = false }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      role="region"
      aria-label="Shared decision-making"
      style={{
        background: '#fff',
        border: '1px solid var(--ink-200, #e5e7eb)',
        borderRadius: '12px',
        padding: '16px 20px',
        boxShadow: 'var(--shadow-xs, 0 1px 2px rgba(0,0,0,0.04))',
        margin: '0.875rem 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <StethoscopeIcon size={18} aria-hidden="true" style={{ color: 'var(--brand-700, #1d3a59)', flexShrink: 0 }} />
        <span style={{ fontWeight: 'var(--font-weight-heading, 700)', fontSize: 'var(--font-size-body, 1rem)', color: 'var(--ink-900, #111827)' }}>
          Shared Decision-Making
        </span>
        <span style={{ flex: '1 1 auto', minWidth: '180px', fontSize: 'var(--font-size-small, 0.875rem)', color: 'var(--ink-700, #374151)' }}>
          {stageNote || 'Review these results with your physician before deciding on further testing.'}
        </span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0,
            background: 'none', border: '1px solid var(--brand-700, #1d3a59)', borderRadius: '999px',
            padding: '4px 12px', fontSize: 'var(--font-size-caption, 0.75rem)', fontWeight: 700,
            color: 'var(--brand-700, #1d3a59)', cursor: 'pointer',
          }}
        >
          {expanded ? 'Hide' : 'View'} SDM Guide {expanded ? <ChevronUpIcon size={12} aria-hidden="true" /> : <ChevronDownIcon size={12} aria-hidden="true" />}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--ink-100, #f3f4f6)' }}>
          <SdmTimeline />

          <p style={{ margin: '0 0 8px', fontSize: 'var(--font-size-small, 0.875rem)', color: 'var(--ink-700, #374151)', lineHeight: 1.6 }}>
            Your ePSA assessment is designed to support — not replace — a conversation with your healthcare team. Together, you can discuss:
          </p>
          <ul style={{ margin: '0 0 12px', paddingLeft: '20px', fontSize: 'var(--font-size-small, 0.875rem)', color: 'var(--ink-700, #374151)', lineHeight: 1.7 }}>
            <li>Your personal risk factors</li>
            <li>Benefits and potential harms of additional testing</li>
            <li>Your values and preferences</li>
            <li>Whether repeat PSA testing, MRI, or biopsy is appropriate</li>
          </ul>

          <div style={{ background: 'var(--ink-50, #f9fafb)', border: '1px solid var(--ink-200, #e5e7eb)', borderRadius: '8px', padding: '12px 14px', margin: '0 0 12px' }}>
            <div style={{ fontSize: 'var(--font-size-caption, 0.75rem)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-500, #6b7280)', marginBottom: '4px' }}>
              Recommended next step
            </div>
            <p style={{ margin: 0, fontSize: 'var(--font-size-small, 0.875rem)', color: 'var(--ink-800, #1f2937)' }}>
              Schedule an appointment with a board-certified urologist or your primary care physician to review your results.
            </p>
          </div>

          {/* Dr. Tewari's message is shown once per session (Pre-PSA card only) — see showFullGuide callers. */}
          {showFullGuide && (
            <div style={{ borderLeft: '3px solid var(--brand-700, #1d3a59)', background: 'var(--brand-50, #eff6ff)', borderRadius: '0 8px 8px 0', padding: '10px 14px', margin: '0 0 12px' }}>
              <div style={{ fontSize: 'var(--font-size-caption, 0.75rem)', fontWeight: 700, color: 'var(--brand-700, #1d3a59)', marginBottom: '3px' }}>
                Message from Dr. Ashutosh K. Tewari
              </div>
              <p style={{ margin: 0, fontSize: 'var(--font-size-small, 0.875rem)', color: 'var(--ink-800, #1f2937)', fontStyle: 'italic', lineHeight: 1.55 }}>
                "ePSA is intended to support informed conversations between patients and clinicians. Screening and treatment decisions should always reflect the complete clinical picture together with the patient's preferences and values."
              </p>
            </div>
          )}

          {sdmGuide && (
            <div style={{ marginBottom: '12px' }}>
              <SdmConversationGuide sdmGuide={sdmGuide} />
            </div>
          )}

          <CollapsibleSection title="Questions to ask your physician" className="sdm-card__ask-doctor">
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: 'var(--font-size-small, 0.875rem)', color: 'var(--ink-700, #374151)', lineHeight: 1.8 }}>
              {ASK_YOUR_DOCTOR_QUESTIONS.map((q) => <li key={q}>{q}</li>)}
            </ul>
          </CollapsibleSection>

          <p style={{ margin: '12px 0 0', fontSize: 'var(--font-size-caption, 0.75rem)', color: 'var(--ink-500, #6b7280)', lineHeight: 1.6 }}>
            <strong>Clinical Practice Note:</strong> Shared decision-making is a core recommendation of the AUA/SUO, NCCN, and EAU prostate cancer screening guidelines. Screening decisions should be individualized based on clinical findings, patient preferences, and discussion with a qualified healthcare professional.
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Guideline Support Badge ──────────────────────────────────────────────────
const GUIDELINE_LABELS = { aua: 'AUA/SUO', nccn: 'NCCN', eau: 'EAU', erspc: 'ERSPC' };

export const GuidelineSupportBadge = ({ support, count, variant = 'light' }) => {
  const [showTip, setShowTip] = useState(false);
  if (!support) return null;
  const total = 4;
  const n = typeof count === 'number' ? count : Object.values(support).filter(Boolean).length;
  const strong = n >= 3;
  const partial = n >= 1 && n < 3;
  const colour = strong ? '#166534' : partial ? '#92400e' : '#374151';
  const bg = variant === 'dark'
    ? 'rgba(255,255,255,0.18)'
    : (strong ? '#f0fdf4' : partial ? '#fffbeb' : '#f3f4f6');
  const border = variant === 'dark' ? 'rgba(255,255,255,0.35)' : colour;
  const text = variant === 'dark' ? '#fff' : colour;
  const supportedNames = Object.entries(support)
    .filter(([, v]) => v)
    .map(([k]) => GUIDELINE_LABELS[k])
    .join(', ') || 'none';

  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 8px',
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 600,
        color: text,
        letterSpacing: '0.02em',
        cursor: 'help',
      }}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
      onFocus={() => setShowTip(true)}
      onBlur={() => setShowTip(false)}
      tabIndex={0}
      role="button"
      aria-label={`Supported by ${n} of ${total} guidelines: ${supportedNames}`}
      aria-describedby={showTip ? 'guideline-badge-tip' : undefined}
    >
      {strong ? <CheckIcon size={12} aria-hidden="true" /> : partial ? <CircleIcon size={12} aria-hidden="true" style={{ opacity: 0.6 }} /> : <CircleIcon size={12} aria-hidden="true" style={{ opacity: 0.3 }} />}
      Supported by {n} / {total} guidelines
      {showTip && (
        <span
          id="guideline-badge-tip"
          role="tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 10,
            background: '#111827',
            color: '#fff',
            padding: '8px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 500,
            lineHeight: 1.5,
            whiteSpace: 'nowrap',
            boxShadow: '0 6px 14px rgba(0,0,0,0.18)',
          }}
        >
          {Object.entries(GUIDELINE_LABELS).map(([k, label]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {support[k]
                ? <CheckIcon size={11} color="#4ade80" aria-hidden="true" />
                : <span style={{ color: '#9ca3af', fontWeight: 700, fontSize: '11px' }}>—</span>}
              {label}
            </span>
          ))}
        </span>
      )}
    </span>
  );
};

// ─── Guideline Comparison Table ────────────────────────────────────────────
// Clinical-only breakdown of the same `support: {aua, nccn, eau, erspc}`
// boolean map GuidelineSupportBadge already summarizes as "N / 4" — here each
// guideline gets its own row instead of a single combined badge.
const GUIDELINE_COMPARISON_META = {
  aua: { label: 'AUA/SUO', statement: 'AUA/SUO 2026 Early Detection Guideline' },
  nccn: { label: 'NCCN', statement: 'NCCN v1.2024 Prostate Cancer Early Detection' },
  eau: { label: 'EAU', statement: 'EAU 2024 Prostate Cancer Guidelines' },
  erspc: { label: 'ERSPC', statement: 'ERSPC risk calculator criteria' },
};

export const GuidelineComparisonTable = ({ support, recommendationText }) => {
  if (!support) return null;
  return (
    <table className="guideline-comparison-table" aria-label="Per-guideline recommendation comparison">
      <thead>
        <tr>
          <th>Guideline</th>
          <th>Supports this recommendation</th>
          <th>Reference</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(GUIDELINE_COMPARISON_META).map(([key, meta]) => {
          const supported = Boolean(support[key]);
          return (
            <tr key={key}>
              <td>{meta.label}</td>
              <td className={supported ? 'guideline-comparison-table__status--supported' : 'guideline-comparison-table__status--unsupported'}>
                {supported ? 'Yes' : 'No explicit guidance'}
              </td>
              <td>{supported ? (recommendationText?.[key] || meta.statement) : '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

// ─── Guideline Recommendation Card ─────────────────────────────────────────
// Surfaces @urology-ai/epsa-engine's product-spec output-statement tier
// (part1Tier / part2Tier / the biopsy model's `tier`) as the specific,
// guideline-matched recommendation language for the stage the patient is on
// — distinct from the score-based risk tier (epsaTierKey/epsaTierLabel)
// shown in the gauge above it. `tier` is `{ label, description }` (a superset
// in practice — part1Tier/part2Tier carry extra fields the caller can pass
// via `detail`, shown only in clinical view). Renders nothing if no tier is
// available (e.g. Part 2 before a PSA value is entered).
export const GuidelineRecommendationCard = ({ tier, detail = null }) => {
  const { viewMode } = useDoctorMode();
  if (!tier?.label) return null;
  return (
    <div className="guideline-recommendation-card" role="note">
      <div className="guideline-recommendation-card__header">
        <StethoscopeIcon size={16} aria-hidden="true" />
        <span className="guideline-recommendation-card__eyebrow">Guideline-Matched Recommendation</span>
      </div>
      <p className="guideline-recommendation-card__label">{tier.label}</p>
      {/* The engine's description is clinician prose (PI-RADS, gray zone, interval
          language). The label alone is the plain answer patients need. */}
      {tier.description && modeAtLeast(viewMode, 'clinical') && (
        <p className="guideline-recommendation-card__desc">{tier.description}</p>
      )}
      {modeAtLeast(viewMode, 'clinical') && detail}
    </div>
  );
};

// ─── Disclaimer Teaser ─────────────────────────────────────────────────────
// One-line "Important" summary always visible + the full legal/IRB disclaimer
// content (passed as children, unchanged) tucked behind "View Full Disclaimer".
export const DisclaimerTeaser = ({ children }) => (
  <div style={{ margin: '0.875rem 0' }}>
    <div
      role="note"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '8px',
        background: 'var(--ink-50, #f9fafb)', border: '1px solid var(--ink-200, #e5e7eb)',
        borderRadius: '10px', padding: '10px 14px', marginBottom: '6px',
      }}
    >
      <InfoIcon size={15} aria-hidden="true" style={{ color: 'var(--ink-500, #6b7280)', flexShrink: 0, marginTop: '2px' }} />
      <p style={{ margin: 0, fontSize: 'var(--font-size-small, 0.875rem)', color: 'var(--ink-700, #374151)', lineHeight: 1.5 }}>
        <strong style={{ color: 'var(--ink-900, #111827)' }}>Important — </strong>
        ePSA is an educational decision support tool. It does not replace clinical judgment.
      </p>
    </div>
    <CollapsibleSection title="View Full Disclaimer" defaultOpen={false}>
      {children}
    </CollapsibleSection>
  </div>
);

// ─── Model Confidence Badge ────────────────────────────────────────────────
export const ModelConfidenceBadge = ({ level = 'High', cohortNote = 'Validated on Mount Sinai registry', guidelinesNote = 'Supported by AUA, NCCN, EAU guidance' }) => {
  const { viewMode } = useDoctorMode();
  // Patients don't know what "Model Confidence" means — same badge, plainer
  // label. Clinical mode keeps the precise term since it maps to a specific
  // validation concept clinicians will recognize.
  const isPatient = viewMode === 'patient';
  const title = isPatient ? 'Evidence Quality' : 'Model Confidence';
  const colour = level === 'High' ? '#166534' : level === 'Moderate' ? '#92400e' : '#991b1b';
  const bg = level === 'High' ? '#f0fdf4' : level === 'Moderate' ? '#fffbeb' : '#fef2f2';
  const border = level === 'High' ? '#86efac' : level === 'Moderate' ? '#fcd34d' : '#fca5a5';
  return (
    <div
      role="note"
      aria-label={`${title}: ${level}`}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        background: bg, border: `1px solid ${border}`, borderRadius: '10px',
        padding: '10px 14px', margin: '0.75rem 0',
      }}
    >
      <ShieldCheckIcon size={18} aria-hidden="true" style={{ color: colour, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 'var(--font-size-caption, 0.75rem)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: colour }}>
          {title} — {level}
        </div>
        <div style={{ fontSize: 'var(--font-size-caption, 0.75rem)', color: 'var(--ink-600, #4b5563)', marginTop: '1px' }}>
          {isPatient ? 'Based on validated research and current clinical guidelines.' : `${cohortNote} · ${guidelinesNote}`}
        </div>
      </div>
    </div>
  );
};

// ─── "Why?" Impact Bars ────────────────────────────────────────────────────
// Graphical alternative to a plain bullet list of risk-driver names — each
// factor gets a labeled horizontal bar sized by its impact tier.
const IMPACT_TIER_WIDTH = { high: '100%', medium: '65%', low: '35%', none: '6%' };
const IMPACT_TIER_LABEL = { high: 'High', medium: 'Medium', low: 'Low', none: '—' };

export const WhyImpactBars = ({ items = [] }) => (
  <div role="list" aria-label="Risk factors and their impact" style={{ display: 'grid', gap: '8px' }}>
    {items.map(({ label, impact = 'low' }) => (
      <div key={label} role="listitem" style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 40%) 1fr auto', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: 'var(--font-size-small, 0.875rem)', color: 'var(--ink-800, #1f2937)', fontWeight: 500 }}>{label}</span>
        <span style={{ background: 'var(--ink-100, #f3f4f6)', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
          <span
            style={{
              display: 'block', height: '100%', borderRadius: '999px', width: IMPACT_TIER_WIDTH[impact],
              background: impact === 'high' ? 'var(--brand-700, #1d3a59)' : impact === 'medium' ? 'var(--brand-500, #3b6591)' : impact === 'low' ? 'var(--brand-300, #93b4d6)' : 'transparent',
            }}
          />
        </span>
        <span style={{ fontSize: 'var(--font-size-caption, 0.75rem)', color: 'var(--ink-500, #6b7280)', fontWeight: 600, minWidth: '3.5em', textAlign: 'right' }}>
          {IMPACT_TIER_LABEL[impact]}
        </span>
      </div>
    ))}
  </div>
);

// ─── More Actions Menu ─────────────────────────────────────────────────────
// Overflow menu for secondary actions (Export JSON/CSV, extra PDF variants,
// Start Over, etc.) so the primary action row only ever shows Continue /
// Print Summary / Edit Answers, per the "too many buttons" feedback.
export const MoreActionsMenu = ({ children, label = 'More actions' }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          background: '#fff', border: '1px solid var(--ink-300, #d1d5db)', borderRadius: '999px',
          padding: '0.6rem 1rem', fontSize: 'var(--font-size-small, 0.875rem)', fontWeight: 600,
          color: 'var(--ink-700, #374151)', cursor: 'pointer',
        }}
      >
        <MoreHorizontalIcon size={16} aria-hidden="true" />
        <span>{label}</span>
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
          <div
            role="menu"
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50,
              background: '#fff', border: '1px solid var(--ink-200, #e5e7eb)', borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '8px', minWidth: '220px',
              display: 'grid', gap: '2px',
            }}
            onClick={() => setOpen(false)}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Clinical-Only Wrapper ─────────────────────────────────────────────────
// Renders children only once the view mode reaches 'clinical'. Use for blocks
// that are pure clinician content (guideline-deviation rationale, validation
// /model-confidence framing, guideline-support counts) — patient view was
// carrying all of it and reading as a wall of information. Anything a patient
// still needs must stay outside this wrapper.
export const ClinicalOnly = ({ children, minMode = 'clinical' }) => {
  const { viewMode } = useDoctorMode();
  return modeAtLeast(viewMode, minMode) ? <>{children}</> : null;
};
