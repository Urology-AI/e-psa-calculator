/**
 * Dynamic ePSA Calculator
 *
 * Local wrapper around @epsa/engine — used by:
 *  - App.gh-pages.jsx, the static GitHub Pages build, which has no Firebase
 *    backend and so cannot call the shared calculatePsaRecommendation Cloud
 *    Function; it computes locally against the default config.
 *  - QuickEntry.jsx's client-side validateInputs() call, for instant form
 *    validation before submitting to the Cloud Function.
 *
 * The main app (App.jsx) computes scores via services/psaEngineService.js
 * (the Cloud Function) instead of calling calculateDynamicEPsa directly —
 * see that file's computeSessionResults().
 *
 * Previously supported a live-published config (Firestore
 * calculatorConfig/published + localStorage override) and an A/B-testing
 * variant system (getModelVariant/getVariantConfig), for adjusting model
 * weights without a code deploy. Removed: nothing in the codebase ever
 * wrote to either the Firestore doc or the localStorage key, so the whole
 * subsystem was dead weight — and now that scoring runs server-side via
 * the Cloud Function, a client-side config override couldn't have taken
 * effect there anyway. Always uses DEFAULT_CALCULATOR_CONFIG.
 */

import { DEFAULT_CALCULATOR_CONFIG } from '@epsa/engine';
import {
  calculateDynamicEPsa as calculateDynamicEPsaEngine,
  calculateDynamicEPsaPost as calculateDynamicEPsaPostEngine,
  validateInputs,
} from '@epsa/engine';

// Shared validation + math engine (single source of truth)
export { validateInputs };

// Dynamic Part 1 Calculator
export const calculateDynamicEPsa = (formData, customConfig = null) => {
  const config = customConfig || getCalculatorConfig();
  return calculateDynamicEPsaEngine(formData, config);
};

// Dynamic Part 2 Calculator
export const calculateDynamicEPsaPost = (preResult, postData, customConfig = null) => {
  const config = customConfig || getCalculatorConfig();
  return calculateDynamicEPsaPostEngine(preResult, postData, config);
};

export const getCalculatorConfig = () => DEFAULT_CALCULATOR_CONFIG;

export default {
  getCalculatorConfig,
  calculateDynamicEPsa,
  calculateDynamicEPsaPost,
};
