/**
 * generateClinicCodes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin CLI to mint Mount Sinai clinic codes into Firestore.
 *
 * Until the admin dashboard UI lands (PR #3), this is how the study team
 * creates codes for testing or for clinic use.
 *
 * Usage:
 *   # 1. Authenticate as super-admin against your Firebase project
 *   gcloud auth application-default login
 *
 *   # 2. Run with ts-node from the backend/ directory
 *   cd backend
 *   npx ts-node scripts/generateClinicCodes.ts \
 *     --count 10 \
 *     --issuedBy you@mssm.edu \
 *     --expiresInDays 90
 *
 * Codes are printed to stdout in display form (XXXX-XXXX-XXXX). Each code is
 * written to Firestore as a doc at clinicCodes/{normalized}. Document IDs are
 * the normalized (no-dash) form so the submitSinaiCohort function can look
 * them up directly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

// Avoid 0/O and 1/I/L to make codes easier to read aloud over the phone
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const NORMALIZED_LENGTH = 12;
const GROUP_SIZE = 4;

function randomCode(): string {
  const bytes = crypto.randomBytes(NORMALIZED_LENGTH);
  let out = '';
  for (let i = 0; i < NORMALIZED_LENGTH; i++) {
    out += CHARSET[bytes[i] % CHARSET.length];
  }
  return out;
}

function toDisplay(normalized: string): string {
  const groups: string[] = [];
  for (let i = 0; i < normalized.length; i += GROUP_SIZE) {
    groups.push(normalized.slice(i, i + GROUP_SIZE));
  }
  return groups.join('-');
}

interface CliArgs {
  count: number;
  issuedBy: string;
  expiresInDays: number | null;
}

function parseArgs(argv: string[]): CliArgs {
  const args: Partial<CliArgs> = { expiresInDays: null };
  for (let i = 2; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === '--count') { args.count = parseInt(value, 10); i++; }
    else if (flag === '--issuedBy') { args.issuedBy = value; i++; }
    else if (flag === '--expiresInDays') {
      args.expiresInDays = value === 'never' ? null : parseInt(value, 10);
      i++;
    }
  }
  if (!args.count || args.count < 1 || args.count > 1000) {
    throw new Error('--count must be between 1 and 1000');
  }
  if (!args.issuedBy || !args.issuedBy.includes('@')) {
    throw new Error('--issuedBy must be an email address');
  }
  return args as CliArgs;
}

async function main() {
  const args = parseArgs(process.argv);

  admin.initializeApp();
  const db = admin.firestore();

  const now = admin.firestore.Timestamp.now();
  const expiresAt =
    args.expiresInDays !== null
      ? admin.firestore.Timestamp.fromMillis(
          Date.now() + args.expiresInDays * 24 * 60 * 60 * 1000
        )
      : null;

  const generated: string[] = [];
  const batch = db.batch();

  for (let i = 0; i < args.count; i++) {
    // Re-roll on the (vanishingly rare) chance of collision with an existing doc
    let code = randomCode();
    let exists = (await db.collection('clinicCodes').doc(code).get()).exists;
    while (exists) {
      code = randomCode();
      exists = (await db.collection('clinicCodes').doc(code).get()).exists;
    }

    batch.set(db.collection('clinicCodes').doc(code), {
      code,
      issuedBy: args.issuedBy,
      issuedAt: now,
      expiresAt,
      used: false,
      revoked: false,
    });

    generated.push(code);
  }

  await batch.commit();

  console.log(`\nGenerated ${generated.length} clinic code(s):\n`);
  for (const code of generated) {
    console.log(`  ${toDisplay(code)}`);
  }
  console.log(
    `\nIssued by: ${args.issuedBy}` +
    (expiresAt
      ? `\nExpires:   ${expiresAt.toDate().toISOString()} (${args.expiresInDays} days)`
      : '\nExpires:   never') +
    '\n'
  );
}

main().catch((err: Error) => {
  console.error('generateClinicCodes failed:', err.message);
  process.exit(1);
});
