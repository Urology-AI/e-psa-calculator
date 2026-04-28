import { describe, it, expect } from 'vitest';
import { calculateDynamicEPsa } from './epsaEngine';

const patients = [
  {
    label: 'P1 — Ideal (35yo white, IPSS 0, no risks)',
    form: { age: 35, race: 'white', bmi: 22, ipss: [0,0,0,0,0,0,0], shim: [5,5,5,5,5], exercise: 0, familyHistory: 0, comorbidityScore: 0 }
  },
  {
    label: 'P2 — Average-risk window (60yo white, IPSS 0)',
    form: { age: 60, race: 'white', bmi: 24, ipss: [0,0,0,0,0,0,0], shim: [5,5,5,5,5], exercise: 0, familyHistory: 0, comorbidityScore: 0 }
  },
  {
    label: 'P3 — Black 42yo, IPSS 0 (should recommend PSA)',
    form: { age: 42, race: 'black', bmi: 24, ipss: [0,0,0,0,0,0,0], shim: [5,5,5,5,5], exercise: 0, familyHistory: 0, comorbidityScore: 0 }
  },
  {
    label: 'P4 — Black 35yo (under 40, race should NOT add risk)',
    form: { age: 35, race: 'black', bmi: 24, ipss: [0,0,0,0,0,0,0], shim: [5,5,5,5,5], exercise: 0, familyHistory: 0, comorbidityScore: 0 }
  },
  {
    label: 'P5 — Family history 45yo, IPSS 0',
    form: { age: 45, race: 'white', bmi: 24, ipss: [0,0,0,0,0,0,0], shim: [5,5,5,5,5], exercise: 0, familyHistory: 1, comorbidityScore: 0 }
  },
  {
    label: 'P6 — IPSS mild (total 5) vs P7 IPSS moderate (total 10), same 50yo',
    form: { age: 50, race: 'white', bmi: 24, ipss: [1,1,1,1,1,0,0], shim: [5,5,5,5,5], exercise: 0, familyHistory: 0, comorbidityScore: 0 }
  },
  {
    label: 'P7 — IPSS moderate (total 10), 50yo',
    form: { age: 50, race: 'white', bmi: 24, ipss: [2,2,2,2,1,1,0], shim: [5,5,5,5,5], exercise: 0, familyHistory: 0, comorbidityScore: 0 }
  },
  {
    label: 'P8 — Worst case (72yo black, obese, IPSS severe, BRCA+, FH, comorbid)',
    form: { age: 72, race: 'black', bmi: 35, ipss: [4,4,4,4,4,4,4], shim: [5,5,5,5,5], exercise: 2, familyHistory: 1, comorbidityScore: 2, brcaStatus: 'positive', smoking: 2 }
  },
  {
    label: 'P9 — 70yo white, obese, no exercise, 1 comorbidity',
    form: { age: 70, race: 'white', bmi: 31, ipss: [0,0,0,0,0,0,0], shim: [5,5,5,5,5], exercise: 2, familyHistory: 0, comorbidityScore: 1 }
  },
  {
    label: 'P10 — Same as P3 but white 42yo (confirm race gap)',
    form: { age: 42, race: 'white', bmi: 24, ipss: [0,0,0,0,0,0,0], shim: [5,5,5,5,5], exercise: 0, familyHistory: 0, comorbidityScore: 0 }
  }
];

