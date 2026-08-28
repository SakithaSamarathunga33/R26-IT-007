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
import ProgressRing from "../../components/common/ProgressRing";
import ProgressTrack from "../../components/common/ProgressTrack";
import RiskBadge from "../../components/common/RiskBadge";
import { colors, moduleColors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "FusionReport">;
  route: RouteProp<RootStackParamList, "FusionReport">;
};

const DIFFICULTY_LABELS: Record<string, string> = {
  phonological_processing: "Phonological Processing",
  handwriting:             "Handwriting",
  attention_behavior:      "Attention & Behaviour",
};

const MODULE_META = [
  { key: "speech",      label: "Speech",      sublabel: "Phonological",  icon: "ear-outline" as const,    color: colors.brand, tint: moduleColors.speech.tint, scoreKey: "speech_score" },
  { key: "handwriting", label: "Handwriting", sublabel: "Handwriting",   icon: "pencil-outline" as const, color: colors.coral, tint: moduleColors.handwriting.tint, scoreKey: "handwriting_score" },
  { key: "behaviour",   label: "Behaviour",   sublabel: "Attention",     icon: "happy-outline" as const,  color: colors.mint,  tint: moduleColors.behaviour.tint, scoreKey: "behavior_score" },
];

function Section({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

export default function FusionReportScreen({ navigation, route }: Props) {
  const { response } = route.params;
  const fp     = response.final_prediction ?? {};
  const pd     = response.primary_difficulty ?? {};
  const sec    = response.secondary_difficulty_label;
  const therapy = response.therapy_recommendation ?? {};
  const quality = response.quality ?? {};
  const features = response.fusion_features ?? {};

  const level = (fp.final_dyslexia_risk_level as string) ?? "low";
  const score = Math.round((fp.overall_risk_score ?? 0) * 100);

  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  // History save + session reset now happen in FusionLoadingScreen as soon as
  // the analysis completes, so this screen only navigates home.
  const handleGoHome = () => {
    navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
  };

  return (
    <ScreenContainer>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <ActivityHeader
        title="Screening report"
        subtitle="Full assessment report"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ClayCard style={styles.bannerCard} radius={24}>
          <View style={styles.bannerIcon}>
            <Ionicons name="document-text-outline" size={28} color={colors.brand} />
          </View>
          <Text style={styles.bannerTitle}>Dyslexia Screening Report</Text>
          <Text style={styles.bannerDate}>Generated {generatedDate}</Text>
          <View style={styles.bannerBadgeRow}>
            <View style={styles.bannerBadge}>
              <Text style={styles.bannerBadgeText}>Multi-Modal Fusion</Text>
            </View>
            <View style={styles.bannerBadge}>
              <Text style={styles.bannerBadgeText}>v{fp.model_version ?? "1.0"}</Text>
            </View>
          </View>
        </ClayCard>

        <Section title="Final Screening Result" />
        <ClayCard style={styles.resultCard} radius={22}>
          <View style={styles.resultRow}>
            <View style={{ flex: 1 }}>
              <RiskBadge level={level} />
              <Text style={styles.resultLevel}>
                {level.charAt(0).toUpperCase() + level.slice(1)} Screening Risk
              </Text>
              <Text style={styles.resultScore}>Overall Risk Score: {score}%</Text>
              <Text style={styles.resultMethod}>Method: {fp.fusion_strategy ?? "weighted_rule_based_fusion"}</Text>
            </View>
            <ProgressRing progress={score / 100} size={64} stroke={7} value={`${score}%`} label="" />
          </View>
          <ProgressTrack progress={score / 100} />
          <Text style={styles.meta}>Threshold: 35%  ·  Reliability: {quality.fusion_reliability ?? "medium"}</Text>
        </ClayCard>

        <Section title="Difficulty Areas" />
        <ClayCard style={styles.block} radius={22}>
          <View style={styles.diffRow}>
            <View style={styles.diffLabel}>
              <Ionicons name="alert-circle" size={14} color={colors.brand} />
              <Text style={styles.diffKey}>Primary Difficulty</Text>
            </View>
            <Text style={styles.diffVal}>{DIFFICULTY_LABELS[pd.primary_difficulty_label] ?? pd.primary_difficulty_label}</Text>
          </View>
          {pd.confidence != null && (
            <View style={styles.diffRow}>
              <View style={styles.diffLabel}>
                <Ionicons name="stats-chart" size={14} color={colors.coral} />
                <Text style={styles.diffKey}>Model Confidence</Text>
              </View>
              <Text style={styles.diffVal}>{Math.round(pd.confidence * 100)}%</Text>
            </View>
          )}
          <View style={styles.diffRow}>
            <View style={styles.diffLabel}>
              <Ionicons name="git-branch" size={14} color={colors.mint} />
              <Text style={styles.diffKey}>Method</Text>
            </View>
            <Text style={styles.diffVal}>
              {pd.method === "xgboost_primary_difficulty_model" ? "AI Model" : "Rule-based"}
            </Text>
          </View>
          {sec && (
            <View style={styles.diffRow}>
              <View style={styles.diffLabel}>
                <Ionicons name="layers" size={14} color={colors.textSecondary} />
                <Text style={styles.diffKey}>Secondary Difficulty</Text>
              </View>
              <Text style={styles.diffVal}>{DIFFICULTY_LABELS[sec] ?? sec}</Text>
            </View>
          )}
        </ClayCard>

        <Section title="Module Summaries" />
        <ClayCard style={styles.block} radius={22}>
          {MODULE_META.map((m) => {
            const val = Number(features[m.scoreKey] ?? 0);
            const mlevel = val >= 0.6 ? "high" : val >= 0.35 ? "medium" : "low";
            return (
              <View key={m.key} style={styles.moduleRow}>
                <View style={[styles.moduleIcon, { backgroundColor: m.tint }]}>
                  <Ionicons name={m.icon} size={18} color={m.color} />
                </View>
                <View style={styles.moduleInfo}>
                  <Text style={styles.moduleName}>{m.label}</Text>
                  <Text style={styles.moduleSub}>{m.sublabel}</Text>
                  <View style={styles.moduleBarRow}>
                    <ProgressTrack progress={val} colors={[m.color, m.color]} />
                    <Text style={[styles.modulePercent, { color: m.color }]}>{Math.round(val * 100)}%</Text>
                  </View>
                </View>
                <RiskBadge level={mlevel} />
              </View>
            );
          })}
        </ClayCard>

        <Section title="Therapy Recommendation" />
        <ClayCard style={styles.block} radius={22}>
          <View style={styles.therapyRow}>
            <Ionicons name="fitness-outline" size={16} color={colors.brand} />
            <Text style={styles.therapyLabel}>Primary Focus</Text>
            <Text style={styles.therapyVal}>{therapy.primary_focus}</Text>
          </View>
          <View style={styles.therapyRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.coral} />
            <Text style={styles.therapyLabel}>Sessions / Week</Text>
            <Text style={styles.therapyVal}>{therapy.recommended_sessions_per_week}</Text>
          </View>
          <View style={styles.therapyRow}>
            <Ionicons name="flame-outline" size={16} color={colors.gold} />
            <Text style={styles.therapyLabel}>Intensity</Text>
            <Text style={styles.therapyVal}>{therapy.recommendation_intensity}</Text>
          </View>
          <View style={styles.therapyRow}>
            <Ionicons name="list-outline" size={16} color={colors.mint} />
            <Text style={styles.therapyLabel}>Activities</Text>
            <Text style={styles.therapyVal}>{(therapy.recommended_activities ?? []).length} recommended</Text>
          </View>
        </ClayCard>

        {(therapy.recommended_activities ?? []).length > 0 && (
          <>
            <Section title="Recommended Activities" />
            <ClayCard style={styles.block} radius={22}>
              {(therapy.recommended_activities as any[]).map((act, i) => (
                <View key={act.activity_id ?? i} style={styles.actRow}>
                  <View style={styles.actNum}>
                    <Text style={styles.actNumText}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actTitle}>{act.title}</Text>
                    {!!act.description && <Text style={styles.actDesc}>{act.description}</Text>}
                    <View style={styles.actMeta}>
                      <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                      <Text style={styles.actMetaText}>{act.duration_minutes} min</Text>
                      {!!act.target_skill && (
                        <>
                          <View style={styles.actMetaDot} />
                          <Text style={styles.actSkill}>{String(act.target_skill).replace(/_/g, " ")}</Text>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </ClayCard>
          </>
        )}

        {therapy.secondary_recommendation?.suggested_activity && (
          <>
            <Section title="Secondary Support" />
            <ClayCard style={styles.block} radius={22}>
              <View style={styles.actRow}>
                <View style={[styles.actNum, { backgroundColor: moduleColors.handwriting.tint }]}>
                  <Ionicons name="add" size={16} color={colors.coral} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actTitle}>{therapy.secondary_recommendation.suggested_activity.title}</Text>
                  {!!therapy.secondary_recommendation.suggested_activity.description && (
                    <Text style={styles.actDesc}>{therapy.secondary_recommendation.suggested_activity.description}</Text>
                  )}
                  {!!therapy.secondary_recommendation.primary_focus && (
                    <View style={styles.actMeta}>
                      <Ionicons name="flag-outline" size={12} color={colors.textMuted} />
                      <Text style={styles.actMetaText}>{therapy.secondary_recommendation.primary_focus}</Text>
                    </View>
                  )}
                </View>
              </View>
            </ClayCard>
          </>
        )}

        {(quality.warnings ?? []).length > 0 && (
          <>
            <Section title="Quality Warnings" />
            <ClayCard inset style={styles.warnCard} radius={16}>
              {(quality.warnings as string[]).map((w, i) => (
                <View key={i} style={styles.warnRow}>
                  <Ionicons name="warning-outline" size={14} color={"#B0791A"} />
                  <Text style={styles.warnText}>{w}</Text>
                </View>
              ))}
            </ClayCard>
          </>
        )}

        <ClayCard inset style={styles.noteCard} radius={18}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.brand} />
          <Text style={styles.noteText}>
            This report contains <Text style={styles.noteBold}>screening risk indicators only</Text> — not a clinical diagnosis. Results combine speech, handwriting, and behaviour module outputs using the weighted rule-based fusion method. Please consult a qualified teacher, therapist, or specialist for a full evaluation.
          </Text>
        </ClayCard>

        <PrimaryButton label="Back to Dashboard" onPress={handleGoHome} />
        <View style={{ height: 28 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 16, paddingBottom: 8, gap: 12 },

  bannerCard: { alignItems: "center", padding: 24 },
  bannerIcon: {
    width: 62, height: 62, borderRadius: 22, backgroundColor: colors.brandTint,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  bannerTitle: { fontFamily: fonts.extraBold, fontSize: 20, color: colors.text, marginBottom: 4 },
  bannerDate: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginBottom: 12 },
  bannerBadgeRow: { flexDirection: "row", gap: 8 },
  bannerBadge: { backgroundColor: colors.bgInset, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  bannerBadgeText: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.textBody },

  sectionTitle: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.2, marginTop: 4 },

  resultCard: { padding: 16, gap: 12 },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  resultLevel: { fontFamily: fonts.extraBold, fontSize: 18, color: colors.text, marginTop: 8, marginBottom: 4 },
  resultScore: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  resultMethod: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  meta: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },

  block: { padding: 16, gap: 4 },
  diffRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  diffLabel: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  diffKey: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  diffVal: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.text, textAlign: "right", flex: 1 },

  moduleRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 12 },
  moduleIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  moduleInfo: { flex: 1, gap: 4 },
  moduleName: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text },
  moduleSub: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  moduleBarRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  modulePercent: { fontFamily: fonts.bold, fontSize: 12, width: 32, textAlign: "right" },

  therapyRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  therapyLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  therapyVal: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.text },

  actRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 10 },
  actNum: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.brandTint, alignItems: "center", justifyContent: "center" },
  actNumText: { fontFamily: fonts.bold, fontSize: 13, color: colors.brand },
  actTitle: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text, marginBottom: 3 },
  actDesc: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginBottom: 6 },
  actMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  actMetaText: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  actMetaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.textInactive },
  actSkill: { fontFamily: fonts.medium, fontSize: 11, color: colors.textSecondary, textTransform: "capitalize" },

  warnCard: { padding: 14, gap: 8 },
  warnRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  warnText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.textBody, lineHeight: 18 },

  noteCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14 },
  noteText: { flex: 1, fontFamily: fonts.semiBold, fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  noteBold: { fontFamily: fonts.bold, color: colors.text },
});
