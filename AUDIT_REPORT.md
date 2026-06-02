# ePSA Clinical Deployment Audit Report

**Date:** 2026-06-01  
**Scope:** Full codebase — HIPAA compliance, clinical guideline accuracy, security, UI/accessibility, code quality, production readiness  
**Tool:** ePSA — prostate cancer risk assessment collecting age, race, family history, PSA, erectile function, urinary symptoms (all PHI under HIPAA)

---

## 1. EXECUTIVE SUMMARY

| Agent | CRITICAL | WARNING | INFO | Top Finding |
|-------|----------|---------|------|-------------|
| 1 — HIPAA & Regulatory | 10 | 18 | 5 | PHI (age, race, PSA, BRCA, risk) serialized in URL sent to external domain |
| 2 — Clinical Guideline Accuracy | 1 | 10 | 12 | csPCa outcome defined as GG≥3; AUA/NCCN standard is GG≥2 — not disclosed |
| 3 — Security & Vulnerability | 6 | 8 | 8 | REDCap API token exposed in frontend JS bundle; IDOR on `getUser` |
| 4 — UI, Accessibility & Clinical UX | 10 | 15 | 5 | `alert()` used for clinical errors; form inputs have no `<label>` associations |
| 5 — Code Quality & Architecture | 3 | 10 | 10 | No null-guard before `calculateDynamicEPsaPost`; 5-ARI and PI-RADS logistic regression untested |
| 6 — Performance & Production Readiness | 2 | 10 | 5 | No error monitoring; Firestore offline persistence not enabled (bus mode fails offline) |
| **TOTAL** | **32** | **71** | **45** | |

### Overall Deployment Readiness: ❌ NOT READY

The following CRITICAL items **must be resolved** before any clinical deployment:

1. **PHI transmitted via URL to external domain** (`App.jsx:1449`) — age, race, PSA, BRCA, risk results sent as URL query params to `as.millionstrongmen.com`
2. **No HIPAA BAA with Google/Firebase** — Firebase Analytics is in use and explicitly excluded from Google's BAA; must be removed
3. **REDCap API token in frontend bundle** (`redcapSubmit.js`) — full clinical research DB credential exposed to any browser
4. **Raw phone number written to Firestore from client** (`firestoreService.js:26`) — plaintext PHI stored without server-side validation
5. **IDOR on `getUser`** (`backend/src/index.ts:465`) — any authenticated user can fetch any other user's health data
6. **Realtime Database open to all authenticated users** (`database.rules.json`) — includes anonymous users
7. **Hardcoded Firebase config in admin dashboard** (`admin-dashboard/src/config/adminFirebase.js`) — bypasses environment variable pattern
8. **Bus flow collects PHI with no consent screen** (`App.jsx:210`) — implied consent is not valid
9. **File import loads PHI with no consent screen** (`App.jsx:1147`) — implied consent is not valid
10. **AnonymousAuth creates Firestore docs without Firebase Auth** (`AnonymousAuth.jsx`) — 8-char session ID as Firestore UID is guessable
11. **csPCa outcome is GG≥3, not AUA/NCCN's GG≥2** — material clinical limitation not disclosed on any result screen
12. **No error monitoring** — production errors are completely invisible
13. **Firestore offline persistence not enabled** — bus mode fails with poor/no signal
14. **`alert()` calls for clinical errors** — inaccessible, breaks kiosk/WebView environments
15. **Form inputs have no `<label>` elements** — fails WCAG 2.1 AA, required for clinical tools
16. **No null-guard before `calculateDynamicEPsaPost`** — null `preResult` produces a combined score with 0 Part 1 points, silently wrong

---

## 2. AGENT 1 — HIPAA & Regulatory Compliance

### CRITICAL Findings

---

**[H-C1]**  
Severity: CRITICAL  
File: `frontend/src/App.jsx`  
Line: 1449–1477  
Issue: `buildASToolURL()` serializes PHI — age, PSA value, PI-RADS score, ePSA tier, `isBlack`, `fhBinary`, `brcaStatus`, and full risk results — as JSON in a URL query parameter passed to `as.millionstrongmen.com`. URL query params appear in browser history, referrer headers, CDN/proxy logs, and the receiving server's access logs. The receiving server (`as.millionstrongmen.com`) is not a Firebase-covered entity and has no BAA.  
Fix: Replace with a secure cross-origin postMessage handshake after the window opens, or use a server-side token exchange. Never include `isBlack`, `fhBinary`, `brcaStatus`, or risk results in a URL.

---

**[H-C2]**  
Severity: CRITICAL  
File: `frontend/src/services/firestoreService.js`  
Line: 26–62  
Issue: `createOrUpdateUser()` writes the raw phone number in E.164 format (`phone: phone`) directly to Firestore from the browser. This is plaintext PHI stored at rest, bypasses the backend's intentional hash-only design, and violates the explicit design goal in `backend/src/index.ts` (`upsertConsent`): "Only store hash, not raw phone."  
Fix: Remove the `phone: phone` field from `createOrUpdateUser()`. Only `phoneHash` should be stored. All consent + phone operations must go through the `upsertConsent` Cloud Function.

---

**[H-C3]**  
Severity: CRITICAL  
File: `backend/src/index.ts`  
Line: 720–748  
Issue: `getUserPhone` logs decrypted PHI to Cloud Functions logs: `console.log('Phone data sample:', phoneData)` and `console.log('Decrypted phone:', decryptedPhone)`. Cloud Function logs are retained and accessible to all Firebase project members. The function also returns the plaintext decrypted phone number in the response.  
Fix: Remove all `console.log` statements printing phone data. Never return plaintext phone numbers; return only masked last 4 digits at most.

---

**[H-C4]**  
Severity: CRITICAL  
File: `frontend/src/App.jsx`  
Line: 119–125  
Issue: `params.get('email')` reads an email address from the URL query string and stores it in state. PHI in URLs is logged by browsers, servers, CDNs, and referrer headers — none of which are HIPAA-safe. The code comment on line 116 says "legacy; we no longer collect email," confirming this path should already be removed.  
Fix: Delete lines 117–125 and all `urlEmail` prop usages throughout the component tree.

---

**[H-C5]**  
Severity: CRITICAL  
File: `frontend/src/components/AnonymousAuth.jsx`  
Line: 33–51  
Issue: Creates a Firestore user document using the human-readable 8-character session ID as the Firestore document ID, with no Firebase Authentication. There is no Firebase Auth UID or ID token. Any unauthenticated client that knows or guesses an 8-character alphanumeric code can read or overwrite that user's document.  
Fix: Remove this component. All user document creation must go through Firebase Anonymous Auth first (as `UniversalAuth.jsx` correctly does), so the document ID is a Firebase-generated UID with a valid ID token.

---

**[H-C6]**  
Severity: CRITICAL  
File: `frontend/src/App.jsx`  
Line: 1147–1153  
Issue: The file import flow sets `consentData` to `{ consentBasis: 'implied_by_import' }` and calls `cacheConsent()` without showing the consent screen. PHI from an imported JSON/PDF file is loaded into the app without affirmative consent.  
Fix: Show the `ConsentScreen` before loading imported PHI.

---

**[H-C7]**  
Severity: CRITICAL  
File: `frontend/src/App.jsx`  
Line: 210–214  
Issue: The bus flow bypass sets `consentData` to `{ consentBasis: 'implied_bus_flow' }` and calls `cacheConsent()` without showing any consent screen, despite the bus flow collecting age, race, family history, IPSS, SHIM, and PSA.  
Fix: The QuickEpsaFlow (bus mode) must present its own consent screen before collecting any PHI.

