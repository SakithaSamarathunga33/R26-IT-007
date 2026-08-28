import { colors, moduleColors } from "./colors";
import { fonts, fontSize } from "./typography";
import { layout, radius, spacing } from "./spacing";
import { clayBrand, clayCoral, clayRaised } from "./shadows";

export const theme = {
  colors: {
    ...colors,
    // Backward-compatible aliases used by older screens
    gradientStart: colors.bg,
    gradientMid: colors.bgSoft,
    gradientEnd: colors.bgDeep,
    accent: colors.brand,
    accentLight: colors.brandLight,
    accentGlow: "rgba(45,142,255,0.10)",
    white: colors.text,
    whiteFaint: "rgba(30,42,58,0.05)",
    whiteSoft: "rgba(30,42,58,0.10)",
    whiteMid: colors.textSecondary,
    whiteStrong: colors.text,
    inputBg: colors.bgInset,
    inputBorder: colors.bgDeep,
    inputBorderFocus: colors.brand,
    cardBg: colors.bgSoft,
    cardBorder: colors.bgDeep,
    error: colors.error,
  },
  fonts,
  font: fontSize,
  radius,
  spacing,
  layout,
  moduleColors,
  shadows: { clayRaised, clayBrand, clayCoral },
};

export type Theme = typeof theme;
