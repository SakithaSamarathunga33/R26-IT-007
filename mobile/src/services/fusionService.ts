// fusionService.ts - combines the speech, handwriting and behaviour results into one report.
// Reads each module's saved predictions from Firestore, calls the fusion backend (POST /predict/fusion),
// and saves the fusion + therapy results. Used by the summary / final report screens.
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
import { riskLevelFromScore } from "../config/riskThresholds";
import { isScored } from "./summaryService";
const FUSION_API = API_URLS.fusion;

// ── Aggregation helpers ───────────────────────────────────────────────────────

// Average of a list; 0 if empty.
function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

// A module is only as reliable as its weakest item — matches the backend's min().
function worstReliability(values: string[]): string {
  if (values.includes("low")) return "low";
  if (values.includes("medium")) return "medium";
  return "high";
}

// ── Module summary builders ───────────────────────────────────────────────────

// Averages this session's speech predictions into one module summary (risk, key features, reliability); null if none.
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
  const reliability = worstReliability(
    docs.map((d) => (d.quality_status === "inconclusive" ? "low" : d.quality?.prediction_reliability ?? "medium"))
  );
  const riskProb = avg(probs);

  return {
    risk_probability: riskProb,
    risk_level: riskLevelFromScore(riskProb),
    score: riskProb,
    features,
    quality: { prediction_reliability: reliability },
    model_version: docs.find((d) => d.model_version)?.model_version,
  };
}

// Same as above for handwriting (ignores supplementary practice attempts).
export async function buildHandwritingSummary(childId: string, sessionId: string) {
  const snap = await getDocs(
    query(
      collection(db, "handwriting_predictions"),
      where("child_id", "==", childId),
      where("session_id", "==", sessionId)
    )
  );
  const docs = snap.docs.map((d) => d.data()).filter(isScored);
  if (!docs.length) return null;

  const probs = docs.map((d) => Number(d.risk_probability ?? 0));
  const features = {
    reversal_risk: avg(docs.map((d) => Number(d.features_json?.reversal_risk ?? d.features_json?.reversal_count ?? 0))),
    spacing_variance: avg(docs.map((d) => Number(d.features_json?.spacing_variance ?? 0))),
    alignment_score: avg(docs.map((d) => Number(d.features_json?.alignment_score ?? 0))),
    writing_quality_score: avg(docs.map((d) => Number(d.features_json?.writing_quality_score ?? 0))),
  };
  const reliability = worstReliability(docs.map((d) => d.quality_json?.prediction_reliability ?? "medium"));
  const riskProb = avg(probs);

  return {
    risk_probability: riskProb,
    risk_level: riskLevelFromScore(riskProb),
    score: riskProb,
    features,
    quality: { prediction_reliability: reliability },
  };
}

// Same as above for behaviour tasks.
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
  const reliability = worstReliability(docs.map((d) => d.quality?.prediction_reliability ?? "medium"));
  const riskProb = avg(probs);

  return {
    risk_probability: riskProb,
    risk_level: riskLevelFromScore(riskProb),
    score: riskProb,
    features,
    quality: { prediction_reliability: reliability },
  };
}

// ── Fusion API call ───────────────────────────────────────────────────────────

// Sends the three module summaries to the fusion backend and returns its report.
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

// Saves the fusion result and therapy plan to Firestore and marks the session fusion_completed.
// Returns the new ids and `failed` = true if any save did not work.
export async function saveFusionResults(
  sessionId: string,
  response: any
) {
  const fp = response.database_save_payload?.fusion_predictions ?? {};
  const tr = response.database_save_payload?.therapy_recommendations ?? {};

  let fusionId: string | null = null;
  let therapyId: string | null = null;
  let failed = false;

  try {
    const fusionRef = await addDoc(collection(db, "fusion_predictions"), {
      ...fp,
      review_status: response.review_status ?? null,
      component_statuses: response.component_statuses ?? null,
      evidence_completeness: response.evidence_completeness ?? null,
      disagreement_indicator: response.disagreement_indicator ?? null,
      created_at: serverTimestamp(),
    });
    fusionId = fusionRef.id;
  } catch (err: any) {
    console.warn("[FusionDB] fusion_predictions save failed:", err.message);
    failed = true;
  }

  // insufficient_evidence responses carry no therapy plan — nothing to save.
  if (response.therapy_recommendation) {
    try {
      const therapyRef = await addDoc(collection(db, "therapy_recommendations"), {
        ...tr,
        created_at: serverTimestamp(),
      });
      therapyId = therapyRef.id;
    } catch (err: any) {
      console.warn("[FusionDB] therapy_recommendations save failed:", err.message);
      failed = true;
    }
  }

  try {
    await updateDoc(doc(db, "assessment_sessions", sessionId), {
      status: "fusion_completed",
      ...(fusionId ? { fusion_prediction_id: fusionId } : {}),
      ...(therapyId ? { therapy_recommendation_id: therapyId } : {}),
      // Firestore rejects undefined, and these are null for insufficient_evidence.
      final_dyslexia_risk_level: response.final_prediction?.final_dyslexia_risk_level ?? null,
      overall_risk_score: response.final_prediction?.overall_risk_score ?? null,
      primary_difficulty_label: response.primary_difficulty?.primary_difficulty_label ?? null,
      review_status: response.review_status ?? null,
      completed_at: serverTimestamp(),
    });
  } catch {
    // session doc may not exist yet — non-blocking
  }

  return { fusionId, therapyId, failed };
}

/** Human-readable name for the server's fusion_strategy (the trained model, or the rule it falls back to). */
export function fusionMethodLabel(strategy?: string | null): string {
  if (strategy === "reliability_aware_logistic_fusion") return "reliability-aware logistic fusion (trained model)";
  if (strategy === "reliability_weighted_rule_fusion") return "reliability-weighted rule-based fusion";
  return strategy ?? "weighted rule-based fusion";
}
