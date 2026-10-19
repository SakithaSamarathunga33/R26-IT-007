/**
 * FusionReportScreen
 * The full, detailed assessment report: final result, difficulty areas, module summaries, therapy plan summary,
 * recommended activities and quality warnings.
 * Flow: FusionTherapy ("View Full Report") -> FusionReport -> back to the dashboard (MainTabs) via "Back to Dashboard".
 * All data comes from the multi_modal_risk backend response passed in the route (no new API call here).
 * Uses config/riskThresholds (score -> risk level), fusionService (method label), i18n and KidBackground.
 */
import React from "react";
import { fusionMethodLabel } from "../../services/fusionService";
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
import { riskLevelFromScore } from "../../config/riskThresholds";
import { useT } from "../../i18n";

// Navigation + route (response = the full fusion result from the backend).
type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "FusionReport">;
  route: RouteProp<RootStackParamList, "FusionReport">;
};

// Risk colours: green = low, orange = medium, red = high, grey = not enough evidence.
// RISK_BG / RISK_BORDER = soft box colours, RISK_GRAD = banner gradient.
const RISK_COLORS = { low: "#059669", medium: "#D97706", high: "#EF4444", insufficient: "#64748B" };
const RISK_BG     = { low: "#ECFDF5", medium: "#FFFBEB", high: "#FFF5F5", insufficient: "#F8FAFC" };
const RISK_BORDER = { low: "#BBF7D0", medium: "#FDE68A", high: "#FECACA", insufficient: "#E2E8F0" };
const RISK_GRAD: Record<string, [string, string]> = {
  low:    ["#059669", "#047857"],
  medium: ["#F59E0B", "#D97706"],
  high:   ["#EF4444", "#DC2626"],
  insufficient: ["#94A3B8", "#64748B"],
};

// Friendly names for the difficulty codes the backend sends.
const DIFFICULTY_LABELS: Record<string, string> = {
  phonological_processing: "Phonological Processing",
  handwriting:             "Handwriting",
  attention_behavior:      "Attention & Behaviour",
};

// Display info for the three module rows (blue = speech, purple = handwriting, teal = behaviour); scoreKey = field in fusion_features.
const MODULE_META = [
  { key: "speech",      label: "Speech",      sublabel: "Phonological",  icon: "ear-outline" as const,    color: "#2563EB", iconBg: "#DBEAFE", scoreKey: "speech_score" },
  { key: "handwriting", label: "Handwriting", sublabel: "Handwriting",   icon: "pencil-outline" as const, color: "#7C3AED", iconBg: "#EDE9FE", scoreKey: "handwriting_score" },
  { key: "behaviour",   label: "Behaviour",   sublabel: "Attention",     icon: "happy-outline" as const,  color: "#0891B2", iconBg: "#CFFAFE", scoreKey: "behavior_score" },
];

// Small section heading used between report blocks.
function Section({ title }: { title: string }) {
  const { t } = useT();
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>{t(title)}</Text>
    </View>
  );
}

