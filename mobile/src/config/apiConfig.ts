// ── Deployed Azure Container Apps endpoints ───────────────────────────────────
const SPEECH_HOST      = "https://phonological-api.blacksky-16c8b07c.southeastasia.azurecontainerapps.io";
const BEHAVIOR_HOST    = "https://behavioral-api.icyground-a0d60609.centralindia.azurecontainerapps.io";
const HANDWRITING_HOST = "https://handwriting-api.thankfulriver-bc30f9df.centralindia.azurecontainerapps.io";
const FUSION_HOST      = "https://fusion-api.blacksky-16c8b07c.southeastasia.azurecontainerapps.io";

export const API_URLS = {
  speech:      `${SPEECH_HOST}/predict/speech`,
  behavior:    `${BEHAVIOR_HOST}/predict/behavior`,
  handwriting: `${HANDWRITING_HOST}/predict/handwriting`,
  fusion:      `${FUSION_HOST}`,
};
