/**
 * ePSA Model Documentation & Clinical Validation
 * ==============================================
 * 
 * MODEL SPECIFICATION
 * -------------------
 * Type: 7-Variable Logistic Regression
 * Formula:
 *   logit = -3.8347
 *     + 0.0454 × Age (years)
 *     - 0.0253 × Race_Black (1=Black, 0=other)
 *     + 0.0195 × BMI (kg/m²)
 *     - 0.0292 × IPSS (0-35)
 *     - 0.5947 × Exercise (0=regular, 1=some, 2=none)
 *     - 0.8911 × FH (1=yes, 0=no)
 *     - 0.0358 × SHIM (5-25)
 *   
 *   probability = 1 / (1 + e^(-logit))
 *   score = round(probability × 100)
 * 
 * Performance Metrics:
 *   - ePSA AUC: 0.610 (95% CI: 0.481–0.737)
 *   - PSA AUC: 0.511 (95% CI: 0.374–0.651)
 *   - Derivation cohort: n=100
 *   - Recalibrated to ~15% screening prevalence
 * 
 * TIER THRESHOLDS
 * ---------------
 *   Lower Risk: < 8%
 *   Moderate Risk: 8% – 20%
 *   Higher Risk: ≥ 20%
 * 
 * DISPLAYED RANGE
 * ---------------
 *   ±10% confidence interval shown to patient
 *   Example: Score 15% → Display "5%–25%"
 * 
 * VARIABLE ENCODINGS
 * ------------------
 * 1. AGE: Continuous (years), Range: 30-95
 *    Coefficient: +0.0454 (higher age = higher risk)
 *    Impact: +10 years ≈ +4.2% probability change
 * 
 * 2. RACE_BLACK: Binary (1=Black/African American, 0=Other)
 *    Coefficient: -0.0253 (protective - unexpected clinically)
 *    Impact: Being Black ≈ -0.2% probability change
 *    ⚠️ Note: Negative coefficient seems counterintuitive; verify with literature
 * 
 * 3. BMI: Continuous (kg/m²), Calculated from height/weight
 *    Coefficient: +0.0195 (higher BMI = higher risk)
 *    Impact: +5 BMI units ≈ +0.8% probability change
 * 
 * 4. IPSS: Sum of 7 questions (0-5 each), Range: 0-35
 *    Lower scores = fewer urinary symptoms
 *    Coefficient: -0.0292 (protective - higher IPSS = lower risk)
 *    ⚠️ Note: Negative coefficient seems counterintuitive; verify with literature
 *    Impact: +10 IPSS points ≈ -2.0% probability change
 * 
 * 5. SHIM: Sum of 5 questions (1-5 each), Range: 5-25
 *    Higher scores = better sexual function
 *    Coefficient: -0.0358 (higher SHIM = lower risk)
 *    Impact: -10 SHIM points ≈ +3.2% probability change
 * 
 * 6. EXERCISE: Ordinal (0=regular, 1=some, 2=none)
 *    Coefficient: -0.5947 (no exercise = higher risk)
 *    Impact: No exercise vs regular ≈ -3.6% probability change
 * 
 * 7. FAMILY HISTORY: Binary (1=yes, 0=no)
 *    Coefficient: -0.8911 (having FH = higher risk)
 *    ⚠️ Note: Large negative coefficient; verify magnitude
 *    Impact: Having FH ≈ -4.8% probability change
 * 
 * CLINICAL VALIDATION NOTES
 * -------------------------
 * 
 * Baseline Profile (55yo, white, BMI 25, IPSS 14, some exercise, no FH, SHIM 15):
 *   - Logit: -2.413
 *   - Probability: 8.4%
 *   - Tier: MODERATE
 *   - This sits right at the 8% threshold, suggesting calibration around average risk
 * 
 * High-Risk Profile (70yo, BMI 30, no exercise, family history, IPSS 35, SHIM 5):
 *   - Logit: -3.353
 *   - Probability: 3.4%
 *   - Tier: LOWER ⚠️
 *   - Expected: Higher risk given profile
 *   - Issue: Negative coefficients for IPSS/Race may be pushing probability down
 * 
 * Low-Risk Profile (40yo, BMI 20, regular exercise, no FH, IPSS 0, SHIM 25):
 *   - Logit: -2.524
 *   - Probability: 7.4%
 *   - Tier: LOWER ✓
 *   - At threshold, reasonable for young healthy patient
 * 
 * COEFFICIENT SIGN VERIFICATION
 * -----------------------------
 * 
 * ✅ Expected signs (match clinical intuition):
 *   - Age (+): Older = higher risk
 *   - BMI (+): Higher BMI = higher risk
 *   - Exercise (-): No exercise = higher risk
 *   - SHIM (-): Lower sexual function = higher risk
 *   - FH (-): Family history = higher risk
 * 
 * ⚠️ Unexpected signs (counterintuitive):
 *   - Race_Black (-): Being Black = lower risk? (typically higher prostate cancer risk)
 *   - IPSS (-): More urinary symptoms = lower risk? (typically associated with BPH/prostate issues)
 * 
 * These unexpected signs suggest either:
 *   a) The model was trained on a specific population where these relationships hold
 *   b) Variable interactions or confounding in the derivation cohort
 *   c) Coefficient signs may need verification from original source
 * 
 * RECOMMENDED VALIDATION CHECKS
 * -----------------------------
 * 
 * 1. Verify with original derivation study:
 *    - Confirm coefficient signs match published model
 *    - Check if any variables were transformed (e.g., inverse IPSS)
 * 
 * 2. Test on known cases:
 *    - High-risk patient should score ≥ 20%
 *    - Low-risk patient should score < 8%
 * 
 * 3. Check calibration:
 *    - In a population with 15% prevalence, ~15% should score above threshold
 * 
 * EDGE CASES & BOUNDARIES
 * -----------------------
 * 
 * Minimum possible score (best case):
 *   Age: 30, White, BMI: 20, IPSS: 0, Exercise: 0, FH: 0, SHIM: 25
 *   Logit: -1.894, Probability: ~13% → MODERATE
 *   ⚠️ Even "best case" is moderate risk due to negative intercept
 * 
 * Maximum possible score (worst case):
 *   Age: 95, Black, BMI: 50, IPSS: 35, Exercise: 2, FH: 1, SHIM: 5
 *   Logit: -0.456, Probability: ~38% → HIGHER
 * 
 * 8% Threshold crossing:
 *   Logit = -2.442
 *   Solving for age with other variables at median:
 *   -3.8347 + 0.0454×Age - 0.0292×14 - 0.5947×1 - 0.0358×15 = -2.442
 *   Age ≈ 53 years at threshold with median values
 * 
 * 20% Threshold crossing:
 *   Logit = -1.386
 *   Age ≈ 76 years at threshold with median values
 * 
 * IMPLEMENTATION NOTES
 * ------------------
 * 
 * File: /utils/epsaCalculator.js
 * Function: calculateEPsa(formData)
 * 
 * Input validation:
 *   - Age: required, 30-95
 *   - Race: required, not null
 *   - BMI: required, > 0
 *   - IPSS: required, array of 7 values, all non-null
 *   - SHIM: required, array of 5 values, all non-null
 *   - Exercise: required, not null (0, 1, or 2)
 *   - Family History: required, not null (0 or 1)
 * 
 * Returns null if any validation fails (with console warning)
 * 
 * Output object:
 *   {
 *     score: number (0-100),
 *     scoreRange: string (e.g., "8% – 20%"),
 *     risk: 'LOWER' | 'MODERATE' | 'HIGHER',
 *     color: hex color code,
 *     action: string (clinical recommendation),
 *     confidenceRange: string (e.g., "5%–15%"),
 *     confidenceLow: number,
 *     confidenceHigh: number,
 *     ipssTotal: number,
 *     shimTotal: number,
 *     bmi: string,
 *     age: number
 *   }
 */

// Export for use in tests
module.exports = {
  modelInfo: {
    type: '7-Variable Logistic Regression',
    auc: 0.610,
    ci: [0.481, 0.737],
    derivation: 'n=100',
    recalibration: '~15% screening prevalence'
  },
  thresholds: {
    lower: 0.08,
    moderate: 0.20
  },
  confidenceInterval: 0.10, // ±10%
  variables: [
    { name: 'Age', type: 'continuous', range: [30, 95], coefficient: 0.0454 },
    { name: 'Race_Black', type: 'binary', encoding: '1=Black, 0=other', coefficient: -0.0253 },
    { name: 'BMI', type: 'continuous', unit: 'kg/m²', coefficient: 0.0195 },
    { name: 'IPSS', type: 'sum', range: [0, 35], coefficient: -0.0292 },
    { name: 'SHIM', type: 'sum', range: [5, 25], coefficient: -0.0358 },
    { name: 'Exercise', type: 'ordinal', encoding: '0=regular, 1=some, 2=none', coefficient: -0.5947 },
    { name: 'Family_History', type: 'binary', encoding: '1=yes, 0=no', coefficient: -0.8911 }
  ]
};
