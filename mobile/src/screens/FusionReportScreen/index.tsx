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

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "FusionReport">;
  route: RouteProp<RootStackParamList, "FusionReport">;
};

const RISK_COLORS = { low: "#059669", medium: "#D97706", high: "#EF4444" };
const RISK_BG     = { low: "#ECFDF5", medium: "#FFFBEB", high: "#FFF5F5" };
const RISK_BORDER = { low: "#BBF7D0", medium: "#FDE68A", high: "#FECACA" };
const RISK_GRAD: Record<string, [string, string]> = {
  low:    ["#059669", "#047857"],
  medium: ["#F59E0B", "#D97706"],
  high:   ["#EF4444", "#DC2626"],
};

const DIFFICULTY_LABELS: Record<string, string> = {
  phonological_processing: "Phonological Processing",
  handwriting:             "Handwriting",
  attention_behavior:      "Attention & Behaviour",
};

const MODULE_META = [
  { key: "speech",      label: "Speech",      sublabel: "Phonological",  icon: "ear-outline" as const,    color: "#2563EB", iconBg: "#DBEAFE", scoreKey: "speech_score" },
  { key: "handwriting", label: "Handwriting", sublabel: "Handwriting",   icon: "pencil-outline" as const, color: "#7C3AED", iconBg: "#EDE9FE", scoreKey: "handwriting_score" },
  { key: "behaviour",   label: "Behaviour",   sublabel: "Attention",     icon: "happy-outline" as const,  color: "#0891B2", iconBg: "#CFFAFE", scoreKey: "behavior_score" },
];

