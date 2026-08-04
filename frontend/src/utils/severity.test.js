import { describe, it, expect } from 'vitest';
import { pointsToSeverity, toSeverityBreakdown, toContributionPct, SEVERITY_LABELS } from './severity.js';

describe('pointsToSeverity', () => {
  it('returns null for zero, negative, or non-finite points', () => {
    expect(pointsToSeverity(0)).toBeNull();
    expect(pointsToSeverity(-5)).toBeNull();
    expect(pointsToSeverity(NaN)).toBeNull();
    expect(pointsToSeverity(undefined)).toBeNull();
  });

  it('buckets 1-3 as low', () => {
    expect(pointsToSeverity(1)).toBe('low');
    expect(pointsToSeverity(3)).toBe('low');
  });

  it('buckets 4-9 as medium', () => {
    expect(pointsToSeverity(4)).toBe('medium');
    expect(pointsToSeverity(9)).toBe('medium');
  });

  it('buckets 10+ as high', () => {
    expect(pointsToSeverity(10)).toBe('high');
    expect(pointsToSeverity(16)).toBe('high');
  });

  it('SEVERITY_LABELS has an entry for every non-null bucket', () => {
    expect(SEVERITY_LABELS.high).toBe('High');
    expect(SEVERITY_LABELS.medium).toBe('Medium');
    expect(SEVERITY_LABELS.low).toBe('Low');
  });
});

describe('toSeverityBreakdown', () => {
  it('strips zero/negative-point items and keeps item/value/severity only', () => {
    const impacts = [
      { item: 'Age', value: '65', points: 16 },
      { item: 'BMI', value: '26', points: 0 },
      { item: 'Exercise', value: 'regular', points: -2 },
      { item: 'Diet', value: 'western', points: 6 },
    ];
    const result = toSeverityBreakdown(impacts);
    expect(result).toEqual([
      { item: 'Age', value: '65', severity: 'high' },
      { item: 'Diet', value: 'western', severity: 'medium' },
    ]);
  });

  it('handles null/undefined input without throwing', () => {
    expect(toSeverityBreakdown(null)).toEqual([]);
    expect(toSeverityBreakdown(undefined)).toEqual([]);
  });
});

describe('toContributionPct', () => {
  it('normalizes positive points into whole-number percents of the positive total', () => {
    // Matches the real profile observed in-browser this session: Age 13, FH 10, Black 8, Diet 6 → total 37.
    const impacts = [
      { item: 'Age', points: 13 },
      { item: 'Family history', points: 10 },
      { item: 'Black ancestry', points: 8 },
      { item: 'Diet pattern', points: 6 },
    ];
    const pct = toContributionPct(impacts);
    expect(pct.get('Age')).toBe(35);            // 13/37 = 35.1% → 35
    expect(pct.get('Family history')).toBe(27); // 10/37 = 27.0% → 27
    expect(pct.get('Black ancestry')).toBe(22); // 8/37 = 21.6% → 22
    expect(pct.get('Diet pattern')).toBe(16);   // 6/37 = 16.2% → 16
  });

  it('excludes zero/negative/non-finite points from both numerator and denominator', () => {
    const impacts = [
      { item: 'Age', points: 10 },
      { item: 'Exercise', points: -3 },   // negative — must not reduce the denominator
      { item: 'BMI', points: 0 },          // zero — excluded
      { item: 'Diet', points: NaN },       // non-finite — excluded
    ];
    const pct = toContributionPct(impacts);
    expect(pct.get('Age')).toBe(100); // sole positive contributor
    expect(pct.has('Exercise')).toBe(false);
    expect(pct.has('BMI')).toBe(false);
    expect(pct.has('Diet')).toBe(false);
  });

  it('returns an empty map when there are no positive-point items', () => {
    expect(toContributionPct([]).size).toBe(0);
    expect(toContributionPct([{ item: 'BMI', points: 0 }]).size).toBe(0);
    expect(toContributionPct([{ item: 'Exercise', points: -5 }]).size).toBe(0);
  });

  it('handles null/undefined input without throwing', () => {
    expect(toContributionPct(null).size).toBe(0);
    expect(toContributionPct(undefined).size).toBe(0);
  });

  it('handles string-typed points (as arrive over JSON) the same as numbers', () => {
    const impacts = [
      { item: 'Age', points: '10' },
      { item: 'Diet', points: '10' },
    ];
    const pct = toContributionPct(impacts);
    expect(pct.get('Age')).toBe(50);
    expect(pct.get('Diet')).toBe(50);
  });
});
