import React, { useState, useEffect, useRef } from 'react';
import './WelcomeScreen.css';
import {
  ArrowRightIcon, XIcon,
  InfoIcon, ExternalLinkIcon, UsersIcon, BookOpenIcon,
  HeartHandshakeIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import RegionalGuidanceCard from './RegionalGuidanceCard';
import { useRegionalGuidance } from '../hooks/useRegionalGuidance';

/* ─── Million Strong Men Modal ─── */
export const MillionStrongModal = ({ onClose }) => {
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
    <div className="gl-modal-root" role="dialog" aria-modal="true" aria-labelledby="msm-modal-title">
      <div className="gl-modal-backdrop" onClick={onClose} />
      <div className="gl-modal-panel">
        <header className="gl-modal-header">
          <div className="gl-modal-eyebrow">
            <UsersIcon size={12} aria-hidden="true" />
            <span>Initiative</span>
          </div>
          <h2 id="msm-modal-title" className="gl-modal-title">Million Strong Men</h2>
          <p className="gl-modal-sub">Prostate cancer screening accessible to every man, regardless of insurance, income, or access to a doctor.</p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close Million Strong Men overview"
            className="gl-modal-close"
          >
            <XIcon size={16} />
          </button>
        </header>

        <div className="gl-modal-body">
          <section className="gl-section" aria-label="About the initiative">
            <div className="gl-section-head">
              <span className="gl-section-meta">Million Strong Men</span>
              <a
                className="gl-section-link"
                href="https://millionstrongmen.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Source <ExternalLinkIcon size={11} aria-hidden="true" />
              </a>
            </div>
            <p className="gl-disclaimer" style={{ margin: 0 }}>
              Million Strong Men is a public health initiative working to make prostate cancer screening — and tools like ePSA — freely available to men everywhere.{' '}
              <a
                className="gl-inline-link-anchor"
                href="https://www.cancer.org/cancer/types/prostate-cancer/about/key-statistics.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                Prostate cancer is one of the most common cancers among men
              </a>, yet many never get screened because of cost, access, or simply not knowing where to start.
            </p>
          </section>
          <div className="gl-callout">
            <span className="gl-callout-title">What the initiative supports</span>
            <ul className="gl-list">
              <li>Free, guideline-aligned screening education for men and families</li>
              <li>Community outreach for men without regular access to a doctor</li>
              <li>Open tools like ePSA that help men understand their personal risk</li>
            </ul>
          </div>
          <p className="gl-disclaimer">
            ePSA is built and offered as part of this effort — this assessment will always be free to use.
          </p>
        </div>

        <footer className="gl-modal-footer">
          <a
            href="https://millionstrongmen.com"
            target="_blank"
            rel="noopener noreferrer"
            className="gl-cta"
          >
            Visit Million Strong Men <ExternalLinkIcon size={13} aria-hidden="true" />
          </a>
        </footer>
      </div>
    </div>
  );
};

