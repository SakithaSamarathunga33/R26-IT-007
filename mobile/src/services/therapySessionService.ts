import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";

/**
 * Tracks how much of the current therapy plan a child has practised.
 *
 * Progress belongs to the report that produced the plan, so the stored
 * `report_id` is compared against the latest report on load: a mismatch means a
 * new analysis has been run and the counter starts fresh. That makes the reset
 * self-healing — there is no reset function to forget to call, and a plain
 * logout never loses real practice.
 */
const COLLECTION = "therapy_sessions";

export type TherapyPlanState = "in_progress" | "completed" | "abandoned";

export interface TherapyProgress {
  /** Report this plan came from; progress is void once a newer report exists. */
  reportId: string | null;
  /** One entry per completed session, e.g. ["SPEECH_001", "SPEECH_001", ...]. */
  completed: string[];
  /** Total sessions the plan asks for (activities × sessions per week). */
  target: number;
  state: TherapyPlanState;
}

function emptyProgress(reportId: string | null, target: number): TherapyProgress {
  return { reportId, completed: [], target, state: "in_progress" };
}

function sanitize(raw: any, reportId: string | null, target: number): TherapyProgress {
  const completed = Array.isArray(raw?.completed)
    ? raw.completed.filter((v: any) => typeof v === "string")
    : [];
  const state: TherapyPlanState =
    raw?.state === "completed" || raw?.state === "abandoned" ? raw.state : "in_progress";
  return {
    reportId: raw?.report_id ?? null,
    completed,
    target: Number(raw?.target) > 0 ? Number(raw.target) : target,
    state,
  };
}

/**
 * Loads progress for `reportId`. If the stored progress belongs to an older
 * report it is discarded — a new analysis always starts a new plan.
 */
export async function fetchTherapyProgress(
  uid: string,
  reportId: string | null,
  target: number
): Promise<TherapyProgress> {
  try {
    const snap = await getDoc(doc(db, COLLECTION, uid));
    if (!snap.exists()) return emptyProgress(reportId, target);
    const saved = sanitize(snap.data(), reportId, target);
    // A newer report exists, so the old plan is finished with — discard it and
    // start the new plan from zero.
    if (saved.reportId !== reportId) return emptyProgress(reportId, target);
    return saved;
  } catch (err: any) {
    console.warn("[Therapy] fetch failed (non-fatal):", err?.message);
    return emptyProgress(reportId, target);
  }
}

async function write(uid: string, p: TherapyProgress) {
  await setDoc(
    doc(db, COLLECTION, uid),
    {
      uid,
      report_id: p.reportId,
      completed: p.completed,
      target: p.target,
      state: p.state,
      updated_at: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Records one finished practice session. Throws if the write fails — the count
 * gates re-screening, so a silent failure would leave the child unable to
 * progress with no explanation.
 */
export async function recordTherapySession(
  uid: string,
  current: TherapyProgress,
  activityId: string
): Promise<TherapyProgress> {
  const completed = [...current.completed, activityId];
  const next: TherapyProgress = {
    ...current,
    completed,
    state: completed.length >= current.target ? "completed" : "in_progress",
  };
  await write(uid, next);
  return next;
}

/**
 * Abandons the current plan so the modules reopen. Kept distinct from
 * "completed" so adherence can be reported honestly.
 */
export async function abandonTherapyPlan(
  uid: string,
  current: TherapyProgress
): Promise<TherapyProgress> {
  // Ending a plan is a clean slate: clear the sessions and the report link so
  // nothing from the old plan can re-lock the modules or leak into the next one.
  const next: TherapyProgress = {
    reportId: current.reportId,
    completed: [],
    target: current.target,
    state: "abandoned",
  };
  await write(uid, next);
  return next;
}

/** Modules stay locked only while a plan is genuinely still in progress. */
export function isTherapyBlocking(p: TherapyProgress): boolean {
  return p.state === "in_progress" && p.completed.length < p.target;
}

export function sessionsFor(activityCount: number, sessionsPerWeek: number): number {
  const total = activityCount * Math.max(1, sessionsPerWeek);
  return total > 0 ? total : 1;
}

export interface ActiveTherapyPlan {
  /** Full fusion response from the most recent assessment. */
  response: any;
  /** History doc id of that assessment — identifies which plan this is. */
  reportId: string;
  progress: TherapyProgress;
  target: number;
  doneCount: number;
  /** True while the plan still needs work — this is what locks the modules. */
  blocking: boolean;
  primaryFocus: string;
  sessionsPerWeek: number;
}

/**
 * Loads the child's most recent report and the practice progress against it.
 * Returns null when no assessment has been run yet, so callers can hide the
 * therapy UI entirely rather than showing an empty plan.
 */
export async function fetchActiveTherapyPlan(uid: string): Promise<ActiveTherapyPlan | null> {
  // Imported lazily to avoid a module cycle: sessionService already imports the
  // level services, and this file is imported by screens that it also imports.
  const { getAssessmentHistory } = await import("./sessionService");
  try {
    const history = await getAssessmentHistory(uid);
    const latest = history[0];
    const response = latest?.fullReport;
    const therapy = response?.therapy_recommendation;
    if (!latest || !therapy) return null;

    const activities: any[] = therapy.recommended_activities ?? [];
    const sessionsPerWeek = Number(therapy.recommended_sessions_per_week) || 1;
    const target = sessionsFor(activities.length, sessionsPerWeek);
    // The history doc id is the only per-report unique value available: the
    // fusion response carries no report id, and its session_id is a constant
    // `session_<uid>` — using that would make every report look like the same
    // one, so a finished plan's progress would carry into the next plan.
    const reportId = latest.id;

    const progress = await fetchTherapyProgress(uid, reportId, target);
    return {
      response,
      reportId,
      progress,
      target,
      doneCount: progress.completed.length,
      blocking: isTherapyBlocking(progress),
      primaryFocus: therapy.primary_focus ?? "Practice plan",
      sessionsPerWeek,
    };
  } catch (err: any) {
    console.warn("[Therapy] could not load active plan (non-fatal):", err?.message);
    return null;
  }
}
