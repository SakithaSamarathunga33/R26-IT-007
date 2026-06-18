import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, StatusBar, ScrollView,
  TouchableOpacity, ActivityIndicator, Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { auth } from "../../config/firebase";
import { getAssessmentHistory, AssessmentRecord } from "../../services/sessionService";
import { theme } from "../../theme";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "MainTabs">;
};

const RISK_COLOR  = { low: "#059669", medium: "#D97706", high: "#EF4444" };
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
  { scoreKey: "speech_score",      label: "Speech",      icon: "ear-outline" as const,    color: "#2563EB", iconBg: "#DBEAFE" },
  { scoreKey: "handwriting_score", label: "Handwriting", icon: "pencil-outline" as const, color: "#7C3AED", iconBg: "#EDE9FE" },
  { scoreKey: "behavior_score",    label: "Behaviour",   icon: "happy-outline" as const,  color: "#0891B2", iconBg: "#CFFAFE" },
];

export default function HistoryScreen({ navigation }: Props) {
  const user = auth.currentUser;
  const [history, setHistory] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AssessmentRecord | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user?.uid) return;
      setLoading(true);
      getAssessmentHistory(user.uid)
        .then(setHistory)
        .catch(() => setHistory([]))
        .finally(() => setLoading(false));
    }, [user?.uid])
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>History</Text>
          <Text style={styles.headerSub}>Past assessment reports</Text>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="time-outline" size={14} color="#2563EB" />
          <Text style={styles.headerBadgeText}>{history.length} total</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading history…</Text>
        </View>
      ) : history.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="document-text-outline" size={40} color="#CBD5E1" />
          </View>
          <Text style={styles.emptyTitle}>No assessments yet</Text>
          <Text style={styles.emptySub}>
            Complete all 3 modules (Speech, Handwriting, Behaviour) and run the Final Analysis to generate a report.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("FusionProgress")}
          >
            <LinearGradient colors={["#3B72F6", "#2563EB"]} style={styles.emptyBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="analytics" size={16} color="#fff" />
              <Text style={styles.emptyBtnText}>Go to Final Analysis</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {history.map((record, i) => {
            const level = (record.riskLevel ?? "low") as keyof typeof RISK_COLOR;
            const rc = RISK_COLOR[level] ?? RISK_COLOR.low;
            const rb = RISK_BG[level] ?? RISK_BG.low;
            const rbd = RISK_BORDER[level] ?? RISK_BORDER.low;
            const score = Math.round((record.overallScore ?? 0) * 100);
            const dateStr = record.completedAt?.toDate
              ? record.completedAt.toDate().toLocaleDateString("en-US", {
                  year: "numeric", month: "short", day: "numeric",
                })
              : "—";
            const timeStr = record.completedAt?.toDate
              ? record.completedAt.toDate().toLocaleTimeString("en-US", {
                  hour: "2-digit", minute: "2-digit",
                })
              : "";
            const diffLabel = DIFFICULTY_LABELS[record.primaryDifficulty] ?? record.primaryDifficulty ?? "—";
            const features = record.fullReport?.fusion_features ?? {};

            return (
              <TouchableOpacity
                key={record.id}
                style={styles.card}
                activeOpacity={0.75}
                onPress={() => setSelected(record)}
              >
                {/* Card top row */}
                <View style={styles.cardTop}>
                  <View style={[styles.cardIconWrap, { backgroundColor: rb }]}>
                    <Ionicons name="analytics" size={22} color={rc} />
                  </View>
                  <View style={styles.cardTopInfo}>
                    <Text style={styles.cardDate}>{dateStr}</Text>
                    <Text style={styles.cardTime}>{timeStr}</Text>
                  </View>
                  <View style={[styles.riskPill, { backgroundColor: rb, borderColor: rbd }]}>
                    <View style={[styles.riskDot, { backgroundColor: rc }]} />
                    <Text style={[styles.riskPillText, { color: rc }]}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </View>
                </View>

                {/* Score bar */}
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Overall Risk Score</Text>
                  <Text style={[styles.scoreValue, { color: rc }]}>{score}%</Text>
                </View>
                <View style={styles.scoreTrack}>
                  <View style={[styles.scoreFill, { width: `${score}%` as any, backgroundColor: rc }]} />
                </View>

                {/* Primary difficulty */}
                <View style={styles.diffRow}>
                  <Ionicons name="alert-circle-outline" size={13} color="#94A3B8" />
                  <Text style={styles.diffLabel}>Primary Difficulty:</Text>
                  <Text style={styles.diffValue} numberOfLines={1}>{diffLabel}</Text>
                </View>

                {/* Module mini-bars */}
                <View style={styles.modulesRow}>
                  {MODULE_META.map((m) => {
                    const val = Math.round((Number(features[m.scoreKey] ?? 0)) * 100);
                    return (
                      <View key={m.scoreKey} style={styles.moduleChip}>
                        <View style={[styles.moduleChipIcon, { backgroundColor: m.iconBg }]}>
                          <Ionicons name={m.icon} size={11} color={m.color} />
                        </View>
                        <Text style={[styles.moduleChipVal, { color: m.color }]}>{val}%</Text>
                      </View>
                    );
                  })}
                  <View style={styles.viewDetailChip}>
                    <Text style={styles.viewDetailText}>View full</Text>
                    <Ionicons name="chevron-forward" size={11} color="#2563EB" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 110 }} />
        </ScrollView>
      )}

      {/* Full report detail modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setSelected(null)} />
          {selected && (() => {
            const level = (selected.riskLevel ?? "low") as keyof typeof RISK_COLOR;
            const rc    = RISK_COLOR[level] ?? RISK_COLOR.low;
            const rb    = RISK_BG[level] ?? RISK_BG.low;
            const score = Math.round((selected.overallScore ?? 0) * 100);
            const fp    = selected.fullReport?.final_prediction ?? {};
            const pd    = selected.fullReport?.primary_difficulty ?? {};
            const sec   = selected.fullReport?.secondary_difficulty_label;
            const therapy = selected.fullReport?.therapy_recommendation ?? {};
            const features = selected.fullReport?.fusion_features ?? {};
            const quality  = selected.fullReport?.quality ?? {};
            const dateStr  = selected.completedAt?.toDate
              ? selected.completedAt.toDate().toLocaleDateString("en-US", {
                  year: "numeric", month: "long", day: "numeric",
                })
              : "—";

            return (
              <View style={styles.modalCard}>
                <View style={styles.modalHandle} />

                {/* Modal header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Full Report</Text>
                  <TouchableOpacity onPress={() => setSelected(null)} style={styles.modalCloseBtn}>
                    <Ionicons name="close" size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>

                  {/* Banner */}
                  <LinearGradient colors={RISK_GRAD[level] ?? RISK_GRAD.low} style={styles.modalBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <View style={styles.modalBannerDeco1} />
                    <View style={styles.modalBannerDeco2} />
                    <Ionicons name="document-text-outline" size={28} color="#fff" />
                    <Text style={styles.modalBannerTitle}>Dyslexia Screening Report</Text>
                    <Text style={styles.modalBannerDate}>{dateStr}</Text>
                  </LinearGradient>

                  {/* Result */}
                  <View style={[styles.modalSection, { backgroundColor: rb, borderColor: RISK_BORDER[level] }]}>
                    <View style={styles.modalResultRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.modalRiskLevel, { color: rc }]}>
                          {level.charAt(0).toUpperCase() + level.slice(1)} Risk
                        </Text>
                        <Text style={styles.modalScoreText}>Score: {score}%</Text>
                        <Text style={styles.modalMethod}>{fp.fusion_strategy ?? "weighted_rule_based_fusion"}</Text>
                      </View>
                      <View style={[styles.modalScoreCircle, { borderColor: rc }]}>
                        <Text style={[styles.modalScoreCircleVal, { color: rc }]}>{score}%</Text>
                      </View>
                    </View>
                    <View style={styles.modalTrack}>
                      <View style={[styles.modalFill, { width: `${score}%` as any, backgroundColor: rc }]} />
                    </View>
                    <Text style={styles.modalReliability}>
                      Reliability: {quality.fusion_reliability ?? "medium"}
                    </Text>
                  </View>

                  {/* Difficulty */}
                  <Text style={styles.modalSectionLabel}>Difficulty Areas</Text>
                  <View style={styles.modalInfoCard}>
                    <ModalRow icon="alert-circle" color="#2563EB" label="Primary" value={DIFFICULTY_LABELS[pd.primary_difficulty_label] ?? pd.primary_difficulty_label ?? "—"} />
                    {sec && <ModalRow icon="layers" color="#64748B" label="Secondary" value={DIFFICULTY_LABELS[sec] ?? sec} border />}
                    {pd.confidence != null && (
                      <ModalRow icon="stats-chart" color="#7C3AED" label="Confidence" value={`${Math.round(pd.confidence * 100)}%`} border />
                    )}
                  </View>

                  {/* Module scores */}
                  <Text style={styles.modalSectionLabel}>Module Scores</Text>
                  <View style={styles.modalInfoCard}>
                    {MODULE_META.map((m, i) => {
                      const val = Math.round((Number(features[m.scoreKey] ?? 0)) * 100);
                      const mlevel = val >= 60 ? "high" : val >= 35 ? "medium" : "low";
                      return (
                        <View key={m.scoreKey} style={[styles.modalModuleRow, i > 0 && styles.modalBorder]}>
                          <View style={[styles.modalModuleIcon, { backgroundColor: m.iconBg }]}>
                            <Ionicons name={m.icon} size={16} color={m.color} />
                          </View>
                          <View style={styles.modalModuleInfo}>
                            <Text style={styles.modalModuleName}>{m.label}</Text>
                            <View style={styles.modalModuleBarRow}>
                              <View style={styles.modalModuleTrack}>
                                <View style={[styles.modalModuleFill, { width: `${val}%` as any, backgroundColor: m.color }]} />
                              </View>
                              <Text style={[styles.modalModulePct, { color: m.color }]}>{val}%</Text>
                            </View>
                          </View>
                          <View style={[styles.modalLevelPill, { backgroundColor: RISK_BG[mlevel as keyof typeof RISK_BG], borderColor: RISK_BORDER[mlevel as keyof typeof RISK_BORDER] }]}>
                            <Text style={[styles.modalLevelText, { color: RISK_COLOR[mlevel as keyof typeof RISK_COLOR] }]}>{mlevel}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  {/* Therapy */}
                  {therapy.primary_focus && (
                    <>
                      <Text style={styles.modalSectionLabel}>Therapy Recommendation</Text>
                      <View style={styles.modalInfoCard}>
                        <ModalRow icon="fitness-outline" color="#2563EB" label="Primary Focus" value={therapy.primary_focus} />
                        {therapy.recommended_sessions_per_week && (
                          <ModalRow icon="calendar-outline" color="#7C3AED" label="Sessions / Week" value={String(therapy.recommended_sessions_per_week)} border />
                        )}
                        {therapy.recommendation_intensity && (
                          <ModalRow icon="flame-outline" color="#D97706" label="Intensity" value={therapy.recommendation_intensity} border />
                        )}
                      </View>
                    </>
                  )}

                  {/* Disclaimer */}
                  <View style={styles.modalDisclaimer}>
                    <Ionicons name="shield-checkmark-outline" size={14} color="#2563EB" />
                    <Text style={styles.modalDisclaimerText}>
                      Screening indicators only — not a clinical diagnosis. Consult a qualified professional.
                    </Text>
                  </View>

                  <View style={{ height: 24 }} />
                </ScrollView>
              </View>
            );
          })()}
        </View>
      </Modal>
    </View>
  );
}

