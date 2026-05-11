import React, { useState } from 'react';
import './PSAOverviewScreen.css';
import {
  FlaskConicalIcon, ShieldCheckIcon,
  ArrowLeftIcon, ArrowRightIcon, ChevronRightIcon, ExternalLinkIcon,
  AlertTriangleIcon, HeartPulseIcon, BookOpenIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

/* ─── PSA Overview / Educational Walkthrough ───
 * Shown after ConsentScreen, before PathwaySelector.
 * Educational only — content sourced from AUA/SUO, NCCN, EAU guidelines
 * and the American Cancer Society. Not medical advice.
 */
const PSAOverviewScreen = ({ onContinue, onBack }) => {
  const { t } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [
    {
      key: 'what',
      icon: <FlaskConicalIcon size={28} />,
      eyebrow: t('psaOverview.steps.what.eyebrow', 'Step 1 of 4'),
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
          label: t('psaOverview.steps.what.fact2Label', 'Typical ranges by age'),
          value: t('psaOverview.steps.what.fact2Value', '~2.5 (40\u201349) \u00B7 ~3.5 (50\u201359) \u00B7 ~4.5 (60\u201369)'),
        },
        {
          label: t('psaOverview.steps.what.fact3Label', 'Elevated PSA does not always mean cancer'),
          value: t('psaOverview.steps.what.fact3Value', 'BPH, prostatitis, recent ejaculation, or cycling can raise PSA'),
        },
      ],
      source: 'American Cancer Society; NCCN Prostate Cancer Early Detection v1.2024',
    },
    {
      key: 'why',
      icon: <HeartPulseIcon size={28} />,
      eyebrow: t('psaOverview.steps.why.eyebrow', 'Step 2 of 4'),
      title: t('psaOverview.steps.why.title', 'Why does PSA testing matter?'),
      body: t(
        'psaOverview.steps.why.body',
        'Prostate cancer is the second most common cancer in men worldwide. Caught early \u2014 while it is still confined to the prostate \u2014 the 5-year relative survival is over 99%. Once it has spread to distant parts of the body, that drops to about 37%. Regular PSA discussions help find cancer at the stage when it is most treatable.'
      ),
      stats: [
        { value: '1 in 8', label: t('psaOverview.steps.why.stat1', 'U.S. men will be diagnosed with prostate cancer in their lifetime') },
        { value: '>99%', label: t('psaOverview.steps.why.stat2', '5-year survival when found at a localized stage') },
        { value: '~20%', label: t('psaOverview.steps.why.stat3', 'reduction in prostate cancer death with screening (ERSPC 16-yr)') },
      ],
      source: 'Lifetime risk & 5-year survival: American Cancer Society Facts & Figures 2024. Mortality reduction: ERSPC 16-year results, Hugosson et al., Eur Urol 2019.',
    },
    {
      key: 'guidelines',
      icon: <BookOpenIcon size={28} />,
      eyebrow: t('psaOverview.steps.guidelines.eyebrow', 'Step 3 of 4'),
      title: t('psaOverview.steps.guidelines.title', 'What do the major guidelines say?'),
      body: t(
        'psaOverview.steps.guidelines.body',
        'Three major bodies publish prostate-cancer screening guidance. They broadly agree on a shared-decision approach. ePSA aligns with all of them.'
      ),
      guidelines: [
        {
          name: 'AUA / SUO (2023, amended 2026)',
          summary: t(
            'psaOverview.steps.guidelines.aua',
            'Baseline PSA at 45\u201350 for average risk; begin at 40\u201345 for higher risk (Black ancestry, family history, germline mutations). Re-test every 2\u20134 years for ages 50\u201369.'
          ),
          url: 'https://www.auanet.org/guidelines-and-quality/guidelines/early-detection-of-prostate-cancer-guidelines',
        },
        {
          name: 'NCCN v1.2024',
          summary: t(
            'psaOverview.steps.guidelines.nccn',
            'First PSA at 45 for most men, age 40 for higher risk. Re-test every 1\u20132 years between 45 and 75. Shared decision-making above 75.'
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
      source: 'AUA/SUO 2023; NCCN v1.2024; EAU 2024',
    },
    {
      key: 'epsa',
      icon: <ShieldCheckIcon size={28} />,
      eyebrow: t('psaOverview.steps.epsa.eyebrow', 'Step 4 of 4'),
      title: t('psaOverview.steps.epsa.title', 'How does ePSA help?'),
      body: t(
        'psaOverview.steps.epsa.body',
        'ePSA is an educational decision aid built on Mount Sinai patient data and aligned with AUA, NCCN, and EAU guidelines. It does not replace clinical judgment. It helps you understand whether PSA testing is a reasonable conversation to have with your doctor \u2014 and once you have a PSA result, what the guideline-supported next steps look like.'
      ),
      benefits: [
        {
          title: t('psaOverview.steps.epsa.benefit1Title', 'Two questions, two parts'),
          body: t(
            'psaOverview.steps.epsa.benefit1Body',
            'Part 1: should you discuss PSA testing? \u00A0 Part 2: given your PSA, what are the guideline-supported next steps?'
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
      source: t('psaOverview.steps.epsa.attribution', 'Developed at the Icahn School of Medicine at Mount Sinai'),
    },
  ];

  const total = steps.length;
  const step = steps[stepIndex];
  const isLast = stepIndex === total - 1;
  const isFirst = stepIndex === 0;

  const next = () => {
    if (isLast) onContinue?.();
    else setStepIndex((i) => i + 1);
  };
  const prev = () => {
    if (isFirst) onBack?.();
    else setStepIndex((i) => i - 1);
  };

  return (
    <div className="psa-overview-container" role="main">
      <div className="psa-overview-card">
        <div className="psa-overview-progress" aria-label={`Step ${stepIndex + 1} of ${total}`}>
          {steps.map((s, i) => (
            <button
              key={s.key}
              type="button"
              className={`psa-overview-progress-dot ${i === stepIndex ? 'psa-overview-progress-dot--active' : ''} ${i < stepIndex ? 'psa-overview-progress-dot--done' : ''}`}
              onClick={() => setStepIndex(i)}
              aria-label={`Go to step ${i + 1}: ${s.title}`}
              aria-current={i === stepIndex ? 'step' : undefined}
            />
          ))}
        </div>

        <div className="psa-overview-step" key={step.key}>
          <div className="psa-overview-step-head">
            <div className="psa-overview-step-icon" style={{ color: '#1e3a5f' }} aria-hidden="true">
              {step.icon}
            </div>
            <div>
              <div className="psa-overview-step-eyebrow">{step.eyebrow}</div>
              <h2 className="psa-overview-step-title">{step.title}</h2>
            </div>
          </div>

          <p className="psa-overview-step-body">{step.body}</p>

          {/* Step 1: facts list */}
          {step.facts && (
            <ul className="psa-overview-facts">
              {step.facts.map((f, i) => (
                <li key={i}>
                  <span className="psa-overview-fact-label">{f.label}</span>
                  <span className="psa-overview-fact-value">{f.value}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Step 2: stat boxes */}
          {step.stats && (
            <div className="psa-overview-stats">
              {step.stats.map((s, i) => (
                <div className="psa-overview-stat" key={i}>
                  <div className="psa-overview-stat-value">{s.value}</div>
                  <div className="psa-overview-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Step 3: guideline cards */}
          {step.guidelines && (
            <div className="psa-overview-guidelines">
              {step.guidelines.map((g, i) => (
                <div className="psa-overview-guideline-card" key={i}>
                  <div className="psa-overview-guideline-name">{g.name}</div>
                  <p className="psa-overview-guideline-summary">{g.summary}</p>
                  <a href={g.url} target="_blank" rel="noopener noreferrer" className="psa-overview-guideline-link">
                    {t('psaOverview.viewSource', 'View source')} <ExternalLinkIcon size={12} aria-hidden="true" />
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Step 4: benefits */}
          {step.benefits && (
            <div className="psa-overview-benefits">
              {step.benefits.map((b, i) => (
                <div className="psa-overview-benefit" key={i}>
                  <div className="psa-overview-benefit-icon"><ChevronRightIcon size={16} aria-hidden="true" /></div>
                  <div>
                    <div className="psa-overview-benefit-title">{b.title}</div>
                    <div className="psa-overview-benefit-body">{b.body}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {step.source && (
            <div className="psa-overview-source">
              <span className="psa-overview-source-label">{t('psaOverview.sourceLabel', 'Source')}:</span> {step.source}
            </div>
          )}
        </div>

        <div className="psa-overview-disclaimer" role="note">
          <AlertTriangleIcon size={14} aria-hidden="true" />
          <span>
            {t(
              'psaOverview.disclaimer',
              'Educational tool only. Not a diagnosis. Always discuss screening decisions with a qualified clinician.'
            )}
          </span>
        </div>

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
            onClick={next}
            autoFocus
          >
            <span>{isLast ? t('psaOverview.begin', 'Begin') : t('psaOverview.next', 'Next')}</span>
            <ArrowRightIcon size={16} aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          className="psa-overview-skip"
          onClick={onContinue}
        >
          {t('psaOverview.skip', 'Skip overview \u2192')}
        </button>
      </div>
    </div>
  );
};

export default PSAOverviewScreen;
