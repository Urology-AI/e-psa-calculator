import { DEFAULT_CALCULATOR_CONFIG } from '../config/calculatorConfig.js';

// =============================================================================
// ePSA CALCULATOR ENGINE v4
// =============================================================================
//
// Four clinical models:
//
//   Model 1 — calculateDynamicEPsa()
//     Pathway: pre_psa — "Should I get a PSA test?"
//     Input:   27-question questionnaire
//     Output:  rawScore 0-80, 3-tier (Low/Intermediate/Elevated),
//              PSA recommendation + reason, empirical csPCa probability
//     AUC: 0.579 [0.442-0.712]  Sens: 91.3%  NPV: 89.5%  N=94
//
//   Model 2 — calculateDynamicEPsaPost() with pathwayMode='post_psa'
//     Pathway: post_psa — "I have a PSA result"
//     Input:   Part 1 result + PSA value (+ optional prostate volume for PSAD)
//     Output:  combined tier, discordance flag, low-PSA warning, PSAD,
//              empirical csPCa probability by combined tier
//     AUC: 0.600 [0.463-0.735]  vs PSA alone 0.579  N=94
//
//   Model 3 — calculateDynamicEPsaPost() with pathwayMode='post_mri'
//     Pathway: post_mri — "I had a PSA and an MRI"
//     Input:   Part 1 result + PSA + PI-RADS + optional prostate volume
//     Output:  combined tier, biopsy recommendation banner
//     Note:    PI-RADS scoring guideline-based (AUA/NCCN/EAU); PI-RADS
//              not yet in validation dataset — Model 3 unvalidated empirically
//
//   Model 4 — calculateActiveSurveillance()  ← NEW
//     Pathway: post_biopsy — "I've had a biopsy — AS or treatment?"
//     Input:   Part 1 result + biopsy GGG + cores data + optional PSAD/PI-RADS
//     Output:  AS recommendation tier + clinical rationale
//     Basis:   AUA/NCCN AS criteria + Kadeer 2025 PSAD cutoff
//              ePSA predicts GG1 (AUC 0.624) better than PSA (AUC 0.513) N=94
//
// Empirical csPCa rates (N=94, 23 csPCa GG≥3):
//   ePSA Low (0-10):            7%  [95%CI 1%-31%]   N=14
//   ePSA Intermediate (11-17): 20%  [95%CI 4%-62%]   N=5
//   ePSA Elevated (≥18):       28%  [95%CI 19%-39%]  N=75
//   Combined Int-High (28-55): 21%  N=58
//   Combined High (≥56):       31%  N=32
//
// =============================================================================

// ---------------------------------------------------------------------------
// EMPIRICAL CALIBRATION DATA — from N=94 validation cohort
// Used to display "X in Y patients like you had csPCa" messaging
// ---------------------------------------------------------------------------
const EPSA_TIER_CALIBRATION = {
  low:          { rate: 0.07,  ci_lo: 0.01, ci_hi: 0.31, n: 14,  events: 1  },
  intermediate: { rate: 0.20,  ci_lo: 0.04, ci_hi: 0.62, n: 5,   events: 1  },
  elevated:     { rate: 0.28,  ci_lo: 0.19, ci_hi: 0.39, n: 75,  events: 21 }
};

const COMBINED_TIER_CALIBRATION = {
  'low':              { rate: null, n: 0,  events: 0,  note: 'No data in referral cohort' },
  'intermediate-low': { rate: 0.25, n: 4,  events: 1,  note: 'Small N — interpret with caution' },
  'intermediate-high':{ rate: 0.21, n: 58, events: 12, note: 'N=94 biopsied referral cohort' },
  'high':             { rate: 0.31, n: 32, events: 10, note: 'N=94 biopsied referral cohort' }
};

