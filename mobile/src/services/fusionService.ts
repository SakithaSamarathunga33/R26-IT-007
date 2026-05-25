import { db } from "../config/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { API_URLS } from "../config/apiConfig";
const FUSION_API = API_URLS.fusion;

// ── Aggregation helpers ───────────────────────────────────────────────────────

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function maxReliability(values: string[]): string {
  if (values.includes("high")) return "high";
  if (values.includes("medium")) return "medium";
  return "low";
}

// ── Module summary builders ───────────────────────────────────────────────────

export async function buildSpeechSummary(childId: string, sessionId: string) {
  const snap = await getDocs(
    query(
      collection(db, "speech_predictions"),
      where("child_id", "==", childId),
      where("session_id", "==", sessionId)
    )
  );
  const docs = snap.docs.map((d) => d.data());
  if (!docs.length) return null;

  const probs = docs.map((d) => Number(d.risk_probability ?? 0));
  const features = {
    phoneme_error_rate: avg(docs.map((d) => Number(d.features?.phoneme_error_rate ?? 0))),
    hesitation_score: avg(docs.map((d) => Number(d.features?.hesitation_score ?? d.features?.speech_hesitation_score ?? 0))),
    pronunciation_score: avg(docs.map((d) => Number(d.features?.pronunciation_score ?? 0))),
    rhyme_accuracy: avg(docs.map((d) => Number(d.features?.rhyme_accuracy ?? 0))),
  };
  const reliability = maxReliability(docs.map((d) => d.quality?.prediction_reliability ?? "medium"));
  const riskProb = avg(probs);

  return {
    risk_probability: riskProb,
    risk_level: riskProb >= 0.6 ? "high" : riskProb >= 0.35 ? "medium" : "low",
    score: riskProb,
    features,
    quality: { prediction_reliability: reliability },
  };
}

export async function buildHandwritingSummary(childId: string, sessionId: string) {
  const snap = await getDocs(
    query(
      collection(db, "handwriting_predictions"),
      where("child_id", "==", childId),
      where("session_id", "==", sessionId)
    )
  );
  const docs = snap.docs.map((d) => d.data());
  if (!docs.length) return null;

  const probs = docs.map((d) => Number(d.risk_probability ?? 0));
  const features = {
    reversal_risk: avg(docs.map((d) => Number(d.features_json?.reversal_risk ?? d.features_json?.reversal_count ?? 0))),
    spacing_variance: avg(docs.map((d) => Number(d.features_json?.spacing_variance ?? 0))),
    alignment_score: avg(docs.map((d) => Number(d.features_json?.alignment_score ?? 0))),
    writing_quality_score: avg(docs.map((d) => Number(d.features_json?.writing_quality_score ?? 0))),
  };
  const reliability = maxReliability(docs.map((d) => d.quality_json?.prediction_reliability ?? "medium"));
  const riskProb = avg(probs);

  return {
    risk_probability: riskProb,
    risk_level: riskProb >= 0.6 ? "high" : riskProb >= 0.35 ? "medium" : "low",
    score: riskProb,
    features,
    quality: { prediction_reliability: reliability },
  };
}

export async function buildBehaviorSummary(childId: string, sessionId: string) {
  const snap = await getDocs(
    query(
      collection(db, "behavior_predictions"),
      where("child_id", "==", childId),
      where("session_id", "==", sessionId)
    )
  );
  const docs = snap.docs.map((d) => d.data());
  if (!docs.length) return null;

  const probs = docs.map((d) => Number(d.risk_probability ?? 0));
  const features = {
    attention_score: avg(docs.map((d) => Number(d.attention_score ?? d.mapped_features?.attention_score ?? 0))),
    engagement_score: avg(docs.map((d) => Number(d.engagement_score ?? d.mapped_features?.engagement_score ?? 0))),
    response_latency: avg(docs.map((d) => Number(d.response_latency ?? d.mapped_features?.response_latency ?? 0))),
    retry_count: Math.round(avg(docs.map((d) => Number(d.retry_count ?? d.mapped_features?.retry_count ?? 0)))),
  };
  const reliability = maxReliability(docs.map((d) => d.quality?.prediction_reliability ?? "medium"));
  const riskProb = avg(probs);

  return {
    risk_probability: riskProb,
    risk_level: riskProb >= 0.6 ? "high" : riskProb >= 0.35 ? "medium" : "low",
    score: riskProb,
    features,
    quality: { prediction_reliability: reliability },
  };
}

// ── Fusion API call ───────────────────────────────────────────────────────────

export async function callFusionAPI(payload: object) {
  const res = await fetch(`${FUSION_API}/predict/fusion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Fusion API error: ${res.status}`);
  return res.json();
}

// ── Firestore save ────────────────────────────────────────────────────────────

export async function saveFusionResults(
  sessionId: string,
  response: any
) {
  const fp = response.database_save_payload?.fusion_predictions ?? {};
  const tr = response.database_save_payload?.therapy_recommendations ?? {};

  let fusionId: string | null = null;
  let therapyId: string | null = null;

  try {
    const fusionRef = await addDoc(collection(db, "fusion_predictions"), {
      ...fp,
      created_at: serverTimestamp(),
    });
    fusionId = fusionRef.id;
  } catch (err: any) {
    console.warn("[FusionDB] fusion_predictions save failed (non-fatal):", err.message);
  }

  try {
    const therapyRef = await addDoc(collection(db, "therapy_recommendations"), {
      ...tr,
      created_at: serverTimestamp(),
    });
    therapyId = therapyRef.id;
  } catch (err: any) {
    console.warn("[FusionDB] therapy_recommendations save failed (non-fatal):", err.message);
  }

  try {
    await updateDoc(doc(db, "assessment_sessions", sessionId), {
      status: "fusion_completed",
      ...(fusionId ? { fusion_prediction_id: fusionId } : {}),
      ...(therapyId ? { therapy_recommendation_id: therapyId } : {}),
      final_dyslexia_risk_level: response.final_prediction?.final_dyslexia_risk_level,
      overall_risk_score: response.final_prediction?.overall_risk_score,
      primary_difficulty_label: response.primary_difficulty?.primary_difficulty_label,
      completed_at: serverTimestamp(),
    });
  } catch {
    // session doc may not exist yet — non-blocking
  }

  return { fusionId, therapyId };
}

// ── Readiness check ───────────────────────────────────────────────────────────

export function validateFusionReadiness(
  speech: any,
  handwriting: any,
  behavior: any
): string[] {
  const errors: string[] = [];
  if (!speech) errors.push("Speech module results are missing.");
  if (!handwriting) errors.push("Handwriting module results are missing.");
  if (!behavior) errors.push("Behaviour module results are missing.");
  return errors;
}
