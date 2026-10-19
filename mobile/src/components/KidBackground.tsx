// KidBackground.tsx - soft decorative background (gradient, blobs, floating animal icons) for the
// children's activity screens. Each screen picks a `variant`; it never blocks touches.
import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// Which screen theme to use (one per module plus home, therapy and celebration).
export type KidBackgroundVariant =
  | "speech"
  | "handwriting"
  | "behavior"
  | "home"
  | "therapy"
  | "celebration";

type Props = {
  variant: KidBackgroundVariant;
};

/** Ionicons' only real animal glyphs — everything else is a UI icon, not a creature. */
const ANIMAL_ICONS = ["paw", "fish", "bug"] as const;

// Colour scene per variant: `colors` = 3-stop background gradient (very light pastels),
// `accent` = main decoration colour, `soft` = second decoration colour, `icons` = which animals float.
const SCENES: Record<
  KidBackgroundVariant,
  {
    colors: readonly [string, string, ...string[]];
    accent: string;
    soft: string;
    icons: [typeof ANIMAL_ICONS[number], typeof ANIMAL_ICONS[number], typeof ANIMAL_ICONS[number]];
  }
> = {
  speech: {
    colors: ["#EEF7FF", "#F7F4FF", "#FFF8E8"],
    accent: "#60A5FA",
    soft: "#C4B5FD",
    icons: ["fish", "bug", "paw"],
  },
  handwriting: {
    colors: ["#FFF9E8", "#FFF4F1", "#F3F0FF"],
    accent: "#F59E0B",
    soft: "#A78BFA",
    icons: ["bug", "paw", "fish"],
  },
  behavior: {
    colors: ["#ECFEFF", "#F0FDF4", "#FFF9E8"],
    accent: "#14B8A6",
    soft: "#FBBF24",
    icons: ["paw", "fish", "bug"],
  },
  home: {
    colors: ["#EEF7FF", "#FFF9E8", "#F5F3FF"],
    accent: "#3B82F6",
    soft: "#F59E0B",
    icons: ["paw", "bug", "fish"],
  },
  therapy: {
    colors: ["#F5F3FF", "#EEF7FF", "#ECFDF5"],
    accent: "#8B5CF6",
    soft: "#34D399",
    icons: ["fish", "paw", "bug"],
  },
  celebration: {
    colors: ["#FFF7ED", "#F5F3FF", "#ECFEFF"],
    accent: "#F59E0B",
    soft: "#EC4899",
    icons: ["paw", "bug", "fish"],
  },
};

// Settings for one floating icon (animation timing and sway are staggered).
type FloatingAnimalProps = {
  icon: typeof ANIMAL_ICONS[number];
  size: number;
  color: string;
  borderColor: string;
  style: any;
  innerStyle: any;
  /** Stagger + speed so the three creatures don't move in lockstep. */
  delay: number;
  duration: number;
  bounceHeight: number;
  baseRotateDeg: number;
  swayDeg: number;
};

// A faint icon in a rounded bubble that bobs up and down and sways, looping forever.
function FloatingAnimal({
  icon, size, color, borderColor, style, innerStyle, delay, duration, bounceHeight, baseRotateDeg, swayDeg,
}: FloatingAnimalProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1, duration, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progress, duration, delay]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -bounceHeight] });
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [`${baseRotateDeg - swayDeg}deg`, `${baseRotateDeg + swayDeg}deg`],
  });

  return (
    <Animated.View style={[style, { transform: [{ translateY }, { rotate }] }]}>
      <View style={[styles.iconBubbleInner, innerStyle, { borderColor }]}>
        <Ionicons name={icon} size={size} color={color} />
      </View>
    </Animated.View>
  );
}

/**
 * A decorative, non-interactive layer for children's activity screens.
 * It is deliberately subtle so cards and assessment content stay readable,
 * and pointerEvents="none" guarantees it never changes the existing flow.
 * The three floating creatures gently bob and sway on independent loops.
 */
export default function KidBackground({ variant }: Props) {
  const scene = SCENES[variant];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={scene.colors as [string, string, ...string[]]}
        locations={[0, 0.56, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.orb, styles.orbTop, { backgroundColor: scene.accent }]} />
      <View style={[styles.orb, styles.orbBottom, { backgroundColor: scene.soft }]} />

      <FloatingAnimal
        icon={scene.icons[0]} size={28} color={scene.accent} borderColor={scene.accent}
        style={[styles.iconBubble, styles.iconTop]} innerStyle={styles.iconTopInner}
        delay={0} duration={2200} bounceHeight={10} baseRotateDeg={11} swayDeg={6}
      />
      <FloatingAnimal
        icon={scene.icons[1]} size={22} color={scene.soft} borderColor={scene.soft}
        style={[styles.iconBubble, styles.iconMiddle]} innerStyle={styles.iconMiddleInner}
        delay={350} duration={2600} bounceHeight={8} baseRotateDeg={-12} swayDeg={8}
      />
      <FloatingAnimal
        icon={scene.icons[2]} size={20} color={scene.accent} borderColor={scene.accent}
        style={[styles.iconBubble, styles.iconBottom]} innerStyle={styles.iconBottomInner}
        delay={700} duration={1900} bounceHeight={12} baseRotateDeg={8} swayDeg={5}
      />

      <View style={styles.dotRowTop}>
        <View style={[styles.dot, { backgroundColor: scene.soft }]} />
        <View style={[styles.dotSmall, { backgroundColor: scene.accent }]} />
        <View style={[styles.dot, { backgroundColor: scene.soft }]} />
      </View>
      <View style={styles.dotRowBottom}>
        <View style={[styles.dotSmall, { backgroundColor: scene.accent }]} />
        <View style={[styles.dot, { backgroundColor: scene.soft }]} />
      </View>
    </View>
  );
}

// Layout of the faint blobs (orbs), icon bubbles and dot rows; low opacity keeps content readable.
const styles = StyleSheet.create({
  orb: {
    position: "absolute",
    opacity: 0.1,
  },
  orbTop: {
    width: 230,
    height: 230,
    borderRadius: 115,
    top: -95,
    right: -85,
  },
  orbBottom: {
    width: 300,
    height: 300,
    borderRadius: 150,
    bottom: -165,
    left: -135,
  },
  iconBubble: {
    position: "absolute",
  },
  iconBubbleInner: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.48)",
    borderWidth: 1.5,
    opacity: 0.2,
  },
  iconTop: {
    width: 64,
    height: 64,
    top: 118,
    right: -16,
  },
  iconTopInner: { borderRadius: 24 },
  iconMiddle: {
    width: 52,
    height: 52,
    top: "46%",
    left: -14,
  },
  iconMiddleInner: { borderRadius: 20 },
  iconBottom: {
    width: 48,
    height: 48,
    bottom: 92,
    right: -10,
  },
  iconBottomInner: { borderRadius: 18 },
  dotRowTop: {
    position: "absolute",
    top: 210,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    opacity: 0.18,
  },
  dotRowBottom: {
    position: "absolute",
    right: 28,
    bottom: 180,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    opacity: 0.18,
  },
  dot: { width: 9, height: 9, borderRadius: 5 },
  dotSmall: { width: 6, height: 6, borderRadius: 3 },
});