---

**[H-C8]**  
Severity: CRITICAL  
File: `firebase.json` / `frontend/src/config/firebase.js`  
Issue: No HIPAA Business Associate Agreement (BAA) with Google Cloud/Firebase is documented or evidenced. `getAnalytics(app)` (firebase.js line 69) initializes Google Analytics, which is **explicitly excluded** from Google's HIPAA BAA — meaning any session data tied to analytics events constitutes a HIPAA violation.  
Fix: (1) Sign the Google Cloud HIPAA BAA for the Firebase project. (2) Remove `getAnalytics` and the `analytics` export from `firebase.js` entirely. Document BAA execution date in compliance records.

---

**[H-C9]**  
Severity: CRITICAL  
File: `frontend/src/config/firebase.js`  
Line: 67–70  
Issue: (Same root cause as H-C8) `getAnalytics(app)` transmits usage data to Google Analytics servers, which are not covered by Firebase's BAA. Even page views tagged with session IDs constitute a disclosure of PHI to an uncovered third party.  
Fix: Remove this line and the analytics export.

---

**[H-C10]**  
Severity: CRITICAL  
File: `backend/src/index.ts`  
Line: 465–501  
Issue: `getUser` Cloud Function accepts `data?.userId || context.auth.uid`. Any authenticated user can pass any arbitrary `userId` and receive that user's consent status, timestamps, and `currentSessionId` (IDOR). The audit log entry uses resource type `'admin'`, indicating this was intended to be admin-only but the admin check was never added.  
Fix: Add: `if (userId !== context.auth.uid) { const isAdmin = await isAdminUser(context.auth.uid); if (!isAdmin) throw new functions.https.HttpsError('permission-denied', 'Access denied'); }`

---

### WARNING Findings

**[H-W1]**  
Severity: WARNING  
File: `frontend/src/services/analyticsService.js`  
Line: 56–65  
Issue: When Firebase is unavailable, analytics events including `userId`, `age`, `predictedRisk`, `riskCategory`, `ipssTotal`, and `shimTotal` are stored unencrypted in localStorage under `epsa_analytics_queue`.  
Fix: Strip all PHI fields before localStorage fallback, or remove the `storeLocalAnalytics` function entirely.

**[H-W2]**  
Severity: WARNING  
File: `frontend/src/App.jsx`  
Line: 277  
Issue: Session ID is not cleared from localStorage on logout in local storage mode. `safeLS.remove(CONSENT_CACHE_KEY)` is also not called in `handleLogout`.  
Fix: Always clear `sessionId_{uid}` and `CONSENT_CACHE_KEY` from localStorage on logout, regardless of `storageMode`.

**[H-W3]**  
Severity: WARNING  
File: `frontend/src/App.jsx`  
Issue: No automatic session timeout for inactivity. A patient on a shared clinic device remains authenticated with PHI visible indefinitely.  
Fix: Implement a 15-minute inactivity timer calling `handleLogout()`.

**[H-W4]**  
Severity: WARNING  
File: `firestore.rules`  
Line: 93–100  
Issue: The `list` permission on sessions evaluates `resource.data.userId == request.auth.uid` — but `resource.data` is not available during Firestore `list` queries, only during `get`. This means the rule does not enforce userId filtering at the query level.  
Fix: Remove `list` from the patient-facing sessions rule; route all session listing through Cloud Functions.

**[H-W5]**  
Severity: WARNING  
File: `firestore.rules`  
Line: 22–26  
Issue: `isSuperAdmin()` hardcodes email addresses and domain patterns. Compromised accounts require redeployment of rules to revoke.  
Fix: Move these accounts to the `admins` Firestore collection with `isActive: true`. Remove all hardcoded emails from rules.

**[H-W6]**  
Severity: WARNING  
File: `frontend/src/App.jsx`  
Line: 593–601  
Issue: Consent written directly from the frontend via `setDoc` bypasses the `upsertConsent` Cloud Function, producing no audit log entry.  
Fix: Route all consent writes through `upsertConsent`.

**[H-W7]**  
Severity: WARNING  
File: `frontend/src/App.jsx`  
Lines: 628–693 (`saveSession`, `saveProgressStep`, `updateSessionStep2`)  
Issue: Session create/update operations write directly to Firestore, bypassing Cloud Functions that include audit logging.  
Fix: Route all session CRUD through `phiBackendService.js` Cloud Functions.

**[H-W8]**  
Severity: WARNING  
File: `frontend/src/components/ConsentScreen.jsx`  
Issue: `consentToContact` is always set to `true` on submit — no affirmative checkbox required. User only needs to click Continue.  
Fix: Add a required checkbox ("I have read and agree to the above") that must be checked before Continue is enabled.

**[H-W9]**  
Severity: WARNING  
File: `frontend/src/components/ConsentScreen.jsx`  
Issue: No consent versioning. The cache key is hardcoded as `epsa_consent_acknowledged_v1`. If consent text is updated, returning users are never re-shown the updated consent.  
Fix: Include a `consentVersion` field (hash of consent text). On each session start, compare stored version to current; if different, clear cache and show consent screen.

**[H-W10]**  
Severity: WARNING  
File: `frontend/src/components/HipaaCompliancePopup.jsx`  
Issue: HIPAA Notice of Privacy Practices is not shown before or during data entry — only accessible from a buried menu. HIPAA requires NPP to be provided before PHI is first collected.  
Fix: Reference or embed HipaaCompliancePopup content within ConsentScreen.

**[H-W11]**  
Severity: WARNING  
File: `frontend/src/components/SinaiConsentScreen.jsx`  
Line: 41–47  
Issue: `researchConsent` is set to `true` unconditionally on submit with no opt-out path.  
Fix: Confirm with IRB that forced research consent is acceptable. Add explicit statement that research participation is required for this clinic flow.

**[H-W12]**  
Severity: WARNING  
File: `backend/src/index.ts`  
Line: 1707–1737  
Issue: `cleanupOldAuditLogs` deletes audit logs after 365 days. HIPAA 45 CFR §164.530(j) requires 6-year retention of audit documentation.  
Fix: Increase `RETENTION_DAYS` to 2190 (6 years). Export logs to Cloud Storage as immutable archives before Firestore deletion.

**[H-W13]**  
Severity: WARNING  
File: `frontend/src/utils/exportCsv.js`  
Issue: CSV exports contain PHI (age, race, BMI, FH, BRCA, IPSS, SHIM, PSA, PI-RADS) with no PHI header warning and no user advisory about handling.  
Fix: Add a PHI disclosure row at the top of every exported CSV and show a modal warning before download.

**[H-W14]**  
Severity: WARNING  
File: `firestore.rules`  
Line: 83–88  
Issue: Patients can directly overwrite their own consent flags in Firestore without going through the Cloud Function that validates schema and writes audit logs.  
Fix: Remove direct client write access for consent fields. Route all consent writes through `upsertConsent`.

**[H-W15]**  
Severity: WARNING  
File: `backend/src/index.ts`  
Line: 1403–1413  
Issue: `storeEncryptedPhone` stores a SHA256 hash of the encryption key alongside the ciphertext. An attacker with read access can brute-force the key.  
Fix: Do not store the key or its hash. Use Firebase Secret Manager for a project-wide encryption key.

**[H-W16]**  
Severity: WARNING  
File: `backend/src/index.ts`  
Line: 1888–1932  
Issue: `deleteUserData` deletes sessions and user documents but does not delete audit log entries for that user.  
Fix: Document explicitly that audit logs are retained per HIPAA requirements and are not subject to erasure for the PHI-holder. Pseudonymize audit log UIDs after user deletion.

