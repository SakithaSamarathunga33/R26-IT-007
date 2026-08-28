import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";
import ClayIconButton from "./ClayIconButton";
import ProgressTrack from "./ProgressTrack";

type Props = {
  current: number;
  total: number;
  onBack: () => void;
  accent?: [string, string];
  dark?: boolean;
};

export default function ActivityProgressHeader({
  current,
  total,
  onBack,
  accent,
  dark,
}: Props) {
  return (
    <View style={styles.row}>
      <ClayIconButton
        glyph="‹"
        onPress={onBack}
        color={dark ? "#EAF1FB" : colors.brand}
        accessibilityLabel="Go back"
        style={dark ? styles.darkBack : undefined}
      />
      <ProgressTrack progress={total > 0 ? current / total : 0} colors={accent} dark={dark} />
      <Text style={[styles.count, dark && styles.countDark]}>
        {current} / {total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  count: { fontFamily: fonts.extraBold, fontSize: 13, color: colors.textBody, minWidth: 42, textAlign: "right" },
  countDark: { color: "#EAF1FB" },
  darkBack: { backgroundColor: "rgba(255,255,255,0.1)", shadowOpacity: 0, elevation: 0 },
});
