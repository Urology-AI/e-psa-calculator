// Generic male/female narration fallback using the browser's built-in Web
// Speech API (speechSynthesis) — no server round-trip, no GPU, works even if
// the Tewari Voice service is down. Sounds synthetic/robotic compared to the
// cloned Dr. Tewari voice, but is instant and has zero backend dependency.

export function isBrowserVoiceAvailable() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// SpeechSynthesisVoice has no explicit gender field, so this matches on
// common voice names shipped by major OSes/browsers. Falls back to the
// first available voice if nothing matches (still better than silence).
const FEMALE_NAME_HINTS = ['female', 'samantha', 'victoria', 'karen', 'susan', 'zira', 'moira', 'tessa', 'fiona', 'allison', 'ava', 'kate'];
const MALE_NAME_HINTS = ['male', 'alex', 'daniel', 'fred', 'david', 'mark', 'james', 'aaron', 'tom', 'oliver'];

function getVoices() {
  return new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }
    // Voices load async in some browsers (notably Chrome on first call).
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices());
    };
    // Fallback in case the event never fires.
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 500);
  });
}

async function pickVoice(gender) {
  const voices = (await getVoices()).filter((v) => v.lang?.startsWith('en'));
  if (voices.length === 0) return null;
  const hints = gender === 'female' ? FEMALE_NAME_HINTS : MALE_NAME_HINTS;
  const matched = voices.find((v) => hints.some((hint) => v.name.toLowerCase().includes(hint)));
  return matched || voices[0];
}

// Speaks `text` with a generic voice matching `gender` ('male' | 'female').
// Resolves when speech finishes, rejects on error. Cancels any speech
// already in progress first, since only one utterance can play at a time.
export async function speakWithBrowserVoice(text, gender) {
  if (!isBrowserVoiceAvailable()) {
    throw new Error('This browser does not support built-in text-to-speech.');
  }
  window.speechSynthesis.cancel();
  const voice = await pickVoice(gender);
  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = voice;
    utterance.rate = 0.95;
    utterance.onend = () => resolve();
    utterance.onerror = (event) => reject(new Error(`Speech synthesis error: ${event.error}`));
    window.speechSynthesis.speak(utterance);
  });
}

export function cancelBrowserVoice() {
  if (isBrowserVoiceAvailable()) window.speechSynthesis.cancel();
}
