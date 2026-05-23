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
  navigation: NativeStackNavigationProp<RootStackParamList, "FusionRiskSummary">;
  route: RouteProp<RootStackParamList, "FusionRiskSummary">;
};

const RISK_CONFIG = {
  low: {
    title: "Low Screening Risk",
    message:
      "The completed activities show low overall dyslexia-risk indicators. Continue normal learning support and monitor progress.",
    icon: "checkmark-circle" as const,
    gradColors: ["#059669", "#047857"] as [string, string],
    accentColor: "#059669",
    bgColor: "#ECFDF5",
    borderColor: "#BBF7D0",
  },
  medium: {
    title: "Moderate Screening Risk",
    message:
      "Some activities showed learning-risk indicators. Continue the recommended practice plan and consider teacher or specialist review.",
    icon: "alert-circle" as const,
    gradColors: ["#F59E0B", "#D97706"] as [string, string],
    accentColor: "#D97706",
    bgColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  high: {
    title: "High Screening Risk",
    message:
      "Several activities showed stronger learning-risk indicators. This result should be reviewed with a qualified teacher, therapist, or specialist.",
    icon: "warning" as const,
    gradColors: ["#EF4444", "#DC2626"] as [string, string],
    accentColor: "#EF4444",
    bgColor: "#FFF5F5",
    borderColor: "#FECACA",
  },
};

const RELIABILITY_COLORS = { high: "#059669", medium: "#D97706", low: "#EF4444" };

export default function FusionRiskSummaryScreen({ navigation, route }: Props) {
  const { response } = route.params;
  const fp = response.final_prediction;
  const quality = response.quality;

  const level = (fp.final_dyslexia_risk_level as keyof typeof RISK_CONFIG) ?? "low";
  const config = RISK_CONFIG[level] ?? RISK_CONFIG.low;
  const score = Math.round((fp.overall_risk_score ?? 0) * 100);
  const reliability = quality?.fusion_reliability ?? "medium";

  const modules = [
    { label: "Speech",      value: response.fusion_features?.speech_score, color: "#2563EB" },
    { label: "Handwriting", value: response.fusion_features?.handwriting_score, color: "#7C3AED" },
    { label: "Behaviour",   value: response.fusion_features?.behavior_score, color: "#0891B2" },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Final Risk Summary</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Main result card */}
        <LinearGradient colors={config.gradColors} style={styles.resultCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.decoCircle} />
          <View style={styles.resultIconWrap}>
            <Ionicons name={config.icon} size={48} color="#fff" />
          </View>
          <Text style={styles.resultTitle}>{config.title}</Text>
          <Text style={styles.resultMsg}>{config.message}</Text>

          {/* Score row */}
          <View style={styles.scoreRow}>
            <View style={[styles.scoreStat, styles.scoreStatBorder]}>
              <Text style={styles.scoreVal}>{score}%</Text>
              <Text style={styles.scoreLabel}>Risk Score</Text>
            </View>
            <View style={[styles.scoreStat, styles.scoreStatBorder]}>
              <Text style={styles.scoreVal}>{level.charAt(0).toUpperCase() + level.slice(1)}</Text>
              <Text style={styles.scoreLabel}>Risk Level</Text>
            </View>
            <View style={styles.scoreStat}>
              <Text style={styles.scoreVal}>{reliability.charAt(0).toUpperCase() + reliability.slice(1)}</Text>
              <Text style={styles.scoreLabel}>Reliability</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Risk score bar */}
        <View style={styles.probCard}>
          <View style={styles.probHeader}>
            <Text style={styles.probTitle}>Overall Dyslexia Risk Score</Text>
            <Text style={[styles.probValue, { color: config.accentColor }]}>{score}%</Text>
          </View>
          <View style={styles.probTrack}>
            <View style={[styles.probFill, { width: `${score}%` as any, backgroundColor: config.accentColor }]} />
          </View>
          <View style={styles.probThresholdRow}>
            <Text style={styles.probNote}>Decision threshold: 35%</Text>
            <View style={styles.thresholdMark} />
          </View>
        </View>

        {/* Module contributions */}
        <Text style={styles.sectionLabel}>Module Contributions</Text>
        <View style={styles.modulesCard}>
          {modules.map((m, i) => (
            <View key={i} style={[styles.moduleRow, i < modules.length - 1 && styles.moduleBorder]}>
              <Text style={styles.moduleName}>{m.label}</Text>
              <View style={styles.moduleBarWrap}>
                <View style={styles.moduleTrack}>
                  <View
                    style={[
                      styles.moduleBarFill,
                      {
                        width: `${Math.round((m.value ?? 0) * 100)}%` as any,
                        backgroundColor: m.color,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.moduleVal, { color: m.color }]}>
                  {Math.round((m.value ?? 0) * 100)}%
                </Text>
              </View>
            </View>
          ))}
          <View style={styles.weightsRow}>
            <Text style={styles.weightsText}>
              Weights: Speech {Math.round((fp.weights?.speech_weight ?? 0.4) * 100)}%  ·  Writing {Math.round((fp.weights?.handwriting_weight ?? 0.35) * 100)}%  ·  Behaviour {Math.round((fp.weights?.behavior_weight ?? 0.25) * 100)}%
            </Text>
          </View>
        </View>

        {/* Reliability warning */}
        {reliability === "low" && (
          <View style={styles.warningCard}>
            <Ionicons name="warning-outline" size={18} color="#D97706" />
            <Text style={styles.warningText}>
              Fusion reliability is low due to one or more module outputs having low quality. Consider repeating the affected modules for a more accurate result.
            </Text>
          </View>
        )}

        {/* Quality warnings */}
        {quality?.warnings?.length > 0 && (
          <View style={styles.qWarningCard}>
            {quality.warnings.map((w: string, i: number) => (
              <View key={i} style={styles.qWarningRow}>
                <Ionicons name="alert-circle-outline" size={14} color="#D97706" />
                <Text style={styles.qWarningText}>{w}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#2563EB" />
          <Text style={styles.disclaimerText}>
            This is a <Text style={styles.disclaimerBold}>screening risk indicator only</Text> — not a clinical diagnosis. The result combines speech, handwriting, and behaviour modules. Please consult a qualified professional for a full evaluation.
          </Text>
        </View>

        <View style={{ height: 16 }} />

        {/* Actions */}
        <LinearGradient colors={["#1D4ED8", "#2563EB"]} style={styles.primaryBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <TouchableOpacity
            style={styles.btnInner}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("FusionDifficulty", { response })}
          >
            <Ionicons name="layers-outline" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>View Difficulty Breakdown</Text>
          </TouchableOpacity>
        </LinearGradient>

        <TouchableOpacity
          style={styles.secondaryBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("FusionTherapy", { response })}
        >
          <Ionicons name="fitness-outline" size={18} color="#2563EB" />
          <Text style={styles.secondaryBtnText}>View Therapy Plan</Text>
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

  resultCard: {
    borderRadius: 24, padding: 28, alignItems: "center", marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.2, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 10,
  },
  decoCircle: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.08)", top: -50, right: -50 },
  resultIconWrap: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 3, borderColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  resultTitle: { fontSize: 22, fontFamily: theme.fonts.extraBold, color: "#fff", marginBottom: 10, textAlign: "center" },
  resultMsg: { fontSize: 13, fontFamily: theme.fonts.regular, color: "rgba(255,255,255,0.85)", textAlign: "center", lineHeight: 20, marginBottom: 22 },
  scoreRow: {
    flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", width: "100%",
  },
  scoreStat: { flex: 1, alignItems: "center", paddingVertical: 12 },
  scoreStatBorder: { borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.2)" },
  scoreVal: { fontSize: 18, fontFamily: theme.fonts.extraBold, color: "#fff" },
  scoreLabel: { fontSize: 10, fontFamily: theme.fonts.medium, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 },

  probCard: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 20, padding: 16, marginBottom: 20,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  probHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  probTitle: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: "#1E293B" },
  probValue: { fontSize: 20, fontFamily: theme.fonts.extraBold },
  probTrack: { height: 10, backgroundColor: "#E2E8F0", borderRadius: 5, overflow: "hidden", marginBottom: 8 },
  probFill: { height: 10, borderRadius: 5 },
  probThresholdRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  probNote: { fontSize: 11, fontFamily: theme.fonts.regular, color: "#94A3B8" },
  thresholdMark: { width: 1, height: 10, backgroundColor: "#94A3B8" },

  sectionLabel: { fontSize: 11, fontFamily: theme.fonts.semiBold, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10 },

  modulesCard: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 20, padding: 16, marginBottom: 16,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  moduleRow: { paddingVertical: 10, gap: 8 },
  moduleBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  moduleName: { fontSize: 13, fontFamily: theme.fonts.semiBold, color: "#1E293B" },
  moduleBarWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  moduleTrack: { flex: 1, height: 8, backgroundColor: "#E2E8F0", borderRadius: 4, overflow: "hidden" },
  moduleBarFill: { height: 8, borderRadius: 4 },
  moduleVal: { fontSize: 13, fontFamily: theme.fonts.bold, width: 36, textAlign: "right" },
  weightsRow: { paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9", marginTop: 4 },
  weightsText: { fontSize: 11, fontFamily: theme.fonts.regular, color: "#94A3B8" },

  warningCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A",
    borderRadius: 16, padding: 14, marginBottom: 14,
  },
  warningText: { flex: 1, fontSize: 12, fontFamily: theme.fonts.regular, color: "#92400E", lineHeight: 18 },

  qWarningCard: {
    backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FEF3C7",
    borderRadius: 16, padding: 14, marginBottom: 14, gap: 6,
  },
  qWarningRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  qWarningText: { flex: 1, fontSize: 12, fontFamily: theme.fonts.regular, color: "#92400E" },

  disclaimerCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE",
    borderRadius: 16, padding: 14, marginBottom: 20,
  },
  disclaimerText: { flex: 1, fontSize: 12, fontFamily: theme.fonts.regular, color: "#3B72F6", lineHeight: 18 },
  disclaimerBold: { fontFamily: theme.fonts.semiBold, color: "#1E40AF" },

  primaryBtn: {
    borderRadius: 50, marginBottom: 12,
    shadowColor: "#2563EB", shadowOpacity: 0.3, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  btnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18 },
  primaryBtnText: { fontSize: 16, fontFamily: theme.fonts.bold, color: "#fff" },

  secondaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 16, borderRadius: 50,
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE",
  },
  secondaryBtnText: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: "#2563EB" },
});
