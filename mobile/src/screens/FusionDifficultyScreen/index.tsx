import React from "react";
import {
  View, Text, StyleSheet, StatusBar, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import ScreenContainer from "../../components/common/ScreenContainer";
import ActivityHeader from "../../components/common/ActivityHeader";
import ClayCard from "../../components/common/ClayCard";
import PrimaryButton from "../../components/common/PrimaryButton";
import ProgressTrack from "../../components/common/ProgressTrack";
import { colors, moduleColors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "FusionDifficulty">;
  route: RouteProp<RootStackParamList, "FusionDifficulty">;
};

const DIFFICULTY_CONFIG: Record<string, {
  label: string; description: string; icon: keyof typeof Ionicons.glyphMap;
  color: string; tint: string;
}> = {
  phonological_processing: {
    label: "Phonological Processing",
    description: "Speech sound awareness, phoneme recognition, and pronunciation patterns.",
    icon: "ear-outline",
    color: colors.brand,
    tint: moduleColors.speech.tint,
  },
  handwriting: {
    label: "Handwriting",
    description: "Letter formation, spacing, reversal patterns, and writing quality.",
    icon: "pencil-outline",
    color: colors.coral,
    tint: moduleColors.handwriting.tint,
  },
  attention_behavior: {
    label: "Attention & Behaviour",
    description: "Focus, task engagement, response patterns, and working memory.",
    icon: "happy-outline",
    color: colors.mint,
    tint: moduleColors.behaviour.tint,
  },
};

const ALL_MODULES = [
  { key: "speech_score",      label: "Speech",      color: colors.brand, icon: "ear-outline" as const, tint: moduleColors.speech.tint },
  { key: "handwriting_score", label: "Handwriting", color: colors.coral, icon: "pencil-outline" as const, tint: moduleColors.handwriting.tint },
  { key: "behavior_score",    label: "Behaviour",   color: colors.mint,  icon: "happy-outline" as const, tint: moduleColors.behaviour.tint },
];

export default function FusionDifficultyScreen({ navigation, route }: Props) {
  const { response } = route.params;
  const primary = response.primary_difficulty;
  const secondary = response.secondary_difficulty_label;
  const features = response.fusion_features ?? {};

  const primaryConfig = DIFFICULTY_CONFIG[primary?.primary_difficulty_label] ?? DIFFICULTY_CONFIG.phonological_processing;
  const secondaryConfig = secondary ? DIFFICULTY_CONFIG[secondary] : null;

  return (
    <ScreenContainer>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <ActivityHeader
        title="Where the difficulty sits"
        subtitle="Difficulty breakdown"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Primary Area of Difficulty</Text>
        <ClayCard style={styles.primaryCard} radius={22}>
          <View style={styles.primaryTop}>
            <View style={[styles.iconWrap, { backgroundColor: primaryConfig.tint }]}>
              <Ionicons name={primaryConfig.icon} size={22} color={primaryConfig.color} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={styles.primaryLabel}>{primaryConfig.label}</Text>
                <View style={[styles.chip, { backgroundColor: colors.coralTint }]}>
                  <Text style={[styles.chipText, { color: colors.coralText }]}>Main driver</Text>
                </View>
              </View>
            </View>
          </View>
          <Text style={styles.desc}>{primaryConfig.description}</Text>
          <View style={styles.pillRow}>
            {primary?.confidence != null && (
              <View style={styles.pill}>
                <Text style={styles.pillText}>{Math.round(primary.confidence * 100)}% confidence</Text>
              </View>
            )}
            <View style={styles.pill}>
              <Text style={styles.pillText}>
                {primary?.method === "xgboost_primary_difficulty_model" ? "AI Model" : "Rule-based"}
              </Text>
            </View>
          </View>
        </ClayCard>

        {secondaryConfig && (
          <>
            <Text style={styles.sectionLabel}>Secondary Area</Text>
            <ClayCard style={styles.secondaryCard} radius={22}>
              <View style={[styles.iconWrap, { backgroundColor: secondaryConfig.tint }]}>
                <Ionicons name={secondaryConfig.icon} size={22} color={secondaryConfig.color} />
              </View>
              <View style={styles.secondaryInfo}>
                <Text style={styles.secondaryLabel}>{secondaryConfig.label}</Text>
                <Text style={styles.desc}>{secondaryConfig.description}</Text>
              </View>
              <View style={[styles.chip, { backgroundColor: secondaryConfig.tint }]}>
                <Text style={[styles.chipText, { color: secondaryConfig.color }]}>Secondary</Text>
              </View>
            </ClayCard>
          </>
        )}

        <Text style={styles.sectionLabel}>Module Score Comparison</Text>
        <ClayCard style={styles.block} radius={22}>
          {ALL_MODULES.map((m) => {
            const val = Number(features[m.key] ?? 0);
            const isPrimary = (m.key === "speech_score" && primary?.primary_difficulty_label === "phonological_processing") ||
              (m.key === "handwriting_score" && primary?.primary_difficulty_label === "handwriting") ||
              (m.key === "behavior_score" && primary?.primary_difficulty_label === "attention_behavior");
            return (
              <View key={m.key} style={styles.scoreRow}>
                <View style={[styles.scoreIcon, { backgroundColor: m.tint }]}>
                  <Ionicons name={m.icon} size={16} color={m.color} />
                </View>
                <View style={styles.scoreInfo}>
                  <View style={styles.titleRow}>
                    <Text style={styles.scoreName}>{m.label}</Text>
                    {isPrimary && (
                      <View style={[styles.chip, { backgroundColor: m.tint }]}>
                        <Text style={[styles.chipText, { color: m.color }]}>Primary</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.barWrap}>
                    <ProgressTrack progress={val} colors={[m.color, m.color]} />
                    <Text style={[styles.percent, { color: m.color }]}>{Math.round(val * 100)}%</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ClayCard>

        <Text style={styles.sectionLabel}>Key Feature Signals</Text>
        <ClayCard style={styles.block} radius={22}>
          {[
            { label: "Phoneme Error Rate",   val: features.phoneme_error_rate, high: 0.5 },
            { label: "Speech Hesitation",    val: features.speech_hesitation_score, high: 0.5 },
            { label: "Pronunciation Score",  val: features.pronunciation_score, invert: true, high: 0.5 },
            { label: "Reversal Risk",        val: features.reversal_risk, high: 0.6 },
            { label: "Spacing Variance",     val: features.spacing_variance, high: 0.5 },
            { label: "Writing Quality",      val: features.writing_quality_score, invert: true, high: 0.5 },
            { label: "Attention Score",      val: features.attention_score, invert: true, high: 0.5 },
            { label: "Engagement Score",     val: features.engagement_score, invert: true, high: 0.5 },
          ].filter((f) => f.val != null && f.val !== 0).map((f) => {
            const val = Number(f.val ?? 0);
            const isRisk = f.invert ? val < f.high : val > f.high;
            const track: [string, string] = isRisk ? [colors.coralLight, "#F2573F"] : ["#4ED9AC", colors.mint];
            return (
              <View key={f.label} style={styles.featureRow}>
                <Text style={styles.featureLabel}>{f.label}</Text>
                <View style={styles.featureRight}>
                  <View style={styles.featureTrack}>
                    <ProgressTrack progress={val} colors={track} />
                  </View>
                  <Text style={[styles.percent, { color: isRisk ? colors.coralText : colors.mint }]}>
                    {Math.round(val * 100)}%
                  </Text>
                </View>
              </View>
            );
          })}
        </ClayCard>

        <PrimaryButton
          label="View Therapy Plan"
          onPress={() => navigation.navigate("FusionTherapy", { response })}
        />
        <View style={{ height: 28 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 16, paddingBottom: 8, gap: 12 },
  sectionLabel: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 4 },

  primaryCard: { padding: 18, gap: 12 },
  primaryTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  primaryLabel: { flex: 1, fontFamily: fonts.extraBold, fontSize: 16, color: colors.text },
  desc: { fontFamily: fonts.semiBold, fontSize: 12.5, color: colors.textSecondary, lineHeight: 19 },
  pillRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: { backgroundColor: colors.bgInset, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pillText: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.textBody },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9 },
  chipText: { fontFamily: fonts.extraBold, fontSize: 10.5 },

  secondaryCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  secondaryInfo: { flex: 1 },
  secondaryLabel: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text, marginBottom: 4 },

  block: { padding: 16, gap: 14 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  scoreIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  scoreInfo: { flex: 1, gap: 6 },
  scoreName: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text },
  barWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  percent: { fontFamily: fonts.bold, fontSize: 13, width: 36, textAlign: "right" },

  featureRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  featureLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSecondary, flex: 1 },
  featureRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureTrack: { width: 80 },
});
