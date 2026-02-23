/**
 * ePSA Calculator - Part 1
 * 7-variable logistic regression model
 */

const RISK_COLORS = {
  LOWER: '#27AE60',
  MODERATE: '#D4AF37',
  HIGHER: '#C0392B'
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const calculateEPsa = (formData) => {
  const {
    age,
    race,
    bmi,
    ipss, // Array of 7 values (0-5)
    shim, // Array of 5 values
    exercise,
    familyHistory // 0 = none, 1+ = yes
  } = formData;

  // Validate required fields
  if (!age || age === '') {
    console.warn('Missing age for calculation:', { age, bmi, race, ipss, shim, exercise, familyHistory });
    return null;
  }

  const ageNum = parseInt(age, 10);
  if (isNaN(ageNum) || ageNum < 18 || ageNum > 120) {
    console.warn('Invalid age:', age);
    return null;
  }

  if (!bmi || bmi === 0 || bmi === null || bmi === undefined || isNaN(parseFloat(bmi))) {
    console.warn('BMI not calculated or invalid:', { age, bmi, race, ipss, shim, exercise, familyHistory });
    return null;
  }

  if (race === null || race === undefined || race === '') {
    console.warn('Race not selected:', { age, bmi, race, ipss, shim, exercise, familyHistory });
    return null;
  }

  if (!Array.isArray(ipss) || ipss.some(v => v === null || v === undefined)) {
    console.warn('IPSS questions incomplete:', { age, bmi, race, ipss, shim, exercise, familyHistory });
    return null;
  }

  if (!Array.isArray(shim) || shim.some(v => v === null || v === undefined)) {
    console.warn('SHIM questions incomplete:', { age, bmi, race, ipss, shim, exercise, familyHistory });
    return null;
  }

  if (exercise === null || exercise === undefined) {
    console.warn('Exercise not answered:', { age, bmi, race, ipss, shim, exercise, familyHistory });
    return null;
  }

  if (familyHistory === null || familyHistory === undefined) {
    console.warn('Family history not answered:', { age, bmi, race, ipss, shim, exercise, familyHistory });
    return null;
  }

  // Encoding
  const raceBlack = race === 'black' ? 1 : 0;
  const ipssTotal = ipss.reduce((a, b) => a + (b ?? 0), 0);
  const shimTotal = shim.reduce((a, b) => a + (b ?? 0), 0);
  const fhBinary = familyHistory > 0 ? 1 : 0;
  const exerciseCode = Number(exercise);

  // New 7-variable formula
  const logit = -3.8347
    + (0.0454 * ageNum)
    - (0.0253 * raceBlack)
    + (0.0195 * Number(bmi))
    - (0.0292 * ipssTotal)
    - (0.5947 * exerciseCode)
    - (0.8911 * fhBinary)
    - (0.0358 * shimTotal);

  const probability = 1 / (1 + Math.exp(-logit));
  const scorePercent = Math.round(probability * 100);

  const rangeLow = clamp(scorePercent - 10, 0, 100);
  const rangeHigh = clamp(scorePercent + 10, 0, 100);

  let risk;
  let color;
  let action;
  let scoreRange;

  if (probability < 0.08) {
    risk = 'LOWER';
    color = RISK_COLORS.LOWER;
    scoreRange = 'Below 8%';
    action = 'Routine screening. Follow standard age-based screening guidance.';
  } else if (probability < 0.20) {
    risk = 'MODERATE';
    color = RISK_COLORS.MODERATE;
    scoreRange = '8% – 20%';
    action = 'PSA blood testing recommended. Discuss PSA testing with your doctor.';
  } else {
    risk = 'HIGHER';
    color = RISK_COLORS.HIGHER;
    scoreRange = 'Above 20%';
    action = 'PSA testing and urological evaluation are recommended.';
  }

  return {
    score: scorePercent,
    scoreRange,
    risk,
    color,
    action,
    confidenceRange: `${rangeLow}%–${rangeHigh}%`,
    confidenceLow: rangeLow,
    confidenceHigh: rangeHigh,
    ipssTotal,
    shimTotal,
    bmi: Number(bmi).toFixed(1),
    age: ageNum
  };
};

export { RISK_COLORS };