/* ─── Screening Guidelines Modal ─── */
export const GuidelinesModal = ({ onClose }) => {
  const closeRef = useRef(null);
  const guidance = useRegionalGuidance();

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
          <p className="gl-modal-sub">ePSA aligns its recommendations with AUA/SUO and NCCN screening guidelines and is available to anyone to use for prostate cancer screening guidance.</p>
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
          {/* Where the reader actually lives comes first — the AUA/NCCN tables
              below are the international reference, not everyone's local rule. */}
          <section className="gl-section" aria-label="Guidance for your country or region">
            <RegionalGuidanceCard
              region={guidance.region}
              country={guidance.country}
              source={guidance.source}
              loading={guidance.loading}
              onSelectRegion={guidance.selectRegion}
              onClearSelection={guidance.clearSelection}
              accent="#1a3a52"
            />
          </section>

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

/* ─── Shared Decision Making Modal ─── */
export const SdmModal = ({ onClose }) => {
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
    <div className="gl-modal-root" role="dialog" aria-modal="true" aria-labelledby="sdm-modal-title">
      <div className="gl-modal-backdrop" onClick={onClose} />
      <div className="gl-modal-panel">
        <header className="gl-modal-header">
          <div className="gl-modal-eyebrow">
            <HeartHandshakeIcon size={12} aria-hidden="true" />
            <span>Before you begin</span>
          </div>
          <h2 id="sdm-modal-title" className="gl-modal-title">Shared Decision Making</h2>
          <p className="gl-modal-sub">Per AUA/SUO 2023 (amended 2026), PSA screening decisions should be made together with your clinician — not by a number alone.</p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close shared decision making overview"
            className="gl-modal-close"
          >
            <XIcon size={16} />
          </button>
        </header>

        <div className="gl-modal-body">
          <section className="gl-section" aria-label="What SDM means">
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
            <p className="gl-disclaimer">
              The AUA recommends that clinicians engage patients in shared decision making before ordering a PSA test — weighing the potential benefits (earlier detection of clinically significant cancer) against the potential harms (false positives, overdiagnosis, and the risks of biopsy or overtreatment of indolent disease) in light of the patient's own values and preferences.
            </p>
          </section>

          <div className="gl-callout">
            <span className="gl-callout-title">When SDM is emphasized</span>
            <ul className="gl-list">
              <li><strong>Ages 45–50:</strong> Strong recommendation for shared, informed decision making before baseline PSA — especially for higher-risk men.</li>
              <li><strong>Ages 70–75:</strong> Continue screening only via SDM, factoring in overall health and life expectancy.</li>
              <li><strong>Over 75:</strong> Individualize or discontinue via SDM — screening is unlikely to benefit men with under a 10–15 year life expectancy.</li>
            </ul>
          </div>

          <section className="gl-section" aria-label="What to bring to the conversation">
            <div className="gl-section-head">
              <span className="gl-section-meta">What a good SDM conversation covers</span>
            </div>
            <ul className="gl-list">
              <li>Your personal and family risk factors (ancestry, germline mutations, family history)</li>
              <li>What a PSA result would and wouldn't tell you</li>
              <li>The chance of a false positive, and what happens next if one occurs</li>
              <li>Your own values around early detection versus overtreatment risk</li>
            </ul>
          </section>

          <p className="gl-disclaimer">
            ePSA is built to support this conversation, not replace it — bring your results to your clinician as a starting point for an SDM discussion.
          </p>
        </div>

        <footer className="gl-modal-footer">
          <span className="gl-reviewed">Last reviewed: March 2026</span>
          <button type="button" onClick={onClose} className="gl-cta">
            Got it
          </button>
        </footer>
      </div>
    </div>
  );
};

