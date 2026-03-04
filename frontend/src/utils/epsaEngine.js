import { DEFAULT_CALCULATOR_CONFIG } from '../config/calculatorConfig';

export const validateInputs = (formData, config = DEFAULT_CALCULATOR_CONFIG) => {
  const errors = [];
  const warnings = [];

  const { validation } = config || {};

  const requireNumber = (value, field) => {
    if (value === undefined || value === null || value === '') {
      errors.push(`${field} is required`);
      return null;
    }
    const num = Number(value);
    if (Number.isNaN(num)) {
      errors.push(`${field} must be a number`);
      return null;
    }
    return num;
  };

  const ageNum = requireNumber(formData?.age, 'Age');
  const bmiNum = requireNumber(formData?.bmi, 'BMI');
  const validateOrdinalArray = (fieldLabel, values, expectedLength, minValue, maxValue) => {
    if (!Array.isArray(values)) {
      errors.push(`${fieldLabel} responses are required`);
      return null;
    }

    if (values.length !== expectedLength) {
      errors.push(`${fieldLabel} must contain ${expectedLength} responses`);
      return null;
    }

    let total = 0;
    for (let i = 0; i < values.length; i += 1) {
      const raw = values[i];
      if (raw === null || raw === undefined || raw === '') {
        errors.push(`${fieldLabel} response ${i + 1} is required`);
        return null;
      }
      const score = Number(raw);
      if (!Number.isFinite(score) || !Number.isInteger(score)) {
        errors.push(`${fieldLabel} response ${i + 1} must be an integer`);
        return null;
      }
      if (score < minValue || score > maxValue) {
        errors.push(`${fieldLabel} response ${i + 1} must be between ${minValue} and ${maxValue}`);
        return null;
      }
      total += score;
    }

    return total;
  };

  if (!formData?.race) {
    errors.push('Race is required');
  }

  if (formData?.exercise === undefined || formData?.exercise === null || formData?.exercise === '') {
    errors.push('Exercise level is required');
  } else {
    const ex = Number(formData.exercise);
    if (![0, 1, 2].includes(ex)) {
      errors.push('Exercise level must be one of: 0 (regular), 1 (some), 2 (none)');
    }
  }

  if (formData?.familyHistory === undefined || formData?.familyHistory === null) {
    errors.push('Family history is required');
  }

  const ipssTotal = validateOrdinalArray('IPSS', formData?.ipss, 7, 0, 5);
  const shimTotal = validateOrdinalArray('SHIM', formData?.shim, 5, 0, 5);

  if (validation) {
    if (ageNum != null && (ageNum < validation.minAge || ageNum > validation.maxAge)) {
      errors.push(`Age must be between ${validation.minAge} and ${validation.maxAge}`);
    }
    if (bmiNum != null && (bmiNum < validation.minBMI || bmiNum > validation.maxBMI)) {
      errors.push(`BMI must be between ${validation.minBMI} and ${validation.maxBMI}`);
    }
  }

  if (ipssTotal != null && (ipssTotal < 0 || ipssTotal > 35)) {
    errors.push('IPSS total must be between 0 and 35');
  }

  if (shimTotal != null && (shimTotal < 0 || shimTotal > 25)) {
    errors.push('SHIM total must be between 0 and 25');
  }

  if (ageNum != null && ageNum < 40) {
    warnings.push('Age under 40: model may be less validated in very young patients');
  }

  return { errors, warnings };
};

