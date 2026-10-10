#!/usr/bin/env node
/**
 * One command for the whole e2e stack: builds the backend callable, starts the
 * Functions + Auth + Firestore emulators (reusing them if already running),
 * then runs Playwright. With --watch it re-runs the suite on every source
 * change and on a timer, so a regression shows up within minutes.
 *
 *   npm run e2e           # one run
 *   npm run e2e:watch     # continuous (Ctrl-C to stop)
 *
 * Needs Java 17+ (firebase-tools@13). Extra args go to Playwright.
 */
import { spawn, spawnSync } from 'node:child_process';
import { watch, existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.join(here, '..');
const root = path.join(frontend, '..');
const backend = path.join(root, 'backend');
const args = process.argv.slice(2);
const watchMode = args.includes('--watch');
const pwArgs = args.filter((a) => a !== '--watch');
const INTERVAL_MS = Number(process.env.E2E_INTERVAL_MS || 10 * 60 * 1000);

const portOpen = (port) => new Promise((resolve) => {
  const s = net.connect(port, '127.0.0.1');
  s.once('connect', () => { s.destroy(); resolve(true); });
  s.once('error', () => resolve(false));
});

// The emulator loads each function lazily on first call; without this the first
// tests all hit a cold callable at once and time out.
async function warmUp() {
  for (let i = 0; i < 20; i++) {
    try {
      const r = await fetch('http://127.0.0.1:5001/demo-epsa/us-central1/calculatePsaRecommendation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: {} }),
      });
      if (r.status > 0) return;
    } catch { /* not ready */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

let emulators = null;
async function ensureEmulators() {
  if (await portOpen(5001) && await portOpen(8080) && await portOpen(9099)) return;
  if (!existsSync(path.join(backend, 'node_modules'))) {
    spawnSync('npm', ['ci', '--no-audit', '--no-fund'], { cwd: backend, stdio: 'inherit' });
  }
  const build = spawnSync('npm', ['run', 'build'], { cwd: backend, stdio: 'inherit' });
  if (build.status !== 0) throw new Error('backend build failed');
  emulators = spawn('npx', ['--yes', 'firebase-tools@13', 'emulators:start',
    '--config', 'firebase.e2e.json', '--project', 'demo-epsa', '--only', 'functions,auth,firestore'],
  { cwd: root, stdio: 'ignore', detached: false });
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    if (await portOpen(5001) && await portOpen(8080) && await portOpen(9099)) { await warmUp(); return; }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('emulators did not start in time');
}

function runSuite() {
  return new Promise((resolve) => {
    const p = spawn('npx', ['playwright', 'test', ...pwArgs], { cwd: frontend, stdio: 'inherit' });
    p.on('exit', (code) => resolve(code ?? 1));
  });
}

const stop = () => { if (emulators) emulators.kill('SIGTERM'); };
process.on('SIGINT', () => { stop(); process.exit(130); });
process.on('exit', stop);

await ensureEmulators();
if (!watchMode) process.exit(await runSuite());

let running = false; let queued = false; let last = 0;
async function cycle(reason) {
  if (running) { queued = true; return; }
  running = true;
  console.log(`\n[e2e:watch] ${new Date().toLocaleTimeString()} — running (${reason})`);
  const code = await runSuite();
  last = code;
  console.log(`[e2e:watch] ${code === 0 ? 'PASS' : 'FAIL'} at ${new Date().toLocaleTimeString()}`);
  running = false;
  if (queued) { queued = false; cycle('changes during run'); }
}
let debounce;
const onChange = (_e, f) => { if (!f || /\.(test|spec)\./.test(f) && false) return; clearTimeout(debounce); debounce = setTimeout(() => cycle(`changed ${f}`), 1500); };
watch(path.join(frontend, 'src'), { recursive: true }, onChange);
watch(path.join(frontend, 'e2e'), { recursive: true }, onChange);
setInterval(() => cycle('scheduled'), INTERVAL_MS);
await cycle('startup');
await new Promise(() => {});
