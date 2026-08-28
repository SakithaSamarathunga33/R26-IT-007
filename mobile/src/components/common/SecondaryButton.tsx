import React from "react";
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";
import { clayRaised } from "../../theme/shadows";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textColor?: string;
};

export default function SecondaryButton({
  label,
  onPress,
  disabled,
  style,
  textColor = colors.brand,
}: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[styles.btn, clayRaised("md"), disabled && styles.disabled, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.bgSoft,
    borderRadius: 22,
    paddingVertical: 19,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 58,
  },
  label: { fontFamily: fonts.bold, fontSize: 17 },
  disabled: { opacity: 0.55 },
});
