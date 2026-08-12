import { useCallback, useEffect, useState } from 'react';
import {
  detectCountry,
  getRegionOverride,
  setRegionOverride,
} from '../utils/geoCountry';
import {
  DEFAULT_REGION_ID,
  getRegionById,
  getRegionForCountry,
} from '../utils/screeningGuidelines';

/**
 * Resolves which country/region's screening guidance to show.
 *
 * Precedence: an explicit user choice always wins over IP detection, and
 * persists across sessions. Detection only fills in the first guess.
 *
 * @returns {{
 *   region: object,              // the guidance record to render
 *   country: string|null,        // detected ISO-2 code, if any
 *   source: 'override'|'ip'|'cache'|'locale'|'unknown'|'pending',
 *   loading: boolean,
 *   isOverridden: boolean,
 *   selectRegion: (regionId: string) => void,
 *   clearSelection: () => void,
 * }}
 */
export function useRegionalGuidance() {
  const override = getRegionOverride();

  const [regionId, setRegionId] = useState(override || DEFAULT_REGION_ID);
  const [country, setCountry] = useState(null);
  const [source, setSource] = useState(override ? 'override' : 'pending');
  const [loading, setLoading] = useState(!override);

  useEffect(() => {
    // An explicit choice means there is nothing to detect.
    if (override) return undefined;

    let cancelled = false;

    detectCountry()
      .then(({ code, source: detectedSource }) => {
        if (cancelled) return;
        setCountry(code);
        setRegionId(getRegionForCountry(code).id);
        setSource(detectedSource);
      })
      .catch(() => {
        if (!cancelled) setSource('unknown');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
    // `override` is read once at mount; selectRegion updates state directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectRegion = useCallback((nextRegionId) => {
    setRegionOverride(nextRegionId);
    setRegionId(nextRegionId);
    setSource('override');
    setLoading(false);
  }, []);

  const clearSelection = useCallback(() => {
    setRegionOverride(null);
    setLoading(true);
    detectCountry()
      .then(({ code, source: detectedSource }) => {
        setCountry(code);
        setRegionId(getRegionForCountry(code).id);
        setSource(detectedSource);
      })
      .catch(() => setSource('unknown'))
      .finally(() => setLoading(false));
  }, []);

  return {
    region: getRegionById(regionId),
    country,
    source,
    loading,
    isOverridden: source === 'override',
    selectRegion,
    clearSelection,
  };
}

export default useRegionalGuidance;
