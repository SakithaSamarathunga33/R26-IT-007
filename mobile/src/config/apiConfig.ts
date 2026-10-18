// ── Deployed endpoints (speech + fusion self-hosted on sakitha.com VPS; others on Azure Container Apps) ──
const SPEECH_HOST      = "https://phonological-api.sakitha.com";//https://phonological-api.blacksky-16c8b07c.southeastasia.azurecontainerapps.io
const BEHAVIOR_HOST    = "https://behavioral-api.icyground-a0d60609.centralindia.azurecontainerapps.io";
const HANDWRITING_HOST = "https://handwriting-api.sakitha.com";
const FUSION_HOST      = "https://fusion-api.sakitha.com";//"https://fusion-api.blacksky-16c8b07c.southeastasia.azurecontainerapps.io";

export const API_URLS = {
  speech:      `${SPEECH_HOST}/predict/speech`,
  behavior:    `${BEHAVIOR_HOST}/predict/behavior`,
  handwriting: `${HANDWRITING_HOST}/predict/handwriting`,
  fusion:      `${FUSION_HOST}`,
};
