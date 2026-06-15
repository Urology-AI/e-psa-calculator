# ePSA Software Quality Documentation

**Version:** 1.0 | **Date:** 2026-06-15 | **Status:** Living document — update after each model refit or major feature change

This document applies FDA Good Machine Learning Practice (GMLP) principles and SaMD regulatory guidance to the ePSA prostate cancer screening tool. It is not a formal regulatory submission but is intended to demonstrate systematic safety thinking for IRB expansion, investor due diligence, and future FDA engagement.

---

## 1. Intended Use Classification

ePSA operates in three deployment contexts with different regulatory implications:

### 1.1 Bus / Community Screening Mode
- **Intended user:** General public (self-service)
- **Intended use:** Educational awareness; prompts individuals to discuss PSA testing with their physician
- **Clinical decision role:** None — output is informational only
- **Regulatory burden:** Lower; likely not a medical device under FDA Device Software Functions guidance (2023) given the general wellness framing and the disclaimer that output does not substitute for physician evaluation
- **Disclaimer adequacy:** Current disclaimer ("Educational use only · Not a substitute for physician evaluation") is appropriate for this mode

### 1.2 ClinicalModeFlow (Kiosk / Staff-Assisted)
- **Intended user:** Clinical staff operating a kiosk; patient-facing with staff oversight
- **Intended use:** Structured data collection linked to REDCap; output informs pre-visit PSA discussion
- **Clinical decision role:** Moderate — score may be reviewed by a clinician before or during a visit
- **Regulatory burden:** **Likely SaMD.** Regulatory review recommended before large-scale clinical deployment. See Section 6.

### 1.3 QuickEPsaEntry (Clinician-Facing Entry)
- **Intended user:** Urologist or primary care physician entering patient data directly
- **Intended use:** Clinical decision support — informs whether to recommend PSA testing for a specific patient
- **Clinical decision role:** High — clinician acts on the score in a care context
- **Regulatory burden:** **Likely SaMD with higher scrutiny.** This mode most directly influences clinical decisions. A pre-submission meeting with FDA (Q-Submission) is recommended before commercial or institutional deployment beyond the current research cohort.

---

## 2. Model Assumptions

Per the Therac-25 lesson: document every assumption that, if violated, could cause harm. The following assumptions are embedded in the current scoring system and are not surfaced to end users.

### 2.1 Part 1 Model (Screening Score)

| Assumption | Value | Source | Risk if Violated |
|---|---|---|---|
| Model outcome variable | High-grade prostate cancer (GG ≥ 3, Gleason ≥ 4+3) | `epsaEngine.js:33`, `Part1Results.jsx:1128` | Score not separately validated for GG≥2 detection; AUA/SUO 2026 defines csPCa as GG≥2 |
| Training cohort | N = 94, Mount Sinai urology biopsied referral patients | `epsaEngine.js:33`, IRB STUDY-14-00050 | Poor generalizability to younger or more diverse populations; referral cohort, not screening population |
| EPV (events per variable) | ~1.9 (12-variable model, 23 GG≥3 events) | Derived from N=94, 23 events | EPV < 10 is below the standard threshold; model is underpowered and may overfit |
| QoL → IPSS mapping | Barry et al., *J Urol* 1992 (7-question AUA Symptom Score) | Prior art | Mapping is approximate; single-question QoL proxy adds uncertainty |
| SHIM Q1 proxy | `expandShimSingle([v, v, v, v, v])` — single SHIM question expanded to all 5 domains equally | `epsaEngine.js` | Overestimates or underestimates SHIM total if domain scores are heterogeneous |
| SHIM default when not entered | `[0, 0, 0, 0, 0]` — assumed no erectile dysfunction | UI defaults | Adds 0 to score; patients with undetected ED may be underscored |
| BMI default in QuickEPsaEntry | 26 kg/m² — used when height/weight not provided | QuickEPsaEntry UI | Misclassifies patients with BMI ≥ 30 into lower BMI bin; reduces score for obese patients |
| Age bin encoding | 40–49, 50–59, 60–69, 70+ | `calculatorConfig.js` encodings | Patients < 40 receive no age-related risk increment |
| Score → tier thresholds | Raw score < 18 = lower/moderate; ≥ 18 = elevated | `calculatorConfig.js` score_threshold | Threshold was set by Youden-optimal method on training data; may shift with larger N |

### 2.2 Part 2 Model (Post-PSA / MRI Risk)

| Assumption | Value | Source | Risk if Violated |
|---|---|---|---|
| Model outcome variable | GG ≥ 2 (clinically significant cancer, AUA/SUO 2023/2026) | `calculatorConfig.js` line 61, `epsaEngine.js:151` | — |
| Training cohort | N = 96, Mount Sinai biopsy registry, 74% GG≥2 prevalence, 2026-06-02 | `calculatorConfig.js` line 75 | Very small N; high prevalence base rate limits discriminatory power |
| Base model (no MRI) | logPSA only; AUC 0.378 on GG≥2 — below chance | `calculatorConfig.js` line 68 | Base model (no MRI) is not clinically useful; MRI data required for meaningful output |
| PIRADS threshold separation | PIRADS 4 (0.968) and PIRADS 5 (1.255) are now separated | `calculatorConfig.js` line 76 | Prior version had near-identical weights — verify after each refit |

---

## 3. FMEA — Key Failure Modes

Failure Mode and Effects Analysis (FMEA) for the current ePSA system. Likelihood ratings are relative to the current deployment context (research/pilot).