describe('ePSA Part 1 — Clinical test patients', () => {
  for (const p of patients) {
    it(p.label, () => {
      const r = calculateDynamicEPsa(p.form);
      expect(r).not.toBeNull();

      const raw = r.calculationDetails?.rawScore;
      const itemImpacts = r.itemImpacts ?? [];
      const topItems = itemImpacts.filter(b => b.points > 0).map(b => `${b.item}: +${b.points}`).join(' | ') || '(none)';

      console.log(`  Score ${r.score}/100  Raw ${raw}/80  Tier: ${r.epsaTierLabel}`);
      console.log(`  PSA: ${r.recommendPSA === true ? 'RECOMMENDED' : r.recommendPSA === false ? 'NOT RECOMMENDED' : 'BORDERLINE'}  (${r.psaRecommendReason ?? 'no reason'})`);
      console.log(`  Factors: ${topItems}`);
    });
  }

  // ── Clinical sanity checks ──────────────────────────────────────────────────

  it('IPSS 0 (ideal) gives 0 raw IPSS contribution', () => {
    const r = calculateDynamicEPsa({ age: 50, race: 'white', bmi: 24, ipss: [0,0,0,0,0,0,0], shim: [5,5,5,5,5], exercise: 0, familyHistory: 0, comorbidityScore: 0 });
    const ipssItem = r.itemImpacts.find(b => b.item === 'IPSS total');
    expect(ipssItem.points).toBe(0);
  });

  it('IPSS moderate (8+) gives 8 raw IPSS contribution', () => {
    const r = calculateDynamicEPsa({ age: 50, race: 'white', bmi: 24, ipss: [2,2,2,2,0,0,0], shim: [5,5,5,5,5], exercise: 0, familyHistory: 0, comorbidityScore: 0 });
    const ipssItem = r.itemImpacts.find(b => b.item === 'IPSS total');
    expect(ipssItem.points).toBe(8);
  });

  it('Black 35yo same score as white 35yo (age gate)', () => {
    const black = calculateDynamicEPsa({ age: 35, race: 'black', bmi: 24, ipss: [0,0,0,0,0,0,0], shim: [5,5,5,5,5], exercise: 0, familyHistory: 0, comorbidityScore: 0 });
    const white = calculateDynamicEPsa({ age: 35, race: 'white', bmi: 24, ipss: [0,0,0,0,0,0,0], shim: [5,5,5,5,5], exercise: 0, familyHistory: 0, comorbidityScore: 0 });
    const blackItem = black.itemImpacts.find(b => b.item === 'Black ancestry');
    const whiteItem = white.itemImpacts.find(b => b.item === 'Black ancestry');
    expect(blackItem.points).toBe(0);
    expect(whiteItem.points).toBe(0);
    expect(black.score).toBe(white.score);
  });

  it('Black 42yo gets 8 ancestry points (age >= 40)', () => {
    const r = calculateDynamicEPsa({ age: 42, race: 'black', bmi: 24, ipss: [0,0,0,0,0,0,0], shim: [5,5,5,5,5], exercise: 0, familyHistory: 0, comorbidityScore: 0 });
    const item = r.itemImpacts.find(b => b.item === 'Black ancestry');
    expect(item.points).toBe(8);
    expect(r.recommendPSA).toBe(true);
    expect(r.psaRecommendReason).toBe('high_risk_early_screening');
  });

  it('PSA recommendation is never green for elevated tier (null→borderline, not false)', () => {
    // At elevated tier (rawScore >= 18), upper CI always >= 27.5% > 22.5% threshold
    // so recommendPSA must never be false for elevated-tier patients
    const r = calculateDynamicEPsa({ age: 55, race: 'white', bmi: 24, ipss: [0,0,0,0,0,0,0], shim: [5,5,5,5,5], exercise: 0, familyHistory: 0, comorbidityScore: 2 });
    if (r.epsaTierKey === 'elevated') {
      expect(r.recommendPSA).not.toBe(false);
    }
  });

  it('Ideal young patient gets PSA_NOT_RECOMMENDED', () => {
    const r = calculateDynamicEPsa({ age: 35, race: 'white', bmi: 22, ipss: [0,0,0,0,0,0,0], shim: [5,5,5,5,5], exercise: 0, familyHistory: 0, comorbidityScore: 0 });
    expect(r.recommendPSA).toBe(false);
    expect(r.epsaTierKey).toBe('low');
  });

  it('Age 55–69 always PSA recommended regardless of low score', () => {
    const r = calculateDynamicEPsa({ age: 57, race: 'white', bmi: 22, ipss: [0,0,0,0,0,0,0], shim: [5,5,5,5,5], exercise: 0, familyHistory: 0, comorbidityScore: 0 });
    expect(r.recommendPSA).toBe(true);
    expect(r.psaRecommendReason).toBe('age_guideline_55_69');
  });

  it('Family history + age 45 → PSA recommended (family_history_override)', () => {
    const r = calculateDynamicEPsa({ age: 45, race: 'white', bmi: 24, ipss: [0,0,0,0,0,0,0], shim: [5,5,5,5,5], exercise: 0, familyHistory: 1, comorbidityScore: 0 });
    expect(r.recommendPSA).toBe(true);
    expect(r.psaRecommendReason).toBe('family_history_override');
  });

  it('Moderate IPSS patient scores higher than mild IPSS', () => {
    const mild = calculateDynamicEPsa({ age: 50, race: 'white', bmi: 24, ipss: [0,0,0,0,0,0,0], shim: [5,5,5,5,5], exercise: 0, familyHistory: 0, comorbidityScore: 0 });
    const mod  = calculateDynamicEPsa({ age: 50, race: 'white', bmi: 24, ipss: [2,2,2,2,0,0,0], shim: [5,5,5,5,5], exercise: 0, familyHistory: 0, comorbidityScore: 0 });
    expect(mod.calculationDetails.rawScore).toBeGreaterThan(mild.calculationDetails.rawScore);
  });
});
