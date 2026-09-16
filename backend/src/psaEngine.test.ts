import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRecommendation, RequestSchema } from './psaEngine';

/**
 * Phase 1 success criterion (ePSA Platform roadmap): backend output must
 * remain identical to a direct call into @urology-ai/epsa-engine. Since
 * computeRecommendation is now a thin wrapper — it calls
 * calculateDynamicEPsa/calculateDynamicEPsaPost directly and only adds
 * guardrailAlerts/auaThreshold/psaAboveAuaThreshold/engineVersion/
 * guidelineVersion on top — this test asserts every field the engine itself
 * produced survives untouched through that wrapper, for representative
 * patient profiles.
 */

const PROFILES: Array<{ name: string; raw: unknown }> = [
  {
    name: 'young low-risk, pre-PSA only',
    raw: {
      prePsa: {
        age: 42, race: 'white', bmi: 24.5, ipss: [1, 0, 1, 0, 1, 0, 1],
        shim: [4, 4, 4, 4, 4], exercise: 1, familyHistory: 0,
        comorbidityScore: 0, brcaStatus: 'no',
      },
    },
  },
  {
    name: 'older elevated-risk with BRCA+, pre-PSA only',
    raw: {
      prePsa: {
        age: 67, race: 'black', bmi: 31.2, ipss: [3, 3, 3, 3, 3, 3, 3],
        shim: [1, 1, 1, 1, 1], exercise: 0, familyHistory: 2,
        comorbidityScore: 2, brcaStatus: 'yes', smoking: 1,
      },
    },
  },
  {
    name: 'combined pre-PSA + PSA/PI-RADS (Part 2)',
    raw: {
      prePsa: {
        age: 58, race: 'hispanic', bmi: 27.0, ipss: [2, 2, 2, 2, 2, 2, 2],
        shim: [3, 3, 3, 3, 3], exercise: 2, familyHistory: 1,
        comorbidityScore: 1, brcaStatus: 'unknown',
      },
      postPsa: { psa: 6.4, pirads: 4, knowPirads: true },
    },
  },
];

for (const { name, raw } of PROFILES) {
  test(`backend output matches direct epsa-engine call — ${name}`, async () => {
    const input = RequestSchema.parse(raw);
    const backendResult = await computeRecommendation(input);

    const { calculateDynamicEPsa, calculateDynamicEPsaPost } = await import('@urology-ai/epsa-engine');
    const enginePart1 = calculateDynamicEPsa(input.prePsa);

    // computedAt is a wall-clock timestamp generated fresh on each call (here,
    // and separately below) — expected to differ by a millisecond or two
    // between the two invocations, not a real divergence.
    const NONDETERMINISTIC_FIELDS = new Set(['computedAt']);

    // Every field the engine produced for part1 must be untouched on the way
    // through computeRecommendation (backend only adds fields, never edits).
    for (const [key, value] of Object.entries(enginePart1)) {
      if (NONDETERMINISTIC_FIELDS.has(key)) continue;
      assert.deepEqual(
        (backendResult.part1 as Record<string, unknown>)[key],
        value,
        `part1.${key} diverged from direct engine call`,
      );
    }

    if (input.postPsa?.psa) {
      const enginePart2 = calculateDynamicEPsaPost(enginePart1, input.postPsa);
      assert.ok(backendResult.part2, 'expected part2 to be present');
      for (const [key, value] of Object.entries(enginePart2)) {
        if (NONDETERMINISTIC_FIELDS.has(key)) continue;
        assert.deepEqual(
          (backendResult.part2 as Record<string, unknown>)[key],
          value,
          `part2.${key} diverged from direct engine call`,
        );
      }
    } else {
      assert.equal(backendResult.part2, undefined);
    }
  });
}

// Part1Form offers these diet options; any value the schema rejects makes the
// whole callable 400 ("Some answers could not be scored"). 'asian' was missing.
test('RequestSchema accepts every diet option the web form offers', () => {
  for (const dietPattern of ['western', 'mediterranean', 'asian', 'dash', 'plant-based', 'pescatarian', 'low-carb-keto', 'other', '']) {
    const parsed = RequestSchema.safeParse({
      prePsa: { age: 55, race: 'white', bmi: 26, ipss: [0, 0, 0, 0, 0, 0, 0], shim: [4, 4, 4, 4, 4], exercise: 1, familyHistory: 0, comorbidityScore: 0, brcaStatus: 'no', dietPattern },
    });
    assert.ok(parsed.success, `dietPattern '${dietPattern}' was rejected`);
  }
});

// Part1Form's family-history options include 'Unknown' ('unknown'), which the
// engine scores as no family history. The schema only allowed 0-3.
test('RequestSchema accepts every family-history option the web form offers', () => {
  for (const familyHistory of [0, 1, 2, 'unknown', null]) {
    const parsed = RequestSchema.safeParse({
      prePsa: { age: 55, race: 'white', bmi: 26, ipss: [0, 0, 0, 0, 0, 0, 0], shim: [4, 4, 4, 4, 4], exercise: 1, familyHistory, comorbidityScore: 0, brcaStatus: 'no' },
    });
    assert.ok(parsed.success, `familyHistory '${familyHistory}' was rejected`);
  }
});
