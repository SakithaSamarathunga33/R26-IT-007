import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Props = {
  progress: number;
  size?: number;
  stroke?: number;
  label?: string;
  value?: string;
};

export default function ProgressRing({
  progress,
  size = 72,
  stroke = 8,
  label = "done",
  value,
}: Props) {
  const pct = Math.max(0, Math.min(1, progress));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const shown = value ?? `${Math.round(pct * 100)}%`;

  return (
    <View style={{ width: size, height: size }} accessibilityLabel={`${shown} ${label}`}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.bgDeep}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.brand}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.inner}>
        <Text style={styles.value}>{shown}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  value: { fontFamily: fonts.extraBold, fontSize: 17, color: colors.text, lineHeight: 20 },
  label: { fontFamily: fonts.semiBold, fontSize: 8.5, color: colors.textMuted },
});
