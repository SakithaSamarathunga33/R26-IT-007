import { LevelId, SPEECH_LEVELS } from "../config/speechTasks";
import {
  LevelModuleConfig,
  LevelProgress,
  clearPredictionsForLevel,
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

export type SpeechLevelProgress = LevelProgress;

export function fetchLevelProgress(uid: string) {
  return fetchProgress(CONFIG, uid);
}

export function markLevelComplete(uid: string, level: LevelId) {
  return markComplete(CONFIG, uid, level);
}

export function isLevelUnlocked(level: LevelId, progress: SpeechLevelProgress) {
  return isUnlocked(level, progress);
}

export function clearLevelPredictions(uid: string, level: LevelId) {
  return clearPredictionsForLevel(CONFIG, uid, level);
}

export function resetLevelProgress(uid: string) {
  return resetProgress(CONFIG, uid);
}
