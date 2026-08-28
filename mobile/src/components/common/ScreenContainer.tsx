import React from "react";
import { ColorValue, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";
import { layout } from "../../theme/spacing";
import { useResponsive } from "../../hooks/useResponsive";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  backgroundColor?: ColorValue;
  edges?: Array<"top" | "bottom" | "left" | "right">;
  padded?: boolean;
  maxWidth?: number;
};

export default function ScreenContainer({
  children,
  style,
  contentStyle,
  backgroundColor = colors.bg,
  edges = ["top", "left", "right"],
  padded = true,
  maxWidth,
}: Props) {
  const { isTablet, padH } = useResponsive();
  const cap = maxWidth ?? (isTablet ? layout.contentMax : undefined);

  return (
    <SafeAreaView edges={edges} style={[styles.safe, { backgroundColor }, style]}>
      <View
        style={[
          styles.content,
          padded && { paddingHorizontal: padH },
          cap ? { maxWidth: cap, width: "100%", alignSelf: "center" } : null,
          contentStyle,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1 },
});
