// summaryService.ts - reads a module's saved predictions from Firestore and works out the average risk,
// overall risk level and per-level score. Used by the module summary and level-complete screens.
import { db } from "../config/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { riskLevelFromScore } from "../config/riskThresholds";

// Same levels as config/riskThresholds plus "requires_review" (no data to judge).
export type RiskLevel = "low" | "medium" | "high" | "requires_review";

// One saved prediction (one task).
export type SummaryRow = {
  risk_level: RiskLevel;
  risk_probability: number;
  features: Record<string, any>;
  saved_at: number; // millis for stable ordering
};

// All rows for a module plus their average risk and overall level.
export type ModuleSummary = {
  rows: SummaryRow[];
  count: number;
  avgProb: number;
  overallLevel: RiskLevel;
};

// Uses the stored risk level if valid, otherwise works it out from the probability.
function toLevel(v: any, prob: number): RiskLevel {
  if (v === "low" || v === "medium" || v === "high" || v === "requires_review") return v;
  return riskLevelFromScore(prob);
}

/** Supplementary handwriting attempts are extra practice data, never scored; docs without attempt_type are legacy originals. */
export function isScored(d: Record<string, any>): boolean {
  return d.attempt_type !== "supplementary";
}

// Converts a Firestore timestamp to milliseconds.
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
    .filter(isScored)
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
    count === 0 ? "requires_review" : riskLevelFromScore(avgProb);

  return { rows, count, avgProb, overallLevel };
}

// Score for one level.
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

  const scored = snap.docs.map((d) => d.data()).filter(isScored);
  const taskCount = scored.length;
  const lowRiskCount = scored.reduce((n, data) => {
    const prob = Number(data.risk_probability ?? 0);
    return toLevel(data.risk_level, prob) === "low" ? n + 1 : n;
  }, 0);

  return {
    score: taskCount ? Math.round((lowRiskCount / taskCount) * 100) : 0,
    lowRiskCount,
    taskCount,
  };
}
