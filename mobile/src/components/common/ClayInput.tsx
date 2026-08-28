import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Props = TextInputProps & {
  label: string;
  error?: string;
  trailing?: React.ReactNode;
  onTrailingPress?: () => void;
  trailingLabel?: string;
};

export default function ClayInput({
  label,
  error,
  trailing,
  onTrailingPress,
  trailingLabel,
  style,
  onFocus,
  onBlur,
  ...inputProps
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, error && styles.fieldError, focused && styles.fieldFocus]}>
        <TextInput
          {...inputProps}
          style={[styles.input, style]}
          placeholderTextColor={colors.textMuted}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {trailingLabel ? (
          <TouchableOpacity onPress={onTrailingPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.trailing}>{trailingLabel}</Text>
          </TouchableOpacity>
        ) : (
          trailing
        )}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <View style={styles.errorDot}>
            <Text style={styles.errorBang}>!</Text>
          </View>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  label: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.textLabel,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgInset,
    borderRadius: 18,
    paddingHorizontal: 18,
    minHeight: 56,
    borderWidth: 2,
    borderColor: "transparent",
  },
  fieldFocus: { borderColor: "rgba(45,142,255,0.45)" },
  fieldError: {
    backgroundColor: colors.coralTint,
    borderColor: "rgba(255,122,107,0.6)",
  },
  input: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 14,
  },
  trailing: { fontFamily: fonts.bold, fontSize: 13, color: colors.brand },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 2 },
  errorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.coral,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBang: { color: "#fff", fontFamily: fonts.extraBold, fontSize: 11 },
  errorText: { fontFamily: fonts.semiBold, fontSize: 12.5, color: colors.errorText, flex: 1 },
});
