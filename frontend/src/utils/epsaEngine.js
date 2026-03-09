import { DEFAULT_CALCULATOR_CONFIG } from '../config/calculatorConfig.js';

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

  const comorbidityLabels = {
    hypertension: 'Hypertension (HTN)',
    hyperlipidemia: 'Hyperlipidemia (HLD)',
    coronaryArteryDisease: 'Coronary Artery Disease (CAD)',
    diabetes: 'Diabetes'
  };
  // Accept either comorbidityScore (0, 1, 2) or the four separate fields (backward compat)
  const hasComorbidityScore = formData?.comorbidityScore !== undefined && formData?.comorbidityScore !== null;
  if (hasComorbidityScore) {
    const s = Number(formData.comorbidityScore);
    if (s !== 0 && s !== 1 && s !== 2) {
      errors.push('Comorbidities must be 0, 1, or 2');
    }
  } else {
    for (const key of Object.keys(comorbidityLabels)) {
      if (formData?.[key] === undefined || formData?.[key] === null || formData?.[key] === '') {
        errors.push(`${comorbidityLabels[key]} is required`);
        break;
      }
    }
  }

  const ipssTotal = validateOrdinalArray('IPSS', formData?.ipss, 7, 0, 5);
  const shimTotal = validateOrdinalArray('SHIM', formData?.shim, 5, 0, 5);

  if (validation) {
    if (ageNum != null && (ageNum < validation.minAge || ageNum > validation.maxAge)) {
      errors.push(`Age must be between ${validation.minAge} and ${validation.maxAge}`);
    }
    if (bmiNum != null) {
      if (bmiNum < validation.minBMI) {
        errors.push(`BMI must be at least ${validation.minBMI}`);
      }
      if (bmiNum > validation.maxBMI) {
        warnings.push(`BMI is above the validated range (>${validation.maxBMI}); results may be less accurate.`);
      }
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
  const smokingCode = Number(formData.smoking);
  const brcaStatus = formData.brcaStatus;
  const inflammationHistory = formData.inflammationHistory;
  const chemicalExposure = formData.chemicalExposure;
  const dietPattern = formData.dietPattern;
  const hypertension = formData.hypertension;
  const hyperlipidemia = formData.hyperlipidemia;
  const coronaryArteryDisease = formData.coronaryArteryDisease;
  const diabetes = formData.diabetes;
  const comorbidityScore = formData.comorbidityScore;

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
    // Fallback: treat any future variables as simple flags if modelType changes
    part1.variables.forEach(variable => {
      const id = variable.id;
      if (id === 'age') variableValues.age = ageNum;
      else if (id === 'raceBlack') variableValues.raceBlack = isBlack ? 1 : 0;
      else if (id === 'bmi') variableValues.bmi = bmiNum;
      else if (id === 'ipssTotal') variableValues.ipssTotal = ipssTotal;
      else if (id === 'shimTotal') variableValues.shimTotal = shimTotal;
      else if (id === 'exerciseCode') variableValues.exerciseCode = exerciseCode;
      else if (id === 'fhBinary') variableValues.fhBinary = fhBinary;
      else variableValues[id] = variableValues[id] ?? 0;
    });
  }

  // Point-based Part 1 scoring (max 130 points; 0–2 from comorbidities)
  let rawScore = 0;
  const MAX_POINTS = 130;

  // Age
  if (ageNum >= 70) {
    rawScore += 16;
  } else if (ageNum >= 60) {
    rawScore += 8;
  }

  // BMI
  if (Number.isFinite(bmiNum) && bmiNum >= 30) {
    rawScore += 8;
  }

  // IPSS (mild / moderate / severe)
  if (ipssTotal >= 0 && ipssTotal <= 7) {
    rawScore += 8; // Mild
  } else if (ipssTotal >= 8 && ipssTotal <= 19) {
    rawScore += 4; // Moderate
  } // Severe (20–35) gets 0

  // Exercise: 0=high, 1=some, 2=none
  if (exerciseCode === 1) {
    rawScore += 8;
  } else if (exerciseCode === 2) {
    rawScore += 16;
  }

  // Smoking: 0=never, 1=former, 2=current
  if (smokingCode === 1) {
    rawScore += 8;
  } else if (smokingCode === 2) {
    rawScore += 16;
  }

  // Diet: treat Western / standard American as high red meat
  if (dietPattern === 'western') {
    rawScore += 8;
  }

  // Race
  if (isBlack) {
    rawScore += 8;
  }

  // Family history
  if (fhBinary === 1) {
    rawScore += 16;
  }

  // BRCA
  if (brcaStatus === 'yes') {
    rawScore += 16;
  }

  // Inflammation (biopsy-detected / history)
  if (inflammationHistory === 1 || inflammationHistory === 'yes') {
    rawScore += 4;
  }

  // Agent Orange / chemical exposure
  if (chemicalExposure === 'yes') {
    rawScore += 4;
  }

  // SHIM
  if (shimTotal > 0 && shimTotal < 12) {
    rawScore += 8;
  }

  // Comorbidities: 0, 1, or 2 points. Use comorbidityScore if present, else derive from four Yes/No and cap at 2.
  const isYes = (v) => v === 'yes' || v === true || v === 1;
  let comorbidityPoints = 0;
  if (comorbidityScore !== undefined && comorbidityScore !== null) {
    comorbidityPoints = Math.min(2, Math.max(0, Number(comorbidityScore)));
  } else {
    const n = [hypertension, hyperlipidemia, coronaryArteryDisease, diabetes].filter(isYes).length;
    comorbidityPoints = n >= 2 ? 2 : n;
  }
  rawScore += comorbidityPoints;

  // Normalize to 0–1 and 0–100%
  const probability = Math.max(0, Math.min(1, rawScore / MAX_POINTS));
  const scorePercent = Math.round(probability * 100);

  // Recommendation threshold in probability space (e.g. 0.09 for 9%)
  const recommendThreshold = typeof part1?.recommendThreshold === 'number'
    ? part1.recommendThreshold
    : 0.09;
  // Display range ±5%
  const rangeLow = Math.max(0, scorePercent - 5);
  const rangeHigh = Math.min(100, scorePercent + 5);

  let recommendPSA = null;
  const lowerProb = rangeLow / 100;
  const upperProb = rangeHigh / 100;

  if (upperProb < recommendThreshold) {
    recommendPSA = false;
  } else if (lowerProb >= recommendThreshold) {
    recommendPSA = true;
  } else {
    recommendPSA = null; // borderline
  }

  // Clinical override: family history + age ≥ 40 always recommends PSA
  if (fhBinary === 1 && parseInt(age, 10) >= 40) {
    recommendPSA = true;
  }

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
    scoreRange = recommendThreshold != null
      ? `≥ ${(recommendThreshold * 100).toFixed(0)}%`
      : tierScoreRange;
    action = 'PSA blood testing recommended.\nDiscuss PSA testing with your doctor.';
  } else if (recommendPSA === false) {
    risk = 'PSA_NOT_RECOMMENDED';
    color = '#27AE60';
    scoreRange = recommendThreshold != null
      ? `< ${(recommendThreshold * 100).toFixed(0)}%`
      : tierScoreRange;
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

  // ePSA Risk Tier mapping (Component 1) based on rawScore
  const EPSA_TIER_DEFS = [
    {
      key: 'low',
      label: '🟢 Low Risk',
      psaEquivalent: '< 1.0 ng/mL',
      guideline:
        'Your risk profile is consistent with a PSA equivalent below 1.0 ng/mL. Per AUA, NCCN, and EAU guidelines, men in this range may follow routine screening intervals of 8–10 years if under 55, or as directed by your physician.'
    },
    {
      key: 'intermediate-low',
      label: '🟡 Intermediate-Low Risk',
      psaEquivalent: '1.0–2.9 ng/mL',
      guideline:
        'Your risk profile is consistent with a PSA equivalent of 1.0–2.9 ng/mL. Guidelines recommend rescreening every 2–4 years. Discuss with your physician whether earlier follow-up is appropriate given your individual risk factors.'
    },
    {
      key: 'intermediate-high',
      label: '🟠 Intermediate-High Risk',
      psaEquivalent: '3.0–9.9 ng/mL',
      guideline:
        'Your risk profile is consistent with a PSA equivalent of 3.0–9.9 ng/mL. AUA, NCCN, and EAU guidelines recommend urology referral and shared decision-making regarding further workup including possible biopsy.'
    },
    {
      key: 'high',
      label: '🔴 High Risk',
      psaEquivalent: '≥ 10 ng/mL',
      guideline:
        'Your risk profile is consistent with a PSA equivalent of ≥ 10 ng/mL. Guidelines from AUA, NCCN, and EAU strongly recommend urology referral and biopsy discussion. Prompt evaluation is advised.'
    }
  ];

  let epsaTierIndex;
  if (rawScore <= 15) {
    epsaTierIndex = 0;
  } else if (rawScore <= 31) {
    epsaTierIndex = 1;
  } else if (rawScore <= 63) {
    epsaTierIndex = 2;
  } else {
    epsaTierIndex = 3;
  }

  const epsaTierDef = EPSA_TIER_DEFS[epsaTierIndex];

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
    // Part 2 integration helpers
    isBlack,
    fhBinary,
    brcaStatus,
    // Component 1: ePSA Risk Tier (raw-score based)
    epsaTierIndex,
    epsaTierKey: epsaTierDef.key,
    epsaTierLabel: epsaTierDef.label,
    epsaPsaEquivalent: epsaTierDef.psaEquivalent,
    epsaGuidelineText: epsaTierDef.guideline,
    modelVersion: config.version,
    displayRange: `${rangeLow}%–${rangeHigh}%`,
    confidenceRange: `${rangeLow}%–${rangeHigh}%`,
    confidenceLow: rangeLow,
    confidenceHigh: rangeHigh,
    calculationDetails: {
      probability,
      rawScore,
      maxScore: MAX_POINTS
    }
  };
};

