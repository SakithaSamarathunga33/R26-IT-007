import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";
import ClayIconButton from "./ClayIconButton";

type Props = {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  onClose?: () => void;
  right?: React.ReactNode;
};

export default function ActivityHeader({ title, subtitle, onBack, onClose, right }: Props) {
  return (
    <View style={styles.row}>
      {onBack ? (
        <ClayIconButton glyph="‹" onPress={onBack} accessibilityLabel="Go back" />
      ) : (
        <View style={styles.spacer} />
      )}
      <View style={styles.center}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      {right ? (
        right
      ) : onClose ? (
        <ClayIconButton glyph="✕" color={colors.textMuted} onPress={onClose} accessibilityLabel="Exit activity" />
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  center: { flex: 1, alignItems: "center" },
  title: { fontFamily: fonts.extraBold, fontSize: 15, color: colors.text },
  sub: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  spacer: { width: 44, height: 44 },
});
