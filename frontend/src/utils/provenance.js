/**
 * Provenance stamped on every stored session in the full (non-Sinai) app, so a
 * stored result can always be traced to the engine build, guideline edition and
 * per-model versions that produced it.
 *
 * Values come from the results themselves where the engine supplied them; the
 * bundled engine's constants are the fallback. Do NOT import this from the Sinai
 * build: that build stores nothing (see src/sinai/noPersistence.test.js).
 */
import { ENGINE_VERSION, GUIDELINE_VERSION } from '@epsa/engine';

const present = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null && v !== ''));

/**
 * @param {{part1?: object|null, part2?: object|null}} results  engine results (part2 may carry apiPrediction)
 */
export function buildProvenance({ part1 = null, part2 = null } = {}) {
  return {
    engineVersion: part2?.engineVersion ?? part1?.engineVersion ?? ENGINE_VERSION,
    guidelineVersion: part2?.guidelineVersion ?? part1?.guidelineVersion ?? GUIDELINE_VERSION,
    modelVersions: present({
      part1: part1?.modelVersion,
      part2: part2?.modelVersion,
      // e-Biopsy model that scored Part 3 (only present when MRI data was entered).
      part3: part2?.apiPrediction?.model_version,
    }),
  };
}
