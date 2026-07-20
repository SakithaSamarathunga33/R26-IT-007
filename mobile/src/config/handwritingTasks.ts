export type HandwritingTaskType =
  | "letter_copy"
  | "letter_trace"
  | "word_copy"
  | "write_from_memory"
  | "simple_dictation";

export type DifficultyLevel = "easy" | "medium" | "hard";

/** Level 1 = easy, Level 2 = intermediate, Level 3 = advanced. */
export type HandwritingLevelId = 1 | 2 | 3;

export interface HandwritingTask {
  id: string;
  level: HandwritingLevelId;
  task_type: HandwritingTaskType;
  target_text: string;
  difficulty_level: DifficultyLevel;
  instruction: string;
  purpose: string;
}

/**
 * Ordered easy → advanced and grouped into level blocks of 7. Progression is
 * trace → copy letter → copy word → recall from memory, so motor support drops
 * away as the levels go up. The summary screen groups predictions by the `level`
 * stored on each doc, so tasks may be reordered within a block safely.
 */
export const HANDWRITING_TASKS: HandwritingTask[] = [
  // ── Level 1 — Letters: guided tracing, then freehand single letters ────────
  { id: "lt_b",  level: 1, task_type: "letter_trace",      target_text: "b",         difficulty_level: "easy",   instruction: "Trace over the letter  b",                 purpose: "Guided motor control and letter formation." },
  { id: "lt_d",  level: 1, task_type: "letter_trace",      target_text: "d",         difficulty_level: "easy",   instruction: "Trace over the letter  d",                 purpose: "Guided motor control and reversal-sensitive writing." },
  { id: "lt_A",  level: 1, task_type: "letter_trace",      target_text: "A",         difficulty_level: "easy",   instruction: "Trace over the letter  A",                 purpose: "Guided motor control for capital letter formation." },
  { id: "lt_E",  level: 1, task_type: "letter_trace",      target_text: "E",         difficulty_level: "easy",   instruction: "Trace over the letter  E",                 purpose: "Guided motor control for multi-stroke capital." },
  { id: "lc_b",  level: 1, task_type: "letter_copy",       target_text: "b",         difficulty_level: "easy",   instruction: "Copy the letter  b",                       purpose: "Letter formation and reversal-sensitive letter check." },
  { id: "lc_d",  level: 1, task_type: "letter_copy",       target_text: "d",         difficulty_level: "easy",   instruction: "Copy the letter  d",                       purpose: "Letter formation and b/d confusion check." },
  { id: "lc_p",  level: 1, task_type: "letter_copy",       target_text: "p",         difficulty_level: "easy",   instruction: "Copy the letter  p",                       purpose: "Letter formation and p/q confusion check." },

  // ── Level 2 — Letters & short words: capitals, then 3-letter words ─────────
  { id: "lc_q",  level: 2, task_type: "letter_copy",       target_text: "q",         difficulty_level: "easy",   instruction: "Copy the letter  q",                       purpose: "Letter formation and p/q confusion check." },
  { id: "lc_A",  level: 2, task_type: "letter_copy",       target_text: "A",         difficulty_level: "easy",   instruction: "Copy the letter  A",                       purpose: "Capital letter formation and stroke order." },
  { id: "lc_B",  level: 2, task_type: "letter_copy",       target_text: "B",         difficulty_level: "easy",   instruction: "Copy the letter  B",                       purpose: "Capital letter formation with curves." },
  { id: "lc_E",  level: 2, task_type: "letter_copy",       target_text: "E",         difficulty_level: "easy",   instruction: "Copy the letter  E",                       purpose: "Capital letter with multiple horizontal strokes." },
  { id: "wc_cat",level: 2, task_type: "word_copy",         target_text: "cat",       difficulty_level: "easy",   instruction: "Copy the word  cat",                       purpose: "Short word shape and spacing." },
  { id: "wc_dog",level: 2, task_type: "word_copy",         target_text: "dog",       difficulty_level: "easy",   instruction: "Copy the word  dog",                       purpose: "Short word shape and spacing." },
  { id: "sd_cat",level: 2, task_type: "simple_dictation",  target_text: "cat",       difficulty_level: "medium", instruction: "Listen and write the word you hear",        purpose: "Audio-to-writing task." },

  // ── Level 3 — Advanced: long words, then writing with no target on screen ──
  { id: "lc_R",  level: 3, task_type: "letter_copy",       target_text: "R",         difficulty_level: "medium", instruction: "Copy the letter  R",                       purpose: "Capital letter formation with diagonal stroke." },
  { id: "wc_bsk",level: 3, task_type: "word_copy",         target_text: "basket",    difficulty_level: "medium", instruction: "Copy the word  basket",                    purpose: "Multi-letter spacing and alignment." },
  { id: "wc_sch",level: 3, task_type: "word_copy",         target_text: "school",    difficulty_level: "hard",   instruction: "Copy the word  school",                    purpose: "Longer word structure and spacing." },
  { id: "wc_fly",level: 3, task_type: "word_copy",         target_text: "butterfly", difficulty_level: "hard",   instruction: "Copy the word  butterfly",                 purpose: "Long word spacing, alignment, and consistency." },
  { id: "wm_bed",level: 3, task_type: "write_from_memory", target_text: "bed",       difficulty_level: "medium", instruction: "Remember the word  bed  — then write it",  purpose: "Memory and reversal-sensitive letters." },
  { id: "wm_bad",level: 3, task_type: "write_from_memory", target_text: "bad",       difficulty_level: "medium", instruction: "Remember the word  bad  — then write it",  purpose: "Memory, b/d confusion, and shape formation." },
  { id: "sd_bag",level: 3, task_type: "simple_dictation",  target_text: "bag",       difficulty_level: "medium", instruction: "Listen and write the word you hear",        purpose: "Audio-to-writing and b-letter formation." },
];

