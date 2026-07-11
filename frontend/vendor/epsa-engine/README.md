# @epsa/engine

Shared clinical calculator engine for the ePSA prostate cancer screening
models, extracted from millionstrongmen.com and the MSSM screening tool so
both apps consume a single, versioned copy instead of drifting duplicates.

## Contents

- `src/epsaEngine.js` — Models 1–3 (`calculateDynamicEPsa`,
  `calculateDynamicEPsaPost`), guardrails, and validation logic.
- `src/calculatorConfig.js` — default calculator config, alternative model
  weights, PSA banner config, cohort analysis fields.
- `training/` — Python scripts used to refit the underlying PSA and cancer
  models (`refit_part1_psa_model.py`, `refit_part2_cancer_model.py`).
- `epsa-engine.test.mjs` / `src/epsaEngine.test.js` — clinical audit test
  suites (AUA/SUO 2026, NCCN, EAU, ERSPC patient profiles).

## Usage

```js
import { calculateDynamicEPsa, calculateDynamicEPsaPost, DEFAULT_CALCULATOR_CONFIG } from '@epsa/engine';
```

## Consuming apps

- `millionstrongmen.com` (patient-facing, `e-psa/frontend`)
- MSSM screening tool (clinician-facing, `epsa-screening-tool`)

During local development both apps depend on this package via
`file:../epsa-engine` in `package.json`. Bump the version here and re-run
`npm install` in each app to pick up changes.

## Testing

```
npm install
npm test
```
