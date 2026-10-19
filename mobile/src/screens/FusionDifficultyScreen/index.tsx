/**
 * FusionDifficultyScreen
 * Explains WHICH area the child seems to struggle with most (speech sounds, handwriting or attention/behaviour),
 * plus a secondary area, module score bars and key feature signals.
 * Flow: FusionRiskSummary ("difficulty breakdown") -> FusionDifficulty -> FusionTherapy ("View Therapy Plan").
 * All data comes from the fusion response passed in the route (already returned by the multi_modal_risk backend);
 * this screen makes no new API call. Uses i18n and the KidBackground component.
 */
import React from "react";
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { theme } from "../../theme";
import KidBackground from "../../components/KidBackground";
import { useT } from "../../i18n";

// Navigation + route (response = the full fusion result from the backend).
type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "FusionDifficulty">;
  route: RouteProp<RootStackParamList, "FusionDifficulty">;
};

// Name, description, icon and colours for each difficulty area (blue = speech, purple = handwriting, teal = attention).
const DIFFICULTY_CONFIG: Record<string, {
  label: string; description: string; icon: keyof typeof Ionicons.glyphMap;
  color: string; bg: string; iconBg: string; gradColors: [string, string];
}> = {
  phonological_processing: {
    label: "Phonological Processing",
    description: "Speech sound awareness, phoneme recognition, and pronunciation patterns.",
    icon: "ear-outline",
    color: "#2563EB",
    bg: "#EFF6FF",
    iconBg: "#DBEAFE",
    gradColors: ["#2563EB", "#1D4ED8"],
  },
  handwriting: {
    label: "Handwriting",
    description: "Letter formation, spacing, reversal patterns, and writing quality.",
    icon: "pencil-outline",
    color: "#7C3AED",
    bg: "#F5F3FF",
    iconBg: "#EDE9FE",
    gradColors: ["#7C3AED", "#6D28D9"],
  },
  attention_behavior: {
    label: "Attention & Behaviour",
    description: "Focus, task engagement, response patterns, and working memory.",
    icon: "happy-outline",
    color: "#0891B2",
    bg: "#ECFEFF",
    iconBg: "#CFFAFE",
    gradColors: ["#0891B2", "#0E7490"],
  },
};

// The three module scores shown as bars; each has its own colour (blue, purple, teal).
const ALL_MODULES = [
  { key: "speech_score",      label: "Speech",      color: "#2563EB", icon: "ear-outline" as const },
  { key: "handwriting_score", label: "Handwriting", color: "#7C3AED", icon: "pencil-outline" as const },
  { key: "behavior_score",    label: "Behaviour",   color: "#0891B2", icon: "happy-outline" as const },
];

