import { useEffect, useState } from "react";
import { auth, db } from "../config/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export type RiskLevel = "low" | "medium" | "high" | "requires_review";

export type SummaryRow = {
  risk_level: RiskLevel;
  risk_probability: number;
  features: Record<string, any>;
  saved_at: number; // millis for stable ordering
};

export type ModuleSummary = {
  rows: SummaryRow[];
  count: number;
  avgProb: number;
  overallLevel: RiskLevel;
};

function toLevel(v: any, prob: number): RiskLevel {
  if (v === "low" || v === "medium" || v === "high" || v === "requires_review") return v;
  return prob >= 0.6 ? "high" : prob >= 0.35 ? "medium" : "low";
}

function millis(saved: any): number {
  // Firestore Timestamp -> millis; fall back to 0 so undated docs sort first
  if (saved && typeof saved.toMillis === "function") return saved.toMillis();
  if (saved && typeof saved.seconds === "number") return saved.seconds * 1000;
  return 0;
}

/**
 * Loads all prediction docs for the current session and computes the same
 * average/overall-level the summary screens display. `featuresKey` differs per
 * module (speech uses `features`, handwriting uses `features_json`).
 */
export async function fetchModuleSummary(
  collectionName: string,
  childId: string,
  sessionId: string,
  featuresKey: string = "features"
): Promise<ModuleSummary> {
  const snap = await getDocs(
    query(
      collection(db, collectionName),
      where("child_id", "==", childId),
      where("session_id", "==", sessionId)
    )
  );

  const rows: SummaryRow[] = snap.docs
    .map((d) => d.data())
    .map((d) => {
      const prob = Number(d.risk_probability ?? 0);
      // Nested feature bag (speech: `features`, handwriting: `features_json`),
      // merged with the top-level doc so modules that store feature fields
      // directly on the prediction (behaviour) are still reachable.
      const nested = (d[featuresKey] as Record<string, any>) ?? {};
      return {
        risk_probability: prob,
        risk_level: toLevel(d.risk_level, prob),
        features: { ...d, ...nested },
        saved_at: millis(d.saved_at),
      };
    })
    .sort((a, b) => a.saved_at - b.saved_at);

  const count = rows.length;
  const avgProb = count ? rows.reduce((s, r) => s + r.risk_probability, 0) / count : 0;
  const overallLevel: RiskLevel =
    count === 0 ? "requires_review" : avgProb >= 0.6 ? "high" : avgProb >= 0.35 ? "medium" : "low";

  return { rows, count, avgProb, overallLevel };
}

export type LevelScore = {
  /** Percent of this level's tasks that scored low-risk, 0-100. */
  score: number;
  lowRiskCount: number;
  taskCount: number;
};

/**
 * Score for one completed level: the percent of its tasks that came back
 * low-risk. Mirrors fetchModuleSummary's risk-level logic so a task counts as
 * low-risk the same way here as it does on the full summary screen.
 */
export async function fetchLevelScore(
  collectionName: string,
  childId: string,
  level: number
): Promise<LevelScore> {
  const snap = await getDocs(
    query(
      collection(db, collectionName),
      where("child_id", "==", childId),
      where("level", "==", level)
    )
  );

  const taskCount = snap.docs.length;
  const lowRiskCount = snap.docs.reduce((n, d) => {
    const data = d.data();
    const prob = Number(data.risk_probability ?? 0);
    return toLevel(data.risk_level, prob) === "low" ? n + 1 : n;
  }, 0);

  return {
    score: taskCount ? Math.round((lowRiskCount / taskCount) * 100) : 0,
    lowRiskCount,
    taskCount,
  };
}

/** Loads a level's score on mount, for the level-complete screens. */
export function useLevelScore(collectionName: string, level: number, logTag: string): LevelScore | null {
  const [levelScore, setLevelScore] = useState<LevelScore | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    fetchLevelScore(collectionName, uid, level)
      .then(setLevelScore)
      .catch((err) => console.warn(`[${logTag}] could not load level score:`, err?.message));
  }, [collectionName, level, logTag]);

  return levelScore;
}
