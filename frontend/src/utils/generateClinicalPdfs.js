/**
 * Programmatic jsPDF generators for:
 *   1. QR Code Poster  — generateQrPosterPdf()
 *   2. Clinical Screening Form — generateClinicalFormPdf()
 *
 * Both produce a single letter-size (612 × 792 pt) page.
 */

import QRCode from 'qrcode';
import jsPDF from 'jspdf';

// ── Brand palette ──────────────────────────────────────────────────────────
const NAVY   = [33,  32, 112];   // #212070 MS navy
const CYAN   = [6,  171, 235];   // #06ABEB MS cyan
const DARK   = [0,    0,  45];   // #00002D near-black
const GRAY   = [110, 110, 119];  // #6E6E77
const LGRAY  = [232, 232, 234];  // #E8E8EA line colour
const WHITE  = [255, 255, 255];
const CYANLT = [232, 247, 253];  // #E8F7FD cyan-10

const APP_URL = (() => {
  if (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_PUBLIC_APP_URL)
    return `${import.meta.env.VITE_PUBLIC_APP_URL.replace(/\/$/, '')}/?mode=bus`;
  if (typeof window !== 'undefined' && window?.location?.origin) {
    const o = window.location.origin;
    if (!o.includes('localhost') && !o.includes('127.0.0.1')) return `${o}/?mode=bus`;
  }
  return 'https://epsa.millionstrongmen.com/?mode=bus';
})();

// ── Helpers ────────────────────────────────────────────────────────────────

