import { HandwritingLevelId, HANDWRITING_LEVELS } from "../config/handwritingTasks";
import {
  LevelModuleConfig,
  LevelProgress,
  clearPredictionsForLevel,
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

export function fetchHandwritingLevelProgress(uid: string) {
  return fetchProgress(CONFIG, uid);
}

export function markHandwritingLevelComplete(uid: string, level: HandwritingLevelId) {
  return markComplete(CONFIG, uid, level);
}

export function isHandwritingLevelUnlocked(
  level: HandwritingLevelId,
  progress: HandwritingLevelProgress
) {
  return isUnlocked(level, progress);
}

export function clearHandwritingLevelPredictions(uid: string, level: HandwritingLevelId) {
  return clearPredictionsForLevel(CONFIG, uid, level);
}

export function resetHandwritingLevelProgress(uid: string) {
  return resetProgress(CONFIG, uid);
}
