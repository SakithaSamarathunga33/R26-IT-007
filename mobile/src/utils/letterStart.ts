type Point = { x: number; y: number };

/**
 * Where each screened letter is taught to start, as a point inside the letter's
 * own bounding box (0,0 = top-left, 1,1 = bottom-right), plus the cue the canvas
 * shows. Using the child's own box makes the check independent of size and
 * position. Round letters (d, q) start like a "c", at the top of the bowl.
 */
export const LETTER_START: Record<string, { x: number; y: number; cue: string }> = {
  b: { x: 0, y: 0, cue: "Start at the top of the tall line, then go down" },
  d: { x: 0.7, y: 0.45, cue: "Start with the round part, like a c" },
  p: { x: 0, y: 0, cue: "Start at the top, then go down" },
  q: { x: 0.7, y: 0, cue: "Start with the round part, like a c" },
  A: { x: 0.5, y: 0, cue: "Start at the top point" },
  B: { x: 0, y: 0, cue: "Start at the top, line down first" },
  E: { x: 0, y: 0, cue: "Start at the top, line down first" },
  R: { x: 0, y: 0, cue: "Start at the top, line down first" },
};

/** Max distance, in box units, between the first touch and the taught start. */
const START_TOLERANCE = 0.35;

/**
 * True when the first stroke starts near where `letter` is taught to start;
 * null when there is no rule for it or nothing was drawn.
 */
export function checkLetterStart(strokes: Point[][], letter: string): boolean | null {
  const rule = LETTER_START[letter];
  const points = strokes.flat();
  if (!rule || points.length === 0) return null;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const w = Math.max(...xs) - minX, h = Math.max(...ys) - minY;
  // A floor so a thin, mostly-straight letter doesn't blow small offsets up.
  const floor = Math.max(w, h, 1) * 0.25;
  const first = strokes.find((s) => s.length > 0)![0];
  const nx = (first.x - minX) / Math.max(w, floor);
  const ny = (first.y - minY) / Math.max(h, floor);
  return Math.hypot(nx - rule.x, ny - rule.y) <= START_TOLERANCE;
}
