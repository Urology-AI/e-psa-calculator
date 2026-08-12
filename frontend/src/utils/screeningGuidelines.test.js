import { describe, it, expect } from 'vitest';
import {
  REGION_GUIDANCE,
  COUNTRY_TO_REGION,
  DEFAULT_REGION_ID,
  getRegionById,
  getRegionForCountry,
  listRegions,
} from './screeningGuidelines';

describe('screening guidance dataset', () => {
  it('gives every region the fields the card renders', () => {
    for (const region of REGION_GUIDANCE) {
      expect(region.id, 'id').toBeTruthy();
      expect(region.name, `${region.id} name`).toBeTruthy();
      expect(region.body, `${region.id} body`).toBeTruthy();
      expect(region.year, `${region.id} year`).toBeTruthy();
      expect(region.posture?.label, `${region.id} posture`).toBeTruthy();
      expect(region.summary?.length, `${region.id} summary`).toBeGreaterThan(40);
      expect(region.sources?.length, `${region.id} sources`).toBeGreaterThan(0);
      for (const source of region.sources) {
        expect(source.text, `${region.id} source text`).toBeTruthy();
        expect(source.url, `${region.id} source url`).toMatch(/^https:\/\//);
      }
    }
  });

  it('has unique region ids', () => {
    const ids = REGION_GUIDANCE.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('maps every country to a region that actually exists', () => {
    const ids = new Set(REGION_GUIDANCE.map((r) => r.id));
    for (const [country, regionId] of Object.entries(COUNTRY_TO_REGION)) {
      expect(country).toMatch(/^[A-Z]{2}$/);
      expect(ids.has(regionId), `${country} → ${regionId}`).toBe(true);
    }
  });

  it('resolves the regions the user asked to be covered', () => {
    expect(getRegionForCountry('IN').id).toBe('south_asia');
    expect(getRegionForCountry('NG').id).toBe('ssa');
    expect(getRegionForCountry('ZA').id).toBe('ssa');
    expect(getRegionForCountry('SA').id).toBe('mena');
    expect(getRegionForCountry('AE').id).toBe('mena');
    expect(getRegionForCountry('EG').id).toBe('mena');
    expect(getRegionForCountry('RU').id).toBe('russia_cis');
    expect(getRegionForCountry('US').id).toBe('us');
    expect(getRegionForCountry('GB').id).toBe('uk');
    expect(getRegionForCountry('AU').id).toBe('anz');
  });

  it('is case and whitespace tolerant on the country code', () => {
    expect(getRegionForCountry('in').id).toBe('south_asia');
    expect(getRegionForCountry(' ng ').id).toBe('ssa');
  });

  it('falls back to international guidance for unknown or missing codes', () => {
    expect(getRegionForCountry('ZZ').id).toBe(DEFAULT_REGION_ID);
    expect(getRegionForCountry(null).id).toBe(DEFAULT_REGION_ID);
    expect(getRegionForCountry(undefined).id).toBe(DEFAULT_REGION_ID);
    expect(getRegionForCountry('').id).toBe(DEFAULT_REGION_ID);
    expect(getRegionById('not-a-region').id).toBe(DEFAULT_REGION_ID);
  });

  it('sorts the international fallback last in the picker', () => {
    const regions = listRegions();
    expect(regions).toHaveLength(REGION_GUIDANCE.length);
    expect(regions[regions.length - 1].id).toBe(DEFAULT_REGION_ID);
  });
});
