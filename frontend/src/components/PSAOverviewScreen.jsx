import React, { useState, useEffect } from 'react';
import './PSAOverviewScreen.css';
import {
  FlaskConicalIcon, ShieldCheckIcon,
  ArrowLeftIcon, ArrowRightIcon, ChevronRightIcon, ExternalLinkIcon,
  HeartPulseIcon, BookOpenIcon, InfoIcon, XIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import RegionalGuidanceCard from './RegionalGuidanceCard';
import { useRegionalGuidance } from '../hooks/useRegionalGuidance';

/* ─── Per-step brand identity ───
 * Each of the 4 steps gets its own color from the Mount Sinai palette.
 */
const STEP_META = {
  what:       { accent: '#0288d1', iconBg: 'linear-gradient(135deg, #0288d1 0%, #0277bd 100%)' },
  why:        { accent: '#d32f2f', iconBg: 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)' },
  guidelines: { accent: '#1a3a52', iconBg: 'linear-gradient(135deg, #1a3a52 0%, #0d2a3e 100%)' },
  epsa:       { accent: '#0288d1', iconBg: 'linear-gradient(135deg, #0288d1 30%, #1a3a52 100%)' },
};

/* Step 2 stat accent colors */
const STAT_ACCENTS = ['#d32f2f', '#1B7A4A', '#0288d1'];

/* Step 3 guideline org colors (AUA, NCCN, EAU) */
const GL_ACCENT = ['#1a3a52', '#d32f2f', '#0288d1'];
const GL_BG     = ['var(--ms-navy-10)', 'var(--ms-magenta-10)', 'var(--ms-cyan-10)'];

/* Step 4 benefit accent colors */
const BF_ACCENT = ['#0288d1', '#1a3a52', '#d32f2f'];
const BF_BG     = ['var(--ms-cyan-10)', 'var(--ms-navy-10)', 'var(--ms-magenta-10)'];

/* ─── Sources Modal ─── */
const SourcesModal = ({ step, accent, onClose }) => {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="psa-src-modal-root" role="dialog" aria-modal="true" aria-label="Sources" onClick={onClose}>
      <div className="psa-src-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="psa-src-modal-head" style={{ borderBottom: `2.5px solid ${accent}` }}>
          <span className="psa-src-modal-title" style={{ color: accent }}>Sources</span>
          <button className="psa-src-modal-close" onClick={onClose} aria-label="Close sources">
            <XIcon size={15} />
          </button>
        </div>
        <div className="psa-src-modal-body">
          {step.sourceLinks
            ? step.sourceLinks.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="psa-src-modal-link"
                >
                  <ExternalLinkIcon size={12} aria-hidden="true" />
                  <span>{s.text}</span>
                </a>
              ))
            : <p className="psa-src-modal-text">{step.source}</p>
          }
        </div>
      </div>
    </div>
  );
};

/* ─── PSA Overview / Educational Walkthrough ───
 * Shown after ConsentScreen, before PathwaySelector.
 * Educational only — content sourced from AUA/SUO, NCCN, EAU guidelines
 * and the American Cancer Society. Not medical advice.
 */
