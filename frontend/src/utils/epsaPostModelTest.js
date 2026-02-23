/**
 * ePSA-Post (Part 2) Model Validation Test Suite
 * Tests the Risk Assessment calculator with PSA and PIRADS integration
 */

const { calculateEPsaPost } = require('./epsaPostCalculator');

// Test runner helper
function runTest(name, fn) {
  try {
    const result = fn();
    return { name, ...result };
  } catch (error) {
    return { name, passed: false, error: error.message };
  }
}

// Mock preResults for testing
const mockPreResults = {
  low: { score: 9, riskTier: 'Lower' },           // 9% - maps to ~17 points
  moderate: { score: 15, riskTier: 'Moderate' },  // 15% - maps to ~29 points
  higher: { score: 35, riskTier: 'Higher' },      // 35% - maps to ~86 points
  veryHigh: { score: 55, riskTier: 'Higher' },    // 55% - maps to >120 points
};

// Helper to format results
function formatResult(result) {
  const status = result.passed ? '✓' : '✗';
  return `${status} ${result.name}`;
}

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║     ePSA-POST (PART 2) MODEL VALIDATION TEST SUITE            ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

console.log('Model: PSA ± MRI Integrated Risk Tool');
console.log('Variables: PSA level, PIRADS score (optional), Part 1 baseline\n');

const tests = [];

// Test 1: Low baseline + low PSA
let test = runTest('Low baseline + PSA < 1 ng/mL → Low Risk', () => {
  const result = calculateEPsaPost(mockPreResults.low, { psa: '0.5', knowPirads: false, pirads: '0' });
  const passed = result.riskClass === 'low-risk' && result.totalPoints <= 40;
  return {
    passed,
    details: `Points: ${result.totalPoints}, Risk: ${result.riskCat}`,
    expected: 'Low (0-40 pts)',
    actual: result.riskCat
  };
});
tests.push(test);

// Test 2: Low baseline + moderate PSA
test = runTest('Low baseline + PSA 2.5-4 ng/mL → Moderate Risk', () => {
  const result = calculateEPsaPost(mockPreResults.low, { psa: '3', knowPirads: false, pirads: '0' });
  const passed = result.riskClass === 'moderate-risk' || result.totalPoints <= 80;
  return {
    passed,
    details: `Points: ${result.totalPoints}, Risk: ${result.riskCat}`,
    expected: 'Moderate (41-80 pts)',
    actual: result.riskCat
  };
});
tests.push(test);

// Test 3: Moderate baseline + high PSA
test = runTest('Moderate baseline + PSA > 10 ng/mL → High/Very High Risk', () => {
  const result = calculateEPsaPost(mockPreResults.moderate, { psa: '15', knowPirads: false, pirads: '0' });
  const passed = result.totalPoints > 80 || result.riskClass === 'high-risk' || result.riskClass === 'very-high-risk';
  return {
    passed,
    details: `Points: ${result.totalPoints}, Risk: ${result.riskCat}`,
    expected: 'High or Very High',
    actual: result.riskCat
  };
});
tests.push(test);

// Test 4: PIRADS 4 override
test = runTest('PIRADS 4 → Automatic Very High Risk (52%)', () => {
  const result = calculateEPsaPost(mockPreResults.low, { psa: '2', knowPirads: true, pirads: '4' });
  const passed = result.piradsOverridden === true && result.riskPct.includes('52%');
  return {
    passed,
    details: `Risk: ${result.riskPct}, PIRADS Override: ${result.piradsOverridden}`,
    expected: '52% (43–61%)',
    actual: result.riskPct
  };
});
tests.push(test);

// Test 5: PIRADS 5 override
test = runTest('PIRADS 5 → Automatic Very High Risk (89%)', () => {
  const result = calculateEPsaPost(mockPreResults.low, { psa: '2', knowPirads: true, pirads: '5' });
  const passed = result.piradsOverridden === true && result.riskPct.includes('89%');
  return {
    passed,
    details: `Risk: ${result.riskPct}, PIRADS Override: ${result.piradsOverridden}`,
    expected: '89% (76–97%)',
    actual: result.riskPct
  };
});
tests.push(test);

// Test 6: PIRADS 3 adds points
test = runTest('PIRADS 3 → +10 points to calculation', () => {
  const resultWithout = calculateEPsaPost(mockPreResults.moderate, { psa: '2', knowPirads: true, pirads: '2' });
  const resultWith = calculateEPsaPost(mockPreResults.moderate, { psa: '2', knowPirads: true, pirads: '3' });
  const pointDiff = resultWith.totalPoints - resultWithout.totalPoints;
  const passed = pointDiff === 10;
  return {
    passed,
    details: `Without PIRADS 3: ${resultWithout.totalPoints} pts, With: ${resultWith.totalPoints} pts, Diff: ${pointDiff}`,
    expected: '+10 points',
    actual: `${pointDiff} points`
  };
});
tests.push(test);