**[H-W17]**  
Severity: WARNING  
File: `frontend/src/components/PrivacyPolicyPopup.jsx`  
Line: 18  
Issue: Privacy policy contains placeholder translation keys. The privacy policy must be complete and legally reviewed before clinical deployment.  
Fix: Verify `privacyPolicy.placeholder.*` translation values contain final legal text.

**[H-W18]**  
Severity: WARNING  
File: `frontend/src/services/firestoreService.js`  
Lines: 67–92 / `frontend/src/components/UniversalAuth.jsx` lines 75–85  
Issue: Direct Firestore client writes to `users` and `sessions` bypass Zod schema validation, `stripUndefined` cleaning, and audit logging in Cloud Functions.  
Fix: All writes to `users` and `sessions` must go through the established Cloud Functions.

---

### INFO Findings

**[H-I1]** `App.jsx:538–552` — Consent cache not cleared on logout; silently re-assumed on next login.  
**[H-I2]** `App.jsx` — `CONSENT_CACHE_KEY` version hardcoded as `v1`; mismatch never detected.  
**[H-I3]** `backend/src/index.ts` — `optimizeDatabase` deletes user documents without audit log entry.  
**[H-I4]** `backend/src/index.ts:exportSessionsCSV` — Bulk PHI export not labeled with exporter identity in filename.  
**[H-I5]** `firebase.js:15–23` — Firebase API key in frontend bundle; Firebase App Check not confirmed as enforced.

---

## 3. AGENT 2 — Clinical Guideline Accuracy

### CRITICAL Findings

**[CL-C1]**  
Severity: CRITICAL  
File: `frontend/src/utils/epsaEngine.js` / `frontend/src/config/calculatorConfig.js`  
Line: Engine line 33; config line 62  
Issue: The engine header states "23 csPCa GG≥3" and `calculatorConfig.js` sets `targetLabel: 'Higher-grade cancer risk (GG≥3)'`. The internationally accepted AUA/SUO 2026, NCCN 2026, and ERSPC definition of clinically significant prostate cancer (csPCa) is **GG≥2** (Gleason 3+4 = intermediate risk). Using GG≥3 as the training outcome means the model's validation figures do not apply to the standard csPCa definition. This limitation is not disclosed to clinicians or patients on any result screen.  
Fix: Add a displayed disclaimer on Part1Results, Part2Results, and QuickEpsaResult: *"This model was trained to detect Grade Group ≥3 cancer. The AUA/NCCN standard definition of clinically significant prostate cancer is Grade Group ≥2 (Gleason 3+4). Model performance may differ for Grade Group 2 detection."* Update `targetLabel` in calculatorConfig.js to reflect this distinction. This is a material clinical limitation.

---

### WARNING Findings

**[CL-W1]**  
Severity: WARNING  
File: `frontend/src/utils/epsaEngine.js`  
Line: 386–405  
Issue: Age 40–44 average-risk men can receive a `score_threshold` PSA recommendation. AUA/SUO 2026 Statement 5 restricts routine screening before age 45 to men with Black ancestry, BRCA2, or a first-degree relative with prostate cancer.  
Fix: For age 40–44, restrict `recommendPSA = true` to cases where `isBlack || brcaPositive || fhBinary === 1`. Score-threshold-only at this age without a high-risk anchor must resolve to `recommendPSA = false`.

**[CL-W2]**  
Severity: WARNING  
File: `frontend/src/utils/epsaEngine.js`  
Line: 720–726  
Issue: Age 45–49 "baseline PSA offer" sets `recommendPSA = true` — same visual weight as a strong recommendation. AUA/SUO 2026 Statement 4 is a Conditional/Grade B offer, not equivalent to a positive recommendation.  
Fix: Introduce a distinct value (e.g., `recommendPSA = 'sdm'`) or a separate `baselinePsaOffer` boolean. The banner styling for `baseline_psa_45_50` should use info-blue, not the same weight as a strong recommendation.

**[CL-W3]**  
Severity: WARNING  
File: `frontend/src/utils/epsaEngine.js`  
Line: 1099–1104 and 1216–1221  
Issue: PSA scoring tier boundary uses **3.0 ng/mL** as the intermediate-high entry point, but `AUA_PSA_THRESHOLDS.age50_69.threshold` in the same file is **3.5 ng/mL** (line 73). A PSA of 3.1 ng/mL is scored as intermediate-high by the point system but below the AUA referral threshold. Internal inconsistency. Same boundary error appears in the discordance text mapping at line 1216.  
Fix: Align both PSA tier mappings to use 3.5 ng/mL as the intermediate-high entry point, matching `AUA_PSA_THRESHOLDS`.

**[CL-W4]**  
Severity: WARNING  
File: `frontend/src/components/QuickEpsaFlow.jsx`  
Line: 33–37  
Issue: `deriveIpss(qol)` maps QoL=3 ("Mixed feelings") → IPSS total of 21 (severe range). Published data (Barry et al., J Urol 1992) shows QoL=3 typically corresponds to moderate IPSS (8–19). This causes patients with mixed/moderate symptoms to be scored as severe, adding up to 8 unjustified points.  
Fix: Revise mapping: QoL 3–4 → `[2,2,2,2,2,2,2]` (total 14, moderate), QoL 5 → `[3,3,3,3,3,3,3]` (total 21), QoL 6 → `[5,5,5,5,5,5,5]` (total 35). Add citation.

**[CL-W5]**  
Severity: WARNING  
File: `frontend/src/components/QuickEpsaFlow.jsx`  
Line: 391  
Issue: Citation says "Score ≥3 warrants clinical evaluation." The validated AUA/WHO IPSS threshold for moderate symptoms is **≥8**, not ≥3.  
Fix: Change citation to: "IPSS 0–7: mild; 8–19: moderate; 20–35: severe. (AUA/WHO validated)"

**[CL-W6]**  
Severity: WARNING  
File: `frontend/src/components/QuickEpsaFlow.jsx`  
Line: 171  
Issue: Bus mode welcome screen says "Men ages 45–79." The engine supports ages up to 75; patients over 75 receive a full tier card without any SDM caveat because `QuickEpsaResult` does not check `result.aboveMaxScreeningAge`.  
Fix: (a) Change age range text to "45–75"; (b) in `QuickEpsaResult`, check `result.aboveMaxScreeningAge` and display SDM-required notice instead of a tier card for these patients.

**[CL-W7]**  
Severity: WARNING  
File: `frontend/src/components/Part1Results.jsx` / `Part2Results.jsx`  
Line: Part1 line 962; Part2 line 922  
Issue: N=100 (training cohort) and N=94 (validation cohort) are used interchangeably in public-facing text. These are distinct: N=94 is the biopsied validation denominator.  
Fix: Use "N=94 (biopsied referral cohort, GG≥3 outcome, 23 events)" for all external-facing validation statements. Remove N=100 from patient-facing UI.

**[CL-W8]**  
Severity: WARNING  
File: `frontend/src/utils/epsaEngine.js`  
Line: 658–676  
Issue: Coronary artery disease (CAD) is included in the comorbidity bundle with no prostate cancer–specific citation. CAD is a cardiovascular comorbidity, not a standard component of metabolic syndrome used in referenced papers.  
Fix: Either remove CAD from the comorbidity bundle or add a specific citation linking CAD to PCa risk.

