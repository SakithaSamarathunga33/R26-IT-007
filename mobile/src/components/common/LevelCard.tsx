import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";
import { clayBrand, clayRaised } from "../../theme/shadows";
import StarProgress from "./StarProgress";

type Props = {
  index: number;
  title: string;
  subtitle?: string;
  stars?: number;
  state: "done" | "current" | "locked";
  onPress?: () => void;
  accent?: [string, string];
};

export default function LevelCard({
  index,
  title,
  subtitle,
  stars = 0,
  state,
  onPress,
  accent = [colors.brandLight, colors.brand],
}: Props) {
  const current = state === "current";
  const locked = state === "locked";

  return (
    <TouchableOpacity
      activeOpacity={locked ? 1 : 0.88}
      disabled={locked}
      onPress={onPress}
      style={[
        styles.card,
        current ? clayBrand() : locked ? styles.locked : clayRaised("md"),
        current && styles.currentWrap,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: locked }}
      accessibilityLabel={`Level ${index}, ${title}, ${state}`}
    >
      {current ? (
        <LinearGradient colors={accent} style={styles.currentInner} start={{ x: 0.1, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.currentBadge}>
            <Text style={styles.currentNum}>{index}</Text>
          </View>
          <View style={styles.copy}>
            <Text style={styles.currentTitle}>{title}</Text>
            {subtitle ? <Text style={styles.currentSub}>{subtitle}</Text> : null}
          </View>
          <View style={styles.play}>
            <Text style={styles.playText}>Play</Text>
          </View>
        </LinearGradient>
      ) : (
        <>
          <View style={[styles.badge, locked && styles.badgeLocked, state === "done" && styles.badgeDone]}>
            {locked ? (
              <Ionicons name="lock-closed" size={18} color={colors.textInactive} />
            ) : (
              <Text style={[styles.num, state === "done" && styles.numDone]}>{index}</Text>
            )}
          </View>
          <View style={styles.copy}>
            <Text style={[styles.title, locked && styles.titleLocked]}>{title}</Text>
            {state === "done" ? <StarProgress filled={stars || 3} /> : subtitle ? (
              <Text style={styles.sub}>{subtitle}</Text>
            ) : null}
          </View>
          {state === "done" ? (
            <View style={styles.check}>
              <Ionicons name="checkmark" size={16} color="#fff" />
            </View>
          ) : null}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSoft,
    borderRadius: 22,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 15,
  },
  currentWrap: { padding: 0, backgroundColor: "transparent" },
  currentInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    padding: 20,
    borderRadius: 24,
  },
  locked: { backgroundColor: colors.bgLocked, opacity: 0.78 },
  badge: {
    width: 54,
    height: 54,
    borderRadius: 19,
    backgroundColor: colors.mintTint,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeDone: { backgroundColor: colors.mintTint },
  badgeLocked: { backgroundColor: colors.bgDeep },
  num: { fontFamily: fonts.extraBold, fontSize: 20, color: colors.mint },
  numDone: { color: colors.mint },
  currentBadge: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  currentNum: { fontFamily: fonts.extraBold, fontSize: 22, color: "#fff" },
  copy: { flex: 1 },
  title: { fontFamily: fonts.extraBold, fontSize: 16, color: colors.text },
  titleLocked: { color: colors.textLocked },
  sub: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  currentTitle: { fontFamily: fonts.extraBold, fontSize: 18, color: "#fff" },
  currentSub: { fontFamily: fonts.semiBold, fontSize: 12.5, color: "#D7E9FF", marginTop: 3 },
  play: { backgroundColor: "#fff", paddingHorizontal: 15, paddingVertical: 9, borderRadius: 14 },
  playText: { fontFamily: fonts.extraBold, fontSize: 13, color: colors.brand },
  check: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
  },
});
