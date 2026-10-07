import { describe, it, expect } from 'vitest';
import { ENGINE_VERSION, GUIDELINE_VERSION } from '@epsa/engine';
import { buildProvenance } from './provenance';

describe('buildProvenance', () => {
  it('falls back to the bundled engine and guideline versions', () => {
    const p = buildProvenance({ part1: { modelVersion: 'p1-v' } });
    expect(p.engineVersion).toBe(ENGINE_VERSION);
    expect(p.guidelineVersion).toBe(GUIDELINE_VERSION);
    expect(p.modelVersions).toEqual({ part1: 'p1-v' });
  });

  it('prefers versions the engine stamped on the result', () => {
    const p = buildProvenance({
      part1: { engineVersion: '0.2.4', guidelineVersion: 'AUA/SUO 2025', modelVersion: 'a' },
      part2: { engineVersion: '0.2.5', guidelineVersion: 'AUA/SUO 2026', modelVersion: 'b',
               apiPrediction: { model_version: 'v4 (PSA + volume + PI-RADS)' } },
    });
    expect(p).toEqual({
      engineVersion: '0.2.5',
      guidelineVersion: 'AUA/SUO 2026',
      modelVersions: { part1: 'a', part2: 'b', part3: 'v4 (PSA + volume + PI-RADS)' },
    });
  });

  it('records no part3 version when no biopsy prediction was made', () => {
    const p = buildProvenance({ part1: { modelVersion: 'a' }, part2: { modelVersion: 'b', apiPrediction: null } });
    expect(p.modelVersions).toEqual({ part1: 'a', part2: 'b' });
  });

  it('works with no results at all', () => {
    expect(buildProvenance()).toEqual({
      engineVersion: ENGINE_VERSION, guidelineVersion: GUIDELINE_VERSION, modelVersions: {},
    });
  });
});
