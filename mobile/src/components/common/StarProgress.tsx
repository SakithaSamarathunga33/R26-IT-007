import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Props = {
  total?: number;
  filled?: number;
  size?: number;
  emptyColor?: string;
};

export default function StarProgress({ total = 3, filled = 0, size = 21, emptyColor = colors.bgDeep }: Props) {
  return (
    <View style={styles.row} accessibilityRole="image" accessibilityLabel={`${filled} of ${total} stars`}>
      {Array.from({ length: total }).map((_, i) => (
        <Text key={i} style={[styles.star, { fontSize: size, color: i < filled ? colors.gold : emptyColor }]}>
          ★
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 7, alignItems: "flex-end" },
  star: { fontFamily: fonts.extraBold },
});