**[CL-W9]**  
Severity: WARNING  
File: `frontend/src/components/QuickEpsaFlow.jsx`  
Line: 244–246  
Issue: `comorbidityScore: 0` is hard-coded for all bus-mode patients with no disclosure. Patients with multiple cardiometabolic conditions have up to 20 points omitted from their score.  
Fix: Add disclosure in results: *"This estimate does not include comorbidity data — if you have multiple health conditions, your actual score may be higher."*

**[CL-W10]**  
Severity: WARNING  
File: `frontend/src/components/Part2Results.jsx`  
Line: 812  
Issue: SDM section for age 70+ shows threshold "3.0 ng/mL" for continue-vs.-discontinue decision. The engine's `AUA_PSA_THRESHOLDS.age70plus.threshold` is **6.5 ng/mL**. A 3.5 ng/mL discrepancy between UI display and engine logic.  
Fix: Change "threshold 3.0 ng/mL" to "threshold 6.5 ng/mL" per `AUA_PSA_THRESHOLDS.age70plus` and AUA/SUO 2026 Statement 8.

---

### INFO Findings

**[CL-I1]** `epsaEngine.js:763–766` — Age 70–75 SDM override blocked if `score_threshold` fires first; SDM caveat disappears for high-scoring older patients.  
**[CL-I2]** `epsaEngine.js:1122–1126` — PI-RADS 3 adds 15 points without PSAD/PSA threshold context per EAU 2024 (PSAD ≥0.15 ng/mL/cm³).  
**[CL-I3]** `epsaEngine.js:646–656` — Single-item SHIM proxy (bus mode) not disclosed in result; Q1 proxy score is replicated ×5 which may over- or under-score depending on symptom pattern.  
**[CL-I4]** `Part1Results.jsx:1094–1102` — Educational disclaimer collapsed by default; non-diagnostic language not visible on result load.  
**[CL-I5]** `QuickEpsaResult.jsx:107` — Bus mode disclaimer omits validated-vs-research variable distinction.  
**[CL-I6]** `Part1Results.jsx:51–53` — Genetic mutations (BRCA2) labelled "Research-based"; should be "AUA/SUO 2026" per Statement 5.  
**[CL-I7]** `QuickEpsaFlow.jsx:244–246` — Inflammation history and chemical exposure hard-coded to 0/no with no user disclosure.  
**[CL-I8]** `QuickEpsaResult.jsx:69` — Score-threshold results labelled "AUA/SUO 2026 Guideline Recommendation" — inaccurate for model-driven recommendations.  
**[CL-I9]** `Part1Results.jsx:877` — Guideline deviation banner rendered between risk card and PSA CTA, disrupting clinical flow.  
**[CL-I10]** `Part2Results.jsx:508–512` — Warning-level guardrails (PSAD + PI-RADS ≥4) buried below action buttons; clinically significant warnings should appear above.  
**[CL-I11]** `Part2Results.jsx:767` — AUA guideline journey open by default for all tiers, creating very long page for low-risk patients.  
**[CL-I12]** `epsaEngine.js:1086–1096` — 5-ARI ×2 correction correctly implemented per REDUCE trial. No issue.

---

## 4. AGENT 3 — Security & Vulnerability

### CRITICAL Findings

**[S-C1]**  
Severity: CRITICAL  
File: `admin-dashboard/src/config/adminFirebase.js`  
Line: 16–24  
Issue: Full Firebase project config including `apiKey`, `appId`, `messagingSenderId` hardcoded in source (project `epsa-30d0b`). The main frontend app correctly uses `VITE_*` env vars; the admin dashboard bypasses this entirely.  
Fix: Move all values to `VITE_*` environment variables. Restrict the API key in Firebase Console to only the admin dashboard's deployed domain.

**[S-C2]**  
Severity: CRITICAL  
File: `frontend/src/utils/redcapSubmit.js`  
Line: 11–12  
Issue: `VITE_REDCAP_API_TOKEN` is inlined at build time and appears in plain text in the compiled JS bundle. The REDCap API token is a full-access credential for the clinical research database (IRB STUDY-14-00050). Anyone who downloads the JS bundle can extract it and directly manipulate research records.  
Fix: REDCap submissions must go through a backend Cloud Function. The frontend calls `httpsCallable`; the token is stored in Firebase Functions environment secrets (`firebase functions:secrets:set REDCAP_TOKEN`). The token must never reach the browser.

**[S-C3]**  
Severity: CRITICAL  
File: `backend/src/index.ts`  
Line: 136–168  
Issue: Rate limiting uses a module-level `Map` (`rateLimitCache`). Cloud Functions are stateless; each instance has its own empty map. Multiple concurrent warm instances each maintain independent maps. The rate limit is not globally enforced — attackers can bypass it by triggering concurrent requests across instances.  
Fix: Replace with Firestore TTL documents (`rateLimits/{uid}`) with counter and window start timestamp, or enforce with Firebase App Check.

**[S-C4]**  
Severity: CRITICAL  
File: `backend/src/index.ts`  
Line: 465–501  
Issue: IDOR — `getUser` allows any authenticated user to fetch any other user's data. (Cross-reference H-C10.)  
Fix: See H-C10.

**[S-C5]**  
Severity: CRITICAL  
File: `frontend/src/services/firestoreService.js`  
Line: 26–62  
Issue: Raw phone number written to Firestore from client. (Cross-reference H-C2.)  
Fix: See H-C2.

**[S-C6]**  
Severity: CRITICAL  
File: `database.rules.json`  
Issue: Realtime Database rules are `".read": "auth != null", ".write": "auth != null"` — granting every authenticated user (including anonymous users from `signInAnonymously()`) read and write access to the entire database.  
Fix: Lock the Realtime Database completely unless actively used: `{ "rules": { ".read": false, ".write": false } }`.

---

### WARNING Findings

**[S-W1]**  
Severity: WARNING  
File: `backend/src/index.ts`  
Line: 1786–1808  
Issue: `npiProxy` HTTP Cloud Function has no authentication. Can be abused as an open relay billed to the Firebase project.  
Fix: Add origin validation against allowlist. Consider requiring a Firebase ID token.

**[S-W2]**  
Severity: WARNING  
File: `backend/src/index.ts`  
Line: 1143–1145  
Issue: `getUsersWithConsent` returns `...doc.data()` (entire document spread) including `phoneHash` and potentially a `phone` field.  
Fix: Use an explicit field allowlist. Exclude any `phone` or raw PII fields.

**[S-W3]**  
Severity: WARNING  
File: `frontend/src/components/UniversalAuth.jsx`  
Line: 46–53  
Issue: Session ID generation uses `Math.random()` — not cryptographically secure. 8-character alphanumeric from a predictable PRNG reduces effective entropy.  
Fix: Use `crypto.getRandomValues()`.

**[S-W4]**  
Severity: WARNING  
File: `backend/package.json`  
Line: 22  
Issue: `firebase-admin: ^11.11.0` — current major version is 13.x. Running an outdated Admin SDK misses security patches.  
Fix: Upgrade to `firebase-admin@^13` and `firebase-functions@^6`.

**[S-W5]**  
Severity: WARNING  
File: `backend/src/index.ts`  
Line: 1707–1737  
Issue: Audit logs deleted after 365 days; HIPAA requires 6-year retention. (Cross-reference H-W12.)

**[S-W6]**  
Severity: WARNING  
File: `backend/src/index.ts`  
Line: 1403–1413  
Issue: SHA256 hash of encryption key stored alongside ciphertext — enables brute-force key recovery. (Cross-reference H-W15.)

