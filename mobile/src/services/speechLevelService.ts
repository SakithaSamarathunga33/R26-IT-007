// speechLevelService.ts - speech-module level progress (wraps levelProgressService).
// Stored in Firestore "speech_level_progress"; used by the speech level/result screens and sessionService.
import { LevelId, SPEECH_LEVELS } from "../config/speechTasks";
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

/** Speech-module binding for the shared level-progress logic. */
const CONFIG: LevelModuleConfig = {
  progressCollection: "speech_level_progress",
  predictionCollection: "speech_predictions",
  levelIds: SPEECH_LEVELS.map((l) => l.id),
  logTag: "SpeechLevels",
};

// Wrappers below just pass this module's CONFIG into the shared functions.
export type SpeechLevelProgress = LevelProgress;

// Loads which speech levels the child has completed.
export function fetchLevelProgress(uid: string) {
  return fetchProgress(CONFIG, uid);
}

// Counts a pass without mastery (after the cap, the level unlocks anyway).
export function countSpeechUnmasteredPass(level: LevelId) {
  return countUnmasteredPass(CONFIG, level);
}

// Saves that the level is finished so the next one unlocks.
export function markLevelComplete(uid: string, level: LevelId) {
  return markComplete(CONFIG, uid, level);
}

// True if the level is open (level 1 always; others need the previous one done).
export function isLevelUnlocked(level: LevelId, progress: SpeechLevelProgress) {
  return isUnlocked(level, progress);
}

// Deletes this level's saved predictions before replaying it.
export function clearLevelPredictions(uid: string, level: LevelId) {
  return clearPredictionsForLevel(CONFIG, uid, level);
}

// Clears all speech level progress (new screening).
export function resetLevelProgress(uid: string) {
  return resetProgress(CONFIG, uid);
}
