import React, { useState } from 'react';
import './QuickEpsaResult.css';
import RiskGauge from './RiskGauge';
import { submitToRedcap } from '../utils/redcapSubmit';

function mapRawScoreToGaugePercent(raw, max, fallback) {
  if (!Number.isFinite(raw) || !Number.isFinite(max) || max <= 0) return fallback;
  const c = Math.max(0, Math.min(max, raw));
  if (c <= 10) return Math.round((c / 10) * 33);
  if (c <= 17) return Math.round(34 + ((c - 11) / 6) * 32);
  return Math.round(67 + ((c - 18) / Math.max(1, max - 18)) * 33);
}

function ConsentPanel({ answers, engineResult, onDone }) {
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | submitting | done | error

  async function handleSubmit() {
    if (!agreed) return;
    setStatus('submitting');
    const res = await submitToRedcap(answers, engineResult);
    setStatus(res.success ? 'done' : 'error');
    if (res.success) setTimeout(onDone, 1800);
  }

  if (status === 'done') {
    return (
      <div className="qer-consent-panel qer-consent-panel--done">
        <div className="qer-consent-done-icon">✓</div>
        <div className="qer-consent-done-msg">Thank you — your data has been submitted to the Mount Sinai research database.</div>
      </div>
    );
  }

  return (
    <div className="qer-consent-panel">
      <div className="qer-consent-header">Help advance prostate cancer research</div>
      <p className="qer-consent-body">
        With your permission, your anonymous screening responses will be added to the Mount Sinai
        Department of Urology research database (<strong>STUDY-14-00050</strong> — <em>A Continuous Database of
        Genitourinary Cancer Patients</em>, PI: Ash Tewari MD). No name, address, or contact
        information is stored. Participation is voluntary and will not affect your care.
      </p>
      <label className="qer-consent-check">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
        />
        <span>I agree to share my anonymous screening data for research (STUDY-14-00050)</span>
      </label>
      {status === 'error' && (
        <p className="qer-consent-error">Submission failed — please let a staff member know.</p>
      )}
      <button
        className={`qer-consent-btn ${agreed ? 'qer-consent-btn--ready' : ''}`}
        disabled={!agreed || status === 'submitting'}
        onClick={handleSubmit}
        type="button"
      >
        {status === 'submitting' ? 'Submitting…' : 'Contribute My Data →'}
      </button>
      <button className="qer-consent-skip" onClick={onDone} type="button">
        No thanks
      </button>
    </div>
  );
}

export default function QuickEpsaResult({ result, onReset }) {
  const { engineResult, answers } = result;
  const { epsaTierKey, epsaTierLabel, psaRecommendMessage, recommendPSA,
          calculationDetails, score } = engineResult;

  const [consentDone, setConsentDone] = useState(false);

  const rawScore  = Number(calculationDetails?.rawScore);
  const maxScore  = Number(calculationDetails?.maxScore);
  const gaugeScore = mapRawScoreToGaugePercent(rawScore, maxScore, score);

  const psaMessage = psaRecommendMessage ||
    (recommendPSA
      ? 'A PSA test is recommended. Please speak with your physician.'
      : 'Your ePSA score is below the recommendation threshold. Follow standard age-based screening guidance.');

  const bannerColor  = recommendPSA ? '#b45309' : '#16a34a';
  const bannerBg     = recommendPSA ? '#fffbeb' : '#f0fdf4';
  const bannerBorder = recommendPSA ? '#fde68a' : '#bbf7d0';

  function handleFullFlow() {
    window.location.href = window.location.origin + window.location.pathname;
  }

  return (
    <div className="qer-wrap">
      <header className="qer-header">
        <div className="qer-header-brand">Quick ePSA</div>
        <div className="qer-header-sub">Your Results</div>
      </header>

      <div className="qer-body">

        <div className="qer-gauge-card">
          <RiskGauge score={gaugeScore} tierKey={epsaTierKey} tierLabel={epsaTierLabel} />
        </div>

        <div
          className="qer-psa-banner"
          style={{ background: bannerBg, borderColor: bannerBorder, color: bannerColor }}
        >
          <div className="qer-psa-banner-label">PSA Testing Recommendation</div>
          <p className="qer-psa-banner-msg">{psaMessage}</p>
        </div>

        <div className="qer-disclaimer">
          Results are for educational use only and do not replace evaluation by a physician.
          Based on AUA/SUO 2026 screening guidelines.
        </div>

        {!consentDone
          ? <ConsentPanel answers={answers} engineResult={engineResult} onDone={() => setConsentDone(true)} />
          : null
        }

        <div className="qer-actions">
          <button className="qer-full-btn" onClick={handleFullFlow} type="button">
            Continue to Full ePSA →
          </button>
          <button className="qer-reset-btn" onClick={onReset} type="button">
            Start Over
          </button>
        </div>

      </div>
    </div>
  );
}
