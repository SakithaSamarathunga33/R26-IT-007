// handwritingLevelService.ts - handwriting-module level progress (wraps levelProgressService), mastery scoring
// per level, and the "supplementary task" state used when a child gets an extra practice letter.
// Used by the handwriting screens and sessionService.
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../config/firebase";
import {
  HandwritingLevelId, HANDWRITING_LEVELS,
  HANDWRITING_MASTERY_MIN_CORRECT, HANDWRITING_SCORED_TASK_IDS,
} from "../config/handwritingTasks";
import {
  LevelModuleConfig,
  LevelProgress,
  MAX_UNMASTERED_PASSES,
  clearPredictionsForLevel,
  countUnmasteredPass as countPass,
  fetchProgress,
  isUnlocked,
  markComplete,
  resetProgress,
} from "./levelProgressService";

/** Handwriting-module binding for the shared level-progress logic. */
const CONFIG: LevelModuleConfig = {
  progressCollection: "handwriting_level_progress",
  predictionCollection: "handwriting_predictions",
  levelIds: HANDWRITING_LEVELS.map((l) => l.id),
  logTag: "HandwritingLevels",
};

export type HandwritingLevelProgress = LevelProgress;

// Loads which handwriting levels the child has completed.
export function fetchHandwritingLevelProgress(uid: string) {
  return fetchProgress(CONFIG, uid);
}

// After MAX_UNMASTERED_PASSES the level unlocks anyway; mastery is still recorded
// false, so the 4-of-5 result isn't faked.
export { MAX_UNMASTERED_PASSES };
export function countUnmasteredPass(level: HandwritingLevelId): number {
  return countPass(CONFIG, level);
}

/** Call once the level is mastered (or the pass cap is reached) — the stored "completed" list is what unlocks the next level. */
export function markHandwritingLevelComplete(uid: string, level: HandwritingLevelId) {
  return markComplete(CONFIG, uid, level);
}

// True if the level is open (level 1 always; others need the previous one done).
export function isHandwritingLevelUnlocked(
  level: HandwritingLevelId,
  progress: HandwritingLevelProgress
) {
  return isUnlocked(level, progress);
}

// Deletes this level's saved predictions before replaying it.
export function clearHandwritingLevelPredictions(uid: string, level: HandwritingLevelId) {
  return clearPredictionsForLevel(CONFIG, uid, level);
}

// Clears all handwriting level progress (new screening).
export function resetHandwritingLevelProgress(uid: string) {
  return resetProgress(CONFIG, uid);
}

/**
 * Thesis correctness rule, shared by AETA and the mastery gate: the backend's
 * target match, falling back to "not high risk" when it could not decide.
 */
export function isHandwritingCorrect(result: any): boolean {
  if (!result) return false;
  const matched = result.target_match?.matched;
  return typeof matched === "boolean" ? matched : result.prediction?.risk_level !== "high";
}

// Level result: correct count out of total, percent score, and whether mastery (4 of 5) was reached.
export interface HandwritingLevelResult {
  correct: number;
  total: number;
  /** Percent of the five scored originals that were correct, 0-100. */
  score: number;
  mastered: boolean;
}

/** Score + mastery (4 of 5) from this level's ORIGINAL attempts; supplementary ones never count. */
export async function fetchHandwritingLevelResult(
  uid: string,
  level: HandwritingLevelId
): Promise<HandwritingLevelResult> {
  const snap = await getDocs(
    query(
      collection(db, CONFIG.predictionCollection),
      where("child_id", "==", uid),
      where("level", "==", level)
    )
  );
  const scored = HANDWRITING_SCORED_TASK_IDS[level];
  const correctIds = new Set(
    snap.docs
      .map((d) => d.data())
      .filter((d) => d.attempt_type === "original" && d.is_correct === true && scored.includes(d.task_id))
      .map((d) => d.task_id)
  );
  const correct = correctIds.size;
  return {
    correct,
    total: scored.length,
    score: Math.round((correct / scored.length) * 100),
    mastered: correct >= HANDWRITING_MASTERY_MIN_CORRECT,
  };
}

// ── AETA: the one supplementary task in flight ──────────────────────────────
// ponytail: module state because the route param types live in AppNavigator; an
// app reload mid-supplement drops it and the child just continues the level.

export interface HandwritingSupplement {
  /** Global index of the supplementary task. */
  taskIndex: number;
  /** The original task that triggered it; the level resumes after this one. */
  parentTaskIndex: number;
  parentAttemptId: string | null;
}

let activeSupplement: HandwritingSupplement | null = null;

export function setHandwritingSupplement(s: HandwritingSupplement | null) {
  activeSupplement = s;
}

/** The pending supplement, or null. Pass `taskIndex` to get it only when that task IS the supplement. */
export function getHandwritingSupplement(taskIndex?: number): HandwritingSupplement | null {
  if (!activeSupplement) return null;
  return taskIndex === undefined || activeSupplement.taskIndex === taskIndex ? activeSupplement : null;
}