// Main screen: primary area card, secondary area, score comparison, key signals and the therapy button.
export default function FusionDifficultyScreen({ navigation, route }: Props) {
  const { t } = useT();
  const { response } = route.params;
  const primary = response.primary_difficulty;
  const secondary = response.secondary_difficulty_label;
  const features = response.fusion_features ?? {};

  // Pick the display settings for the primary and secondary difficulty (falls back to speech if unknown).
  const primaryConfig = DIFFICULTY_CONFIG[primary?.primary_difficulty_label] ?? DIFFICULTY_CONFIG.phonological_processing;
  const secondaryConfig = secondary ? DIFFICULTY_CONFIG[secondary] : null;

  return (
    <View style={styles.container}>
      <KidBackground variant="therapy" />
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("Difficulty Breakdown")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Primary difficulty — null when the screening had insufficient evidence */}
        <Text style={styles.sectionLabel}>{t("Primary Area of Difficulty")}</Text>
        {!primary ? (
          <View style={[styles.secondaryCard, { borderColor: "#E2E8F0" }]}>
            <View style={[styles.secondaryIconWrap, { backgroundColor: "#F1F5F9" }]}>
              <Ionicons name="hourglass-outline" size={22} color="#64748B" />
            </View>
            <View style={styles.secondaryInfo}>
              <Text style={styles.secondaryLabel}>{t("Not enough evidence yet")}</Text>
              <Text style={styles.secondaryDesc}>{t("Complete more activities to see a difficulty breakdown.")}</Text>
            </View>
          </View>
        ) : (
        <LinearGradient colors={primaryConfig.gradColors} style={styles.primaryCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.decoCircle} />
          <View style={styles.primaryIconWrap}>
            <Ionicons name={primaryConfig.icon} size={36} color="#fff" />
          </View>
          <View style={styles.primaryInfo}>
            <Text style={styles.primaryLabel}>{t(primaryConfig.label)}</Text>
            <Text style={styles.primaryDesc}>{t(primaryConfig.description)}</Text>
            <View style={styles.confidenceRow}>
              {primary?.confidence != null && (
                <View style={styles.confidencePill}>
                  <Text style={styles.confidenceText}>
                    {t("{pct}% confidence", { pct: Math.round(primary.confidence * 100) })}
                  </Text>
                </View>
              )}
              <View style={styles.methodPill}>
                <Text style={styles.methodText}>
                  {primary?.method === "xgboost_primary_difficulty_model" ? t("AI Model") : t("Rule-based")}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
        )}

        {/* Secondary difficulty */}
        {secondaryConfig && (
          <>
            <Text style={styles.sectionLabel}>{t("Secondary Area")}</Text>
            <View style={[styles.secondaryCard, { borderColor: secondaryConfig.color + "30" }]}>
              <View style={[styles.secondaryIconWrap, { backgroundColor: secondaryConfig.iconBg }]}>
                <Ionicons name={secondaryConfig.icon} size={22} color={secondaryConfig.color} />
              </View>
              <View style={styles.secondaryInfo}>
                <Text style={styles.secondaryLabel}>{t(secondaryConfig.label)}</Text>
                <Text style={styles.secondaryDesc}>{t(secondaryConfig.description)}</Text>
              </View>
              <View style={[styles.secondaryBadge, { backgroundColor: secondaryConfig.bg }]}>
                <Text style={[styles.secondaryBadgeText, { color: secondaryConfig.color }]}>{t("Secondary")}</Text>
              </View>
            </View>
          </>
        )}

        {/* Module score bars */}
        <Text style={styles.sectionLabel}>{t("Module Score Comparison")}</Text>
        <View style={styles.scoresCard}>
          {ALL_MODULES.map((m, i) => {
            const val = Number(features[m.key] ?? 0);
            const isPrimary = (m.key === "speech_score" && primary?.primary_difficulty_label === "phonological_processing") ||
              (m.key === "handwriting_score" && primary?.primary_difficulty_label === "handwriting") ||
              (m.key === "behavior_score" && primary?.primary_difficulty_label === "attention_behavior");
            return (
              <View key={i} style={[styles.scoreRow, i < ALL_MODULES.length - 1 && styles.scoreBorder]}>
                <View style={[styles.scoreIconWrap, { backgroundColor: m.color + "20" }]}>
                  <Ionicons name={m.icon} size={16} color={m.color} />
                </View>
                <View style={styles.scoreInfo}>
                  <View style={styles.scoreLabelRow}>
                    <Text style={styles.scoreModuleName}>{t(m.label)}</Text>
                    {isPrimary && (
                      <View style={[styles.primaryBadge, { backgroundColor: m.color + "20" }]}>
                        <Text style={[styles.primaryBadgeText, { color: m.color }]}>{t("Primary")}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.scoreBarWrap}>
                    <View style={styles.scoreTrack}>
                      <View
                        style={[
                          styles.scoreBarFill,
                          { width: `${Math.round(val * 100)}%` as any, backgroundColor: m.color },
                        ]}
                      />
                    </View>
                    <Text style={[styles.scorePercent, { color: m.color }]}>{Math.round(val * 100)}%</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Feature details */}
        <Text style={styles.sectionLabel}>{t("Key Feature Signals")}</Text>
        <View style={styles.featuresCard}>
          {[
            { label: "Phoneme Error Rate",   val: features.phoneme_error_rate, high: 0.5 },
            { label: "Speech Hesitation",    val: features.speech_hesitation_score, high: 0.5 },
            { label: "Pronunciation Score",  val: features.pronunciation_score, invert: true, high: 0.5 },
            { label: "Reversal Risk",        val: features.reversal_risk, high: 0.6 },
            { label: "Spacing Variance",     val: features.spacing_variance, high: 0.5 },
            { label: "Writing Quality",      val: features.writing_quality_score, invert: true, high: 0.5 },
            { label: "Attention Score",      val: features.attention_score, invert: true, high: 0.5 },
            { label: "Engagement Score",     val: features.engagement_score, invert: true, high: 0.5 },
          ].filter((f) => f.val != null && f.val !== 0).map((f, i, arr) => {
            const val = Number(f.val ?? 0);
            const isRisk = f.invert ? val < f.high : val > f.high;
            return (
              <View key={i} style={[styles.featureRow, i < arr.length - 1 && styles.featureBorder]}>
                <Text style={styles.featureLabel}>{t(f.label)}</Text>
                <View style={styles.featureRight}>
                  <View style={styles.featureTrack}>
                    <View style={[styles.featureFill, { width: `${Math.round(val * 100)}%` as any, backgroundColor: isRisk ? "#EF4444" : "#059669" }]} />
                  </View>
                  <Text style={[styles.featureVal, { color: isRisk ? "#EF4444" : "#059669" }]}>
                    {Math.round(val * 100)}%
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ height: 16 }} />

        {!!response.therapy_recommendation && (
        <LinearGradient colors={["#1D4ED8", "#2563EB"]} style={styles.nextBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <TouchableOpacity
            style={styles.nextBtnInner}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("FusionTherapy", { response })}
          >
            <Ionicons name="fitness-outline" size={20} color="#fff" />
            <Text style={styles.nextBtnText}>{t("View Therapy Plan")}</Text>
          </TouchableOpacity>
        </LinearGradient>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  /* Page background: soft light blue-white */
  container: { flex: 1, backgroundColor: "#F5F7FF" },
  /* Header: white circle back button, dark slate title */
  header: {
    paddingTop: 58, paddingHorizontal: 20, paddingBottom: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#94A3B8", shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 3,
  },
  headerTitle: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: "#1E293B" },
  content: { paddingHorizontal: 20, paddingTop: 8 },

  /* Section labels: light grey small caps */
  sectionLabel: { fontSize: 11, fontFamily: theme.fonts.semiBold, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10 },

  /* Primary area card: gradient colour comes from DIFFICULTY_CONFIG; white text and see-through white pills */
  primaryCard: {
    flexDirection: "row", borderRadius: 22, padding: 20, marginBottom: 20,
    overflow: "hidden", alignItems: "flex-start", gap: 16,
    shadowColor: "#000", shadowOpacity: 0.15, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16, elevation: 8,
  },
  decoCircle: { position: "absolute", width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(255,255,255,0.07)", top: -50, right: -30 },
  primaryIconWrap: {
    width: 60, height: 60, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  primaryInfo: { flex: 1 },
  primaryLabel: { fontSize: 17, fontFamily: theme.fonts.extraBold, color: "#fff", marginBottom: 6 },
  primaryDesc: { fontSize: 12, fontFamily: theme.fonts.regular, color: "rgba(255,255,255,0.8)", lineHeight: 18, marginBottom: 10 },
  confidenceRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  confidencePill: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  confidenceText: { fontSize: 11, fontFamily: theme.fonts.semiBold, color: "#fff" },
  methodPill: { backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  methodText: { fontSize: 11, fontFamily: theme.fonts.regular, color: "rgba(255,255,255,0.85)" },

  /* Secondary area card: white, border and badge colours come from DIFFICULTY_CONFIG */
  secondaryCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderWidth: 1.5, borderRadius: 20, padding: 16, marginBottom: 20, gap: 14,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  secondaryIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  secondaryInfo: { flex: 1 },
  secondaryLabel: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: "#1E293B", marginBottom: 4 },
  secondaryDesc: { fontSize: 11, fontFamily: theme.fonts.regular, color: "#94A3B8", lineHeight: 16 },
  secondaryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  secondaryBadgeText: { fontSize: 11, fontFamily: theme.fonts.semiBold },

  /* Module score bars: white card, grey track, bar colour = module colour */
  scoresCard: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 20, padding: 16, marginBottom: 20,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  scoreRow: { paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  scoreBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  scoreIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  scoreInfo: { flex: 1, gap: 6 },
  scoreLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  scoreModuleName: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: "#1E293B" },
  primaryBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  primaryBadgeText: { fontSize: 10, fontFamily: theme.fonts.semiBold },
  scoreBarWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  scoreTrack: { flex: 1, height: 7, backgroundColor: "#E2E8F0", borderRadius: 4, overflow: "hidden" },
  scoreBarFill: { height: 7, borderRadius: 4 },
  scorePercent: { fontSize: 13, fontFamily: theme.fonts.bold, width: 36, textAlign: "right" },

  /* Key signals: white card; bar and number are red when the signal is risky, green when fine (set in the code) */
  featuresCard: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 20, padding: 16, marginBottom: 20,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  featureRow: { paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  featureBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  featureLabel: { fontSize: 12, fontFamily: theme.fonts.medium, color: "#64748B", flex: 1 },
  featureRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureTrack: { width: 80, height: 6, backgroundColor: "#E2E8F0", borderRadius: 3, overflow: "hidden" },
  featureFill: { height: 6, borderRadius: 3 },
  featureVal: { fontSize: 12, fontFamily: theme.fonts.bold, width: 36, textAlign: "right" },

  /* Therapy plan button: blue gradient pill with white text */
  nextBtn: {
    borderRadius: 50,
    shadowColor: "#2563EB", shadowOpacity: 0.3, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  nextBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18 },
  nextBtnText: { fontSize: 16, fontFamily: theme.fonts.bold, color: "#fff" },
});
