import React, { useState, useEffect, useRef } from 'react';
import './WelcomeScreen.css';
import PrintableForm from './PrintableForm';
import {
  ArrowRightIcon, UploadIcon, FileTextIcon, PlayIcon, XIcon,
  BookOpenIcon, InfoIcon, ExternalLinkIcon, BuildingIcon, ShieldCheckIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const GUIDELINES_SEEN_KEY = 'epsa.guidelinesModalSeen.v1';

/* ─── Screening Guidelines Modal ─── */
export const GuidelinesModal = ({ onClose }) => {
  const closeRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className="gl-modal-root" role="dialog" aria-modal="true" aria-labelledby="gl-modal-title">
      <div className="gl-modal-backdrop" onClick={onClose} />
      <div className="gl-modal-panel">
        <header className="gl-modal-header">
          <div className="gl-modal-eyebrow">
            <BookOpenIcon size={12} aria-hidden="true" />
            <span>Before you begin</span>
          </div>
          <h2 id="gl-modal-title" className="gl-modal-title">Prostate Cancer Screening Guidelines</h2>
          <p className="gl-modal-sub">ePSA is built on Mount Sinai patient data and aligns its recommendations with AUA/SUO and NCCN screening guidelines.</p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close guidelines"
            className="gl-modal-close"
          >
            <XIcon size={16} />
          </button>
        </header>

        <div className="gl-modal-body">
          {/* AUA/SUO */}
          <section className="gl-section" aria-label="AUA / SUO guidelines">
            <div className="gl-section-head">
              <span className="gl-pill gl-pill--aua">AUA / SUO 2023 (am. 2026)</span>
              <span className="gl-section-meta">American Urological Association</span>
              <a
                className="gl-section-link"
                href="https://www.auanet.org/guidelines-and-quality/guidelines/early-detection-of-prostate-cancer-guidelines"
                target="_blank"
                rel="noopener noreferrer"
              >
                Source <ExternalLinkIcon size={11} aria-hidden="true" />
              </a>
            </div>
            <table className="gl-table">
              <tbody>
                {[
                  { age: 'Under 40', cls: 'gl-age--low',  rec: 'No routine screening. High-risk individuals (Black ancestry, BRCA1/2, strong family history) may begin discussions at 40–45.' },
                  { age: '40 – 45',  cls: 'gl-age--med',  rec: 'Screening discussions for high-risk individuals only. Strong Rec, Grade B.' },
                  { age: '45 – 50',  cls: 'gl-age--med',  rec: 'Baseline PSA may be offered. Conditional Rec, Grade B.' },
                  { age: '50 – 69',  cls: 'gl-age--ok',   rec: 'Regular PSA screening every 2–4 years. Strong Rec, Grade A.' },
                  { age: '70 – 75',  cls: 'gl-age--warn', rec: 'Continue screening via Shared Decision Making (SDM) based on health and life expectancy.' },
                  { age: 'Over 75',  cls: 'gl-age--stop', rec: 'Individualise or discontinue via SDM. Screening unlikely to benefit patients with <10-year life expectancy.' },
                ].map(({ age, cls, rec }) => (
                  <tr key={age}>
                    <td className={`gl-age ${cls}`}>{age}</td>
                    <td>{rec}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* NCCN */}
          <section className="gl-section" aria-label="NCCN guidelines">
            <div className="gl-section-head">
              <span className="gl-pill gl-pill--nccn">NCCN 2024</span>
              <span className="gl-section-meta">National Comprehensive Cancer Network</span>
              <a
                className="gl-section-link"
                href="https://www.nccn.org/guidelines/category_2"
                target="_blank"
                rel="noopener noreferrer"
              >
                Source <ExternalLinkIcon size={11} aria-hidden="true" />
              </a>
            </div>
            <ul className="gl-list">
              <li>First PSA at age <strong>45</strong> for average-risk men; age <strong>40</strong> for higher-risk men.</li>
              <li>Testing every <strong>1–2 years</strong> between ages 45 and 75.</li>
              <li>Shared decision-making above age 75.</li>
            </ul>
          </section>

          {/* High-risk callout */}
          <div className="gl-callout">
            <span className="gl-callout-title">High-risk factors — earlier screening recommended</span>
            <ul className="gl-list">
              <li><strong>Black / African American ancestry</strong></li>
              <li><strong>First-degree family history</strong> of prostate cancer</li>
              <li><strong>Germline mutations</strong> — BRCA1, BRCA2, ATM, Lynch Syndrome</li>
            </ul>
          </div>

          <p className="gl-disclaimer">
            ePSA aligns with AUA/NCCN guidelines. When ePSA deviates from standard guidelines (for example, a model-based PSA recommendation driven by non-guideline factors like BMI or diet), a clear notice is shown on your results page.
          </p>
        </div>

        <footer className="gl-modal-footer">
          <span className="gl-reviewed">Last reviewed: March 2026</span>
          <button type="button" onClick={onClose} className="gl-cta">
            Got it — start assessment
          </button>
        </footer>
      </div>
    </div>
  );
};

const WelcomeScreen = ({ onBegin, onBeginLocal, onBeginCloud, onImport, onQuickEntry, onViewOverview, onBeginSinai, formData, cloudAvailable }) => {
  const [showForm, setShowForm] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir(i18n.resolvedLanguage || i18n.language) === 'rtl';

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (!window.localStorage.getItem(GUIDELINES_SEEN_KEY)) {
        setShowGuidelines(true);
      }
    } catch {
      /* localStorage unavailable — skip auto-open */
    }
  }, []);

  const handleCloseGuidelines = () => {
    setShowGuidelines(false);
    try { window.localStorage.setItem(GUIDELINES_SEEN_KEY, '1'); } catch { /* noop */ }
  };

  const handleBegin = () => {
    if (onBegin) return onBegin();
    if (cloudAvailable && onBeginCloud) return onBeginCloud();
    if (onBeginLocal) return onBeginLocal();
  };

  const showStorageChoice = cloudAvailable && onBeginLocal && onBeginCloud;

  if (showForm) {
    return <PrintableForm onBack={() => setShowForm(false)} formData={formData} />;
  }

  return (
    <div className="ws-root" dir={isRtl ? 'rtl' : 'ltr'}>
      {showGuidelines && <GuidelinesModal onClose={handleCloseGuidelines} />}

      {/* ── Accent bar ── */}
      <div className="ws-accent-bar" aria-hidden="true" />

      {/* ── Hero card ── */}
      <section className="ws-hero-card" aria-label="ePSA — Prostate Cancer Screening Tool">
        {/* Navy header: brand identity + trust signals */}
        <div className="ws-hero-card-head">
          <div className="ws-brand-lockup">
            <div className="ws-brand-icon-wrap" aria-hidden="true">
              <ShieldCheckIcon size={20} />
            </div>
            <div>
              <div className="ws-brand-name">ePSA</div>
              <div className="ws-brand-tagline">Prostate Cancer Screening Aid</div>
            </div>
          </div>
          <div className="ws-trust-row">
            <span className="ws-trust-inst">Icahn School of Medicine at Mount Sinai</span>
            <div className="ws-badge-row">
              <span className="ws-trust-badge">AUA/SUO 2026</span>
              <span className="ws-trust-badge">NCCN v1.2024</span>
              <span className="ws-trust-badge">EAU 2024</span>
            </div>
          </div>
        </div>

        {/* White body: title, description, CTA */}
        <div className="ws-hero-card-body">
          <h1 className="ws-hero-title">{t('welcome.heroTitle')}</h1>
          <p className="ws-hero-body">{t('welcome.heroDescription')}</p>

          {showStorageChoice ? (
            <div className="ws-storage-choice">
              <button type="button" className="ws-btn-primary" onClick={onBeginCloud}>
                <span>{t('welcome.storageCloudTitle')}</span>
                <span className="ws-btn-sub">{t('welcome.storageCloudSub')}</span>
                <ArrowRightIcon size={17} />
              </button>
              <button type="button" className="ws-btn-ghost" onClick={onBeginLocal}>
                <span>{t('welcome.storageDeviceOnlyTitle')}</span>
                <span className="ws-btn-sub ws-btn-sub-ghost">{t('welcome.storageDeviceOnlySub')}</span>
              </button>
            </div>
          ) : (
            <button className="ws-btn-primary" onClick={handleBegin}>
              <span>{t('welcome.startAssessment')}</span>
              <ArrowRightIcon size={17} />
            </button>
          )}

          <p className="ws-cta-note">
            {t('welcome.featureTime')} · {t('welcome.trustNoAccount')} · {t('welcome.featurePrivate')}
          </p>

          <div className="ws-utility-links">
            {onViewOverview && (
              <button type="button" className="ws-demo-link" onClick={onViewOverview}>
                <InfoIcon size={13} aria-hidden="true" />
                <span>What is ePSA?</span>
              </button>
            )}
            <button type="button" className="ws-demo-link" onClick={() => setShowGuidelines(true)}>
              <BookOpenIcon size={13} aria-hidden="true" />
              <span>Screening guidelines</span>
            </button>
            <a href="/demo" className="ws-demo-link">
              <PlayIcon size={13} aria-hidden="true" />
              <span>Watch demo</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="ws-flow" aria-label="How ePSA works">
        <h2 className="ws-flow-heading">How it works</h2>
        <div className="ws-flow-steps">
          <div className="ws-flow-step">
            <span className="ws-flow-num" aria-hidden="true">1</span>
            <div className="ws-flow-step-text">
              <strong>{t('welcome.flow.step1Title')}</strong>
              <span>{t('welcome.flow.step1Body')}</span>
            </div>
          </div>
          <div className="ws-flow-connector" aria-hidden="true" />
          <div className="ws-flow-step">
            <span className="ws-flow-num" aria-hidden="true">2</span>
            <div className="ws-flow-step-text">
              <strong>{t('welcome.flow.step2Title')}</strong>
              <span>{t('welcome.flow.step2Body')}</span>
            </div>
          </div>
          <div className="ws-flow-connector" aria-hidden="true" />
          <div className="ws-flow-step">
            <span className="ws-flow-num" aria-hidden="true">3</span>
            <div className="ws-flow-step-text">
              <strong>{t('welcome.flow.step3Title')}</strong>
              <span>{t('welcome.flow.step3Body')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Secondary / utility actions ── */}
      <div className="ws-secondary">
        {onImport && (
          <button type="button" className="ws-btn-text" onClick={onImport}>
            <UploadIcon size={13} />
            <span>{t('welcome.importPreviousSession')}</span>
          </button>
        )}
        {onQuickEntry && (
          <button type="button" className="ws-btn-text" onClick={onQuickEntry}>
            <UploadIcon size={13} />
            <span>{t('welcome.quickEntry')}</span>
          </button>
        )}
        <button type="button" className="ws-btn-text" onClick={() => setShowForm(true)}>
          <FileTextIcon size={13} />
          <span title={t('welcome.viewPrintableFormTitle')}>{t('welcome.viewPrintableForm')}</span>
        </button>
        {onBeginSinai && (
          <button
            type="button"
            className="ws-btn-text"
            onClick={onBeginSinai}
            title="Mount Sinai patients with a clinic-issued code"
          >
            <BuildingIcon size={13} />
            <span>Mount Sinai patient?</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default WelcomeScreen;
