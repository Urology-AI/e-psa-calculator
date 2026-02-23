/**
 * ePSA Model Test Suite
 * Validates the 7-variable logistic regression model
 * 
 * Model Formula:
 * logit = -3.8347
 *   + 0.0454 × Age (years)
 *   - 0.0253 × Race_Black (1=Black, 0=other)
 *   + 0.0195 × BMI (kg/m²)
 *   - 0.0292 × IPSS (0-35)
 *   - 0.5947 × Exercise (0=regular, 1=some, 2=none)
 *   - 0.8911 × FH (1=yes, 0=no)
 *   - 0.0358 × SHIM (5-25)
 * 
 * probability = 1 / (1 + e^(-logit))
 * 
 * Tier Thresholds:
 * - Lower: < 8%
 * - Moderate: 8% - 20%
 * - Higher: ≥ 20%
 * 
 * Displayed range: ±10% confidence interval
 */

// Test the model manually
const calculateLogit = (age, raceBlack, bmi, ipss, exercise, fh, shim) => {
  return -3.8347
    + (0.0454 * age)
    - (0.0253 * raceBlack)
    + (0.0195 * bmi)
    - (0.0292 * ipss)
    - (0.5947 * exercise)
    - (0.8911 * fh)
    - (0.0358 * shim);
};

const calculateProbability = (logit) => {
  return 1 / (1 + Math.exp(-logit));
};

// Test cases
const testCases = [
  {
    name: "Young, healthy, regular exercise",
    age: 45,
    race: 'white',
    bmi: 22,
    ipss: [0, 0, 0, 0, 0, 0, 0], // Total = 0
    shim: [5, 5, 5, 5, 5], // Total = 25
    exercise: 0, // regular
    familyHistory: 0,
    expectedTier: 'LOWER'
  },
  {
    name: "Older, no exercise, high IPSS",
    age: 70,
    race: 'white',
    bmi: 30,
    ipss: [5, 5, 5, 5, 5, 5, 5], // Total = 35
    shim: [1, 1, 1, 1, 1], // Total = 5
    exercise: 2, // none
    familyHistory: 1,
    expectedTier: 'HIGHER'
  },
  {
    name: "Middle-aged, some exercise, family history",
    age: 55,
    race: 'white',
    bmi: 27,
    ipss: [2, 2, 2, 2, 2, 2, 2], // Total = 14
    shim: [3, 3, 3, 3, 3], // Total = 15
    exercise: 1, // some
    familyHistory: 1,
    expectedTier: 'MODERATE'
  },
  {
    name: "Black patient (protective coefficient)",
    age: 60,
    race: 'black',
    bmi: 25,
    ipss: [1, 1, 1, 1, 1, 1, 1], // Total = 7
    shim: [4, 4, 4, 4, 4], // Total = 20
    exercise: 0,
    familyHistory: 0,
    expectedTier: 'LOWER'
  },
  {
    name: "High BMI, no exercise, family history",
    age: 65,
    race: 'white',
    bmi: 35,
    ipss: [3, 3, 3, 3, 3, 3, 3], // Total = 21
    shim: [2, 2, 2, 2, 2], // Total = 10
    exercise: 2,
    familyHistory: 1,
    expectedTier: 'HIGHER'
  },
  {
    name: "Boundary test - ~8% threshold",
    age: 50,
    race: 'white',
    bmi: 25,
    ipss: [1, 1, 1, 1, 1, 1, 1], // Total = 7
    shim: [3, 3, 3, 3, 3], // Total = 15
    exercise: 1,
    familyHistory: 0,
    expectedTier: 'MODERATE'
  },
  {
    name: "Boundary test - ~20% threshold",
    age: 68,
    race: 'white',
    bmi: 28,
    ipss: [4, 4, 4, 4, 4, 4, 4], // Total = 28
    shim: [2, 2, 2, 2, 2], // Total = 10
    exercise: 2,
    familyHistory: 1,
    expectedTier: 'HIGHER'
  },
  {
    name: "Minimum age, healthy",
    age: 40,
    race: 'white',
    bmi: 20,
    ipss: [0, 0, 0, 0, 0, 0, 0],
    shim: [5, 5, 5, 5, 5],
    exercise: 0,
    familyHistory: 0,
    expectedTier: 'LOWER'
  }
];

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║           ePSA MODEL VALIDATION TEST SUITE                     ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('Model: 7-Variable Logistic Regression');
console.log('AUC: 0.610 (95% CI: 0.481–0.737)');
console.log('Derivation: n=100 | Recalibrated to ~15% screening prevalence\n');

console.log('Variables:');
console.log('  1. Age (years)');
console.log('  2. Race_Black (1=Black, 0=other) [coefficient: -0.0253]');
console.log('  3. BMI (kg/m²)');
console.log('  4. IPSS (0-35, 7 questions)');
console.log('  5. SHIM (5-25, 5 questions)');
console.log('  6. Exercise (0=regular, 1=some, 2=none)');
console.log('  7. Family History (1=yes, 0=no)\n');

