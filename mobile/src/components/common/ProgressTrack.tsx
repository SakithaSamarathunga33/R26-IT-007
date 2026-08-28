import React from "react";
import { ColorValue, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../theme/colors";

type Props = {
  progress: number;
  colors?: [ColorValue, ColorValue];
  dark?: boolean;
};

export default function ProgressTrack({
  progress,
  colors: grad = [colors.brandSoft, colors.brand],
  dark,
}: Props) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <View style={[styles.track, dark && styles.trackDark]}>
      <LinearGradient
        colors={dark ? ["#7FBCFF", "#5AA6FF"] : grad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fill, { width: `${pct}%` }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.bgDeep,
    overflow: "hidden",
  },
  trackDark: { backgroundColor: "rgba(255,255,255,0.14)" },
  fill: { height: "100%", borderRadius: 6 },
});
