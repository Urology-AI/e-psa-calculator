/*
 * geoCountry.js
 *
 * Best-effort detection of the user's country, used only to pick which
 * country's prostate cancer screening guidance to show first.
 *
 * Privacy posture — this is a health app, so the bar is high:
 *   • We only ever read back a 2-letter country code. No IP address, city,
 *     coordinates or any other field is requested, stored or transmitted.
 *   • Nothing about the user is *sent* to the geo endpoint beyond the fact
 *     that a request was made — no session id, no form data, no PHI.
 *   • The result is cached in localStorage so we make at most one lookup
 *     per week per device.
 *   • Detection is a convenience only. The user can always override it, and
 *     the override wins permanently over anything we detect.
 *   • If the network lookup fails or is blocked, we fall back to the browser's
 *     own locale — which involves no network call at all.
 */

const CACHE_KEY = 'epsa.geo.country';
const OVERRIDE_KEY = 'epsa.geo.regionOverride';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const LOOKUP_TIMEOUT_MS = 3500;

/* Endpoints are tried in order. Both are free, keyless, and return only a
 * country code. Any host added here must also be in the connect-src
 * allowlist of the CSP in frontend/index.html. */
const PROVIDERS = [
  {
    name: 'cloudflare',
    url: 'https://www.cloudflare.com/cdn-cgi/trace',
    // Plain-text `key=value` lines; `loc=US` is the country.
    parse: (text) => text.match(/^loc=([A-Z]{2})$/m)?.[1] ?? null,
    asText: true,
  },
  {
    name: 'geojs',
    url: 'https://get.geojs.io/v1/ip/country.json',
    parse: (json) => (typeof json?.country === 'string' ? json.country : null),
    asText: false,
  },
];

const isBrowser = () => typeof window !== 'undefined';

const readStorage = (key) => {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // private browsing / storage disabled
  }
};

const writeStorage = (key, value) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — detection still works, just uncached */
  }
};

const isValidCode = (code) => typeof code === 'string' && /^[A-Za-z]{2}$/.test(code);

const normalise = (code) => (isValidCode(code) ? code.toUpperCase() : null);

/**
 * Turn an ISO 3166-1 alpha-2 code into its flag emoji, by mapping each
 * letter to its regional-indicator symbol (A → 🇦, B → 🇧, …). "US" → "🇺🇸".
 * Returns null for anything that isn't a two-letter code.
 */
export function flagFromCountryCode(code) {
  const upper = normalise(code);
  if (!upper) return null;
  const REGIONAL_INDICATOR_A = 0x1f1e6;
  return String.fromCodePoint(
    ...[...upper].map((ch) => REGIONAL_INDICATOR_A + ch.charCodeAt(0) - 'A'.charCodeAt(0))
  );
}

/* ── Manual override ──────────────────────────────────────────────── */

/** The region id the user explicitly picked, if any. Beats IP detection. */
export function getRegionOverride() {
  const value = readStorage(OVERRIDE_KEY);
  return value || null;
}

/** Persist an explicit region choice. Pass null to clear it. */
export function setRegionOverride(regionId) {
  if (!isBrowser()) return;
  try {
    if (regionId) window.localStorage.setItem(OVERRIDE_KEY, regionId);
    else window.localStorage.removeItem(OVERRIDE_KEY);
  } catch {
    /* no-op */
  }
}

/* ── Cache ────────────────────────────────────────────────────────── */

function readCachedCountry() {
  const raw = readStorage(CACHE_KEY);
  if (!raw) return null;
  try {
    const { code, at } = JSON.parse(raw);
    if (!isValidCode(code)) return null;
    if (!at || Date.now() - at > CACHE_TTL_MS) return null;
    return normalise(code);
  } catch {
    return null;
  }
}

function writeCachedCountry(code) {
  if (!isValidCode(code)) return;
  writeStorage(CACHE_KEY, JSON.stringify({ code: normalise(code), at: Date.now() }));
}

/** Drop the cached country so the next detect() re-queries. */
export function clearCountryCache() {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    /* no-op */
  }
}

/* ── Locale fallback (no network) ─────────────────────────────────── */

/**
 * Derive a country code from the browser's own locale, e.g. "en-GB" → "GB".
 * Used when the network lookup fails or is blocked.
 */
export function countryFromLocale() {
  if (!isBrowser()) return null;

  const locales = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
  ].filter(Boolean);

  for (const locale of locales) {
    // Intl.Locale gives us the region subtag properly, including for
    // tags like "zh-Hans-CN" where a naive split would grab "Hans".
    try {
      const region = new Intl.Locale(locale).region;
      if (isValidCode(region)) return normalise(region);
    } catch {
      const region = String(locale).split('-')[1];
      if (isValidCode(region)) return normalise(region);
    }
  }
  return null;
}

/* ── Network lookup ───────────────────────────────────────────────── */

async function queryProvider(provider, signal) {
  const res = await fetch(provider.url, {
    signal,
    // No cookies or auth — we want an anonymous, cacheable GET.
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${provider.name} responded ${res.status}`);
  const payload = provider.asText ? await res.text() : await res.json();
  return normalise(provider.parse(payload));
}

/**
 * Detect the user's country.
 *
 * @returns {Promise<{ code: string|null, source: 'cache'|'ip'|'locale'|'unknown' }>}
 *          `source` lets the UI say *how* it decided, so the user can judge it.
 */
export async function detectCountry({ force = false } = {}) {
  if (!isBrowser()) return { code: null, source: 'unknown' };

  if (!force) {
    const cached = readCachedCountry();
    if (cached) return { code: cached, source: 'cache' };
  }

  for (const provider of PROVIDERS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
    try {
      const code = await queryProvider(provider, controller.signal);
      if (code) {
        writeCachedCountry(code);
        return { code, source: 'ip' };
      }
    } catch {
      /* try the next provider */
    } finally {
      clearTimeout(timer);
    }
  }

  const localeCode = countryFromLocale();
  if (localeCode) return { code: localeCode, source: 'locale' };

  return { code: null, source: 'unknown' };
}
