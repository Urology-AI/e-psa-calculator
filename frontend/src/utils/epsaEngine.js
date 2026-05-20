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
//   Model 4 — calculateActiveSurveillance() — MOVED to standalone AS Tool repo
//     See: as.millionstrongmen.com
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
// AUA_PSA_THRESHOLDS — canonical PSA thresholds from AUA/SUO 2023 (amended 2026)
// Source: AUA/SUO Early Detection of Prostate Cancer Guideline 2023, amended 2026
// These are the authoritative values used by AUAFlowchart.jsx and the engine.
// Do NOT change without updating both this block and the flowchart component.
// ---------------------------------------------------------------------------
export const AUA_PSA_THRESHOLDS = {
  age45_49: {
    threshold:     2.5,
    action_below:  'resume_at_50',         // PSA < 2.5 → no immediate follow-up, re-enter at 50
    action_above:  'biannual',             // PSA ≥ 2.5 → every 2 years
    grade:         'Conditional — Grade B',
    source:        'AUA/SUO 2026 Statement 4',
  },
  age50_69: {
    threshold:     3.5,
    action_below:  'biannual_sdm',         // PSA < 3.5 → every 2–4 years (SDM may extend)
    action_above:  'urology_referral',     // PSA ≥ 3.5 → confirmatory PSA, then urology
    grade:         'Strong — Grade A',
    source:        'AUA/SUO 2026 Statement 6',
  },
  age70plus: {
    threshold:           6.5,
    lifeExpectancyYears: 10,               // LE < 10y → discontinue regardless of PSA
    action_below:        'discontinue_or_lengthen', // PSA < 6.5 + LE ≥ 10y → SDM
    action_above:        'urology_referral',        // PSA ≥ 6.5 + LE ≥ 10y → urology
    grade:               'SDM — individualized',
    source:              'AUA/SUO 2026 Statement 8',
  },
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
    auc: 0.694,
    auc_ci_lo: 0.593,
    auc_ci_hi: 0.714,
    auc_cv: 0.687,
    auc_cv_sd: 0.109,
    n: 83,
    events: 20,
    outcome: 'GG3+ (high-grade PCa)',
    note: 'Logistic regression trained on N=83 patients with PI-RADS + biopsy outcome. ' +
          'GG2+ base rate 85.5% — not discriminable in this selected cohort. ' +
          'GG3+ AUC 0.694 validated by 5-fold CV. ' +
          'No prostate volume in dataset; PSAD pending data collection.'
  },
  model4: {
    auc_gg1: 0.624, auc_psa_gg1: 0.513,
    low_int_as_rate: 0.89,
    note: 'ePSA predicts GG1 AS-eligibility better than PSA alone (AUC 0.624 vs 0.513)'
  }
};

/**
 * Calculates predicted probability of GG3+ (high-grade) prostate cancer
 * from PI-RADS score and PSA using logistic regression trained on N=83 patients.
 *
 * Model: logit(GG3+) = -4.7205 + 0.6478*PIRADS + 0.5141*ln(PSA + 0.01)
 * AUC 0.694 [0.593–0.714], 5-fold CV AUC 0.687
 *
 * @param {number} pirads  - PI-RADS score (2, 3, 4, or 5)
 * @param {number} psa     - PSA in ng/mL (raw, before any 5-ARI correction)
 * @returns {{ prob: number, percent: number, interpretation: string } | null}
 *          null if inputs are missing or invalid
 */
export function calcHighGradeRisk(pirads, psa) {
  if (pirads == null || psa == null) return null;
  const p = Number(pirads);
  const s = Number(psa);
  if (!Number.isFinite(p) || !Number.isFinite(s) || s < 0) return null;
  if (![2, 3, 4, 5].includes(p)) return null;

  const logit = -4.7205 + 0.6478 * p + 0.5141 * Math.log(s + 0.01);
  const prob = 1 / (1 + Math.exp(-logit));
  const percent = Math.round(prob * 1000) / 10; // 1 decimal place

  let interpretation;
  if (prob < 0.10)      interpretation = 'Low GG3+ risk';
  else if (prob < 0.20) interpretation = 'Intermediate GG3+ risk';
  else if (prob < 0.35) interpretation = 'Elevated GG3+ risk';
  else                  interpretation = 'High GG3+ risk';

  return { prob, percent, interpretation };
}

