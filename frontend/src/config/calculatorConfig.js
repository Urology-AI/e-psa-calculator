/**
 * Calculator Configuration System
 * Allows dynamic adjustment of ePSA model weights
 * Stores configuration in Firebase for easy updates
 */

export const DEFAULT_CALCULATOR_CONFIG = {
  version: '1.0.1',
  part1: {
    modelType: 'binned_v1',
    intercept: 0.603314,
    recommendThreshold: 0.647173,
    encodings: {
      raceBlackValues: ['black', 'black or african american', 'african american', 'black/aa'],
      ageBins: [
        { min: 40, max: 49, label: '40-49' },
        { min: 50, max: 59, label: '50-59' },
        { min: 60, max: 69, label: '60-69' },
        { min: 70, max: 120, label: '70+' }
      ],
      bmiBins: [
        { min: 0, max: 24.999, label: '<25' },
        { min: 25, max: 29.999, label: '25-29.9' },
        { min: 30, max: 200, label: '>=30' }
      ],
      ipssSeverity: [
        { min: 0, max: 7, label: 'mild' },
        { min: 8, max: 19, label: 'moderate' },
        { min: 20, max: 35, label: 'severe' }
      ]
    },
    variables: [
      { id: 'age_50_59', name: 'age_50_59', weight: 0.459708, type: 'binary' },
      { id: 'age_60_69', name: 'age_60_69', weight: -0.075899, type: 'binary' },
      { id: 'age_70_plus', name: 'age_70_plus', weight: 0.086897, type: 'binary' },
      { id: 'bmi_25_29_9', name: 'bmi_25_29_9', weight: 0.961006, type: 'binary' },
      { id: 'bmi_ge_30', name: 'bmi_ge_30', weight: 0.504846, type: 'binary' },
      { id: 'ipss_moderate', name: 'ipss_moderate', weight: -0.621578, type: 'binary' },
      { id: 'ipss_severe', name: 'ipss_severe', weight: -0.132488, type: 'binary' },
      { id: 'exercise_some', name: 'exercise_some', weight: 0.018431, type: 'binary' },
      { id: 'exercise_none', name: 'exercise_none', weight: 0.330688, type: 'binary' },
      { id: 'raceBlack', name: 'raceBlack', weight: 0.370744, type: 'binary' },
      { id: 'fhBinary', name: 'fhBinary', weight: 0.603314, type: 'binary' },
      { id: 'age60plus_x_ipss_moderate', name: 'age60plus_x_ipss_moderate', weight: -0.176698, type: 'binary' },
      { id: 'age60plus_x_ipss_severe', name: 'age60plus_x_ipss_severe', weight: -0.207412, type: 'binary' }
    ],
    riskCutoffs: {
      lower: { threshold: 0.08, label: 'Below 8%', color: '#27AE60' },
      moderate: { threshold: 0.20, label: '8% – 20%', color: '#D4AF37' },
      higher: { threshold: 1.0, label: 'Above 20%', color: '#C0392B' }
    }
  },
  part2: {
    baselineCarryPoints: 15,
    preScoreToPoints: {
      ranges: [
        { max: 21, multiplier: 40, divisor: 21 },      // 0-40 pts
        { max: 31, base: 40, multiplier: 40, divisor: 10 },  // 41-80 pts
        { max: 41, base: 80, multiplier: 40, divisor: 10 },  // 81-120 pts
        { max: 100, base: 120, multiplier: 80, divisor: 59 }   // >120 pts
      ]
    },
    psaPoints: [
      { max: 1, points: 0 },
      { max: 2.5, points: 5 },
      { max: 4, points: 10 },
      { max: 10, points: 20 },
      { max: Infinity, points: 40 }
    ],
    piradsPoints: [
      { value: 2, points: 0 },
      { value: 3, points: 10 }
    ],
    piradsOverrides: {
      4: { riskPct: '52% (43–61%)', riskCat: '🟠 Very High-Risk', riskClass: 'very-high-risk' },
      5: { riskPct: '89% (76–97%)', riskCat: '🔴 Very High-Risk', riskClass: 'very-high-risk' }
    },
    riskCategories: [
      { maxPoints: 40, riskPct: '0–10%', riskCat: '🟢 Low', riskClass: 'low-risk' },
      { maxPoints: 80, riskPct: '10–20%', riskCat: '🟡 Moderate', riskClass: 'moderate-risk' },
      { maxPoints: 120, riskPct: '20–40%', riskCat: '🟠 High', riskClass: 'high-risk' },
      { maxPoints: Infinity, riskPct: '40–70%', riskCat: '🔴 Very High', riskClass: 'very-high-risk' }
    ]
  },
  validation: {
    minAge: 18,
    maxAge: 120,
    minBMI: 15,
    maxBMI: 60,
    minPSA: 0,
    maxPSA: 1000
  }
};

export const ALTERNATIVE_MODELS = {
  'conservative': {
    name: 'Conservative Model',
    description: 'Lower weights for screening hesitancy',
    part1: {
      intercept: -4.5,
      variables: [
        { id: 'age', weight: 0.04 },
        { id: 'raceBlack', weight: 0.02 },
        { id: 'bmi', weight: 0.015 },
        { id: 'ipssTotal', weight: 0.02 },
        { id: 'exerciseCode', weight: 0.5 },
        { id: 'fhBinary', weight: 0.7 },
        { id: 'shimTotal', weight: 0.03 }
      ]
    }
  },
  'aggressive': {
    name: 'Aggressive Detection Model',
    description: 'Higher sensitivity for early detection',
    part1: {
      intercept: -3.2,
      variables: [
        { id: 'age', weight: 0.05 },
        { id: 'raceBlack', weight: 0.035 },
        { id: 'bmi', weight: 0.025 },
        { id: 'ipssTotal', weight: 0.035 },
        { id: 'exerciseCode', weight: 0.65 },
        { id: 'fhBinary', weight: 1.0 },
        { id: 'shimTotal', weight: 0.04 }
      ]
    }
  }
};

export const COHORT_ANALYSIS_FIELDS = [
  'patientId',
  'age',
  'race',
  'bmi',
  'familyHistory',
  'psaLevel',
  'biopsyResult',
  'cancerDetected',
  'gleasonScore',
  'tStage',
  'ipssTotal',
  'shimTotal',
  'exerciseLevel',
  'smokingStatus',
  'brcaStatus',
  'diabetes',
  'hypertension',
  'medications',
  'previousBiopsy',
  'mriFindings',
  'piradsScore'
];

export const WEIGHT_ADJUSTMENT_GUIDELINES = {
  minWeight: -2.0,
  maxWeight: 2.0,
  stepSize: 0.001,
  clinicalValidationRequired: true,
  minCohortSize: 100,
  recommendedVariables: [
    { id: 'age', recommendedRange: [0.03, 0.06] },
    { id: 'raceBlack', recommendedRange: [0.02, 0.05] },
    { id: 'bmi', recommendedRange: [0.01, 0.03] },
    { id: 'ipssTotal', recommendedRange: [-0.05, 0.05] },
    { id: 'exerciseCode', recommendedRange: [0.4, 0.8] },
    { id: 'fhBinary', recommendedRange: [0.6, 1.2] },
    { id: 'shimTotal', recommendedRange: [0.02, 0.05] }
  ]
};