**[S-W7]**  
Severity: WARNING  
File: `frontend/src/services/firestoreService.js` / `frontend/src/components/UniversalAuth.jsx`  
Issue: Direct Firestore client writes to `users` and `sessions` bypass server-side validation. (Cross-reference H-W18.)

**[S-W8]**  
Severity: WARNING  
File: `frontend/src/services/firestoreService.js`  
Line: 14–21  
Issue: Phone hashed client-side with plain (unsalted) SHA256. Vulnerable to rainbow table attacks on common numbers.  
Fix: Use a keyed HMAC (`CryptoJS.HmacSHA256(phone, serverKey)`) with the key stored server-side only.

---

### INFO Findings

**[S-I1]** Frontend Firebase config correctly uses `VITE_*` env vars. `.gitignore` correctly excludes `.env` files.  
**[S-I2]** No `axios` or `lodash` in use — no associated CVEs.  
**[S-I3]** `firebase@^12.9.0` (current), `vite@^5.0.8` (5.0.x has patches; upgrade to 5.4.x), `react@^18.2.0` (minor update to 18.3.x advisable), `html2canvas@^1.4.1` (stale 2022 release, no active CVEs).  
**[S-I4]** `calculatorConfig/published` is publicly readable without auth (intentional, no secrets should reside there).  
**[S-I5]** `auditLogs` cannot be written by clients — write is `allow: false`. Correct.  
**[S-I6]** CSRF not applicable — all mutations use Firebase ID tokens in Authorization header, not cookies.  
**[S-I7]** No `dangerouslySetInnerHTML` found. CSV export properly escapes double-quotes. No XSS vectors identified.  
**[S-I8]** `firebase-functions@^4.5.0` — current is v6.x; upgrade recommended alongside firebase-admin.

---

## 5. AGENT 4 — UI, Accessibility & Clinical UX

### CRITICAL Findings

**[UX-C1]**  
Severity: CRITICAL  
File: `frontend/src/components/Part1Form.jsx`  
Line: 515 (age), 749–750 (height), 778–780 (weight)  
Issue: Numeric `<input>` elements have no associated `<label>` element — only a `.question-text` div that is not programmatically linked. Screen readers cannot announce the field name when focus lands on the input.  
Fix: Use `<FormField id="age" label={...}>` pattern (which already handles this) or add `<label htmlFor="age-input">` + `id="age-input"` on every input.

**[UX-C2]**  
Severity: CRITICAL  
File: `frontend/src/components/Part2Form.jsx`  
Line: 157 (PSA value), 193 (Prostate Volume)  
Issue: Same missing `<label>` association as UX-C1.  
Fix: Same fix as UX-C1.

**[UX-C3]**  
Severity: CRITICAL  
File: `frontend/src/components/Part1Form.jsx`  
Line: 567–576 and throughout all option-button groups (race, FH, exercise, smoking, diet, etc.)  
Issue: Option buttons are styled as radio selections but have no `role="radio"`, no `aria-checked`, and no `role="radiogroup"` wrapper. Screen readers announce them as plain buttons with no selection state.  
Fix: Add `role="radiogroup"` to the container and `role="radio"` + `aria-checked={value === selected}` to each button. The `Chips` component in `QuickEpsaFlow.jsx` (lines 44–52) does this correctly — use that pattern.

**[UX-C4]**  
Severity: CRITICAL  
File: `frontend/src/components/Part2Form.jsx`  
Line: 354–368  
Issue: PI-RADS option buttons use `aria-pressed` (a toggle state) instead of `aria-checked` + `role="radio"`. This is semantically wrong — PI-RADS is a single-select, not a multi-toggle.  
Fix: Remove `aria-pressed`; add `role="radio"` + `aria-checked` within a `role="radiogroup"` wrapper.

**[UX-C5]**  
Severity: CRITICAL  
File: `frontend/src/components/Part2Results.jsx`  
Line: 918  
Issue: "Important Disclaimer" `CollapsibleSection` has no `defaultOpen` prop — defaults to closed. The non-diagnostic, educational-only language is invisible unless the user actively expands the section. Same issue in Part1Results at line 1094.  
Fix: Set `defaultOpen={true}` on the "Important Disclaimer" CollapsibleSection in both Part1Results and Part2Results.

**[UX-C6]**  
Severity: CRITICAL  
File: `frontend/src/App.jsx`  
Line: 1318  
Issue: `handlePart1Next` calls `alert('Please complete all required fields...')`. Native `alert()` is inaccessible (cannot be styled, blocks JS execution), breaks in kiosk/WebView environments, and is unprofessional in a clinical tool. The form already manages `formErrors` state for inline display.  
Fix: Remove the `alert()` call. The `handleSubmit` in Part1Form.jsx already sets `formErrors` and scrolls to the first error.

**[UX-C7]**  
Severity: CRITICAL  
File: `frontend/src/App.jsx`  
Line: 959, 1056  
Issue: `alert()` used for import/session-restore errors in clinical flow.  
Fix: Replace with `role="alert"` inline error elements in `DataImportScreen`.

**[UX-C8]**  
Severity: CRITICAL  
File: `frontend/src/components/Part1Results.jsx`  
Line: 1085  
Issue: `alert(t('part1Results.exportFailedAlert'))` used for export failure.  
Fix: Replace with inline error message element.

**[UX-C9]**  
Severity: CRITICAL  
File: `frontend/src/components/Part1Form.jsx`  
Line: 970–983  
Issue: BRCA question has no plain-language explanation visible without opening an InfoIcon tooltip. "BRCA mutation" is specialist jargon inaccessible to most patients.  
Fix: Add visible subtext: *"Some people carry gene changes (like BRCA1 or BRCA2) that raise prostate cancer risk. Have you ever had genetic testing?"*

**[UX-C10]**  
Severity: CRITICAL  
File: `frontend/src/components/Part2Form.jsx`  
Line: 283–285  
Issue: PI-RADS question has no plain-language explanation in the card body. PI-RADS is specialist radiology jargon.  
Fix: Add subtext: *"PI-RADS is a 1–5 score from your MRI report — 1 is reassuring, 5 means something strongly needs follow-up."*

---

### WARNING Findings

