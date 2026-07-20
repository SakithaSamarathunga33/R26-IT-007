export type BehaviorTaskType =
  | "letter_identification"
  | "missing_letter"
  | "shape_matching"
  | "pattern_completion"
  | "attention_sustained"
  | "working_memory";

export type DifficultyLevel = "easy" | "medium" | "hard";
export type CognitiveFocus =
  | "basic_letter_focus"
  | "letter_sound_mapping"
  | "visual_discrimination"
  | "pattern_recognition"
  | "sustained_attention"
  | "working_memory_load";

export type AttentionLoad = "low" | "medium" | "high";

/** Level 1 = simple, Level 2 = harder, Level 3 = advanced. */
export type BehaviorLevelId = 1 | 2 | 3;

export interface BehaviorTask {
  id: string;
  level: BehaviorLevelId;
  task_type: BehaviorTaskType;
  task_description: string;
  cognitive_focus: CognitiveFocus;
  attention_load: AttentionLoad;
  difficulty_level: DifficultyLevel;
  instruction: string;
  options: string[];
  correct_answer: string;
  hint: string;
  /**
   * Spoken aloud by the app when the activity opens. Written to be understood by
   * ear alone — the on-screen `instruction` may rely on layout that TTS can't
   * convey (e.g. a row of symbols).
   */
  spoken_prompt: string;
  /**
   * Missing-letter tasks only: the full word and which 0-based index is blanked.
   * The activity screen renders the word with that letter replaced by a gap.
   */
  word?: string;
  missing_index?: number;
}

