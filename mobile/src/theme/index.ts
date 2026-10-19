// theme/index.ts - shared design tokens (colours, fonts, corner radius, font sizes).
// Imported by almost every screen and component so the app looks consistent.
// Light theme. NOTE: colour names like `white` are historical - they now hold dark text colours.
export const theme = {
  // Colour palette used across the app.
  colors: {
    // Page background gradient, from lightest (top) to slightly deeper blue (bottom).
    // Backgrounds — clean white/light grey
    gradientStart: "#F8FAFF",
    gradientMid: "#EEF3FF",
    gradientEnd: "#E4EDFF",

    // Main brand blue for buttons, links and highlights; accentGlow is a soft blue tint for glows/shadows.
    // Accent — keep the same blue
    accent: "#2D8EFF",
    accentLight: "#2D8EFF",
    accentGlow: "rgba(45,142,255,0.10)",

    // Text and overlay colours: `white` = main dark text, whiteMid = grey secondary text,
    // whiteStrong = darker bold text, whiteFaint/whiteSoft = very light dark tints for dividers and overlays.
    // Text
    white: "#0F172A",           // main text (dark on light)
    whiteFaint: "rgba(15,23,42,0.05)",
    whiteSoft: "rgba(15,23,42,0.10)",
    whiteMid: "#64748B",        // secondary text
    whiteStrong: "#1E293B",     // strong text

    // Text input box: fill, normal border, and border when focused (brand blue).
    // Inputs
    inputBg: "#F1F5F9",
    inputBorder: "#CBD5E1",
    inputBorderFocus: "#2D8EFF",

    // White card background and its light grey border.
    // Cards
    cardBg: "#FFFFFF",
    cardBorder: "#E2E8F0",

    // Red for error messages and wrong answers.
    error: "#EF4444",
  },
  // Outfit font family names (loaded in App.tsx).
  fonts: {
    regular: "Outfit_400Regular",
    medium: "Outfit_500Medium",
    semiBold: "Outfit_600SemiBold",
    bold: "Outfit_700Bold",
    extraBold: "Outfit_800ExtraBold",
  },
  // Corner roundness presets, small to extra large.
  radius: {
    sm: 10,
    md: 16,
    lg: 22,
    xl: 30,
  },
  // Font size presets in points, extra small to 42.
  font: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
    xxxl: 42,
  },
};
