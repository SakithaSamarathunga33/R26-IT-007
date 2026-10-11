import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, TextStyle, StyleProp } from "react-native";

type Props = {
  value: number;
  style?: StyleProp<TextStyle>;
  duration?: number;
  delay?: number;
};

/** Counts a number up from 0 to `value` — used for score reveals. */
export default function AnimatedScore({ value, style, duration = 900, delay = 200 }: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    Animated.timing(anim, {
      toValue: value,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [value]);

  return <Text style={style}>{display}</Text>;
}