console.log('Tier Thresholds:');
console.log('  Lower: < 8%');
console.log('  Moderate: 8% - 20%');
console.log('  Higher: ≥ 20%');
console.log('  Displayed range: ±10% confidence interval\n');

console.log('═'.repeat(80));
console.log('TEST RESULTS:');
console.log('═'.repeat(80) + '\n');

let passed = 0;
let failed = 0;

testCases.forEach((test, idx) => {
  const raceBlack = test.race === 'black' ? 1 : 0;
  const ipssTotal = test.ipss.reduce((a, b) => a + b, 0);
  const shimTotal = test.shim.reduce((a, b) => a + b, 0);
  
  const logit = calculateLogit(
    test.age,
    raceBlack,
    test.bmi,
    ipssTotal,
    test.exercise,
    test.familyHistory,
    shimTotal
  );
  
  const probability = calculateProbability(logit);
  const scorePercent = Math.round(probability * 100);
  
  let tier;
  if (probability < 0.08) tier = 'LOWER';
  else if (probability < 0.20) tier = 'MODERATE';
  else tier = 'HIGHER';
  
  const success = tier === test.expectedTier;
  if (success) passed++; else failed++;
  
  console.log(`Test ${idx + 1}: ${test.name}`);
  console.log(`  Age: ${test.age}, Race: ${test.race}, BMI: ${test.bmi}`);
  console.log(`  IPSS: ${ipssTotal}, SHIM: ${shimTotal}, Exercise: ${test.exercise}, FH: ${test.familyHistory}`);
  console.log(`  Logit: ${logit.toFixed(4)}`);
  console.log(`  Probability: ${(probability * 100).toFixed(2)}%`);
  console.log(`  Score: ${scorePercent}%`);
  console.log(`  Tier: ${tier} ${success ? '✓' : '✗ (expected: ' + test.expectedTier + ')'}`);
  console.log(`  Range: ${Math.max(0, scorePercent - 10)}%–${Math.min(100, scorePercent + 10)}%`);
  console.log();
});

console.log('═'.repeat(80));
console.log(`SUMMARY: ${passed}/${testCases.length} tests passed, ${failed} failed`);
console.log('═'.repeat(80));

// Verify model coefficients add up correctly for edge cases
console.log('\n\nMODEL COEFFICIENT VERIFICATION:');
console.log('═'.repeat(80));

// Calculate what gives exactly 8% (logit ≈ -2.44)
const logitFor8Pct = Math.log(0.08 / 0.92); // ≈ -2.442
console.log(`\nLogit for 8% threshold: ${logitFor8Pct.toFixed(4)}`);

// Calculate what gives exactly 20% (logit ≈ -1.39)
const logitFor20Pct = Math.log(0.20 / 0.80); // ≈ -1.386
console.log(`Logit for 20% threshold: ${logitFor20Pct.toFixed(4)}`);

console.log('\n\nSENSITIVITY ANALYSIS:');
console.log('═'.repeat(80));

// Test impact of each variable
const baseline = { age: 55, raceBlack: 0, bmi: 25, ipss: 14, exercise: 1, fh: 0, shim: 15 };
const baselineLogit = calculateLogit(55, 0, 25, 14, 1, 0, 15);
const baselineProb = calculateProbability(baselineLogit);

console.log(`\nBaseline (55yo, white, BMI 25, IPSS 14, some exercise, no FH, SHIM 15):`);
console.log(`  Probability: ${(baselineProb * 100).toFixed(2)}%`);

console.log(`\nVariable impact (changing one at a time):`);
console.log(`  Age +10 years: ${((calculateProbability(calculateLogit(65, 0, 25, 14, 1, 0, 15)) - baselineProb) * 100).toFixed(2)}% change`);
console.log(`  Black race: ${((calculateProbability(calculateLogit(55, 1, 25, 14, 1, 0, 15)) - baselineProb) * 100).toFixed(2)}% change`);
console.log(`  BMI +5: ${((calculateProbability(calculateLogit(55, 0, 30, 14, 1, 0, 15)) - baselineProb) * 100).toFixed(2)}% change`);
console.log(`  IPSS +10: ${((calculateProbability(calculateLogit(55, 0, 25, 24, 1, 0, 15)) - baselineProb) * 100).toFixed(2)}% change`);
console.log(`  No exercise (2): ${((calculateProbability(calculateLogit(55, 0, 25, 14, 2, 0, 15)) - baselineProb) * 100).toFixed(2)}% change`);
console.log(`  Family history: ${((calculateProbability(calculateLogit(55, 0, 25, 14, 1, 1, 15)) - baselineProb) * 100).toFixed(2)}% change`);
console.log(`  SHIM -10: ${((calculateProbability(calculateLogit(55, 0, 25, 14, 1, 0, 5)) - baselineProb) * 100).toFixed(2)}% change`);
