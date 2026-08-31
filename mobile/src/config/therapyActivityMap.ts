import { SPEECH_TASKS } from "./speechTasks";
import { HANDWRITING_TASKS } from "./handwritingTasks";
import { BEHAVIOR_TASKS } from "./behaviorTasks";

/**
 * Maps the backend's therapy activity IDs onto real in-app tasks.
 *
 * The fusion API returns activities from a fixed library (see
 * backend/multi_modal_risk/.../therapy_service.py) — nine activities across
 * three difficulty areas. Each one names a skill the child should practise, but
 * carries no link to the app's own screens. This table provides that link so
 * "Start Activity" can launch the matching module task in practice mode.
 */

export type TherapyModule = "speech" | "handwriting" | "behavior";

export interface TherapyActivityTarget {
  module: TherapyModule;
  /** Task ids to practise, in order. Drawn from the module's own task list. */
  taskIds: string[];
}

const ACTIVITY_MAP: Record<string, TherapyActivityTarget> = {
  // ── Phonological processing → Speech module ────────────────────────────────
  SPEECH_001: { module: "speech", taskIds: ["ism_map", "ism_goat"] },          // phoneme_awareness
  SPEECH_002: { module: "speech", taskIds: ["ri_bat"] },                        // rhyme_training
  SPEECH_003: { module: "speech", taskIds: ["ss_banana", "ss_elephant"] },      // sound_blending

  // ── Handwriting → Writing module ───────────────────────────────────────────
  WRITE_001: { module: "handwriting", taskIds: ["lc_b", "lc_d", "lc_p", "lc_q"] }, // letter_reversal
  WRITE_002: { module: "handwriting", taskIds: ["lt_b", "lt_A", "lt_E"] },         // letter_formation
  WRITE_003: { module: "handwriting", taskIds: ["wc_cat", "wc_dog", "wc_bsk"] },   // spacing_control

  // ── Attention & behaviour → Behaviour module ───────────────────────────────
  BEHAVIOR_001: { module: "behavior", taskIds: ["as_count", "as_odd"] },                    // focus_training
  BEHAVIOR_002: { module: "behavior", taskIds: ["ml_cat_c", "ml_table_b", "pc_shapes"] },   // guided_attention
  BEHAVIOR_003: { module: "behavior", taskIds: ["wm_seq_3", "wm_letter_seq"] },              // working_memory
};

/** Global index of a task id within its module's task array, or -1. */
function indexOfTask(module: TherapyModule, taskId: string): number {
  const list =
    module === "speech" ? SPEECH_TASKS
    : module === "handwriting" ? HANDWRITING_TASKS
    : BEHAVIOR_TASKS;
  return list.findIndex((t) => t.id === taskId);
}

export interface ResolvedTherapyActivity {
  module: TherapyModule;
  /** Task indices into the module's task array — safe to pass to the screens. */
  taskIndices: number[];
}

/**
 * Resolves a backend activity id to the module + task indices it should launch.
 * Returns null when the id is unknown or none of its tasks still exist, so the
 * caller can hide the action rather than navigate somewhere broken.
 */
export function resolveTherapyActivity(activityId: string): ResolvedTherapyActivity | null {
  const target = ACTIVITY_MAP[activityId];
  if (!target) return null;

  const taskIndices = target.taskIds
    .map((id) => indexOfTask(target.module, id))
    .filter((i) => i >= 0);

  return taskIndices.length ? { module: target.module, taskIndices } : null;
}
