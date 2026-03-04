/**
 * Run many patient profiles through Part 1 and Part 2 and print results.
 * Run from frontend: node src/runPatientTests.mjs
 */
import { calculateDynamicEPsa, calculateDynamicEPsaPost } from './utils/epsaEngine.js';
import { makePart1Form, makePreResult, makePart2Post } from './utils/testPatientHelpers.js';

const part1Profiles = [
  { label: 'Young, low-risk, no FH', form: makePart1Form({ age: 42, race: 'white', bmi: 22, familyHistory: 0 }) },
  { label: 'Age 50–59, BMI 27', form: makePart1Form({ age: 55, bmi: 27 }) },
  { label: 'Black, age 55', form: makePart1Form({ age: 55, race: 'black' }) },
  { label: 'Family history, age 45', form: makePart1Form({ age: 45, familyHistory: 1 }) },
  { label: 'High BMI (32)', form: makePart1Form({ bmi: 32 }) },
  { label: 'IPSS moderate (8)', form: makePart1Form({ ipss: [2, 2, 2, 2, 0, 0, 0] }) },
  { label: 'Age 70+', form: makePart1Form({ age: 72 }) },
  { label: 'Exercise none', form: makePart1Form({ exercise: 2 }) },
  { label: 'Baseline (55, BMI 24)', form: makePart1Form() },
];

const part2Profiles = [
  { label: 'PSA 2', post: makePart2Post({ psa: 2 }) },
  { label: 'PSA 5', post: makePart2Post({ psa: 5 }) },
  { label: 'PSA 15', post: makePart2Post({ psa: 15 }) },
  { label: 'PSA 5 + PI-RADS 3', post: makePart2Post({ psa: 5, knowPirads: true, pirads: 3 }) },
  { label: 'PSA 5 + PI-RADS 5', post: makePart2Post({ psa: 5, knowPirads: true, pirads: 5 }) },
];

console.log('=== Part 1 — Patient profiles ===\n');
for (const { label, form } of part1Profiles) {
  const r = calculateDynamicEPsa(form);
  if (!r) {
    console.log(`${label}: INVALID (validation failed)`);
    continue;
  }
  console.log(`${label}:`);
  console.log(`  Score: ${r.score}%  Tier: ${r.tierRisk}  Recommend PSA: ${r.recommendPSA}  Range: ${r.confidenceRange}`);
  console.log('');
}

console.log('=== Part 2 — PSA / PI-RADS profiles (preResult score 30%) ===\n');
const preResult = makePreResult({ score: 30 });
for (const { label, post } of part2Profiles) {
  const r = calculateDynamicEPsaPost(preResult, post);
  console.log(`${label}: ${r.riskPct}  ${r.riskClass}  Range: ${r.riskPctRange || '—'}`);
}
console.log('\nDone.');
