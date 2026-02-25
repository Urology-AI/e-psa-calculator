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

  const ipssTotal = Array.isArray(formData?.ipss)
    ? formData.ipss.reduce((a, b) => a + (b ?? 0), 0)
    : null;

  const shimTotal = Array.isArray(formData?.shim)
    ? formData.shim.reduce((a, b) => a + (b ?? 0), 0)
    : null;

  if (!Array.isArray(formData?.ipss)) {
    errors.push('IPSS responses are required');
  }

  if (!Array.isArray(formData?.shim)) {
    errors.push('SHIM responses are required');
  }

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

  const variableValues = {};

  part1.variables.forEach(variable => {
    switch (variable.id) {
      case 'age':
        variableValues.age = parseInt(age, 10);
        break;
      case 'raceBlack':
        variableValues.raceBlack = race === 'black' ? 1 : 0;
        break;
      case 'bmi':
        variableValues.bmi = parseFloat(bmi);
        break;
      case 'ipssTotal':
        variableValues.ipssTotal = Array.isArray(ipss)
          ? ipss.reduce((a, b) => a + (b ?? 0), 0)
          : 0;
        break;
      case 'shimTotal':
        variableValues.shimTotal = Array.isArray(shim)
          ? shim.reduce((a, b) => a + (b ?? 0), 0)
          : 0;
        break;
      case 'exerciseCode':
        variableValues.exerciseCode = Number(exercise);
        break;
      case 'fhBinary':
        variableValues.fhBinary = familyHistory > 0 ? 1 : 0;
        break;
      default:
        variableValues[variable.id] = 0;
    }
  });

  let logit = part1.intercept;

  part1.variables.forEach(variable => {
    const value = variableValues[variable.id] || 0;
    logit += variable.weight * value;
  });

  const probability = 1 / (1 + Math.exp(-logit));
  const scorePercent = Math.round(probability * 100);

  const rangeLow = Math.max(0, Math.min(100, scorePercent - 10));
  const rangeHigh = Math.max(0, Math.min(100, scorePercent + 10));

  let risk, color, action, scoreRange;

  if (probability < part1.riskCutoffs.lower.threshold) {
    risk = 'LOWER';
    color = part1.riskCutoffs.lower.color;
    scoreRange = part1.riskCutoffs.lower.label;
    action = 'Routine screening. Follow standard age-based screening guidance.';
  } else if (probability < part1.riskCutoffs.moderate.threshold) {
    risk = 'MODERATE';
    color = part1.riskCutoffs.moderate.color;
    scoreRange = part1.riskCutoffs.moderate.label;
    action = 'PSA blood testing recommended. Discuss PSA testing with your doctor.';
  } else {
    risk = 'HIGHER';
    color = part1.riskCutoffs.higher.color;
    scoreRange = part1.riskCutoffs.higher.label;
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
    let piradsPoints = 0;
    for (const p of part2.piradsPoints) {
      if (piradsValue === p.value) {
        piradsPoints = p.points;
        break;
      }
    }

    const totalPoints = prePoints + part2.baselineCarryPoints + psaPoints + piradsPoints;

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
    totalPoints: prePoints + part2.baselineCarryPoints + psaPoints + (piradsOverridden ? 0 : (piradsValue === 3 ? 10 : 0)),
    prePoints,
    baselineCarryPoints: part2.baselineCarryPoints,
    psaPoints,
    piradsPoints: piradsOverridden ? 0 : (piradsValue === 3 ? 10 : 0),
    nextSteps,
    piradsOverridden,
    modelVersion: config.version
  };
};