const PSAOverviewScreen = ({ onContinue, onBack, continueLabel }) => {
  const { t } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState('next');
  const [showSources, setShowSources] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const guidance = useRegionalGuidance();

  const steps = [
    {
      key: 'what',
      icon: <FlaskConicalIcon size={26} />,
      eyebrow: 'Step 1 of 4',
      title: t('psaOverview.steps.what.title', 'What is PSA?'),
      body: t(
        'psaOverview.steps.what.body',
        'PSA — Prostate-Specific Antigen — is a protein made by the prostate gland. A small amount enters the bloodstream and can be measured with a simple blood test. Higher levels can be caused by prostate cancer, but also by non-cancer conditions like an enlarged prostate (BPH) or inflammation (prostatitis).'
      ),
      facts: [
        {
          label: t('psaOverview.steps.what.fact1Label', 'Measured in'),
          value: t('psaOverview.steps.what.fact1Value', 'ng/mL (blood test)'),
        },
        {
          label: t('psaOverview.steps.what.fact3Label', 'Elevated PSA does not always mean cancer'),
          value: t('psaOverview.steps.what.fact3Value', 'BPH, prostatitis, recent ejaculation, or cycling can raise PSA'),
        },
      ],
      nudge: t(
        'psaOverview.steps.intro.nudge',
        'If you already have urinary symptoms or a known family history of prostate cancer, please talk to your doctor — don\'t wait on this tool.'
      ),
      sourceLinks: [
        { text: 'American Cancer Society', url: 'https://www.cancer.org/cancer/types/prostate-cancer/about/key-statistics.html' },
        { text: 'NCCN Prostate Cancer Early Detection v1.2024', url: 'https://www.nccn.org/guidelines/guidelines-detail?category=2&id=1460' },
      ],
    },
    {
      key: 'why',
      icon: <HeartPulseIcon size={26} />,
      eyebrow: 'Step 2 of 4',
      title: t('psaOverview.steps.why.title', 'Why does PSA testing matter?'),
      body: t(
        'psaOverview.steps.why.body',
        'Prostate cancer is the second most common cancer in men worldwide. Caught early — while it is still confined to the prostate — the 5-year relative survival is over 99%. Once it has spread to distant parts of the body, that drops to about 37%. Regular PSA discussions help find cancer at the stage when it is most treatable.'
      ),
      stats: [
        { value: '1 in 8', label: t('psaOverview.steps.why.stat1', 'U.S. men will be diagnosed with prostate cancer in their lifetime') },
        { value: '>99%', label: t('psaOverview.steps.why.stat2', '5-year survival when found at a localized stage') },
        { value: '~20%', label: t('psaOverview.steps.why.stat3', 'reduction in prostate cancer death with screening (ERSPC 16-yr)') },
      ],
      sourceLinks: [
        { text: 'Lifetime risk & 5-year survival: American Cancer Society Facts & Figures 2024', url: 'https://www.cancer.org/research/cancer-facts-statistics/all-cancer-facts-figures/2024-cancer-facts-figures.html' },
        { text: 'Mortality reduction: ERSPC 16-yr results, Hugosson et al., Eur Urol 2019', url: 'https://pubmed.ncbi.nlm.nih.gov/30824296/' },
      ],
    },
    {
      key: 'guidelines',
      icon: <BookOpenIcon size={26} />,
      eyebrow: 'Step 3 of 4',
      title: t('psaOverview.steps.guidelines.title', 'What do the guidelines say where you are?'),
      body: t(
        'psaOverview.steps.guidelines.body',
        'Screening advice differs by country — some run organised programmes, others test only high-risk men. Below is the current guidance for your region, followed by the three international guidelines ePSA aligns with.'
      ),
      regional: true,
      guidelines: [
        {
          name: 'AUA / SUO (2023, amended 2026)',
          summary: t(
            'psaOverview.steps.guidelines.aua',
            'Baseline PSA at 45–50 for average risk; begin at 40–45 for higher risk (Black ancestry, family history, germline mutations). Re-test every 2–4 years for ages 50–69.'
          ),
          url: 'https://www.auanet.org/guidelines-and-quality/guidelines/early-detection-of-prostate-cancer-guidelines',
        },
        {
          name: 'NCCN v1.2024',
          summary: t(
            'psaOverview.steps.guidelines.nccn',
            'First PSA at 45 for most men, age 40 for higher risk. Re-test every 1–2 years between 45 and 75. Shared decision-making above 75.'
          ),
          url: 'https://www.nccn.org/guidelines/guidelines-detail?category=2&id=1460',
        },
        {
          name: 'EAU 2024',
          summary: t(
            'psaOverview.steps.guidelines.eau',
            'Risk-adapted PSA strategy starting at age 50, or earlier for higher-risk men. PSA density and MRI used to refine biopsy decisions.'
          ),
          url: 'https://uroweb.org/guidelines/prostate-cancer',
        },
      ],
      source: 'AUA/SUO 2026 (amended Feb 2026); NCCN v1.2024; EAU 2024',
    },
    {
      key: 'epsa',
      icon: <ShieldCheckIcon size={26} />,
      eyebrow: 'Step 4 of 4',
      title: t('psaOverview.steps.epsa.title', 'How does ePSA help?'),
      body: t(
        'psaOverview.steps.epsa.body',
        'ePSA is a free educational decision aid aligned with AUA, NCCN, and EAU guidelines, available to any clinician or patient. It does not replace clinical judgment. It helps you understand whether PSA testing is a reasonable conversation to have with your doctor — and once you have a PSA result, what the guideline-supported next steps look like.'
      ),
      benefits: [
        {
          title: t('psaOverview.steps.epsa.benefit1Title', 'Three stages, one guideline'),
          body: t(
            'psaOverview.steps.epsa.benefit1Body',
            'Pre-PSA: should you discuss PSA testing? PSA: given your result, what are the next steps? MRI: combined with imaging, what does your biopsy risk look like?'
          ),
        },
        {
          title: t('psaOverview.steps.epsa.benefit2Title', 'Guideline-aligned'),
          body: t(
            'psaOverview.steps.epsa.benefit2Body',
            'Every recommendation is mapped to AUA, NCCN, or EAU guidance, with sources you can review.'
          ),
        },
        {
          title: t('psaOverview.steps.epsa.benefit3Title', 'Educational, not diagnostic'),
          body: t(
            'psaOverview.steps.epsa.benefit3Body',
            'ePSA does not diagnose anything. It frames the conversation so you and your clinician can decide together.'
          ),
        },
      ],
      source: t('psaOverview.steps.epsa.attribution', 'Developed by the Tewari Lab · Icahn School of Medicine at Mount Sinai'),
    },
  ];

  const total = steps.length;
  const step = steps[stepIndex];
  const isLast = stepIndex === total - 1;
  const isFirst = stepIndex === 0;
  const meta = STEP_META[step.key];

  const next = () => {
    if (isLast) onContinue?.();
    else { setDirection('next'); setStepIndex((i) => i + 1); setShowSources(false); }
  };
  const prev = () => {
    if (isFirst) onBack?.();
    else { setDirection('prev'); setStepIndex((i) => i - 1); setShowSources(false); }
  };
  const jumpTo = (i) => {
    setDirection(i > stepIndex ? 'next' : 'prev');
    setStepIndex(i);
    setShowSources(false);
  };

  const hasSource = step.source || step.sourceLinks;

  return (
    <div className="psa-overview-container" role="main">
      {showSources && (
        <SourcesModal step={step} accent={meta.accent} onClose={() => setShowSources(false)} />
      )}

      <div
        className="psa-overview-card"
        style={{ borderTop: `4px solid ${meta.accent}` }}
      >
        {/* Progress indicators */}
        <div className="psa-overview-progress" aria-label={`Step ${stepIndex + 1} of 4`}>
          {steps.map((s, i) => (
            <button
              key={s.key}
              type="button"
              className={`psa-overview-progress-dot ${i === stepIndex ? 'psa-overview-progress-dot--active' : ''} ${i < stepIndex ? 'psa-overview-progress-dot--done' : ''}`}
              style={i <= stepIndex ? { background: STEP_META[s.key].accent } : undefined}
              onClick={() => jumpTo(i)}
              aria-label={`Go to step ${i + 1}: ${s.title}`}
              aria-current={i === stepIndex ? 'step' : undefined}
            />
          ))}
        </div>

        {/* Step content */}
        <div className={`psa-overview-step psa-overview-step--${direction}`} key={step.key}>
          <div className="psa-overview-step-head">
            <div
              className="psa-overview-step-icon"
              style={{ background: meta.iconBg, color: '#fff' }}
              aria-hidden="true"
            >
              {step.icon}
            </div>
            <div>
              <div className="psa-overview-step-eyebrow" style={{ color: meta.accent }}>
                {step.eyebrow}
              </div>
              <h2 className="psa-overview-step-title">{step.title}</h2>
            </div>
          </div>

          <p className="psa-overview-step-body">{step.body}</p>

          {/* Step 1: facts */}
          {step.facts && (
            <ul className="psa-overview-facts">
              {step.facts.map((f, i) => (
                <li key={i} style={{ borderLeft: `3px solid ${meta.accent}` }}>
                  <span className="psa-overview-fact-label">{f.label}</span>
                  <span className="psa-overview-fact-value">{f.value}</span>
                </li>
              ))}
            </ul>
          )}

          {step.nudge && (
            <p className="psa-overview-nudge" role="note">{step.nudge}</p>
          )}

          {/* Step 2: stat boxes — each gets its own accent color */}
          {step.stats && (
            <div className="psa-overview-stats">
              {step.stats.map((s, i) => (
                <div
                  className="psa-overview-stat"
                  key={i}
                  style={{
                    '--stat-accent': STAT_ACCENTS[i],
                    borderTop: `3px solid ${STAT_ACCENTS[i]}`,
                  }}
                >
                  <div className="psa-overview-stat-value" style={{ color: STAT_ACCENTS[i] }}>
                    {s.value}
                  </div>
                  <div className="psa-overview-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Step 3: region-specific guidance, auto-detected and overridable */}
          {step.regional && (
            <RegionalGuidanceCard
              region={guidance.region}
              country={guidance.country}
              source={guidance.source}
              loading={guidance.loading}
              onSelectRegion={guidance.selectRegion}
              onClearSelection={guidance.clearSelection}
              accent={meta.accent}
            />
          )}

          {/* Step 3: guideline cards — AUA=navy, NCCN=magenta, EAU=cyan */}
          {step.guidelines && (
            <>
            <h3 className="psa-overview-subhead">
              {t('psaOverview.steps.guidelines.internationalHeading', 'International reference guidelines')}
            </h3>
            <div className="psa-overview-guidelines">
              {step.guidelines.map((g, i) => (
                <div
                  className="psa-overview-guideline-card"
                  key={i}
                  style={{
                    '--gl-accent': GL_ACCENT[i],
                    borderLeft: `3px solid ${GL_ACCENT[i]}`,
                    background: GL_BG[i],
                  }}
                >
                  <div className="psa-overview-guideline-pill" style={{ background: GL_ACCENT[i] }}>
                    {g.name}
                  </div>
                  <p className="psa-overview-guideline-summary">{g.summary}</p>
                  <a
                    href={g.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="psa-overview-guideline-link"
                    style={{ color: GL_ACCENT[i] }}
                  >
                    {t('psaOverview.viewSource', 'View source')} <ExternalLinkIcon size={11} aria-hidden="true" />
                  </a>
                </div>
              ))}
            </div>
            </>
          )}

          {/* Step 4: benefits — each gets a different Sinai accent */}
          {step.benefits && (
            <div className="psa-overview-benefits">
              {step.benefits.map((b, i) => (
                <div
                  className="psa-overview-benefit"
                  key={i}
                  style={{
                    '--bf-accent': BF_ACCENT[i],
                    background: BF_BG[i],
                    borderLeft: `3px solid ${BF_ACCENT[i]}`,
                  }}
                >
                  <div className="psa-overview-benefit-icon" style={{ color: BF_ACCENT[i] }}>
                    <ChevronRightIcon size={16} aria-hidden="true" />
                  </div>
                  <div>
                    <div className="psa-overview-benefit-title" style={{ color: BF_ACCENT[i] }}>
                      {b.title}
                    </div>
                    <div className="psa-overview-benefit-body">{b.body}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sources — ℹ icon button instead of raw link list */}
          {hasSource && (
            <div className="psa-overview-source-row">
              <button
                type="button"
                className="psa-overview-source-btn"
                style={{ color: meta.accent, borderColor: `${meta.accent}44` }}
                onClick={() => setShowSources(true)}
                aria-label="View sources for this step"
              >
                <InfoIcon size={12} aria-hidden="true" />
                <span>Sources</span>
              </button>
            </div>
          )}
        </div>

        <p className="psa-overview-disclaimer" role="note">
          {t(
            'psaOverview.disclaimer',
            'Educational tool only. Not a diagnosis. Always discuss screening decisions with a qualified clinician.'
          )}
        </p>

        {/* Acknowledgment checkbox — only on last step */}
        {isLast && (
          <label className="psa-overview-ack">
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              className="psa-overview-ack-input"
            />
            <span className="psa-overview-ack-text">
              I have read and understood — ePSA is a <strong>free screening &amp; prevention aid</strong>, not a diagnostic tool or substitute for medical advice. I will discuss any concerns with a qualified healthcare provider.
            </span>
          </label>
        )}

        <div className="psa-overview-actions">
          <button
            type="button"
            className="psa-overview-btn psa-overview-btn--outline"
            onClick={prev}
          >
            <ArrowLeftIcon size={16} aria-hidden="true" />
            <span>{isFirst ? t('psaOverview.back', 'Back') : t('psaOverview.previous', 'Previous')}</span>
          </button>
          <button
            type="button"
            className="psa-overview-btn psa-overview-btn--primary"
            style={{ background: meta.accent, opacity: isLast && !understood ? 0.45 : 1 }}
            onClick={next}
            disabled={isLast && !understood}
            autoFocus
          >
            <span>{isLast ? (continueLabel ?? t('psaOverview.begin', 'Begin assessment')) : t('psaOverview.next', 'Next')}</span>
            <ArrowRightIcon size={16} aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          className="psa-overview-skip"
          onClick={onContinue}
        >
          {t('psaOverview.skip', 'Skip overview →')}
        </button>
      </div>
    </div>
  );
};

export default PSAOverviewScreen;
