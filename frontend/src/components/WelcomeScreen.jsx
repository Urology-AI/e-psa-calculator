import React, { useState } from 'react';
import './WelcomeScreen.css';
import PrintableForm from './PrintableForm';
import { ArrowRightIcon, UploadIcon, FileTextIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ShareQrCode from './ShareQrCode';
import './ShareQrCode.css';

const WelcomeScreen = ({ onBegin, onBeginLocal, onBeginCloud, onImport, onQuickEntry, formData, cloudAvailable }) => {
  const [showForm, setShowForm] = useState(false);
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
            </div>
          </div>
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