export const BEHAVIOR_TASKS: BehaviorTask[] = [
  // ── Level 1 — simple: single letters, basic shapes, first missing letters ───
  {
    id: "li_b_d",
    level: 1,
    task_type: "letter_identification",
    task_description: "Child selects the correct target letter from four options.",
    cognitive_focus: "basic_letter_focus",
    attention_load: "low",
    difficulty_level: "easy",
    instruction: "Tap the letter  B",
    options: ["D", "B", "P", "Q"],
    correct_answer: "B",
    hint: "Look for the letter with a bump on the right side.",
    spoken_prompt: "Tap the letter B.",
  },
  {
    id: "ml_cat_c",
    level: 1,
    task_type: "missing_letter",
    task_description: "Child picks the letter missing from the start of a short word.",
    cognitive_focus: "letter_sound_mapping",
    attention_load: "low",
    difficulty_level: "easy",
    instruction: "Which letter is missing?",
    word: "cat",
    missing_index: 0,
    options: ["c", "k", "t", "a"],
    correct_answer: "c",
    hint: "The word is cat. It starts with a  cuh  sound.",
    spoken_prompt: "The word is cat. Which letter is missing from cat?",
  },
  {
    id: "ml_sun_s",
    level: 1,
    task_type: "missing_letter",
    task_description: "Child picks the missing first letter of a familiar word.",
    cognitive_focus: "letter_sound_mapping",
    attention_load: "low",
    difficulty_level: "easy",
    instruction: "Which letter is missing?",
    word: "sun",
    missing_index: 0,
    options: ["s", "z", "n", "u"],
    correct_answer: "s",
    hint: "The word is sun. It starts with an  sss  sound, like a snake.",
    spoken_prompt: "The word is sun. Which letter is missing from sun?",
  },
  {
    id: "ml_dog_o",
    level: 1,
    task_type: "missing_letter",
    task_description: "Child picks a missing middle vowel in a short word.",
    cognitive_focus: "letter_sound_mapping",
    attention_load: "low",
    difficulty_level: "easy",
    instruction: "Which letter is missing?",
    word: "dog",
    missing_index: 1,
    options: ["a", "o", "e", "u"],
    correct_answer: "o",
    hint: "The word is dog. Listen to the middle sound —  o.",
    spoken_prompt: "The word is dog. Which letter is missing from the middle of dog?",
  },
  {
    id: "sm_circle",
    level: 1,
    task_type: "shape_matching",
    task_description: "Child matches the shown shape to the correct option.",
    cognitive_focus: "visual_discrimination",
    attention_load: "low",
    difficulty_level: "easy",
    instruction: "Which shape matches the one shown?  Circle",
    options: ["Triangle", "Circle", "Square", "Diamond"],
    correct_answer: "Circle",
    hint: "A circle is perfectly round with no corners.",
    spoken_prompt: "Which shape matches a circle?",
  },
  {
    id: "pc_colors",
    level: 1,
    task_type: "pattern_completion",
    task_description: "Child identifies what comes next in a color pattern.",
    cognitive_focus: "pattern_recognition",
    attention_load: "medium",
    difficulty_level: "easy",
    instruction: "Red, Blue, Red, Blue, ___?",
    options: ["Green", "Blue", "Red", "Yellow"],
    correct_answer: "Red",
    hint: "Look at the colors before the blank and find the repeating pattern.",
    spoken_prompt: "Red, blue, red, blue. What colour comes next?",
  },
  {
    id: "li_a_easy",
    level: 1,
    task_type: "letter_identification",
    task_description: "Child selects a vowel from four options.",
    cognitive_focus: "basic_letter_focus",
    attention_load: "low",
    difficulty_level: "easy",
    instruction: "Tap the letter  A",
    options: ["A", "E", "H", "N"],
    correct_answer: "A",
    hint: "A has a pointy top like a tent.",
    spoken_prompt: "Tap the letter A.",
  },

  // ── Level 2 — harder: confusable letters, longer words, mid-word gaps ───────
  {
    id: "li_p_q",
    level: 2,
    task_type: "letter_identification",
    task_description: "Child identifies letter P from visually similar letters.",
    cognitive_focus: "basic_letter_focus",
    attention_load: "low",
    difficulty_level: "medium",
    instruction: "Tap the letter  P",
    options: ["Q", "D", "P", "B"],
    correct_answer: "P",
    hint: "P has a bump at the top right, with no tail.",
    spoken_prompt: "Tap the letter P.",
  },
  {
    id: "ml_umbrella_u",
    level: 2,
    task_type: "missing_letter",
    task_description: "Child picks the missing first letter of a long word.",
    cognitive_focus: "letter_sound_mapping",
    attention_load: "medium",
    difficulty_level: "medium",
    instruction: "Which letter is missing?",
    word: "umbrella",
    missing_index: 0,
    options: ["a", "u", "o", "e"],
    correct_answer: "u",
    hint: "The word is umbrella. It starts with an  uh  sound.",
    spoken_prompt: "The word is umbrella. Which letter is missing from umbrella?",
  },
  {
    id: "ml_table_b",
    level: 2,
    task_type: "missing_letter",
    task_description: "Child picks a missing reversal-sensitive letter inside a word.",
    cognitive_focus: "letter_sound_mapping",
    attention_load: "medium",
    difficulty_level: "medium",
    instruction: "Which letter is missing?",
    // Avoids double letters — in a word like "apple" the second p stays visible
    // and hands the child the answer.
    word: "table",
    missing_index: 2,
    options: ["d", "b", "p", "h"],
    correct_answer: "b",
    hint: "The word is table. Listen for the  buh  sound in the middle.",
    spoken_prompt: "The word is table. Which letter is missing from the middle of table?",
  },
  {
    id: "ml_fish_i",
    level: 2,
    task_type: "missing_letter",
    task_description: "Child picks a missing short vowel inside a word.",
    cognitive_focus: "letter_sound_mapping",
    attention_load: "medium",
    difficulty_level: "medium",
    instruction: "Which letter is missing?",
    word: "fish",
    missing_index: 1,
    options: ["e", "i", "a", "o"],
    correct_answer: "i",
    hint: "The word is fish. The middle sound is  ih.",
    spoken_prompt: "The word is fish. Which letter is missing from the middle of fish?",
  },
  {
    id: "sm_diamond",
    level: 2,
    task_type: "shape_matching",
    task_description: "Child matches a rotated shape to the correct option.",
    cognitive_focus: "visual_discrimination",
    attention_load: "medium",
    difficulty_level: "medium",
    instruction: "Which shape matches the one shown?  Diamond",
    options: ["Square", "Rectangle", "Diamond", "Pentagon"],
    correct_answer: "Diamond",
    hint: "A diamond is a square tilted 45 degrees.",
    spoken_prompt: "Which shape matches a diamond?",
  },
  {
    id: "pc_shapes",
    level: 2,
    task_type: "pattern_completion",
    task_description: "Child identifies the next shape in a sequence.",
    cognitive_focus: "pattern_recognition",
    attention_load: "medium",
    difficulty_level: "medium",
    instruction: "Circle, Square, Triangle, Circle, Square, ___?",
    options: ["Circle", "Diamond", "Triangle", "Square"],
    correct_answer: "Triangle",
    hint: "The pattern repeats every 3 shapes.",
    spoken_prompt: "Circle, square, triangle, circle, square. What shape comes next?",
  },
  {
    id: "as_count",
    level: 2,
    task_type: "attention_sustained",
    task_description: "Child counts specific items while ignoring distractors.",
    cognitive_focus: "sustained_attention",
    attention_load: "high",
    difficulty_level: "medium",
    instruction: "How many  stars  are below?\n★ ● ★ ■ ★ ● ■ ★",
    options: ["3", "4", "5", "6"],
    correct_answer: "4",
    hint: "Count only the star shapes, not circles or squares.",
    spoken_prompt: "Look at the shapes on the screen. How many stars can you count?",
  },
  {
    id: "wm_seq_3",
    level: 2,
    task_type: "working_memory",
    task_description: "Child remembers and selects items shown briefly in sequence.",
    cognitive_focus: "working_memory_load",
    attention_load: "high",
    difficulty_level: "medium",
    instruction: "Remember: Cat → Dog → Bird\nWhich animal came second?",
    options: ["Cat", "Dog", "Bird", "Fish"],
    correct_answer: "Dog",
    hint: "Think about the order the animals were shown.",
    spoken_prompt: "Remember these animals: cat, dog, bird. Which animal came second?",
  },

  // ── Level 3 — advanced: reversal traps, blends, heavier memory load ─────────
  {
    id: "ml_elephant_p",
    level: 3,
    task_type: "missing_letter",
    task_description: "Child picks a missing consonant inside a multi-syllable word.",
    cognitive_focus: "letter_sound_mapping",
    attention_load: "high",
    difficulty_level: "hard",
    instruction: "Which letter is missing?",
    // Masks the p, not the leading e — elephant has a second e that would stay
    // on screen and give the answer away.
    word: "elephant",
    missing_index: 3,
    options: ["b", "d", "p", "t"],
    correct_answer: "p",
    hint: "The word is elephant. Listen for the  puh  sound in the middle.",
    spoken_prompt: "The word is elephant. Which letter is missing from the middle of elephant?",
  },
  {
    id: "ml_butterfly_b",
    level: 3,
    task_type: "missing_letter",
    task_description: "Child picks a missing reversal-sensitive letter in a long word.",
    cognitive_focus: "letter_sound_mapping",
    attention_load: "high",
    difficulty_level: "hard",
    instruction: "Which letter is missing?",
    word: "butterfly",
    missing_index: 0,
    options: ["d", "b", "p", "q"],
    correct_answer: "b",
    hint: "The word is butterfly. It starts with a  buh  sound — careful, b and d look alike!",
    spoken_prompt: "The word is butterfly. Which letter is missing from butterfly?",
  },
  {
    id: "ml_school_h",
    level: 3,
    task_type: "missing_letter",
    task_description: "Child picks a missing letter from inside a consonant blend.",
    cognitive_focus: "letter_sound_mapping",
    attention_load: "high",
    difficulty_level: "hard",
    instruction: "Which letter is missing?",
    word: "school",
    missing_index: 2,
    options: ["k", "h", "c", "l"],
    correct_answer: "h",
    hint: "The word is school. The  s  and  c  are followed by a silent  h.",
    spoken_prompt: "The word is school. Which letter is missing from school?",
  },
  {
    id: "as_odd",
    level: 3,
    task_type: "attention_sustained",
    task_description: "Child spots the odd item out in a row.",
    cognitive_focus: "sustained_attention",
    attention_load: "high",
    difficulty_level: "hard",
    instruction: "Which one is different?\nA  A  A  A  Λ  A",
    options: ["1st", "3rd", "5th", "6th"],
    correct_answer: "5th",
    hint: "Look very carefully — one shape has slightly different angles.",
    spoken_prompt: "Look at the row of letters. One of them is different from the others. Which position is it in?",
  },
  {
    id: "wm_color_seq",
    level: 3,
    task_type: "working_memory",
    task_description: "Child recalls a color sequence after a short delay.",
    cognitive_focus: "working_memory_load",
    attention_load: "high",
    difficulty_level: "hard",
    instruction: "Remember: Red → Green → Blue → Yellow\nWhich color came third?",
    options: ["Red", "Green", "Blue", "Yellow"],
    correct_answer: "Blue",
    hint: "Count through the colors from the beginning.",
    spoken_prompt: "Remember these colours: red, green, blue, yellow. Which colour came third?",
  },
  {
    id: "wm_letter_seq",
    level: 3,
    task_type: "working_memory",
    task_description: "Child recalls a letter sequence including confusable letters.",
    cognitive_focus: "working_memory_load",
    attention_load: "high",
    difficulty_level: "hard",
    instruction: "Remember: B → D → P → B → Q\nWhich letter came fourth?",
    options: ["B", "D", "P", "Q"],
    correct_answer: "B",
    hint: "Count along the letters one at a time from the start.",
    spoken_prompt: "Remember these letters: B, D, P, B, Q. Which letter came fourth?",
  },
  {
    id: "pc_letters",
    level: 3,
    task_type: "pattern_completion",
    task_description: "Child completes an alternating letter pattern.",
    cognitive_focus: "pattern_recognition",
    attention_load: "high",
    difficulty_level: "hard",
    instruction: "a, b, a, b, b, a, b, b, b, ___?",
    options: ["a", "b", "c", "d"],
    correct_answer: "a",
    hint: "The b's grow by one each time, and an  a  comes after each group.",
    spoken_prompt: "Listen to this pattern: a, b, a, b, b, a, b, b, b. What letter comes next?",
  },
];

