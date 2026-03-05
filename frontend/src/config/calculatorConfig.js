/**
 * Calculator Configuration System
 * Allows dynamic adjustment of ePSA model weights
 * Stores configuration in Firebase for easy updates
 */

export const DEFAULT_CALCULATOR_CONFIG = {
  version: '1.0.1',
  part1: {
    modelType: 'binned_v1',
    // Part 1 now uses a point-based score (no logistic weights); intercept/calibration are unused.
    intercept: 0,
    recommendThreshold: 0.09,
    calibration: {
      slope: 1.0,
      interceptShift: 0.0
    },
    encodings: {
      raceBlackValues: ['black', 'african american', 'black or african american', 'black/aa', 'black/african american'],
      ageBins: [
        { min: 18, max: 49, label: '40-49' },
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
      { id: 'age_50_59',                 name: 'age_50_59',                 weight:  0.515273, type: 'binary' },
      { id: 'age_60_69',                 name: 'age_60_69',                 weight:  0.267338, type: 'binary' },
      { id: 'age_70_plus',               name: 'age_70_plus',               weight:  0.112174, type: 'binary' },
      { id: 'bmi_25_29_9',               name: 'bmi_25_29_9',               weight:  1.109121, type: 'binary' },
      { id: 'bmi_ge_30',                 name: 'bmi_ge_30',                 weight:  0.479419, type: 'binary' },
      { id: 'ipss_moderate',             name: 'ipss_moderate',             weight: -0.572095, type: 'binary' },
      { id: 'ipss_severe',               name: 'ipss_severe',               weight: -0.054009, type: 'binary' },
      { id: 'exercise_some',             name: 'exercise_some',             weight:  0.040351, type: 'binary' },
      { id: 'exercise_none',             name: 'exercise_none',             weight:  0.000000, type: 'binary' },
      { id: 'raceBlack',                 name: 'raceBlack',                 weight:  0.744867, type: 'binary' },
      { id: 'fhBinary',                  name: 'fhBinary',                  weight: -0.647446, type: 'binary' },
      { id: 'age60plus_x_ipss_moderate', name: 'age60plus_x_ipss_moderate', weight: -0.105186, type: 'binary' },
      { id: 'age60plus_x_ipss_severe',   name: 'age60plus_x_ipss_severe',   weight: -0.129447, type: 'binary' }
    ],
    riskCutoffs: {
      lower:    { threshold: 0.23, label: 'Below 23%', color: '#27AE60' },
      moderate: { threshold: 0.39, label: '23%–39%',   color: '#D4AF37' },
      higher:   { threshold: 1.0,  label: 'Above 39%', color: '#C0392B' }
    }
  },
  part2: {
    modelType: 'unified_logistic_v1',
    targetLabel: 'Higher-grade cancer risk (GG≥3)',
    calibration: { slope: 1.0, interceptShift: 0.0 },

    thresholds: { low: 0.2583, moderate: 0.2892, high: 0.2987 },

    models: {
      base: {
        intercept: -1.438927,
        variables: [
          { id: 'logPSA', weight: +0.188130, type: 'continuous' }
        ]
      },
      mri: {
        intercept: -1.429457,
        variables: [
          { id: 'logPSA',   weight: +0.095942, type: 'continuous' },
          { id: 'pirads_3', weight: -1.050051, type: 'binary' },
          { id: 'pirads_4', weight: +0.368169, type: 'binary' },
          { id: 'pirads_5', weight: +0.367806, type: 'binary' }
        ]
      }
    }
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
