/**
 * Pathway wiring, biopsy rules (Model 3), CSV export shape, and golden Part 1 profiles.
 * Mirrors the Claude Code verification checklist for the three-pathway ePSA flow.
 */
import { describe, it, expect } from 'vitest';
import { calculateDynamicEPsa, calculateDynamicEPsaPost } from './epsaEngine';
import { makePart1Form, makePreResult, makePart2Post } from './testPatientHelpers';
import { buildPart1CsvRows, buildPart2CsvRows } from './exportCsv';
import { DEFAULT_CALCULATOR_CONFIG } from '../config/calculatorConfig';

describe('Pathway mode — Part 1 engine', () => {
  it('defaults pathwayMode to pre_psa when omitted', () => {
    const r = calculateDynamicEPsa(makePart1Form());
    expect(r.pathwayMode).toBe('pre_psa');
  });

  it('echoes explicit pathwayMode from formData', () => {
    const r = calculateDynamicEPsa({ ...makePart1Form(), pathwayMode: 'post_psa' });
    expect(r.pathwayMode).toBe('post_psa');
  });
});

describe('Pathway mode — Part 2 engine', () => {
  it('uses postData.pathwayMode when set', () => {
    const pre = makePreResult();
    const r = calculateDynamicEPsaPost(pre, {
      ...makePart2Post({ psa: 4 }),
      pathwayMode: 'post_mri',
    });
    expect(r.pathwayMode).toBe('post_mri');
  });

  it('infers post_psa when pathwayMode omitted and no PI-RADS', () => {
    const r = calculateDynamicEPsaPost(makePreResult(), makePart2Post({ psa: 4, knowPirads: false }));
    expect(r.pathwayMode).toBe('post_psa');
  });

  it('infers post_mri when knowPirads is true (legacy sessions)', () => {
    const r = calculateDynamicEPsaPost(
      makePreResult(),
      makePart2Post({ psa: 4, knowPirads: true, pirads: 3 })
    );
    expect(r.pathwayMode).toBe('post_mri');
  });
});

describe('Biopsy recommendation (post_mri logic in engine)', () => {
  it('PI-RADS 5 → pirads_5 (piradsOverridden)', () => {
    const r = calculateDynamicEPsaPost(
      makePreResult({ score: 25 }),
      makePart2Post({ psa: 5, knowPirads: true, pirads: 5, pathwayMode: 'post_mri' })
    );
    expect(r.piradsOverridden).toBe(true);
    expect(r.biopsyRecommended).toBe(true);
    expect(r.biopsyReason).toBe('pirads_5');
    expect(r.biopsyMessage).toMatch(/PI-RADS 5/i);
  });

  it('totalPoints >= 56 → combined_score_high', () => {
    const pre = makePreResult({ calculationDetails: { rawScore: 11, maxScore: 80 }, score: 14 });
    const r = calculateDynamicEPsaPost(pre, makePart2Post({ psa: 15, pathwayMode: 'post_mri' }));
    expect(r.totalPoints).toBe(56);
    expect(r.biopsyRecommended).toBe(true);
    expect(r.biopsyReason).toBe('combined_score_high');
  });

  it('orange discordance + tierIndex >= 2 → high_risk_discordance', () => {
    const pre = makePreResult({
      score: 44,
      calculationDetails: { rawScore: 35, maxScore: 80 },
      isBlack: true,
    });
    const r = calculateDynamicEPsaPost(
      pre,
      makePart2Post({ psa: 0.5, knowPirads: false, pathwayMode: 'post_mri' })
    );
    expect(r.discordanceFlag?.severity).toBe('orange');
    expect(r.biopsyRecommended).toBe(true);
    expect(r.biopsyReason).toBe('high_risk_discordance');
  });
});

describe('CSV export — pathwayMode first, human-readable labels', () => {
  it('Part 1 row starts with pathwayMode column', () => {
    const form = { ...makePart1Form(), pathwayMode: 'pre_psa' };
    const result = calculateDynamicEPsa(form);
    const rows = buildPart1CsvRows(form, result, {});
    const keys = Object.keys(rows[0]);
    expect(keys[0]).toBe('pathwayMode');
    expect(rows[0].pathwayMode).toBe('Pre-PSA Assessment');
  });

  it('Part 2 row starts with pathwayMode column', () => {
    const post = { ...makePart2Post({ psa: 5 }), pathwayMode: 'post_mri' };
    const preResult = makePreResult({ score: 30 });
    const postResult = calculateDynamicEPsaPost(preResult, post);
    const rows = buildPart2CsvRows(post, preResult, postResult, {});
    const keys = Object.keys(rows[0]);
    expect(keys[0]).toBe('pathwayMode');
    expect(rows[0].pathwayMode).toBe('Post-MRI Assessment');
  });

  it('maps post_psa label for Part 2 export', () => {
    const post = { ...makePart2Post({ psa: 4 }), pathwayMode: 'post_psa' };
    const preResult = makePreResult();
    const postResult = calculateDynamicEPsaPost(preResult, post);
    const rows = buildPart2CsvRows(post, preResult, postResult, {});
    expect(rows[0].pathwayMode).toBe('Post-PSA Assessment');
  });
});

describe('Golden Part 1 profiles (scores stable if weights unchanged)', () => {
  const cases = [
    ['Young, low-risk, no FH', makePart1Form({ age: 42, race: 'white', bmi: 22, familyHistory: 0 }), 10, 'LOWER'],
    ['Age 50–59, BMI 27', makePart1Form({ age: 55, bmi: 27 }), 10, 'LOWER'],
    ['Black, age 55', makePart1Form({ age: 55, race: 'black' }), 20, 'LOWER'],
    ['Family history, age 45', makePart1Form({ age: 45, familyHistory: 1 }), 23, 'LOWER'],
    ['High BMI (32)', makePart1Form({ bmi: 32 }), 15, 'LOWER'],
    ['IPSS moderate (8)', makePart1Form({ ipss: [2, 2, 2, 2, 0, 0, 0] }), 0, 'LOWER'],
    ['Age 70+', makePart1Form({ age: 72 }), 30, 'MODERATE'],
    ['Exercise none', makePart1Form({ exercise: 2 }), 15, 'LOWER'],
    ['Baseline (55, BMI 24)', makePart1Form(), 10, 'LOWER'],
  ];

  it.each(cases)('%s → score %i, tier %s', (_label, form, score, tier) => {
    const r = calculateDynamicEPsa(form);
    expect(r).not.toBeNull();
    expect(r.score).toBe(score);
    expect(r.tierRisk).toBe(tier);
  });
});

describe('calculatorConfig — Part 1 recommend threshold', () => {
  it('uses 0.225 (22.5%) so config matches engine default screening gate', () => {
    expect(DEFAULT_CALCULATOR_CONFIG.part1.recommendThreshold).toBe(0.225);
  });
});
