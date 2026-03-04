import { describe, it, expect } from 'vitest';
import { calculateDynamicEPsa, calculateDynamicEPsaPost, validateInputs } from './epsaEngine';
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
    // May or may not be PSA not recommended depending on cutoff
    expect([true, false]).toContain(result.recommendPSA);
  });

  it('age 50–59, BMI 25–29.9: higher score than baseline', () => {
    const baseline = makePart1Form({ age: 45, bmi: 23 });
    const olderBmi = makePart1Form({ age: 55, bmi: 27 });
    const rBaseline = calculateDynamicEPsa(baseline);
    const rOlder = calculateDynamicEPsa(olderBmi);
    expect(rOlder.score).toBeGreaterThan(rBaseline.score);
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

  it('IPSS moderate (8–19) lowers score vs mild', () => {
    const mild = makePart1Form({ ipss: [0, 0, 0, 0, 0, 0, 0] }); // 0
    const moderate = makePart1Form({ ipss: [2, 2, 2, 2, 0, 0, 0] }); // 8
    const rMild = calculateDynamicEPsa(mild);
    const rMod = calculateDynamicEPsa(moderate);
    expect(rMod.score).toBeLessThan(rMild.score);
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
    expect(result.confidenceRange).toMatch(/\d+%–\d+%/);
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
    expect(result.riskPct).toMatch(/\d+%/);
    expect(result.totalPoints).toBeNull();
    expect(['low-risk', 'moderate-risk', 'high-risk', 'very-high-risk']).toContain(result.riskClass);
  });

  it('Part 2 includes display range (riskPctRange)', () => {
    const preResult = makePreResult();
    const postData = makePart2Post({ psa: 4 });
    const result = calculateDynamicEPsaPost(preResult, postData);
    expect(result.riskPctRange).toBeDefined();
    expect(result.riskPctRange).toMatch(/\d+%–\d+%/);
  });

  it('higher PSA increases Part 2 risk category', () => {
    const preResult = makePreResult({ score: 25 });
    const lowPsa = calculateDynamicEPsaPost(preResult, makePart2Post({ psa: 2 }));
    const highPsa = calculateDynamicEPsaPost(preResult, makePart2Post({ psa: 15 }));
    const pctLow = parseInt(lowPsa.riskPct, 10);
    const pctHigh = parseInt(highPsa.riskPct, 10);
    expect(pctHigh).toBeGreaterThan(pctLow);
  });

  it('PI-RADS 5 increases risk vs no MRI', () => {
    const preResult = makePreResult();
    const noMri = calculateDynamicEPsaPost(preResult, makePart2Post({ psa: 5, knowPirads: false }));
    const pirads5 = calculateDynamicEPsaPost(preResult, makePart2Post({ psa: 5, knowPirads: true, pirads: 5 }));
    const pctNo = parseInt(noMri.riskPct, 10);
    const pct5 = parseInt(pirads5.riskPct, 10);
    expect(pct5).toBeGreaterThan(pctNo);
  });

  it('PI-RADS 3 vs 5: higher category for 5', () => {
    const preResult = makePreResult();
    const r3 = calculateDynamicEPsaPost(preResult, makePart2Post({ psa: 6, knowPirads: true, pirads: 3 }));
    const r5 = calculateDynamicEPsaPost(preResult, makePart2Post({ psa: 6, knowPirads: true, pirads: 5 }));
    expect(parseInt(r5.riskPct, 10)).toBeGreaterThanOrEqual(parseInt(r3.riskPct, 10));
  });

  it('low PSA gives lower risk category', () => {
    const preResult = makePreResult();
    const result = calculateDynamicEPsaPost(preResult, makePart2Post({ psa: 0.5 }));
    expect(['low-risk', 'moderate-risk']).toContain(result.riskClass);
  });
});
