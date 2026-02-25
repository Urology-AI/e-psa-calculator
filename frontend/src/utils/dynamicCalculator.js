/**
 * Dynamic ePSA Calculator
 * Reads configuration from calculatorConfig.js
 * Allows real-time model adjustments without code changes
 * Current ePSA calculator is the default configuration
 */

import { DEFAULT_CALCULATOR_CONFIG } from '../config/calculatorConfig';

// Get current config (from localStorage or default)
export const getCalculatorConfig = () => {
  try {
    const stored = localStorage.getItem('epsa_calculator_config');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading calculator config:', error);
  }
  return DEFAULT_CALCULATOR_CONFIG;
};

// Save config to localStorage (and Firebase in production)
export const saveCalculatorConfig = async (config) => {
  try {
    localStorage.setItem('epsa_calculator_config', JSON.stringify(config));
    
    // Store version history
    const versions = JSON.parse(localStorage.getItem('epsa_config_versions') || '[]');
    versions.push({
      version: config.version,
      timestamp: new Date().toISOString(),
      config: JSON.parse(JSON.stringify(config))
    });
    localStorage.setItem('epsa_config_versions', JSON.stringify(versions.slice(-20))); // Keep last 20
    
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
};

// Get version history for rollback
export const getConfigVersions = () => {
  try {
    return JSON.parse(localStorage.getItem('epsa_config_versions') || '[]');
  } catch (error) {
    return [];
  }
};

// Rollback to specific version
export const rollbackToVersion = (versionTimestamp) => {
  const versions = getConfigVersions();
  const targetVersion = versions.find(v => v.timestamp === versionTimestamp);
  
  if (targetVersion) {
    saveCalculatorConfig(targetVersion.config);
    return targetVersion.config;
  }
  return null;
};

// Dynamic Part 1 Calculator
export const calculateDynamicEPsa = (formData, customConfig = null) => {
  const config = customConfig || getCalculatorConfig();
  const { part1 } = config;
  
  // Extract variables from formData
  const {
    age,
    race,
    bmi,
    ipss,
    shim,
    exercise,
    familyHistory
  } = formData;
  
  // Validation
  if (!age || !bmi || !race || !ipss || !shim || exercise === undefined || familyHistory === undefined) {
    console.warn('Missing required fields for calculation');
    return null;
  }
  
  // Encode variables based on configuration
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
  
  // Calculate logit using dynamic weights
  let logit = part1.intercept;
  
  part1.variables.forEach(variable => {
    const value = variableValues[variable.id] || 0;
    logit += variable.weight * value;
  });
  
  // Calculate probability
  const probability = 1 / (1 + Math.exp(-logit));
  const scorePercent = Math.round(probability * 100);
  
  // Calculate confidence range
  const rangeLow = Math.max(0, Math.min(100, scorePercent - 10));
  const rangeHigh = Math.max(0, Math.min(100, scorePercent + 10));
  
  // Determine risk category based on config cutoffs
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

// Dynamic Part 2 Calculator
export const calculateDynamicEPsaPost = (preResult, postData, customConfig = null) => {
  const config = customConfig || getCalculatorConfig();
  const { part2 } = config;
  
  const {
    psa,
    pirads,
    knowPirads
  } = postData;
  
  // Get pre-score points
  const preScore = preResult?.score || 0;
  let prePoints = 0;
  
  // Use configured ranges
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
  
  // PSA points from config
  const psaValue = parseFloat(psa) || 0;
  let psaPoints = 0;
  for (const range of part2.psaPoints) {
    if (psaValue <= range.max) {
      psaPoints = range.points;
      break;
    }
  }
  
  // PIRADS handling
  const piradsValue = knowPirads ? parseInt(pirads) : 0;
  let riskPct, riskCat, riskClass, nextSteps, piradsOverridden = false;
  
  // Check PIRADS overrides from config
  if (knowPirads && part2.piradsOverrides[piradsValue]) {
    const override = part2.piradsOverrides[piradsValue];
    riskPct = override.riskPct;
    riskCat = override.riskCat;
    riskClass = override.riskClass;
    nextSteps = [];
    piradsOverridden = true;
  }
  
  // If no override, calculate based on points
  if (!piradsOverridden) {
    // PIRADS points from config
    let piradsPoints = 0;
    for (const p of part2.piradsPoints) {
      if (piradsValue === p.value) {
        piradsPoints = p.points;
        break;
      }
    }
    
    const totalPoints = prePoints + part2.baselineCarryPoints + psaPoints + piradsPoints;
    
    // Use configured risk categories
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

// A/B Testing: Get model variant for user
export const getModelVariant = (userId, availableVariants = ['control', 'variant_a', 'variant_b']) => {
  // Deterministic assignment based on userId
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = hash % availableVariants.length;
  return availableVariants[index];
};

// Get config for A/B variant
export const getVariantConfig = (variant) => {
  const baseConfig = getCalculatorConfig();
  
  switch (variant) {
    case 'variant_a':
      // More aggressive detection
      return {
        ...baseConfig,
        version: `${baseConfig.version}-aggressive`,
        part1: {
          ...baseConfig.part1,
          riskCutoffs: {
            ...baseConfig.part1.riskCutoffs,
            lower: { ...baseConfig.part1.riskCutoffs.lower, threshold: 0.05 },
            moderate: { ...baseConfig.part1.riskCutoffs.moderate, threshold: 0.15 }
          }
        }
      };
    case 'variant_b':
      // More conservative
      return {
        ...baseConfig,
        version: `${baseConfig.version}-conservative`,
        part1: {
          ...baseConfig.part1,
          riskCutoffs: {
            ...baseConfig.part1.riskCutoffs,
            lower: { ...baseConfig.part1.riskCutoffs.lower, threshold: 0.12 },
            moderate: { ...baseConfig.part1.riskCutoffs.moderate, threshold: 0.25 }
          }
        }
      };
    default:
      return baseConfig;
  }
};

// Export functions
export default {
  getCalculatorConfig,
  saveCalculatorConfig,
  getConfigVersions,
  rollbackToVersion,
  calculateDynamicEPsa,
  calculateDynamicEPsaPost,
  getModelVariant,
  getVariantConfig
};