const WelcomeScreen = ({ onBegin, onBeginLocal, onBeginCloud, onViewOverview, cloudAvailable }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir(i18n.resolvedLanguage || i18n.language) === 'rtl';
  const [showMsmModal, setShowMsmModal] = useState(false);
  const [showGuidelinesModal, setShowGuidelinesModal] = useState(false);
  const [showSdmModal, setShowSdmModal] = useState(false);

  const handleBegin = () => {
    if (onBegin) return onBegin();
    if (cloudAvailable && onBeginCloud) return onBeginCloud();
    if (onBeginLocal) return onBeginLocal();
  };

  const showStorageChoice = cloudAvailable && onBeginLocal && onBeginCloud;

  return (
    <div className="ws-root" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ── Accent bar ── */}
      <div className="ws-accent-bar" aria-hidden="true" />

      {/* ── Million Strong Men Banner ── */}
      <button
        type="button"
        onClick={() => setShowMsmModal(true)}
        className="ws-msm-banner"
        aria-label="Learn more about the Million Strong Men initiative"
      >
        <div className="ws-msm-icon" aria-hidden="true">
          <UsersIcon size={18} />
        </div>
        <div className="ws-msm-text">
          <div className="ws-msm-label">Initiative</div>
          <div className="ws-msm-title">Million Strong Men</div>
          <div className="ws-msm-sub">Prostate cancer screening accessible to every man</div>
        </div>
        <ArrowRightIcon size={16} className="ws-msm-arrow" aria-hidden="true" />
      </button>

      {showMsmModal && <MillionStrongModal onClose={() => setShowMsmModal(false)} />}
      {showGuidelinesModal && <GuidelinesModal onClose={() => setShowGuidelinesModal(false)} />}
      {showSdmModal && <SdmModal onClose={() => setShowSdmModal(false)} />}

      {/* ── Hero card ── */}
      <section className="ws-hero-card" aria-label="ePSA — Prostate Cancer Screening Tool">
        {/* White body: title, description, CTA */}
        <div className="ws-hero-card-body">
          <h1 className="ws-hero-title">{t('welcome.heroTitle')}</h1>
          <p className="ws-hero-body">{t('welcome.heroDescription')}</p>

          {showStorageChoice ? (
            <div className="ws-storage-choice">
              <button type="button" className="ws-btn-primary" onClick={onBeginCloud}>
                <span className="ws-btn-label">
                  <span>{t('welcome.storageCloudTitle')}</span>
                  <span className="ws-btn-sub">{t('welcome.storageCloudSub')}</span>
                </span>
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

        </div>
      </section>

      {/* ── Welcome + How it works ── */}
      <section className="ws-flow-card">
        <div className="ws-flow-half" aria-label="Welcome to ePSA">
          <div className="ws-flow-heading-row">
            <h2 className="ws-flow-heading">What is this</h2>
          </div>
          <div className="ws-flow-steps">
            <div className="ws-flow-step">
              <span className="ws-flow-num" aria-hidden="true">1</span>
              <div className="ws-flow-step-text">
                <strong>What ePSA is</strong>
                <span>
                  A free, guided prostate cancer screening assessment. It walks you through your risk profile and clinical data to give you a personalized picture of your prostate health — no account required, and it's built on{' '}
                  <button type="button" className="gl-inline-link" onClick={() => setShowGuidelinesModal(true)}>
                    <BookOpenIcon size={11} style={{ marginRight: 2, verticalAlign: '-1px' }} aria-hidden="true" />
                    AUA/NCCN screening guidelines
                  </button>.
                </span>
              </div>
            </div>
            <div className="ws-flow-connector" aria-hidden="true" />
            <div className="ws-flow-step">
              <span className="ws-flow-num" aria-hidden="true">2</span>
              <div className="ws-flow-step-text">
                <strong>Million Strong Men</strong>
                <span>
                  ePSA is offered free as part of the Million Strong Men initiative, working to make prostate cancer screening accessible to every man — regardless of insurance, income, or access to a doctor.{' '}
                  <button type="button" className="gl-inline-link" onClick={() => setShowMsmModal(true)}>
                    Learn more
                  </button>
                </span>
              </div>
            </div>
            <div className="ws-flow-connector" aria-hidden="true" />
            <div className="ws-flow-step">
              <span className="ws-flow-num" aria-hidden="true">3</span>
              <div className="ws-flow-step-text">
                <strong>A conversation, not a verdict</strong>
                <span>
                  Your results are meant to support{' '}
                  <button type="button" className="gl-inline-link" onClick={() => setShowSdmModal(true)}>
                    Shared Decision Making
                  </button>
                  {' '}— a conversation between you and your doctor about screening, weighing your personal risk, values, and preferences.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="ws-flow-divider" aria-hidden="true" />

        <div className="ws-flow-half" aria-label="How ePSA works">
          <div className="ws-flow-heading-row">
            <h2 className="ws-flow-heading">How it works</h2>
          </div>
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
        </div>
      </section>
    </div>
  );
};

export default WelcomeScreen;