// ── Level metadata ────────────────────────────────────────────────────────────

export interface BehaviorLevel {
  id: BehaviorLevelId;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  bg: string;
  gradColors: [string, string];
}

export const BEHAVIOR_LEVELS: BehaviorLevel[] = [
  {
    id: 1,
    title: "Getting Started",
    subtitle: "Level 1",
    description: "Single letters, simple shapes, and short words like cat and sun.",
    icon: "happy-outline",
    color: "#059669",
    bg: "#ECFDF5",
    gradColors: ["#10B981", "#059669"],
  },
  {
    id: 2,
    title: "Looking Closer",
    subtitle: "Level 2",
    description: "Longer words like umbrella, trickier patterns, and memory tasks.",
    icon: "flash-outline",
    color: "#D97706",
    bg: "#FFFBEB",
    gradColors: ["#F59E0B", "#D97706"],
  },
  {
    id: 3,
    title: "Challenge",
    subtitle: "Level 3",
    description: "Long words, b/d/p/q traps, and longer sequences to remember.",
    icon: "rocket-outline",
    color: "#7C3AED",
    bg: "#F5F3FF",
    gradColors: ["#8B5CF6", "#7C3AED"],
  },
];

/** Global indices into BEHAVIOR_TASKS belonging to `level`, in task order. */
export function behaviorTaskIndicesForLevel(level: BehaviorLevelId): number[] {
  return BEHAVIOR_TASKS.reduce<number[]>((acc, t, i) => {
    if (t.level === level) acc.push(i);
    return acc;
  }, []);
}

