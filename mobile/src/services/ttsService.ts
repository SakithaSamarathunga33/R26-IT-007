import * as Speech from "expo-speech";

/**
 * Device text-to-speech used to model the target word for the child before
 * they record. Rates are deliberately slower than default — young children
 * need time to hear each phoneme.
 */

const LANGUAGE = "en-US";

export type SpeakRate = "normal" | "slow";

const RATES: Record<SpeakRate, number> = {
  normal: 0.82,
  slow: 0.5,
};

export interface SpeakOptions {
  rate?: SpeakRate;
  pitch?: number;
  onStart?: () => void;
  onDone?: () => void;
  onError?: () => void;
}

export function stopSpeaking() {
  try {
    Speech.stop();
  } catch {
    // Stopping when nothing is queued throws on some Android builds — harmless.
  }
}

/** Speaks `text`, cancelling anything already playing first. */
export function speak(text: string, opts: SpeakOptions = {}) {
  const { rate = "normal", pitch = 1.05, onStart, onDone, onError } = opts;
  stopSpeaking();
  onStart?.();
  try {
    Speech.speak(text, {
      language: LANGUAGE,
      rate: RATES[rate],
      pitch,
      onDone: () => onDone?.(),
      onStopped: () => onDone?.(),
      onError: () => {
        onError?.();
        onDone?.();
      },
    });
  } catch {
    onError?.();
    onDone?.();
  }
}

/**
 * Stretches a word so each letter group is audible — used for the
 * "say it slowly" helper. Hyphens make most TTS engines insert small pauses.
 */
export function stretchWord(word: string): string {
  return word.trim().split("").join(" - ");
}

export async function isSpeakingNow(): Promise<boolean> {
  try {
    return await Speech.isSpeakingAsync();
  } catch {
    return false;
  }
}
