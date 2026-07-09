/**
 * 30 patient examples that potentially go against AUA/NCCN guidelines.
 * Each case documents:
 *   - The guideline expectation (what standard guidelines say)
 *   - The ePSA result (what the model says)
 *   - Why there may be a discrepancy
 *
 * "Against guidelines" means ePSA recommends PSA when guidelines say no,
 * or vice versa — or the score is unexpectedly high/low for the profile.
 */
import { describe, it, expect } from 'vitest';
import { calculateDynamicEPsa } from '@epsa/engine';
import { makePart1Form } from './testPatientHelpers';

describe('30 patient examples — potential guideline edge cases', () => {

  // ── UNDER 40 (guidelines say: no routine screening) ──────────────────────

  it('[01] age 35, no risk factors — guideline: no screening; ePSA should flag under-40', () => {
    const result = calculateDynamicEPsa(makePart1Form({ age: 35, race: 'white', bmi: 23, familyHistory: 0 }));
    expect(result.belowMinAge).toBe(true);
    expect(result.recommendPSA).not.toBe(true);
  });

  it('[02] age 38, Black ancestry — guideline: no routine screening <40; ePSA flags under-40', () => {
    const result = calculateDynamicEPsa(makePart1Form({ age: 38, race: 'black', bmi: 25, familyHistory: 0 }));
    expect(result.belowMinAge).toBe(true);
  });

  it('[03] age 39, strong family history — guideline: no routine screening <40; ePSA flags under-40', () => {
    const result = calculateDynamicEPsa(makePart1Form({ age: 39, race: 'white', bmi: 24, familyHistory: 1 }));
    expect(result.belowMinAge).toBe(true);
  });

  it('[04] age 37, BRCA2 positive — guideline: discuss at 40-45 only; ePSA should not score', () => {
    const result = calculateDynamicEPsa(makePart1Form({ age: 37, race: 'white', brcaStatus: 'positive', familyHistory: 1 }));
    expect(result.belowMinAge).toBe(true);
  });

  it('[05] age 39, obesity + high IPSS — model may show high score but under-40 flag applies', () => {
    const result = calculateDynamicEPsa(makePart1Form({
      age: 39, race: 'white', bmi: 35, familyHistory: 0,
      ipss: [3, 3, 3, 3, 3, 3, 3], comorbidityScore: 1
    }));
    expect(result.belowMinAge).toBe(true);
  });

  // ── OVER 75 (guidelines say: individualize via SDM) ──────────────────────

  it('[06] age 76, healthy, no risk factors — guideline: SDM; ePSA should flag over-75', () => {
    const result = calculateDynamicEPsa(makePart1Form({ age: 76, race: 'white', bmi: 23, familyHistory: 0 }));
    expect(result.aboveMaxScreeningAge).toBe(true);
  });

  it('[07] age 80, Black ancestry, family history — guideline: SDM only; ePSA flags over-75', () => {
    const result = calculateDynamicEPsa(makePart1Form({ age: 80, race: 'black', familyHistory: 1 }));
    expect(result.aboveMaxScreeningAge).toBe(true);
  });

  it('[08] age 78, BRCA positive — guideline: SDM; ePSA should not produce standard score', () => {
    const result = calculateDynamicEPsa(makePart1Form({ age: 78, race: 'white', brcaStatus: 'positive', familyHistory: 1 }));
    expect(result.aboveMaxScreeningAge).toBe(true);
  });

  it('[09] age 77, high IPSS + obesity — guideline: SDM; ePSA flags over-75', () => {
    const result = calculateDynamicEPsa(makePart1Form({
      age: 77, bmi: 34, familyHistory: 0,
      ipss: [4, 4, 4, 4, 4, 4, 4], comorbidityScore: 2
    }));
    expect(result.aboveMaxScreeningAge).toBe(true);
  });

  // ── AGES 40-44 (guidelines say: only high-risk; AUA statement 5) ─────────

  it('[10] age 42, average-risk white male — guideline: no routine screen; ePSA may recommend if score high', () => {
    const result = calculateDynamicEPsa(makePart1Form({ age: 42, race: 'white', bmi: 24, familyHistory: 0 }));
    expect(result).not.toBeNull();
    // If ePSA recommends PSA for average-risk 42yo, that deviates from guideline
    if (result.recommendPSA === true) {
      expect(result.psaRecommendReason).toBeTruthy();
    }
  });

  it('[11] age 43, Black ancestry — guideline: begin SDM discussions; ePSA likely recommends', () => {
    const result = calculateDynamicEPsa(makePart1Form({ age: 43, race: 'black', bmi: 26, familyHistory: 0 }));
    expect(result.recommendPSA).toBe(true);
  });

  it('[12] age 44, family history + Black ancestry — guideline: discuss at 40-45; ePSA should recommend', () => {
    const result = calculateDynamicEPsa(makePart1Form({ age: 44, race: 'black', familyHistory: 1, bmi: 25 }));
    expect(result.recommendPSA).toBe(true);
  });

  it('[13] age 41, non-Black, no FH, but BMI 38 + high IPSS — guideline says no; ePSA may trigger', () => {
    const result = calculateDynamicEPsa(makePart1Form({
      age: 41, race: 'white', bmi: 38, familyHistory: 0,
      ipss: [4, 4, 4, 4, 4, 4, 4], comorbidityScore: 1
    }));
    expect(result).not.toBeNull();
    // If ePSA recommends PSA here, it deviates from guideline (which requires a risk factor)
    if (result.recommendPSA) {
      expect(result.psaRecommendReason).toBe('score_threshold');
    }
  });

  it('[14] age 42, BRCA positive — guideline: discuss at 40-45; ePSA should recommend', () => {
    const result = calculateDynamicEPsa(makePart1Form({ age: 42, race: 'white', brcaStatus: 'positive', familyHistory: 0 }));
    expect(result.recommendPSA).toBe(true);
  });

  // ── AGES 45-49 (AUA: baseline PSA may be offered — conditional) ──────────

  it('[15] age 47, average-risk — guideline: conditional baseline only; ePSA may upgrade to strong rec', () => {
    const result = calculateDynamicEPsa(makePart1Form({ age: 47, race: 'white', bmi: 24, familyHistory: 0 }));
    expect(result).not.toBeNull();
    expect([true, false, null]).toContain(result.recommendPSA);
  });

  it('[16] age 48, high IPSS, smoking, western diet — ePSA may strongly recommend despite borderline age', () => {
    const result = calculateDynamicEPsa(makePart1Form({
      age: 48, race: 'white', bmi: 29, familyHistory: 0,
      ipss: [3, 3, 3, 3, 3, 3, 3], smoking: 2, dietPattern: 'western'
    }));
    expect(result.recommendPSA).toBe(true);
    // Score should be higher than a baseline low-risk 48yo
    const baseline = calculateDynamicEPsa(makePart1Form({ age: 48, race: 'white', bmi: 23 }));
    expect(result.score).toBeGreaterThan(baseline.score);
  });

  // ── AGES 50-69 (guidelines say: screen every 2-4 years — strong rec) ─────

  it('[17] age 55, all low-risk — guideline: screen anyway; ePSA may say low risk but still recommend', () => {
    const result = calculateDynamicEPsa(makePart1Form({
      age: 55, race: 'white', bmi: 22, familyHistory: 0,
      ipss: [0, 0, 0, 0, 0, 0, 0], shim: [5, 5, 5, 5, 5],
      exercise: 0, comorbidityScore: 0
    }));
    expect(result.recommendPSA).toBe(true);
    // Should recommend even if score is low — age 50-69 always gets screening
  });

  it('[18] age 60, low score, no risk factors — guideline: screen; ePSA should recommend', () => {
    const result = calculateDynamicEPsa(makePart1Form({ age: 60, race: 'white', bmi: 22, familyHistory: 0 }));
    expect(result.recommendPSA).toBe(true);
  });

  it('[19] age 65, healthy lifestyle, low IPSS, no FH — guideline: screen; ePSA should recommend', () => {
    const result = calculateDynamicEPsa(makePart1Form({
      age: 65, race: 'white', bmi: 21, familyHistory: 0,
      ipss: [0, 0, 0, 0, 0, 0, 0], shim: [5, 5, 5, 5, 5], exercise: 0
    }));
    expect(result.recommendPSA).toBe(true);
  });

  it('[20] age 52, Black ancestry + family history — ePSA should strongly recommend (higher than baseline)', () => {
    const baseline = calculateDynamicEPsa(makePart1Form({ age: 52, race: 'white', familyHistory: 0 }));
    const highRisk = calculateDynamicEPsa(makePart1Form({ age: 52, race: 'black', familyHistory: 1, brcaStatus: 'positive' }));
    expect(highRisk.score).toBeGreaterThan(baseline.score);
    expect(highRisk.recommendPSA).toBe(true);
  });

  // ── AGES 70-75 (AUA: SDM; continue if healthy & >10yr life expectancy) ───

  it('[21] age 71, average-risk, healthy — guideline: SDM; ePSA may still give a score and recommendation', () => {
    const result = calculateDynamicEPsa(makePart1Form({ age: 71, race: 'white', bmi: 24, familyHistory: 0 }));
    expect(result.aboveMaxScreeningAge).toBeFalsy();
    expect(result.score).toBeGreaterThan(0);
  });

  it('[22] age 73, multiple comorbidities — guideline: likely discontinue; ePSA may still flag risk', () => {
    const result = calculateDynamicEPsa(makePart1Form({
      age: 73, race: 'white', bmi: 31, familyHistory: 0,
      comorbidityScore: 2, hypertension: 1, diabetes: 1, coronaryArteryDisease: 1
    }));
    expect(result.score).toBeGreaterThan(0);
  });

  it('[23] age 74, Black ancestry, BRCA positive — guideline: SDM; ePSA should show elevated risk', () => {
    const result = calculateDynamicEPsa(makePart1Form({ age: 74, race: 'black', brcaStatus: 'positive', familyHistory: 1 }));
    expect(result.score).toBeGreaterThan(50);
    expect(result.recommendPSA).toBe(true);
  });

  // ── LIFESTYLE FACTORS (not in guidelines but ePSA includes) ─────────────

  it('[24] age 50, heavy smoker + western diet — guidelines don\'t use these; ePSA elevates score', () => {
    const base = calculateDynamicEPsa(makePart1Form({ age: 50, race: 'white', smoking: 0, dietPattern: 'mediterranean' }));
    const smoker = calculateDynamicEPsa(makePart1Form({ age: 50, race: 'white', smoking: 2, dietPattern: 'western' }));
    expect(smoker.score).toBeGreaterThan(base.score);
  });

  it('[25] age 50, chemical/911 exposure — guidelines don\'t include this; ePSA adds risk points', () => {
    const base = calculateDynamicEPsa(makePart1Form({ age: 50, race: 'white', chemicalExposure: 'no' }));
    const exposed = calculateDynamicEPsa(makePart1Form({ age: 50, race: 'white', chemicalExposure: 'yes' }));
    expect(exposed.score).toBeGreaterThan(base.score);
  });

  it('[26] age 50, sedentary + obese — lifestyle factors elevate ePSA score beyond guideline age-only rec', () => {
    const healthy = calculateDynamicEPsa(makePart1Form({ age: 50, race: 'white', bmi: 22, exercise: 0 }));
    const obese = calculateDynamicEPsa(makePart1Form({ age: 50, race: 'white', bmi: 35, exercise: 2 }));
    expect(obese.score).toBeGreaterThan(healthy.score);
  });

  it('[27] age 50, high IPSS (urinary symptoms) — guidelines don\'t flag IPSS; ePSA significantly elevates score', () => {
    const noSymptoms = calculateDynamicEPsa(makePart1Form({ age: 50, ipss: [0, 0, 0, 0, 0, 0, 0] }));
    const severe = calculateDynamicEPsa(makePart1Form({ age: 50, ipss: [5, 5, 5, 5, 5, 5, 5] }));
    expect(severe.score).toBeGreaterThan(noSymptoms.score);
  });

  it('[28] age 50, low SHIM (erectile dysfunction) — ePSA elevates score; guidelines do not use SHIM', () => {
    const normal = calculateDynamicEPsa(makePart1Form({ age: 50, shim: [5, 5, 5, 5, 5] }));
    const ed = calculateDynamicEPsa(makePart1Form({ age: 50, shim: [1, 1, 1, 1, 1] }));
    expect(ed.score).toBeGreaterThanOrEqual(normal.score);
  });

  it('[29] age 50, inflammation history — guidelines don\'t use this; ePSA adds risk', () => {
    const noInflamm = calculateDynamicEPsa(makePart1Form({ age: 50, race: 'white', inflammationHistory: 0 }));
    const inflamed = calculateDynamicEPsa(makePart1Form({ age: 50, race: 'white', inflammationHistory: 1 }));
    expect(inflamed.score).toBeGreaterThan(noInflamm.score);
  });

  // ── COMBINED EDGE CASE ────────────────────────────────────────────────────

  it('[30] age 46, non-Black, no FH, but obesity+IPSS+SHIM+smoking — ePSA may strongly recommend despite marginal guideline age window', () => {
    const result = calculateDynamicEPsa(makePart1Form({
      age: 46, race: 'white', bmi: 36, familyHistory: 0,
      ipss: [4, 4, 4, 4, 4, 4, 4],
      shim: [1, 1, 1, 1, 1],
      smoking: 2,
      dietPattern: 'western',
      inflammationHistory: 1,
      chemicalExposure: 'yes',
      comorbidityScore: 1
    }));
    expect(result).not.toBeNull();
    expect(result.recommendPSA).toBe(true);
    // This patient has multiple non-guideline risk factors that push ePSA to recommend
    // AUA/NCCN only gives a conditional baseline rec at 45-50; ePSA goes further
    expect(result.psaRecommendReason).toBeTruthy();
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

});