async function loadImageAsDataUrl(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

function setColor(doc, rgb, type = 'text') {
  if (type === 'text') doc.setTextColor(...rgb);
  else if (type === 'fill') doc.setFillColor(...rgb);
  else doc.setDrawColor(...rgb);
}

// Draw a filled rounded rectangle
function roundRect(doc, x, y, w, h, r, fillRgb, strokeRgb) {
  if (fillRgb) { setColor(doc, fillRgb, 'fill'); }
  if (strokeRgb) { setColor(doc, strokeRgb, 'draw'); }
  const style = fillRgb && strokeRgb ? 'FD' : fillRgb ? 'F' : 'S';
  doc.roundedRect(x, y, w, h, r, r, style);
}

// Draw a radio circle + label
function radioOption(doc, x, y, label, r = 3.5) {
  setColor(doc, LGRAY, 'draw');
  doc.setLineWidth(0.8);
  doc.circle(x + r, y - r * 0.4, r, 'S');
  setColor(doc, DARK, 'text');
  doc.text(label, x + r * 2 + 4, y);
}

// Draw a text input underline
function inputLine(doc, x, y, w) {
  setColor(doc, LGRAY, 'draw');
  doc.setLineWidth(0.75);
  doc.line(x, y, x + w, y);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. QR POSTER
// ─────────────────────────────────────────────────────────────────────────────
export async function generateQrPosterPdf() {
  const doc = new jsPDF('portrait', 'pt', 'letter');
  const W = 612, H = 792;

  const [logoData, qrData] = await Promise.all([
    loadImageAsDataUrl('/sinai_dark.png'),
    QRCode.toDataURL(APP_URL, {
      width: 600, margin: 1, errorCorrectionLevel: 'H',
      color: { dark: '#212070', light: '#ffffff' },
    }),
  ]);

  // ── Navy header band ──────────────────────────────────────────────────────
  setColor(doc, NAVY, 'fill');
  doc.rect(0, 0, W, 152, 'F');

  if (logoData) {
    // Inverted logo (white) on navy — draw and tint white via blend
    doc.addImage(logoData, 'PNG', 30, 16, 108, 36);
  }

  setColor(doc, WHITE, 'text');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('MILLION STRONG MEN INITIATIVE', W / 2, 24, { align: 'center' });

  doc.setFontSize(56);
  doc.text('ePSA', W / 2, 88, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.text('Electronic Prostate Specific Awareness', W / 2, 112, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255, 0.65);
  doc.text('Tewari Lab · Icahn School of Medicine at Mount Sinai', W / 2, 132, { align: 'center' });

  // Thin accent line at bottom of header
  setColor(doc, CYAN, 'fill');
  doc.rect(0, 148, W, 4, 'F');

  // ── Headline ──────────────────────────────────────────────────────────────
  setColor(doc, DARK, 'text');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('Free Prostate Cancer Screening', W / 2, 186, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  setColor(doc, GRAY, 'text');
  doc.text('Take our 12-question risk assessment — it takes about 1 minute.', W / 2, 208, { align: 'center' });

  // ── QR code ───────────────────────────────────────────────────────────────
  const QR = 210;
  const qx = (W - QR) / 2, qy = 228;

  // White card with subtle border
  roundRect(doc, qx - 16, qy - 16, QR + 32, QR + 32, 12, WHITE, LGRAY);
  doc.addImage(qrData, 'PNG', qx, qy, QR, QR);

  // ── Scan label ────────────────────────────────────────────────────────────
  setColor(doc, NAVY, 'text');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Scan with your phone camera to begin', W / 2, 476, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setColor(doc, GRAY, 'text');
  doc.text(APP_URL, W / 2, 494, { align: 'center' });

  // ── Services strip ────────────────────────────────────────────────────────
  const SY = 514;
  setColor(doc, CYANLT, 'fill');
  doc.rect(0, SY, W, 44, 'F');
  setColor(doc, [194, 234, 250], 'draw');
  doc.setLineWidth(0.75);
  doc.line(0, SY, W, SY);
  doc.line(0, SY + 44, W, SY + 44);

  setColor(doc, [5, 144, 199], 'text');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PSA Blood Test   ·   Bladder Health Scan   ·   Nurse Consultation', W / 2, SY + 27, { align: 'center' });

  // ── Footer ────────────────────────────────────────────────────────────────
  const FY = 578;
  setColor(doc, DARK, 'text');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Walk-ins welcome · No appointment needed', W / 2, FY, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Questions? Call 646-531-8092', W / 2, FY + 20, { align: 'center' });

  // Thin rule
  setColor(doc, LGRAY, 'draw');
  doc.setLineWidth(0.5);
  doc.line(72, FY + 34, W - 72, FY + 34);

  // ── Disclaimer ────────────────────────────────────────────────────────────
  setColor(doc, GRAY, 'text');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    'ePSA is a free screening aid developed by the Tewari Lab, Icahn School of Medicine at Mount Sinai. Available to all. Not a diagnosis — results should be discussed with a physician.',
    W / 2, FY + 50, { align: 'center', maxWidth: 480 },
  );
  doc.text('AUA/SUO 2026 · NCCN 2024 · Mount Sinai IRB Study STUDY-14-00050', W / 2, FY + 62, { align: 'center' });

  // ── Bottom institution strip ───────────────────────────────────────────────
  setColor(doc, NAVY, 'fill');
  doc.rect(0, H - 30, W, 30, 'F');
  setColor(doc, WHITE, 'text');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Developed by Dr. Ashutosh K. Tewari and team · Tewari Lab, Icahn School of Medicine at Mount Sinai', W / 2, H - 11, { align: 'center' });

  doc.save('ePSA-QR-Poster.pdf');
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CLINICAL SCREENING FORM
// ─────────────────────────────────────────────────────────────────────────────
export async function generateClinicalFormPdf() {
  const doc = new jsPDF('portrait', 'pt', 'letter');
  const W = 612, H = 792;
  const ML = 36, MR = 36;  // margins
  const CW = (W - ML - MR - 24) / 2;  // column width (gap = 24)
  const COL_R = ML + CW + 24;           // right column x

  const [logoData, qrData] = await Promise.all([
    loadImageAsDataUrl('/sinai_dark.png'),
    QRCode.toDataURL(APP_URL, {
      width: 200, margin: 1, errorCorrectionLevel: 'M',
      color: { dark: '#212070', light: '#ffffff' },
    }),
  ]);

  // ── Navy header band ──────────────────────────────────────────────────────
  setColor(doc, NAVY, 'fill');
  doc.rect(0, 0, W, 72, 'F');
  setColor(doc, CYAN, 'fill');
  doc.rect(0, 68, W, 4, 'F');

  if (logoData) doc.addImage(logoData, 'PNG', ML, 14, 90, 30);

  setColor(doc, WHITE, 'text');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('ePSA Clinical Screening Form', W / 2, 34, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Quick-Entry Prostate Cancer Risk Assessment · Tewari Lab, Icahn School of Medicine at Mount Sinai', W / 2, 52, { align: 'center' });

  // ── Patient info bar ──────────────────────────────────────────────────────
  const PIY = 78;
  setColor(doc, [245, 245, 247], 'fill');
  doc.rect(0, PIY, W, 28, 'F');
  setColor(doc, LGRAY, 'draw');
  doc.setLineWidth(0.5);
  doc.line(0, PIY + 28, W, PIY + 28);

  setColor(doc, DARK, 'text');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Patient / Participant:', ML, PIY + 11);
  inputLine(doc, ML + 92, PIY + 13, 140);

  doc.text('Date:', ML + 250, PIY + 11);
  inputLine(doc, ML + 268, PIY + 13, 80);

  doc.text('Clinician:', ML + 370, PIY + 11);
  inputLine(doc, ML + 408, PIY + 13, 90);

  // QR code (small, top-right corner of header region) — for patients to scan
  const QR_SM = 50;
  doc.addImage(qrData, 'PNG', W - MR - QR_SM, PIY + 33, QR_SM, QR_SM);
  setColor(doc, GRAY, 'text');
  doc.setFontSize(6);
  doc.text('Scan to use\non your phone', W - MR - QR_SM - 2, PIY + 46, { align: 'right' });

  // ── Layout helpers ────────────────────────────────────────────────────────
  const OPT_INDENT = 8;
  const OPT_H = 11;     // height per option line
  const Q_GAP = 7;      // gap between questions
  const SEC_H = 16;     // section header height
  const Q_LABEL_H = 11; // question label height
  const INPUT_H = 16;   // height of a text input field

  // Section label
  function sectionLabel(x, y, text) {
    setColor(doc, NAVY, 'fill');
    doc.rect(x, y, CW, SEC_H, 'F');
    setColor(doc, WHITE, 'text');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(text.toUpperCase(), x + 4, y + 10.5);
    return y + SEC_H + 4;
  }

  // Question with options (vertical list of radio buttons)
  function question(x, y, num, label, options) {
    setColor(doc, DARK, 'text');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`${num}.`, x, y);
    doc.text(label, x + 12, y);

    setColor(doc, DARK, 'text');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    let oy = y + Q_LABEL_H + 1;
    for (const opt of options) {
      radioOption(doc, x + OPT_INDENT, oy, opt);
      oy += OPT_H;
    }
    return oy + Q_GAP;
  }

  // Question with text input line
  function questionInput(x, y, num, label, placeholder = '') {
    setColor(doc, DARK, 'text');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`${num}.`, x, y);
    doc.text(label, x + 12, y);

    if (placeholder) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      setColor(doc, GRAY, 'text');
      doc.text(placeholder, x + OPT_INDENT, y + Q_LABEL_H + 3);
    }
    inputLine(doc, x + OPT_INDENT, y + Q_LABEL_H + INPUT_H, CW - OPT_INDENT - 4);
    return y + Q_LABEL_H + INPUT_H + Q_GAP + 4;
  }

  // ── LEFT COLUMN ───────────────────────────────────────────────────────────
  let ly = 114;

  ly = sectionLabel(ML, ly, 'About You');

  ly = questionInput(ML, ly, 1, 'Age', 'years (18 – 99)');

  ly = question(ML, ly, 2, 'Race / Ethnicity', [
    'Black / African American',
    'American Indian / Alaska Native',
    'Asian',
    'Native Hawaiian / Pacific Islander',
    'White',
    'Unknown / Prefer not to say',
  ]);

  ly = question(ML, ly, '2b', 'Hispanic / Latino origin', [
    'Yes — Hispanic / Latino',
    'Not Hispanic / Latino',
    'Unknown',
  ]);

  ly = sectionLabel(ML, ly, 'Family & Genetic Risk');

  ly = question(ML, ly, 3, 'First-degree family history of prostate cancer', [
    'No first-degree relatives',
    'One first-degree relative',
    'Two or more relatives',
    'Unknown',
  ]);

  ly = question(ML, ly, 12, 'Germline / BRCA genetic mutation', [
    'No known mutation',
    'Yes — BRCA1, BRCA2, ATM, Lynch, or other',
    'Unknown / Not tested',
  ]);

  ly = sectionLabel(ML, ly, 'Body Measurements');

  ly = questionInput(ML, ly, 5, 'Height', '_____ ft  _____ in    OR    _____ cm');
  questionInput(ML, ly, 6, 'Weight', '_____ lbs    OR    _____ kg');

  // ── RIGHT COLUMN ──────────────────────────────────────────────────────────
  let ry = 114;

  ry = sectionLabel(COL_R, ry, 'Urinary Symptoms');

  ry = question(COL_R, ry, 4, 'Urinary quality of life (IPSS-QoL)', [
    '0 — Delighted',
    '1 — Pleased',
    '2 — Mostly satisfied',
    '3 — Mixed feelings',
    '4 — Mostly dissatisfied',
    '5 — Unhappy',
    '6 — Terrible',
  ]);

  ry = sectionLabel(COL_R, ry, 'Lifestyle');

  ry = question(COL_R, ry, 7, 'Exercise frequency', [
    'Regular (≥ 3×/week)',
    'Some (1 – 2×/week)',
    'Little or none',
  ]);

  ry = question(COL_R, ry, 8, 'Smoking history', [
    'Never smoked',
    'Former smoker',
    'Current smoker',
  ]);

  ry = question(COL_R, ry, 9, 'Dietary pattern', [
    'Western',
    'Mediterranean',
    'Indian / South Asian',
    'DASH',
    'Plant-based / Vegan',
    'Pescatarian',
    'Low-carb / Keto',
    'Other',
  ]);

  ry = sectionLabel(COL_R, ry, 'Health History');

  ry = question(COL_R, ry, 10, 'Major comorbidities (HTN, hyperlipidemia, CAD, DM)', [
    'None',
    'One condition',
    'Two or more',
  ]);

  question(COL_R, ry, 11, 'Erectile function — SHIM/IIEF-5', [
    'Severe dysfunction',
    'Moderate dysfunction',
    'Mild-to-moderate',
    'Mild dysfunction',
    'No dysfunction',
  ]);

  // ── Vertical divider between columns ─────────────────────────────────────
  setColor(doc, LGRAY, 'draw');
  doc.setLineWidth(0.5);
  doc.line(ML + CW + 12, 114, ML + CW + 12, H - 32);

  // ── Footer ────────────────────────────────────────────────────────────────
  setColor(doc, NAVY, 'fill');
  doc.rect(0, H - 24, W, 24, 'F');
  setColor(doc, WHITE, 'text');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(
    'Educational use only · Not a substitute for physician evaluation · AUA/SUO 2026 · NCCN 2024 · epsa.millionstrongmen.com',
    W / 2, H - 8, { align: 'center' },
  );

  doc.save('ePSA-Clinical-Screening-Form.pdf');
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CLINICAL RESULTS LETTER
// ─────────────────────────────────────────────────────────────────────────────
export async function generateResultsLetterPdf(preResult, postResult, preData, postData) {
  const doc = new jsPDF('portrait', 'pt', 'letter');
  const W = 612, H = 792;
  const ML = 48, MR = 48;
  const CW = W - ML - MR;

  const logoData = await loadImageAsDataUrl('/sinai_dark.png');
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const age = Number(preResult?.age || preData?.age) || 0;
  const race = preData?.race || preResult?.race || null;
  const bmi = preResult?.bmi ?? preData?.bmi;
  const fhBinary = preResult?.fhBinary ?? 0;
  const isBlack = !!preResult?.isBlack;
  const brcaStatus = preResult?.brcaStatus;
  const brcaPositive = ['yes','positive','lynch','other_elevated','other_unknown'].includes(brcaStatus);

  // ── Header ─────────────────────────────────────────────────────────────────
  setColor(doc, NAVY, 'fill');
  doc.rect(0, 0, W, 72, 'F');
  setColor(doc, CYAN, 'fill');
  doc.rect(0, 68, W, 4, 'F');

  if (logoData) doc.addImage(logoData, 'PNG', ML, 14, 90, 30);

  setColor(doc, WHITE, 'text');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Prostate Cancer Risk Assessment Report', W / 2, 32, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`ePSA · Tewari Lab, Icahn School of Medicine at Mount Sinai · Generated ${dateStr}`, W / 2, 52, { align: 'center' });

  // ── Patient profile bar ───────────────────────────────────────────────────
  setColor(doc, [245, 245, 247], 'fill');
  doc.rect(0, 72, W, 30, 'F');
  setColor(doc, LGRAY, 'draw');
  doc.setLineWidth(0.5);
  doc.line(0, 102, W, 102);

  setColor(doc, DARK, 'text');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const profileParts = [
    age ? `Age: ${age}` : null,
    race ? `Race: ${race}` : null,
    bmi ? `BMI: ${Number(bmi).toFixed(1)}` : null,
    `Family History: ${fhBinary === 1 ? 'Yes' : 'No'}`,
    brcaPositive ? 'Genetic Mutation: Reported' : null,
    isBlack ? 'Black/AA Ancestry' : null,
  ].filter(Boolean).join('   ·   ');
  doc.text(profileParts, ML, 91);

  let y = 116;

  // ── Layout helpers ─────────────────────────────────────────────────────────
  function sectionHdr(label) {
    setColor(doc, NAVY, 'fill');
    doc.rect(ML, y, CW, 17, 'F');
    setColor(doc, WHITE, 'text');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(label.toUpperCase(), ML + 6, y + 11.5);
    y += 22;
  }

  function row(label, value, valueRgb) {
    setColor(doc, GRAY, 'text');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(label, ML + 6, y);
    if (valueRgb) setColor(doc, valueRgb, 'text');
    else setColor(doc, DARK, 'text');
    doc.setFont('helvetica', 'bold');
    const lines = doc.splitTextToSize(String(value ?? '—'), CW - 150);
    doc.text(lines, ML + 150, y);
    setColor(doc, LGRAY, 'draw');
    doc.setLineWidth(0.35);
    doc.line(ML, y + 5, ML + CW, y + 5);
    y += lines.length * 11 + 4;
  }

  function bullet(text, ticked) {
    const mark = ticked ? '✓' : '○';
    const markColor = ticked ? NAVY : LGRAY;
    setColor(doc, markColor, 'text');
    doc.setFont('helvetica', ticked ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.text(mark, ML + 6, y);
    setColor(doc, DARK, 'text');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(text, CW - 22);
    doc.text(lines, ML + 18, y);
    y += lines.length * 11 + 3;
  }

  function para(text, sz, rgb) {
    setColor(doc, rgb || GRAY, 'text');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(sz || 8);
    const lines = doc.splitTextToSize(text, CW - 8);
    doc.text(lines, ML + 4, y);
    y += lines.length * (sz || 8) * 1.4 + 3;
  }

  // ── Part 1 ─────────────────────────────────────────────────────────────────
  sectionHdr('Part 1 — Pre-PSA Risk Assessment');

  const RISK_LABELS = {
    LOWER: 'Low', MODERATE: 'Moderate', HIGHER: 'High',
    PSA_RECOMMENDED: 'Elevated', PSA_NOT_RECOMMENDED: 'Low',
  };
  const PSA_REC_LABELS = {
    high_risk_early_screening: 'Recommended — High-Risk Profile (AUA/SUO 2026 Stmt 5)',
    family_history_override:   'Recommended — Family History (AUA/SUO 2026 Stmt 5)',
    score_threshold:           'Recommended — ePSA Score Exceeds Screening Threshold',
    age_guideline_50_69:       'Recommended — Age 50–69 Routine Screening (AUA/SUO 2026 Stmt 6)',
    baseline_psa_45_50:        'Baseline PSA Discussion Recommended (AUA/SUO 2026 Stmt 4)',
    not_recommended:           'Not Currently Recommended',
    low_risk_followup:         'Not Currently Recommended — Follow Routine Age-Based Guidance',
  };

  const score = preResult?.score;
  const riskLabel = RISK_LABELS[preResult?.risk] || preResult?.risk || '—';
  const recLabel = PSA_REC_LABELS[preResult?.psaRecommendReason]
    || (preResult?.recommendPSA ? 'Recommended' : 'Not Recommended');
  const recColor = preResult?.recommendPSA ? NAVY : [22, 101, 52];

  row('ePSA Score', score != null ? `${score}%` : '—');
  row('Risk Tier', riskLabel);
  row('PSA Recommendation', recLabel, recColor);
  y += 4;

  // ── Part 2 ─────────────────────────────────────────────────────────────────
  if (postResult) {
    sectionHdr('Part 2 — Combined Risk Assessment  (PSA + ePSA)');

    const psaVal = postResult.psaAdjusted ?? postResult.psaValue;
    const psaDisplay = psaVal != null
      ? `${psaVal} ng/mL${postResult.psaAdjustedFlag ? ' (×2 — 5-ARI adjusted)' : ''}`
      : '—';

    const auaThreshold = age < 50 ? 2.5 : age < 60 ? 3.5 : age < 70 ? 4.5 : 6.5;
    const ageLabel = age < 50 ? '40–49' : age < 60 ? '50–59' : age < 70 ? '60–69' : '70+';
    const psaAbove = psaVal != null && parseFloat(psaVal) >= auaThreshold;

    row('PSA Value', psaDisplay);
    row(
      `AUA Threshold (Age ${ageLabel})`,
      `${auaThreshold} ng/mL — ${psaAbove ? 'ABOVE THRESHOLD' : 'Below threshold'}`,
      psaAbove ? [180, 83, 9] : [21, 128, 61],
    );

    const piradsVal = postData?.knowPirads ? (postData?.pirads ?? null) : null;
    if (piradsVal) {
      const piradsLabels = { 1: 'Very low', 2: 'Low', 3: 'Equivocal', 4: 'Likely', 5: 'Very high' };
      row('MRI PI-RADS', `${piradsVal} — ${piradsLabels[piradsVal] || ''} (PI-RADS v2.1)`);
    }

    const TIER_DISPLAY = {
      'low':              'Low  (< 1.0 ng/mL equivalent)',
      'intermediate-low': 'Intermediate-Low  (1.0–2.9 ng/mL equivalent)',
      'intermediate-high':'Intermediate-High  (3.0–9.9 ng/mL equivalent)',
      'high':             'High  (≥ 10.0 ng/mL equivalent)',
    };
    const tierRgb = postResult.epsaTierKey === 'high' ? [192, 57, 43]
                  : postResult.epsaTierKey === 'intermediate-high' ? [180, 83, 9]
                  : NAVY;
    row('Combined Risk Tier', TIER_DISPLAY[postResult.epsaTierKey] || postResult.riskCat || '—', tierRgb);
    y += 4;

    // ── Clinical recommendations ─────────────────────────────────────────────
    sectionHdr('Clinical Recommendations');

    const BIOPSY_MSG = {
      pirads_5: 'Biopsy recommended — PI-RADS 5 finding (AUA/NCCN/EAU: prompt discussion without delay)',
      pirads_4: 'Biopsy discussion recommended — PI-RADS 4 finding (AUA/NCCN/EAU 2026)',
      combined_score_high: 'Biopsy discussion recommended — Combined risk score high (AUA/NCCN/EAU 2026)',
      high_risk_discordance: 'Biopsy discussion recommended — ePSA risk significantly exceeds PSA tier (AUA 2026)',
    };
    const MRI_MSG = {
      psa_elevated: 'mpMRI recommended before biopsy — PSA ≥ 4.0 ng/mL (AUA 2026 Stmt 13, Conditional Grade A)',
      combined_risk_elevated: 'mpMRI recommended — Combined ePSA + PSA risk elevated (AUA/NCCN/EAU 2026)',
      high_risk_profile: 'mpMRI recommended — High-risk profile at PSA ≥ 2.5 ng/mL (AUA/NCCN 2026)',
      discordance: 'mpMRI recommended — ePSA profile significantly exceeds PSA tier (AUA/NCCN 2026)',
    };

    if (postResult.biopsyRecommended) {
      bullet(BIOPSY_MSG[postResult.biopsyReason] || 'Biopsy discussion recommended', true);
    }
    if (postResult.mriRecommended) {
      bullet(MRI_MSG[postResult.mriRecommendReason] || 'mpMRI recommended', true);
    }
    if (!postResult.biopsyRecommended && !postResult.mriRecommended) {
      bullet('Continue monitoring per standard guidelines. Repeat PSA per AUA/SUO 2026 interval guidance.');
    }
    if (postResult.lowPsaWarning) {
      bullet('Low PSA Warning: Low PSA does not rule out risk given high-risk profile features. Urology evaluation is recommended regardless of PSA value.', true);
    }
    if (postResult.discordanceFlag?.direction === 'epsa_higher') {
      const sev = postResult.discordanceFlag.severity;
      bullet(`Discordance: ePSA combined risk (${postResult.riskCat}) is ${sev === 'orange' ? 'significantly' : 'moderately'} higher than PSA level alone suggests. Individual risk factors may not be captured by PSA alone.`);
    }
    y += 4;
  }

  // ── Disclaimer ─────────────────────────────────────────────────────────────
  sectionHdr('Important Notice');
  para(
    'This report is generated by ePSA, a clinical decision support tool developed by the Tewari Lab at the Icahn School of Medicine at Mount Sinai. It is intended for use by healthcare providers and is NOT a medical diagnosis. All results must be reviewed in the context of the individual patient\'s clinical presentation, examination findings, and physician judgment. Clinical decisions should not be made based solely on this report.',
    7.5,
  );
  para(
    'Guideline references: AUA/SUO 2026 Early Detection Guidelines · NCCN Prostate Cancer Early Detection v2024 · EAU Guidelines on Prostate Cancer 2024 · IRB Study STUDY-14-00050 · epsa.millionstrongmen.com',
    7,
  );

  // ── Footer ─────────────────────────────────────────────────────────────────
  setColor(doc, NAVY, 'fill');
  doc.rect(0, H - 24, W, 24, 'F');
  setColor(doc, WHITE, 'text');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(
    'ePSA · Tewari Lab · Icahn School of Medicine at Mount Sinai · For clinical use only · Not a medical diagnosis · epsa.millionstrongmen.com',
    W / 2, H - 8, { align: 'center' },
  );

  doc.save(`ePSA-Results-Letter-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SDM WORKSHEET
// ─────────────────────────────────────────────────────────────────────────────
export async function generateSdmWorksheetPdf(preResult, preData, postResult) {
  const doc = new jsPDF('portrait', 'pt', 'letter');
  const W = 612, H = 792;
  const ML = 48, MR = 48;
  const CW = W - ML - MR;
  const COL2_W = (CW - 12) / 2;
  const COL2_R = ML + COL2_W + 12;

  const logoData = await loadImageAsDataUrl('/sinai_dark.png');
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const age = Number(preResult?.age || preData?.age) || 0;
  const fhBinary = preResult?.fhBinary ?? 0;
  const isBlack = !!preResult?.isBlack;
  const brcaStatus = preResult?.brcaStatus;
  const brcaPositive = ['yes','positive','lynch','other_elevated','other_unknown'].includes(brcaStatus);

  // ── Determine SDM scenario ─────────────────────────────────────────────────
  let sdmScenario, sdmGuideline, sdmRationale;
  if (age >= 75) {
    sdmScenario = 'Age 75+ — Routine Screening Generally Not Recommended';
    sdmGuideline = 'AUA/SUO 2026 Statement 7';
    sdmRationale = 'AUA/SUO 2026 does not recommend routine PSA screening for men over age 75 due to limited life-expectancy benefit in most cases. Continued screening may be appropriate for select patients with excellent health and long life expectancy — this requires individual SDM.';
  } else if (age >= 70) {
    sdmScenario = 'Age 70–75 — Shared Decision-Making Required Before Screening';
    sdmGuideline = 'AUA/SUO 2026 Statement 7';
    sdmRationale = 'For men aged 70–75, the decision to screen or continue screening must be made through SDM, weighing life expectancy (must be ≥10 years), health status, and patient preferences — not ordered reflexively.';
  } else if (age >= 40 && age < 50 && (isBlack || brcaPositive || fhBinary === 1)) {
    sdmScenario = 'Age 40–49 with High-Risk Features — Earlier Screening via SDM';
    sdmGuideline = 'AUA/SUO 2026 Statement 5';
    sdmRationale = 'Men aged 40–49 with Black ancestry, a first-degree family history of prostate cancer, or a known germline mutation (BRCA2, ATM, Lynch syndrome) may be offered earlier PSA screening via SDM per AUA/SUO 2026 Statement 5.';
  } else if (age >= 45 && age < 50) {
    sdmScenario = 'Age 45–49 — Baseline PSA Discussion';
    sdmGuideline = 'AUA/SUO 2026 Statement 4';
    sdmRationale = 'A baseline PSA measurement may be offered via SDM to men aged 45–50 to help risk-stratify future screening intervals. This is a conditional recommendation — not all men in this age group require it.';
  } else {
    sdmScenario = 'Age 50–69 — Routine Screening Period';
    sdmGuideline = 'AUA/SUO 2026 Statement 6';
    sdmRationale = 'Men aged 50–69 are in the routine PSA screening window. AUA/SUO 2026 recommends screening every 2–4 years. Patient preference and values should still be discussed and documented.';
  }

  // ── Header ─────────────────────────────────────────────────────────────────
  setColor(doc, NAVY, 'fill');
  doc.rect(0, 0, W, 68, 'F');
  setColor(doc, CYAN, 'fill');
  doc.rect(0, 64, W, 4, 'F');

  if (logoData) doc.addImage(logoData, 'PNG', ML, 12, 86, 28);

  setColor(doc, WHITE, 'text');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Shared Decision-Making Worksheet', W / 2, 30, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`ePSA · ${sdmGuideline} · Tewari Lab, Icahn School of Medicine at Mount Sinai`, W / 2, 50, { align: 'center' });

  // ── SDM indication bar ─────────────────────────────────────────────────────
  setColor(doc, [255, 251, 235], 'fill');
  doc.rect(0, 68, W, 44, 'F');
  setColor(doc, [217, 119, 6], 'draw');
  doc.setLineWidth(1);
  doc.line(0, 68, W, 68);
  doc.line(0, 112, W, 112);

  setColor(doc, [146, 64, 14], 'text');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`SDM INDICATION: ${sdmScenario}`, ML, 83);
  setColor(doc, [180, 83, 9], 'text');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const ratLines = doc.splitTextToSize(sdmRationale, CW);
  doc.text(ratLines, ML, 96);

  // ── Patient profile ────────────────────────────────────────────────────────
  setColor(doc, [245, 245, 247], 'fill');
  doc.rect(0, 112, W, 26, 'F');
  setColor(doc, LGRAY, 'draw');
  doc.setLineWidth(0.5);
  doc.line(0, 138, W, 138);

  setColor(doc, DARK, 'text');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const profileParts = [
    age ? `Age: ${age}` : null,
    preData?.race ? `Race: ${preData.race}` : null,
    `Family History: ${fhBinary === 1 ? 'Yes' : 'No'}`,
    brcaPositive ? 'Genetic Mutation: Reported' : null,
    preResult?.score != null ? `ePSA Score: ${preResult.score}%` : null,
    postResult?.riskCat ? `Combined Risk: ${postResult.riskCat}` : null,
  ].filter(Boolean).join('   ·   ');
  doc.text(profileParts, ML, 129);

  let y = 148;

  // ── Helpers ────────────────────────────────────────────────────────────────
  function secHdr(label, bgRgb) {
    setColor(doc, bgRgb || NAVY, 'fill');
    doc.rect(ML, y, CW, 15, 'F');
    setColor(doc, WHITE, 'text');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(label.toUpperCase(), ML + 5, y + 10.5);
    y += 19;
  }

  function checkBox(x, cy, text, colWidth) {
    setColor(doc, LGRAY, 'draw');
    doc.setLineWidth(0.6);
    doc.rect(x + 3, cy - 7.5, 7.5, 7.5, 'S');
    setColor(doc, DARK, 'text');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const lines = doc.splitTextToSize(text, colWidth - 16);
    doc.text(lines, x + 14, cy);
    return cy + lines.length * 10 + 3;
  }

  function inputLine(label, lineW) {
    setColor(doc, GRAY, 'text');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(label, ML + 4, y);
    y += 13;
    setColor(doc, LGRAY, 'draw');
    doc.setLineWidth(0.75);
    doc.line(ML + 4, y, ML + 4 + (lineW || CW - 8), y);
    y += 16;
  }

  // ── Benefits / Harms (two columns) ─────────────────────────────────────────
  secHdr('Benefits and Potential Harms of PSA Screening');

  const bhmY = y;

  // Left: Benefits
  setColor(doc, [21, 128, 61], 'fill');
  doc.rect(ML, bhmY, COL2_W, 13, 'F');
  setColor(doc, WHITE, 'text');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('BENEFITS', ML + 4, bhmY + 9.5);

  const BENEFITS = [
    'Early detection when cancer is most treatable (5-yr survival ~99% if localized)',
    'Stage at diagnosis localized in ~80% of screening-detected vs ~30% without',
    'Gleason ≥8 disease in ~15% of screening-detected vs ~45% without screening',
    'All treatment options available: surgery, radiation, active surveillance',
    'PSA screening reduces prostate cancer mortality by ~21% (ERSPC trial)',
  ];

  let ly = bhmY + 16;
  for (const b of BENEFITS) ly = checkBox(ML, ly, b, COL2_W);

  // Right: Harms
  setColor(doc, [153, 27, 27], 'fill');
  doc.rect(COL2_R, bhmY, COL2_W, 13, 'F');
  setColor(doc, WHITE, 'text');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('POTENTIAL HARMS', COL2_R + 4, bhmY + 9.5);

  const HARMS = [
    'False positives can lead to unnecessary biopsy (20–30% of elevated PSA)',
    'Biopsy complications: infection, bleeding, pain; serious events rare (<1%)',
    'Overdiagnosis of clinically insignificant cancers that may not need treatment',
    'Anxiety and psychological burden from uncertain or borderline results',
    'Active surveillance requires ongoing monitoring every 1–2 years if initiated',
  ];

  let ry = bhmY + 16;
  for (const h of HARMS) ry = checkBox(COL2_R, ry, h, COL2_W);

  y = Math.max(ly, ry) + 8;

  // Vertical divider
  setColor(doc, LGRAY, 'draw');
  doc.setLineWidth(0.5);
  doc.line(COL2_R - 6, bhmY, COL2_R - 6, Math.max(ly, ry));

  // ── Discussion topics ──────────────────────────────────────────────────────
  secHdr('Discussion Topics Covered During This Visit');

  const TOPICS = [
    "Patient's understanding of prostate cancer and what PSA measures",
    'Benefits of early detection (survival, treatment options) explained in lay terms',
    'Potential harms of PSA testing and biopsy explained (false positives, overdiagnosis)',
    "Patient's life expectancy and overall health status considered (especially age 70+)",
    "Patient's personal values regarding cancer risk vs. procedure risk discussed",
    'Screening interval if initiated (every 2–4 years if PSA stable per AUA/SUO 2026)',
    'Next steps if PSA elevated: MRI, biopsy, urology referral pathway explained',
    'Patient informed that declining or deferring screening is a valid choice',
  ];

  for (const t of TOPICS) {
    setColor(doc, LGRAY, 'draw');
    doc.setLineWidth(0.6);
    doc.rect(ML + 3, y - 7.5, 7.5, 7.5, 'S');
    setColor(doc, DARK, 'text');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const lines = doc.splitTextToSize(t, CW - 16);
    doc.text(lines, ML + 14, y);
    y += lines.length * 10 + 3;
  }

  y += 5;

  // ── Patient values ─────────────────────────────────────────────────────────
  secHdr('Patient Values and Preferences  (record patient\'s own words)');

  inputLine("What concerns you most about prostate cancer?");
  inputLine("What concerns you most about PSA testing or a potential biopsy?");
  inputLine("Additional questions or concerns:");

  y += 5;

  // ── Patient decision ───────────────────────────────────────────────────────
  secHdr('Patient Decision');

  const DECISIONS = [
    'Agrees to PSA screening — PSA test to be ordered today',
    'Declines PSA screening at this time — decision documented',
    'Needs more information or time — follow-up conversation planned',
  ];
  for (const d of DECISIONS) {
    setColor(doc, LGRAY, 'draw');
    doc.setLineWidth(0.6);
    doc.rect(ML + 3, y - 7.5, 7.5, 7.5, 'S');
    setColor(doc, DARK, 'text');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(d, ML + 14, y);
    y += 13;
  }
  inputLine("If declining or deferring, patient's stated reason:");
  y += 2;

  // ── Physician documentation ────────────────────────────────────────────────
  secHdr('Physician Documentation');

  setColor(doc, DARK, 'text');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Date of conversation: ${dateStr}`, ML + 4, y);
  y += 18;

  // Two-column signature lines
  const sigFields = [
    ['Physician / Provider Name:', COL2_R, 'NPI:'],
    ['Provider Signature:', COL2_R, 'Patient Signature:'],
  ];
  for (const [leftLabel, rx, rightLabel] of sigFields) {
    setColor(doc, GRAY, 'text');
    doc.setFontSize(7.5);
    doc.text(leftLabel, ML + 4, y);
    setColor(doc, LGRAY, 'draw');
    doc.setLineWidth(0.75);
    doc.line(ML + 4 + doc.getTextWidth(leftLabel) + 4, y + 3, ML + COL2_W - 4, y + 3);

    doc.text(rightLabel, rx + 4, y);
    doc.line(rx + 4 + doc.getTextWidth(rightLabel) + 4, y + 3, rx + COL2_W, y + 3);
    y += 20;
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  setColor(doc, NAVY, 'fill');
  doc.rect(0, H - 28, W, 28, 'F');
  setColor(doc, WHITE, 'text');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(
    'ePSA Shared Decision-Making Worksheet · AUA/SUO 2026 · Tewari Lab, Icahn School of Medicine at Mount Sinai · IRB STUDY-14-00050',
    W / 2, H - 16, { align: 'center' },
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(
    'Retain in patient medical record as documentation of SDM conversation. This document is not a clinical diagnosis.',
    W / 2, H - 5, { align: 'center' },
  );

  doc.save(`ePSA-SDM-Worksheet-${new Date().toISOString().slice(0, 10)}.pdf`);
}
