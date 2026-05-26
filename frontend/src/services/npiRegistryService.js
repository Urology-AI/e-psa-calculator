/* NPI Registry lookup service
 * Uses the CMS National Plan and Provider Enumeration System (NPPES) public API.
 * No API key required. Urology taxonomy code: 208800000X
 */

const IS_DEV = import.meta.env.DEV;
const NPI_API = IS_DEV
  ? '/dev-proxy/npi/?version=2.1'
  : 'https://npiregistry.cms.hhs.gov/api/?version=2.1';
const NOMINATIM = IS_DEV
  ? '/dev-proxy/nominatim'
  : 'https://nominatim.openstreetmap.org';
const UROLOGY_TAXONOMY = '208800000X';

const zipGeoCache = new Map();

async function geocodeZip(zip) {
  if (zipGeoCache.has(zip)) return zipGeoCache.get(zip);
  try {
    const res = await fetch(
      `${NOMINATIM}/search?postalcode=${encodeURIComponent(zip)}&countrycode=us&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    if (!data?.length) return null;
    const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), displayName: data[0].display_name };
    zipGeoCache.set(zip, result);
    return result;
  } catch {
    return null;
  }
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function kmToMiles(km) {
  return km * 0.621371;
}

function extractPracticeAddress(provider) {
  const addrs = provider.addresses || [];
  return (
    addrs.find((a) => a.address_purpose === 'LOCATION') ||
    addrs.find((a) => a.address_purpose === 'MAILING') ||
    addrs[0] ||
    null
  );
}

function formatProvider(provider, distanceMiles) {
  const b = provider.basic || {};
  const addr = extractPracticeAddress(provider);
  const taxonomies = (provider.taxonomies || []).filter(
    (t) => t.code === UROLOGY_TAXONOMY || (t.desc || '').toLowerCase().includes('urology')
  );
  const isPrimary = taxonomies.some((t) => t.primary);

  const fullName = [b.name_prefix, b.first_name, b.middle_name, b.last_name, b.name_suffix, b.credential]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    npi: provider.number,
    name: fullName || b.organization_name || 'Unknown Provider',
    credential: b.credential || '',
    gender: b.gender || '',
    address: addr
      ? {
          line1: addr.address_1 || '',
          line2: addr.address_2 || '',
          city: addr.city || '',
          state: addr.state || '',
          zip: addr.postal_code || '',
          phone: addr.telephone_number || '',
          fax: addr.fax_number || '',
        }
      : null,
    taxonomyDesc: taxonomies[0]?.desc || 'Urology',
    isPrimaryUrology: isPrimary,
    distanceMiles,
  };
}

async function searchNpi(params) {
  const qs = new URLSearchParams({ ...params, limit: 25 }).toString();
  const res = await fetch(`${NPI_API}&${qs}`);
  if (!res.ok) throw new Error(`NPI API error: ${res.status}`);
  const data = await res.json();
  return data.results || [];
}

/**
 * Find board-certified urologists near a given US zip code.
 * Returns providers sorted by distance (miles).
 *
 * @param {string} patientZip - 5-digit US zip code
 * @param {number} maxMiles - radius filter (default 25; falls back to 50 if < 3 results)
 * @returns {{ providers: Array, patientGeo: object|null, error: string|null }}
 */
export async function findUrologists(patientZip, maxMiles = 25) {
  const zip = patientZip.trim().replace(/\D/g, '').slice(0, 5);
  if (zip.length !== 5) return { providers: [], patientGeo: null, error: 'Please enter a valid 5-digit ZIP code.' };

  const patientGeo = await geocodeZip(zip);

  // Primary search: by zip code
  let raw = [];
  try {
    raw = await searchNpi({ postal_code: zip, taxonomy_description: 'Urology' });
  } catch (e) {
    return { providers: [], patientGeo, error: 'Could not reach the provider directory. Please try again.' };
  }

  // Secondary search: expand to city/state if few results
  if (raw.length < 5 && patientGeo) {
    try {
      // Parse city from Nominatim display_name (first segment)
      const city = patientGeo.displayName?.split(',')[0]?.trim();
      const stateMatch = patientGeo.displayName?.match(/,\s*([A-Z]{2})\s*\d/);
      const state = stateMatch?.[1];
      if (city && state) {
        const extra = await searchNpi({ city, state, taxonomy_description: 'Urology' });
        const seen = new Set(raw.map((p) => p.number));
        extra.forEach((p) => { if (!seen.has(p.number)) raw.push(p); });
      }
    } catch {
      // Secondary search is best-effort
    }
  }

  // Geocode each unique zip code in results and calculate distances
  const uniqueZips = [...new Set(raw.map((p) => extractPracticeAddress(p)?.postal_code?.slice(0, 5)).filter(Boolean))];
  await Promise.all(uniqueZips.map((z) => geocodeZip(z)));

  const withDistance = raw.map((provider) => {
    const addr = extractPracticeAddress(provider);
    const provZip = addr?.postal_code?.slice(0, 5);
    let distanceMiles = null;
    if (patientGeo && provZip) {
      const provGeo = zipGeoCache.get(provZip);
      if (provGeo) {
        distanceMiles = kmToMiles(haversineKm(patientGeo.lat, patientGeo.lng, provGeo.lat, provGeo.lng));
      }
    }
    return { provider, distanceMiles };
  });

  // Sort by distance (null distances go to end)
  withDistance.sort((a, b) => {
    if (a.distanceMiles === null && b.distanceMiles === null) return 0;
    if (a.distanceMiles === null) return 1;
    if (b.distanceMiles === null) return -1;
    return a.distanceMiles - b.distanceMiles;
  });

  // Filter by radius; fall back to 50 miles if very few results
  let filtered = withDistance.filter((x) => x.distanceMiles === null || x.distanceMiles <= maxMiles);
  if (filtered.length < 3 && patientGeo) {
    filtered = withDistance.filter((x) => x.distanceMiles === null || x.distanceMiles <= 50);
  }
  if (!patientGeo) filtered = withDistance; // no geo → show all

  const providers = filtered.slice(0, 20).map((x) => formatProvider(x.provider, x.distanceMiles));

  return { providers, patientGeo, error: null };
}
