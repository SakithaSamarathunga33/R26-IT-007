// ── Deployed Azure Container Apps endpoints ───────────────────────────────────
const SPEECH_HOST      = "https://phonological-api.orangefield-ad52cd60.centralindia.azurecontainerapps.io";
const BEHAVIOR_HOST    = "https://behavioral-api.icyground-a0d60609.centralindia.azurecontainerapps.io";
const HANDWRITING_HOST = "https://handwriting-api.thankfulriver-bc30f9df.centralindia.azurecontainerapps.io";
const FUSION_HOST      = "https://fusion-api.braveocean-c6acc81b.eastasia.azurecontainerapps.io";

export const API_URLS = {
  speech:      `${SPEECH_HOST}/predict/speech`,
  behavior:    `${BEHAVIOR_HOST}/predict/behavior`,
  handwriting: `${HANDWRITING_HOST}/predict/handwriting`,
  fusion:      `${FUSION_HOST}`,
};
