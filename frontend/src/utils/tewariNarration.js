// Multi-segment narration scripts for Dr. Tewari's voice, modeled on a real
// SHARE-approach shared decision-making consultation (see project reference
// recording). Each segment is plain text, <=3 sentences and <=25 words per
// sentence, to satisfy the Tewari Voice service's text preconditions
// (app/voice/validators.py in tewari-voice). A full narration is assembled as
// [opener segment(s)] + [stage explainer segments] + [closing segment],
// played back-to-back as separate synthesis calls.

// Extracts the raw patient facts used to personalize narration from the
// Model 1 (pre_psa) result — age, ancestry, family history, genetic mutation
// — and the current stage's own result — PSA value. Model 2/3 results don't
// carry age/ancestry/family history themselves, so `preResult` (Model 1's
// output, already available to Part2Results/Part3Results as a prop) is
// checked first for those fields.
// Coerces to a finite number, or null. Some call sites hand these fields
// through as numeric strings (e.g. Part3Results' `age: preResult?.age ??
// preData?.age` fallback chain) rather than actual numbers — Number.isFinite
// rejects those outright, which was silently dropping a real age/score/PSA
// value to null instead of speaking it. Guards null/undefined explicitly
// first since Number(null) is 0, not NaN — a real "no value" must stay null,
// not silently become the number 0.
function toFiniteNumber(value) {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function extractPatientFacts(result, preResult) {
  const source = preResult || result || {};
  const r = result || {};
  const brcaPositive = ['yes', 'positive', 'lynch', 'other_elevated', 'other_unknown'].includes(source.brcaStatus);
  const guidelineSupportCount = r.biopsyGuidelineSupportCount ?? r.tierGuidelineSupportCount ?? r.psaGuidelineSupportCount ?? null;
  return {
    age: toFiniteNumber(source.age),
    isBlack: Boolean(source.isBlack),
    hasFamilyHistory: source.fhBinary === 1,
    brcaPositive,
    psaValue: toFiniteNumber(r.psaValue),
    // Model 1 (pre_psa) score, 0-100.
    epsaScore: toFiniteNumber(source.score),
    // Model 2/3 combined risk tier label (e.g. "High Risk").
    riskTier: r.riskCat || null,
    // Model 3 clinically-significant-cancer probability, 0-100.
    highGradeRiskPercent: r.highGradeRisk?.percent != null ? Math.round(toFiniteNumber(r.highGradeRisk.percent)) : null,
    // How many of the 4 major guidelines (AUA/SUO, NCCN, EAU, ERSPC) support this recommendation.
    guidelineSupportCount: toFiniteNumber(guidelineSupportCount),
  };
}

function ancestryOrGeneticRiskFactor(facts) {
  if (facts.isBlack && facts.hasFamilyHistory) return 'your Black ancestry and family history';
  if (facts.isBlack) return 'your Black ancestry';
  if (facts.brcaPositive) return 'a genetic mutation in your results';
  return 'your family history';
}

// Personalized opener per sdmGuide reason key — why this conversation is
// happening for this patient specifically. Mirrors SHARE_GUIDE_CONTENT
// seekPrompt in epsa-engine/src/epsaEngine.js, rewritten as spoken monologue
// and parameterized on the patient's actual age/risk factors/PSA value where
// that data is available (falls back to generic phrasing otherwise).
const OPENERS = {
  score_threshold: (f) => [
    `I want to flag something from your results. ${f.age ? `At ${f.age}, your` : 'Your'} ePSA score${f.epsaScore != null ? ` of ${f.epsaScore} percent` : ''} raised a discussion about PSA testing, though no major guideline requires it based on your profile alone.`,
    'This is a model-flagged discussion, not a mandate. I would like to walk through it with you, not just order a test.',
  ],
  baseline_psa_45_50: (f) => [
    `${f.age ? `At age ${f.age}, getting` : 'Getting'} a baseline PSA now is not urgent, but it can give us something to compare against later.`,
    'I want to walk you through what that comparison would actually be worth for you.',
  ],
  age_guideline_50_69: (f) => [
    `At ${f.age || 'your current'} years old, you are in the age range where routine PSA screening is a standard part of care for most men.`,
    'I would like to walk through what the test involves before we decide on timing together.',
  ],
  high_risk_early_screening: (f) => [
    `I want to flag something before we go further.${f.age ? ` At ${f.age},` : ''} ${ancestryOrGeneticRiskFactor(f)} is why we are having this conversation earlier than usual.`,
    'That is real, and it matters for you specifically, so let me walk you through what the test can and cannot tell us.',
  ],
  family_history_override: (f) => [
    `I want to flag something from your history. A close relative with prostate cancer is why we are talking about earlier screening for you${f.age ? ` at ${f.age}` : ''}.`,
    'That family history matters, so let me walk through what this test can and cannot tell us.',
  ],
  older_shared_decision: (f) => [
    `At ${f.age || 'this'} years old, whether to keep screening should be about your overall health, not just a number.`,
    'Some men your age continue, others stop, and neither one is the wrong answer. Let me walk through what matters here.',
  ],
  symptomatic_out_of_guideline: () => [
    'I want to separate two things. Your urinary symptoms deserve their own evaluation, separate from any decision about PSA screening.',
    'Let me walk through what that evaluation would actually involve.',
  ],
  low_risk_followup: () => [
    'I looked at your results, and nothing here points to a specific reason to test right now.',
  ],
  not_recommended: () => [
    'Nothing in your results flags a specific reason to test today, and that is a good thing.',
  ],
  psa_elevated: (f) => [
    `Your PSA came back${f.psaValue ? ` at ${f.psaValue} ng per mL,` : ' elevated,'} which is a signal, not an answer. Before we talk about a biopsy, I want to walk through what an MRI would add here.`,
  ],
  combined_risk_elevated: (f) => [
    `Your combined risk profile is${f.riskTier ? ` ${f.riskTier}.` : ' elevated.'}${f.psaValue ? ` Your PSA came back at ${f.psaValue} ng per mL.` : ''} I want to talk about an MRI before any biopsy decision.`,
    'Let me walk through what that imaging would actually tell us.',
  ],
  high_risk_profile: (f) => [
    `Your overall risk profile${f.age ? ` at ${f.age}` : ''}${f.riskTier ? `, now at ${f.riskTier},` : ''} is why I want to talk about an MRI before any biopsy decision.`,
    'Let me walk through what that imaging would actually add here.',
  ],
  discordance: (f) => [
    `Your ePSA profile reads higher than your PSA value alone would suggest.${f.psaValue ? ` Your PSA came back at ${f.psaValue} ng per mL.` : ''} I want to understand why before any biopsy decision.`,
    'An MRI first can help clarify what is going on.',
  ],
  pirads_5: (f) => [
    'Your imaging came back with a finding significant enough that a biopsy is now part of the conversation.',
    `${f.highGradeRiskPercent != null ? `Your estimated chance of a significant finding is ${f.highGradeRiskPercent} percent. ` : ''}A biopsy is not automatic even with this finding, so let me walk through what it would involve.`,
  ],
  pirads_4: (f) => [
    'Your imaging finding is why I want to talk about a biopsy as a next step.',
    `${f.highGradeRiskPercent != null ? `Your model-estimated risk is ${f.highGradeRiskPercent} percent. ` : ''}That does not mean a biopsy is the only path forward, so let me walk through it with you.`,
  ],
  combined_score_high: (f) => [
    `Your combined risk score is high enough that biopsy is part of the conversation now.${f.psaValue ? ` Your PSA came back at ${f.psaValue} ng per mL.` : ''}`,
    `${f.highGradeRiskPercent != null ? `Your estimated risk is ${f.highGradeRiskPercent} percent. ` : ''}Let me walk through what is driving that score and what a biopsy would actually involve.`,
  ],
  high_risk_discordance: (f) => [
    'There is a mismatch between your high-risk profile and your imaging results, and I want to understand it before any decision.',
    `${f.highGradeRiskPercent != null ? `Your estimated risk from the model is ${f.highGradeRiskPercent} percent. ` : ''}Let me walk through what a biopsy would involve here.`,
  ],
};

// Kept deliberately short and simple, one idea per sentence — the TTS model
// showed real garbling (hallucinated/dropped words) on longer, comma-heavy
// compound sentences during testing. Shorter sentences reduced that.
const STAGE_EXPLAINERS = {
  psa: [
    'Prostate specific antigen, or PSA, is a protein your prostate makes.',
    'A little of it normally leaks into your blood. The test just measures how much is there.',
    'A high number does not automatically mean cancer.',
    'The upside is real. Catching an aggressive cancer early can save your life.',
    'The downside is real too. PSA cannot tell a dangerous cancer apart from a harmless one.',
    'If your PSA comes back high, the next step is usually more testing, not an automatic biopsy.',
    'Even if something is found, slow-growing cases can often just be watched instead of treated right away.',
  ],
  mri: [
    'An MRI creates detailed images of your prostate before we decide on any biopsy.',
    'It helps show whether there is a specific area that needs closer attention.',
    'The upside is that imaging can help avoid an unnecessary biopsy, or make a needed one more precise.',
    'The downside is that imaging is not perfect. We will weigh it alongside your other risk factors.',
  ],
  biopsy: [
    'A biopsy takes small tissue samples from the prostate to check for cancer directly.',
    'It is the only way to confirm a diagnosis.',
    'It does carry real risks, including bleeding, infection, and anxiety while you wait for results.',
    'Even if a biopsy finds cancer, that does not mean immediate treatment is required.',
    'Slow-growing cancers can often just be monitored closely instead, an approach called active surveillance.',
  ],
};

const CLOSINGS = {
  screening: 'Whatever we decide today is not carved in stone. We can revisit this together at your next visit, or sooner if anything changes.',
  biopsy: 'If results come back concerning, that does not mean panic or a rushed decision. We will sit down together and talk through the next step, just like we are doing right now.',
  none: 'If you have any concerns at all about your prostate cancer risk, it is always worth raising with me, even if nothing was flagged today.',
};

// Which stage explainer + closing applies to each key.
const KEY_STAGE = {
  score_threshold: 'psa',
  baseline_psa_45_50: 'psa',
  age_guideline_50_69: 'psa',
  high_risk_early_screening: 'psa',
  family_history_override: 'psa',
  older_shared_decision: 'psa',
  symptomatic_out_of_guideline: 'psa',
  low_risk_followup: 'none',
  not_recommended: 'none',
  psa_elevated: 'mri',
  combined_risk_elevated: 'mri',
  high_risk_profile: 'mri',
  discordance: 'mri',
  pirads_5: 'biopsy',
  pirads_4: 'biopsy',
  combined_score_high: 'biopsy',
  high_risk_discordance: 'biopsy',
};

// Mirrors the key-selection logic in buildShareModelGuide (epsa-engine/src/epsaEngine.js).
export function resolveNarrationKey({ psaRecommendReason, recommendPSA, mriRecommendReason, biopsyReason } = {}) {
  return biopsyReason || mriRecommendReason || psaRecommendReason
    || (recommendPSA === false ? 'not_recommended' : null);
}

const SENTENCE_SPLIT_REGEX = /(?<=[.!?])\s+/;
// Voice service caps each synthesis call at 3 sentences (validators.py), and
// each call has a large fixed cost (~1000 sampling steps) regardless of text
// length. Repacking every sentence into full 3-sentence chunks — rather than
// keeping the original per-topic segment boundaries — minimizes the number
// of separate synthesis calls needed, which is the main lever on prep time.
function repackIntoChunks(strings, maxSentencesPerChunk = 3) {
  const sentences = strings.flatMap((s) => s.split(SENTENCE_SPLIT_REGEX).filter(Boolean));
  const chunks = [];
  for (let i = 0; i < sentences.length; i += maxSentencesPerChunk) {
    chunks.push(sentences.slice(i, i + maxSentencesPerChunk).join(' '));
  }
  return chunks;
}

// Returns the same personalized opener used to start the audio narration,
// as a single readable paragraph — for display in the on-screen SDM guide's
// "Seek" step, which otherwise only has epsa-engine's static per-key prompt
// (no actual patient facts). Returns null if there's nothing to personalize
// (no reason key, or the key has no opener), so callers should fall back to
// the static sdmGuide.seek.prompt in that case.
export function getPersonalizedSeekText(result, preResult) {
  const key = resolveNarrationKey(result || {});
  if (!key || !OPENERS[key]) return null;
  const facts = extractPatientFacts(result, preResult);
  return OPENERS[key](facts).join(' ');
}

// Returns an ordered array of segment strings to synthesize and play
// back-to-back, or null if there is nothing to narrate for this result.
// `preResult` is Model 1's (pre_psa) output — pass it when narrating a
// Model 2/3 result so age/ancestry/family history can be pulled in even
// though those fields aren't on the Model 2/3 result itself.
export function getNarrationSegments(result, preResult) {
  const key = resolveNarrationKey(result || {});
  if (!key || !OPENERS[key]) return null;

  const facts = extractPatientFacts(result, preResult);
  const stage = KEY_STAGE[key] || 'none';
  const explainer = stage === 'none' ? [] : (STAGE_EXPLAINERS[stage] || []);
  const closing = stage === 'biopsy' ? CLOSINGS.biopsy : (stage === 'none' ? CLOSINGS.none : CLOSINGS.screening);

  return repackIntoChunks([...OPENERS[key](facts), ...explainer, closing]);
}
