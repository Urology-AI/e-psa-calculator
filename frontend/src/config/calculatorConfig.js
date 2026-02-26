/**
 * Calculator Configuration System
 * Allows dynamic adjustment of ePSA model weights
 * Stores configuration in Firebase for easy updates
 */

export const DEFAULT_CALCULATOR_CONFIG = {
  version: '1.0.1',
  part1: {
    intercept: -1.44968,
    encodings: {
      raceBlackValues: ['black', 'black or african american', 'african american', 'black/aa']
    },
    variables: [
      {
        id: 'age',
        name: 'Age',
        weight: 0.03879,
        type: 'continuous',
        min: 18,
        max: 120,
        unit: 'years',
        description: 'Age in years (if only Age Group available, use midpoint)'
      },
      {
        id: 'raceBlack',
        name: 'Race (Black/African American)',
        weight: 0.0,
        type: 'binary',
        description: 'Black race (1 if Black/AA, 0 otherwise)',
        clinicalNote: 'Cohort-refit with non-negative constraint resulted in ~0 effect in this dataset'
      },
      {
        id: 'bmi',
        name: 'BMI',
        weight: 0.01455,
        type: 'continuous',
        min: 15,
        max: 60,
        unit: 'kg/m²',
        description: 'Body Mass Index'
      },
      {
        id: 'ipssTotal',
        name: 'IPSS Total Score',
        weight: -0.03683,
        type: 'continuous',
        min: 0,
        max: 35,
        unit: 'points',
        description: 'International Prostate Symptom Score (total 0–35)',
        clinicalNote: 'In this cohort, higher LUTS burden associated with lower csPCa likelihood (likely BPH signal)'
      },
      {
        id: 'exerciseCode',
        name: 'Exercise Level',
        weight: 0.0,
        type: 'ordinal',
        options: [
          { value: 0, label: 'Regular (3+ days/week)' },
          { value: 1, label: 'Some (1-2 days/week)' },
          { value: 2, label: 'None' }
        ],
        description: 'Exercise frequency',
        clinicalNote: 'Exercise_Score was constant in the cohort file used for refit; coefficient set to 0'
      },
      {
        id: 'fhBinary',
        name: 'Family History',
        weight: 0.0,
        type: 'binary',
        description: 'Family history of prostate cancer (1 if yes, 0 if no)',
        clinicalNote: 'Cohort-refit with non-negative constraint resulted in ~0 effect in this dataset'
      },
      {
        id: 'shimTotal',
        name: 'SHIM Total Score',
        weight: 0.0,
        type: 'continuous',
        min: 0,
        max: 25,
        unit: 'points',
        description: 'SHIM total (not present in refit cohort file; weight set to 0 until refit with SHIM data)'
      },
      {
        id: 'inflammationHx',
        name: 'History of Inflammatory Condition',
        weight: 0.0,
        type: 'binary',
        required: false,
        description: 'History of inflammatory condition (e.g., UC, Crohn’s, chronic prostatitis)'
      }
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
