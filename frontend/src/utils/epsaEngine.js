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

  const hasComorbidityScore =
    formData?.comorbidityScore !== undefined && formData?.comorbidityScore !== null;
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
        warnings.push(
          `BMI is above the validated range (>${validation.maxBMI}); results may be less accurate.`
        );
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
  //
  // v2 change log vs v1:
  //   Age 60-69:       8 -> 10  posterior OR 1.86
  //   Age 70+:        16 -> 16  posterior OR 2.58 (anchor, unchanged)
  //   BMI >= 30:       8 ->  4  posterior OR 1.27
  //   IPSS mild:       8 ->  8  posterior OR 1.58 (unchanged)
  //   IPSS moderate:   4 ->  0  posterior OR 0.94 (non-significant, removed)
  //   IPSS severe:     0 ->  0  reference (unchanged)
  //   Exercise some:   8 ->  2  posterior OR 1.18
  //   Exercise none:  16 ->  4  posterior OR 1.21
  //   Smoking former:  8 ->  2  posterior OR 1.11
  //   Smoking current:16 ->  6  posterior OR 1.49
  //   Diet red meat:   8 ->  4  posterior OR 1.24
  //   Race Black:      8 ->  8  posterior OR 1.52 (unchanged)
  //   Family history: 16 -> 10  posterior OR 1.71
  //   Comorbidity:   0-2 -> 0,10,20  posterior OR 1.72/unit (only sig. variable, p=0.001)
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

  // Only IPSS mild (0-7) scores. Moderate (8-19) and severe (20-35) both score 0.
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

  // Non-Bayesian variables retained from v1
  const brcaPositive = brcaStatus === 'yes' || brcaStatus === 'positive';
  const brcaLabel =
    brcaPositive ? 'Positive' :
      brcaStatus === 'no' ? 'Negative (tested)' :
        'Not tested / Unknown';
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

  const recommendThreshold =
    typeof part1?.recommendThreshold === 'number' ? part1.recommendThreshold : 0.09;
  const recommendationThresholdLabel = `>= ${(recommendThreshold * 100).toFixed(0)}%`;
  const lowerProb = rangeLow / 100;
  const upperProb = rangeHigh / 100;

  let recommendPSA = null;
  if (upperProb < recommendThreshold) recommendPSA = false;
  else if (lowerProb >= recommendThreshold) recommendPSA = true;

  // Clinical override: family history + age >= 40 always recommends PSA
  if (fhBinary === 1 && parseInt(age, 10) >= 40) recommendPSA = true;

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
    scoreRange = recommendThreshold != null
      ? `>= ${(recommendThreshold * 100).toFixed(0)}%` : tierScoreRange;
    action = 'PSA blood testing recommended.\nDiscuss PSA testing with your doctor.';
  } else if (recommendPSA === false) {
    risk = 'PSA_NOT_RECOMMENDED'; color = '#27AE60';
    scoreRange = recommendThreshold != null
      ? `< ${(recommendThreshold * 100).toFixed(0)}%` : tierScoreRange;
    action = 'Routine screening.\nFollow standard age-based screening guidance.';
  } else {
    risk = tierRisk; color = tierColor; scoreRange = tierScoreRange;
    if (tierRisk === 'HIGHER') action = 'PSA testing and urological evaluation are recommended.';
    else if (tierRisk === 'MODERATE') action = 'PSA blood testing recommended.\nDiscuss PSA testing with your doctor.';
    else action = 'Routine screening.\nFollow standard age-based screening guidance.';
  }

  // ---------------------------------------------------------------------------
  // ePSA Risk Tier — 3-tier system (v2, updated March 2026)
  //
  // CHANGE from previous 4-tier:
  //   Old: Low (<=10) | Int-Low (11-17) | Int-High (18-30) | High (>=31)
  //   New: Low (<=10) | Intermediate (11-17) | Elevated (>=18)
  //
  // Rationale:
  //   csPCa prevalence was 28% Int-High vs 27% High — statistically identical.
  //   Youden J at old High boundary (>=31) = 0.038, near-worthless discriminator.
  //   90% of old High-tier patients already had PSA >= 4.
  //   Validated triage threshold is >=18 (J=0.138, sens=91.3%, spec=22.5%).
  //   The >=31 boundary was not empirically supported in the N=94 validation cohort.
  //
  // PSA-equivalent labels removed from Part 1:
  //   Part 1 runs before PSA is drawn. PSA-equivalent numbers have no anchor
  //   and were creating false precision (old High label ">= 10 ng/mL" was wrong —
  //   median PSA in that cohort was 6.7 ng/mL). Replaced with action language.
  //   PSA-equivalent labels ARE retained in Part 2 where a real PSA is present.
  // ---------------------------------------------------------------------------
  const EPSA_TIER_DEFS = [
    {
      key: 'low',
      label: 'Low Risk',
      scoreRange: 'score 0-10',
      normalizedRange: '<= 12.5%',
      guideline:
        'Your ePSA score is in the low-risk range. Routine screening timeline applies. Discuss with your physician.'
    },
    {
      key: 'intermediate',
      label: 'Intermediate Risk',
      scoreRange: 'score 11-17',
      normalizedRange: '13.75%-21.25%',
      guideline:
        'Your ePSA score is in the intermediate range. A PSA test is recommended. Speak with your physician.'
    },
    {
      key: 'elevated',
      label: 'Elevated Risk',
      scoreRange: 'score >= 18',
      normalizedRange: '>= 22.5%',
      guideline:
        'Your ePSA score is elevated. A PSA test is recommended promptly. Please speak with your physician.'
    }
  ];

  // 3-tier assignment (Youden-optimal boundary at rawScore >= 18)
  let epsaTierIndex;
  if (rawScore <= 10) epsaTierIndex = 0;        // Low
  else if (rawScore <= 17) epsaTierIndex = 1;   // Intermediate
  else epsaTierIndex = 2;                       // Elevated (formerly Int-High + High)

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

  return {
    score: scorePercent,
    scoreRange,
    recommendationThresholdLabel,
    risk,
    color,
    action: epsaTierDef.guideline,
    recommendPSA,
    tierRisk,
    tierColor,
    tierScoreRange,
    confidenceRange: `${rangeLow}%-${rangeHigh}%`,
    confidenceLow: rangeLow,
    confidenceHigh: rangeHigh,
    ipssTotal: variableValues.ipssTotal,
    shimTotal: variableValues.shimTotal,
    bmi: Number(bmi).toFixed(1),
    age: parseInt(age, 10),
    isBlack,
    fhBinary,
    brcaStatus,
    // 3-tier result fields
    epsaTierIndex,
    epsaTierKey: epsaTierDef.key,
    epsaTierLabel: epsaTierDef.label,
    epsaTierScoreRange: epsaTierDef.scoreRange,
    epsaTierNormalizedRange: epsaTierDef.normalizedRange,
    epsaTierBoundaries: {
      lowMax: 10,
      intermediateMax: 17,
      maxScore: MAX_POINTS
    },
    itemImpacts,
    isHighRiskFlagged,
    highRiskAnchors,
    // epsaPsaEquivalent intentionally omitted from Part 1 — see comment above
    epsaGuidelineText: epsaTierDef.guideline,
    modelVersion: config.version,
    displayRange: `${rangeLow}%-${rangeHigh}%`,
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

  const preScorePct = Number(preResult?.score) || 0;
  let baseRawScore = preResult?.calculationDetails?.rawScore;
  let baseMaxScore = preResult?.calculationDetails?.maxScore;

  if (!Number.isFinite(baseRawScore)) {
    baseMaxScore = 80;
    baseRawScore = Math.round((preScorePct / 100) * baseMaxScore);
  }

  const psaVal = psa === '' || psa === null || psa === undefined ? null : Number(psa);
  let psaPoints = 0;
  if (psaVal != null && !Number.isNaN(psaVal)) {
    if (psaVal < 1.0) psaPoints = 0;
    else if (psaVal < 3.0) psaPoints = 10;
    else if (psaVal < 10.0) psaPoints = 25;
    else psaPoints = 45;
  }

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

  let psaBonusLow = 0;
  let lowPsaWarning = false;
  let lowPsaWarningText = null;
  if (psaVal != null && !Number.isNaN(psaVal) && psaVal < 2.0 && hasHighRiskFeature) {
    psaBonusLow = 15;
    lowPsaWarning = true;
    lowPsaWarningText =
      'Important: Low PSA Does Not Rule Out Risk. Your PSA level is below 2.0 ng/mL, which is often considered reassuring. However, your risk profile includes one or more high-risk features (race, family history, genetic mutations, or MRI findings) that are associated with clinically significant prostate cancer even at low PSA levels. Standard guidelines do not currently account for these factors when interpreting PSA thresholds. Early evaluation with a urologist is recommended regardless of your PSA value.';
  }

  const totalPoints = baseRawScore + psaPoints + psaBonusLow + piradsPoints;

  // ---------------------------------------------------------------------------
  // Part 2 tier mapping
  //
  // PSA-equivalent labels ARE present here because a real PSA value is available.
  //
  // CHANGE: High tier psaEquivalent updated from ">= 10 ng/mL" to ">= 4.0 ng/mL".
  //   The old label was inherited from v1 scale and was factually wrong for v2:
  //   - Median PSA in the old High tier (rawScore >= 31) = 6.7 ng/mL
  //   - Only 20% of those patients actually had PSA >= 10
  //   - The AUA guideline action threshold is 4.0 ng/mL
  //   - ">= 4.0 ng/mL" accurately describes this population
  //
  // Part 2 combined score tier boundaries (0-80 base + PSA + PI-RADS addons):
  //   Low        <= 13
  //   Int-Low    14-27
  //   Int-High   28-55
  //   High       >= 56
  // ---------------------------------------------------------------------------
  const TIER_DEFS = [
    {
      key: 'low',
      label: 'Low Risk',
      psaEquivalent: '< 1.0 ng/mL',
      guideline:
        'Your combined risk profile is consistent with a PSA equivalent below 1.0 ng/mL. Per AUA, NCCN, and EAU guidelines, men in this range may follow routine screening intervals of 8-10 years if under 55, or as directed by your physician.'
    },
    {
      key: 'intermediate-low',
      label: 'Intermediate-Low Risk',
      psaEquivalent: '1.0-2.9 ng/mL',
      guideline:
        'Your combined risk profile is consistent with a PSA equivalent of 1.0-2.9 ng/mL. Guidelines recommend re-screening every 2-4 years. Discuss with your physician whether earlier follow-up is appropriate given your individual risk factors.'
    },
    {
      key: 'intermediate-high',
      label: 'Intermediate-High Risk',
      psaEquivalent: '3.0-9.9 ng/mL',
      guideline:
        'Your combined risk profile is consistent with a PSA equivalent of 3.0-9.9 ng/mL. AUA, NCCN, and EAU guidelines recommend urology referral and shared decision-making regarding further workup including possible biopsy.'
    },
    {
      key: 'high',
      label: 'High Risk',
      // UPDATED from ">= 10 ng/mL" — see comment block above
      psaEquivalent: '>= 4.0 ng/mL',
      guideline:
        'Your combined risk profile warrants prompt evaluation. AUA, NCCN, and EAU guidelines strongly recommend urology referral and biopsy discussion. Do not delay follow-up with your physician.'
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
      const discordanceText =
        `Risk Discordance Detected. Your ePSA risk profile (${tierDef.label}) is higher than what your PSA level alone (${psaVal} ng/mL, ${psaTierLabel}) would suggest. This may indicate that your individual risk factors — such as race, family history, or genetic markers — place you at elevated risk that standard PSA screening alone may underestimate. Discuss this discordance with your physician before concluding that your PSA result is reassuring.`;
      discordanceFlag = { severity, text: discordanceText };
    }
  }

  return {
    riskPct: tierDef.psaEquivalent,
    riskPctRange: null,
    riskCat: tierDef.label,
    riskClass,
    totalPoints,
    prePoints: baseRawScore,
    baselineCarryPoints: null,
    psaPoints,
    piradsPoints,
    nextSteps: [tierDef.guideline],
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