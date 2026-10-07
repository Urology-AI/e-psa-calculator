# ePSA Model Training

This folder contains scripts to refit the **Part 1** (screening / “Need PSA?”) and **Part 2** (post-PSA/MRI risk) models. The app uses a **new calculation approach** for both:

- **Part 1**: Binned logistic regression with optional calibration; recommendation threshold chosen for target sensitivity.
- **Part 2**: Logistic regression on log(PSA) and PI-RADS dummy variables; probability mapped to risk categories via thresholds.

Training outputs (coefficients, thresholds, and performance) can be written to text files in the repo root. **The `data/` directory and the result files below are in `.gitignore`** (not committed); generate them locally by running the scripts.

---

## Part 1 – Screening model (“Need PSA?”)

### Calculation method (new)

- **Model type**: `binned_v1` — logistic regression on **binned/dummy** inputs (age bins, BMI bins, IPSS severity, exercise, race, family history, and optional age×IPSS interactions).
- **Output**: Probability that PSA > 4. The app converts this to an ePSA score (0–100%) and a risk tier (LOWER / MODERATE / HIGHER) using configurable cutoffs.
- **Calibration**: Optional post-hoc calibration (slope + intercept shift) can be applied to the logit in `calculatorConfig.js` (`part1.calibration`). Default is no change (`slope: 1.0`, `interceptShift: 0.0`).
- **Recommendation**: “PSA Recommended” is shown when probability ≥ `recommendThreshold`. The threshold is chosen in training to achieve a target sensitivity (e.g. 95%) on out-of-fold predictions.

### Data and columns

- **Input**: Excel file in `data/` (the `data/` folder is gitignored). See script for exact column names; defaults include `PSA`, `Age Group`, `Race`, `BMI`, `FH of prostate`, `Exercise Freq`, IPSS total as `TOTAL`, etc.
- **Outcome**: `y = 1` if PSA > 4, else 0.

### Run training

```bash
# From repo root (or ensure path to data is correct)
python training/refit_part1_psa_model.py data/ePSA\ Initial\ Data\ \ w\ PSA\ +\ MRI.xlsx

# Optional: target sensitivity (default 0.95), regularization, CV
python training/refit_part1_psa_model.py data/your_data.xlsx --target_sens 0.90 --C 1.0 --splits 5 --repeats 2
```

### Outputs

- **Console**: JSON with `n_used`, prevalence, out-of-fold AUC, picked threshold (value, sensitivity, specificity), and a `deploy` block (intercept, `recommendThreshold`, variables with weights).
- **Paste block**: Ready-to-paste snippet for `frontend/src/config/calculatorConfig.js` (part1: `intercept`, `recommendThreshold`, `variables`).
- **Result file**: Full run can be redirected to e.g. `training_output_part1.txt` (see repo root).

### Latest results (from training run)

| Metric | Value |
|--------|--------|
| n_used | 100 |
| PSA>4 prevalence | 0.81 |
| Out-of-fold AUC | 0.513 |
| Target sensitivity | 0.95 |
| Picked threshold | 0.615 |
| Sensitivity at threshold | 0.963 |
| Specificity at threshold | 0.211 |

Coefficients and threshold are written to `training_output_part1.txt` and `training_results_summary.txt` when you save script output (those files are gitignored). After refitting, update `calculatorConfig.js` part1 `intercept`, `recommendThreshold`, and `variables` with the script’s paste block.

---

## Part 2 – Post-PSA/MRI risk (csPCa, Grade Group ≥ 2)

### Calculation method (new)

- **Model type**: `logistic_v1` — single logistic regression with:
  - **log(PSA)** (continuous)
  - **PI-RADS** as dummy variables: `pirads_3`, `pirads_4`, `pirads_5` (reference: no MRI or PI-RADS 1–2).
- **Output**: Probability of clinically significant prostate cancer (csPCa). The app maps this probability to risk categories (e.g. Low / Moderate / High) using `part2.thresholds` (low, moderate, high) in config.
- **No points**: The legacy “points” summary (pre-score + PSA + PI-RADS points) is not used when `modelType === 'logistic_v1'`; the results page shows the probability-based category and inputs instead.

