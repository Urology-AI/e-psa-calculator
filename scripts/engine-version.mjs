#!/usr/bin/env node
/**
 * Single source of truth for the @urology-ai/epsa-engine version.
 *
 *   node scripts/engine-version.mjs --sync    rewrite both package.json files
 *                                             from engine-version.json
 *   node scripts/engine-version.mjs --check   fail if the constant, the
 *                                             package.json specs, the lockfiles
 *                                             (and, with --installed, the
 *                                             node_modules copies) disagree
 *
 * To upgrade the engine: edit engine-version.json, run --sync, then
 * `npm install` in frontend/ and backend/ (with registry access) to refresh
 * the lockfiles, and commit all of it. CI runs --check on every PR.
 *
 * No scoring logic lives here; this only compares version strings.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXACT = /^\d+\.\d+\.\d+$/;

const read = (p) => JSON.parse(readFileSync(resolve(ROOT, p), 'utf8'));

const { engineVersion } = read('engine-version.json');
if (!EXACT.test(engineVersion ?? '')) {
  console.error(`engine-version.json: "${engineVersion}" is not an exact x.y.z version`);
  process.exit(1);
}

// Each target: where the dependency is declared and how its spec must read.
const TARGETS = [
  {
    name: 'frontend',
    dir: 'frontend',
    dep: '@epsa/engine',
    spec: `npm:@urology-ai/epsa-engine@${engineVersion}`,
    lockKey: 'node_modules/@epsa/engine',
  },
  {
    name: 'backend',
    dir: 'backend',
    dep: '@urology-ai/epsa-engine',
    spec: engineVersion,
    lockKey: 'node_modules/@urology-ai/epsa-engine',
  },
];

const mode = process.argv.includes('--sync') ? 'sync' : 'check';
const checkInstalled = process.argv.includes('--installed');

if (mode === 'sync') {
  for (const t of TARGETS) {
    const file = resolve(ROOT, t.dir, 'package.json');
    const pkg = JSON.parse(readFileSync(file, 'utf8'));
    pkg.dependencies[t.dep] = t.spec;
    writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`${t.dir}/package.json: ${t.dep} -> ${t.spec}`);
  }
  console.log('Now run `npm install` in frontend/ and backend/ to refresh the lockfiles.');
  process.exit(0);
}

const problems = [];
for (const t of TARGETS) {
  const pkg = read(`${t.dir}/package.json`);
  const declared = pkg.dependencies?.[t.dep];
  if (declared !== t.spec) {
    problems.push(`${t.name}: package.json declares ${t.dep}@"${declared}", expected "${t.spec}"`);
  }

  const lock = read(`${t.dir}/package-lock.json`);
  const rootDeclared = lock.packages?.['']?.dependencies?.[t.dep];
  if (rootDeclared !== t.spec) {
    problems.push(`${t.name}: package-lock root declares "${rootDeclared}", expected "${t.spec}"`);
  }
  const entry = lock.packages?.[t.lockKey];
  if (!entry) {
    problems.push(`${t.name}: package-lock has no ${t.lockKey} entry`);
  } else {
    if (entry.version !== engineVersion) {
      problems.push(`${t.name}: package-lock resolves ${entry.version}, expected ${engineVersion}`);
    }
    if (!/npm\.pkg\.github\.com.*epsa-engine/.test(entry.resolved ?? '') || !(entry.resolved ?? '').includes(`/${engineVersion}/`)) {
      problems.push(`${t.name}: package-lock "resolved" is not the registry ${engineVersion} tarball: ${entry.resolved}`);
    }
  }

  if (checkInstalled) {
    const inst = resolve(ROOT, t.dir, t.lockKey, 'package.json');
    if (!existsSync(inst)) problems.push(`${t.name}: ${t.lockKey} is not installed`);
    else {
      const v = JSON.parse(readFileSync(inst, 'utf8')).version;
      if (v !== engineVersion) problems.push(`${t.name}: installed engine is ${v}, expected ${engineVersion}`);
    }
  }
}

if (problems.length) {
  console.error(`Engine version mismatch (expected ${engineVersion} from engine-version.json):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`Engine version OK: ${engineVersion} (frontend, backend, lockfiles${checkInstalled ? ', installed' : ''})`);
