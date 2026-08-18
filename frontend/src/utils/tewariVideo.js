// WIP — talking-head video generation for Dr. Tewari, not yet configured or
// tested. Scaffolding only: this lets TewariNarrationPlayer attempt video
// once a lip-sync provider is wired up, without touching the working
// audio-only path (which stays the default and the fallback on any failure).
//
// Intended flow once configured: synthesize the narration audio (existing
// Tewari Voice service), then POST it — along with a reference photo/clip of
// Dr. Tewari — to a lip-sync provider (e.g. D-ID, HeyGen) and poll for the
// resulting video. No such provider is wired up yet; set
// VITE_TEWARI_VIDEO_API_URL to enable this path once one is.
const VIDEO_API_URL = import.meta.env?.VITE_TEWARI_VIDEO_API_URL || null;

export const isTewariVideoEnabled = () => Boolean(VIDEO_API_URL);

// Takes the already-stitched narration audio blob and returns a playable
// video URL, or throws if video generation isn't configured/available —
// callers should catch and fall back to audio-only playback.
export async function synthesizeTalkingHeadVideo(audioBlob) {
  if (!VIDEO_API_URL) {
    throw new Error('Tewari video generation is not configured yet (WIP) — set VITE_TEWARI_VIDEO_API_URL to a lip-sync provider endpoint.');
  }

  const formData = new FormData();
  formData.append('audio', audioBlob, 'narration.wav');

  const response = await fetch(VIDEO_API_URL, { method: 'POST', body: formData });
  if (!response.ok) throw new Error(`Tewari video service returned ${response.status}`);
  return URL.createObjectURL(await response.blob());
}