// Main screen: builds the report from the backend response.
export default function FusionReportScreen({ navigation, route }: Props) {
  const { t } = useT();
  const { response } = route.params;
  const fp     = response.final_prediction ?? {};
  const pd     = response.primary_difficulty ?? {};
  const sec    = response.secondary_difficulty_label;
  const therapy = response.therapy_recommendation ?? {};
  const quality = response.quality ?? {};
  const features = response.fusion_features ?? {};
  const cs = response.component_statuses ?? {};
  // insufficient_evidence nulls the score, level, difficulty and therapy plan.
  const insufficient = response.review_status === "insufficient_evidence" || fp.overall_risk_score == null;

  const level: keyof typeof RISK_COLORS = insufficient ? "insufficient" : (fp.final_dyslexia_risk_level ?? "low");
  const score = Math.round((fp.overall_risk_score ?? 0) * 100);
  const gradColors = RISK_GRAD[level] ?? RISK_GRAD.low;

  // Today's date, shown in the banner as the report date.
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
      <KidBackground variant="therapy" />
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("Full Assessment Report")}</Text>
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
          <Text style={styles.bannerTitle}>{t("Dyslexia Screening Report")}</Text>
          <Text style={styles.bannerDate}>{t("Generated {date}", { date: generatedDate })}</Text>
          <View style={styles.bannerBadgeRow}>
            <View style={styles.bannerBadge}>
              <Text style={styles.bannerBadgeText}>{t("Multi-Modal Fusion")}</Text>
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
                {insufficient ? t("Not Enough Evidence Yet") : t("{level} Screening Risk", { level: t(level.charAt(0).toUpperCase() + level.slice(1)) })}
              </Text>
              <Text style={styles.resultScore}>
                {insufficient ? t("Complete more activities to get a screening result.") : t("Overall Risk Score: {score}%", { score })}
              </Text>
              <Text style={styles.resultMethod}>{t("Method: {method}", { method: fusionMethodLabel(fp.fusion_strategy) })}</Text>
              {!insufficient && typeof fp.risk_probability === "number" && (
                <Text style={styles.resultMethod}>{t("Model confidence of risk: {pct}%", { pct: Math.round(fp.risk_probability * 100) })}{fp.borderline ? " " + t("(borderline — review advised)") : ""}</Text>
              )}
            </View>
            <View style={[styles.scoreCircle, { borderColor: RISK_COLORS[level] }]}>
              <Text style={[styles.scoreCircleVal, { color: RISK_COLORS[level] }]}>{insufficient ? "—" : `${score}%`}</Text>
            </View>
          </View>
          <View style={styles.resultTrack}>
            <View style={[styles.resultFill, { width: `${insufficient ? 0 : score}%` as any, backgroundColor: RISK_COLORS[level] }]} />
          </View>
          <Text style={styles.resultThreshold}>{t("Threshold: 35%  ·  Reliability: {level}", { level: t(quality.fusion_reliability ?? "medium") })}</Text>
          {response.review_status === "review_recommended" && (
            <Text style={styles.resultThreshold}>
              {response.disagreement_indicator?.flagged
                ? t("Review recommended — module results disagree. Please discuss with a teacher or specialist.")
                : t("Review recommended. Please discuss with a teacher or specialist.")}
            </Text>
          )}
        </View>

        {/* Difficulty */}
        {!insufficient && (
        <>
        <Section title="Difficulty Areas" />
        <View style={styles.diffCard}>
          <View style={styles.diffRow}>
            <View style={styles.diffLabel}>
              <Ionicons name="alert-circle" size={14} color="#2563EB" />
              <Text style={styles.diffKey}>{t("Primary Difficulty")}</Text>
            </View>
            <Text style={styles.diffVal}>{DIFFICULTY_LABELS[pd.primary_difficulty_label] ? t(DIFFICULTY_LABELS[pd.primary_difficulty_label]) : pd.primary_difficulty_label}</Text>
          </View>
          {pd.confidence != null && (
            <View style={[styles.diffRow, styles.diffBorder]}>
              <View style={styles.diffLabel}>
                <Ionicons name="stats-chart" size={14} color="#7C3AED" />
                <Text style={styles.diffKey}>{t("Model Confidence")}</Text>
              </View>
              <Text style={styles.diffVal}>{Math.round(pd.confidence * 100)}%</Text>
            </View>
          )}
          <View style={[styles.diffRow, styles.diffBorder]}>
            <View style={styles.diffLabel}>
              <Ionicons name="git-branch" size={14} color="#0891B2" />
              <Text style={styles.diffKey}>{t("Method")}</Text>
            </View>
            <Text style={styles.diffVal}>
              {pd.method === "xgboost_primary_difficulty_model" ? t("AI Model") : t("Rule-based")}
            </Text>
          </View>
          {sec && (
            <View style={[styles.diffRow, styles.diffBorder]}>
              <View style={styles.diffLabel}>
                <Ionicons name="layers" size={14} color="#64748B" />
                <Text style={styles.diffKey}>{t("Secondary Difficulty")}</Text>
              </View>
              <Text style={styles.diffVal}>{DIFFICULTY_LABELS[sec] ? t(DIFFICULTY_LABELS[sec]) : sec}</Text>
            </View>
          )}
        </View>
        </>
        )}

        {/* Module summaries */}
        <Section title="Module Summaries" />
        <View style={styles.modulesCard}>
          {MODULE_META.map((m, i) => {
            const val = Number(features[m.scoreKey] ?? 0);
            const usable = cs[m.key === "behaviour" ? "behavior" : m.key]?.usable !== false;
            const mlevel = usable ? riskLevelFromScore(val) : "insufficient";
            return (
              <View key={i} style={[styles.moduleRow, i < MODULE_META.length - 1 && styles.moduleBorder]}>
                <View style={[styles.moduleIcon, { backgroundColor: m.iconBg }]}>
                  <Ionicons name={m.icon} size={18} color={m.color} />
                </View>
                <View style={styles.moduleInfo}>
                  <Text style={styles.moduleName}>{t(m.label)}</Text>
                  <Text style={styles.moduleSub}>{t(m.sublabel)}</Text>
                  <View style={styles.moduleBarRow}>
                    <View style={styles.moduleTrack}>
                      <View style={[styles.moduleBarFill, { width: `${Math.round(val * 100)}%` as any, backgroundColor: m.color }]} />
                    </View>
                    <Text style={[styles.modulePercent, { color: m.color }]}>{Math.round(val * 100)}%</Text>
                  </View>
                </View>
                <View style={[styles.moduleLevelPill, { backgroundColor: RISK_BG[mlevel], borderColor: RISK_BORDER[mlevel] }]}>
                  <Text style={[styles.moduleLevelText, { color: RISK_COLORS[mlevel] }]}>{usable ? t(mlevel.charAt(0).toUpperCase() + mlevel.slice(1)) : t("n/a")}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Therapy summary */}
        {!insufficient && (
        <>
        <Section title="Therapy Recommendation" />
        <View style={styles.therapyCard}>
          <View style={styles.therapyRow}>
            <Ionicons name="fitness-outline" size={16} color="#2563EB" />
            <Text style={styles.therapyLabel}>{t("Primary Focus")}</Text>
            <Text style={styles.therapyVal}>{therapy.primary_focus}</Text>
          </View>
          <View style={[styles.therapyRow, styles.therapyBorder]}>
            <Ionicons name="calendar-outline" size={16} color="#7C3AED" />
            <Text style={styles.therapyLabel}>{t("Sessions / Week")}</Text>
            <Text style={styles.therapyVal}>{therapy.recommended_sessions_per_week}</Text>
          </View>
          <View style={[styles.therapyRow, styles.therapyBorder]}>
            <Ionicons name="flame-outline" size={16} color="#D97706" />
            <Text style={styles.therapyLabel}>{t("Intensity")}</Text>
            <Text style={styles.therapyVal}>{therapy.recommendation_intensity}</Text>
          </View>
          <View style={[styles.therapyRow, styles.therapyBorder]}>
            <Ionicons name="list-outline" size={16} color="#0891B2" />
            <Text style={styles.therapyLabel}>{t("Activities")}</Text>
            <Text style={styles.therapyVal}>{t("{n} recommended", { n: (therapy.recommended_activities ?? []).length })}</Text>
          </View>
        </View>
        </>
        )}

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
                      <Text style={styles.actMetaText}>{t("{n} min", { n: act.duration_minutes })}</Text>
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
            <Text style={styles.disclaimerBold}>{t("This report contains screening risk indicators only, not a clinical diagnosis.")}</Text>{" "}{t("Results combine speech, handwriting, and behaviour module outputs using {method}. Please consult a qualified teacher, therapist, or specialist for a full evaluation.", { method: fusionMethodLabel(fp.fusion_strategy) })}
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
            <Text style={styles.homeBtnText}>{t("Back to Dashboard")}</Text>
          </LinearGradient>
        </TouchableOpacity>

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

  /* Banner: gradient colour = overall risk level; white text, see-through white badges and circles */
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

  /* Section headings: light grey small caps */
  sectionHeaderRow: { marginTop: 4, marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontFamily: theme.fonts.semiBold, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1.2 },

  /* Result card: border and fill colours are set from the risk level in the code */
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

  /* Difficulty card: white card with light grey divider lines */
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

  /* Module rows: white card, bar colour = module colour, level pill uses risk colours */
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

  /* Therapy summary card: white card with light grey divider lines */
  therapyCard: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 20, padding: 16, marginBottom: 20,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  therapyRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  therapyBorder: { borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  therapyLabel: { flex: 1, fontSize: 13, fontFamily: theme.fonts.medium, color: "#64748B" },
  therapyVal: { fontSize: 13, fontFamily: theme.fonts.semiBold, color: "#1E293B" },

  /* Activity list: white card; blue number boxes */
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

  /* Quality warnings: yellow background with brown text */
  qCard: {
    backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A",
    borderRadius: 16, padding: 14, marginBottom: 16,
  },
  qRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 4 },
  qBorder: { borderTopWidth: 1, borderTopColor: "#FEF3C7", marginTop: 4, paddingTop: 8 },
  qText: { flex: 1, fontSize: 12, fontFamily: theme.fonts.regular, color: "#92400E", lineHeight: 18 },

  /* Disclaimer: light blue background, blue text (dark blue for the bold part) */
  disclaimerCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE",
    borderRadius: 16, padding: 14, marginBottom: 20,
  },
  disclaimerText: { flex: 1, fontSize: 12, fontFamily: theme.fonts.regular, color: "#3B72F6", lineHeight: 18 },
  disclaimerBold: { fontFamily: theme.fonts.semiBold, color: "#1E40AF" },

  /* Dashboard button: blue gradient pill with white text */
  homeBtn: {
    borderRadius: 50, overflow: "hidden",
    shadowColor: "#2563EB", shadowOpacity: 0.3, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  homeBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18 },
  homeBtnText: { fontSize: 16, fontFamily: theme.fonts.bold, color: "#fff" },
});