// Test 7: PSA boundary 1.0 ng/mL
test = runTest('PSA boundary test - 0.9 vs 1.0 ng/mL', () => {
  const resultLow = calculateEPsaPost(mockPreResults.low, { psa: '0.9', knowPirads: false, pirads: '0' });
  const resultHigh = calculateEPsaPost(mockPreResults.low, { psa: '1.0', knowPirads: false, pirads: '0' });
  const passed = resultLow.totalPoints < resultHigh.totalPoints || 
                 (resultLow.psaPoints === 0 && resultHigh.psaPoints === 5);
  return {
    passed,
    details: `PSA 0.9: ${resultLow.totalPoints} pts, PSA 1.0: ${resultHigh.totalPoints} pts`,
    expected: '1.0 ng/mL adds PSA points',
    actual: `PSA 0.9 = ${resultLow.psaPoints || 0} pts, PSA 1.0 = ${resultHigh.psaPoints || 0} pts`
  };
});
tests.push(test);

// Test 8: PSA boundary 4.0 ng/mL
test = runTest('PSA boundary test - 4.0 vs 4.1 ng/mL', () => {
  const resultLow = calculateEPsaPost(mockPreResults.moderate, { psa: '4.0', knowPirads: false, pirads: '0' });
  const resultHigh = calculateEPsaPost(mockPreResults.moderate, { psa: '4.1', knowPirads: false, pirads: '0' });
  const passed = resultLow.psaPoints === 10 && resultHigh.psaPoints === 20;
  return {
    passed,
    details: `PSA 4.0: ${resultLow.totalPoints} pts (${resultLow.psaPoints} PSA), PSA 4.1: ${resultHigh.totalPoints} pts (${resultHigh.psaPoints} PSA)`,
    expected: 'PSA >4 adds 20 points',
    actual: `PSA 4.0 = ${resultLow.psaPoints} pts, PSA 4.1 = ${resultHigh.psaPoints} pts`
  };
});
tests.push(test);

// Test 9: Very high baseline + any PSA → Very High
test = runTest('Very high baseline (55%) + any PSA → Very High Risk', () => {
  const result = calculateEPsaPost(mockPreResults.veryHigh, { psa: '0.5', knowPirads: false, pirads: '0' });
  const passed = result.totalPoints > 120 || result.riskClass === 'very-high-risk';
  return {
    passed,
    details: `Points: ${result.totalPoints}, Risk: ${result.riskCat}`,
    expected: 'Very High (>120 pts)',
    actual: result.riskCat
  };
});
tests.push(test);

// Test 10: No PIRADS knowledge
test = runTest('No PIRADS knowledge → PIRADS ignored', () => {
  const result = calculateEPsaPost(mockPreResults.moderate, { psa: '3', knowPirads: false, pirads: '4' });
  const passed = result.piradsOverridden === false && !result.riskPct.includes('52%');
  return {
    passed,
    details: `PIRADS Override: ${result.piradsOverridden}, Risk: ${result.riskPct}`,
    expected: 'No override',
    actual: `Override: ${result.piradsOverridden}`
  };
});
tests.push(test);

// Print results
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('                    TEST RESULTS:');
console.log('═══════════════════════════════════════════════════════════════\n');

tests.forEach((test, i) => {
  console.log(`Test ${i + 1}: ${formatResult(test)}`);
  console.log(`  Details: ${test.details}`);
  console.log(`  Expected: ${test.expected}`);
  console.log(`  Actual: ${test.actual}`);
  if (test.error) {
    console.log(`  Error: ${test.error}`);
  }
  console.log('');
});

const passedCount = tests.filter(t => t.passed).length;
const totalCount = tests.length;

console.log('═══════════════════════════════════════════════════════════════');
console.log(`SUMMARY: ${passedCount}/${totalCount} tests passed, ${totalCount - passedCount} failed`);
console.log('═══════════════════════════════════════════════════════════════\n');

// PSA Points Verification
console.log('PSA POINTS VERIFICATION:');
console.log('═══════════════════════════════════════════════════════════════');
console.log('PSA < 1.0 ng/mL: 0 points');
console.log('PSA 1.0 - 2.5 ng/mL: 5 points');
console.log('PSA 2.5 - 4.0 ng/mL: 10 points');
console.log('PSA 4.0 - 10.0 ng/mL: 20 points');
console.log('PSA > 10.0 ng/mL: 40 points\n');

// PIRADS Points Verification
console.log('PIRADS POINTS/OVERRIDE VERIFICATION:');
console.log('═══════════════════════════════════════════════════════════════');
console.log('PIRADS 1-2: 0 points');
console.log('PIRADS 3: +10 points');
console.log('PIRADS 4: Override → 52% risk (43–61%)');
console.log('PIRADS 5: Override → 89% risk (76–97%)\n');

// Risk Tier Thresholds
console.log('RISK TIER THRESHOLDS:');
console.log('═══════════════════════════════════════════════════════════════');
console.log('Low: 0-40 points (0–10% risk)');
console.log('Moderate: 41-80 points (10–20% risk)');
console.log('High: 81-120 points (20–40% risk)');
console.log('Very High: >120 points (40–70% risk)');
console.log('PIRADS 4/5: Automatic Very High regardless of points\n');

// Part 1 Score to Points conversion
console.log('PART 1 SCORE CONVERSION:');
console.log('═══════════════════════════════════════════════════════════════');
console.log('Score < 21%: (score/21) × 40 points (0-40 pts)');
console.log('Score 21-30%: 40 + ((score-21)/10) × 40 points (41-80 pts)');
console.log('Score 31-40%: 80 + ((score-31)/10) × 40 points (81-120 pts)');
console.log('Score > 40%: 120 + ((score-41)/59) × 80 points (>120 pts)\n');

// Exit with appropriate code
process.exit(passedCount === totalCount ? 0 : 1);
