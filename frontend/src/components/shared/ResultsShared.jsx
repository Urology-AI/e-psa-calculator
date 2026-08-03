/**
 * Shared result screen components — used by Part1Results and Part2Results.
 * Extracted to eliminate duplication and ensure bug fixes apply once.
 */
import React, { useState } from 'react';
import { ChevronUpIcon, ChevronDownIcon, AlertTriangleIcon, AlertCircleIcon, InfoIcon, CheckIcon, CircleIcon } from 'lucide-react';

// ─── Collapsible Section ──────────────────────────────────────────────────────
export const CollapsibleSection = ({
  title,
  children,
  defaultOpen = false,
  id,
  highlight = false,
  className = '',
}) => {
  const [open, setOpen] = useState(defaultOpen);
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
}) => {
  const [open, setOpen] = useState(defaultOpen);
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
