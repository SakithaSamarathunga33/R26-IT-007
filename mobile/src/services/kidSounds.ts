import { Audio, AVPlaybackStatus } from "expo-av";

export type KidSound = "tap" | "next" | "success";

const SOUND_FILES = {
  tap: require("../assets/sounds/tap.wav"),
  next: require("../assets/sounds/next.wav"),
  success: require("../assets/sounds/success.wav"),
} as const;

const VOLUME: Record<KidSound, number> = {
  tap: 0.28,
  next: 0.34,
  success: 0.4,
};

let lastPlayedAt = 0;

/**
 * Plays a short, gentle cue without blocking navigation or task submission.
 * Audio failures are intentionally ignored so sound can never stop a child
 * from continuing an assessment.
 */
export async function playKidSound(kind: KidSound): Promise<void> {
  const now = Date.now();
  if (kind === "tap" && now - lastPlayedAt < 90) return;
  lastPlayedAt = now;

  try {
    const { sound } = await Audio.Sound.createAsync(SOUND_FILES[kind], {
      shouldPlay: true,
      volume: VOLUME[kind],
    });

    sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
      }
    });
  } catch {
    // Sound is an enhancement only; keep every existing interaction working.
  }
}

export const playTapSound = () => playKidSound("tap");
export const playNextSound = () => playKidSound("next");
export const playSuccessSound = () => playKidSound("success");
