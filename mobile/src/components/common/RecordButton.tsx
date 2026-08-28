import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { clayBrand } from "../../theme/shadows";

type Props = {
  recording?: boolean;
  onPress: () => void;
  size?: number;
};

export default function RecordButton({ recording, onPress, size = 96 }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.outer,
        { width: size, height: size, borderRadius: size / 2 },
        clayBrand(),
        recording && styles.recording,
      ]}
      accessibilityRole="button"
      accessibilityLabel={recording ? "Stop recording" : "Start recording"}
    >
      <View style={[styles.inner, recording && styles.innerRec]}>
        {recording ? (
          <View style={styles.stop} />
        ) : (
          <Ionicons name="mic" size={Math.round(size * 0.36)} color="#fff" />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  recording: { backgroundColor: colors.coral },
  inner: { alignItems: "center", justifyContent: "center" },
  innerRec: {},
  stop: { width: 22, height: 22, borderRadius: 5, backgroundColor: "#fff" },
});