### Data and columns

- **Input**: Excel (or CSV) with PSA, PI-RADS (if available), and outcome for csPCa (e.g. Grade Group ≥ 2).
- **Outcome**: Binary csPCa indicator.

### Run training

```bash
# Part 2 script name (note: refit_part2_cancer_model.py.py in repo)
python training/refit_part2_cancer_model.py.py data/ePSA\ Initial\ Data\ \ w\ PSA\ +\ MRI.xlsx

# Optional: CV splits, sheet name
python training/refit_part2_cancer_model.py.py data/your_data.xlsx --splits 5 --sheet "Sheet1"
```

### Outputs

- **Console**: JSON with `n_used`, prevalence, out-of-fold AUC, Brier score, and `deploy` (intercept, variables with weights, `encodings`: `psaTransform: 'log'`, `piradsMode: 'dummies'`).
- **Paste block**: For `calculatorConfig.js` part2: `intercept`, `variables`, `encodings`. Thresholds (low/moderate/high) are set separately in config and are not re-estimated by the script by default.
- **Result file**: Redirect to e.g. `training_output_part2.txt` (see repo root).

### Latest results (from training run)

| Metric | Value |
|--------|--------|
| n_used | 83 |
| csPCa prevalence | 0.855 |
| Out-of-fold AUC | 0.352 |
| Brier score (OOF) | 0.133 |

Coefficients and encodings are written to `training_output_part2.txt` and `training_results_summary.txt` when you save script output (those files are gitignored). After refitting, update `calculatorConfig.js` part2 `intercept`, `variables`, and (if needed) `encodings`. Thresholds (e.g. low: 0.10, moderate: 0.25, high: 0.50) remain in config.

---

## Results files (repo root, gitignored)

These files are listed in `.gitignore` and are not committed. Create them by redirecting script output or by copying from the console.

| File | Content |
|------|--------|
| `training_output_part1.txt` | Full Part 1 refit JSON + paste block for `calculatorConfig.js`. |
| `training_output_part2.txt` | Full Part 2 refit JSON + paste block for `calculatorConfig.js`. |
| `training_results_summary.txt` | Short summary of both runs (n, prevalence, AUC, thresholds, coefficients). |

---

## Updating the app after a refit

1. Run the appropriate script(s) and capture the “Paste into calculatorConfig.js” block.
2. Edit `frontend/src/config/calculatorConfig.js`:
   - **Part 1**: Update `part1.intercept`, `part1.recommendThreshold`, and `part1.variables` (and optionally `part1.calibration`).
   - **Part 2**: Update `part2.intercept`, `part2.variables`, and `part2.encodings` if the script output differs; keep or adjust `part2.thresholds` as needed.
3. Optionally append or overwrite the result files in the repo root for traceability.
4. Rebuild and test the frontend to confirm scores and recommendations match expectations.

---

## Biopsy model (v4) – external validation on PI-CAI

`validate_biopsy_picai.py` scores the **deployed** biopsy-risk model (`predictBiopsyRisk` from `@epsa/engine`, called via Node so no coefficients are hand-copied) on the public PI-CAI clinical table and reports AUC with bootstrap CIs, per-site AUC, sensitivity/specificity at the deployed 0.25 threshold, and calibration by risk quintile. Outcome is `case_csPCa` (ISUP ≥ 2), matching v4's GG≥2 label. PI-RADS per case is the highest per-lesion score.

```bash
curl -L -o marksheet.csv https://raw.githubusercontent.com/DIAGNijmegen/picai_labels/main/clinical_information/marksheet.csv
python training/validate_biopsy_picai.py --csv marksheet.csv   # needs frontend deps installed (node_modules/@epsa/engine)
python -m pytest training/test_validate_biopsy_picai.py          # 17 tests; engine ones skip if frontend deps are missing
```

