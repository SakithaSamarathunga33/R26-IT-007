import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../theme/colors";

type Props = {
  active?: boolean;
  bars?: number;
  height?: number;
  barWidth?: number;
  colors?: [string, string];
  style?: ViewStyle;
};

export default function AudioWaveform({
  active = false,
  bars = 15,
  height = 120,
  barWidth = 7,
  colors: grad = ["#7FBCFF", colors.brand],
  style,
}: Props) {
  const anims = useRef(Array.from({ length: bars }, () => new Animated.Value(0.28))).current;

  useEffect(() => {
    if (!active) {
      anims.forEach((a) => a.stopAnimation());
      anims.forEach((a) => a.setValue(0.28));
      return;
    }
    const loops = anims.map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 0.22 + ((i * 17) % 78) / 100,
            duration: 320 + (i % 5) * 70,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(value, {
            toValue: 0.18 + ((i * 11) % 40) / 100,
            duration: 280 + (i % 4) * 60,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      )
    );
    loops.forEach((loop, i) => setTimeout(() => loop.start(), i * 70));
    return () => loops.forEach((loop) => loop.stop());
  }, [active, anims]);

  return (
    <View style={[styles.row, { height }, style]} accessibilityElementsHidden>
      {anims.map((value, i) => (
        <Animated.View key={i} style={{ height: value.interpolate({ inputRange: [0, 1], outputRange: [8, height] }), width: barWidth }}>
          <LinearGradient colors={grad} style={styles.bar} />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  bar: { flex: 1, borderRadius: 4 },
});
