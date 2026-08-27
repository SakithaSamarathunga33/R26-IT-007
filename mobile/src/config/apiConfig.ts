// ── Deployed VPS endpoints (Traefik, sakitha.com) ─────────────────────────────
const SPEECH_HOST      = "https://lexiscan-speech.sakitha.com";
const BEHAVIOR_HOST    = "https://lexiscan-behavior.sakitha.com";
const HANDWRITING_HOST = "https://lexiscan-handwriting.sakitha.com";
const FUSION_HOST      = "https://lexiscan-fusion.sakitha.com";

export const API_URLS = {
  speech:      `${SPEECH_HOST}/predict/speech`,
  behavior:    `${BEHAVIOR_HOST}/predict/behavior`,
  handwriting: `${HANDWRITING_HOST}/predict/handwriting`,
  fusion:      `${FUSION_HOST}`,
};
