import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Level = "low" | "medium" | "high" | string;

const MAP: Record<string, { bg: string; fg: string; label: string }> = {
  low: { bg: colors.mintTint, fg: colors.mint, label: "Low" },
  medium: { bg: "#FFF4D6", fg: "#C98910", label: "Medium" },
  high: { bg: colors.coralTint, fg: colors.coralText, label: "High" },
};

export default function RiskBadge({ level }: { level: Level }) {
  const key = String(level || "low").toLowerCase();
  const cfg = MAP[key] ?? MAP.low;
  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
      <View style={[styles.dot, { backgroundColor: cfg.fg }]} />
      <Text style={[styles.text, { color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: { fontFamily: fonts.bold, fontSize: 12 },
});
