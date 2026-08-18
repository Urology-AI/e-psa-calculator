import { describe, it, expect } from 'vitest';
import { getNarrationSegments, getPersonalizedSeekText, NARRATION_KEYS } from './narrationScript.js';

// The Tewari Voice service (app/voice/validators.py) rejects any text with
// more than 3 sentences, or any sentence over 25 words. Every segment we
// send it must satisfy this regardless of which patient facts are plugged
// in — these tests catch a template edit that pushes a sentence over the
// limit before it ships and starts 422ing in production.
const SENTENCE_SPLIT_REGEX = /(?<=[.!?])\s+/;
const MAX_SENTENCES = 3;
const MAX_WORDS_PER_SENTENCE = 25;

function assertValidatorSafe(segments) {
  for (const segment of segments) {
    const sentences = segment.split(SENTENCE_SPLIT_REGEX).filter(Boolean);
    expect(sentences.length, `too many sentences in: "${segment}"`).toBeLessThanOrEqual(MAX_SENTENCES);
    for (const sentence of sentences) {
      const words = sentence.split(/\s+/).filter(Boolean).length;
      expect(words, `too many words in sentence: "${sentence}"`).toBeLessThanOrEqual(MAX_WORDS_PER_SENTENCE);
    }
  }
}

// A fully-populated patient — every optional fact present, and long enough
// (multi-digit age, decimal PSA, named risk tier) to stress the templates'
// word counts the way sparse/default facts wouldn't.
const RICH_FACTS = {
  age: 62,
  isBlack: true,
  fhBinary: 1,
  brcaStatus: 'yes',
  psaValue: 8.4,
  score: 71,
  riskCat: 'High Risk',
  highGradeRisk: { percent: 46 },
};

describe('getNarrationSegments', () => {
  it('returns null when there is no reason key', () => {
    expect(getNarrationSegments({}, {})).toBeNull();
  });

  it.each(NARRATION_KEYS)('stays within voice-service limits for "%s" with a fully-populated patient', (key) => {
    const result = { psaRecommendReason: key, recommendPSA: true, ...RICH_FACTS };
    const segments = getNarrationSegments(result, result);
    expect(segments).not.toBeNull();
    expect(segments.length).toBeGreaterThan(0);
    assertValidatorSafe(segments);
  });

  it.each(NARRATION_KEYS)('stays within voice-service limits for "%s" with a sparse/missing-data patient', (key) => {
    const result = { psaRecommendReason: key, recommendPSA: true };
    const segments = getNarrationSegments(result, result);
    expect(segments).not.toBeNull();
    assertValidatorSafe(segments);
  });

  it('cites the actual AUA/NCCN 2026 guidelines in the closing, not a generic disclaimer', () => {
    const psaResult = { psaRecommendReason: 'score_threshold', ...RICH_FACTS };
    const psaText = getNarrationSegments(psaResult, psaResult).join(' ');
    expect(psaText).toMatch(/A U A/);
    expect(psaText).toMatch(/N C C N/);

    const biopsyResult = { biopsyReason: 'pirads_5', ...RICH_FACTS };
    const biopsyText = getNarrationSegments(biopsyResult, biopsyResult).join(' ');
    expect(biopsyText).toMatch(/A U A/);
    expect(biopsyText).toMatch(/N C C N/);
  });
});

describe('getPersonalizedSeekText', () => {
  it('returns null when there is nothing to personalize', () => {
    expect(getPersonalizedSeekText({}, {})).toBeNull();
  });

  it('weaves in real patient facts instead of generic phrasing', () => {
    const result = { psaRecommendReason: 'high_risk_early_screening', age: 45, isBlack: true, fhBinary: 0 };
    const text = getPersonalizedSeekText(result, result);
    expect(text).toContain('45');
    expect(text).toContain('Black ancestry');
  });

  it('coerces string-typed facts instead of silently dropping them', () => {
    // Some callers (e.g. Part3Results' `age: preResult?.age ?? preData?.age`
    // fallback chain) aren't guaranteed to hand through actual numbers.
    const result = { psaRecommendReason: 'baseline_psa_45_50', age: '47' };
    const text = getPersonalizedSeekText(result, result);
    expect(text).toContain('47');
  });
});