**[UX-W1]** `Part1Form.jsx:526` — Error color `#E74C3C` used alone without icon/text prefix. Fails red-green color blind users. Fix: Add `<AlertCircleIcon aria-hidden="true" />` prefix.  
**[UX-W2]** `RiskGauge.jsx:61` — `#d97706` (intermediate tier) on white background = ~2.8:1 contrast ratio, fails WCAG AA 4.5:1. Fix: Darken to `#7c4a00` or equivalent.  
**[UX-W3]** `Part1Results.jsx:329` / `Part2Results.jsx:133` — `GuidelineSupportBadge` uses `role="img"` on a focusable interactive element. Fix: Use `role="button"` or no role; associate tooltip via `aria-describedby`.  
**[UX-W4]** `App.jsx:1954` — Logout button has `title` attribute only, no `aria-label`. Fix: Add `aria-label="Logout from current session"`.  
**[UX-W5]** `HipaaCompliancePopup.jsx` — Modal does not trap focus; keyboard users can tab behind the backdrop. Fix: Add focus trap matching the pattern in `WelcomeScreen.jsx`.  
**[UX-W6]** `QuickEpsaFlow.jsx:514` — Sticky footer submit button has no guaranteed 48px min-height for touch targets. Fix: Add `min-height: 48px` to `.qef-submit-btn`.  
**[UX-W7]** `Part1Form.jsx:1065` — `btn-calculate` sticky button may be under 48px. Fix: Ensure `min-height: 48px` in CSS.  
**[UX-W8]** `Part1Form.jsx` (throughout) — Hardcoded `#27AE60` and `#E74C3C` bypass the design token system. Fix: Replace with `var(--success-600)` and `var(--error-600)`.  
**[UX-W9]** `Part1Results.jsx:963` — Internal model performance stats (AUC=0.56, N=100) are visible to patients. AUC=0.56 will alarm clinically-informed users. Fix: Move behind clinician/admin toggle or Model Documentation section.  
**[UX-W10]** `Part2Form.jsx:261` — Warning text color `#F39C12` on white = ~2.5:1 contrast ratio, fails WCAG AA for text at 12px. Fix: Darken to `#7a4a00` or `var(--gold-600)`.  
**[UX-W11]** `Part2Form.jsx:397` — Null `preResult` error box has no `role="alert"`. Fix: Add `role="alert"` to the error container.  
**[UX-W12]** `App.jsx:1788` — Null `preResult` fallback renders 12px grey text with no recovery button. Fix: Increase to 14px minimum; add "Start Over" button.  
**[UX-W13]** `Part2Form.jsx:190` — "Prostate Volume (mL)" is hardcoded English with no i18n key and no helper text explaining where to find the value. Fix: Add i18n key and sublabel.  
**[UX-W14]** `QuickEpsaFlow.jsx:484` — SHIM question must use plain language. Confirm translation renders as "How would you describe your sexual function?" not the clinical acronym.  
**[UX-W15]** `Part1Results.jsx:601` — Null-result state has no recovery action button inside the alert box. Fix: Add visible "Start Over" or "Go Back" button.

---

### INFO Findings

**[UX-I1]** `WelcomeScreen.jsx:236` — `<a href="/demo">Watch demo</a>` is likely a dead link in production. Fix: Convert to button opening a video modal.  
**[UX-I2]** `index.css` — No explicit `font-size: 16px` on `body`. Fix: Add `font-size: 16px; line-height: 1.5;`.  
**[UX-I3]** `QuickEpsaFlow.css` — Question list may need `padding-top` to clear the sticky progress bar on short viewports.  
**[UX-I4]** `riskColors.js` — `#D4AF37` (moderate gold) on white = ~2.4:1, fails if used as foreground text color.  
**[UX-I5]** QuickEpsaFlow/Result — Bus mode uses hardcoded hex colors instead of app CSS variable tokens, causing subtle visual inconsistency with the main app.

---

## 6. AGENT 5 — Code Quality & Architecture

### CRITICAL Findings

**[CQ-C1]**  
Severity: CRITICAL  
File: `frontend/src/App.jsx`  
Line: ~1316 (Part 2 submit handler)  
Issue: `calculateDynamicEPsaPost` is called without a null-guard on `preResult`. If `preResult` is null (corrupted session restore, mid-session error), the combined score is computed with `prePoints: 0` — silently wrong. The clinical result may recommend PSA testing or biopsy based only on Part 2 PSA data.  
Fix: Add `if (!preResult) { showError('Part 1 results not found. Please restart.'); return; }` before calling `calculateDynamicEPsaPost`.

**[CQ-C2]**  
Severity: CRITICAL  
File: No test file  
Issue: The 5-ARI PSA correction (`psaAdjusted = psaVal * 2` for finasteride/dutasteride) has zero test coverage. A coefficient typo or regression would be clinically invisible — 5-ARI patients' PSA is systematically under-read without this correction.  
Fix: Add test: `{ onHormonalTherapy: true, hormonalTherapyType: 'finasteride', psa: 3.0 }` → `psaAdjusted === 6.0`, `psaAdjustedFlag === true`.

**[CQ-C3]**  
Severity: CRITICAL  
File: No test file  
Issue: `calcHighGradeRisk(pirads, psa)` uses a logistic regression formula (`-4.7205 + 0.6478*PIRADS + 0.5141*ln(PSA+0.01)`) with zero unit tests. Any coefficient typo is invisible.  
Fix: Add unit tests for at least 5 known input/output pairs covering PI-RADS 1–5 and PSA ranges.

---

### WARNING Findings

**[CQ-W1]**  
Severity: WARNING  
File: `frontend/src/utils/epsaEngine.test.js`  
Line: 179  
Issue: Test asserts `'> = 4.0 ng/mL'` as a valid `riskPct` value. The engine emits `'>= 10.0 ng/mL'` for the high tier. Stale test value will never match; it masks potential regressions.  
Fix: Replace `'>= 4.0 ng/mL'` with `'>= 10.0 ng/mL'`.

**[CQ-W2]**  
Severity: WARNING  
File: `frontend/src/components/Part2Results.jsx`  
Line: 353  
Issue: `PSA_TIER_I18N_KEY` lookup map uses camelCase keys (`intermediateLow`, `intermediateHigh`) but `psaTierLower` is computed as hyphenated lowercase (`'intermediate-low'`). The key `'intermediate-low'` never matches any entry; intermediate-low PSA patients silently fall back to the intermediate-high label.  
Fix: Change map keys to hyphenated form: `'intermediate-low': 'intermediateLow'`, `'intermediate-high': 'intermediateHigh'`.

**[CQ-W3]**  
Severity: WARNING  
File: `frontend/src/components/PreResults.jsx`  
Issue: Dead component — never imported in the main app. Contains two debug `console.log` statements. Uses a stale result shape.  
Fix: Delete `PreResults.jsx` and `PreResults.css`.

**[CQ-W4]**  
Severity: WARNING  
File: `frontend/src/utils/epsaEngine.js`  
Lines: 840–850 vs 1179–1200  
Issue: Dual tier key format in active use: Model 1 emits `LOWER/MODERATE/HIGHER`; Model 2 emits `low/intermediate-low/intermediate-high/high`. Components maintain dual-format checks (e.g., `key === 'low' || key === 'LOWER'`). Ongoing maintenance burden.  
Fix: Normalize Model 1 output to use the Model 2 key scheme. Remove all dual-format checks from components.

**[CQ-W5]**  
Severity: WARNING  
File: `frontend/src/utils/pathwayAndExport.test.js`  
Line: 116–117  
Issue: Entire `describe.skip('Golden Part 1 profiles')` block is permanently skipped. The golden baseline values are from a pre-commit era. No regression protection on exact score values.  
Fix: Re-run the engine with current production config, capture actual output, replace expected values, remove `describe.skip`.

**[CQ-W6]**  
Severity: WARNING  
Files: `Part1Results.jsx` and `Part2Results.jsx`  
Issue: `CollapsibleSection`, `GuardrailBanner`, and `GuidelineSupportBadge` are defined independently in both files with near-identical implementations. Bug fixes must be applied twice.  
Fix: Extract all three into `frontend/src/components/shared/`.

**[CQ-W7]**  
Severity: WARNING  
Files: `Part1Results.jsx` (line 28) and `Part2Results.jsx` (line 26)  
Issue: `useCountUp` and `useCountUpFloat` animation hooks are near-identical and defined separately in each file.  
Fix: Merge into a single `useCountUp(target, { decimals, duration, delay })` hook in `frontend/src/hooks/useCountUp.js`.

**[CQ-W8]**  
Severity: WARNING  
File: `frontend/src/App.jsx`  
Line: 707, 743, 752, 756, 858, 952  
Issue: `console.log('[AuthFlow]...')` statements print user UID and authentication state to the browser console, visible to any user who opens DevTools.  
Fix: Remove or gate with `if (import.meta.env.DEV)`.

