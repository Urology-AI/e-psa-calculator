# Security audit setup

Four layers, cheapest first. Each catches something the others structurally
cannot.

| Layer | What runs | When | Catches |
|---|---|---|---|
| 1 | `.githooks/pre-push` | before a push leaves your machine | a secret about to become public |
| 2 | `.github/workflows/security.yml` | every PR and push to main | rules regressions, secrets in history, secrets in the bundle |
| 3 | `.github/workflows/security-nightly.yml` | 03:00 UTC daily | production drifting from the committed rules |
| 4 | manual / scheduled review | weekly | design-level issues no scanner sees |

Layer 1 is the only one that *prevents*. Everything below it detects, and
detection after a push means rotating the credential.

## Setup

```bash
brew install gitleaks
git config core.hooksPath .githooks
```

The rules tests additionally need JDK 21+ (the Firestore and Storage emulators
are Java processes):

```bash
brew install openjdk@21
```

## Running things locally

Rules tests — the executable form of "who can read what":

```bash
cd security && npm install && npm test
```

Bundle scan, against a real build:

```bash
./security/scan-bundle.sh frontend/build
```

Browser-exposure check:

```bash
./security/check-vite-env.sh frontend/src frontend/.env.example
```

Production probe (needs the public Firebase Web API key):

```bash
FIREBASE_API_KEY=<web-api-key> node security/probe-production.mjs
```

To exercise the probe without touching production, point it at the emulators:

```bash
firebase emulators:exec --only auth,firestore,storage --project epsa-30d0b \
  'FIREBASE_API_KEY=fake \
   PROBE_AUTH_HOST=http://127.0.0.1:9099/identitytoolkit.googleapis.com \
   PROBE_FIRESTORE_HOST=http://127.0.0.1:8080 \
   PROBE_STORAGE_HOST=http://127.0.0.1:9199 \
   node security/probe-production.mjs'
```

## What lives where

```
security/
  firestore.rules.test.js      38 assertions against firestore.rules
  storage.rules.test.js         8 assertions against storage.rules
  helpers.js                   the four caller tiers the rules distinguish
  scan-bundle.sh               secrets in built browser output
  check-vite-env.sh            VITE_-prefixed credentials
  vite-exposure-baseline.txt   known exposures, tracked not fixed
  probe-production.mjs         layer 3
.gitleaks.toml                 secret-scanner rules and allowlist
.githooks/pre-push             layer 1
```

## Things worth understanding

**Anonymous auth is enabled.** `request.auth != null` is therefore not a
security boundary — any visitor can mint a UID for free. Every rule that gates
on "signed in" alone is effectively public. This is why `storage.rules` denies
all client access rather than requiring auth.

**A Firebase Web API key is not a secret.** It identifies the project and
authorizes nothing. Access is governed entirely by `firestore.rules` and
`storage.rules`, which is what `security/` tests. It is deliberately allowlisted
in `.gitleaks.toml`; flagging it would train everyone to ignore the scanner.

**Overlapping `match` blocks OR together.** Two rules for one path cannot
narrow access, only widen it. The same applies within a block: `allow read,
write` followed by `allow delete: if false` still permits deletes, because
`write` already covered delete. Both mistakes were present in `firestore.rules`
and both are now covered by tests.

**`VITE_`-prefixed vars are inlined into the bundle.** They are public from the
first build that includes them, and they never appear in git — so no secret
scanner over history will ever find them. `check-vite-env.sh` is the only thing
that catches this class.

## Outstanding

Two credentials are currently shipped to the browser, tracked in
`security/vite-exposure-baseline.txt`:

- **`VITE_TURSO_AUTH_TOKEN`** — a database credential, injected at build time by
  `firebase-deploy.yml` and read in `frontend/src/services/tursoService.js`.
  Fix: proxy Turso through a Cloud Function, then rotate the token.
- **`VITE_CLINICAL_ADMIN_PIN`** — a PIN in the bundle gates nothing against
  anyone with devtools. Fix: move the check server-side.

Both are readable by anyone who loads the app today. CI fails on any *new*
exposure but passes these, so they do not block unrelated work; removing them
from the baseline is the goal.
