import { speak, stopSpeaking } from "./ttsService";

/**
 * Short spoken lines for young children.
 *
 * The voice marks progress, not performance: every module says the same "Done!"
 * when an activity ends. Speech and handwriting produce a risk score rather than
 * a right/wrong answer, so a spoken "Correct!" would be meaningless there — and
 * in a dyslexia screening a struggling child would hear "not quite" far too
 * often. Right or wrong is still shown visually on the behaviour result card.
 */

const DONE = ["Done!"];

const LEVEL_DONE = [
  "Level complete!",
  "Level done!",
  "You did it!",
];

/** Deterministic-ish pick so repeated renders of one screen don't re-roll. */
function pick(list: string[], seed?: number): string {
  const i = seed === undefined
    ? Math.floor(Math.random() * list.length)
    : Math.abs(seed) % list.length;
  return list[i];
}

export type FeedbackKind = "done" | "levelDone";

const LISTS: Record<FeedbackKind, string[]> = {
  done: DONE,
  levelDone: LEVEL_DONE,
};

/**
 * Speaks a short line. `seed` keeps the phrase stable for a given screen
 * instance (pass the task index) instead of changing on every re-render.
 */
export function speakFeedback(kind: FeedbackKind, opts: { seed?: number; extra?: string } = {}) {
  const phrase = pick(LISTS[kind], opts.seed);
  speak(opts.extra ? `${phrase} ${opts.extra}` : phrase, { rate: "normal", pitch: 1.15 });
}

export { stopSpeaking };
