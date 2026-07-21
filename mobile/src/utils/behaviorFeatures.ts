export interface BehaviorRawEvents {
  task_start_ts: number;
  task_end_ts: number;
  first_tap_ts: number | null;
  taps: { ts: number; correct: boolean }[];
  pauses: { start: number; end: number }[];
  hint_used: boolean;
  hint_count: number;
  skipped: boolean;
  prompt_replays: number;
  self_corrected: boolean;
  focus_losses: number;
  off_task_events: number;
  premature_taps: number;
  random_taps: number;
  inactivity_periods: number;
}

export interface BehaviorFeatures {
  response_latency_sec: number;
  task_duration_sec: number;
  avg_reaction_time_sec: number;
  max_reaction_time_sec: number;
  min_reaction_time_sec: number;
  idle_time_sec: number;
  inactivity_count: number;
  pause_count: number;
  avg_pause_duration_sec: number;
  correct_response_flag: 0 | 1;
  accuracy_score: number;
  error_count: number;
  attempt_count: number;
  retry_count: number;
  task_completion_status: 0 | 1;
  prompt_replay_count: number;
  hint_used_flag: 0 | 1;
  hint_count: number;
  skipped_flag: 0 | 1;
  self_correction_flag: 0 | 1;
  engagement_score: number;
  attention_drop_flag: 0 | 1;
  focus_loss_count: number;
  off_task_event_count: number;
  interaction_consistency_score: number;
  click_variability_score: number;
  motor_hesitation_score: number;
  frustration_indicator_score: number;
  task_switch_delay_sec: number;
  premature_tap_count: number;
  random_tap_count: number;
  attention_score: number;
}

function clamp(v: number, min = 0, max = 1): number {
  return Math.min(Math.max(v, min), max);
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

export function calculateBehaviorFeatures(
  events: BehaviorRawEvents,
  isCorrect: boolean,
  totalAttempts: number,
): BehaviorFeatures {
  const task_duration_sec = (events.task_end_ts - events.task_start_ts) / 1000;
  const response_latency_sec = events.first_tap_ts
    ? (events.first_tap_ts - events.task_start_ts) / 1000
    : task_duration_sec;

  const reaction_times = events.taps.map((t) => (t.ts - events.task_start_ts) / 1000);
  const avg_reaction_time_sec = mean(reaction_times);
  const max_reaction_time_sec = reaction_times.length ? Math.max(...reaction_times) : task_duration_sec;
  const min_reaction_time_sec = reaction_times.length ? Math.min(...reaction_times) : 0;

  const pause_durations = events.pauses.map((p) => (p.end - p.start) / 1000);
  const pause_count = pause_durations.length;
  const avg_pause_duration_sec = mean(pause_durations);
  const idle_time_sec = pause_durations.reduce((a, b) => a + b, 0);

  const error_count = events.taps.filter((t) => !t.correct).length;
  const retry_count = Math.max(0, totalAttempts - 1);
  const task_switch_delay_sec = response_latency_sec * 0.3;

  const engagement_score = clamp(
    1
    - Math.min(idle_time_sec / 20, 0.35)
    - Math.min(retry_count / 6, 0.20)
    - Math.min(events.hint_count / 5, 0.15)
    - (events.skipped ? 0.30 : 0),
  );

  const interaction_consistency_score = clamp(
    1 - (std(reaction_times) / Math.max(mean(reaction_times), 0.1)),
  );

  const motor_hesitation_score = clamp(
    0.40 * Math.min(response_latency_sec / 8, 1) +
    0.30 * Math.min(avg_pause_duration_sec / 3, 1) +
    0.30 * Math.min(task_switch_delay_sec / 5, 1),
  );

  const frustration_indicator_score = clamp(
    0.35 * Math.min(error_count / 6, 1) +
    0.25 * Math.min(retry_count / 5, 1) +
    0.20 * Math.min(events.hint_count / 4, 1) +
    0.20 * Math.min(idle_time_sec / 15, 1),
  );

  const attention_score = clamp(
    0.30 * (1 - Math.min(events.focus_losses / 6, 1)) +
    0.25 * engagement_score +
    0.20 * interaction_consistency_score +
    0.10 * (1 - Math.min(response_latency_sec / 6, 1)) +
    0.15 * (1 - Math.min(retry_count / 5, 1)),
  );

  const click_variability_score = clamp(std(reaction_times) / Math.max(avg_reaction_time_sec, 0.1) * 0.5);

  return {
    response_latency_sec: parseFloat(response_latency_sec.toFixed(3)),
    task_duration_sec: parseFloat(task_duration_sec.toFixed(3)),
    avg_reaction_time_sec: parseFloat(avg_reaction_time_sec.toFixed(3)),
    max_reaction_time_sec: parseFloat(max_reaction_time_sec.toFixed(3)),
    min_reaction_time_sec: parseFloat(min_reaction_time_sec.toFixed(3)),
    idle_time_sec: parseFloat(idle_time_sec.toFixed(3)),
    inactivity_count: events.inactivity_periods,
    pause_count,
    avg_pause_duration_sec: parseFloat(avg_pause_duration_sec.toFixed(3)),
    correct_response_flag: isCorrect ? 1 : 0,
    accuracy_score: parseFloat(clamp(isCorrect ? 1 : 0).toFixed(3)),
    error_count,
    attempt_count: totalAttempts,
    retry_count,
    task_completion_status: events.skipped ? 0 : 1,
    prompt_replay_count: events.prompt_replays,
    hint_used_flag: events.hint_used ? 1 : 0,
    hint_count: events.hint_count,
    skipped_flag: events.skipped ? 1 : 0,
    self_correction_flag: events.self_corrected ? 1 : 0,
    engagement_score: parseFloat(engagement_score.toFixed(3)),
    attention_drop_flag: events.focus_losses > 0 ? 1 : 0,
    focus_loss_count: events.focus_losses,
    off_task_event_count: events.off_task_events,
    interaction_consistency_score: parseFloat(interaction_consistency_score.toFixed(3)),
    click_variability_score: parseFloat(click_variability_score.toFixed(3)),
    motor_hesitation_score: parseFloat(motor_hesitation_score.toFixed(3)),
    frustration_indicator_score: parseFloat(frustration_indicator_score.toFixed(3)),
    task_switch_delay_sec: parseFloat(task_switch_delay_sec.toFixed(3)),
    premature_tap_count: events.premature_taps,
    random_tap_count: events.random_taps,
    attention_score: parseFloat(attention_score.toFixed(3)),
  };
}

export function getTimeOfDay(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
