// behaviorLevelService.ts - behaviour-module wrapper around levelProgressService (which levels are unlocked/completed).
// Stored in Firestore "behavior_level_progress"; used by the behaviour level/result screens and sessionService.
import { BehaviorLevelId, BEHAVIOR_LEVELS } from "../config/behaviorTasks";
import {
  LevelModuleConfig,
  LevelProgress,
  clearPredictionsForLevel,
  countUnmasteredPass,
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

// Wrappers below just pass this module's CONFIG into the shared functions.
export type BehaviorLevelProgress = LevelProgress;

// Loads which behaviour levels this child has completed.
export function fetchBehaviorLevelProgress(uid: string) {
  return fetchProgress(CONFIG, uid);
}

// Counts a pass without mastery (after the cap, the level unlocks anyway).
export function countBehaviorUnmasteredPass(level: BehaviorLevelId) {
  return countUnmasteredPass(CONFIG, level);
}

// Saves that the level is finished so the next one unlocks.
export function markBehaviorLevelComplete(uid: string, level: BehaviorLevelId) {
  return markComplete(CONFIG, uid, level);
}

// True if the level is open (level 1 always; others need the previous level done).
export function isBehaviorLevelUnlocked(level: BehaviorLevelId, progress: BehaviorLevelProgress) {
  return isUnlocked(level, progress);
}

// Deletes this level's saved predictions before it is replayed.
export function clearBehaviorLevelPredictions(uid: string, level: BehaviorLevelId) {
  return clearPredictionsForLevel(CONFIG, uid, level);
}

// Clears all level progress (used when a new screening starts).
export function resetBehaviorLevelProgress(uid: string) {
  return resetProgress(CONFIG, uid);
}
