import React from "react";
import {
  ActivityIndicator,
  ColorValue,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";
import { clayBrand } from "../../theme/shadows";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  colors?: [ColorValue, ColorValue];
};

export default function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  style,
  colors: grad = [colors.brandLight, colors.brand],
}: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.wrap, clayBrand(), (disabled || loading) && styles.disabled, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <LinearGradient colors={grad} style={styles.grad} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.label}>{label}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 22, overflow: "hidden" },
  grad: { paddingVertical: 19, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", minHeight: 58 },
  label: { color: "#fff", fontFamily: fonts.bold, fontSize: 17 },
  disabled: { opacity: 0.55 },
});
