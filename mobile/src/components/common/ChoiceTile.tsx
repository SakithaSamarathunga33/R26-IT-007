import React from "react";
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";
import { clayRaised } from "../../theme/shadows";

type Props = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  style?: ViewStyle;
};

export default function ChoiceTile({ label, selected, onPress, style }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.tile,
        selected ? styles.selected : clayRaised("sm"),
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 88,
    borderRadius: 20,
    backgroundColor: colors.bgSoft,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  selected: {
    backgroundColor: "#E2E9F3",
    transform: [{ scale: 0.965 }],
    shadowOpacity: 0,
    elevation: 0,
  },
  label: { fontFamily: fonts.extraBold, fontSize: 16, color: colors.text, textAlign: "center" },
  labelSelected: { color: colors.textBody },
});
