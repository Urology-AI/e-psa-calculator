import { describe, it, expect, vi } from 'vitest';

// The service pulls in Firebase; provenance logic is pure, so stub the SDKs.
vi.mock('firebase/firestore', () => ({}));
vi.mock('firebase/auth', () => ({}));
vi.mock('../config/firebase', () => ({ db: null, auth: null, isFirebaseConfigured: () => false }));

const { normaliseSession } = await import('./clinicalSessionService');

describe('normaliseSession provenance', () => {
  it('derives per-part model versions from the results', () => {
    const s = normaliseSession({
      engineResult: { modelVersion: 'p1', engineVersion: '0.2.5' },
      postResult: { modelVersion: 'p2', guidelineVersion: 'AUA/SUO 2026', apiPrediction: { model_version: 'v4' } },
    });
    expect(s.modelVersions).toEqual({ part1: 'p1', part2: 'p2', part3: 'v4' });
    expect(s.guidelineVersion).toBe('AUA/SUO 2026');
    expect(s.engineVersion).toBe('0.2.5');
  });

  it('does not invent a guideline version for a session that never recorded one', () => {
    expect(normaliseSession({ engineResult: { modelVersion: 'p1' } }).guidelineVersion).toBeNull();
  });
});
