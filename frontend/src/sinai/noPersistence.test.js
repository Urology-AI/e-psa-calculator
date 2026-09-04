/**
 * The Sinai landing-page build promises on screen that "your answers stay on
 * your device and are never transmitted." That promise is what keeps this a
 * zero-review static page for Sinai IT security, so it is worth a test rather
 * than a code-review convention.
 *
 * Guards the source, not the bundle: React's own internals are irrelevant here,
 * and a bundle scan would fail on unrelated vendor code.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SINAI_DIR = dirname(fileURLToPath(import.meta.url));

const FORBIDDEN = [
  ['localStorage', /\blocalStorage\b/],
  ['sessionStorage', /\bsessionStorage\b/],
  ['indexedDB', /\bindexedDB\b/i],
  ['document.cookie', /document\s*\.\s*cookie/],
  ['fetch()', /\bfetch\s*\(/],
  ['XMLHttpRequest', /\bXMLHttpRequest\b/],
  ['navigator.sendBeacon', /sendBeacon/],
  ['WebSocket', /\bnew\s+WebSocket\b/],
];

const sourceFiles = readdirSync(SINAI_DIR)
  .filter((f) => /\.(jsx?|css)$/.test(f) && !f.endsWith('.test.js'))
  .map((f) => [f, readFileSync(join(SINAI_DIR, f), 'utf8')]);

describe('Sinai build keeps nothing', () => {
  it('has source files to check', () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  for (const [name, pattern] of FORBIDDEN) {
    it(`does not use ${name}`, () => {
      const offenders = sourceFiles
        .filter(([, body]) => pattern.test(body))
        .map(([file]) => file);
      expect(offenders).toEqual([]);
    });
  }
});