export function behaviorLevelTaskCount(level: BehaviorLevelId): number {
  return BEHAVIOR_TASKS.filter((t) => t.level === level).length;
}

/** 1-based position of a task inside its own level (for "Activity 2 of 7"). */
export function behaviorPositionInLevel(taskIndex: number): number {
  const level = BEHAVIOR_TASKS[taskIndex].level;
  return behaviorTaskIndicesForLevel(level).indexOf(taskIndex) + 1;
}

/** Next task index inside the same level, or null when the level is finished. */
export function behaviorNextIndexInLevel(taskIndex: number): number | null {
  const indices = behaviorTaskIndicesForLevel(BEHAVIOR_TASKS[taskIndex].level);
  const next = indices[indices.indexOf(taskIndex) + 1];
  return next ?? null;
}

export function getBehaviorLevel(level: BehaviorLevelId): BehaviorLevel {
  return BEHAVIOR_LEVELS.find((l) => l.id === level)!;
}

/**
 * Renders a missing-letter word as spaced characters with the target letter
 * replaced by an underscore, e.g. umbrella/0 → "_ m b r e l l a".
 */
export function maskedWord(task: BehaviorTask): string {
  if (!task.word || task.missing_index === undefined) return "";
  return task.word
    .split("")
    .map((ch, i) => (i === task.missing_index ? "_" : ch))
    .join(" ");
}

export const BEHAVIOR_TASK_TYPE_LABELS: Record<BehaviorTaskType, string> = {
  letter_identification: "Letter ID",
  missing_letter: "Missing Letter",
  shape_matching: "Shape Match",
  pattern_completion: "Pattern",
  attention_sustained: "Attention",
  working_memory: "Memory",
};

export const BEHAVIOR_TASK_TYPE_ICONS: Record<BehaviorTaskType, string> = {
  letter_identification: "text-outline",
  missing_letter: "help-circle-outline",
  shape_matching: "shapes-outline",
  pattern_completion: "grid-outline",
  attention_sustained: "eye-outline",
  working_memory: "bulb-outline",
};

export const BEHAVIOR_TASK_COLORS: Record<BehaviorTaskType, { color: string; bg: string; border: string }> = {
  letter_identification: { color: "#2563EB", bg: "#EFF6FF", border: "#DBEAFE" },
  // Indigo — sits in the app's existing blue/purple family rather than
  // introducing a new hue.
  missing_letter:        { color: "#4F46E5", bg: "#EEF2FF", border: "#E0E7FF" },
  shape_matching:        { color: "#7C3AED", bg: "#F5F3FF", border: "#EDE9FE" },
  pattern_completion:    { color: "#D97706", bg: "#FFFBEB", border: "#FEF3C7" },
  attention_sustained:   { color: "#0891B2", bg: "#ECFEFF", border: "#CFFAFE" },
  working_memory:        { color: "#059669", bg: "#ECFDF5", border: "#BBF7D0" },
};