function ModalRow({ icon, color, label, value, border }: { icon: any; color: string; label: string; value: string; border?: boolean }) {
  return (
    <View style={[styles.modalRowItem, border && styles.modalBorder]}>
      <View style={styles.modalRowLeft}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={styles.modalRowLabel}>{label}</Text>
      </View>
      <Text style={styles.modalRowValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FF" },

  header: {
    paddingTop: 62, paddingHorizontal: 22, paddingBottom: 20,
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
  },
  headerTitle: { fontSize: 28, fontFamily: theme.fonts.extraBold, color: "#1E293B" },
  headerSub: { fontSize: 13, fontFamily: theme.fonts.regular, color: "#94A3B8", marginTop: 2 },
  headerBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  headerBadgeText: { fontSize: 12, fontFamily: theme.fonts.semiBold, color: "#2563EB" },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 12 },
  loadingText: { fontSize: 14, fontFamily: theme.fonts.regular, color: "#94A3B8", marginTop: 8 },

  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: "#F1F5F9",
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontFamily: theme.fonts.bold, color: "#1E293B" },
  emptySub: { fontSize: 13, fontFamily: theme.fonts.regular, color: "#94A3B8", textAlign: "center", lineHeight: 20 },
  emptyBtn: { borderRadius: 50, overflow: "hidden", marginTop: 8, alignSelf: "stretch" },
  emptyBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  emptyBtnText: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: "#fff" },

  scroll: { paddingHorizontal: 20, paddingTop: 4 },

  card: {
    backgroundColor: "#fff", borderRadius: 22,
    borderWidth: 1, borderColor: "#E8EDF5", padding: 18,
    marginBottom: 14,
    shadowColor: "#94A3B8", shadowOpacity: 0.09,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 14, elevation: 3,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  cardIconWrap: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardTopInfo: { flex: 1 },
  cardDate: { fontSize: 15, fontFamily: theme.fonts.bold, color: "#1E293B" },
  cardTime: { fontSize: 12, fontFamily: theme.fonts.regular, color: "#94A3B8", marginTop: 1 },
  riskPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  riskDot: { width: 6, height: 6, borderRadius: 3 },
  riskPillText: { fontSize: 12, fontFamily: theme.fonts.semiBold },

  scoreRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  scoreLabel: { fontSize: 12, fontFamily: theme.fonts.medium, color: "#64748B" },
  scoreValue: { fontSize: 14, fontFamily: theme.fonts.extraBold },
  scoreTrack: { height: 7, backgroundColor: "#E2E8F0", borderRadius: 4, overflow: "hidden", marginBottom: 12 },
  scoreFill: { height: 7, borderRadius: 4 },

  diffRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 12 },
  diffLabel: { fontSize: 12, fontFamily: theme.fonts.medium, color: "#94A3B8" },
  diffValue: { flex: 1, fontSize: 12, fontFamily: theme.fonts.semiBold, color: "#1E293B", textTransform: "capitalize" },

  modulesRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  moduleChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0",
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4,
  },
  moduleChipIcon: { width: 18, height: 18, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  moduleChipVal: { fontSize: 11, fontFamily: theme.fonts.bold },
  viewDetailChip: {
    flexDirection: "row", alignItems: "center", gap: 2,
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE",
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, marginLeft: "auto",
  },
  viewDetailText: { fontSize: 11, fontFamily: theme.fonts.semiBold, color: "#2563EB" },

  /* Modal */
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.5)" },
  modalCard: {
    backgroundColor: "#F5F7FF", borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingTop: 12, maxHeight: "92%",
    shadowColor: "#000", shadowOpacity: 0.2, shadowOffset: { width: 0, height: -4 }, shadowRadius: 24, elevation: 24,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 16 },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 22, marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontFamily: theme.fonts.bold, color: "#1E293B" },
  modalCloseBtn: {
    width: 34, height: 34, borderRadius: 11, backgroundColor: "#F1F5F9",
    alignItems: "center", justifyContent: "center",
  },
  modalScroll: { paddingHorizontal: 20 },

  modalBanner: {
    borderRadius: 20, padding: 22, alignItems: "center", gap: 6,
    overflow: "hidden", marginBottom: 16,
  },
  modalBannerDeco1: { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.07)", top: -60, right: -40 },
  modalBannerDeco2: { position: "absolute", width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.05)", bottom: -20, left: 10 },
  modalBannerTitle: { fontSize: 17, fontFamily: theme.fonts.bold, color: "#fff" },
  modalBannerDate: { fontSize: 12, fontFamily: theme.fonts.regular, color: "rgba(255,255,255,0.75)" },

  modalSection: {
    borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 16,
  },
  modalResultRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  modalRiskLevel: { fontSize: 18, fontFamily: theme.fonts.extraBold, marginBottom: 2 },
  modalScoreText: { fontSize: 13, fontFamily: theme.fonts.medium, color: "#1E293B" },
  modalMethod: { fontSize: 11, fontFamily: theme.fonts.regular, color: "#94A3B8", marginTop: 2 },
  modalScoreCircle: {
    width: 58, height: 58, borderRadius: 29, borderWidth: 2.5,
    alignItems: "center", justifyContent: "center",
  },
  modalScoreCircleVal: { fontSize: 14, fontFamily: theme.fonts.extraBold },
  modalTrack: { height: 7, backgroundColor: "rgba(0,0,0,0.07)", borderRadius: 4, overflow: "hidden", marginBottom: 6 },
  modalFill: { height: 7, borderRadius: 4 },
  modalReliability: { fontSize: 11, fontFamily: theme.fonts.regular, color: "#94A3B8" },

  modalSectionLabel: {
    fontSize: 11, fontFamily: theme.fonts.semiBold, color: "#94A3B8",
    textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8, marginTop: 4,
  },
  modalInfoCard: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 18, overflow: "hidden", marginBottom: 16,
    shadowColor: "#94A3B8", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 2,
  },
  modalBorder: { borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  modalRowItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14 },
  modalRowLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  modalRowLabel: { fontSize: 13, fontFamily: theme.fonts.medium, color: "#64748B" },
  modalRowValue: { fontSize: 13, fontFamily: theme.fonts.semiBold, color: "#1E293B", flex: 1, textAlign: "right", textTransform: "capitalize" },

  modalModuleRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  modalModuleIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalModuleInfo: { flex: 1, gap: 6 },
  modalModuleName: { fontSize: 13, fontFamily: theme.fonts.semiBold, color: "#1E293B" },
  modalModuleBarRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  modalModuleTrack: { flex: 1, height: 5, backgroundColor: "#E2E8F0", borderRadius: 3, overflow: "hidden" },
  modalModuleFill: { height: 5, borderRadius: 3 },
  modalModulePct: { fontSize: 12, fontFamily: theme.fonts.bold, width: 30, textAlign: "right" },
  modalLevelPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  modalLevelText: { fontSize: 10, fontFamily: theme.fonts.semiBold },

  modalDisclaimer: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE",
    borderRadius: 14, padding: 12, marginBottom: 8,
  },
  modalDisclaimerText: { flex: 1, fontSize: 11, fontFamily: theme.fonts.regular, color: "#3B72F6", lineHeight: 17 },
});