**[CQ-W9]**  
Severity: WARNING  
Files: `Part2Results.jsx` (lines 477–502, 448–470)  
Issue: UI strings hardcoded in English; not i18n-ready. Equivalent strings in Part1Results use translation keys.  
Fix: Move all Part2Results UI strings to `part2Results.*` i18n keys.

**[CQ-W10]**  
Severity: WARNING  
File: `frontend/src/utils/epsaEngine.js`  
Issue: Quick ePSA scoring mappings (`deriveIpss`, `deriveBmi`) and the resulting score tier have zero test coverage, despite being a distinct clinical code path.  
Fix: Add dedicated tests for `deriveIpss()` and `deriveBmi()` with at least boundary values.

---

### INFO Findings

**[CQ-I1]** `epsaEngine.js` — `calcHighGradeRisk` exported but only called internally. Remove `export` keyword.  
**[CQ-I2]** `epsaEngine.js:1446` — `calculateActiveSurveillance` always returns null and calls `console.error`. Add `@deprecated` JSDoc and `throw` instead of `return null`.  
**[CQ-I3]** `epsaEngine.js:948` — `empiricalProbabilityText: null` retained for caller compatibility but never used. Remove from both return objects.  
**[CQ-I4]** `epsaEngine.js:1341` — `psaVal >= 4.0` without explicit null-guard (null coerces to 0 in JS; currently safe but a footgun). Add `psaVal != null &&` guard.  
**[CQ-I5]** `Part2Results.jsx:264` — `useCountUpFloat` returns early for `n <= 0`, so PSA=0 animation is skipped. Change to `n < 0`.  
**[CQ-I6]** Components over 500 lines: `App.jsx` (2181), `Part1Results.jsx` (1107), `Part1Form.jsx` (1083), `Part2Results.jsx` (935), `QuickEPsaEntry.jsx` (690), `PrintableForm.jsx` (616).  
**[CQ-I7]** Missing edge-case tests: BRCA2 age 40, age 75 vs 76 boundary, PSA=0.1 with PI-RADS 4 + Black race, `checkGuardrails` PSA>100, multi-lesion PI-RADS (pick max), 5-ARI with `hormonalTherapyType: 'other'`.

---

## 7. AGENT 6 — Performance & Production Readiness

### CRITICAL Findings

**[PR-C1]**  
Severity: CRITICAL  
File: All `frontend/src/`  
Issue: No error monitoring service (Sentry, Datadog, etc.) is integrated. `ErrorBoundary.componentDidCatch` (line 13–16) only logs to `console.error` in `DEV` mode — it is completely silent in production. Uncaught errors, unhandled promise rejections, and Firebase call failures in production are invisible to the team.  
Fix: Integrate Sentry. In `index.jsx`: `Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, environment: import.meta.env.MODE })`. Update `ErrorBoundary.componentDidCatch` to call `Sentry.captureException(error, { contexts: { react: errorInfo } })` unconditionally.

**[PR-C2]**  
Severity: CRITICAL  
File: `frontend/src/config/firebase.js`  
Issue: Firestore offline persistence is not enabled. The bus mode runs on mobile with poor signal. When Firebase is unreachable, any Firestore read/write fails with `FirebaseError: Failed to get document because the client is offline`. Session saves, consent writes, and session restores all fail. The Quick ePSA flow will break mid-screening.  
Fix: Replace `getFirestore(app)` with:
```js
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
```

---

### WARNING Findings

**[PR-W1]**  
Severity: WARNING  
File: `frontend/src/App.jsx`  
Line: 6–40  
Issue: No code splitting or lazy loading. All 30+ components are statically imported and shipped in the initial bundle, including `ModelDocs`, `DataImportScreen`, `SinaiConsentScreen`, `SinaiResultsScreen`, `FirebaseTestPanel`, and `Part2Form/Results`. Most users never reach these screens.  
Fix: Convert to `React.lazy()` + `<Suspense>` for all route-level and modal-level components.

**[PR-W2]**  
Severity: WARNING  
File: `frontend/vite.config.js`  
Line: 17–28  
Issue: `manualChunks` only splits Firebase. `recharts` (~300 kB gzipped), `html2canvas` + `jspdf` (~400 kB), `qrcode` are all bundled into the main chunk.  
Fix: Add manual chunks for `charts: ['recharts']`, `pdf: ['jspdf', 'html2canvas']`, `qr: ['qrcode']`.

**[PR-W3]**  
Severity: WARNING  
File: `.github/workflows/firebase-deploy.yml`  
Issue: No staging environment. Every merge to `main` deploys directly to production with no human gate.  
Fix: Add a Firebase `staging` target or a second Firebase project with a manual-approval gate before production deploy.

**[PR-W4]**  
Severity: WARNING  
File: `frontend/src/components/ErrorBoundary.jsx`  
Line: 13–16  
Issue: `componentDidCatch` is completely silent in production (guarded by `if (import.meta.env?.DEV)`). Caught render errors are swallowed with no reporting.  
Fix: Remove the `DEV` guard. Add error monitoring call unconditionally. See PR-C1.

**[PR-W5]**  
Severity: WARNING  
File: `frontend/src/services/firestoreService.js`  
Lines: 26–180  
Issue: None of the exported Firestore service functions have try/catch. PHI write functions (`createOrUpdateUser`, `createSession`) can throw unhandled exceptions.  
Fix: Add try/catch to each exported function.

**[PR-W6]**  
Severity: WARNING  
File: `frontend/public/manifest.json` / `frontend/src/`  
Issue: `manifest.json` declares `display: standalone` (installable PWA) but no service worker is registered. An installed app with no network will fail to load completely. `favicon.ico` referenced in manifest does not exist in `frontend/public/`.  
Fix: Add `vite-plugin-pwa` with a Workbox cache strategy for the app shell. Add `favicon.ico` or update the manifest to reference `logo.png`.

**[PR-W7]**  
Severity: WARNING  
File: `frontend/vite.config.js`  
Line: 15  
Issue: `sourcemap: true` in production build deploys full source maps to Firebase Hosting, exposing the complete original source code (including proprietary risk model logic in `dynamicCalculator.js`) to anyone who opens DevTools.  
Fix: Change to `sourcemap: 'hidden'`.

**[PR-W8]**  
Severity: WARNING  
File: `frontend/vite.config.js`  
Lines: 57–59  
Issue: `define: { 'process.env': process.env }` exposes the entire Node.js `process.env` to the browser bundle, potentially including CI runner environment variables.  
Fix: Replace with explicit allowlist: `define: { 'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV) }`.

**[PR-W9]**  
Severity: WARNING  
File: `.github/workflows/firebase-deploy.yml`  
Line: 50–58  
Issue: Admin dashboard is built in CI without Firebase env vars injected; may produce a broken admin build.  
Fix: Inject `VITE_FIREBASE_*` env vars in the admin build step.

**[PR-W10]**  
Severity: WARNING  
File: `frontend/src/App.jsx`  
Line: 2083  
Issue: `FirebaseTestPanel` is imported and rendered in production with no `import.meta.env.DEV` guard. If `showTestPanel` is ever `true` in production, it exposes Firestore test operations to end users.  
Fix: Add `{import.meta.env.DEV && showTestPanel && <FirebaseTestPanel />}` and move the import inside the guard.

---

### INFO Findings