// ── Level metadata ────────────────────────────────────────────────────────────

export interface HandwritingLevel {
  id: HandwritingLevelId;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  bg: string;
  gradColors: [string, string];
}

export const HANDWRITING_LEVELS: HandwritingLevel[] = [
  {
    id: 1,
    title: "Letters",
    subtitle: "Level 1",
    description: "Trace and copy single letters. Guided lines to follow.",
    icon: "pencil-outline",
    color: "#059669",
    bg: "#ECFDF5",
    gradColors: ["#10B981", "#059669"],
  },
  {
    id: 2,
    title: "Letters & Words",
    subtitle: "Level 2",
    description: "Capital letters and short words, plus your first listening task.",
    icon: "text-outline",
    color: "#D97706",
    bg: "#FFFBEB",
    gradColors: ["#F59E0B", "#D97706"],
  },
  {
    id: 3,
    title: "Advanced Writing",
    subtitle: "Level 3",
    description: "Long words, then writing from memory with nothing to copy.",
    icon: "rocket-outline",
    color: "#7C3AED",
    bg: "#F5F3FF",
    gradColors: ["#8B5CF6", "#7C3AED"],
  },
];

/** Global indices into HANDWRITING_TASKS belonging to `level`, in task order. */
export function handwritingTaskIndicesForLevel(level: HandwritingLevelId): number[] {
  return HANDWRITING_TASKS.reduce<number[]>((acc, t, i) => {
    if (t.level === level) acc.push(i);
    return acc;
  }, []);
}

export function handwritingLevelTaskCount(level: HandwritingLevelId): number {
  return HANDWRITING_TASKS.filter((t) => t.level === level).length;
}

/** 1-based position of a task inside its own level (for "Task 2 of 7"). */
export function handwritingPositionInLevel(taskIndex: number): number {
  const level = HANDWRITING_TASKS[taskIndex].level;
  return handwritingTaskIndicesForLevel(level).indexOf(taskIndex) + 1;
}

/** Next task index inside the same level, or null when the level is finished. */
export function handwritingNextIndexInLevel(taskIndex: number): number | null {
  const indices = handwritingTaskIndicesForLevel(HANDWRITING_TASKS[taskIndex].level);
  const next = indices[indices.indexOf(taskIndex) + 1];
  return next ?? null;
}

export function getHandwritingLevel(level: HandwritingLevelId): HandwritingLevel {
  return HANDWRITING_LEVELS.find((l) => l.id === level)!;
}

export const HANDWRITING_TASK_TYPE_LABELS: Record<HandwritingTaskType, string> = {
  letter_copy:       "Letter Copy",
  letter_trace:      "Letter Trace",
  word_copy:         "Word Copy",
  write_from_memory: "From Memory",
  simple_dictation:  "Dictation",
};

export const HANDWRITING_TASK_TYPE_ICONS: Record<HandwritingTaskType, string> = {
  letter_copy:       "text-outline",
  letter_trace:      "pencil-outline",
  word_copy:         "copy-outline",
  write_from_memory: "bulb-outline",
  simple_dictation:  "volume-medium-outline",
};

export const HANDWRITING_TASK_COLORS: Record<HandwritingTaskType, { color: string; bg: string; border: string }> = {
  letter_copy:       { color: "#2563EB", bg: "#EFF6FF", border: "#DBEAFE" },
  letter_trace:      { color: "#7C3AED", bg: "#F5F3FF", border: "#EDE9FE" },
  word_copy:         { color: "#0891B2", bg: "#ECFEFF", border: "#CFFAFE" },
  write_from_memory: { color: "#D97706", bg: "#FFFBEB", border: "#FEF3C7" },
  simple_dictation:  { color: "#059669", bg: "#ECFDF5", border: "#BBF7D0" },
};
