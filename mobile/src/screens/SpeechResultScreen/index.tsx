import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { theme } from "../../theme";
import KidBackground from "../../components/KidBackground";
import { SPEECH_TASKS, getLevel, levelTaskCount, nextIndexInLevel, positionInLevel } from "../../config/speechTasks";
import { practiceNext } from "../../utils/practiceFlow";
import { speakFeedback, stopSpeaking } from "../../services/kidFeedback";
import { playNextSound, playSuccessSound } from "../../services/kidSounds";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "SpeechResult">;
  route: RouteProp<RootStackParamList, "SpeechResult">;
};

const RISK_CONFIG = {
  low: { label: "Low Indicator", sublabel: "Response looks good — keep it up!", color: "#059669", bg: "#ECFDF5", border: "#BBF7D0", icon: "checkmark-circle" as const, gradColors: ["#059669", "#047857"] as [string, string] },
  medium: { label: "Moderate Indicator", sublabel: "Some patterns noted — a review may help.", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: "alert-circle" as const, gradColors: ["#F59E0B", "#D97706"] as [string, string] },
  high: { label: "High Indicator", sublabel: "A specialist review is recommended.", color: "#EF4444", bg: "#FFF5F5", border: "#FECACA", icon: "warning" as const, gradColors: ["#EF4444", "#DC2626"] as [string, string] },
  requires_review: { label: "Needs Review", sublabel: "Audio quality was low — please re-record.", color: "#64748B", bg: "#F8FAFC", border: "#E2E8F0", icon: "refresh-circle" as const, gradColors: ["#94A3B8", "#64748B"] as [string, string] },
};