function Section({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function FusionReportScreen({ navigation, route }: Props) {
  const { response } = route.params;
  const fp     = response.final_prediction ?? {};
  const pd     = response.primary_difficulty ?? {};
  const sec    = response.secondary_difficulty_label;
  const therapy = response.therapy_recommendation ?? {};
  const quality = response.quality ?? {};
  const features = response.fusion_features ?? {};

  const level = (fp.final_dyslexia_risk_level as keyof typeof RISK_COLORS) ?? "low";
  const score = Math.round((fp.overall_risk_score ?? 0) * 100);
  const gradColors = RISK_GRAD[level] ?? RISK_GRAD.low;

  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  // History save + session reset now happen in FusionLoadingScreen as soon as
  // the analysis completes, so this screen only navigates home.
  const handleGoHome = () => {
    navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Full Assessment Report</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Report header banner */}
        <LinearGradient colors={gradColors} style={styles.bannerCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.decoCircleLg} />
          <View style={styles.decoCircleSm} />
          <View style={styles.bannerIconWrap}>
            <Ionicons name="document-text-outline" size={34} color="#fff" />
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
        </LinearGradient>

        {/* Final result */}
        <Section title="Final Screening Result" />
        <View style={[styles.resultCard, { borderColor: RISK_BORDER[level] ?? "#E2E8F0", backgroundColor: RISK_BG[level] ?? "#F8FAFC" }]}>
          <View style={styles.resultRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.resultLevel, { color: RISK_COLORS[level] }]}>
                {level.charAt(0).toUpperCase() + level.slice(1)} Screening Risk
              </Text>
              <Text style={styles.resultScore}>Overall Risk Score: {score}%</Text>
              <Text style={styles.resultMethod}>Method: {fp.fusion_strategy ?? "weighted_rule_based_fusion"}</Text>
            </View>
            <View style={[styles.scoreCircle, { borderColor: RISK_COLORS[level] }]}>
              <Text style={[styles.scoreCircleVal, { color: RISK_COLORS[level] }]}>{score}%</Text>
            </View>
          </View>
          <View style={styles.resultTrack}>
            <View style={[styles.resultFill, { width: `${score}%` as any, backgroundColor: RISK_COLORS[level] }]} />
          </View>
          <Text style={styles.resultThreshold}>Threshold: 35%  ·  Reliability: {quality.fusion_reliability ?? "medium"}</Text>
        </View>

        {/* Difficulty */}
        <Section title="Difficulty Areas" />
        <View style={styles.diffCard}>
          <View style={styles.diffRow}>
            <View style={styles.diffLabel}>
              <Ionicons name="alert-circle" size={14} color="#2563EB" />
              <Text style={styles.diffKey}>Primary Difficulty</Text>
            </View>
            <Text style={styles.diffVal}>{DIFFICULTY_LABELS[pd.primary_difficulty_label] ?? pd.primary_difficulty_label}</Text>
          </View>
          {pd.confidence != null && (
            <View style={[styles.diffRow, styles.diffBorder]}>
              <View style={styles.diffLabel}>
                <Ionicons name="stats-chart" size={14} color="#7C3AED" />
                <Text style={styles.diffKey}>Model Confidence</Text>
              </View>
              <Text style={styles.diffVal}>{Math.round(pd.confidence * 100)}%</Text>
            </View>
          )}
          <View style={[styles.diffRow, styles.diffBorder]}>
            <View style={styles.diffLabel}>
              <Ionicons name="git-branch" size={14} color="#0891B2" />
              <Text style={styles.diffKey}>Method</Text>
            </View>
            <Text style={styles.diffVal}>
              {pd.method === "xgboost_primary_difficulty_model" ? "AI Model" : "Rule-based"}
            </Text>
          </View>
          {sec && (
            <View style={[styles.diffRow, styles.diffBorder]}>
              <View style={styles.diffLabel}>
                <Ionicons name="layers" size={14} color="#64748B" />
                <Text style={styles.diffKey}>Secondary Difficulty</Text>
              </View>
              <Text style={styles.diffVal}>{DIFFICULTY_LABELS[sec] ?? sec}</Text>
            </View>
          )}
        </View>

        {/* Module summaries */}
        <Section title="Module Summaries" />
        <View style={styles.modulesCard}>
          {MODULE_META.map((m, i) => {
            const val = Number(features[m.scoreKey] ?? 0);
            const mlevel = val >= 0.6 ? "high" : val >= 0.35 ? "medium" : "low";
            return (
              <View key={i} style={[styles.moduleRow, i < MODULE_META.length - 1 && styles.moduleBorder]}>
                <View style={[styles.moduleIcon, { backgroundColor: m.iconBg }]}>
                  <Ionicons name={m.icon} size={18} color={m.color} />
                </View>
                <View style={styles.moduleInfo}>
                  <Text style={styles.moduleName}>{m.label}</Text>
                  <Text style={styles.moduleSub}>{m.sublabel}</Text>
                  <View style={styles.moduleBarRow}>
                    <View style={styles.moduleTrack}>
                      <View style={[styles.moduleBarFill, { width: `${Math.round(val * 100)}%` as any, backgroundColor: m.color }]} />
                    </View>
                    <Text style={[styles.modulePercent, { color: m.color }]}>{Math.round(val * 100)}%</Text>
                  </View>
                </View>
                <View style={[styles.moduleLevelPill, { backgroundColor: RISK_BG[mlevel], borderColor: RISK_BORDER[mlevel] }]}>
                  <Text style={[styles.moduleLevelText, { color: RISK_COLORS[mlevel] }]}>{mlevel}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Therapy summary */}
        <Section title="Therapy Recommendation" />
        <View style={styles.therapyCard}>
          <View style={styles.therapyRow}>
            <Ionicons name="fitness-outline" size={16} color="#2563EB" />
            <Text style={styles.therapyLabel}>Primary Focus</Text>
            <Text style={styles.therapyVal}>{therapy.primary_focus}</Text>
          </View>
          <View style={[styles.therapyRow, styles.therapyBorder]}>
            <Ionicons name="calendar-outline" size={16} color="#7C3AED" />
            <Text style={styles.therapyLabel}>Sessions / Week</Text>
            <Text style={styles.therapyVal}>{therapy.recommended_sessions_per_week}</Text>
          </View>
          <View style={[styles.therapyRow, styles.therapyBorder]}>
            <Ionicons name="flame-outline" size={16} color="#D97706" />
            <Text style={styles.therapyLabel}>Intensity</Text>
            <Text style={styles.therapyVal}>{therapy.recommendation_intensity}</Text>
          </View>
          <View style={[styles.therapyRow, styles.therapyBorder]}>
            <Ionicons name="list-outline" size={16} color="#0891B2" />
            <Text style={styles.therapyLabel}>Activities</Text>
            <Text style={styles.therapyVal}>{(therapy.recommended_activities ?? []).length} recommended</Text>
          </View>
        </View>

        {/* Recommended activities */}
        {(therapy.recommended_activities ?? []).length > 0 && (
          <>
            <Section title="Recommended Activities" />
            <View style={styles.actList}>
              {(therapy.recommended_activities as any[]).map((act, i) => (
                <View key={act.activity_id ?? i} style={[styles.actRow, i > 0 && styles.actBorder]}>
                  <View style={styles.actNum}>
                    <Text style={styles.actNumText}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actTitle}>{act.title}</Text>
                    {!!act.description && <Text style={styles.actDesc}>{act.description}</Text>}
                    <View style={styles.actMeta}>
                      <Ionicons name="time-outline" size={12} color="#94A3B8" />
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
            </View>
          </>
        )}

        {/* Secondary support activity */}
        {therapy.secondary_recommendation?.suggested_activity && (
          <>
            <Section title="Secondary Support" />
            <View style={styles.actList}>
              <View style={styles.actRow}>
                <View style={[styles.actNum, { backgroundColor: "#F5F3FF" }]}>
                  <Ionicons name="add" size={16} color="#7C3AED" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actTitle}>{therapy.secondary_recommendation.suggested_activity.title}</Text>
                  {!!therapy.secondary_recommendation.suggested_activity.description && (
                    <Text style={styles.actDesc}>{therapy.secondary_recommendation.suggested_activity.description}</Text>
                  )}
                  {!!therapy.secondary_recommendation.primary_focus && (
                    <View style={styles.actMeta}>
                      <Ionicons name="flag-outline" size={12} color="#94A3B8" />
                      <Text style={styles.actMetaText}>{therapy.secondary_recommendation.primary_focus}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </>
        )}

        {/* Quality and warnings */}
        {(quality.warnings ?? []).length > 0 && (
          <>
            <Section title="Quality Warnings" />
            <View style={styles.qCard}>
              {(quality.warnings as string[]).map((w, i) => (
                <View key={i} style={[styles.qRow, i > 0 && styles.qBorder]}>
                  <Ionicons name="warning-outline" size={14} color="#D97706" />
                  <Text style={styles.qText}>{w}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#2563EB" />
          <Text style={styles.disclaimerText}>
            This report contains <Text style={styles.disclaimerBold}>screening risk indicators only</Text> — not a clinical diagnosis. Results combine speech, handwriting, and behaviour module outputs using the weighted rule-based fusion method. Please consult a qualified teacher, therapist, or specialist for a full evaluation.
          </Text>
        </View>

        <View style={{ height: 16 }} />

        <TouchableOpacity
          style={styles.homeBtn}
          activeOpacity={0.8}
          onPress={handleGoHome}
        >
          <LinearGradient colors={["#1D4ED8", "#2563EB"]} style={styles.homeBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="home-outline" size={20} color="#fff" />
            <Text style={styles.homeBtnText}>Back to Dashboard</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FF" },
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

  bannerCard: {
    borderRadius: 24, padding: 24, alignItems: "center", marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.18, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 10,
  },
  decoCircleLg: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.07)", top: -70, right: -50 },
  decoCircleSm: { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.05)", bottom: -30, left: 10 },
  bannerIconWrap: {
    width: 66, height: 66, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  bannerTitle: { fontSize: 20, fontFamily: theme.fonts.extraBold, color: "#fff", marginBottom: 4 },
  bannerDate: { fontSize: 12, fontFamily: theme.fonts.regular, color: "rgba(255,255,255,0.7)", marginBottom: 12 },
  bannerBadgeRow: { flexDirection: "row", gap: 8 },
  bannerBadge: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  bannerBadgeText: { fontSize: 11, fontFamily: theme.fonts.semiBold, color: "#fff" },

  sectionHeaderRow: { marginTop: 4, marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontFamily: theme.fonts.semiBold, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1.2 },

  resultCard: {
    borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 20,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  resultLevel: { fontSize: 18, fontFamily: theme.fonts.extraBold, marginBottom: 4 },
  resultScore: { fontSize: 13, fontFamily: theme.fonts.medium, color: "#1E293B" },
  resultMethod: { fontSize: 11, fontFamily: theme.fonts.regular, color: "#94A3B8", marginTop: 2 },
  scoreCircle: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 2.5,
    alignItems: "center", justifyContent: "center",
  },
  scoreCircleVal: { fontSize: 16, fontFamily: theme.fonts.extraBold },
  resultTrack: { height: 8, backgroundColor: "rgba(0,0,0,0.07)", borderRadius: 4, overflow: "hidden", marginBottom: 8 },
  resultFill: { height: 8, borderRadius: 4 },
  resultThreshold: { fontSize: 11, fontFamily: theme.fonts.regular, color: "#94A3B8" },

  diffCard: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 20, padding: 16, marginBottom: 20,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  diffRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 0 },
  diffBorder: { borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  diffLabel: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  diffKey: { fontSize: 13, fontFamily: theme.fonts.medium, color: "#64748B" },
  diffVal: { fontSize: 13, fontFamily: theme.fonts.semiBold, color: "#1E293B", textAlign: "right", flex: 1 },

  modulesCard: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 20, overflow: "hidden", marginBottom: 20,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  moduleRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  moduleBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  moduleIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  moduleInfo: { flex: 1, gap: 4 },
  moduleName: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: "#1E293B" },
  moduleSub: { fontSize: 11, fontFamily: theme.fonts.regular, color: "#94A3B8" },
  moduleBarRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  moduleTrack: { flex: 1, height: 6, backgroundColor: "#E2E8F0", borderRadius: 3, overflow: "hidden" },
  moduleBarFill: { height: 6, borderRadius: 3 },
  modulePercent: { fontSize: 12, fontFamily: theme.fonts.bold, width: 32, textAlign: "right" },
  moduleLevelPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  moduleLevelText: { fontSize: 11, fontFamily: theme.fonts.semiBold },

  therapyCard: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 20, padding: 16, marginBottom: 20,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  therapyRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  therapyBorder: { borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  therapyLabel: { flex: 1, fontSize: 13, fontFamily: theme.fonts.medium, color: "#64748B" },
  therapyVal: { fontSize: 13, fontFamily: theme.fonts.semiBold, color: "#1E293B" },

  actList: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 20, padding: 6, marginBottom: 20,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  actRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 12 },
  actBorder: { borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  actNum: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  actNumText: { fontSize: 13, fontFamily: theme.fonts.bold, color: "#2563EB" },
  actTitle: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: "#1E293B", marginBottom: 3 },
  actDesc: { fontSize: 12, fontFamily: theme.fonts.regular, color: "#64748B", lineHeight: 18, marginBottom: 6 },
  actMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  actMetaText: { fontSize: 11, fontFamily: theme.fonts.regular, color: "#94A3B8" },
  actMetaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#CBD5E1" },
  actSkill: { fontSize: 11, fontFamily: theme.fonts.medium, color: "#64748B", textTransform: "capitalize" },

  qCard: {
    backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A",
    borderRadius: 16, padding: 14, marginBottom: 16,
  },
  qRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 4 },
  qBorder: { borderTopWidth: 1, borderTopColor: "#FEF3C7", marginTop: 4, paddingTop: 8 },
  qText: { flex: 1, fontSize: 12, fontFamily: theme.fonts.regular, color: "#92400E", lineHeight: 18 },

  disclaimerCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE",
    borderRadius: 16, padding: 14, marginBottom: 20,
  },
  disclaimerText: { flex: 1, fontSize: 12, fontFamily: theme.fonts.regular, color: "#3B72F6", lineHeight: 18 },
  disclaimerBold: { fontFamily: theme.fonts.semiBold, color: "#1E40AF" },

  homeBtn: {
    borderRadius: 50, overflow: "hidden",
    shadowColor: "#2563EB", shadowOpacity: 0.3, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  homeBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18 },
  homeBtnText: { fontSize: 16, fontFamily: theme.fonts.bold, color: "#fff" },
});
