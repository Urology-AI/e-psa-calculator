// @vitest-environment jsdom
/**
 * Accessibility checks on the Sinai result screen.
 *  - tier meaning is carried by text, not colour alone
 *  - heading order / reading order is sane
 *  - text/background contrast meets WCAG AA (4.5:1 for normal text)
 *
 * Contrast is computed from the colours in the source (jsdom has no layout, so a
 * rendered-pixel check such as axe's colour-contrast rule is not available here).
 * The test fails if any pair drops below 4.5:1. The Sinai build has a single
 * (light) theme, so there is no dark-mode palette to check.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderSinaiResult } from './driveSinai.jsx';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../sinai');
const css = readFileSync(resolve(SRC, 'sinai.css'), 'utf8');
const jsx = readFileSync(resolve(SRC, 'SinaiApp.jsx'), 'utf8');

const cssVar = (name) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))[1];

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE = '#ffffff';
const tierLadder = [...jsx.matchAll(/key: '(\w+)', short: '([^']+)', color: '(#[0-9a-fA-F]{6})'/g)]
  .map(([, key, short, color]) => ({ key, short, color }));

const PAIRS = [
  ['body text on card', cssVar('ms-ink'), WHITE],
  ['muted text on card', cssVar('ms-muted'), WHITE],
  ['muted text on page', cssVar('ms-muted'), cssVar('ms-bg')],
  ['white on navy CTA panel', WHITE, cssVar('ms-navy')],
  ['white on primary button', WHITE, cssVar('ms-magenta')],
  ['masthead eyebrow on navy', '#b9b6e4', cssVar('ms-navy-dark')],
  ...tierLadder.map((t) => [`tier caption "${t.short}" on card`, t.color, WHITE]),
];

describe('Sinai result: contrast (WCAG AA 4.5:1)', () => {
  it('parsed the tier ladder', () => expect(tierLadder).toHaveLength(4));

  it('every pair meets 4.5:1, including the Optional and Advised tier captions', () => {
    const failing = PAIRS.filter(([, fg, bg]) => contrast(fg, bg) < 4.5).map(([n]) => n);
    expect(failing).toEqual([]);
  });
});

describe('Sinai result: structure', () => {
  let view;
  afterEach(() => { view?.unmount(); view = null; });

  const profiles = {
    'lower-risk answers': { age: 50, optionIndex: 0 },
    'higher-risk answers': { age: 72, optionIndex: 1 },
  };

  for (const [name, profile] of Object.entries(profiles)) {
    describe(name, () => {
      it('states the tier in text, not just colour', async () => {
        view = await renderSinaiResult(profile);
        const root = view.container;
        const tierHeading = root.querySelector('.ms-result__tier h2')?.textContent?.trim();
        expect(tierHeading).toBeTruthy();

        const svg = root.querySelector('.ms-dial svg');
        expect(svg.getAttribute('role')).toBe('img');
        expect(svg.getAttribute('aria-label')).toContain(tierHeading);
        expect(svg.getAttribute('aria-label')).toMatch(/Level \d of 4/);

        const caption = root.querySelector('.ms-dial__caption').textContent;
        expect(caption).toMatch(/level \d of 4/);
        expect(tierLadder.some((t) => caption.includes(t.short))).toBe(true);
      });

      it('has one h1, no skipped heading levels, and the result precedes the call to action', async () => {
        view = await renderSinaiResult(profile);
        const root = view.container;
        const headings = [...root.querySelectorAll('h1,h2,h3,h4')];
        const levels = headings.map((h) => Number(h.tagName[1]));
        expect(levels.filter((l) => l === 1)).toHaveLength(1);
        expect(levels[0]).toBe(1);
        levels.forEach((l, i) => { if (i > 0) expect(l - levels[i - 1]).toBeLessThanOrEqual(1); });

        const order = (sel) => {
          const el = root.querySelector(sel);
          return headings.indexOf(el.closest('h1,h2,h3,h4') ?? el);
        };
        const tierPos = [...root.querySelectorAll('*')].indexOf(root.querySelector('.ms-result__tier'));
        const ctaPos = [...root.querySelectorAll('*')].indexOf(root.querySelector('.ms-result__cta'));
        expect(tierPos).toBeGreaterThan(-1);
        expect(ctaPos).toBeGreaterThan(tierPos);
        expect(order('.ms-result__tier h2')).toBeGreaterThan(-1);
      });

      it('shows the education-only disclaimer and gives links/buttons accessible names', async () => {
        view = await renderSinaiResult(profile);
        const root = view.container;
        expect(root.querySelector('.ms-disclaimer')?.textContent).toMatch(/education only/i);
        for (const el of root.querySelectorAll('a,button')) {
          expect((el.textContent || el.getAttribute('aria-label') || '').trim()).not.toBe('');
        }
      });
    });
  }
});