export default function SpeechResultScreen({ navigation, route }: Props) {
  const { taskIndex, retryCount, result, error, practice } = route.params;
  const task = SPEECH_TASKS[taskIndex];
  const level = getLevel(task.level);
  const nextIndex = nextIndexInLevel(taskIndex);
  // "Last" now means last within this level — the level-complete screen handles
  // unlocking the next one (or sending the child to the full summary).
  const isLevelEnd = nextIndex === null;

  const riskLevel: keyof typeof RISK_CONFIG = error || !result ? "requires_review" : result?.prediction?.risk_level ?? "requires_review";
  const config = RISK_CONFIG[riskLevel];
  const probability: number = result?.prediction?.risk_probability ?? null;
  const qualityWarnings: string[] = result?.quality?.warnings ?? [];
  const reliability: string = result?.quality?.prediction_reliability ?? "—";
  const isLowQuality = reliability === "low" || riskLevel === "requires_review";

  const reliabilityColor = reliability === "high" ? "#059669" : reliability === "medium" ? "#D97706" : "#EF4444";
  const reliabilityBg = reliability === "high" ? "#ECFDF5" : reliability === "medium" ? "#FFFBEB" : "#FFF5F5";

  // Encouragement on arrival. These screens are reached only after the
  // response is submitted, so speaking the outcome cannot change it.
  const spokenRef = useRef(false);
  useEffect(() => {
    if (spokenRef.current) return;
    spokenRef.current = true;
    playSuccessSound();
    const t = setTimeout(() => speakFeedback("done", { seed: taskIndex }), 700);
    return () => clearTimeout(t);
  }, [taskIndex]);

  useEffect(() => () => stopSpeaking(), []);

  const handleNext = () => {
    stopSpeaking();
    playNextSound();
    // Practice runs belong to a therapy plan: step through that activity's own
    // task list, then hand back to the plan instead of unlocking a level.
    if (practice) {
      const step = practiceNext(practice);
      if (step.kind === "next-task") {
        navigation.replace("SpeechActivity", { taskIndex: step.taskIndex, practice: step.practice });
      } else {
        navigation.replace("FusionTherapy", {
          response: step.response,
          reportId: practice.reportId ?? undefined,
          completedActivityId: step.activityId,
        });
      }
      return;
    }
    isLevelEnd
      ? navigation.replace("SpeechLevelComplete", { level: task.level })
      : navigation.replace("SpeechActivity", { taskIndex: nextIndex! });
  };

  return (
    <View style={styles.container}>
      <KidBackground variant="speech" />
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />

      <View style={styles.header}>
        <View style={{ width: 62 }} />
        <Text style={styles.headerTitle}>Screening Result</Text>
        <View style={[styles.levelPill, { backgroundColor: level.bg }]}>
          <Text style={[styles.levelPillText, { color: level.color }]}>
            L{level.id} · {positionInLevel(taskIndex)}/{levelTaskCount(level.id)}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Risk card */}
        <LinearGradient colors={config.gradColors} style={styles.riskCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.decoCircle} />
          <View style={styles.riskIconWrap}>
            <Ionicons name={config.icon} size={48} color="#fff" />
          </View>
          <Text style={styles.riskLabel}>{config.label}</Text>
          <Text style={styles.riskSubLabel}>{config.sublabel}</Text>
        </LinearGradient>

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
          <Text style={styles.disclaimerText}>
            This is a <Text style={styles.disclaimerBold}>screening indicator only</Text>, not a clinical diagnosis. Always consult a qualified specialist.
          </Text>
        </View>

        {/* Probability bar */}
        {probability !== null && (
          <View style={[styles.probCard, { borderColor: config.border }]}>
            <View style={styles.probHeader}>
              <Text style={styles.probTitle}>Risk Probability</Text>
              <Text style={[styles.probValue, { color: config.color }]}>{(probability * 100).toFixed(1)}%</Text>
            </View>
            <View style={styles.probTrack}>
              <LinearGradient
                colors={config.gradColors}
                style={[styles.probFill, { width: `${probability * 100}%` }]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              />
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard icon="shield-checkmark-outline" label="Reliability" value={reliability} accent={reliabilityColor} bg={reliabilityBg} />
          <StatCard icon="refresh-outline" label="Retries" value={String(retryCount)} accent="#2563EB" bg="#EFF6FF" />
          <StatCard icon="text-outline" label="Word" value={task.target_word} accent="#7C3AED" bg="#F5F3FF" />
        </View>

        {/* Warnings */}
        {qualityWarnings.length > 0 && (
          <View style={styles.warningsCard}>
            <View style={styles.warningsHeader}>
              <Ionicons name="warning-outline" size={16} color="#D97706" />
              <Text style={styles.warningsTitle}>Audio Warnings</Text>
            </View>
            {qualityWarnings.map((w, i) => (
              <Text key={i} style={styles.warningItem}>• {w}</Text>
            ))}
          </View>
        )}

        {/* Error state */}
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="cloud-offline-outline" size={18} color="#EF4444" />
            <Text style={styles.errorText}>Could not reach the analysis server. Result saved as requires review.</Text>
          </View>
        )}

        <View style={{ height: 20 }} />

        {isLowQuality && (
          <TouchableOpacity style={styles.reRecordBtn} onPress={() => navigation.replace("SpeechRecording", { taskIndex, practice })} activeOpacity={0.8}>
            <Ionicons name="mic-outline" size={18} color="#64748B" />
            <Text style={styles.reRecordBtnText}>Re-record This Activity</Text>
          </TouchableOpacity>
        )}

        <LinearGradient colors={["#3B72F6", "#2563EB"]} style={styles.nextBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <TouchableOpacity style={styles.nextBtnInner} onPress={handleNext} activeOpacity={0.88}>
            <Text style={styles.nextBtnText}>
              {practice
                ? (practice.remaining.length ? "Next Practice" : "Finish Practice")
                : isLevelEnd ? `Finish Level ${level.id}` : "Next Activity"}
            </Text>
            <Ionicons
              name={practice
                ? (practice.remaining.length ? "arrow-forward" : "checkmark-done")
                : isLevelEnd ? "trophy-outline" : "arrow-forward"}
              size={18} color="#fff"
            />
          </TouchableOpacity>
        </LinearGradient>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, label, value, accent, bg }: { icon: any; label: string; value: string; accent: string; bg: string }) {
  return (
    <View style={[styles.statCard, { borderColor: bg }]}>
      <View style={[styles.statIconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={16} color={accent} />
      </View>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FF" },
  header: {
    paddingTop: 58, paddingHorizontal: 20, paddingBottom: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  headerTitle: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: "#1E293B" },
  levelPill: { minWidth: 62, alignItems: "center", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  levelPillText: { fontSize: 11, fontFamily: theme.fonts.semiBold },
  content: { paddingHorizontal: 20, paddingTop: 8, alignItems: "center" },

  riskCard: {
    width: "100%", borderRadius: 24, padding: 28, alignItems: "center", marginBottom: 16,
    overflow: "hidden", shadowOpacity: 0.28, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 10,
  },
  decoCircle: { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.07)", top: -50, right: -40 },
  riskIconWrap: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.2)", borderWidth: 3, borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  riskLabel: { fontSize: 22, fontFamily: theme.fonts.extraBold, color: "#fff", marginBottom: 6 },
  riskSubLabel: { fontSize: 13, fontFamily: theme.fonts.regular, color: "rgba(255,255,255,0.82)", textAlign: "center", lineHeight: 19 },

  disclaimerCard: {
    width: "100%", flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE",
    borderRadius: 16, padding: 14, marginBottom: 14,
  },
  disclaimerText: { flex: 1, fontSize: 12, fontFamily: theme.fonts.regular, color: "#3B72F6", lineHeight: 18 },
  disclaimerBold: { fontFamily: theme.fonts.semiBold, color: "#1E40AF" },

  probCard: {
    width: "100%", backgroundColor: "#fff",
    borderWidth: 1, borderRadius: 20, padding: 18, marginBottom: 14,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  probHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  probTitle: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: "#1E293B" },
  probValue: { fontSize: 20, fontFamily: theme.fonts.extraBold },
  probTrack: { height: 8, backgroundColor: "#F1F5F9", borderRadius: 4, overflow: "hidden" },
  probFill: { height: 8, borderRadius: 4 },

  statsRow: { flexDirection: "row", gap: 10, width: "100%", marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: "#fff", borderWidth: 1, borderRadius: 16,
    padding: 14, alignItems: "center", gap: 6,
    shadowColor: "#94A3B8", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  statIconWrap: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 14, fontFamily: theme.fonts.bold },
  statLabel: { fontSize: 10, fontFamily: theme.fonts.regular, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5 },

  warningsCard: {
    width: "100%", backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A",
    borderRadius: 16, padding: 14, marginBottom: 10, gap: 6,
  },
  warningsHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  warningsTitle: { fontSize: 13, fontFamily: theme.fonts.semiBold, color: "#D97706" },
  warningItem: { fontSize: 12, fontFamily: theme.fonts.regular, color: "#92400E", lineHeight: 18 },

  errorCard: {
    width: "100%", flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#FFF5F5", borderWidth: 1, borderColor: "#FECACA",
    borderRadius: 16, padding: 14, marginBottom: 10,
  },
  errorText: { flex: 1, fontSize: 12, fontFamily: theme.fonts.regular, color: "#EF4444", lineHeight: 18 },

  reRecordBtn: {
    width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 16, borderRadius: 50,
    backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E2E8F0", marginBottom: 12,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  reRecordBtnText: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: "#64748B" },

  nextBtn: {
    width: "100%", borderRadius: 50,
    shadowColor: "#2563EB", shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  nextBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18 },
  nextBtnText: { fontSize: 16, fontFamily: theme.fonts.bold, color: "#fff" },
});
