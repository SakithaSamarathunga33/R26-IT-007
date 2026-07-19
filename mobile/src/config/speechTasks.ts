export type TaskType =
  | "word_repetition"
  | "nonword_repetition"
  | "initial_sound_matching"
  | "final_sound_matching"
  | "rhyme_identification"
  | "syllable_segmentation"
  | "sound_blending";

export type DifficultyLevel = "easy" | "medium" | "hard";

/** Level 1 = simple, Level 2 = harder than simple, Level 3 = difficult. */
export type LevelId = 1 | 2 | 3;

export type LinguisticFocus =
  | "phoneme_accuracy"
  | "word_repetition"
  | "phonological_memory"
  | "phoneme onset"
  | "phoneme final"
  | "rhyme"
  | "syllable_awareness"
  | "sound_blending"
  | "multi_syllable";

export interface SpeechTask {
  id: string;
  level: LevelId;
  task_type: TaskType;
  target_word: string;
  target_phoneme_seq: string;
  difficulty_level: DifficultyLevel;
  linguistic_focus: LinguisticFocus;
  instruction: string;
  /** Spoken by the app (TTS) before the child records. Kept child-friendly. */
  listen_prompt: string;
  /** What the child is asked to say back — shown on the listen screen. */
  say_hint: string;
}

/**
 * Ordered easy → hard and grouped into level blocks. The summary screen maps
 * prediction rows onto this array by position, so keep tasks contiguous per
 * level and only append within a block.
 */
export const SPEECH_TASKS: SpeechTask[] = [
  // ── Level 1 — simple: short, familiar single-syllable words ────────────────
  {
    id: "wr_cat",
    level: 1,
    task_type: "word_repetition",
    target_word: "cat",
    target_phoneme_seq: "K AE T",
    difficulty_level: "easy",
    linguistic_focus: "phoneme_accuracy",
    instruction: "Listen to the word, then say it out loud!",
    listen_prompt: "Say the word: cat",
    say_hint: "cat",
  },
  {
    id: "ism_map",
    level: 1,
    task_type: "initial_sound_matching",
    target_word: "map",
    target_phoneme_seq: "M AE P",
    difficulty_level: "easy",
    linguistic_focus: "phoneme onset",
    instruction: "What sound does this word start with? Say the word and its first sound!",
    listen_prompt: "Map. Map starts with the sound: mmm. Now you say map, then its first sound.",
    say_hint: "map … m",
  },
  {
    id: "ri_bat",
    level: 1,
    task_type: "rhyme_identification",
    target_word: "bat",
    target_phoneme_seq: "B AE T",
    difficulty_level: "easy",
    linguistic_focus: "rhyme",
    instruction: "Say a word that rhymes with this one!",
    listen_prompt: "Bat. Now say a word that rhymes with bat, like hat.",
    say_hint: "a word that rhymes with bat",
  },
  {
    id: "nwr_mip",
    level: 1,
    task_type: "nonword_repetition",
    target_word: "mip",
    target_phoneme_seq: "M IH P",
    difficulty_level: "easy",
    linguistic_focus: "phonological_memory",
    instruction: "This is a made-up word — it's okay if it sounds new! Repeat it.",
    listen_prompt: "Here is a silly made-up word: mip. Now you say mip.",
    say_hint: "mip",
  },

  // ── Level 2 — harder: two-syllable words and sound positions ───────────────
  {
    id: "wr_rabbit",
    level: 2,
    task_type: "word_repetition",
    target_word: "rabbit",
    target_phoneme_seq: "R AE B IH T",
    difficulty_level: "medium",
    linguistic_focus: "phoneme_accuracy",
    instruction: "Listen carefully and say this word out loud!",
    listen_prompt: "Say the word: rabbit",
    say_hint: "rabbit",
  },
  {
    id: "ism_goat",
    level: 2,
    task_type: "initial_sound_matching",
    target_word: "goat",
    target_phoneme_seq: "G OW T",
    difficulty_level: "medium",
    linguistic_focus: "phoneme onset",
    instruction: "What sound does this word start with? Say the word and its first sound!",
    listen_prompt: "Goat. Now say goat, then tell me the sound it starts with.",
    say_hint: "goat … g",
  },
  {
    id: "ss_banana",
    level: 2,
    task_type: "syllable_segmentation",
    target_word: "banana",
    target_phoneme_seq: "B AH N AE N AH",
    difficulty_level: "medium",
    linguistic_focus: "syllable_awareness",
    instruction: "Clap and say each part of the word separately!",
    listen_prompt: "Banana has three parts: ba — na — na. Now you clap and say each part.",
    say_hint: "ba · na · na",
  },

  // ── Level 3 — difficult: long words and made-up multi-syllable words ───────
  {
    id: "wr_butterfly",
    level: 3,
    task_type: "word_repetition",
    target_word: "butterfly",
    target_phoneme_seq: "B AH T ER F L AY",
    difficulty_level: "hard",
    linguistic_focus: "multi_syllable",
    instruction: "This is a longer word. Say it as clearly as you can!",
    listen_prompt: "This one is longer. Say the word: butterfly",
    say_hint: "butterfly",
  },
  {
    id: "ss_elephant",
    level: 3,
    task_type: "syllable_segmentation",
    target_word: "elephant",
    target_phoneme_seq: "EH L AH F AH N T",
    difficulty_level: "hard",
    linguistic_focus: "syllable_awareness",
    instruction: "Clap and say each part of the word separately!",
    listen_prompt: "Elephant has three parts: e — le — phant. Now you clap and say each part.",
    say_hint: "e · le · phant",
  },
  {
    id: "nwr_famika",
    level: 3,
    task_type: "nonword_repetition",
    target_word: "famika",
    target_phoneme_seq: "F AH M IH K AH",
    difficulty_level: "hard",
    linguistic_focus: "phonological_memory",
    instruction: "This is a made-up word — it's okay if it sounds new! Repeat it.",
    listen_prompt: "Here is a tricky made-up word: famika. Listen closely, then say famika.",
    say_hint: "famika",
  },
];

