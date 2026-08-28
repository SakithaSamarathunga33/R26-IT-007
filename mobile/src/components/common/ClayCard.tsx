import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "../../theme/colors";
import { clayRaised } from "../../theme/shadows";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  inset?: boolean;
  radius?: number;
};

export default function ClayCard({ children, style, inset, radius = 22 }: Props) {
  return (
    <View
      style={[
        styles.card,
        { borderRadius: radius },
        inset ? styles.inset : clayRaised("md"),
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSoft,
    padding: 16,
  },
  inset: {
    backgroundColor: colors.bgLocked,
    opacity: 0.92,
  },
});
