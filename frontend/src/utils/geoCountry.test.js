import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  detectCountry,
  countryFromLocale,
  getRegionOverride,
  setRegionOverride,
  clearCountryCache,
} from './geoCountry';

/* The suite runs under vitest's `node` environment (see vite.config.js), so we
 * stub the couple of browser globals geoCountry touches rather than pulling in
 * a full DOM. */
const makeLocalStorage = () => {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
};

const CLOUDFLARE_TRACE = 'fl=abc123\nip=203.0.113.7\nts=1700000000\nloc=NG\ncolo=LOS\n';

const stubNavigator = (languages, language = languages[0] ?? '') =>
  vi.stubGlobal('navigator', { languages, language });

const mockFetch = (impl) => {
  const fn = vi.fn(impl);
  vi.stubGlobal('fetch', fn);
  return fn;
};

describe('geoCountry', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: makeLocalStorage() });
    stubNavigator([]);
    clearCountryCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('parses the country out of a Cloudflare trace response', async () => {
    mockFetch(async () => ({ ok: true, status: 200, text: async () => CLOUDFLARE_TRACE }));
    await expect(detectCountry()).resolves.toEqual({ code: 'NG', source: 'ip' });
  });

  it('caches the result so a second call makes no network request', async () => {
    const fetchFn = mockFetch(async () => ({
      ok: true, status: 200, text: async () => CLOUDFLARE_TRACE,
    }));

    await detectCountry();
    expect(fetchFn).toHaveBeenCalledTimes(1);

    await expect(detectCountry()).resolves.toEqual({ code: 'NG', source: 'cache' });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('re-queries when the caller forces a refresh', async () => {
    const fetchFn = mockFetch(async () => ({
      ok: true, status: 200, text: async () => CLOUDFLARE_TRACE,
    }));

    await detectCountry();
    await detectCountry({ force: true });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('falls through to the second provider when the first fails', async () => {
    const fetchFn = mockFetch(async (url) => {
      if (String(url).includes('cloudflare')) throw new Error('blocked');
      return { ok: true, status: 200, json: async () => ({ country: 'IN' }) };
    });

    await expect(detectCountry()).resolves.toEqual({ code: 'IN', source: 'ip' });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('falls back to the browser locale when every provider fails', async () => {
    mockFetch(async () => { throw new Error('offline'); });
    stubNavigator(['ru-RU']);

    await expect(detectCountry()).resolves.toEqual({ code: 'RU', source: 'locale' });
  });

  it('does not cache a locale-derived guess as if it were a real lookup', async () => {
    mockFetch(async () => { throw new Error('offline'); });
    stubNavigator(['ru-RU']);
    await detectCountry();

    // A later successful lookup must win rather than reading a stale cache.
    mockFetch(async () => ({ ok: true, status: 200, text: async () => CLOUDFLARE_TRACE }));
    await expect(detectCountry()).resolves.toEqual({ code: 'NG', source: 'ip' });
  });

  it('ignores a non-2xx response', async () => {
    mockFetch(async () => ({ ok: false, status: 503, text: async () => '' }));
    await expect(detectCountry()).resolves.toEqual({ code: null, source: 'unknown' });
  });

  it('rejects a malformed country value', async () => {
    mockFetch(async () => ({ ok: true, status: 200, text: async () => 'loc=XXX\n' }));
    await expect(detectCountry()).resolves.toEqual({ code: null, source: 'unknown' });
  });

  it('survives localStorage throwing (private browsing)', async () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => { throw new Error('denied'); },
        setItem: () => { throw new Error('denied'); },
        removeItem: () => { throw new Error('denied'); },
      },
    });
    mockFetch(async () => ({ ok: true, status: 200, text: async () => CLOUDFLARE_TRACE }));

    await expect(detectCountry()).resolves.toEqual({ code: 'NG', source: 'ip' });
    expect(getRegionOverride()).toBeNull();
  });

  describe('countryFromLocale', () => {
    it('reads the region subtag from a multi-part tag', () => {
      stubNavigator(['zh-Hans-CN']);
      expect(countryFromLocale()).toBe('CN');
    });

    it('skips language-only tags and uses the first with a region', () => {
      stubNavigator(['en', 'en-AU']);
      expect(countryFromLocale()).toBe('AU');
    });

    it('returns null when no locale carries a region', () => {
      stubNavigator(['en']);
      expect(countryFromLocale()).toBeNull();
    });
  });

  describe('region override', () => {
    it('round-trips and clears', () => {
      expect(getRegionOverride()).toBeNull();
      setRegionOverride('mena');
      expect(getRegionOverride()).toBe('mena');
      setRegionOverride(null);
      expect(getRegionOverride()).toBeNull();
    });
  });
});