export const calculateDynamicEPsa = (formData, customConfig = null) => {
  const config = customConfig || DEFAULT_CALCULATOR_CONFIG;
  const { part1 } = config;

  const { errors } = validateInputs(formData, config);
  if (errors.length > 0) {
    return null;
  }

  const {
    age,
    race,
    bmi,
    ipss,
    shim,
    exercise,
    familyHistory
  } = formData;

  const normalizeRaceValue = (value) => String(value ?? '').trim().toLowerCase();
  const configuredRaceBlackValues = part1?.encodings?.raceBlackValues;
  const raceBlackValues = Array.isArray(configuredRaceBlackValues) && configuredRaceBlackValues.length > 0
    ? configuredRaceBlackValues.map(normalizeRaceValue)
    : null;

  const variableValues = {};
  const pickBinLabel = (x, bins, fallback) => {
    if (!Number.isFinite(x) || !Array.isArray(bins)) return fallback;
    for (const b of bins) {
      if (x >= b.min && x <= b.max) return b.label;
    }
    return fallback;
  };

  const ipssTotal = Array.isArray(ipss)
    ? ipss.reduce((a, b) => a + (b ?? 0), 0)
    : 0;
  const shimTotal = Array.isArray(shim)
    ? shim.reduce((a, b) => a + (b ?? 0), 0)
    : 0;

  const isBlack = raceBlackValues
    ? raceBlackValues.includes(normalizeRaceValue(race))
    : normalizeRaceValue(race) === 'black';

  const ageNum = parseInt(age, 10);
  const bmiNum = parseFloat(bmi);
  const exerciseCode = Number(exercise);
  const fhBinary = familyHistory > 0 ? 1 : 0;

  if (part1?.modelType === 'binned_v1') {
    const ageBin = pickBinLabel(ageNum, part1?.encodings?.ageBins, '40-49');
    const bmiBin = pickBinLabel(bmiNum, part1?.encodings?.bmiBins, '<25');
    const ipssSev = pickBinLabel(ipssTotal, part1?.encodings?.ipssSeverity, 'mild');

    variableValues.age_50_59 = ageBin === '50-59' ? 1 : 0;
    variableValues.age_60_69 = ageBin === '60-69' ? 1 : 0;
    variableValues.age_70_plus = ageBin === '70+' ? 1 : 0;

    variableValues.bmi_25_29_9 = bmiBin === '25-29.9' ? 1 : 0;
    variableValues.bmi_ge_30 = bmiBin === '>=30' ? 1 : 0;

    variableValues.ipss_moderate = ipssSev === 'moderate' ? 1 : 0;
    variableValues.ipss_severe = ipssSev === 'severe' ? 1 : 0;

    variableValues.exercise_some = exerciseCode === 1 ? 1 : 0;
    variableValues.exercise_none = exerciseCode === 2 ? 1 : 0;

    variableValues.raceBlack = isBlack ? 1 : 0;
    variableValues.fhBinary = fhBinary;

    variableValues.ipssTotal = ipssTotal;
    variableValues.shimTotal = shimTotal;
  } else {
    part1.variables.forEach(variable => {
      switch (variable.id) {
        case 'age':
          variableValues.age = ageNum;
          break;
        case 'raceBlack':
          variableValues.raceBlack = isBlack ? 1 : 0;
          break;
        case 'bmi':
          variableValues.bmi = bmiNum;
          break;
        case 'ipssTotal':
          variableValues.ipssTotal = ipssTotal;
          break;
        case 'shimTotal':
          variableValues.shimTotal = shimTotal;
          break;
        case 'exerciseCode':
          variableValues.exerciseCode = exerciseCode;
          break;
        case 'fhBinary':
          variableValues.fhBinary = fhBinary;
          break;
        default:
          variableValues[variable.id] = 0;
      }
    });
  }

  let logit = part1.intercept;

  part1.variables.forEach(variable => {
    const value = variableValues[variable.id] || 0;
    logit += variable.weight * value;
  });

  // Optional calibration layer to adjust for population differences
  let calibratedLogit = logit;
  if (part1.calibration) {
    const slope = typeof part1.calibration.slope === 'number' ? part1.calibration.slope : 1.0;
    const interceptShift = typeof part1.calibration.interceptShift === 'number' ? part1.calibration.interceptShift : 0.0;
    calibratedLogit = (logit * slope) + interceptShift;
  }

  const probability = 1 / (1 + Math.exp(-calibratedLogit));
  const scorePercent = Math.round(probability * 100);
  // Recommend PSA unless "everything is perfect" (probability in lowest tier).
  // Only don't recommend when probability < lower risk cutoff; otherwise recommend.
  const lowerCutoff = part1?.riskCutoffs?.lower?.threshold ?? 0.08;
  let recommendPSA = probability >= lowerCutoff;

  // Clinical override: family history + age ≥ 40 always recommends PSA
  // The trained fhBinary coefficient is negative due to selection bias in the training data,
  // so we enforce the clinically correct behavior here instead.
  if (fhBinary === 1 && parseInt(age, 10) >= 40) {
    recommendPSA = true;
  }

  const rangeLow = Math.max(0, Math.min(100, scorePercent - 10));
  const rangeHigh = Math.max(0, Math.min(100, scorePercent + 10));

  let tierRisk, tierColor, tierScoreRange;

  if (probability < part1.riskCutoffs.lower.threshold) {
    tierRisk = 'LOWER';
    tierColor = part1.riskCutoffs.lower.color;
    tierScoreRange = part1.riskCutoffs.lower.label;
  } else if (probability < part1.riskCutoffs.moderate.threshold) {
    tierRisk = 'MODERATE';
    tierColor = part1.riskCutoffs.moderate.color;
    tierScoreRange = part1.riskCutoffs.moderate.label;
  } else {
    tierRisk = 'HIGHER';
    tierColor = part1.riskCutoffs.higher.color;
    tierScoreRange = part1.riskCutoffs.higher.label;
  }

  let risk;
  let color;
  let action;
  let scoreRange;

  if (recommendPSA === true) {
    risk = 'PSA_RECOMMENDED';
    color = '#D4AF37';
    scoreRange = `≥ ${(lowerCutoff * 100).toFixed(0)}%`;
    action = 'PSA blood testing recommended.\nDiscuss PSA testing with your doctor.';
  } else if (recommendPSA === false) {
    risk = 'PSA_NOT_RECOMMENDED';
    color = '#27AE60';
    scoreRange = `< ${(lowerCutoff * 100).toFixed(0)}%`;
    action = 'Routine screening.\nFollow standard age-based screening guidance.';
  } else {
    risk = tierRisk;
    color = tierColor;
    scoreRange = tierScoreRange;

    if (tierRisk === 'HIGHER') {
      action = 'PSA testing and urological evaluation are recommended.';
    } else if (tierRisk === 'MODERATE') {
      action = 'PSA blood testing recommended.\nDiscuss PSA testing with your doctor.';
    } else {
      action = 'Routine screening.\nFollow standard age-based screening guidance.';
    }
  }

  return {
    score: scorePercent,
    scoreRange,
    risk,
    color,
    action,
    recommendPSA,
    tierRisk,
    tierColor,
    tierScoreRange,
    confidenceRange: `${rangeLow}%–${rangeHigh}%`,
    confidenceLow: rangeLow,
    confidenceHigh: rangeHigh,
    ipssTotal: variableValues.ipssTotal,
    shimTotal: variableValues.shimTotal,
    bmi: Number(bmi).toFixed(1),
    age: parseInt(age, 10),
    modelVersion: config.version,
    calculationDetails: {
      logit,
      probability,
      intercept: part1.intercept,
      variableContributions: part1.variables.map(v => ({
        name: v.name,
        weight: v.weight,
        value: variableValues[v.id] || 0,
        contribution: v.weight * (variableValues[v.id] || 0)
      }))
    }
  };
};

