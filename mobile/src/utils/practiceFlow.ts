import { PracticeParams } from "../navigation/AppNavigator";

/**
 * Shared "what happens next" logic for a therapy practice run, used by all three
 * module result screens so they behave identically.
 *
 * A practice activity may cover several tasks (e.g. copy b, d, p, q). The child
 * works through `remaining` one at a time; when the list empties the activity is
 * finished and control returns to the therapy plan, which records the session.
 */

export type PracticeNext =
  | { kind: "next-task"; taskIndex: number; practice: PracticeParams }
  | { kind: "activity-done"; activityId: string; response: any };

export function practiceNext(practice: PracticeParams): PracticeNext {
  const [head, ...rest] = practice.remaining;
  if (head === undefined) {
    return { kind: "activity-done", activityId: practice.activityId, response: practice.response };
  }
  return {
    kind: "next-task",
    taskIndex: head,
    practice: { ...practice, remaining: rest },
  };
}
