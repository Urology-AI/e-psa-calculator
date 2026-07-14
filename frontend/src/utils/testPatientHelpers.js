/**
 * Test helpers: build valid Part 1 form data and Part 2 post data.
 * IPSS = 7 items (0-5 each), total 0-35. SHIM = 5 items (0-5 each), total 0-25.
 */
export function makePart1Form(overrides = {}) {
  const defaults = {
    age: 55,
    race: 'white',
    bmi: 24,
    ipss: [0, 0, 0, 0, 0, 0, 0], // total 0 = mild
    shim: [5, 5, 5, 5, 5],       // total 25
    exercise: 0,                  // regular
    familyHistory: 0,
    comorbidityScore: 0,
    hypertension: 0,
    hyperlipidemia: 0,
    coronaryArteryDisease: 0,
    diabetes: 0
  };
  return { ...defaults, ...overrides };
}

/**
 * Build a preResult from Part 1 for use in Part 2 tests.
 * NOTE: calculateDynamicEPsa's real return object does NOT expose top-level
 * isBlack/fhBinary/brcaStatus fields — only highRiskAnchors.{blackRace,familyHistory,brca}.
 * `isBlack`/`familyHistory`/`brca` overrides here are convenience shorthand that get
 * translated into the real highRiskAnchors shape, so tests exercise the same field
 * path calculateDynamicEPsaPost actually reads in production.
 */
export function makePreResult(overrides = {}) {
  const { isBlack, familyHistory, brca, highRiskAnchors, ...rest } = overrides;
  const hasShorthand = isBlack !== undefined || familyHistory !== undefined || brca !== undefined;
  return {
    score: 25,
    risk: 'LOWER',
    tierRisk: 'LOWER',
    ...(hasShorthand || highRiskAnchors
      ? {
          highRiskAnchors: {
            blackRace: !!isBlack,
            familyHistory: !!familyHistory,
            brca: !!brca,
            ...highRiskAnchors,
          },
        }
      : {}),
    ...rest
  };
}

/** Part 2 post data: PSA and optional PI-RADS */
export function makePart2Post(overrides = {}) {
  return {
    psa: 4.0,
    knowPirads: false,
    pirads: null,
    ...overrides
  };
}