export const calculateDynamicEPsaPost = (preResult, postData, customConfig = null) => {
  const config = customConfig || DEFAULT_CALCULATOR_CONFIG;
  const { psa, pirads, knowPirads } = postData || {};

  // Base raw score from Part 1 (original variables only)
  const preScorePct = Number(preResult?.score) || 0;
  let baseRawScore = preResult?.calculationDetails?.rawScore;
  let baseMaxScore = preResult?.calculationDetails?.maxScore;

  if (!Number.isFinite(baseRawScore)) {
    baseMaxScore = 128;
    baseRawScore = Math.round((preScorePct / 100) * baseMaxScore);
  }

  // PSA scoring
  const psaVal = psa === '' || psa === null || psa === undefined ? null : Number(psa);
  let psaPoints = 0;
  if (psaVal != null && !Number.isNaN(psaVal)) {
    if (psaVal < 1.0) {
      psaPoints = 0;
    } else if (psaVal < 3.0) {
      psaPoints = 10;
    } else if (psaVal < 10.0) {
      psaPoints = 25;
    } else {
      psaPoints = 45;
    }
  }

  // PI-RADS scoring
  const piradsVal = knowPirads ? (pirads === '' || pirads === null || pirads === undefined ? null : Number(pirads)) : null;
  let piradsPoints = 0;
  let piradsOverridden = false;
  if (piradsVal != null && !Number.isNaN(piradsVal)) {
    if (piradsVal === 3) {
      piradsPoints = 15;
    } else if (piradsVal === 4) {
      piradsPoints = 30;
    } else if (piradsVal === 5) {
      piradsPoints = 45;
      piradsOverridden = true; // hard override to High tier
    }
  }

  // High-risk features for Low-PSA bonus and warning
  const isBlack = !!preResult?.isBlack;
  const fhBinary = preResult?.fhBinary ?? 0;
  const hasFamilyHistory = fhBinary === 1 || preResult?.familyHistory === 1;
  const brcaStatus = preResult?.brcaStatus;
  const brcaPositive = brcaStatus === 'yes' || brcaStatus === 'positive';
  const hasHighRiskFeature =
    isBlack ||
    hasFamilyHistory ||
    brcaPositive ||
    (piradsVal != null && piradsVal >= 3);

  let psaBonusLow = 0;
  let lowPsaWarning = false;
  let lowPsaWarningText = null;
  if (psaVal != null && !Number.isNaN(psaVal) && psaVal < 2.0 && hasHighRiskFeature) {
    psaBonusLow = 15;
    lowPsaWarning = true;
    lowPsaWarningText =
      '🚨 Important: Low PSA Does Not Rule Out Risk Your PSA level is below 2.0 ng/mL, which is often considered reassuring. However, your risk profile includes one or more high-risk features (race, family history, genetic mutations, or MRI findings) that are associated with clinically significant prostate cancer even at low PSA levels. Standard guidelines do not currently account for these factors when interpreting PSA thresholds. Early evaluation with a urologist is recommended regardless of your PSA value.';
  }

  const totalPoints = baseRawScore + psaPoints + psaBonusLow + piradsPoints;

  // Map total points to ePSA tier
  const TIER_DEFS = [
    {
      key: 'low',
      label: '🟢 Low Risk',
      psaEquivalent: '< 1.0 ng/mL',
      guideline:
        'Your risk profile is consistent with a PSA equivalent below 1.0 ng/mL. Per AUA, NCCN, and EAU guidelines, men in this range may follow routine screening intervals of 8–10 years if under 55, or as directed by your physician.'
    },
    {
      key: 'intermediate-low',
      label: '🟡 Intermediate-Low Risk',
      psaEquivalent: '1.0–2.9 ng/mL',
      guideline:
        'Your risk profile is consistent with a PSA equivalent of 1.0–2.9 ng/mL. Guidelines recommend rescreening every 2–4 years. Discuss with your physician whether earlier follow-up is appropriate given your individual risk factors.'
    },
    {
      key: 'intermediate-high',
      label: '🟠 Intermediate-High Risk',
      psaEquivalent: '3.0–9.9 ng/mL',
      guideline:
        'Your risk profile is consistent with a PSA equivalent of 3.0–9.9 ng/mL. AUA, NCCN, and EAU guidelines recommend urology referral and shared decision-making regarding further workup including possible biopsy.'
    },
    {
      key: 'high',
      label: '🔴 High Risk',
      psaEquivalent: '≥ 10 ng/mL',
      guideline:
        'Your risk profile is consistent with a PSA equivalent of ≥ 10 ng/mL. Guidelines from AUA, NCCN, and EAU strongly recommend urology referral and biopsy discussion. Prompt evaluation is advised.'
    }
  ];

  let tierIndex;
  if (piradsOverridden) {
    tierIndex = 3; // High regardless of score
  } else if (totalPoints <= 28) {
    tierIndex = 0;
  } else if (totalPoints <= 58) {
    tierIndex = 1;
  } else if (totalPoints <= 116) {
    tierIndex = 2;
  } else {
    tierIndex = 3;
  }

  const tierDef = TIER_DEFS[tierIndex];

  // Map to existing riskClass bands for color mapping
  const RISK_CLASSES = ['low-risk', 'moderate-risk', 'high-risk', 'very-high-risk'];
  const riskClass = RISK_CLASSES[tierIndex];

  // Actual PSA tier for discordance flag
  let psaTierIndex = null;
  let psaTierLabel = null;
  if (psaVal != null && !Number.isNaN(psaVal)) {
    if (psaVal < 1.0) {
      psaTierIndex = 0;
      psaTierLabel = 'Low';
    } else if (psaVal < 3.0) {
      psaTierIndex = 1;
      psaTierLabel = 'Intermediate-Low';
    } else if (psaVal < 10.0) {
      psaTierIndex = 2;
      psaTierLabel = 'Intermediate-High';
    } else {
      psaTierIndex = 3;
      psaTierLabel = 'High';
    }
  }

  let discordanceFlag = null;
  if (psaTierIndex != null) {
    const diff = tierIndex - psaTierIndex;
    if (diff > 0) {
      const severity = diff === 1 ? 'yellow' : 'orange';
      const discordanceText = `⚠️ Risk Discordance Detected Your ePSA risk profile (${tierDef.label}) is higher than what your PSA level alone (${psaVal} ng/mL, ${psaTierLabel}) would suggest. This may indicate that your individual risk factors — such as race, family history, or genetic markers — place you at elevated risk that standard PSA screening alone may underestimate. Discuss this discordance with your physician before concluding that your PSA result is reassuring.`;
      discordanceFlag = {
        severity,
        text: discordanceText
      };
    }
  }

  const riskCat = tierDef.label;
  const riskPct = tierDef.psaEquivalent;
  const nextSteps = [tierDef.guideline];

  return {
    riskPct,
    riskPctRange: null,
    riskCat,
    riskClass,
    totalPoints,
    prePoints: baseRawScore,
    baselineCarryPoints: null,
    psaPoints,
    piradsPoints,
    nextSteps,
    piradsOverridden,
    psaTier: psaTierLabel,
    psaValue: psaVal,
    epsaTierIndex: tierIndex,
    epsaTierKey: tierDef.key,
    guidelineText: tierDef.guideline,
    discordanceFlag,
    lowPsaWarning,
    lowPsaWarningText,
    modelVersion: config.version
  };
};
