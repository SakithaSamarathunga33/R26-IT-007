import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";

type Chip = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  bg: string;
  border: string;
};

type Props = {
  chips: [Chip, Chip, Chip];
};

/** Duolingo-style row of three bordered stat chips, e.g. Score / Done / Level. */
export default function StatChipRow({ chips }: Props) {
  return (
    <View style={styles.row}>
      {chips.map((chip, i) => (
        <View key={i} style={[styles.chip, { backgroundColor: chip.bg, borderColor: chip.border }]}>
          <Text style={styles.label}>{chip.label}</Text>
          <View style={styles.valueRow}>
            <Ionicons name={chip.icon} size={16} color={chip.color} />
            <Text style={[styles.value, { color: chip.color }]}>{chip.value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10, width: "100%", marginBottom: 12 },
  chip: {
    flex: 1, borderRadius: 16, borderWidth: 1.5, paddingVertical: 10, paddingHorizontal: 8,
    alignItems: "center", gap: 6,
  },
  label: { fontSize: 10, fontFamily: theme.fonts.bold, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.6 },
  valueRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  value: { fontSize: 16, fontFamily: theme.fonts.extraBold },
});
