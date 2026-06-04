import {
  doc, getDoc, setDoc, updateDoc, addDoc, collection,
  serverTimestamp, query, where, getDocs, writeBatch,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { resetLevelProgress } from "./speechLevelService";
import { resetHandwritingLevelProgress } from "./handwritingLevelService";
import { resetBehaviorLevelProgress } from "./behaviorLevelService";

// Per-module prediction collections written during a screening. These are
// cleared when a fresh screening starts so summaries only reflect the current run.
const PREDICTION_COLLECTIONS = [
  "speech_predictions",
  "handwriting_predictions",
  "behavior_predictions",
];

export interface SessionProgress {
  speechDone: boolean;
  handwritingDone: boolean;
  behaviourDone: boolean;
  status: "in_progress" | "completed" | "fusion_completed";
  startedAt?: any;
}

export interface AssessmentRecord {
  id: string;
  completedAt: any;
  riskLevel: "low" | "medium" | "high";
  overallScore: number;
  primaryDifficulty: string;
  fullReport: any;
}

const SESSION_COLLECTION = "assessment_sessions";
const HISTORY_COLLECTION = "assessment_history";

export function getSessionId(uid: string) {
  return `session_${uid}`;
}

export type PredictionModule = "speech" | "handwriting" | "behavior";

const MODULE_COLLECTION: Record<PredictionModule, string> = {
  speech: "speech_predictions",
  handwriting: "handwriting_predictions",
  behavior: "behavior_predictions",
};

/** Deletes every doc in `col` for this child, batched under the 500-op limit. */
async function deletePredictionsIn(col: string, uid: string) {
  try {
    const snap = await getDocs(query(collection(db, col), where("child_id", "==", uid)));
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (err: any) {
    console.warn(`[Session] clearing ${col} failed (non-fatal):`, err?.message);
  }
}

/**
 * Deletes all prediction docs for this child across every module so a new
 * full screening starts from a clean slate.
 */
export async function clearPreviousPredictions(uid: string) {
  for (const col of PREDICTION_COLLECTIONS) {
    await deletePredictionsIn(col, uid);
  }
}

/**
 * Clears a single module's previous predictions — call when that module's run
 * restarts (from its intro screen) so re-runs replace old data instead of
 * being averaged together in the summary.
 */
export async function clearModulePredictions(uid: string, module: PredictionModule) {
  await deletePredictionsIn(MODULE_COLLECTION[module], uid);
}

export async function getOrCreateSession(uid: string): Promise<SessionProgress> {
  const sessionId = getSessionId(uid);
  const ref = doc(db, SESSION_COLLECTION, sessionId);
  const snap = await getDoc(ref);

  if (!snap.exists() || snap.data().status === "completed") {
    // Starting a brand-new run (or the previous one already completed) — clear
    // any leftover predictions so old data can't leak into the new summaries.
    if (snap.exists() && snap.data().status === "completed") {
      await clearPreviousPredictions(uid);
      await resetLevelProgress(uid);
      await resetHandwritingLevelProgress(uid);
      await resetBehaviorLevelProgress(uid);
    }
    const fresh: SessionProgress = {
      speechDone: false,
      handwritingDone: false,
      behaviourDone: false,
      status: "in_progress",
    };
    await setDoc(ref, { ...fresh, startedAt: serverTimestamp(), uid }, { merge: false });
    return fresh;
  }

  const d = snap.data();
  return {
    speechDone: d.speechDone ?? false,
    handwritingDone: d.handwritingDone ?? false,
    behaviourDone: d.behaviourDone ?? false,
    status: d.status ?? "in_progress",
  };
}

export async function markModuleDone(uid: string, module: "speechDone" | "handwritingDone" | "behaviourDone") {
  const sessionId = getSessionId(uid);
  const ref = doc(db, SESSION_COLLECTION, sessionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid, speechDone: false, handwritingDone: false, behaviourDone: false,
      status: "in_progress", startedAt: serverTimestamp(),
      [module]: true,
    });
  } else {
    await updateDoc(ref, { [module]: true });
  }
}

export async function saveAssessmentToHistory(uid: string, response: any): Promise<string> {
  const fp = response.final_prediction ?? {};
  const pd = response.primary_difficulty ?? {};

  const record = {
    uid,
    completedAt: serverTimestamp(),
    riskLevel: fp.final_dyslexia_risk_level ?? "low",
    overallScore: fp.overall_risk_score ?? 0,
    primaryDifficulty: pd.primary_difficulty_label ?? "",
    fullReport: response,
  };

  const ref = await addDoc(collection(db, HISTORY_COLLECTION), record);
  return ref.id;
}

export async function resetSession(uid: string) {
  // Wipe the previous run's predictions so the next screening's summaries
  // only reflect new data. Level unlocks go with them — keeping them would show
  // every level ticked while its results no longer exist.
  await clearPreviousPredictions(uid);
  await resetLevelProgress(uid);
  await resetHandwritingLevelProgress(uid);
  await resetBehaviorLevelProgress(uid);

  const sessionId = getSessionId(uid);
  const ref = doc(db, SESSION_COLLECTION, sessionId);
  await setDoc(ref, {
    uid,
    speechDone: false,
    handwritingDone: false,
    behaviourDone: false,
    status: "in_progress",
    startedAt: serverTimestamp(),
  }, { merge: false });
}

export async function getAssessmentHistory(uid: string): Promise<AssessmentRecord[]> {
  const snap = await getDocs(
    query(
      collection(db, HISTORY_COLLECTION),
      where("uid", "==", uid)
    )
  );
  const records = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AssessmentRecord));
  // Sort newest first in JS — avoids needing a composite Firestore index
  return records.sort((a, b) => {
    const aMs = a.completedAt?.toMillis?.() ?? 0;
    const bMs = b.completedAt?.toMillis?.() ?? 0;
    return bMs - aMs;
  });
}
