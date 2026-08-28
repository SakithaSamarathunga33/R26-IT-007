import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";
import { clayRaised } from "../../theme/shadows";

type Props = {
  onPress: () => void;
  label?: string;
  color?: string;
};

export default function TTSButton({ onPress, label = "Hear it again", color = colors.brand }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.btn, clayRaised("sm")]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name="volume-high" size={18} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.bgSoft,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  label: { fontFamily: fonts.bold, fontSize: 14, color: colors.brand },
});