**Data licence:** PI-CAI is CC BY-NC 4.0 (non-commercial, attribution required; cite the PI-CAI Lancet Oncology 2024 paper). Use it for validation only; do not commit the CSV. Check the licence before training anything deployed on it.

### Results (1,460 of 1,500 cases with PSA + PI-RADS; 28.5% csPCa)

| Measure | Value |
|--------|--------|
| v4 AUC | 0.865 (95% CI 0.845–0.884) |
| PI-RADS alone / PSA density alone / PSA alone | 0.859 / 0.723 / 0.627 |
| Per-site AUC (PCNN / RUMC / ZGT) | 0.776 / 0.885 / 0.903 |
| At threshold 0.25 | sensitivity 94.5%, specificity 62.9%, NPV 96.6%, 46.6% biopsies avoided |
| Mean predicted vs observed risk | 36% vs 28.5% |

Takeaways: discrimination holds up outside Mount Sinai (registry AUC was 0.74), and the 0.25 threshold is safe, but v4 **overestimates low-end risk** (lowest two quintiles predicted 14% / 19%, observed 2% / 4%) and adds only ~0.006 AUC over PI-RADS alone. In 5-fold CV on PI-CAI, recalibrating v4's intercept/slope fixes most of the low-end miscalibration (Brier 0.140 → 0.132); a full refit reaches AUC ≈ 0.875–0.879 (Brier ≈ 0.126). A PI-CAI-fitted model may not transfer to Mount Sinai, so validate on the local registry before adopting any change.

### Recalibration candidate (not deployed)

`recalibrate_biopsy_picai.py` fits `p' = sigmoid(a + b·logit(p_v4))` on the 1,439 PI-CAI cases that take the full v4 path and reports cross-validated metrics and tier migration. Fitted: **a = −0.265, b = 1.63** (v4 is *compressed*, not over-extreme: it overstates low risk and slightly understates high risk). Cross-validated Brier improves 0.140 → 0.132 with unchanged AUC (0.865). **Do not drop it in unchanged:** applying the existing 0.15 / 0.25 / 0.45 cutoffs to recalibrated risk drops sensitivity from 94.4% to 84.8%. The deployed cutoffs map to recalibrated risks of 0.044 / 0.114 / 0.356, so any adoption must move the cutoffs with it and be re-checked on local data first.

### Three-way comparison and model-version check

`compare_biopsy_models_picai.py` compares v4 (deployed), **MSP-RC reconstructed from its published odds ratios** (Parekh et al. 2022, Table 2; family history / DRE / biopsy history / race and the intercept are unavailable in PI-CAI, so it ranks men but is not a full test of the published tool), and a PI-CAI refit (v4 inputs + age, repeated 5-fold CV, so it is not graded on its own rows). It reports AUC with bootstrap CIs, biopsies avoided at 95% and 90% sensitivity, paired AUC differences, and three questions from the case ISUP grade: significant vs everything else, any cancer vs none, significant vs low-grade only.

| Question (AUC) | v4 | MSP-RC (rebuilt) | Refit (CV) |
|---|---|---|---|
| Significant (GG≥2) vs everything else | 0.866 | 0.848 | 0.879 |
| Any cancer vs no cancer | 0.858 | 0.871 | 0.894 |
| Significant vs low-grade only | 0.695 | 0.690 | 0.699 |

**What changed from v3 to v4** (see `biopsy-prediction/model/model.py`): v3 was logPSA + PSAD + PI-RADS (N=120, OOF AUC 0.703). v4 uses logPSA + logVolume + PI-RADS (N=126, OOF AUC 0.739) and drops the PSAD term, because PSAD = PSA/volume, so fitting logPSA, PSAD and logVolume together made the coefficients share variance and flip sign. On PI-CAI (n=1,439), by engine path: v2 (PSA + PI-RADS) AUC 0.843, v3 0.847, v4 0.866; at the 0.25 threshold specificity is 27.7% / 38.9% / 63.5% at similar sensitivity (about 95%).

Tests: `python -m pytest training/` (engine-dependent tests skip if `frontend/node_modules` is missing).
