import { BehaviorLevelId, BEHAVIOR_LEVELS } from "../config/behaviorTasks";
import {
  LevelModuleConfig,
  LevelProgress,
  clearPredictionsForLevel,
  fetchProgress,
  isUnlocked,
  markComplete,
  resetProgress,
} from "./levelProgressService";

/** Behaviour-module binding for the shared level-progress logic. */
const CONFIG: LevelModuleConfig = {
  progressCollection: "behavior_level_progress",
  predictionCollection: "behavior_predictions",
  levelIds: BEHAVIOR_LEVELS.map((l) => l.id),
  logTag: "BehaviorLevels",
};

export type BehaviorLevelProgress = LevelProgress;

export function fetchBehaviorLevelProgress(uid: string) {
  return fetchProgress(CONFIG, uid);
}

export function markBehaviorLevelComplete(uid: string, level: BehaviorLevelId) {
  return markComplete(CONFIG, uid, level);
}

export function isBehaviorLevelUnlocked(level: BehaviorLevelId, progress: BehaviorLevelProgress) {
  return isUnlocked(level, progress);
}

export function clearBehaviorLevelPredictions(uid: string, level: BehaviorLevelId) {
  return clearPredictionsForLevel(CONFIG, uid, level);
}

export function resetBehaviorLevelProgress(uid: string) {
  return resetProgress(CONFIG, uid);
}
