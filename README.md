# ePSA — Electronic Prostate Specific Awareness Risk Assessment Tool

A web application for **prostate cancer risk education and stratification**: evidence-based questionnaires, configurable statistical models, optional cloud sync via Firebase, and an admin dashboard for operations. It is intended to support shared decision-making, not to replace clinical judgment.

**Medical disclaimer:** This tool is for **educational purposes only**. It does not diagnose disease or replace advice from a qualified clinician. Always discuss screening, PSA testing, imaging, and biopsy decisions with your care team.

---

## Table of contents

- [Live demos](#live-demos)
- [What ePSA does](#what-epsa-does)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Firebase emulators](#firebase-emulators)
- [Building and deploying](#building-and-deploying)
- [Models and training](#models-and-training)
- [Testing](#testing)
- [Security and privacy](#security-and-privacy)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)
- [Acknowledgments](#acknowledgments)

---

## Live demos

| Environment | URL | Notes |
|-------------|-----|--------|
| **Firebase (production)** | [epsa-30d0b.web.app](https://epsa-30d0b.web.app) | Full app with Firebase Auth, Firestore, and Cloud Functions |
| **Sinai landing page (static)** | *(pending — see below)* | Lean public Part 1 build linked from mountsinai.org; no Firebase, no accounts |

---

## What ePSA does

### Screening and pathways

- **Part 1 (pre-PSA / “Need PSA?”)** — Lifestyle, demographics, family history, and symptom-related inputs feed a **binned logistic model** (with optional calibration). Outputs include an ePSA-style score, risk tier, and a **PSA recommended** flag driven by a sensitivity-tuned probability threshold. Details appear on the in-app results and model documentation screens.
- **Part 2 (post-PSA / MRI context)** — PSA and optional **PI-RADS** data feed a **logistic model** on log(PSA) and PI-RADS dummies; probabilities map to risk categories via configurable thresholds.
- **Additional flows** — The app supports **pathway selection** (e.g. pre-PSA vs post-PSA vs post-MRI), **biopsy-related** inputs, and **active surveillance** style calculations where implemented in the calculator layer.

### Data and modes

- **Cloud mode** — When Firebase is configured, users can authenticate and persist session-related data in Firestore (subject to your project rules and deployment).
- **Local / demo mode** — GitHub Pages and offline-style use rely on **local storage** and export/import patterns; no cloud backend is required.
- **Import / export** — JSON (and related utilities) support moving answers between sessions or devices where the UI exposes it.

### For clinicians and researchers

- **Admin dashboard** — Lives in its own repository, [Urology-AI/epsa-admin-dashboard](https://github.com/Urology-AI/epsa-admin-dashboard), which unifies the admin surfaces for this calculator, the mobile-bus screening tool, and REDCap. It is not built or deployed from here.
- **Model transparency** — Coefficients and thresholds live in frontend config; see [Models and training](#models-and-training) to refit from data.

---

## Architecture

### Patient app (`frontend`)

| Area | Technology |
|------|------------|
| UI | React 18, Vite 5 |
| i18n | i18next / react-i18next |
| Charts / PDF / capture | Recharts, jsPDF, html2canvas |
| Backend client | Firebase JS SDK (Auth, Firestore, Functions, Analytics when enabled) |
| Unit tests | Vitest |

Build output for Firebase Hosting: **`frontend/build`** (see `firebase.json`).

### Admin dashboard

Moved to [Urology-AI/epsa-admin-dashboard](https://github.com/Urology-AI/epsa-admin-dashboard) in `cfb061b`. See that repository for its build and deploy steps.

### Backend (`backend`)

| Area | Technology |
|------|------------|
| Runtime | Node.js **20** (matches `firebase.json` functions runtime) |
| Language | TypeScript → compiled to **`backend/lib`** (Firebase Functions `source` in `firebase.json`) |
| Validation | Zod |
| Admin SDK | firebase-admin, firebase-functions |

**Important:** Run `npm run build` in `backend` before deploying functions or running emulators against fresh TypeScript changes.

### Firebase services (typical production setup)

- **Authentication** — Email/password and anonymous auth are reflected in project config; phone flows may be used depending on deployment.
- **Firestore** — Primary application data store; rules in `firestore.rules`.
- **Realtime Database** — Rules present (`database.rules.json`); use depends on feature set.
- **Hosting** — Two targets: `app` (full patient app) and `sinai` (the lean public build linked from mountsinai.org).
- **Cloud Functions** — PHI-sensitive or privileged operations implemented in `backend/src` (compiled to `lib`).

---

## Repository layout

```
e-psa-calculator/
├── frontend/                 # Patient React app (Vite → build/)
│   ├── src/
│   │   ├── components/       # Screens, forms, results
│   │   ├── config/          # Firebase client, calculator config
│   │   ├── services/        # Analytics and integrations
│   │   └── utils/           # Calculator engine, export helpers, tests
│   └── package.json
│   └── package.json
├── backend/                  # Firebase Cloud Functions (TypeScript)
│   ├── src/index.ts
│   └── package.json          # build emits to lib/
├── training/                 # Python scripts + docs to refit models
│   ├── README.md
│   ├── refit_part1_psa_model.py
│   └── refit_part2_cancer_model.py.py
├── .github/workflows/        # Firebase deploy + security scans
├── firebase.json
├── firestore.rules
├── database.rules.json
└── README.md
```

---

## Prerequisites

- **Node.js 20** (aligned with GitHub Actions and Cloud Functions runtime)
- **npm** (lockfile is committed under `frontend`)
- **Git**
- **Firebase CLI** for emulators and manual deploys: `npm install -g firebase-tools` (or use `npx firebase`)
- **Python 3** (optional) — only if you refit models using `training/`

---

## Local development

### 1. Install dependencies

```bash
git clone https://github.com/Urology-AI/e-psa-calculator.git
cd e-psa-calculator

cd frontend && npm install && cd ..
cd backend && npm install && cd ..
```

### 2. Configure environment

Create a **`.env`** file in `frontend/` with your Firebase web app keys (see [Environment variables](#environment-variables)). The codebase references `.env.example` in comments; if that file is missing in your checkout, copy variable names from the list below or from `.github/workflows/firebase-deploy.yml`.

### 3. Run the patient app

```bash
cd frontend
npm run dev
```

Dev server defaults to **http://localhost:3000** (`vite.config.js`).

### 4. Build Cloud Functions (when touching backend)

```bash
cd backend
npm run build
```

---

## Environment variables

### Patient app (`frontend/.env`)

| Variable | Purpose |
|----------|---------|
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID |
| `VITE_FIREBASE_APP_ID` | App ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Analytics (optional; omitted on localhost in code) |
| `VITE_GITHUB_PAGES` | Set to `true` for static GitHub Pages build behavior |
| `VITE_DISABLE_FIREBASE` | When `true`, disables Firebase client initialization |
| `VITE_USE_AUTH_EMULATOR` | `true` to point Auth at the emulator |
| `VITE_USE_FIRESTORE_EMULATOR` | `true` to point Firestore at the emulator |
| `VITE_USE_FUNCTIONS_EMULATOR` | `true` to point Functions at the emulator |

If Firebase is not configured and GitHub Pages / disable flags are not set, the client may throw at startup; use the demo build flags or provide full config.

### CI (GitHub Actions)

The Firebase hosting workflow injects the `VITE_FIREBASE_*` values from repository **Secrets** when building the frontend. You also need a **Firebase service account** secret for deploy steps (see [Building and deploying](#building-and-deploying)).

---

## Firebase emulators

From the **repository root** (with Firebase CLI logged in and project selected as needed):

```bash
firebase emulators:start
```

Ports configured in `firebase.json`:

| Emulator | Port |
|----------|------|
| Auth | 9099 |
| Firestore | 8080 |
| Functions | 5001 |
| Hosting | 5000 |
| Realtime Database | 9000 |
| Emulator UI | enabled (`singleProjectMode: true`) |

Point the frontend at emulators with the `VITE_USE_*_EMULATOR` variables in `frontend/.env` or `.env.local`.

---

## Building and deploying

### Automatic CI

- **`firebase-deploy.yml`** — On pushes to `main`, builds `frontend` and deploys the `app` and `sinai` Hosting targets to project `epsa-30d0b`. On pull requests from the **same** repository, deploys **preview** channels; fork PRs skip preview deploy (token limitation).

### Secrets (typical)

- `FIREBASE_SERVICE_ACCOUNT_EPSA_30D0B` — Service account JSON for Hosting deploy action
- `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`, `FIREBASE_MEASUREMENT_ID` — Passed into the frontend build as `VITE_*` in CI

### Manual Firebase deploy

```bash
cd backend && npm run build && cd ..
firebase deploy --only hosting
firebase deploy --only firestore
firebase deploy --only functions
```

### Sinai landing-page static build

The public build linked from mountsinai.org's PSA screening page. Lean by
design: Part 1 only, no Firebase, no accounts, no i18n bundle — one
questionnaire, one result, one call to action.

```bash
cd frontend
npm run dev:sinai      # local, port 5173
npm run build:sinai    # -> frontend/dist-sinai
```

Scoring is delegated to `@epsa/engine`, so this build cannot disagree with the
full calculator or the bus screening tool about the same patient.

#### Deployment

It ships as a third Firebase Hosting target (`sinai`, site `epsa-sinai`)
alongside `app` and `admin`, deployed by `firebase-deploy.yml` on every push to
`main`. Pull requests get their own expiring preview URL, commented on the PR —
that is how the department and the Sinai web team review a change before it is
live, with nothing to install and no account needed.

**One-time setup:** create the `epsa-sinai` site under project `epsa-30d0b`
(Firebase console → Hosting → Add another site). `.firebaserc` already maps the
`sinai` target to it; the deploy fails with `site not found` until it exists.

Once live, point a stable vanity URL at the site and give Sinai web **only that
URL** — editing a page in their CMS is a ticket and a review cycle, and you do
not want to spend that twice if the hosting ever moves.

The `sinai` target sets its own headers, deliberately different from `app`:
`frame-ancestors` allows `mountsinai.org` so their web team can embed the page
rather than link out to it, and the CSP sets `connect-src 'none'` so the
no-network guarantee is enforced by the browser, not just by the source.

---

## Models and training

- **Runtime configuration** — Part 1 / Part 2 coefficients, thresholds, and calibration live in `frontend/src/config/calculatorConfig.js` (consumed by `dynamicCalculator.js` / engine utilities).
- **Refitting from data** — See **[training/README.md](training/README.md)** for Python dependencies, dataset layout, and how to paste new coefficients into the app.
- **Generated artifacts** — Training may write `training_output_part1.txt`, `training_output_part2.txt`, and `training_results_summary.txt` at the repo root; **`data/`** and these outputs are typically **gitignored** — generate them locally.

**Note:** The Part 2 script in this repo is named `training/refit_part2_cancer_model.py.py` (double `.py`); use that exact name when invoking Python.

---

## Testing

```bash
# Frontend unit tests (Vitest)
cd frontend
npm test

# Optional patient scenario runner (see package.json)
npm run test:patients

# Watch mode
npm run test:watch
```

The **`backend`** package exposes `build`, emulator helpers, and deploy scripts (no `npm test` in `package.json`).

Production build smoke checks:

```bash
cd frontend
npm run build
npm run build:sinai
```

---

## Security and privacy

- **Firestore / Database rules** — Review `firestore.rules` and `database.rules.json` for your environment; they define who can read/write what.
- **Functions** — Privileged logic and validation run server-side in `backend/src`; keep secrets in Firebase config / environment, not in client bundles.
- **Compliance language** — The product includes consent and HIPAA-oriented UX, but **whether a deployment satisfies HIPAA, GDPR, or institutional policy** depends on your BAA, hosting choices, logging, and configuration. Treat this README as technical orientation, not legal advice.

---

## Contributing

1. Fork the repository.
2. Create a branch (`git checkout -b feature/your-feature`).
3. Make focused commits with clear messages.
4. Push and open a pull request.

**Guidelines:** Match existing ESLint and code style; add or update tests when you change calculator or export behavior; update this README if you change ports, env vars, or deploy steps.

---

## License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE).

---

## Support

- **Issues:** [GitHub Issues](https://github.com/Urology-AI/e-psa-calculator/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Urology-AI/e-psa-calculator/discussions)

---

## Acknowledgments

- **Mount Sinai Health System** — Clinical context and guidance
- **Urology collaborators** — Validation and domain expertise
- **Firebase** — Auth, Firestore, Functions, and Hosting
- **Open source community** — Libraries listed in each package’s `package.json`