**[PR-I1]** `frontend/package.json` — `pdfjs-dist@^5.5.207` (~2.5 MB) listed as dependency but no import found in `src/`. Verify it is used; if not, remove.  
**[PR-I2]** `PrintableForm.jsx` — `html2canvas` and `jspdf` statically imported; should be dynamic imports inside the export handler.  
**[PR-I3]** All `lucide-react` imports use named individual imports — tree-shaking is correct. No issue.  
**[PR-I4]** Firebase SDK imported modularly — correct for tree-shaking. No issue.  
**[PR-I5]** No documented rollback procedure. Firebase Hosting supports `firebase hosting:clone` — add a `workflow_dispatch` rollback job.

---

## 8. QUICK WIN LIST
*All INFO-level items fixable in under 30 minutes:*

| # | File | Change |
|---|------|--------|
| 1 | `Part1Results.jsx:1094` | Set `defaultOpen={true}` on Important Disclaimer collapsible |
| 2 | `Part2Results.jsx:918` | Set `defaultOpen={true}` on Important Disclaimer collapsible |
| 3 | `epsaEngine.test.js:179` | Replace `'>= 4.0 ng/mL'` with `'>= 10.0 ng/mL'` |
| 4 | `Part2Results.jsx:353` | Fix `PSA_TIER_I18N_KEY` map keys to use hyphenated lowercase |
| 5 | `App.jsx:1954` | Add `aria-label="Logout from current session"` to logout button |
| 6 | `App.jsx:707` etc. | Wrap `[AuthFlow]` console.log calls in `if (import.meta.env.DEV)` |
| 7 | `database.rules.json` | Change to `".read": false, ".write": false` |
| 8 | `Part2Results.jsx:812` | Change "threshold 3.0 ng/mL" to "threshold 6.5 ng/mL" |
| 9 | `App.jsx:119–125` | Delete `urlEmail` URL parameter code (legacy, already commented as removed) |
| 10 | `epsaEngine.js:948` | Remove `empiricalProbabilityText: null` from both return objects |
| 11 | `epsaEngine.js:1411` | Remove or use `mriRecommendReason` from post-engine return object |
| 12 | `index.css` | Add `font-size: 16px; line-height: 1.5;` to `body` |
| 13 | `PreResults.jsx` | Delete dead file and its CSS |
| 14 | `manifest.json` | Fix icon reference from `favicon.ico` to `logo.png` |
| 15 | `Part1Results.jsx:51–53` | Add `'Genetic mutation'` to `AUA_SUO_FACTORS` set |
| 16 | `QuickEpsaResult.jsx:69` | Show "ePSA Model Recommendation" label when reason is `score_threshold` |
| 17 | `vite.config.js:15` | Change `sourcemap: true` to `sourcemap: 'hidden'` |
| 18 | `App.jsx:2083` | Add `import.meta.env.DEV &&` guard around `FirebaseTestPanel` render |
| 19 | `Part2Results.jsx:264` | Change `if (n <= 0) return;` to `if (n < 0) return;` in useCountUpFloat |
| 20 | `QuickEpsaFlow.jsx:391` | Fix IPSS citation: "Score ≥8 for moderate symptoms" (not ≥3) |

---

## 9. PRE-DEPLOYMENT CHECKLIST

### Legal & Compliance
- [ ] Google Cloud HIPAA BAA signed and documented for Firebase project `epsa-30d0b`
- [ ] `getAnalytics(app)` removed from `firebase.js` — Firebase Analytics may not be used with PHI
- [ ] Privacy policy placeholder text replaced with final, legally reviewed content
- [ ] IRB documentation confirms that `SinaiConsentScreen` forced `researchConsent: true` is acceptable
- [ ] Data retention policy reviewed: audit log retention increased from 1 year to 6 years

### PHI Security
- [ ] Raw `phone` field removed from `createOrUpdateUser()` in `firestoreService.js`
- [ ] `buildASToolURL()` — PHI removed from URL query params; postMessage or token exchange used
- [ ] `urlEmail` URL parameter code deleted from `App.jsx`
- [ ] REDCap API token moved from `VITE_REDCAP_API_TOKEN` to Firebase Functions secret
- [ ] `getUser` Cloud Function — IDOR fixed with ownership/admin check
- [ ] Realtime Database rules locked to `false/false`
- [ ] Admin dashboard Firebase config moved to `VITE_*` environment variables
- [ ] Phone hash salted with HMAC key (or hashing moved to server-side only)
- [ ] Rate limiting moved from in-memory `Map` to Firestore-backed or App Check

### Consent
- [ ] Bus flow (`?mode=bus`) shows consent screen before collecting any PHI
- [ ] File import flow shows consent screen before loading PHI
- [ ] ConsentScreen has an affirmative required checkbox
- [ ] Consent versioning implemented (hash comparison on each session start)
- [ ] HIPAA NPP accessible from ConsentScreen

### Clinical Accuracy
- [ ] GG≥3 vs GG≥2 limitation disclosed prominently on all result screens
- [ ] PSA tier boundary corrected to 3.5 ng/mL in scoring function (lines 1099–1104 and 1216–1221)
- [ ] QoL→IPSS proxy corrected (QoL=3 → moderate IPSS, not severe)
- [ ] Part2Results SDM age-70+ threshold corrected from 3.0 to 6.5 ng/mL
- [ ] Age 40–44 average-risk restriction enforced in recommendation logic
- [ ] Bus mode upper age corrected from 79 to 75; over-75 SDM caveat added
- [ ] Important Disclaimer open by default in both Part1Results and Part2Results

### Accessibility (WCAG 2.1 AA)
- [ ] All `<input>` elements in Part1Form and Part2Form have associated `<label>` elements
- [ ] All option-button groups use `role="radiogroup"` + `role="radio"` + `aria-checked`
- [ ] PI-RADS buttons use `role="radio"` + `aria-checked` (not `aria-pressed`)
- [ ] All `alert()` calls replaced with `role="alert"` inline elements
- [ ] `#d97706` intermediate tier color contrast tested and fixed (≥4.5:1)
- [ ] `#F39C12` warning text color darkened to pass WCAG AA
- [ ] HipaaCompliancePopup focus trap implemented
- [ ] All sticky buttons confirmed ≥48px min-height

### Production Infrastructure
- [ ] Sentry (or equivalent) error monitoring integrated and tested
- [ ] Firestore offline persistence enabled (`persistentLocalCache`)
- [ ] Service worker added for offline PWA support (bus mode)
- [ ] `sourcemap: 'hidden'` set in `vite.config.js` (not `true`)
- [ ] `process.env` passthrough removed from `vite.config.js`
- [ ] Firebase App Check enabled and enforced in production
- [ ] Staging environment created with manual approval gate before production

### Testing
- [ ] 5-ARI PSA correction (`psaAdjusted = psaVal * 2`) unit tested
- [ ] `calcHighGradeRisk` logistic regression unit tested with ≥5 known pairs
- [ ] Golden profile tests un-skipped and rebaselined
- [ ] Quick ePSA `deriveIpss()` and `deriveBmi()` unit tested
- [ ] Age 40 BRCA2 carrier edge case tested
- [ ] Age 75 vs 76 boundary tested

### Code Quality
- [ ] `PreResults.jsx` deleted (dead component)
- [ ] Null-guard added before `calculateDynamicEPsaPost` call in App.jsx
- [ ] `useCountUpFloat` fix: `n < 0` not `n <= 0`
- [ ] `[AuthFlow]` console.log statements gated on `DEV` or removed
- [ ] `FirebaseTestPanel` import and render guarded by `import.meta.env.DEV`
- [ ] `PSA_TIER_I18N_KEY` lookup fixed in Part2Results
