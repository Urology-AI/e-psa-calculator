/**
 * Scans the *built* Sinai bundle (dist-sinai) for storage and network APIs.
 * Complements the source guard in src/sinai/noPersistence.test.js and the
 * runtime guard in runtimeNoLeak.test.jsx: this is what actually ships.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DIST = join(ROOT, 'dist-sinai');

const FORBIDDEN = [
  'localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'XMLHttpRequest',
  'sendBeacon', 'WebSocket', 'EventSource', 'serviceWorker', 'firebase', 'firestore',
  'httpsCallable', 'gtag', 'analytics',
];

// Vite's modulepreload polyfill fetches the page's own <link rel=modulepreload>
// hrefs; it never sees user input. Anything else calling fetch( fails the test.
// Matched by shape (fetch(<id>.href,<id>)) because minified names change per build.
const MODULEPRELOAD_FETCH = /\bfetch\((\w+)\.href,(\w+)\)/g;

let files;
beforeAll(() => {
  execSync('npx vite build --config vite.config.sinai.js', { cwd: ROOT, stdio: 'pipe' });
  const assets = join(DIST, 'assets');
  files = readdirSync(assets)
    .filter((f) => f.endsWith('.js'))
    .map((f) => [f, readFileSync(join(assets, f), 'utf8')]);
}, 120_000);

describe('built Sinai bundle', () => {
  it('has JS to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const word of FORBIDDEN) {
    it(`never mentions ${word}`, () => {
      expect(files.filter(([, body]) => body.includes(word)).map(([n]) => n)).toEqual([]);
    });
  }

  it('calls fetch( only in the modulepreload polyfill', () => {
    for (const [name, body] of files) {
      const stripped = body.replace(MODULEPRELOAD_FETCH, '');
      expect([name, stripped.includes('fetch(')]).toEqual([name, false]);
    }
  });

  it('page has no form that could submit answers and no third-party scripts', () => {
    const html = readFileSync(join(DIST, 'index.html'), 'utf8');
    expect(html).not.toMatch(/<form[\s>]/i);
    expect(html).not.toMatch(/<script[^>]+src=["']https?:/i);
  });
});
