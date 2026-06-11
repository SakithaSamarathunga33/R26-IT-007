import {
  doc, getDoc, setDoc, serverTimestamp,
  collection, query, where, getDocs, writeBatch,
} from "firebase/firestore";
import { db } from "../config/firebase";

/**
 * Generic per-module level unlock tracking, shared by the speech and
 * handwriting modules. Progress is stored per-child rather than per-session so
 * a finished level stays unlocked across screening runs — replaying Level 1
 * should never re-lock Level 2.
 */

export type LevelNumber = 1 | 2 | 3;

export interface LevelProgress {
  /** Levels the child has completed at least once, ascending. */
  completed: LevelNumber[];
}

export interface LevelModuleConfig {
  /** Firestore collection holding one progress doc per child. */
  progressCollection: string;
  /** Firestore collection holding that module's prediction docs. */
  predictionCollection: string;
  /** Valid level numbers for this module. */
  levelIds: LevelNumber[];
  /** Prefix for console warnings, e.g. "SpeechLevels". */
  logTag: string;
}

const EMPTY: LevelProgress = { completed: [] };

function sanitize(raw: any, levelIds: LevelNumber[]): LevelProgress {
  const completed = Array.isArray(raw?.completed)
    ? (raw.completed.filter((v: any) => levelIds.includes(v)) as LevelNumber[])
    : [];
  // De-duplicate and keep ascending so callers can rely on the order.
  return { completed: [...new Set(completed)].sort((a, b) => a - b) as LevelNumber[] };
}

export async function fetchProgress(cfg: LevelModuleConfig, uid: string): Promise<LevelProgress> {
  try {
    const snap = await getDoc(doc(db, cfg.progressCollection, uid));
    return snap.exists() ? sanitize(snap.data(), cfg.levelIds) : EMPTY;
  } catch (err: any) {
    console.warn(`[${cfg.logTag}] fetch failed (non-fatal):`, err?.message);
    return EMPTY;
  }
}

/**
 * Records `level` as complete. Throws if the write fails — the unlock doc is the
 * only record that the level was finished, so a silent failure would let the
 * child lose progress on the next login without ever being told.
 */
export async function markComplete(
  cfg: LevelModuleConfig,
  uid: string,
  level: LevelNumber
): Promise<LevelProgress> {
  const current = await fetchProgress(cfg, uid);
  if (current.completed.includes(level)) return current;

  const next = sanitize({ completed: [...current.completed, level] }, cfg.levelIds);
  await setDoc(
    doc(db, cfg.progressCollection, uid),
    { uid, completed: next.completed, updated_at: serverTimestamp() },
    { merge: true }
  );
  return next;
}

/** Level 1 is always open; every later level needs the one before it done. */
export function isUnlocked(level: LevelNumber, progress: LevelProgress): boolean {
  if (level === 1) return true;
  return progress.completed.includes((level - 1) as LevelNumber);
}

/**
 * Removes only the given level's prediction docs, so replaying one level
 * refreshes its rows without discarding the other levels' results. Docs written
 * before `level` was denormalised onto them carry no level field and are left
 * alone.
 */
export async function clearPredictionsForLevel(
  cfg: LevelModuleConfig,
  uid: string,
  level: LevelNumber
) {
  try {
    const snap = await getDocs(
      query(
        collection(db, cfg.predictionCollection),
        where("child_id", "==", uid),
        where("level", "==", level)
      )
    );
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (err: any) {
    console.warn(`[${cfg.logTag}] clearing level predictions failed (non-fatal):`, err?.message);
  }
}

export async function resetProgress(cfg: LevelModuleConfig, uid: string) {
  try {
    await setDoc(doc(db, cfg.progressCollection, uid), {
      uid, completed: [], updated_at: serverTimestamp(),
    });
  } catch (err: any) {
    console.warn(`[${cfg.logTag}] reset failed (non-fatal):`, err?.message);
  }
}
