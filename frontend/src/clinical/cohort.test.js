import { describe, it, expect, vi } from 'vitest';

vi.mock('../services/psaEngineService', () => ({ computeSessionResults: vi.fn() }));
vi.mock('../utils/biopsyApi', () => ({ fetchBiopsyPrediction: vi.fn() }));
import { csvToObjects, jsonToObjects, normalisePatient, withPsaMri, parseActualGG, buildTemplateCsv } from './cohortParser';
import { classify, summariseComparison } from './cohortCompare';
import { runCohort } from './cohortRunner';

const norm = (row) => normalisePatient(row, 0, 'f.csv');

describe('cohortParser', () => {
  it('parses the template, skips the PHI notice line, handles quotes', () => {
    const rows = csvToObjects('"NOTICE: This file contains PHI."\n' + buildTemplateCsv());
    expect(rows).toHaveLength(3);
    expect(rows[1].patientId).toBe('P-002');
    expect(csvToObjects('id,age\n"a,b",5\n')[0].id).toBe('a,b');
  });

  it('normalises a full row into part1 + part2 with pathway', () => {
    const p = norm(csvToObjects(buildTemplateCsv())[0]);
    expect(p.issues).toEqual([]);
    expect(p.part1.pathwayMode).toBe('post_mri');
    expect(p.part2).toMatchObject({ psa: '4.8', pirads: '3', prostateVolume: '45', knowPirads: true });
    expect(p.part1.ipss.reduce((a, b) => a + b, 0)).toBe(6);
    expect(p.actual.gg).toBe(1);
    expect(p.actual.gg2).toBe(false);
  });

  it('Part-1-only row has no part2; missing optional fields are reported as assumed', () => {
    const p = norm({ id: 'x', age: 60, bmi: 25, ipssTotal: 3, shimTotal: 20 });
    expect(p.part2).toBeNull();
    expect(p.part1.pathwayMode).toBe('pre_psa');
    expect(p.assumed).toContain('exercise');
  });

  it('flags blocking issues instead of guessing', () => {
    const p = norm({ id: 'bad', age: 10, ipssTotal: 40 });
    expect(p.issues.join(' ')).toMatch(/Age 10/);
    expect(p.issues.join(' ')).toMatch(/BMI is missing/);
    expect(p.issues.join(' ')).toMatch(/IPSS total 40/);
  });

  it('derives BMI from height and weight', () => {
    expect(norm({ age: 50, heightCm: 180, weightKg: 81, ipssTotal: 1, shimTotal: 20 }).part1.bmi).toBe(25);
  });

  it('reads app JSON exports and arrays', () => {
    const one = jsonToObjects({ formData: { age: 55, bmi: 24 }, part2Data: { psa: 5, pirads: 4 } });
    expect(one[0]).toMatchObject({ age: 55, psa: 5, pirads: 4 });
    expect(jsonToObjects({ patients: [{ a: 1 }, { a: 2 }] })).toHaveLength(2);
  });

  it('parses actual outcomes', () => {
    expect(parseActualGG('benign')).toBe(0);
    expect(parseActualGG('GG3')).toBe(3);
    expect(parseActualGG('')).toBeNull();
    expect(norm({ age: 50, bmi: 25, ipssTotal: 1, shimTotal: 20, actualGG2: 'yes' }).actual).toMatchObject({ gg: null, gg2: true });
  });

  it('withPsaMri adds PSA/MRI and switches pathway', () => {
    const p = norm({ id: 'x', age: 60, bmi: 25, ipssTotal: 3, shimTotal: 20 });
    expect(withPsaMri(p, { psa: '6', prostateVolume: '', pirads: '' }).part1.pathwayMode).toBe('post_psa');
    const mri = withPsaMri(p, { psa: '6', prostateVolume: '40', pirads: '4' });
    expect(mri.part1.pathwayMode).toBe('post_mri');
    expect(mri.part2.pirads).toBe('4');
    expect(withPsaMri(p, { psa: '', prostateVolume: '', pirads: '' }).part2).toBeNull();
  });
});

describe('cohortCompare', () => {
  const mk = (prob, gg) => ({ results: { part3: { apiPrediction: { prob, threshold: 0.4 } } }, actual: { gg, gg2: gg === null ? null : gg >= 2 } });
  it('classifies against the model threshold', () => {
    expect(classify(mk(0.5, 3))).toBe('TP');
    expect(classify(mk(0.5, 1))).toBe('FP');
    expect(classify(mk(0.2, 3))).toBe('FN');
    expect(classify(mk(0.2, 0))).toBe('TN');
    expect(classify(mk(0.2, null))).toBeNull();
  });
  it('summarises metrics and AUC', () => {
    const s = summariseComparison([mk(0.9, 3), mk(0.8, 2), mk(0.1, 0), mk(0.6, 1), mk(0.2, 3), mk(0.3, null)]);
    expect(s).toMatchObject({ compared: 5, TP: 2, FP: 1, TN: 1, FN: 1 });
    expect(s.sensitivity).toBeCloseTo(2 / 3);
    expect(s.accuracy).toBeCloseTo(3 / 5);
    expect(s.auc).toBeCloseTo(5 / 6);
  });
  it('returns nulls with no comparable patients', () => {
    expect(summariseComparison([]).accuracy).toBeNull();
  });
});

describe('runCohort', () => {
  it('scores in order with bounded concurrency, skips invalid rows, isolates failures', async () => {
    const mkP = (uid, issues = [], mri = true) => ({ uid, id: `p${uid}`, issues, assumed: [], status: 'pending',
      part1: { pathwayMode: mri ? 'post_mri' : 'pre_psa' }, part2: mri ? { psa: '5', pirads: '4', prostateVolume: '40' } : null });
    let inflight = 0; let peak = 0;
    const deps = {
      computeSessionResults: async (p1, p2) => {
        inflight += 1; peak = Math.max(peak, inflight);
        await new Promise((r) => setTimeout(r, 5));
        inflight -= 1;
        if (p2?.psa === 'boom') throw new Error('network');
        return { preResult: { score: 10 }, postResult: p2 ? { riskPct: '12%' } : null };
      },
      fetchBiopsyPrediction: async () => ({ prob: 0.3, threshold: 0.4 }),
    };
    const bad = mkP(2, ['Age is missing']);
    const boom = mkP(3); boom.part2 = { psa: 'boom', pirads: '4' };
    const updates = {};
    await runCohort([mkP(1), bad, boom, mkP(4, [], false)], { concurrency: 2, deps, onUpdate: (uid, c) => { updates[uid] = { ...updates[uid], ...c }; } });
    expect(peak).toBeLessThanOrEqual(2);
    expect(updates[1].status).toBe('done');
    expect(updates[1].results.part3.apiPrediction.prob).toBe(0.3);
    expect(updates[2]).toMatchObject({ status: 'error', error: 'Age is missing' });
    expect(updates[3]).toMatchObject({ status: 'error', error: 'network' });
    expect(updates[4].results.part2).toBeNull();
  });
});
