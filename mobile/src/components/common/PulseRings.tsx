import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { colors } from "../../theme/colors";

type Props = {
  active?: boolean;
  size?: number;
  color?: string;
  children: React.ReactNode;
};

export default function PulseRings({ active = false, size = 220, color = colors.brand, children }: Props) {
  const rings = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!active) {
      rings.forEach((r) => {
        r.stopAnimation();
        r.setValue(0);
      });
      return;
    }
    const loops = rings.map((value, i) =>
      Animated.loop(
        Animated.timing(value, {
          toValue: 1,
          duration: 2400,
          delay: i * 800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      )
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [active, rings]);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {rings.map((value, i) => (
        <Animated.View
          key={i}
          style={[
            styles.ring,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: color,
              opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
              transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }],
            },
          ]}
        />
      ))}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: "absolute",
    borderWidth: 3,
  },
});
