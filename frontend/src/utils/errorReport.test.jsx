// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import {
  recordError, getErrorReports, clearErrorReports, formatErrorReport, setErrorContextProvider,
} from './errorReport';
import AppErrorBoundary from '../components/AppErrorBoundary.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('error report', () => {
  beforeEach(() => { clearErrorReports(); setErrorContextProvider(null); });

  it('saves an entry with code, message and app position, and no answers', () => {
    setErrorContextProvider(() => ({ stage: 'post', step: 2, pathway: 'post_psa', hasPart1Result: true }));
    const err = Object.assign(new Error('Invalid PSA input data'), {
      code: 'functions/invalid-argument',
      details: { issues: [{ path: 'postPsa.psa', message: 'Number must be >= 0', received: 99999 }] },
    });
    recordError('scoring', err);
    const [e] = getErrorReports();
    expect(e.code).toBe('functions/invalid-argument');
    expect(e.rejectedFields).toEqual(['postPsa.psa']);
    expect(e).toMatchObject({ stage: 'post', step: 2, pathway: 'post_psa' });
    expect(JSON.stringify(e)).not.toContain('99999');
  });

  it('strips query strings from URLs and caps stored entries', () => {
    recordError('x', new Error('failed https://host/path?age=62&psa=5.2#frag'));
    expect(getErrorReports()[0].message).toBe('failed https://host/path');
    for (let i = 0; i < 30; i++) recordError('x', new Error(`e${i}`));
    expect(getErrorReports()).toHaveLength(20);
  });

  it('formats a readable report, newest first, and handles empty', () => {
    expect(formatErrorReport([])).toBe('No errors recorded.');
    recordError('scoring', new Error('first'));
    recordError('react.render', new Error('second'));
    const text = formatErrorReport();
    expect(text.indexOf('second')).toBeLessThan(text.indexOf('first'));
    expect(text).toContain('no answers or results');
  });

  it('crash boundary shows the saved report instead of a bare message', async () => {
    const Boom = () => { throw new Error('part2 exploded'); };
    const container = document.createElement('div');
    document.body.appendChild(container);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => {
      createRoot(container).render(<AppErrorBoundary><Boom /></AppErrorBoundary>);
    });
    spy.mockRestore();
    expect(container.textContent).toContain('Something went wrong');
    expect(container.querySelector('[data-testid="error-report-text"]').textContent).toContain('part2 exploded');
    expect(getErrorReports().some((e) => e.source === 'react.render')).toBe(true);
  });
});