// GUARDRAILS — fires when ePSA input exceeds validated model range or
// clinical guidelines require immediate action rather than a score.
// Based on: AUA/SUO 2026, NCCN 2024, EAU 2024.
export function checkGuardrails(formData, pathwayMode) {
  const alerts = [];
  const psaNum    = Number(formData?.psa);
  const piradsNum = Number(formData?.pirads);
  const psadNum   = (formData?.psad != null && formData.psad !== '')
    ? Number(formData.psad)
    : (formData?.psa && formData?.prostateVolume
        ? Number(formData.psa) / Number(formData.prostateVolume)
        : null);
  const ggg = Number(formData?.ggg);
  const age = Number(formData?.age);

  // 1. PSA > 100: outside model range, refer immediately.
  // Rationale: PSMA PET staging data show 87.5% probability of any metastatic disease at
  // PSA > 100 ng/mL (Luining et al. Eur Urol Open Sci. 2023). EAU 2024 and NCCN guidelines
  // both recommend staging imaging (bone scan or PSMA-PET) for high- and very-high-risk PCa
  // regardless of PSA level; PSA > 100 virtually always meets that threshold. The ePSA model
  // was derived on PSA ≤ ~40 ng/mL — extrapolating beyond that range produces unreliable scores.
  if (Number.isFinite(psaNum) && psaNum > 100) {
    alerts.push({
      level: 'critical',
      code: 'PSA_VERY_HIGH',
      title: 'PSA > 100 ng/mL — Immediate Urology Referral Required',
      message:
        `A PSA of ${psaNum} ng/mL is far outside the validated range of this tool (derived on ` +
        'PSA ≤ ~40 ng/mL). PSMA PET staging data show an 87.5% probability of any metastatic ' +
        'disease at PSA > 100 ng/mL. ePSA risk scores are not interpretable at this level. ' +
        'Staging imaging (bone scan or PSMA-PET) and prompt urology referral are required ' +
        'before any treatment planning. Do not rely on this tool\'s output at this PSA value.',
      guideline:
        'Luining WI et al. Eur Urol Open Sci. 2024;59:1–8. doi:10.1016/j.euros.2023.12.001 ' +
        '(87.5% any metastatic disease at PSA > 100 ng/mL on PSMA PET, N=2,193); ' +
        'EAU 2024 Prostate Cancer Guidelines — staging imaging (bone scan or PSMA-PET) ' +
        'recommended for high- and very-high-risk disease (Cornford P et al. Eur Urol. 2021;79(2):263–282, updated 2024); ' +
        'NCCN Prostate Cancer v1.2025 — bone scan recommended for high/very-high-risk patients.',
    });
  }

  // 2. GG4 or GG5 entered in AS Tool: not eligible for AS per guidelines
  if (pathwayMode === 'active_surveillance' && (ggg === 4 || ggg === 5)) {
    alerts.push({
      level: 'critical',
      code: 'GG_NOT_AS_ELIGIBLE',
      title: 'GG4/5 — Not Eligible for Active Surveillance',
      message:
        'Grade Group 4 or 5 disease is a contraindication to active surveillance per all major ' +
        'guidelines. This tool is validated for GG1–3 only. Treatment discussion is recommended.',
      guideline: 'AUA/SUO 2022 AS Guidelines; EAU 2024 §6.2; NCCN 2024 PROST-2',
    });
  }

  // 3. PSAD > 0.5 with PI-RADS 4 or 5: immediate biopsy threshold
  if (Number.isFinite(psadNum) && psadNum > 0.5 && piradsNum >= 4) {
    alerts.push({
      level: 'warning',
      code: 'PSAD_PIRADS_BIOPSY_THRESHOLD',
      title: 'PSAD > 0.5 + PI-RADS ≥4 — Biopsy Threshold Exceeded',
      message:
        `PSAD of ${psadNum.toFixed(2)} ng/mL/cm³ combined with PI-RADS ${piradsNum} meets ` +
        'criteria for biopsy recommendation per EAU 2024 and NCCN 2024 guidelines, independent ' +
        'of ePSA score. ePSA results are provided for context only.',
      guideline:
        'EAU 2024 Prostate Cancer §5.1.3; NCCN 2024 PROST-3; Kadeer et al. 2025 PSAD cutoff 0.177',
    });
  }

  return alerts;
}

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

  // Age-range guard: model coefficients were derived on ages 40–75.
  // Return a minimal shell so the display layer shows the correct
  // age-out messaging without producing a meaningless score.
  if (ageNum < 40 || ageNum > 75) {
    return {
      score: 0,
      age: ageNum,
      bmi: Number(bmi).toFixed(1),
      ipssTotal,
      shimTotal,
      itemImpacts: [],
      guardrailAlerts: [],
      belowMinAge: ageNum < 40,
      aboveMaxScreeningAge: ageNum > 75,
      // Age < 40: no PSA recommended per AUA/NCCN. Age > 75: requires SDM, not automatic.
      recommendPSA: ageNum < 40 ? false : null,
      epsaTierKey: 'low',
      pathwayMode: formData.pathwayMode || 'pre_psa',
      calculationDetails: { rawScore: 0, maxScore: 80 },
      modelVersion: config.version,
      skippedFields: Array.from(new Set(Array.isArray(formData.skippedFields) ? formData.skippedFields : [])),
    };
  }

  const bmiNum = parseFloat(bmi);
  const exerciseCode = Number(exercise);
  const fhBinary = familyHistory === 'unknown' ? 0 : familyHistory > 0 ? 1 : 0;
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
  // Age bins: 40-49 = 0 pts (reference), 50-59 = 6 pts (~1.5× OR, AUA mandatory
  // screening window), 60-69 = 10 pts, 70+ = 16 pts.
  // ---------------------------------------------------------------------------
  let rawScore = 0;
  const MAX_POINTS = 80;
  const _skippedFields = new Set(Array.isArray(formData.skippedFields) ? formData.skippedFields : []);
  const itemImpacts = [];
  const addImpact = (item, value, points, fieldKey = null) => {
    itemImpacts.push({ item, value, points, wasSkipped: fieldKey ? _skippedFields.has(fieldKey) : false });
    rawScore += points;
  };

  if (ageNum >= 70) addImpact('Age', `${ageNum} years`, 16);
  else if (ageNum >= 60) addImpact('Age', `${ageNum} years`, 10);
  else if (ageNum >= 50) addImpact('Age', `${ageNum} years`, 6);
  else addImpact('Age', `${ageNum} years`, 0);

  if (Number.isFinite(bmiNum) && bmiNum >= 30) addImpact('BMI', bmiNum.toFixed(1), 4);
  else addImpact('BMI', Number.isFinite(bmiNum) ? bmiNum.toFixed(1) : 'N/A', 0);

  // Only IPSS moderate (8-19) and severe (20-35) score points. Mild (0-7) scores 0.
  if (ipssTotal >= 8) addImpact('IPSS total', `${ipssTotal}/35`, 8, 'ipss');
  else addImpact('IPSS total', `${ipssTotal}/35`, 0, 'ipss');

  if (exerciseCode === 1) addImpact('Exercise', 'Some', 2, 'exercise');
  else if (exerciseCode === 2) addImpact('Exercise', 'None', 4, 'exercise');
  else addImpact('Exercise', 'Regular', 0, 'exercise');

  if (smokingCode === 1) addImpact('Smoking', 'Former', 2, 'smoking');
  else if (smokingCode === 2) addImpact('Smoking', 'Current', 6, 'smoking');
  else addImpact('Smoking', 'Never', 0, 'smoking');

  // Only 'western' and 'red_meat' score — 'mixed' scores 0
  if (dietPattern === 'western' || dietPattern === 'red_meat') addImpact('Diet pattern', String(dietPattern), 4, 'dietPattern');
  else addImpact('Diet pattern', String(dietPattern || 'N/A'), 0, 'dietPattern');

  addImpact('Black ancestry', isBlack ? 'Yes' : 'No', (isBlack && ageNum >= 40) ? 8 : 0);
  addImpact('Family history', familyHistory === 'unknown' ? 'Unknown' : fhBinary === 1 ? 'Yes' : 'No', fhBinary === 1 ? 10 : 0, 'familyHistory');

  const brcaPositive = brcaStatus === 'yes' || brcaStatus === 'positive';
  const brcaLabel = brcaPositive ? 'Reported' : brcaStatus === 'no' ? 'None reported' : 'Not tested / Unknown';
  addImpact('Genetic mutation', brcaLabel, brcaPositive ? 16 : 0, 'brcaStatus');
  addImpact(
    'Inflammation history',
    (inflammationHistory === 1 || inflammationHistory === 'yes') ? 'Yes' : 'No',
    (inflammationHistory === 1 || inflammationHistory === 'yes') ? 4 : 0,
    'inflammationHistory'
  );
  // Chemical exposure: support legacy ('yes'/'no'/'unknown') and expanded values
  //   - agent_orange / nine_eleven      -> strong epidemiologic evidence (4 pts)
  //   - other_chemical                  -> possible association          (2 pts)
  //   - yes (legacy)                    -> treat as positive exposure    (4 pts)
  //   - unknown                         -> partial credit                (2 pts)
  //   - none / no / null                -> no exposure                   (0 pts)
  const _ce = chemicalExposure;
  const _ceStrong = _ce === 'agent_orange' || _ce === 'nine_eleven' || _ce === 'yes';
  const _ceWeak = _ce === 'other_chemical' || _ce === 'unknown';
  const _ceLabel = _ce === 'agent_orange' ? 'Agent Orange'
    : _ce === 'nine_eleven' ? '9/11 / WTC site'
    : _ce === 'other_chemical' ? 'Other chemical'
    : _ce === 'yes' ? 'Yes'
    : _ce === 'unknown' ? 'Unknown'
    : 'No';
  addImpact('9/11 / Chemical exposure', _ceLabel, _ceStrong ? 4 : _ceWeak ? 2 : 0, 'chemicalExposure');
  addImpact('SHIM total', `${shimTotal}/25`, (shimTotal > 0 && shimTotal < 12) ? 8 : 0, 'shim');

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

  // Step 1.5 — Baseline PSA offered at ages 45–49 for average-risk people
  // (Statement 4, Conditional Recommendation, Evidence Level: Grade B)
  // Guard: only fire when the model is not CONFIDENTLY against PSA (recommendPSA !== false).
  // When recommendPSA === null (CI straddles threshold) or true (model agrees),
  // we apply the guideline baseline-offer reason, replacing 'score_threshold' so the
  // deviation banner does not fire for an age/guideline-backed recommendation.
  // When the model is confident (recommendPSA === false, tight CI below threshold),
  // the conditional Grade B guideline defers to the model finding.
  if (ageNum >= 45 && ageNum < 50 &&
      recommendPSA !== false &&
      psaRecommendReason !== 'high_risk_early_screening') {
    recommendPSA = true;
    psaRecommendReason = 'baseline_psa_45_50';
  }

  // Step 2 — AUA regular screening window: ages 50–69 every 2–4 years
  // (Statement 6, Strong Recommendation, Evidence Level: Grade A)
  // Also overrides 'score_threshold' so the deviation banner does not fire when
  // guidelines already support PSA at this age.
  if (ageNum >= 50 && ageNum <= 69) {
    recommendPSA = true;
    if (psaRecommendReason === null || psaRecommendReason === 'baseline_psa_45_50' || psaRecommendReason === 'score_threshold') {
      psaRecommendReason = 'age_guideline_50_69';
    }
  }

  // Step 3 — High-risk early screening (always wins over Steps 1-2)
  // (Statement 5, Strong Recommendation, Evidence Level: Grade B)
  if ((isBlack || brcaPositive) && ageNum >= 40 && ageNum < 50) {
    recommendPSA = true;
    psaRecommendReason = 'high_risk_early_screening';
  }
  if ((isBlack || brcaPositive) && ageNum >= 50) {
    recommendPSA = true;
    if (['score_threshold', 'age_guideline_50_69', 'baseline_psa_45_50', null].includes(psaRecommendReason)) {
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

  // Step 5 — Older shared decision (ages 70-75)
  // AUA/SUO 2026 Statement 8 + NCCN Early Detection v1.2024 + EAU 2024:
  // Routine PSA screening above age 70 is an individualized shared decision
  // based on overall health and life expectancy. Above 75 is handled separately
  // by the `aboveMaxScreeningAge` flag.
  if (ageNum >= 70 && ageNum <= 75 && psaRecommendReason === null) {
    psaRecommendReason = 'older_shared_decision';
  }

  // Step 6 — Symptomatic out-of-guideline (moderate-to-severe LUTS outside
  // the standard 50-69 PSA screening window).
  // AUA/SUO BPH/LUTS guidelines define IPSS >= 8 as moderate, warranting
  // urological evaluation regardless of PSA screening age. This is a
  // referral signal — not a PSA screening recommendation per se.
  if (
    psaRecommendReason === null &&
    Number.isFinite(ipssTotal) && ipssTotal >= 8 &&
    (ageNum < 50 || ageNum > 75)
  ) {
    psaRecommendReason = 'symptomatic_out_of_guideline';
  }

  // Step 7 — Low-risk follow-up (informational, NOT a screening recommendation)
  // AUA/SUO 2026 routine re-assessment guidance: low-risk asymptomatic men
  // aged 40-44 with no high-risk anchors (Black ancestry, hereditary mutation,
  // first-degree family history) may continue routine primary care and
  // re-evaluate in 1-2 years. `recommendPSA` remains false (Step 1 default).
  if (
    psaRecommendReason === null &&
    ageNum >= 40 && ageNum < 45 &&
    rawScore <= 10 &&
    !isBlack && !brcaPositive && fhBinary !== 1
  ) {
    psaRecommendReason = 'low_risk_followup';
  }

  const PSA_RECOMMEND_MESSAGES = {
    score_threshold:
      'Your ePSA score exceeds the model\'s screening threshold. Based on the ePSA predictive model you are a candidate for PSA testing. This is an ePSA model finding (not an AUA/NCCN/EAU/ERSPC guideline recommendation). Please speak with your physician to discuss whether PSA testing is appropriate for you.',
    baseline_psa_45_50:
      'Multi-guideline support for baseline PSA at age 45–50: AUA/SUO 2026 (Conditional, Grade B), NCCN Early Detection v1.2024, EAU 2024, and ERSPC all support offering a baseline PSA in this age window for shared decision-making. A baseline PSA establishes a reference value for future comparisons. Discuss with your physician whether baseline testing is appropriate for you.',
    age_guideline_50_69:
      'Multi-guideline support for screening ages 50–69: AUA/SUO 2026 (Strong, Grade A; every 2–4 years), NCCN Early Detection v1.2024 (every 1–4 years), EAU 2024 (risk-adapted), and ERSPC (every 2–4 years). Please speak with your doctor about whether PSA testing is right for you.',
    high_risk_early_screening:
      'Due to your high-risk profile (Black ancestry or a germline mutation such as BRCA1/2, ATM, or Lynch Syndrome), multiple guidelines (AUA/SUO 2026, NCCN v1.2024, EAU 2024) recommend discussing PSA screening beginning at age 40–45 (Strong; Grade B). Please speak with your physician.',
    family_history_override:
      'Due to your strong family history of prostate cancer, multiple guidelines (AUA/SUO 2026, NCCN v1.2024, EAU 2024) recommend discussing PSA screening beginning at age 40–45 (Strong; Grade B). Please speak with your physician.',
    low_risk_followup:
      'Per AUA/SUO 2026 routine re-assessment guidance, low-risk asymptomatic men aged 40–44 with no high-risk anchors (Black ancestry, hereditary mutation, first-degree family history) may continue routine primary care without PSA screening and re-evaluate in 1–2 years. Informational — not a guideline screening recommendation. Discuss with your physician.',
    symptomatic_out_of_guideline:
      'Your urinary symptom score (IPSS ≥ 8) is in the moderate-to-severe range. Although you are outside the standard PSA screening age window (50–69), AUA/SUO BPH/LUTS guidelines recommend urological evaluation for moderate IPSS regardless of screening age. Please consult your physician or urologist.',
    older_shared_decision:
      'AUA/SUO 2026 (Statement 8) recommends individualized shared decision-making for PSA screening at ages 70–74, based on overall health and life expectancy. NCCN Early Detection v1.2024 and EAU 2024 align. Discuss with your physician whether continued screening is appropriate for you.'
  };

  const psaRecommendMessage = psaRecommendReason ? PSA_RECOMMEND_MESSAGES[psaRecommendReason] : null;

  // ---------------------------------------------------------------------------
  // Guideline support matrix — which of the four major guidelines support
  // each recommendation reason. `score_threshold` is an ePSA-model finding
  // and is explicitly NOT a guideline recommendation (0/4).
  // ---------------------------------------------------------------------------
  const PSA_GUIDELINE_SUPPORT = {
    score_threshold:              { aua: false, nccn: false, eau: false, erspc: false },
    baseline_psa_45_50:           { aua: true,  nccn: true,  eau: true,  erspc: true  },
    age_guideline_50_69:          { aua: true,  nccn: true,  eau: true,  erspc: true  },
    high_risk_early_screening:    { aua: true,  nccn: true,  eau: true,  erspc: false },
    family_history_override:      { aua: true,  nccn: true,  eau: true,  erspc: false },
    low_risk_followup:            { aua: true,  nccn: false, eau: false, erspc: false },
    symptomatic_out_of_guideline: { aua: false, nccn: false, eau: false, erspc: false },
    older_shared_decision:        { aua: true,  nccn: true,  eau: true,  erspc: false }
  };
  const psaGuidelineSupport = psaRecommendReason
    ? (PSA_GUIDELINE_SUPPORT[psaRecommendReason] || null)
    : (recommendPSA === false
        ? { aua: true, nccn: true, eau: true, erspc: true }
        : null);
  const psaGuidelineSupportCount = psaGuidelineSupport
    ? Object.values(psaGuidelineSupport).filter(Boolean).length
    : null;

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

  // Reason-keyed action text — each key maps to the specific clinical context
  // so the UI can display an accurate, guideline-attributed call-to-action.
  const PSA_ACTION_MESSAGES = {
    score_threshold:
      'ePSA model threshold met — discuss PSA testing with your physician.\n' +
      'This is an ePSA model finding; guideline screening eligibility depends on your age and risk profile.',
    baseline_psa_45_50:
      'AUA/NCCN recommend offering a baseline PSA at ages 45–49.\n' +
      'Discuss whether baseline testing is appropriate with your physician (AUA/SUO 2026 Statement 4 — Conditional, Grade B).',
    age_guideline_50_69:
      'AUA/NCCN recommend PSA screening every 2–4 years for ages 50–69.\n' +
      'Strong guideline recommendation — discuss timing and interval with your physician (AUA/SUO 2026 Statement 6 — Grade A).',
    high_risk_early_screening:
      'Due to your high-risk profile, AUA/NCCN recommend discussing PSA screening from age 40–45.\n' +
      'Discuss PSA testing with your physician (AUA/SUO 2026 Statement 5 — Strong, Grade B).',
    family_history_override:
      'Due to your family history of prostate cancer, AUA/NCCN recommend discussing PSA screening from age 40–45.\n' +
      'Discuss PSA testing with your physician (AUA/SUO 2026 Statement 5 — Strong, Grade B).',
    older_shared_decision:
      'Shared Decision-Making (SDM) is recommended for PSA screening at ages 70–74.\n' +
      'Discuss your overall health, life expectancy, and personal preferences with your physician (AUA/SUO 2026 Statement 8).',
    symptomatic_out_of_guideline:
      'Your urinary symptoms (IPSS ≥ 8) suggest urological evaluation is warranted.\n' +
      'This is a symptom-based referral signal, not a routine PSA screening recommendation — discuss with your physician.',
    low_risk_followup:
      'Low ePSA score with no high-risk factors — routine primary care applies.\n' +
      'Re-assess in 1–2 years per AUA/SUO 2026 guidance (no screening recommendation at this time).',
  };

  let risk, color, action, scoreRange;
  if (recommendPSA === true) {
    risk = 'PSA_RECOMMENDED'; color = '#D4AF37';
    scoreRange = `>= ${(recommendThreshold * 100).toFixed(0)}%`;
    action = PSA_ACTION_MESSAGES[psaRecommendReason] ?? 'Discuss PSA testing with your physician.';
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
      key: 'low', label: 'Low — Routine Screening', scoreRange: 'score 0-10', normalizedRange: '<= 12.5%',
      guideline: 'Your ePSA score is in the low range. The model indicates a low likelihood of an abnormal PSA result. Routine screening timeline applies. Discuss with your physician.',
      // Empirical: 7% csPCa rate [1%-31%] N=14
      empiricalRate: EPSA_TIER_CALIBRATION.low
    },
    {
      key: 'intermediate', label: 'Intermediate — Consider PSA Discussion', scoreRange: 'score 11-17', normalizedRange: '13.75%-21.25%',
      guideline: 'Your ePSA score is in the intermediate range. Based on this model score, PSA testing may be appropriate — this is an ePSA model-based finding, not an AUA/NCCN/EAU/ERSPC guideline recommendation. Speak with your physician.',
      empiricalRate: EPSA_TIER_CALIBRATION.intermediate
    },
    {
      key: 'elevated', label: 'Strong Candidate for PSA Testing', scoreRange: 'score >= 18', normalizedRange: '>= 22.5%',
      guideline: 'Your ePSA score suggests an elevated likelihood of an abnormal PSA test. Based on this model score, PSA testing is strongly suggested — this is an ePSA model-based finding, not an AUA/NCCN/EAU/ERSPC guideline recommendation. Please speak with your physician promptly.',
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
  // Empirical probability display — return data fields only.
  // UI renders the sentence via i18n (`part1Results.empiricalProbabilityText`)
  // so it translates correctly across locales.
  // ---------------------------------------------------------------------------
  const cal = epsaTierDef.empiricalRate;
  const empiricalProbabilityText = null; // deprecated — kept for callers that null-check; UI builds string via i18n

  const guardrailAlerts = checkGuardrails({
    psa: null,
    pirads: null,
    age: ageNum,
    highRiskFeatures: hasHighRiskAnchor,
  }, formData.pathwayMode || 'pre_psa');

  return {
    // Provenance — used by the results meta-bar for audit/citation
    computedAt: new Date().toISOString(),
    engineVersion: '1.0.0',
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
    psaGuidelineSupport,
    psaGuidelineSupportCount,

    // Legacy tier fields
    tierRisk,
    tierColor,
    tierScoreRange,

    // 3-tier classification
    epsaTierIndex,
    epsaTierKey: epsaTierDef.key,
    epsaTierLabel: (epsaTierIndex === 2 && isHighRiskFlagged)
      ? 'Strong candidate for PSA testing'
      : epsaTierDef.label,
    epsaTierScoreRange: epsaTierDef.scoreRange,
    epsaTierNormalizedRange: epsaTierDef.normalizedRange,
    epsaTierBoundaries: { lowMax: 10, intermediateMax: 17, maxScore: MAX_POINTS },

    // Empirical calibration
    empiricalProbabilityText,
    empiricalRate: cal?.rate ?? null,
    empiricalRateCiLo: cal?.ci_lo ?? null,
    empiricalRateCiHi: cal?.ci_hi ?? null,
    empiricalRateN: cal?.n ?? null,
    empiricalRateEvents: cal?.events ?? null,

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

    // Age eligibility
    belowMinAge: ageNum < 40,
    aboveMaxScreeningAge: ageNum > 75,

    // Guardrails
    guardrailAlerts,

    // Metadata
    epsaGuidelineText: epsaTierDef.guideline,
    modelVersion: config.version,
    displayRange: `${rangeLow}%-${rangeHigh}%`,
    pathwayMode: formData.pathwayMode || 'pre_psa',
    calculationDetails: { probability, rawScore, maxScore: MAX_POINTS },
    skippedFields: Array.from(_skippedFields),
  };
};

// =============================================================================
// MODELS 2 & 3 — post_psa / post_mri
// =============================================================================
// Defense-in-depth: clamp/reject pathological numeric inputs reaching the
// engine from cloud-restore, JSON import, or upstream UI bugs. Form-level
// validation handles the typical-typo case; this catches the rest so the
// engine never produces a wild output from a wild input.
const sanitizePostInput = (value, { min, max, allowNull = true } = {}) => {
  if (value === '' || value === null || value === undefined) return allowNull ? null : NaN;
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  if (min != null && n < min) return NaN;
  if (max != null && n > max) return NaN;
  return n;
};

export const calculateDynamicEPsaPost = (preResult, postData, customConfig = null) => {
  const config = customConfig || DEFAULT_CALCULATOR_CONFIG;
  const { piradsLesions, knowPirads } = postData || {};
  // Range-clamp numeric inputs. PSA = 0–1000 ng/mL (anything >1000 is a typo
  // or unit-mistake; engine separately fires PSA>100 guardrail). PI-RADS is
  // strictly 1–5. Prostate volume 5–500 mL (validated range for PSAD).
  const psa = sanitizePostInput(postData?.psa, { min: 0, max: 1000 });
  const pirads = sanitizePostInput(postData?.pirads, { min: 1, max: 5 });
  const prostateVolumeValRaw = sanitizePostInput(postData?.prostateVolume, { min: 5, max: 500 });

  const preScorePct = Number(preResult?.score) || 0;
  let baseRawScore = preResult?.calculationDetails?.rawScore;
  let baseMaxScore = preResult?.calculationDetails?.maxScore;

  if (!Number.isFinite(baseRawScore)) {
    baseMaxScore = 80;
    baseRawScore = Math.round((preScorePct / 100) * baseMaxScore);
  }

  // PSA scoring
  const psaVal = psa === '' || psa === null || psa === undefined ? null : Number(psa);

  // ---------------------------------------------------------------------------
  // 5-ARI PSA Correction — AUA/SUO 2026 Guideline + REDUCE Trial
  //
  // Finasteride and dutasteride suppress PSA by ~50% after ≥6 months of use.
  // The established clinical correction is to multiply the reported PSA by 2
  // before applying any screening threshold (REDUCE trial; AUA/SUO 2026 §5-ARI).
  //
  // Limitation: The 2026 AUA/SUO guideline acknowledges individual variability —
  // only ~1/3 of patients achieve a 40–60% decline at 1 year. A ×2 correction
  // is the standard clinical default but may over- or under-correct in some
  // patients. A UI warning is surfaced to inform the user of this limitation.
  //
  // "Other" hormonal therapy: no validated correction factor exists in guidelines;
  // we flag but do not numerically adjust, consistent with AUA practice guidance.
  // ---------------------------------------------------------------------------
  const onHormonalTherapy = postData?.onHormonalTherapy === true;
  const hormonalTherapyType = postData?.hormonalTherapyType || '';
  const is5ARI = onHormonalTherapy && (hormonalTherapyType === 'finasteride' || hormonalTherapyType === 'dutasteride');
  const isOtherHormonal = onHormonalTherapy && !is5ARI;

  let psaAdjusted = psaVal;
  let psaAdjustedFlag = false;
  if (psaVal != null && !Number.isNaN(psaVal) && is5ARI) {
    psaAdjusted = psaVal * 2;
    psaAdjustedFlag = true;
  }

  let psaPoints = 0;
  if (psaAdjusted != null && !Number.isNaN(psaAdjusted)) {
    if (psaAdjusted < 1.0) psaPoints = 0;
    else if (psaAdjusted < 3.0) psaPoints = 10;
    else if (psaAdjusted < 10.0) psaPoints = 25;
    else psaPoints = 45;
  }

  // PI-RADS scoring (Model 3 only)
  // Multi-lesion support: if `piradsLesions` array provided, take the highest score
  // (worst-lesion drives clinical decision-making, per AUA/EAU and ESUR PI-RADS v2.1).
  // Fallback to legacy single `pirads` field if no array supplied.
  const _piradsCandidates = Array.isArray(piradsLesions)
    ? piradsLesions
        .map(v => (v === '' || v === null || v === undefined ? null : Number(v)))
        .filter(v => v != null && !Number.isNaN(v) && v > 0)
    : [];
  const _piradsFromArray = _piradsCandidates.length > 0 ? Math.max(..._piradsCandidates) : null;
  const _piradsFromSingle = (pirads === '' || pirads === null || pirads === undefined) ? null : Number(pirads);
  const piradsVal = knowPirads
    ? (_piradsFromArray != null ? _piradsFromArray : _piradsFromSingle)
    : null;
  let piradsPoints = 0;
  let piradsOverridden = false;
  if (piradsVal != null && !Number.isNaN(piradsVal)) {
    if (piradsVal === 3) piradsPoints = 15;
    else if (piradsVal === 4) piradsPoints = 30;
    else if (piradsVal === 5) { piradsPoints = 45; piradsOverridden = true; }
  }

  const highGradeRisk = (piradsVal != null && psaAdjusted != null)
    ? calcHighGradeRisk(piradsVal, psaAdjusted)
    : null;

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
        direction: 'epsa_higher',
        severity,
        text: `Your ePSA risk profile (${tierDef.label}) is higher than what your PSA level alone (${psaVal} ng/mL, ${psaTierLabel}) would suggest. Your individual risk factors — such as race, family history, or genetic markers — may place you at elevated risk that PSA alone underestimates. Discuss this with your physician before concluding your PSA result is reassuring.`
      };
    } else if (diff < 0) {
      // PSA is higher than ePSA combined tier — patient should not be falsely reassured
      discordanceFlag = {
        direction: 'psa_higher',
        severity: 'yellow',
        text: `Your PSA level (${psaVal} ng/mL, ${psaTierLabel}) is in a higher range than your combined ePSA tier (${tierDef.label}) alone suggests. A PSA in this range warrants follow-up with your physician regardless of your overall ePSA profile. Do not rely on the combined tier alone — your PSA result is an independent signal that should be discussed with your doctor.`
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
  // Return data only — UI renders via i18n
  // (`part2Results.empiricalProbabilityText`). For the `low` combined tier,
  // rate is null (no cases in the biopsied referral cohort) and the UI hides
  // the line entirely — this is correct behavior, not a tier mismatch.
  // ---------------------------------------------------------------------------
  const cal = tierDef.empiricalRate;
  const empiricalProbabilityText = null; // deprecated — UI builds via i18n
  const empiricalNote = cal?.note ?? null;

  // ---------------------------------------------------------------------------
  // Biopsy / urology referral recommendation
  //
  // AUA/SUO 2026 Guideline: urology referral and biopsy discussion are
  // recommended for patients with elevated combined risk profiles regardless
  // of whether MRI was performed. An elevated PSA in the context of a high
  // ePSA risk score warrants the same shared decision-making conversation.
  //
  // PI-RADS 5 override: AUA/NCCN/EAU uniformly recommend biopsy discussion
  // for PI-RADS 5 findings without delay.
  //
  // High discordance: when ePSA profile significantly exceeds what PSA alone
  // suggests, referral is warranted regardless of MRI status.
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
    biopsyMessage = 'Your combined risk profile is high. AUA/NCCN/EAU 2026 guidelines recommend discussing biopsy with a urologist. Do not delay this conversation.';
  } else if (discordanceFlag && discordanceFlag.severity === 'orange' && tierIndex >= 2) {
    biopsyRecommended = true;
    biopsyReason = 'high_risk_discordance';
    biopsyMessage = 'Your ePSA risk profile is significantly higher than your PSA level alone suggests. Combined with your other risk factors, urologist review and biopsy discussion are recommended per AUA/SUO 2026 guidelines.';
  }

  // ---------------------------------------------------------------------------
  // Guideline support matrix — which guidelines back each biopsy reason.
  // ERSPC focuses on screening intervals, not biopsy triggers, so it is
  // conservatively marked false for biopsy-decision rows.
  // ---------------------------------------------------------------------------
  const BIOPSY_GUIDELINE_SUPPORT = {
    pirads_5:                { aua: true,  nccn: true,  eau: true,  erspc: false },
    combined_score_high:     { aua: true,  nccn: true,  eau: true,  erspc: false },
    high_risk_discordance:   { aua: true,  nccn: false, eau: false, erspc: false }
  };
  // Combined-tier guideline backing for the tier recommendation itself.
  const COMBINED_TIER_GUIDELINE_SUPPORT = {
    'low':               { aua: true, nccn: true, eau: true, erspc: true  },
    'intermediate-low':  { aua: true, nccn: true, eau: true, erspc: true  },
    'intermediate-high': { aua: true, nccn: true, eau: true, erspc: false },
    'high':              { aua: true, nccn: true, eau: true, erspc: false }
  };
  const biopsyGuidelineSupport = biopsyReason
    ? (BIOPSY_GUIDELINE_SUPPORT[biopsyReason] || null)
    : null;
  const biopsyGuidelineSupportCount = biopsyGuidelineSupport
    ? Object.values(biopsyGuidelineSupport).filter(Boolean).length
    : null;
  const tierGuidelineSupport = COMBINED_TIER_GUIDELINE_SUPPORT[tierDef.key] || null;
  const tierGuidelineSupportCount = tierGuidelineSupport
    ? Object.values(tierGuidelineSupport).filter(Boolean).length
    : null;

  const pathwayMode = postData?.pathwayMode || (knowPirads ? 'post_mri' : 'post_psa');

  // ---------------------------------------------------------------------------
  // MRI recommendation — for post_psa pathway (no MRI data entered yet)
  // AUA/NCCN/EAU 2026: mpMRI before biopsy is recommended when PSA or combined
  // risk warrants further evaluation.
  // ---------------------------------------------------------------------------
  let mriRecommended = false;
  let mriRecommendReason = null;
  let mriRecommendMessage = null;

  if (!knowPirads) {
    if (psaVal >= 4.0) {
      mriRecommended = true;
      mriRecommendReason = 'psa_elevated';
      mriRecommendMessage = 'Your PSA (≥ 4.0 ng/mL) warrants further evaluation. AUA/NCCN/EAU guidelines recommend an mpMRI before biopsy to characterize any suspicious lesion and reduce unnecessary biopsies.';
    } else if (tierIndex >= 2) {
      mriRecommended = true;
      mriRecommendReason = 'combined_risk_elevated';
      mriRecommendMessage = 'Your combined ePSA + PSA profile places you in an elevated risk tier. An mpMRI is recommended to better characterize risk before any biopsy decision, per AUA/NCCN/EAU guidelines.';
    } else if (hasHighRiskFeature && psaVal >= 2.5) {
      mriRecommended = true;
      mriRecommendReason = 'high_risk_profile';
      mriRecommendMessage = 'Given your high-risk profile (Black ancestry, family history, or genetic mutation), an mpMRI is recommended even at this PSA level per AUA/NCCN guidelines.';
    } else if (discordanceFlag && discordanceFlag.severity === 'orange') {
      mriRecommended = true;
      mriRecommendReason = 'discordance';
      mriRecommendMessage = 'Your ePSA profile is significantly higher than your PSA alone suggests. An mpMRI can help characterize your risk and is recommended per AUA/NCCN guidelines before biopsy.';
    }
  }

  const guardrailAlerts = checkGuardrails({
    psa: psaAdjusted,
    pirads: piradsVal,
    psad: psadValue,
    ggg: postData?.ggg,
    age: preResult?.age,
    highRiskFeatures: hasHighRiskFeature,
  }, pathwayMode);

  return {
    // Provenance — used by the results meta-bar for audit/citation
    computedAt: new Date().toISOString(),
    engineVersion: '1.0.0',
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
    psaAdjusted,
    psaAdjustedFlag,
    isOtherHormonal,

    // High-grade risk (Model 3 logistic regression)
    highGradeRisk,

    // MRI recommendation (post_psa pathway)
    mriRecommended,
    mriRecommendReason,
    mriRecommendMessage,

    // Biopsy (Model 3)
    biopsyRecommended,
    biopsyReason,
    biopsyMessage,
    biopsyGuidelineSupport,
    biopsyGuidelineSupportCount,
    tierGuidelineSupport,
    tierGuidelineSupportCount,

    // Confidence
    piradsConfidenceText,
    empiricalProbabilityText,
    empiricalRate: cal?.rate ?? null,
    empiricalRateN: cal?.n ?? null,
    empiricalRateEvents: cal?.events ?? null,
    empiricalNote,

    // Guardrails
    guardrailAlerts,

    // Metadata
    pathwayMode,
    modelVersion: config.version
  };
};

// =============================================================================
// MODEL 4 — calculateActiveSurveillance — MOVED TO AS TOOL
// This function has been extracted to the standalone AI Surveillance Tool repo.
// See: as.millionstrongmen.com
// =============================================================================
// Kept as a stub so any lingering references surface clearly at runtime.
export const calculateActiveSurveillance = () => {
  console.error('calculateActiveSurveillance has moved to the standalone AI Surveillance Tool repo.');
  return null;
};
