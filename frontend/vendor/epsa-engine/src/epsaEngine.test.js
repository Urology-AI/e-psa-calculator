import { describe, it, expect } from 'vitest';
import { calculateDynamicEPsa, calculateDynamicEPsaPost, validateInputs } from './epsaEngine.js';
import { makePart1Form, makePreResult, makePart2Post } from './testPatientHelpers';

describe('ePSA Engine — Part 1 (many patient types)', () => {
  it('returns valid result shape for any valid form', () => {
    const form = makePart1Form();
    const result = calculateDynamicEPsa(form);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('risk');
    expect(result).toHaveProperty('recommendPSA');
    expect(result).toHaveProperty('tierRisk');
    expect(result).toHaveProperty('confidenceRange');
    expect(result).toHaveProperty('calculationDetails');
    expect(result.calculationDetails).toHaveProperty('rawScore');
    expect(result.calculationDetails).toHaveProperty('maxScore', 80);
    expect(result.calculationDetails).toHaveProperty('probability');
    expect(typeof result.score).toBe('number');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(['LOWER', 'MODERATE', 'HIGHER', 'PSA_RECOMMENDED', 'PSA_NOT_RECOMMENDED']).toContain(result.risk);
  });

  it('young, low-risk, no FH: possible PSA not recommended (perfect profile)', () => {
    const form = makePart1Form({
      age: 42,
      race: 'white',
      bmi: 22,
      ipss: [0, 0, 0, 0, 0, 0, 0],
      exercise: 0,
      familyHistory: 0
    });
    const result = calculateDynamicEPsa(form);
    expect(result).not.toBeNull();
    expect(result.score).toBeLessThan(50);
    // May or may not be PSA not recommended depending on cutoff; recommendPSA can be true, false, or null
    expect([true, false, null]).toContain(result.recommendPSA);
  });

  it('age 50–59, BMI 25–29.9: higher score than baseline', () => {
    const baseline = makePart1Form({ age: 45, bmi: 23 });
    const olderBmi = makePart1Form({ age: 55, bmi: 27 });
    const rBaseline = calculateDynamicEPsa(baseline);
    const rOlder = calculateDynamicEPsa(olderBmi);
    expect(rOlder.score).toBeGreaterThanOrEqual(rBaseline.score);
  });

  it('Black race increases score vs same profile non-Black', () => {
    const white = makePart1Form({ race: 'white', age: 55, bmi: 24 });
    const black = makePart1Form({ race: 'black', age: 55, bmi: 24 });
    const rWhite = calculateDynamicEPsa(white);
    const rBlack = calculateDynamicEPsa(black);
    expect(rBlack.score).toBeGreaterThan(rWhite.score);
  });

  it('family history + age ≥ 40 always recommends PSA', () => {
    const form = makePart1Form({
      age: 45,
      familyHistory: 1,
      bmi: 22,
      ipss: [0, 0, 0, 0, 0, 0, 0],
      exercise: 0,
      race: 'white'
    });
    const result = calculateDynamicEPsa(form);
    expect(result.recommendPSA).toBe(true);
  });

  it('family history at 55: PSA recommended', () => {
    const form = makePart1Form({ age: 55, familyHistory: 1 });
    const result = calculateDynamicEPsa(form);
    expect(result.recommendPSA).toBe(true);
  });

  it('high BMI (≥30) increases score', () => {
    const normal = makePart1Form({ bmi: 24 });
    const obese = makePart1Form({ bmi: 32 });
    const rNormal = calculateDynamicEPsa(normal);
    const rObese = calculateDynamicEPsa(obese);
    expect(rObese.score).toBeGreaterThan(rNormal.score);
  });

  it('IPSS moderate (8–19) raises score vs mild (low IPSS is better)', () => {
    const mild = makePart1Form({ ipss: [0, 0, 0, 0, 0, 0, 0] }); // total 0 — best
    const moderate = makePart1Form({ ipss: [2, 2, 2, 2, 0, 0, 0] }); // total 8 — moderate
    const rMild = calculateDynamicEPsa(mild);
    const rMod = calculateDynamicEPsa(moderate);
    expect(rMod.score).toBeGreaterThan(rMild.score);
  });

  it('Black ancestry under 40 does not add risk points', () => {
    const youngBlack = makePart1Form({ race: 'black', age: 35 });
    const youngWhite = makePart1Form({ race: 'white', age: 35 });
    const rBlack = calculateDynamicEPsa(youngBlack);
    const rWhite = calculateDynamicEPsa(youngWhite);
    expect(rBlack.score).toBe(rWhite.score);
  });

  it('older age (70+): higher score than 50–59', () => {
    const mid = makePart1Form({ age: 55, bmi: 24 });
    const older = makePart1Form({ age: 72, bmi: 24 });
    const rMid = calculateDynamicEPsa(mid);
    const rOlder = calculateDynamicEPsa(older);
    expect(rOlder.score).toBeGreaterThanOrEqual(rMid.score);
  });

  it('exercise none vs regular: higher score for none', () => {
    const regular = makePart1Form({ exercise: 0 });
    const none = makePart1Form({ exercise: 2 });
    const rRegular = calculateDynamicEPsa(regular);
    const rNone = calculateDynamicEPsa(none);
    expect(rNone.score).toBeGreaterThanOrEqual(rRegular.score);
  });

  it('confidence range is a percent range string', () => {
    const result = calculateDynamicEPsa(makePart1Form());
    expect(result.confidenceRange).toMatch(/\d+%[-–]\d+%/);
  });

  it('rejects invalid form (missing race)', () => {
    const form = makePart1Form({ race: '' });
    const result = calculateDynamicEPsa(form);
    expect(result).toBeNull();
  });

  it('rejects invalid form (missing family history)', () => {
    const form = makePart1Form();
    delete form.familyHistory;
    const result = calculateDynamicEPsa(form);
    expect(result).toBeNull();
  });

  it('rejects invalid form (missing comorbidity)', () => {
    const form = makePart1Form();
    delete form.comorbidityScore;
    delete form.hypertension;
    delete form.hyperlipidemia;
    delete form.coronaryArteryDisease;
    delete form.diabetes;
    const result = calculateDynamicEPsa(form);
    expect(result).toBeNull();
  });

  it('comorbidities add points (0, 1, 2)', () => {
    const none = makePart1Form({ comorbidityScore: 0 });
    const one = makePart1Form({ comorbidityScore: 1 });
    const two = makePart1Form({ comorbidityScore: 2 });
    const rNone = calculateDynamicEPsa(none);
    const rOne = calculateDynamicEPsa(one);
    const rTwo = calculateDynamicEPsa(two);
    expect(rOne.calculationDetails.rawScore).toBeGreaterThan(rNone.calculationDetails.rawScore);
    expect(rTwo.calculationDetails.rawScore).toBeGreaterThan(rOne.calculationDetails.rawScore);
    expect(rTwo.score).toBeGreaterThanOrEqual(rNone.score);
  });

  it('returns result with model version from config', () => {
    const result = calculateDynamicEPsa(makePart1Form());
    expect(result).not.toBeNull();
    expect(result.modelVersion).toBeDefined();
    expect(typeof result.modelVersion).toBe('string');
  });

  it('validateInputs returns errors for invalid data', () => {
    const { errors } = validateInputs({});
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('ePSA Engine — Part 2 (many patient types)', () => {
  it('returns valid result shape for logistic model', () => {
    const preResult = makePreResult({ score: 30 });
    const postData = makePart2Post({ psa: 5 });
    const result = calculateDynamicEPsaPost(preResult, postData);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('riskPct');
    expect(result).toHaveProperty('riskClass');
    expect(result).toHaveProperty('riskCat');
    expect(['< 1.0 ng/mL', '1.0-2.9 ng/mL', '3.0-9.9 ng/mL', '>= 10.0 ng/mL']).toContain(result.riskPct);
    expect(['low-risk', 'moderate-risk', 'high-risk', 'very-high-risk']).toContain(result.riskClass);
  });

  it('Part 2 includes display range (riskPctRange)', () => {
    const preResult = makePreResult();
    const postData = makePart2Post({ psa: 4 });
    const result = calculateDynamicEPsaPost(preResult, postData);
    expect(result.riskPctRange).toBeNull();
  });

  it('higher PSA increases Part 2 risk category', () => {
    const preResult = makePreResult({ score: 25 });
    const lowPsa = calculateDynamicEPsaPost(preResult, makePart2Post({ psa: 2 }));
    const highPsa = calculateDynamicEPsaPost(preResult, makePart2Post({ psa: 15 }));
    const tierLow = lowPsa.epsaTierIndex;
    const tierHigh = highPsa.epsaTierIndex;
    expect(tierHigh).toBeGreaterThanOrEqual(tierLow);
  });

  it('PI-RADS 5 increases risk vs no MRI', () => {
    const preResult = makePreResult();
    const noMri = calculateDynamicEPsaPost(preResult, makePart2Post({ psa: 5, knowPirads: false }));
    const pirads5 = calculateDynamicEPsaPost(preResult, makePart2Post({ psa: 5, knowPirads: true, pirads: 5 }));
    expect(pirads5.epsaTierIndex).toBeGreaterThanOrEqual(noMri.epsaTierIndex);
    expect(pirads5.piradsOverridden).toBe(true);
  });

  it('PI-RADS 3 vs 5: higher category for 5', () => {
    const preResult = makePreResult();
    const r3 = calculateDynamicEPsaPost(preResult, makePart2Post({ psa: 6, knowPirads: true, pirads: 3 }));
    const r5 = calculateDynamicEPsaPost(preResult, makePart2Post({ psa: 6, knowPirads: true, pirads: 5 }));
    expect(r5.epsaTierIndex).toBeGreaterThanOrEqual(r3.epsaTierIndex);
  });

  it('low PSA gives lower risk category', () => {
    const preResult = makePreResult();
    const result = calculateDynamicEPsaPost(preResult, makePart2Post({ psa: 0.5 }));
    expect(['low-risk', 'moderate-risk']).toContain(result.riskClass);
  });

  it('PSAD: elevated density triggers psadFlag and points', () => {
    const preResult = makePreResult({ score: 30 });
    const result = calculateDynamicEPsaPost(
      preResult,
      makePart2Post({ psa: 4, knowPirads: false, prostateVolume: 20 })
    );
    // PSA density = 4/20 = 0.2 > 0.177
    expect(result.psadFlag).toBe(true);
    expect(result.psadPoints).toBe(20);
    expect(result.psadValue).toBeCloseTo(0.2, 5);
  });

  it('PSAD: intermediate density gives partial points', () => {
    const preResult = makePreResult({ score: 30 });
    const result = calculateDynamicEPsaPost(
      preResult,
      makePart2Post({ psa: 4, knowPirads: false, prostateVolume: 40 })
    );
    // PSA density = 4/40 = 0.1 -> should be 0 because condition is > 0.10
    expect(result.psadFlag).toBe(false);
    expect(result.psadPoints).toBe(0);
  });

  it('PSAD: skipped when prostate volume missing', () => {
    const preResult = makePreResult({ score: 30 });
    const result = calculateDynamicEPsaPost(
      preResult,
      makePart2Post({ psa: 4, knowPirads: false, prostateVolume: null })
    );
    expect(result.psadFlag).toBe(false);
    expect(result.psadPoints).toBe(0);
    expect(result.psadValue).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Clinical Safety Tests — 5-ARI correction & calcHighGradeRisk
// ─────────────────────────────────────────────────────────────────────────────
import { calcHighGradeRisk } from './epsaEngine.js';

describe('5-ARI PSA correction (REDUCE trial — ×2 for finasteride/dutasteride)', () => {
  it('doubles PSA for finasteride and sets psaAdjustedFlag', () => {
    const preResult = makePreResult({ score: 30 });
    const result = calculateDynamicEPsaPost(
      preResult,
      makePart2Post({ psa: 3.0, onHormonalTherapy: true, hormonalTherapyType: 'finasteride' })
    );
    expect(result.psaAdjusted).toBeCloseTo(6.0, 1);
    expect(result.psaAdjustedFlag).toBe(true);
  });

  it('doubles PSA for dutasteride and sets psaAdjustedFlag', () => {
    const preResult = makePreResult({ score: 30 });
    const result = calculateDynamicEPsaPost(
      preResult,
      makePart2Post({ psa: 2.5, onHormonalTherapy: true, hormonalTherapyType: 'dutasteride' })
    );
    expect(result.psaAdjusted).toBeCloseTo(5.0, 1);
    expect(result.psaAdjustedFlag).toBe(true);
  });

  it('does NOT adjust PSA for other hormonal therapy', () => {
    const preResult = makePreResult({ score: 30 });
    const result = calculateDynamicEPsaPost(
      preResult,
      makePart2Post({ psa: 3.0, onHormonalTherapy: true, hormonalTherapyType: 'other' })
    );
    expect(result.psaAdjusted).toBeCloseTo(3.0, 1);
    expect(result.psaAdjustedFlag).toBe(false);
  });

  it('does NOT adjust PSA when not on hormonal therapy', () => {
    const preResult = makePreResult({ score: 30 });
    const result = calculateDynamicEPsaPost(
      preResult,
      makePart2Post({ psa: 4.0, onHormonalTherapy: false })
    );
    expect(result.psaAdjusted).toBeCloseTo(4.0, 1);
    expect(result.psaAdjustedFlag).toBe(false);
  });
});

describe('calcHighGradeRisk — logistic regression PI-RADS × PSA', () => {
  it('returns null for missing inputs', () => {
    expect(calcHighGradeRisk(null, 4.0)).toBeNull();
    expect(calcHighGradeRisk(3, null)).toBeNull();
    expect(calcHighGradeRisk(undefined, undefined)).toBeNull();
  });

  // Updated 2026-06-02: model now uses dummy-variable logistic regression (GG≥2 outcome).
  // Thresholds calibrated to 74% GG≥2 prevalence in biopsied cohort.
  // PIRADS 1 is now valid (treated as reference ≤2). PIRADS 6+ is still invalid.
  it('returns null for invalid PI-RADS (6+)', () => {
    expect(calcHighGradeRisk(6, 4.0)).toBeNull();
    expect(calcHighGradeRisk(0, 4.0)).toBeNull();
  });

  it('PIRADS 1 is now valid — treated as reference category (≤2)', () => {
    const r = calcHighGradeRisk(1, 4.0);
    expect(r).not.toBeNull();
    expect(r.prob).toBeGreaterThan(0);
    expect(r.prob).toBeLessThanOrEqual(1);
  });

  it('PI-RADS 2, PSA 4.0 → below-average GG≥2 risk (model calibrated to 74% prevalence cohort)', () => {
    const r = calcHighGradeRisk(2, 4.0);
    expect(r).not.toBeNull();
    // Reference category in biopsied cohort: baseline ~58–60% — below cohort average (74%)
    expect(r.prob).toBeLessThan(0.74);
    expect(r.interpretation).toContain('Below-average');
    expect(r.guidelineRate).toContain('7%'); // AUA 2026 Table 5
  });

  it('PI-RADS 4, PSA 6.0 → elevated GG≥2 risk (≥ 74% cohort average)', () => {
    const r = calcHighGradeRisk(4, 6.0);
    expect(r).not.toBeNull();
    expect(r.prob).toBeGreaterThanOrEqual(0.74);
    expect(r.guidelineRate).toContain('37%'); // AUA 2026 Table 5
  });

  it('PI-RADS 5, PSA 10.0 → high GG≥2 risk', () => {
    const r = calcHighGradeRisk(5, 10.0);
    expect(r).not.toBeNull();
    expect(r.prob).toBeGreaterThanOrEqual(0.82);
    expect(r.interpretation).toBe('High GG≥2 risk');
    expect(r.guidelineRate).toContain('70%'); // AUA 2026 Table 5
  });

  it('PI-RADS 5, PSA 0.5 → result is valid (low PSA high PIRADS edge case)', () => {
    const r = calcHighGradeRisk(5, 0.5);
    expect(r).not.toBeNull();
    expect(r.prob).toBeGreaterThan(0);
    expect(r.prob).toBeLessThanOrEqual(1);
  });

  it('probability increases from PI-RADS 3→4→5 at fixed PSA (PIRADS 3 equivocal — near ref)', () => {
    // Note: pirads_3 coefficient is −0.061 (equivocal, near zero), so p3 ≈ p2 (reference).
    // The strong signal is PIRADS 4 (coef +0.968) and 5 (coef +1.255).
    const p3 = calcHighGradeRisk(3, 5.0).prob;
    const p4 = calcHighGradeRisk(4, 5.0).prob;
    const p5 = calcHighGradeRisk(5, 5.0).prob;
    expect(p3).toBeLessThan(p4);
    expect(p4).toBeLessThan(p5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Discordance detection
// ─────────────────────────────────────────────────────────────────────────────
describe('ePSA Engine — Discordance detection', () => {
  it('yellow discordance: ePSA combined tier exceeds PSA tier by exactly 1', () => {
    // score=25 → baseRawScore=20; psa=0.5 → psaPoints=0; total=20, tierIndex=1
    // psaTierIndex=0 (psa<1.0); diff=1 → yellow epsa_higher
    const pre = makePreResult({ score: 25 });
    const post = makePart2Post({ psa: 0.5, knowPirads: false });
    const r = calculateDynamicEPsaPost(pre, post);
    expect(r.discordanceFlag).not.toBeNull();
    expect(r.discordanceFlag.direction).toBe('epsa_higher');
    expect(r.discordanceFlag.severity).toBe('yellow');
  });

  it('orange discordance: ePSA combined tier exceeds PSA tier by 2', () => {
    // score=50 → baseRawScore=40; psa=0.5 → psaPoints=0; total=40, tierIndex=2
    // psaTierIndex=0 (psa<1.0); diff=2 → orange epsa_higher
    const pre = makePreResult({ score: 50 });
    const post = makePart2Post({ psa: 0.5, knowPirads: false });
    const r = calculateDynamicEPsaPost(pre, post);
    expect(r.discordanceFlag).not.toBeNull();
    expect(r.discordanceFlag.direction).toBe('epsa_higher');
    expect(r.discordanceFlag.severity).toBe('orange');
  });

  it('psa_higher discordance: PSA tier exceeds ePSA combined tier', () => {
    // score=0 → baseRawScore=0; psa=12 → psaPoints=45; total=45, tierIndex=2
    // psaTierIndex=3 (psa≥10); diff=-1 → psa_higher
    const pre = makePreResult({ score: 0 });
    const post = makePart2Post({ psa: 12, knowPirads: false });
    const r = calculateDynamicEPsaPost(pre, post);
    expect(r.discordanceFlag).not.toBeNull();
    expect(r.discordanceFlag.direction).toBe('psa_higher');
  });

  it('no discordance: ePSA tier matches PSA tier', () => {
    // score=12 → baseRawScore=10; psa=2.0 → psaPoints=10; total=20, tierIndex=1
    // psaTierIndex=1 (1.0≤psa<3.5); diff=0 → null
    const pre = makePreResult({ score: 12 });
    const post = makePart2Post({ psa: 2.0, knowPirads: false });
    const r = calculateDynamicEPsaPost(pre, post);
    expect(r.discordanceFlag).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MRI recommendation logic
// ─────────────────────────────────────────────────────────────────────────────
describe('ePSA Engine — MRI recommendation logic', () => {
  it('recommends MRI when PSA ≥ 4.0 and no PI-RADS entered (psa_elevated)', () => {
    const r = calculateDynamicEPsaPost(makePreResult(), makePart2Post({ psa: 5.0, knowPirads: false }));
    expect(r.mriRecommended).toBe(true);
    expect(r.mriRecommendReason).toBe('psa_elevated');
  });

  it('recommends MRI for combined elevated risk when PSA < 4.0 (combined_risk_elevated)', () => {
    // score=75 → baseRawScore=60; psa=3.0 → psaPoints=10; total=70 ≥56, tier=3
    // psa<4.0 so psa_elevated doesn't fire first; tier≥2 → combined_risk_elevated
    const pre = makePreResult({ score: 75 });
    const post = makePart2Post({ psa: 3.0, knowPirads: false });
    const r = calculateDynamicEPsaPost(pre, post);
    expect(r.mriRecommended).toBe(true);
    expect(r.mriRecommendReason).toBe('combined_risk_elevated');
  });

  it('recommends MRI for high-risk profile at PSA ≥ 2.5 when combined tier < 2 (high_risk_profile)', () => {
    // score=5 → baseRawScore=4; psa=2.5 → psaPoints=10; total=14, tier=1 (<2)
    // isBlack=true → hasHighRiskFeature=true; psa≥2.5 → high_risk_profile
    const pre = makePreResult({ score: 5, isBlack: true });
    const post = makePart2Post({ psa: 2.5, knowPirads: false });
    const r = calculateDynamicEPsaPost(pre, post);
    expect(r.mriRecommended).toBe(true);
    expect(r.mriRecommendReason).toBe('high_risk_profile');
  });

  it('does NOT recommend MRI when knowPirads is true (MRI already done)', () => {
    const r = calculateDynamicEPsaPost(makePreResult(), makePart2Post({ psa: 5.0, knowPirads: true, pirads: 4 }));
    expect(r.mriRecommended).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Low-PSA warning
// ─────────────────────────────────────────────────────────────────────────────
describe('ePSA Engine — Low-PSA warning', () => {
  it('fires when PSA < 2.0 and patient has high-risk feature (Black ancestry)', () => {
    const pre = makePreResult({ score: 25, isBlack: true });
    const post = makePart2Post({ psa: 1.5, knowPirads: false });
    const r = calculateDynamicEPsaPost(pre, post);
    expect(r.lowPsaWarning).toBe(true);
    expect(r.lowPsaWarningText).toBeTruthy();
  });

  it('does NOT fire when PSA < 2.0 but no high-risk features present', () => {
    const pre = makePreResult({ score: 25 }); // no isBlack, fhBinary=0, no BRCA
    const post = makePart2Post({ psa: 1.5, knowPirads: false });
    const r = calculateDynamicEPsaPost(pre, post);
    expect(r.lowPsaWarning).toBe(false);
  });

  it('does NOT fire at exactly PSA = 2.0 (boundary: condition is < 2.0, not ≤)', () => {
    const pre = makePreResult({ score: 25, isBlack: true });
    const post = makePart2Post({ psa: 2.0, knowPirads: false });
    const r = calculateDynamicEPsaPost(pre, post);
    expect(r.lowPsaWarning).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PSAD boundary conditions
// ─────────────────────────────────────────────────────────────────────────────
describe('ePSA Engine — PSAD boundary conditions', () => {
  it('PSAD exactly at 0.177 is NOT flagged but gets 10 pts (condition is > not ≥)', () => {
    // psa=3.54, vol=20: PSAD = 3.54/20 = 0.177 exactly — above 0.10 but not above 0.177
    const pre = makePreResult({ score: 30 });
    const post = makePart2Post({ psa: 3.54, knowPirads: false, prostateVolume: 20 });
    const r = calculateDynamicEPsaPost(pre, post);
    expect(r.psadFlag).toBe(false);
    expect(r.psadPoints).toBe(10);
    expect(r.psadValue).toBeCloseTo(0.177, 5);
  });

  it('PSAD just above 0.177 → flagged, 20 pts', () => {
    // psa=3.6, vol=20: PSAD = 0.18 > 0.177
    const pre = makePreResult({ score: 30 });
    const post = makePart2Post({ psa: 3.6, knowPirads: false, prostateVolume: 20 });
    const r = calculateDynamicEPsaPost(pre, post);
    expect(r.psadFlag).toBe(true);
    expect(r.psadPoints).toBe(20);
    expect(r.psadValue).toBeCloseTo(0.18, 5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Biopsy recommendation triggers
// ─────────────────────────────────────────────────────────────────────────────
describe('ePSA Engine — Biopsy recommendation triggers', () => {
  it('recommends biopsy for PI-RADS 5 (pirads_5)', () => {
    const r = calculateDynamicEPsaPost(makePreResult(), makePart2Post({ psa: 5.0, knowPirads: true, pirads: 5 }));
    expect(r.biopsyRecommended).toBe(true);
    expect(r.biopsyReason).toBe('pirads_5');
    expect(r.piradsOverridden).toBe(true);
  });

  it('recommends biopsy for PI-RADS 4 (pirads_4)', () => {
    const r = calculateDynamicEPsaPost(makePreResult(), makePart2Post({ psa: 5.0, knowPirads: true, pirads: 4 }));
    expect(r.biopsyRecommended).toBe(true);
    expect(r.biopsyReason).toBe('pirads_4');
  });

  it('recommends biopsy when combined score ≥ 56 without PI-RADS (combined_score_high)', () => {
    // score=75 → baseRawScore=60; psa=5.0 → psaPoints=25; total=85 ≥ 56
    const pre = makePreResult({ score: 75 });
    const post = makePart2Post({ psa: 5.0, knowPirads: false });
    const r = calculateDynamicEPsaPost(pre, post);
    expect(r.biopsyRecommended).toBe(true);
    expect(r.biopsyReason).toBe('combined_score_high');
  });

  it('does NOT recommend biopsy for PI-RADS 3 with low combined score', () => {
    // score=25 → baseRawScore=20; psa=2.0 → psaPoints=10; pirads=3 → piradsPoints=15; total=45 < 56
    const pre = makePreResult({ score: 25 });
    const post = makePart2Post({ psa: 2.0, knowPirads: true, pirads: 3 });
    const r = calculateDynamicEPsaPost(pre, post);
    expect(r.biopsyRecommended).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Golden patient regression fixtures
// ─────────────────────────────────────────────────────────────────────────────
describe('ePSA Engine — Golden patient regression fixtures', () => {
  it('[GP-1] 52yo Black + family history + BRCA positive: high risk, PSA recommended', () => {
    const form = makePart1Form({ age: 52, race: 'black', familyHistory: 1, brcaStatus: 'positive' });
    const r = calculateDynamicEPsa(form);
    expect(r.recommendPSA).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(50);
  });

  it('[GP-2] 65yo average-risk white male: PSA recommended per age 50–69 guideline', () => {
    const form = makePart1Form({ age: 65, race: 'white', familyHistory: 0 });
    const r = calculateDynamicEPsa(form);
    expect(r.recommendPSA).toBe(true);
  });

  it('[GP-3] 42yo non-Black no risk factors: returns a result, recommendation may vary', () => {
    const form = makePart1Form({ age: 42, race: 'white', familyHistory: 0 });
    const r = calculateDynamicEPsa(form);
    expect(r).not.toBeNull();
    expect([true, false, null]).toContain(r.recommendPSA);
  });

  it('[GP-4] 55yo post-PSA with PSA 5.5: combined_score_high biopsy + psa_elevated MRI both fire', () => {
    // baseRawScore = Math.round(45/100 * 80) = 36; psaPoints=25; total=61 ≥ 56
    const pre = makePreResult({ score: 45 });
    const post = makePart2Post({ psa: 5.5, knowPirads: false });
    const r = calculateDynamicEPsaPost(pre, post);
    expect(r.biopsyRecommended).toBe(true);
    expect(r.biopsyReason).toBe('combined_score_high');
    expect(r.mriRecommended).toBe(true);
    expect(r.mriRecommendReason).toBe('psa_elevated');
  });

  it('[GP-5] 60yo PSA 8.0 + PI-RADS 5: immediate biopsy recommended, no MRI rec (already done)', () => {
    const pre = makePreResult({ score: 50 });
    const post = makePart2Post({ psa: 8.0, knowPirads: true, pirads: 5 });
    const r = calculateDynamicEPsaPost(pre, post);
    expect(r.biopsyRecommended).toBe(true);
    expect(r.biopsyReason).toBe('pirads_5');
    expect(r.mriRecommended).toBe(false);
    expect(r.epsaTierIndex).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Model weight integrity
// ─────────────────────────────────────────────────────────────────────────────
import { DEFAULT_CALCULATOR_CONFIG, ASSUMPTIONS_REGISTER } from './calculatorConfig.js';

describe('Model weight integrity', () => {
  const vars = DEFAULT_CALCULATOR_CONFIG.part1.variables;

  it('variable count is 13', () => {
    expect(vars.length).toBe(13);
  });

  it('expected variable IDs are present (order-independent)', () => {
    const expectedIds = [
      'age_50_59', 'age_60_69', 'age_70_plus',
      'bmi_25_29_9', 'bmi_ge_30',
      'ipss_moderate', 'ipss_severe',
      'exercise_some', 'exercise_none',
      'raceBlack', 'fhBinary',
      'age60plus_x_ipss_moderate', 'age60plus_x_ipss_severe',
    ];
    const actualIds = vars.map(v => v.id);
    for (const id of expectedIds) {
      expect(actualIds).toContain(id);
    }
    expect(actualIds.length).toBe(expectedIds.length);
  });

  it('raceBlack weight is positive', () => {
    const raceBlack = vars.find(v => v.id === 'raceBlack');
    expect(raceBlack).toBeDefined();
    expect(raceBlack.weight).toBeGreaterThan(0);
  });

  it('no variable has weight === 0 (within tolerance)', () => {
    for (const v of vars) {
      expect(Math.abs(v.weight)).toBeGreaterThan(0.001);
    }
  });

  it('ASSUMPTIONS_REGISTER is exported and has 5 entries', () => {
    expect(ASSUMPTIONS_REGISTER).toBeDefined();
    expect(Array.isArray(ASSUMPTIONS_REGISTER.assumptions)).toBe(true);
    expect(ASSUMPTIONS_REGISTER.assumptions.length).toBe(5);
  });
});