// ── Level metadata ────────────────────────────────────────────────────────────

export interface SpeechLevel {
  id: LevelId;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  bg: string;
  gradColors: [string, string];
}

export const SPEECH_LEVELS: SpeechLevel[] = [
  {
    id: 1,
    title: "Simple Sounds",
    subtitle: "Level 1",
    description: "Short, familiar words. Just listen and say them back.",
    icon: "happy-outline",
    color: "#059669",
    bg: "#ECFDF5",
    gradColors: ["#10B981", "#059669"],
  },
  {
    id: 2,
    title: "Getting Harder",
    subtitle: "Level 2",
    description: "Longer words with two or three parts to sound out.",
    icon: "flash-outline",
    color: "#D97706",
    bg: "#FFFBEB",
    gradColors: ["#F59E0B", "#D97706"],
  },
  {
    id: 3,
    title: "Challenge",
    subtitle: "Level 3",
    description: "Tricky long words and made-up words. Give it your best!",
    icon: "rocket-outline",
    color: "#7C3AED",
    bg: "#F5F3FF",
    gradColors: ["#8B5CF6", "#7C3AED"],
  },
];

/** Global indices into SPEECH_TASKS belonging to `level`, in task order. */
export function taskIndicesForLevel(level: LevelId): number[] {
  return SPEECH_TASKS.reduce<number[]>((acc, t, i) => {
    if (t.level === level) acc.push(i);
    return acc;
  }, []);
}

export function levelTaskCount(level: LevelId): number {
  return SPEECH_TASKS.filter((t) => t.level === level).length;
}

/** 1-based position of a task inside its own level (for "Activity 2 of 4"). */
export function positionInLevel(taskIndex: number): number {
  const level = SPEECH_TASKS[taskIndex].level;
  return taskIndicesForLevel(level).indexOf(taskIndex) + 1;
}

/** Next task index inside the same level, or null when the level is finished. */
export function nextIndexInLevel(taskIndex: number): number | null {
  const indices = taskIndicesForLevel(SPEECH_TASKS[taskIndex].level);
  const next = indices[indices.indexOf(taskIndex) + 1];
  return next ?? null;
}

export function getLevel(level: LevelId): SpeechLevel {
  return SPEECH_LEVELS.find((l) => l.id === level)!;
}

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  word_repetition: "Word Repetition",
  nonword_repetition: "Nonword Repetition",
  initial_sound_matching: "Initial Sound",
  final_sound_matching: "Final Sound",
  rhyme_identification: "Rhyme",
  syllable_segmentation: "Syllables",
  sound_blending: "Sound Blending",
};

export const TASK_TYPE_ICONS: Record<TaskType, string> = {
  word_repetition: "text",
  nonword_repetition: "shuffle",
  initial_sound_matching: "play-skip-forward",
  final_sound_matching: "play-skip-back",
  rhyme_identification: "musical-notes",
  syllable_segmentation: "grid",
  sound_blending: "layers",
};
