import React, { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type ToastType = "error" | "success" | "warning";

type Props = {
  visible: boolean;
  message: string;
  type?: ToastType;
  onHide: () => void;
};

const CONFIG: Record<ToastType, { bg: string; icon: string; color: string }> = {
  error:   { bg: "#FEF2F2", icon: "close-circle",     color: "#EF4444" },
  success: { bg: "#F0FDF4", icon: "checkmark-circle",  color: "#22C55E" },
  warning: { bg: "#FFFBEB", icon: "warning",            color: "#F59E0B" },
};

export default function Toast({ visible, message, type = "error", onHide }: Props) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 15 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, { toValue: -100, duration: 250, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(() => onHide());
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  const { bg, icon, color } = CONFIG[type];

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }], opacity }]}>
      <View style={[styles.toast, { backgroundColor: bg, borderLeftColor: color }]}>
        <Ionicons name={icon as any} size={20} color={color} />
        <Text style={[styles.message, { color }]}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    zIndex: 999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
    lineHeight: 20,
  },
});