export const calculateDynamicEPsaPost = (preResult, postData, customConfig = null) => {
  const config = customConfig || DEFAULT_CALCULATOR_CONFIG;
  const { part2 } = config;

  const { psa, pirads, knowPirads } = postData;

  if (part2?.modelType === 'logistic_v1') {
    // Logistic PSA+PIRADS model
    const psaVal = Number(psa) || 0.1;
    const logPSA = Math.log(psaVal);

    const piradsVal = knowPirads ? Number(pirads) : 0;
    const pirads_3 = piradsVal === 3 ? 1 : 0;
    const pirads_4 = piradsVal === 4 ? 1 : 0;
    const pirads_5 = piradsVal === 5 ? 1 : 0;

    const vars = {
      logPSA,
      pirads_3,
      pirads_4,
      pirads_5
    };

    let logit = typeof part2.intercept === 'number' ? part2.intercept : 0;

    (part2.variables || []).forEach(v => {
      const value = vars[v.id] ?? 0;
      logit += (v.weight || 0) * value;
    });

    const probability = 1 / (1 + Math.exp(-logit));

    let riskClass;
    if (probability < part2.thresholds.low) {
      riskClass = 'low-risk';
    } else if (probability < part2.thresholds.moderate) {
      riskClass = 'moderate-risk';
    } else if (probability < part2.thresholds.high) {
      riskClass = 'high-risk';
    } else {
      riskClass = 'very-high-risk';
    }

    const pct = Math.round(probability * 100);
    const rangeBand = 10;
    const rangeLow = Math.max(0, pct - rangeBand);
    const rangeHigh = Math.min(100, pct + rangeBand);

    return {
      riskPct: `${pct}%`,
      riskPctRange: `${rangeLow}%–${rangeHigh}%`,
      riskCat: riskClass,
      riskClass,
      totalPoints: null,
      prePoints: null,
      baselineCarryPoints: null,
      psaPoints: null,
      piradsPoints: null,
      nextSteps: [],
      piradsOverridden: false,
      modelVersion: config.version,
      calculationDetails: {
        logit,
        probability,
        variables: vars
      }
    };
  }

  // Fallback: legacy points-based model (kept for safety if config not migrated)
  const preScore = preResult?.score || 0;
  let prePoints = 0;

  const ranges = part2.preScoreToPoints.ranges;
  if (preScore < ranges[0].max) {
    prePoints = Math.round((preScore / ranges[0].divisor) * ranges[0].multiplier);
  } else if (preScore < ranges[1].max) {
    prePoints = ranges[1].base + Math.round(((preScore - 21) / ranges[1].divisor) * ranges[1].multiplier);
  } else if (preScore < ranges[2].max) {
    prePoints = ranges[2].base + Math.round(((preScore - 31) / ranges[2].divisor) * ranges[2].multiplier);
  } else {
    prePoints = ranges[3].base + Math.round(((preScore - 41) / ranges[3].divisor) * ranges[3].multiplier);
  }

  const psaValue = parseFloat(psa) || 0;
  let psaPoints = 0;
  for (const range of part2.psaPoints) {
    if (psaValue <= range.max) {
      psaPoints = range.points;
      break;
    }
  }

  const piradsValue = knowPirads ? parseInt(pirads) : 0;
  const baselineCarryPoints = part2.baselineCarryPoints;
  let piradsPoints = 0;
  let totalPoints = prePoints + baselineCarryPoints + psaPoints;
  let riskPct, riskCat, riskClass, nextSteps, piradsOverridden = false;

  if (knowPirads && part2.piradsOverrides[piradsValue]) {
    const override = part2.piradsOverrides[piradsValue];
    riskPct = override.riskPct;
    riskCat = override.riskCat;
    riskClass = override.riskClass;
    nextSteps = [];
    piradsOverridden = true;
  }

  if (!piradsOverridden) {
    for (const p of part2.piradsPoints) {
      if (piradsValue === p.value) {
        piradsPoints = p.points;
        break;
      }
    }

    totalPoints += piradsPoints;

    for (const category of part2.riskCategories) {
      if (totalPoints <= category.maxPoints) {
        riskPct = category.riskPct;
        riskCat = category.riskCat;
        riskClass = category.riskClass;
        break;
      }
    }

    nextSteps = [];
  }

  return {
    riskPct,
    riskCat,
    riskClass,
    totalPoints,
    prePoints,
    baselineCarryPoints,
    psaPoints,
    piradsPoints,
    nextSteps,
    piradsOverridden,
    modelVersion: config.version
  };
};
