/**
 * Local error log for "something broke between Part 1 and Part 2" reports.
 *
 * Entries stay in this browser (localStorage) — nothing is transmitted. The
 * patient can view the report, copy it or download it and send it to the team
 * themselves. Entries deliberately hold NO answers or results (PHI): only the
 * error's name/code/message, a trimmed stack, and coarse app position
 * (stage / step / pathway). Callable `details.issues` are reduced to field
 * paths, never values.
 */
const KEY = 'epsa_error_reports';
const MAX_ENTRIES = 20;
const MAX_MESSAGE = 400;
const MAX_STACK = 1500;

const read = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const write = (entries) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // Storage blocked or full — the report can still be shown from memory.
  }
};

const clip = (value, max) => (typeof value === 'string' ? value.slice(0, max) : undefined);

// Strip anything that looks like a query string or fragment from URLs inside
// messages and stacks, so a path never carries parameters into a report.
const scrub = (text) =>
  typeof text === 'string' ? text.replace(/(https?:\/\/[^\s)?#]+)[?#][^\s)]*/g, '$1') : text;

let getContext = () => ({});
/** App registers a function returning coarse position info (stage, step, pathway). */
export const setErrorContextProvider = (fn) => {
  getContext = typeof fn === 'function' ? fn : () => ({});
};

export const buildErrorEntry = (source, error, extra = {}) => {
  const err = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error');
  const issues = Array.isArray(err?.details?.issues)
    ? err.details.issues.map((i) => String(i.path || '(form)')).slice(0, 20)
    : undefined;
  let context = {};
  try { context = getContext() || {}; } catch { /* context is best effort */ }
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    source,
    name: clip(err.name, 80),
    code: clip(typeof err.code === 'string' ? err.code : undefined, 80),
    message: clip(scrub(err.message), MAX_MESSAGE),
    stack: clip(scrub(err.stack), MAX_STACK),
    rejectedFields: issues,
    page: window.location.pathname,
    online: typeof navigator !== 'undefined' ? navigator.onLine : undefined,
    userAgent: clip(typeof navigator !== 'undefined' ? navigator.userAgent : '', 200),
    ...context,
    ...extra,
  };
};

export const recordError = (source, error, extra) => {
  const entry = buildErrorEntry(source, error, extra);
  write([...read(), entry]);
  return entry;
};

export const getErrorReports = () => read();
export const clearErrorReports = () => {
  try { localStorage.removeItem(KEY); } catch { /* nothing to clear */ }
};

export const formatErrorReport = (entries = read()) => {
  if (!entries.length) return 'No errors recorded.';
  const header = [
    'ePSA error report',
    `Generated: ${new Date().toISOString()}`,
    'Contains no answers or results — only error details and app position.',
    '',
  ];
  const body = [...entries].reverse().map((e, i) => [
    `#${i + 1}  ${e.at}  [${e.source}]`,
    e.code ? `code: ${e.code}` : null,
    `error: ${e.name || 'Error'}: ${e.message || '(no message)'}`,
    e.rejectedFields?.length ? `rejected fields: ${e.rejectedFields.join(', ')}` : null,
    [e.stage && `stage=${e.stage}`, e.step != null && `step=${e.step}`, e.pathway && `pathway=${e.pathway}`,
      e.hasPart1Result != null && `part1Result=${e.hasPart1Result}`, e.showPart2Interim != null && `part2Interim=${e.showPart2Interim}`]
      .filter(Boolean).join(' ') || null,
    `page: ${e.page}  online: ${e.online}`,
    `browser: ${e.userAgent}`,
    e.stack ? `stack:\n${e.stack}` : null,
    '',
  ].filter((l) => l !== null).join('\n'));
  return [...header, ...body].join('\n');
};

let globalInstalled = false;
/** Capture uncaught errors and unhandled promise rejections anywhere in the app. */
export const installGlobalErrorCapture = () => {
  if (globalInstalled || typeof window === 'undefined') return;
  globalInstalled = true;
  window.addEventListener('error', (ev) => {
    if (!ev.error && !ev.message) return;
    recordError('window.error', ev.error || new Error(ev.message));
  });
  window.addEventListener('unhandledrejection', (ev) => {
    recordError('unhandledrejection', ev.reason);
  });
};
