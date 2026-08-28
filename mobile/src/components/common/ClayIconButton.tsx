import React from "react";
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";
import { clayRaised } from "../../theme/shadows";

type Props = {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  glyph?: string;
  color?: string;
  style?: ViewStyle;
  accessibilityLabel: string;
};

export default function ClayIconButton({
  onPress,
  icon,
  glyph,
  color = colors.brand,
  style,
  accessibilityLabel,
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.btn, clayRaised("sm"), style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      {icon ? (
        <Ionicons name={icon} size={20} color={color} />
      ) : (
        <Text style={[styles.glyph, { color }]}>{glyph}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.bgSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  glyph: { fontFamily: fonts.extraBold, fontSize: 18, marginTop: -2 },
});
