import { Platform, ViewStyle } from "react-native";
import { colors } from "./colors";

export const clayRaised = (intensity: "sm" | "md" | "lg" = "md"): ViewStyle => {
  const map = {
    sm: { offset: 4, radius: 10, elevation: 4, opacity: 0.4 },
    md: { offset: 6, radius: 15, elevation: 6, opacity: 0.42 },
    lg: { offset: 10, radius: 22, elevation: 10, opacity: 0.45 },
  }[intensity];

  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: map.offset * 0.4, height: map.offset },
      shadowOpacity: map.opacity,
      shadowRadius: map.radius,
    },
    android: {
      elevation: map.elevation,
      shadowColor: colors.shadow,
    },
    default: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: map.offset },
      shadowOpacity: map.opacity,
      shadowRadius: map.radius,
      elevation: map.elevation,
    },
  })!;
};

export const clayBrand = (): ViewStyle =>
  Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.brand,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
    },
    android: {
      elevation: 10,
      shadowColor: colors.brand,
    },
    default: {
      shadowColor: colors.brand,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    },
  })!;

export const clayCoral = (): ViewStyle =>
  Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.coral,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 18,
    },
    android: {
      elevation: 8,
      shadowColor: colors.coral,
    },
    default: {
      shadowColor: colors.coral,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 18,
      elevation: 8,
    },
  })!;