| # | Failure Mode | Harm | Likelihood | Mitigation |
|---|---|---|---|---|
| 1 | Score falsely low → patient or clinician skips PSA discussion | Delayed prostate cancer diagnosis | **Medium** — EPV issue means model may underfit high-risk patterns | Disclose EPV limitation; add confidence interval display; enforce family-history override |
| 2 | Score falsely high → unnecessary PSA referral | Patient anxiety; potential biopsy overtreatment | **Medium** — model calibration not validated externally | Display tier (not just binary); add disclaimer on score uncertainty |
| 3 | Incorrect default accepted (e.g., BMI 26 when patient is obese; SHIM `[0,0,0,0,0]` when ED is present) | Wrong score entered; clinician acts on inaccurate output | **High** — defaults are plausible values, easy to miss | Add visual indicators when defaults are active; require explicit confirmation in QuickEPsaEntry |
| 4 | REDCap submission fails silently | Research data lost; gaps in training cohort | **Medium** — network failures are common in clinical environments | Add retry logic with user-visible error; queue submissions offline |
| 5 | Scoring engine weight mismatch after model refit | Systematic scoring error across all patients | **Low but catastrophic** — a single bad `calculatorConfig.js` update affects every user | Enforce verification checklist (Section 4) before any weight update reaches production |

---

## 4. Verification Checklist

The following checks must pass after any change to `epsaEngine.js`, `calculatorConfig.js`, or the Part 1/Part 2 model weights. The existing test suite (`epsaEngine.test.js`) covers items 4.1–4.4; items 4.5–4.6 require manual review.

### 4.1 Score Range Validity
- All valid input combinations produce a Part 1 score in [0, 80]
- No `NaN`, `null`, or `undefined` returned for any valid input

### 4.2 Monotonicity Checks
- Higher age bin → higher score (all else equal)
- Black race → higher score vs. same profile, non-Black
- Family history positive → PSA recommended (regardless of score)
- BMI ≥ 30 → higher score than BMI < 25 (all else equal)

### 4.3 Tier Threshold Integrity
- Raw score < 18 → tier = lower/moderate
- Raw score ≥ 18 → tier = elevated / PSA recommended

### 4.4 Output Shape
- `calculateDynamicEPsa()` returns: `score`, `risk`, `recommendPSA`, `tierRisk`, `confidenceRange`, `calculationDetails`
- `calculationDetails.maxScore === 80`
- `calculationDetails.probability` is in [0, 1]

### 4.5 Family History Override
- Patient with `familyHistory: 1` and `age ≥ 40` always returns `recommendPSA: true`, regardless of score

### 4.6 SHIM / IPSS Interaction
- `shimTotal` contribution is within `recommendedRange: [0.02, 0.05]` per unit weight
- IPSS severe + age ≥ 60 interaction term (`age60plus_x_ipss_severe`) reduces score as expected (negative weight)

---

## 5. Change Control for Model Weights

Any change to the Part 1 or Part 2 weights in `calculatorConfig.js` must follow this process before merging to `main`:

1. **Record training metadata** — document training dataset version, N, outcome variable, and date of refit in the PR description and in the `version` field of `DEFAULT_CALCULATOR_CONFIG`
2. **Re-run EPV calculation** — update Section 2 of this document with new EPV estimate (events ÷ variables)
3. **Run verification suite** — all tests in `epsaEngine.test.js` must pass; monotonicity checks (Section 4.2) must be manually confirmed
4. **Re-verify tier threshold** — confirm that the Youden-optimal cutoff from the new model maps to raw score ≈ 18; if not, update `score_threshold` in config and re-test tier assignment
5. **PIRADS weight separation check** (Part 2 only) — confirm PIRADS 4 and PIRADS 5 weights are meaningfully different (> 0.1 apart)
6. **Update this document** — record new N, EPV, AUC, and training date in Section 2 tables

**Rationale:** The FDA AI/ML-Based SaMD Action Plan (2021) and GMLP guidance require a predetermined change control plan for algorithm updates. This checklist is the lightweight version appropriate for a research-phase tool.

---

## 6. Disclaimer Adequacy and Regulatory Review Recommendation

### Current Disclaimer
> "Educational use only · Not a substitute for physician evaluation"

This disclaimer is **adequate for Bus/Community mode** (Section 1.1) where the intended user is the general public seeking health awareness.

### Limitations of Current Disclaimer for Clinical Modes

If ClinicalModeFlow or QuickEPsaEntry are used to inform clinical decisions — even informally — the disclaimer's protective value is weakened under FDA's functional/intended-use analysis. The relevant test is not what the disclaimer says, but what the software *does* in practice.

### Recommended Actions Before Broader Clinical Deployment

| Action | Priority | Applies To |
|---|---|---|
| Legal review of SaMD classification under FDA Device Software Functions Guidance (2023) | High | ClinicalModeFlow, QuickEPsaEntry |
| IRB amendment to explicitly cover clinician-facing use | High | QuickEPsaEntry |
| External validation on a second cohort (N ≥ 300) | High | Part 1 model (EPV issue) |
| FDA Q-Submission (pre-submission meeting) | Medium | Before any commercial deployment |
| HIPAA / de-identification audit of REDCap data pipeline | High | ClinicalModeFlow |

### What Is and Is Not Validated

| Claim | Status |
|---|---|
| ePSA score is associated with PSA > 4 / GG ≥ 2 in a Mount Sinai cohort | Validated (N ≈ 94–96, internal only) |
| ePSA score generalizes to other health systems or demographics | **Not validated** |
| Part 2 (post-PSA / MRI) model is clinically useful without MRI data | **Not validated** (base model AUC 0.378) |
| ePSA is safe and effective as a standalone clinical decision tool | **Not validated** — requires prospective study |

---

*This document should be reviewed and updated: (a) after any model refit, (b) before any new deployment context, and (c) annually at minimum. Maintainer: ePSA engineering team.*
