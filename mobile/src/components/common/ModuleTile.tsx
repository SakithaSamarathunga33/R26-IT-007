import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";
import { clayRaised } from "../../theme/shadows";

type Status = "play" | "done" | "locked";

type Props = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  status: Status;
  onPress?: () => void;
};

export default function ModuleTile({ title, subtitle, icon, gradient, status, onPress }: Props) {
  const locked = status === "locked";

  return (
    <TouchableOpacity
      activeOpacity={locked ? 1 : 0.85}
      disabled={locked}
      onPress={onPress}
      style={[styles.card, locked ? styles.locked : clayRaised("md")]}
      accessibilityRole="button"
      accessibilityState={{ disabled: locked }}
      accessibilityLabel={`${title}. ${subtitle}. ${status}`}
    >
      <View
        style={[
          styles.icon,
          locked ? styles.iconLocked : null,
        ]}
      >
        {locked ? (
          <Ionicons name="lock-closed" size={20} color={colors.textInactive} />
        ) : (
          <LinearGradient colors={gradient} style={styles.iconGrad}>
            <Ionicons name={icon} size={22} color="#fff" />
          </LinearGradient>
        )}
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, locked && styles.titleLocked]}>{title}</Text>
        <Text style={[styles.sub, locked && styles.subLocked]}>{subtitle}</Text>
      </View>
      {status === "done" ? (
        <View style={styles.donePill}>
          <Text style={styles.doneText}>Done</Text>
        </View>
      ) : status === "play" ? (
        <View style={styles.playPill}>
          <Text style={styles.playText}>Play</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSoft,
    borderRadius: 22,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  locked: {
    backgroundColor: colors.bgLocked,
    opacity: 0.86,
  },
  icon: { width: 52, height: 52, borderRadius: 18, overflow: "hidden" },
  iconGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  iconLocked: {
    backgroundColor: colors.bgDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1 },
  title: { fontFamily: fonts.extraBold, fontSize: 16, color: colors.text },
  titleLocked: { color: colors.textLocked },
  sub: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.textSecondary, marginTop: 2 },
  subLocked: { color: colors.textMuted },
  donePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 11,
    backgroundColor: colors.mintTint,
  },
  doneText: { fontFamily: fonts.bold, fontSize: 11, color: colors.mint },
  playPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 11,
    backgroundColor: colors.brand,
  },
  playText: { fontFamily: fonts.bold, fontSize: 11, color: "#fff" },
});
