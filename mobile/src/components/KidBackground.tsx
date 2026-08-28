import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

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

const SCENES: Record<
  KidBackgroundVariant,
  {
    colors: readonly [string, string, ...string[]];
    accent: string;
    soft: string;
    icons: [string, string, string];
  }
> = {
  speech: {
    colors: ["#EEF7FF", "#F7F4FF", "#FFF8E8"],
    accent: "#60A5FA",
    soft: "#C4B5FD",
    icons: ["musical-notes", "mic", "chatbubble-ellipses"],
  },
  handwriting: {
    colors: ["#FFF9E8", "#FFF4F1", "#F3F0FF"],
    accent: "#F59E0B",
    soft: "#A78BFA",
    icons: ["pencil", "color-palette", "book"],
  },
  behavior: {
    colors: ["#ECFEFF", "#F0FDF4", "#FFF9E8"],
    accent: "#14B8A6",
    soft: "#FBBF24",
    icons: ["extension-puzzle", "happy", "star"],
  },
  home: {
    colors: ["#EEF7FF", "#FFF9E8", "#F5F3FF"],
    accent: "#3B82F6",
    soft: "#F59E0B",
    icons: ["sparkles", "book", "rocket"],
  },
  therapy: {
    colors: ["#F5F3FF", "#EEF7FF", "#ECFDF5"],
    accent: "#8B5CF6",
    soft: "#34D399",
    icons: ["sparkles", "heart", "rocket"],
  },
  celebration: {
    colors: ["#FFF7ED", "#F5F3FF", "#ECFEFF"],
    accent: "#F59E0B",
    soft: "#EC4899",
    icons: ["trophy", "star", "sparkles"],
  },
};

/**
 * A decorative, non-interactive layer for children's activity screens.
 * It is deliberately subtle so cards and assessment content stay readable,
 * and pointerEvents="none" guarantees it never changes the existing flow.
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

      <View style={[styles.iconBubble, styles.iconTop, { borderColor: scene.accent }]}>
        <Ionicons name={scene.icons[0] as any} size={28} color={scene.accent} />
      </View>
      <View style={[styles.iconBubble, styles.iconMiddle, { borderColor: scene.soft }]}>
        <Ionicons name={scene.icons[1] as any} size={22} color={scene.soft} />
      </View>
      <View style={[styles.iconBubble, styles.iconBottom, { borderColor: scene.accent }]}>
        <Ionicons name={scene.icons[2] as any} size={20} color={scene.accent} />
      </View>

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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.48)",
    borderWidth: 1.5,
    opacity: 0.2,
  },
  iconTop: {
    width: 64,
    height: 64,
    borderRadius: 24,
    top: 118,
    right: -16,
    transform: [{ rotate: "11deg" }],
  },
  iconMiddle: {
    width: 52,
    height: 52,
    borderRadius: 20,
    top: "46%",
    left: -14,
    transform: [{ rotate: "-12deg" }],
  },
  iconBottom: {
    width: 48,
    height: 48,
    borderRadius: 18,
    bottom: 92,
    right: -10,
    transform: [{ rotate: "8deg" }],
  },
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