// ---------------------------------------------------------------------------
// VALIDATION ACCURACY SUMMARY — for display in UI if needed
// ---------------------------------------------------------------------------
export const MODEL_ACCURACY = {
  model1: {
    auc: 0.579, auc_ci_lo: 0.442, auc_ci_hi: 0.712,
    sensitivity: 0.913, specificity: 0.239, npv: 0.895, ppv: 0.280,
    n: 94, events: 23, threshold: 'rawScore >= 18',
    note: 'Equivalent to PSA ≥4.0 at same sensitivity with 3 fewer false positives'
  },
  model2: {
    auc: 0.600, auc_ci_lo: 0.463, auc_ci_hi: 0.735,
    n: 94, events: 23,
    note: 'AUC gain over PSA alone (+0.021) not yet significant at N=94 (p=0.725)'
  },
  model3: {
    auc: null,
    note: 'PI-RADS not collected in N=94 dataset. Scoring guideline-based (AUA/NCCN/EAU).'
  },
  model4: {
    auc_gg1: 0.624, auc_psa_gg1: 0.513,
    low_int_as_rate: 0.89,
    note: 'ePSA predicts GG1 AS-eligibility better than PSA alone (AUC 0.624 vs 0.513)'
  }
};

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

  if (!formData?.race) errors.push('Race is required');

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

  const hasComorbidityScore =
    formData?.comorbidityScore !== undefined && formData?.comorbidityScore !== null;
  if (hasComorbidityScore) {
    const s = Number(formData.comorbidityScore);
    if (s !== 0 && s !== 1 && s !== 2) errors.push('Comorbidities must be 0, 1, or 2');
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
      if (bmiNum < validation.minBMI) errors.push(`BMI must be at least ${validation.minBMI}`);
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

// =============================================================================
// MODEL 1 — pre_psa: "Should I get a PSA test?"
// =============================================================================
export const calculateDynamicEPsa = (formData, customConfig = null) => {
  const config = customConfig || DEFAULT_CALCULATOR_CONFIG;
  const { part1 } = config;

  const { errors } = validateInputs(formData, config);
  if (errors.length > 0) return null;

  const { age, race, bmi, ipss, shim, exercise, familyHistory } = formData;

  const normalizeRaceValue = (value) => String(value ?? '').trim().toLowerCase();
  const configuredRaceBlackValues = part1?.encodings?.raceBlackValues;
  const raceBlackValues =
    Array.isArray(configuredRaceBlackValues) && configuredRaceBlackValues.length > 0
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

  const ipssTotal = Array.isArray(ipss) ? ipss.reduce((a, b) => a + (b ?? 0), 0) : 0;
  const shimTotal = Array.isArray(shim) ? shim.reduce((a, b) => a + (b ?? 0), 0) : 0;

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

  // ---------------------------------------------------------------------------
  // Point-based Part 1 scoring — Bayesian-recalibrated weights (v2)
  //
  // Weights from Bayesian logistic regression (N=94, 23 csPCa events) with
  // informative Normal priors anchored to AUA/NCCN/EAU literature log-ORs.
  // Scale: 16 pts per log-OR unit (age 70+ anchor). MAX_POINTS = 80.
  // Youden-optimal triage threshold: rawScore >= 18 (J=0.138, sens=91.3%, spec=22.5%)
  // ---------------------------------------------------------------------------
  let rawScore = 0;
  const MAX_POINTS = 80;
  const itemImpacts = [];
  const addImpact = (item, value, points) => {
    itemImpacts.push({ item, value, points });
    rawScore += points;
  };

  if (ageNum >= 70) addImpact('Age', `${ageNum} years`, 16);
  else if (ageNum >= 60) addImpact('Age', `${ageNum} years`, 10);
  else addImpact('Age', `${ageNum} years`, 0);

  if (Number.isFinite(bmiNum) && bmiNum >= 30) addImpact('BMI', bmiNum.toFixed(1), 4);
  else addImpact('BMI', Number.isFinite(bmiNum) ? bmiNum.toFixed(1) : 'N/A', 0);

  // Only IPSS mild (0-7) scores. Moderate (8-19) and severe (20-35) score 0.
  if (ipssTotal >= 0 && ipssTotal <= 7) addImpact('IPSS total', `${ipssTotal}/35`, 8);
  else addImpact('IPSS total', `${ipssTotal}/35`, 0);

  if (exerciseCode === 1) addImpact('Exercise', 'Some', 2);
  else if (exerciseCode === 2) addImpact('Exercise', 'None', 4);
  else addImpact('Exercise', 'Regular', 0);

  if (smokingCode === 1) addImpact('Smoking', 'Former', 2);
  else if (smokingCode === 2) addImpact('Smoking', 'Current', 6);
  else addImpact('Smoking', 'Never', 0);

  // Only 'western' and 'red_meat' score — 'mixed' scores 0
  if (dietPattern === 'western' || dietPattern === 'red_meat') addImpact('Diet pattern', String(dietPattern), 4);
  else addImpact('Diet pattern', String(dietPattern || 'N/A'), 0);

  addImpact('Black ancestry', isBlack ? 'Yes' : 'No', isBlack ? 8 : 0);
  addImpact('Family history', fhBinary === 1 ? 'Yes' : 'No', fhBinary === 1 ? 10 : 0);

  const brcaPositive = brcaStatus === 'yes' || brcaStatus === 'positive';
  const brcaLabel = brcaPositive ? 'Positive' : brcaStatus === 'no' ? 'Negative (tested)' : 'Not tested / Unknown';
  addImpact('BRCA mutation', brcaLabel, brcaPositive ? 16 : 0);
  addImpact(
    'Inflammation history',
    (inflammationHistory === 1 || inflammationHistory === 'yes') ? 'Yes' : 'No',
    (inflammationHistory === 1 || inflammationHistory === 'yes') ? 4 : 0
  );
  addImpact('Chemical/Agent Orange exposure', chemicalExposure === 'yes' ? 'Yes' : 'No', chemicalExposure === 'yes' ? 4 : 0);
  addImpact('SHIM total', `${shimTotal}/25`, (shimTotal > 0 && shimTotal < 12) ? 8 : 0);

  const isYes = (v) => v === 'yes' || v === true || v === 1;
  let comorbidityPoints = 0;
  if (comorbidityScore !== undefined && comorbidityScore !== null) {
    comorbidityPoints = Math.min(2, Math.max(0, Number(comorbidityScore))) * 10;
  } else {
    const n = [hypertension, hyperlipidemia, coronaryArteryDisease, diabetes].filter(isYes).length;
    comorbidityPoints = (n >= 2 ? 2 : n) * 10;
  }
  addImpact('Comorbidity burden', String(comorbidityScore ?? 'derived'), comorbidityPoints);

  const probability = Math.max(0, Math.min(1, rawScore / MAX_POINTS));
  const scorePercent = Math.round(probability * 100);
  const rangeLow = Math.max(0, scorePercent - 5);
  const rangeHigh = Math.min(100, scorePercent + 5);

  // ---------------------------------------------------------------------------
  // PSA recommendation threshold — Bayesian-validated operating point
  //
  // VALUE: 0.225 (22.5%) = rawScore 18 / MAX_POINTS 80
  // BASIS: Youden J = 0.138 at rawScore >= 18 (N=94, 23 csPCa)
  //        Sensitivity 91.3%, Specificity 22.5%, NPV 89.5%
  // Same boundary as the Elevated tier — intentionally aligned.
  // ---------------------------------------------------------------------------
  const recommendThreshold =
    typeof part1?.recommendThreshold === 'number' ? part1.recommendThreshold : 0.225;
  const recommendationThresholdLabel = `>= ${(recommendThreshold * 100).toFixed(0)}%`;
  const lowerProb = rangeLow / 100;
  const upperProb = rangeHigh / 100;

  // ---------------------------------------------------------------------------
  // PSA Recommendation Logic — 4-step override hierarchy
  // Steps 3-4 always win over Steps 1-2.
  // ---------------------------------------------------------------------------
  let recommendPSA = null;
  let psaRecommendReason = null;

  // Step 1 — score-based threshold
  if (upperProb < recommendThreshold) {
    recommendPSA = false;
  } else if (lowerProb >= recommendThreshold) {
    recommendPSA = true;
    psaRecommendReason = 'score_threshold';
  }

  // Step 2 — AUA average-risk window: all men 55-69
  if (ageNum >= 55 && ageNum <= 69) {
    recommendPSA = true;
    if (psaRecommendReason === null) psaRecommendReason = 'age_guideline_55_69';
  }

  // Step 3 — High-risk early screening (always wins over Steps 1-2)
  if ((isBlack || brcaPositive) && ageNum >= 40 && ageNum < 55) {
    recommendPSA = true;
    psaRecommendReason = 'high_risk_early_screening';
  }
  if ((isBlack || brcaPositive) && ageNum >= 55) {
    recommendPSA = true;
    if (['score_threshold', 'age_guideline_55_69', null].includes(psaRecommendReason)) {
      psaRecommendReason = 'high_risk_early_screening';
    }
  }

  // Step 4 — Family history + age >= 40 (wins over Steps 1-2, yields to Step 3)
  if (fhBinary === 1 && ageNum >= 40) {
    recommendPSA = true;
    if (psaRecommendReason !== 'high_risk_early_screening') {
      psaRecommendReason = 'family_history_override';
    }
  }

  const PSA_RECOMMEND_MESSAGES = {
    score_threshold:
      'Your ePSA score exceeds the screening threshold. A PSA test is recommended. Please speak with your physician.',
    age_guideline_55_69:
      'AUA/SUO guidelines recommend that all men aged 55–69 discuss PSA screening with their physician, regardless of ePSA score. Please speak with your doctor about whether PSA testing is right for you.',
    high_risk_early_screening:
      'Due to your high-risk profile (Black ancestry or BRCA mutation), AUA/SUO guidelines recommend discussing PSA screening from age 40. Please speak with your physician.',
    family_history_override:
      'Due to your family history of prostate cancer, AUA/SUO guidelines recommend PSA screening from age 40. Please speak with your physician.'
  };

  const psaRecommendMessage = psaRecommendReason ? PSA_RECOMMEND_MESSAGES[psaRecommendReason] : null;

  let tierRisk, tierColor, tierScoreRange;
  if (probability < part1.riskCutoffs.lower.threshold) {
    tierRisk = 'LOWER'; tierColor = part1.riskCutoffs.lower.color;
    tierScoreRange = part1.riskCutoffs.lower.label;
  } else if (probability < part1.riskCutoffs.moderate.threshold) {
    tierRisk = 'MODERATE'; tierColor = part1.riskCutoffs.moderate.color;
    tierScoreRange = part1.riskCutoffs.moderate.label;
  } else {
    tierRisk = 'HIGHER'; tierColor = part1.riskCutoffs.higher.color;
    tierScoreRange = part1.riskCutoffs.higher.label;
  }

  let risk, color, action, scoreRange;
  if (recommendPSA === true) {
    risk = 'PSA_RECOMMENDED'; color = '#D4AF37';
    scoreRange = `>= ${(recommendThreshold * 100).toFixed(0)}%`;
    action = 'PSA blood testing recommended.\nDiscuss PSA testing with your doctor.';
  } else if (recommendPSA === false) {
    risk = 'PSA_NOT_RECOMMENDED'; color = '#27AE60';
    scoreRange = `< ${(recommendThreshold * 100).toFixed(0)}%`;
    action = 'Routine screening.\nFollow standard age-based screening guidance.';
  } else {
    risk = tierRisk; color = tierColor; scoreRange = tierScoreRange;
    if (tierRisk === 'HIGHER') action = 'PSA testing and urological evaluation are recommended.';
    else if (tierRisk === 'MODERATE') action = 'PSA blood testing recommended.\nDiscuss PSA testing with your doctor.';
    else action = 'Routine screening.\nFollow standard age-based screening guidance.';
  }

  // ---------------------------------------------------------------------------
  // ePSA Risk Tier — 3-tier system (v2)
  // Low (≤10) | Intermediate (11-17) | Elevated (≥18)
  // Boundary at 18 = Youden-optimal threshold (J=0.138, sens=91.3%)
  // ---------------------------------------------------------------------------
  const EPSA_TIER_DEFS = [
    {
      key: 'low', label: 'Low Risk', scoreRange: 'score 0-10', normalizedRange: '<= 12.5%',
      guideline: 'Your ePSA score is in the low-risk range. Routine screening timeline applies. Discuss with your physician.',
      // Empirical: 7% csPCa rate [1%-31%] N=14
      empiricalRate: EPSA_TIER_CALIBRATION.low
    },
    {
      key: 'intermediate', label: 'Intermediate Risk', scoreRange: 'score 11-17', normalizedRange: '13.75%-21.25%',
      guideline: 'Your ePSA score is in the intermediate range. A PSA test is recommended. Speak with your physician.',
      empiricalRate: EPSA_TIER_CALIBRATION.intermediate
    },
    {
      key: 'elevated', label: 'Elevated Risk', scoreRange: 'score >= 18', normalizedRange: '>= 22.5%',
      guideline: 'Your ePSA score is elevated. A PSA test is recommended promptly. Please speak with your physician.',
      empiricalRate: EPSA_TIER_CALIBRATION.elevated
    }
  ];

  let epsaTierIndex;
  if (rawScore <= 10) epsaTierIndex = 0;
  else if (rawScore <= 17) epsaTierIndex = 1;
  else epsaTierIndex = 2;

  const epsaTierDef = EPSA_TIER_DEFS[epsaTierIndex];
  const hasTwoComorbidities =
    (comorbidityScore !== undefined && comorbidityScore !== null)
      ? Number(comorbidityScore) >= 2
      : comorbidityPoints >= 20;

  const highRiskAnchors = {
    age70plus: ageNum >= 70,
    blackRace: isBlack,
    familyHistory: fhBinary > 0,
    brca: brcaPositive,
    twoComorbidities: hasTwoComorbidities
  };
  const hasHighRiskAnchor = Object.values(highRiskAnchors).some((v) => v === true);
  const isHighRiskFlagged = rawScore >= 18 && hasHighRiskAnchor;

  // ---------------------------------------------------------------------------
  // Empirical probability display text
  // "In our study, X in Y patients with your risk level had significant cancer"
  // ---------------------------------------------------------------------------
  const cal = epsaTierDef.empiricalRate;
  const empiricalProbabilityText = cal
    ? `In our validation study (N=${cal.n}), ${cal.events} in ${cal.n} patients at this risk tier had clinically significant prostate cancer (${Math.round(cal.rate * 100)}%; 95% CI ${Math.round(cal.ci_lo * 100)}%–${Math.round(cal.ci_hi * 100)}%).`
    : null;

  return {
    // Core score
    score: scorePercent,
    scoreRange,
    recommendationThresholdLabel,
    confidenceRange: `${rangeLow}%-${rangeHigh}%`,
    confidenceLow: rangeLow,
    confidenceHigh: rangeHigh,

    // PSA recommendation
    risk,
    color,
    action: epsaTierDef.guideline,
    recommendPSA,
    psaRecommendReason,
    psaRecommendMessage,

    // Legacy tier fields
    tierRisk,
    tierColor,
    tierScoreRange,

    // 3-tier classification
    epsaTierIndex,
    epsaTierKey: epsaTierDef.key,
    epsaTierLabel: epsaTierDef.label,
    epsaTierScoreRange: epsaTierDef.scoreRange,
    epsaTierNormalizedRange: epsaTierDef.normalizedRange,
    epsaTierBoundaries: { lowMax: 10, intermediateMax: 17, maxScore: MAX_POINTS },

    // Empirical calibration
    empiricalProbabilityText,
    empiricalRate: cal?.rate ?? null,
    empiricalRateCiLo: cal?.ci_lo ?? null,
    empiricalRateCiHi: cal?.ci_hi ?? null,

    // Risk factors
    isHighRiskFlagged,
    highRiskAnchors,
    itemImpacts,

    // Pass-through fields for Model 2/3/4
    isBlack,
    fhBinary,
    brcaStatus,
    bmi: Number(bmi).toFixed(1),
    age: parseInt(age, 10),
    ipssTotal: ipssTotal,
    shimTotal: shimTotal,

    // Metadata
    epsaGuidelineText: epsaTierDef.guideline,
    modelVersion: config.version,
    displayRange: `${rangeLow}%-${rangeHigh}%`,
    pathwayMode: formData.pathwayMode || 'pre_psa',
    calculationDetails: { probability, rawScore, maxScore: MAX_POINTS }
  };
};

// =============================================================================
// MODELS 2 & 3 — post_psa / post_mri
// =============================================================================
export const calculateDynamicEPsaPost = (preResult, postData, customConfig = null) => {
  const config = customConfig || DEFAULT_CALCULATOR_CONFIG;
  const { psa, pirads, knowPirads } = postData || {};
  const prostateVolumeValRaw =
    postData?.prostateVolume !== '' && postData?.prostateVolume != null
      ? Number(postData.prostateVolume)
      : null;

  const preScorePct = Number(preResult?.score) || 0;
  let baseRawScore = preResult?.calculationDetails?.rawScore;
  let baseMaxScore = preResult?.calculationDetails?.maxScore;

  if (!Number.isFinite(baseRawScore)) {
    baseMaxScore = 80;
    baseRawScore = Math.round((preScorePct / 100) * baseMaxScore);
  }

  // PSA scoring
  const psaVal = psa === '' || psa === null || psa === undefined ? null : Number(psa);
  let psaPoints = 0;
  if (psaVal != null && !Number.isNaN(psaVal)) {
    if (psaVal < 1.0) psaPoints = 0;
    else if (psaVal < 3.0) psaPoints = 10;
    else if (psaVal < 10.0) psaPoints = 25;
    else psaPoints = 45;
  }

  // PI-RADS scoring (Model 3 only)
  const piradsVal = knowPirads
    ? (pirads === '' || pirads === null || pirads === undefined ? null : Number(pirads))
    : null;
  let piradsPoints = 0;
  let piradsOverridden = false;
  if (piradsVal != null && !Number.isNaN(piradsVal)) {
    if (piradsVal === 3) piradsPoints = 15;
    else if (piradsVal === 4) piradsPoints = 30;
    else if (piradsVal === 5) { piradsPoints = 45; piradsOverridden = true; }
  }

  const isBlack = !!preResult?.isBlack;
  const fhBinary = preResult?.fhBinary ?? 0;
  const hasFamilyHistory = fhBinary === 1 || preResult?.familyHistory === 1;
  const brcaStatus = preResult?.brcaStatus;
  const brcaPositive = brcaStatus === 'yes' || brcaStatus === 'positive';
  const hasHighRiskFeature =
    isBlack || hasFamilyHistory || brcaPositive || (piradsVal != null && piradsVal >= 3);

  // Low-PSA warning: PSA < 2.0 with high-risk profile
  let psaBonusLow = 0;
  let lowPsaWarning = false;
  let lowPsaWarningText = null;
  if (psaVal != null && !Number.isNaN(psaVal) && psaVal < 2.0 && hasHighRiskFeature) {
    psaBonusLow = 15;
    lowPsaWarning = true;
    lowPsaWarningText =
      'Important: Low PSA Does Not Rule Out Risk. Your PSA level is below 2.0 ng/mL, which is often considered reassuring. However, your risk profile includes one or more high-risk features (race, family history, genetic mutations, or MRI findings) that are associated with clinically significant prostate cancer even at low PSA levels. Standard guidelines do not currently account for these factors when interpreting PSA thresholds. Early evaluation with a urologist is recommended regardless of your PSA value.';
  }

  // ---------------------------------------------------------------------------
  // PSAD — PSA Density (Kadeer 2025, Front. Oncol. 15:1602134)
  // Youden-optimal cutoff: 0.177 ng/mL/cm³
  // ---------------------------------------------------------------------------
  const prostateVolumeVal =
    prostateVolumeValRaw != null && Number.isFinite(prostateVolumeValRaw) ? prostateVolumeValRaw : null;

  let psadPoints = 0;
  let psadValue = null;
  let psadFlag = false;

  if (
    prostateVolumeVal != null && !Number.isNaN(prostateVolumeVal) &&
    psaVal != null && !Number.isNaN(psaVal) &&
    prostateVolumeVal > 0
  ) {
    psadValue = psaVal / prostateVolumeVal;
    if (psadValue > 0.177) { psadPoints = 20; psadFlag = true; }
    else if (psadValue > 0.10) { psadPoints = 10; }
  }

  const totalPoints = baseRawScore + psaPoints + psaBonusLow + piradsPoints + psadPoints;

  // ---------------------------------------------------------------------------
  // Combined tier mapping
  // Boundaries: Low ≤13 | Int-Low 14-27 | Int-High 28-55 | High ≥56
  // Empirical csPCa rates: Int-High 21% (N=58), High 31% (N=32)
  // ---------------------------------------------------------------------------
  const TIER_DEFS = [
    {
      key: 'low', label: 'Low Risk', psaEquivalent: '< 1.0 ng/mL',
      guideline: 'Your combined risk profile is consistent with a PSA equivalent below 1.0 ng/mL. Per AUA, NCCN, and EAU guidelines, men in this range may follow routine screening intervals of 8-10 years if under 55, or as directed by your physician.',
      empiricalRate: COMBINED_TIER_CALIBRATION['low']
    },
    {
      key: 'intermediate-low', label: 'Intermediate-Low Risk', psaEquivalent: '1.0-2.9 ng/mL',
      guideline: 'Your combined risk profile is consistent with a PSA equivalent of 1.0-2.9 ng/mL. Guidelines recommend re-screening every 2-4 years. Discuss with your physician whether earlier follow-up is appropriate given your individual risk factors.',
      empiricalRate: COMBINED_TIER_CALIBRATION['intermediate-low']
    },
    {
      key: 'intermediate-high', label: 'Intermediate-High Risk', psaEquivalent: '3.0-9.9 ng/mL',
      guideline: 'Your combined risk profile is consistent with a PSA equivalent of 3.0-9.9 ng/mL. AUA, NCCN, and EAU guidelines recommend urology referral and shared decision-making regarding further workup including possible biopsy.',
      empiricalRate: COMBINED_TIER_CALIBRATION['intermediate-high']
    },
    {
      key: 'high', label: 'High Risk', psaEquivalent: '>= 10.0 ng/mL',
      guideline: 'Your combined risk profile warrants prompt evaluation. AUA, NCCN, and EAU guidelines strongly recommend urology referral and biopsy discussion. Do not delay follow-up with your physician.',
      empiricalRate: COMBINED_TIER_CALIBRATION['high']
    }
  ];

  let tierIndex;
  if (piradsOverridden) tierIndex = 3;
  else if (totalPoints <= 13) tierIndex = 0;
  else if (totalPoints <= 27) tierIndex = 1;
  else if (totalPoints <= 55) tierIndex = 2;
  else tierIndex = 3;

  const tierDef = TIER_DEFS[tierIndex];
  const RISK_CLASSES = ['low-risk', 'moderate-risk', 'high-risk', 'very-high-risk'];
  const riskClass = RISK_CLASSES[tierIndex];

  // PSA tier for discordance
  let psaTierIndex = null;
  let psaTierLabel = null;
  if (psaVal != null && !Number.isNaN(psaVal)) {
    if (psaVal < 1.0) { psaTierIndex = 0; psaTierLabel = 'Low'; }
    else if (psaVal < 3.0) { psaTierIndex = 1; psaTierLabel = 'Intermediate-Low'; }
    else if (psaVal < 10.0) { psaTierIndex = 2; psaTierLabel = 'Intermediate-High'; }
    else { psaTierIndex = 3; psaTierLabel = 'High'; }
  }

  let discordanceFlag = null;
  if (psaTierIndex != null) {
    const diff = tierIndex - psaTierIndex;
    if (diff > 0) {
      const severity = diff === 1 ? 'yellow' : 'orange';
      discordanceFlag = {
        severity,
        text: `Risk Discordance Detected. Your ePSA risk profile (${tierDef.label}) is higher than what your PSA level alone (${psaVal} ng/mL, ${psaTierLabel}) would suggest. This may indicate that your individual risk factors — such as race, family history, or genetic markers — place you at elevated risk that standard PSA screening alone may underestimate. Discuss this discordance with your physician before concluding that your PSA result is reassuring.`
      };
    }
  }

  // ---------------------------------------------------------------------------
  // PI-RADS confidence text (Model 3) — guideline-based
  // ---------------------------------------------------------------------------
  let piradsConfidenceText = null;
  if (piradsVal != null) {
    const piradsMessages = {
      1: 'PI-RADS 1: Very low. Clinically significant cancer is highly unlikely to be present. (PI-RADS v2.1)',
      2: 'PI-RADS 2: Low. Clinically significant cancer is unlikely to be present. (PI-RADS v2.1)',
      3: 'PI-RADS 3: Intermediate. The presence of clinically significant cancer is equivocal. Shared decision-making with your urologist is recommended. (PI-RADS v2.1)',
      4: 'PI-RADS 4: High. Clinically significant cancer is likely to be present. AUA/NCCN/EAU guidelines recommend biopsy discussion. (PI-RADS v2.1)',
      5: 'PI-RADS 5: Very high. Clinically significant cancer is highly likely to be present. AUA/NCCN/EAU guidelines recommend biopsy without delay. (PI-RADS v2.1)'
    };
    piradsConfidenceText = piradsMessages[piradsVal] || null;
  }

  // ---------------------------------------------------------------------------
  // Empirical probability display (Models 2 & 3)
  // ---------------------------------------------------------------------------
  const cal = tierDef.empiricalRate;
  let empiricalProbabilityText = null;
  if (cal && cal.rate !== null) {
    empiricalProbabilityText = `In our validation study, approximately ${Math.round(cal.rate * 100)}% of patients at this combined risk tier had clinically significant prostate cancer (N=${cal.n}). ${cal.note}.`;
  }

  // ---------------------------------------------------------------------------
  // Biopsy recommendation (Model 3 — post_mri pathway)
  // ---------------------------------------------------------------------------
  let biopsyRecommended = false;
  let biopsyReason = null;
  let biopsyMessage = null;

  if (piradsOverridden) {
    biopsyRecommended = true;
    biopsyReason = 'pirads_5';
    biopsyMessage = 'Your MRI identified a PI-RADS 5 finding. AUA, NCCN, and EAU guidelines recommend prompt biopsy discussion with a urologist. Do not delay this conversation.';
  } else if (totalPoints >= 56) {
    biopsyRecommended = true;
    biopsyReason = 'combined_score_high';
    biopsyMessage = 'Your combined risk score is in the High tier. AUA and NCCN guidelines recommend urology referral and biopsy discussion. Prompt evaluation is advised.';
  } else if (discordanceFlag && discordanceFlag.severity === 'orange' && tierIndex >= 2) {
    biopsyRecommended = true;
    biopsyReason = 'high_risk_discordance';
    biopsyMessage = 'Your ePSA risk profile is significantly higher than your PSA level suggests. Combined with your MRI findings, urologist review and biopsy discussion are recommended.';
  }

  const pathwayMode = postData?.pathwayMode || (knowPirads ? 'post_mri' : 'post_psa');

  return {
    // Core combined score
    riskPct: tierDef.psaEquivalent,
    riskPctRange: null,
    riskCat: tierDef.label,
    riskClass,
    totalPoints,
    prePoints: baseRawScore,
    baselineCarryPoints: null,
    psaPoints,
    piradsPoints,
    psadPoints,

    // Tier
    epsaTierIndex: tierIndex,
    epsaTierKey: tierDef.key,
    guidelineText: tierDef.guideline,
    nextSteps: [tierDef.guideline],

    // Flags
    piradsOverridden,
    discordanceFlag,
    lowPsaWarning,
    lowPsaWarningText,
    psadValue,
    psadFlag,

    // PSA context
    psaTier: psaTierLabel,
    psaValue: psaVal,

    // Biopsy (Model 3)
    biopsyRecommended,
    biopsyReason,
    biopsyMessage,

    // Confidence
    piradsConfidenceText,
    empiricalProbabilityText,
    empiricalRate: cal?.rate ?? null,

    // Metadata
    pathwayMode,
    modelVersion: config.version
  };
};

// =============================================================================
// MODEL 4 — post_biopsy: "I've had a biopsy — active surveillance or treatment?"
// =============================================================================
//
// Clinical basis:
//   AUA/NCCN Very Low Risk (strong AS): GG1, PSA density ≤0.15, ≤2 cores positive
//   AUA/NCCN Low Risk (AS recommended): GG1, PSA <10, no high-grade features
//   AUA/NCCN Intermediate Favourable:  GG2, may be suitable for AS in select patients
//   AUA/NCCN Intermediate Unfavourable: GG2 + high-volume, or GG3 — treatment preferred
//   AUA/NCCN High/Very High Risk:       GG4-5 — treatment recommended
//
//   ePSA validation: AUC 0.624 for predicting GG1 (vs PSA AUC 0.513, N=94)
//   Low/Int ePSA (≤17): 89% of patients were GG1 or GG2 (AS-eligible)
//
// Inputs (asData object):
//   biopsyGGG:        number 1-5 (required)
//   coresPositive:    number (positive cores, required)
//   coresTotal:       number (total cores taken, required)
//   maxCorePct:       number 0-100 (highest % core involvement, optional)
//   psaValue:         number (PSA ng/mL, required if not in preResult)
//   prostateVolume:   number cm³ (optional — enables PSAD)
//   pirads:           number 1-5 (optional — MRI if done)
//
// =============================================================================
export const calculateActiveSurveillance = (preResult, asData, customConfig = null) => {
  const config = customConfig || DEFAULT_CALCULATOR_CONFIG;

  const {
    biopsyGGG,
    coresPositive,
    coresTotal,
    maxCorePct,
    psaValue: psaInput,
    prostateVolume,
    pirads: mriPirads
  } = asData || {};

  // Required inputs
  const ggg = Number(biopsyGGG);
  const coresPos = Number(coresPositive);
  const coresTotal_ = Number(coresTotal);
  const psaVal = psaInput != null && psaInput !== '' ? Number(psaInput) : null;

  if (!ggg || ggg < 1 || ggg > 5) return null;
  if (isNaN(coresPos) || isNaN(coresTotal_) || coresTotal_ <= 0) return null;

  // Optional
  const maxPct = maxCorePct != null && maxCorePct !== '' ? Number(maxCorePct) : null;
  const vol = prostateVolume != null && prostateVolume !== '' && Number(prostateVolume) > 0
    ? Number(prostateVolume) : null;
  const piradsVal = mriPirads != null && mriPirads !== '' ? Number(mriPirads) : null;

  // PSAD calculation
  const psad = (psaVal != null && vol != null && vol > 0) ? psaVal / vol : null;

  // Pull base ePSA raw score
  const baseRawScore = preResult?.calculationDetails?.rawScore ?? 0;
  const epsaTierIndex = preResult?.epsaTierIndex ?? 2;

  // ───────────────────────────────────────────────────────────────────────────
  // AS Scoring — additive model anchored to GGG
  // Positive score = more evidence for treatment
  // Negative score = more evidence for AS
  // ───────────────────────────────────────────────────────────────────────────
  let asScore = 0;
  const asFactors = [];

  const addFactor = (label, value, points, note) => {
    asFactors.push({ label, value, points, note });
    asScore += points;
  };

  // --- Gleason Grade Group (primary driver) ---
  if (ggg === 1) {
    addFactor('Gleason Grade Group', 'GG1 (3+3=6)', -20,
      'GG1: AUA/NCCN strongly recommend active surveillance. Risk of cancer progression is very low.');
  } else if (ggg === 2) {
    addFactor('Gleason Grade Group', 'GG2 (3+4=7)', -5,
      'GG2: Active surveillance appropriate for select patients (favourable intermediate risk). Shared decision-making with urologist recommended.');
  } else if (ggg === 3) {
    addFactor('Gleason Grade Group', 'GG3 (4+3=7)', +20,
      'GG3: Unfavourable intermediate risk. Treatment is generally recommended over active surveillance.');
  } else if (ggg === 4) {
    addFactor('Gleason Grade Group', 'GG4 (Gleason 8)', +35,
      'GG4: High-risk cancer. Treatment is strongly recommended. Active surveillance is not appropriate.');
  } else if (ggg === 5) {
    addFactor('Gleason Grade Group', 'GG5 (Gleason 9-10)', +45,
      'GG5: Very high-risk cancer. Immediate treatment is recommended. Active surveillance is not appropriate.');
  }

  // --- Core involvement ---
  const corePct = coresPos / coresTotal_;
  if (corePct <= 2 / 12) { // ≤2 of 12 cores — NCCN Very Low Risk criterion
    addFactor('Biopsy core involvement', `${coresPos}/${coresTotal_} cores positive`, -10,
      'Low core involvement (≤2/12 equivalent): consistent with NCCN Very Low Risk AS criteria.');
  } else if (corePct <= 0.5) {
    addFactor('Biopsy core involvement', `${coresPos}/${coresTotal_} cores positive`, 0,
      'Moderate core involvement: does not automatically disqualify AS, but discuss volume with urologist.');
  } else {
    addFactor('Biopsy core involvement', `${coresPos}/${coresTotal_} cores positive`, +10,
      'High core involvement (>50% of cores): suggests higher-volume disease. Active surveillance requires careful consideration.');
  }

  // --- Maximum core percentage involvement ---
  if (maxPct != null) {
    if (maxPct <= 10) {
      addFactor('Max core involvement', `${maxPct}%`, -5,
        'Very low maximum core involvement (≤10%): supports AS candidacy.');
    } else if (maxPct <= 50) {
      addFactor('Max core involvement', `${maxPct}%`, 0,
        'Moderate maximum core involvement: acceptable for AS in some cases.');
    } else {
      addFactor('Max core involvement', `${maxPct}%`, +10,
        'High maximum core involvement (>50%): higher tumour burden. AS requires careful discussion.');
    }
  }

  // --- PSA Density ---
  if (psad != null) {
    if (psad <= 0.10) {
      addFactor('PSA Density', `${psad.toFixed(3)} ng/mL/cm³`, -10,
        'Low PSA density (≤0.10): very reassuring. Strongly supports AS candidacy. Source: Kadeer 2025.');
    } else if (psad <= 0.15) {
      addFactor('PSA Density', `${psad.toFixed(3)} ng/mL/cm³`, -5,
        'PSA density ≤0.15 ng/mL/cm³: meets NCCN Very Low Risk criterion. Favours AS.');
    } else if (psad <= 0.177) {
      addFactor('PSA Density', `${psad.toFixed(3)} ng/mL/cm³`, 0,
        'PSA density in intermediate range (0.15-0.177). Discuss with urologist.');
    } else {
      addFactor('PSA Density', `${psad.toFixed(3)} ng/mL/cm³`, +10,
        'Elevated PSA density (>0.177 ng/mL/cm³): associated with higher cancer burden. Youden-optimal cutoff from Kadeer 2025. Reconsider AS.');
    }
  }

  // --- MRI / PI-RADS ---
  if (piradsVal != null) {
    if (piradsVal <= 2) {
      addFactor('MRI (PI-RADS)', `PI-RADS ${piradsVal}`, -10,
        'PI-RADS 1-2: No significant lesion on MRI. Reassuring for AS.');
    } else if (piradsVal === 3) {
      addFactor('MRI (PI-RADS)', 'PI-RADS 3', 0,
        'PI-RADS 3: Equivocal finding. Does not significantly alter AS candidacy in isolation.');
    } else if (piradsVal === 4) {
      addFactor('MRI (PI-RADS)', 'PI-RADS 4', +15,
        'PI-RADS 4: Suspicious MRI finding. Many urologists would recommend repeat biopsy or treatment over AS.');
    } else if (piradsVal === 5) {
      addFactor('MRI (PI-RADS)', 'PI-RADS 5', +25,
        'PI-RADS 5: Highly suspicious MRI finding. Active surveillance is generally not recommended.');
    }
  }

  // --- ePSA contextual risk (from Model 1) ---
  if (epsaTierIndex === 0) {
    addFactor('ePSA pre-biopsy risk', 'Low tier', -5,
      'Low pre-biopsy ePSA score: consistent with lower contextual risk. Supports AS for eligible GGG.');
  } else if (epsaTierIndex === 2) {
    addFactor('ePSA pre-biopsy risk', 'Elevated tier', +5,
      'Elevated pre-biopsy ePSA score: higher contextual risk profile. Discuss with urologist when considering AS.');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // AS Recommendation tier
  // ───────────────────────────────────────────────────────────────────────────

  // Hard overrides — GGG 3+ with very high score, or GGG 4-5
  let asTierKey, asTierLabel, asColor, asRecommendation, asGuidelineSource;

  // GG4-5 always treatment regardless of other factors
  if (ggg >= 4) {
    asTierKey = 'treatment';
    asTierLabel = 'Treatment Recommended';
    asColor = '#dc2626';
    asRecommendation =
      'Based on your biopsy results (GG4 or GG5), active surveillance is not appropriate. AUA, NCCN, and EAU guidelines recommend treatment. Please discuss options — including surgery, radiation, or systemic therapy — with your urologist promptly.';
    asGuidelineSource = 'AUA/NCCN High Risk Prostate Cancer Guidelines';
  } else if (asScore <= -10) {
    asTierKey = 'as_recommended';
    asTierLabel = 'Active Surveillance Recommended';
    asColor = '#16a34a';
    asRecommendation =
      'Your biopsy and risk profile are consistent with active surveillance. AUA and NCCN guidelines support AS for low-risk prostate cancer. AS involves regular PSA tests, repeat biopsies, and periodic MRI to monitor for progression — without immediate treatment. Discuss this approach with your urologist.';
    asGuidelineSource = 'AUA/NCCN Active Surveillance Guidelines (GG1 low-risk)';
  } else if (asScore <= 10) {
    asTierKey = 'shared_decision';
    asTierLabel = 'Shared Decision-Making';
    asColor = '#d97706';
    asRecommendation =
      'Your risk profile falls in a zone where active surveillance may be appropriate, but treatment is also a reasonable option. AUA guidelines emphasise shared decision-making for intermediate-risk patients. Discuss your values, lifestyle, and priorities with your urologist before deciding.';
    asGuidelineSource = 'AUA/NCCN Intermediate Risk Shared Decision-Making Guidelines';
  } else {
    asTierKey = 'treatment';
    asTierLabel = 'Treatment Likely Indicated';
    asColor = '#dc2626';
    asRecommendation =
      'Based on the combination of your biopsy results and risk factors, treatment appears more appropriate than active surveillance. Please discuss surgery, radiation, or other options with your urologist.';
    asGuidelineSource = 'AUA/NCCN Unfavourable Intermediate and High Risk Guidelines';
  }

  // ---------------------------------------------------------------------------
  // AS eligibility message with empirical context
  // ---------------------------------------------------------------------------
  let asEmpiricalNote = null;
  if (ggg <= 2) {
    const lowIntPct = preResult?.epsaTierIndex <= 1 ? 89 : 72;
    asEmpiricalNote = `In our validation cohort (N=94), ${lowIntPct}% of patients with this ePSA profile had GG1-2 pathology, which is consistent with active surveillance eligibility.`;
  }

  // ---------------------------------------------------------------------------
  // NCCN Risk Classification (for reference display)
  // ---------------------------------------------------------------------------
  let nccnRiskGroup;
  const psaLow = psaVal != null && psaVal < 10;
  const psadLow = psad != null && psad <= 0.15;
  const coreLow = corePct <= 2 / 12;

  if (ggg === 1 && psaLow && psadLow && coreLow) {
    nccnRiskGroup = 'Very Low Risk';
  } else if (ggg === 1 && psaLow) {
    nccnRiskGroup = 'Low Risk';
  } else if (ggg === 2) {
    nccnRiskGroup = 'Favourable Intermediate Risk';
  } else if (ggg === 3) {
    nccnRiskGroup = 'Unfavourable Intermediate Risk';
  } else if (ggg === 4) {
    nccnRiskGroup = 'High Risk';
  } else {
    nccnRiskGroup = 'Very High Risk';
  }

  return {
    // AS recommendation
    asTierKey,
    asTierLabel,
    asColor,
    asRecommendation,
    asGuidelineSource,

    // Score breakdown
    asScore,
    asFactors,

    // Clinical context
    nccnRiskGroup,
    biopsyGGG: ggg,
    coresPositive: coresPos,
    coresTotal: coresTotal_,
    corePct: Math.round(corePct * 100),
    maxCorePct: maxPct,
    psaValue: psaVal,
    psadValue: psad,
    psadFlag: psad != null && psad > 0.177,
    piradsValue: piradsVal,

    // Empirical context
    asEmpiricalNote,

    // Metadata
    pathwayMode: 'post_biopsy',
    modelVersion: config.version,
    disclaimer:
      'This tool provides educational guidance only and is not a substitute for clinical judgment. Active surveillance decisions require careful discussion with a urologist considering all clinical, pathological, and patient-specific factors.'
  };
};

