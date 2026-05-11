import React, { useState } from 'react';
import './WelcomeScreen.css';
import PrintableForm from './PrintableForm';
import { ArrowRightIcon, UploadIcon, FileTextIcon, PlayIcon, XIcon, BookOpenIcon, InfoIcon, AlertCircleIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ShareQrCode from './ShareQrCode';
import './ShareQrCode.css';

/* ─── Screening Guidelines Modal ─── */
const GuidelinesModal = ({ onClose }) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="gl-modal-title"
    style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}
  >
    {/* Backdrop */}
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />

    {/* Panel */}
    <div style={{
      position: 'relative', zIndex: 1,
      background: 'var(--surface, #fff)',
      borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      width: '100%', maxWidth: '540px',
      maxHeight: '88vh', overflowY: 'auto',
      padding: '28px 24px 24px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Before you begin</div>
          <h2 id="gl-modal-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1e3a5f' }}>Prostate Cancer Screening Guidelines</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>ePSA is built on Mount Sinai patient data and follows AUA / NCCN guidelines.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close guidelines"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px', marginTop: '-4px' }}
        >
          <XIcon size={20} />
        </button>
      </div>

      {/* AUA/SUO */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ background: '#2563eb', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', letterSpacing: '0.04em' }}>AUA / SUO 2026</span>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>American Urological Association</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <tbody>
            {[
              { age: 'Under 40',  rec: 'No routine screening. High-risk individuals (Black ancestry, BRCA1/2, strong family history) may begin discussions at 40–45.',  color: '#6b7280' },
              { age: '40 – 45',   rec: 'Screening discussions for high-risk individuals only (Black ancestry, germline mutations, strong family history).',  color: '#2563eb' },
              { age: '45 – 50',   rec: 'Baseline PSA may be offered to all men.',  color: '#2563eb' },
              { age: '50 – 69',   rec: 'Regular PSA screening every 2–4 years.',  color: '#16a34a' },
              { age: '70 – 75',   rec: 'Continue screening via Shared Decision Making (SDM) based on health and life expectancy.',  color: '#d97706' },
              { age: 'Over 75',   rec: 'Individualise or discontinue screening via SDM. Screening unlikely to benefit patients with <10-year life expectancy.',  color: '#dc2626' },
            ].map(({ age, rec, color }) => (
              <tr key={age} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '7px 10px 7px 0', fontWeight: 700, color, whiteSpace: 'nowrap', width: '80px', verticalAlign: 'top' }}>{age}</td>
                <td style={{ padding: '7px 0', color: '#374151', lineHeight: 1.5 }}>{rec}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* NCCN */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ background: '#7c3aed', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', letterSpacing: '0.04em' }}>NCCN 2024</span>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>National Comprehensive Cancer Network</span>
        </div>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '13px', color: '#374151', lineHeight: 1.8 }}>
          <li>First PSA at age <strong>45</strong> for average-risk men; age <strong>40</strong> for higher-risk men.</li>
          <li>Testing every <strong>1–2 years</strong> between ages 45 and 75.</li>
          <li>Shared decision-making above age 75.</li>
        </ul>
      </div>

      {/* Key high-risk factors */}
      <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '14px 16px', marginBottom: '18px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>High-risk factors — earlier screening recommended</div>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '13px', color: '#374151', lineHeight: 1.8 }}>
          <li><strong>Black / African American ancestry</strong></li>
          <li><strong>First-degree family history</strong> of prostate cancer</li>
          <li><strong>Germline mutations</strong> — BRCA1, BRCA2, ATM, Lynch Syndrome</li>
        </ul>
      </div>

      {/* Disclaimer */}
      <p style={{ margin: '0 0 20px', fontSize: '12px', color: '#6b7280', lineHeight: 1.6, fontStyle: 'italic' }}>
        ePSA is built on Mount Sinai patient data but its recommendations align with AUA/NCCN guidelines. When ePSA deviates from standard guidelines, a clear notice is shown on your results page.
      </p>

      <button
        type="button"
        onClick={onClose}
        style={{
          width: '100%', padding: '12px', borderRadius: '10px',
          background: '#1e3a5f', color: '#fff', fontWeight: 700, fontSize: '15px',
          border: 'none', cursor: 'pointer',
        }}
      >
        Got it — start assessment
      </button>
    </div>
  </div>
);

const WelcomeScreen = ({ onBegin, onBeginLocal, onBeginCloud, onImport, onQuickEntry, formData, cloudAvailable }) => {
  const [showForm, setShowForm] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir(i18n.resolvedLanguage || i18n.language) === 'rtl';

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
      {showGuidelines && <GuidelinesModal onClose={() => setShowGuidelines(false)} />}

      {/* ── Hero ── */}
      <section className="ws-hero">
        <div className="ws-hero-layout">
          <div className="ws-hero-main">
            <h1 className="ws-hero-title">
              {t('welcome.heroTitle')}
            </h1>
            <p className="ws-hero-body">
              {t('welcome.heroDescription')}
            </p>

            {/* CTA */}
            <div className="ws-cta">
              {showStorageChoice ? (
                <div className="ws-storage-choice">
                  <button type="button" className="ws-btn-primary" onClick={onBeginCloud}>
                    <span>{t('welcome.storageCloudTitle')}</span>
                    <span className="ws-btn-sub">{t('welcome.storageCloudSub')}</span>
                    <ArrowRightIcon size={18} />
                  </button>
                  <button type="button" className="ws-btn-ghost" onClick={onBeginLocal}>
                    <span>{t('welcome.storageDeviceOnlyTitle')}</span>
                    <span className="ws-btn-sub ws-btn-sub-ghost">{t('welcome.storageDeviceOnlySub')}</span>
                  </button>
                </div>
              ) : (
                <button className="ws-btn-primary" onClick={handleBegin}>
                  <span>{t('welcome.startAssessment')}</span>
                  <ArrowRightIcon size={18} />
                </button>
              )}
              <p className="ws-cta-note">
                {t('welcome.featureTime')} · {t('welcome.trustNoAccount')} · {t('welcome.featurePrivate')}
              </p>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginTop: '2px' }}>
                <button
                  type="button"
                  className="ws-demo-link"
                  onClick={() => setShowGuidelines(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <BookOpenIcon size={13} />
                  <span>View screening guidelines</span>
                </button>
                <a href="/demo" className="ws-demo-link">
                  <PlayIcon size={13} />
                  <span>Watch demo</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── What is PSA? (education block) ── */}
      <section className="ws-psa-intro" aria-labelledby="ws-psa-intro-title">
        <div className="ws-psa-intro-kicker">
          <InfoIcon size={13} aria-hidden="true" />
          <span>{t('welcome.psaIntro.kicker')}</span>
        </div>
        <h2 id="ws-psa-intro-title" className="ws-psa-intro-title">
          {t('welcome.psaIntro.heading')}
        </h2>
        <p className="ws-psa-intro-body">
          {t('welcome.psaIntro.body')}
        </p>
        <div className="ws-psa-intro-nudge" role="note">
          <AlertCircleIcon size={14} aria-hidden="true" />
          <span>{t('welcome.psaIntro.seeDoctorNudge')}</span>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="ws-flow">
        <div className="ws-flow-step">
          <span className="ws-flow-num">1</span>
          <div>
            <strong>{t('welcome.flow.step1Title')}</strong>
            <span> — {t('welcome.flow.step1Body')}</span>
          </div>
        </div>
        <div className="ws-flow-connector" aria-hidden="true" />
        <div className="ws-flow-step">
          <span className="ws-flow-num">2</span>
          <div>
            <strong>{t('welcome.flow.step2Title')}</strong>
            <span> — {t('welcome.flow.step2Body')}</span>
          </div>
        </div>
        <div className="ws-flow-connector" aria-hidden="true" />
        <div className="ws-flow-step">
          <span className="ws-flow-num">3</span>
          <div>
            <strong>{t('welcome.flow.step3Title')}</strong>
            <span> — {t('welcome.flow.step3Body')}</span>
          </div>
        </div>
      </section>

      {/* ── Secondary actions ── */}
      <div className="ws-secondary-wrap">
        <div className="ws-secondary">
          {onImport && (
            <button type="button" className="ws-btn-text" onClick={onImport}>
              <UploadIcon size={14} />
              <span>{t('welcome.importPreviousSession')}</span>
            </button>
          )}
          {onQuickEntry && (
            <button type="button" className="ws-btn-text" onClick={onQuickEntry}>
              <UploadIcon size={14} />
              <span>{t('welcome.quickEntry')}</span>
            </button>
          )}
          <button type="button" className="ws-btn-text" onClick={() => setShowForm(true)}>
            <FileTextIcon size={14} />
            <span title={t('welcome.viewPrintableFormTitle')}>{t('welcome.viewPrintableForm')}</span>
          </button>
        </div>
        <ShareQrCode
          className="ws-qr ws-qr-right"
          url={import.meta.env.VITE_PUBLIC_APP_URL}
          title="Scan QR to open ePSA"
          subtitle="Click QR or URL to open."
          size={132}
          clickable
        />
      </div>

      {/* ── Footer strip ── */}
      <footer className="ws-footer">
        <span className="ws-footer-inst">
          {t('welcome.footerInstitution')}
        </span>
        <span className="ws-footer-sep" aria-hidden="true">·</span>
        <span className="ws-footer-guidelines">{t('welcome.footerGuidelines')}</span>
        <p className="ws-footer-disclaimer">
          {t('welcome.footerDisclaimer')}
        </p>
      </footer>

    </div>
  );
};

export default WelcomeScreen;
