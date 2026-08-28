import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";
import { clayRaised } from "../../theme/shadows";

type MascotState = "idle" | "waving" | "listening" | "happy" | "celebrating" | "crayon" | "sorting";

type Props = {
  state?: MascotState;
  size?: number;
  label?: string;
  tint?: string;
  style?: ViewStyle;
};

const ICONS: Record<MascotState, keyof typeof Ionicons.glyphMap> = {
  idle: "happy-outline",
  waving: "hand-left-outline",
  listening: "ear-outline",
  happy: "happy",
  celebrating: "sparkles",
  crayon: "pencil-outline",
  sorting: "grid-outline",
};

export default function MascotGuide({
  state = "idle",
  size = 158,
  label,
  tint = "#D3E3F9",
  style,
}: Props) {
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: tint }, clayRaised("lg"), style]}>
      <Ionicons name={ICONS[state]} size={Math.round(size * 0.32)} color={colors.brand} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  label: {
    marginTop: 6,
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.textMuted,
  },
});
