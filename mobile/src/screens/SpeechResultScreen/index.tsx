import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { theme } from "../../theme";
import KidBackground from "../../components/KidBackground";
import { useT } from "../../i18n";
import { SPEECH_TASKS, getLevel, levelTaskCount, nextIndexInLevel, positionInLevel } from "../../config/speechTasks";
import { practiceNext } from "../../utils/practiceFlow";
import { speakFeedback, stopSpeaking } from "../../services/kidFeedback";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "SpeechResult">;
  route: RouteProp<RootStackParamList, "SpeechResult">;
};

// Child-facing: encouragement only. The real risk values are saved with the
// prediction for the adult summary and never shown here.
const CHEER = {
  done:     { label: "Great job!",                 sublabel: "You said it — keep it up!",                           icon: "star" as const,          gradColors: ["#059669", "#047857"] as [string, string] },
  mismatch: { label: "Let's try that word again!", sublabel: "Listen once more, then say it nice and clear.",       icon: "repeat" as const,        gradColors: ["#3B72F6", "#2563EB"] as [string, string] },
  audio:    { label: "Let's record that again!",   sublabel: "Speak a little louder, close to the phone.",          icon: "mic" as const,           gradColors: ["#94A3B8", "#64748B"] as [string, string] },
  error:    { label: "Nice try!",                  sublabel: "We couldn't check this one — that's okay, keep going!", icon: "happy-outline" as const, gradColors: ["#94A3B8", "#64748B"] as [string, string] },
};

export default function SpeechResultScreen({ navigation, route }: Props) {
  const { t } = useT();
  const { taskIndex, retryCount, result, error, practice } = route.params;
  const task = SPEECH_TASKS[taskIndex];
  const level = getLevel(task.level);
  const nextIndex = nextIndexInLevel(taskIndex);
  // "Last" now means last within this level — the level-complete screen handles
  // unlocking the next one (or sending the child to the full summary).
  const isLevelEnd = nextIndex === null;

  // requires_review has two causes: the spoken word didn't match, or the audio was poor.
  const needsRetry =
    result?.prediction?.risk_level === "requires_review" || result?.quality?.prediction_reliability === "low";
  const cheer =
    error || !result ? CHEER.error
    : result.transcript_match === false ? CHEER.mismatch
    : needsRetry ? CHEER.audio
    : CHEER.done;
  const isLowQuality = !!error || !result || needsRetry;

  // Encouragement on arrival. These screens are reached only after the
  // response is submitted, so speaking the outcome cannot change it.
  const spokenRef = useRef(false);
  useEffect(() => {
    if (spokenRef.current) return;
    spokenRef.current = true;
    const timer = setTimeout(() => speakFeedback("done", { seed: taskIndex }), 700);
    return () => clearTimeout(timer);
  }, [taskIndex]);

  useEffect(() => () => stopSpeaking(), []);

  const handleNext = () => {
    stopSpeaking();
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
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>{t("All Done!")}</Text>
        <View style={[styles.levelPill, { backgroundColor: level.bg }]}>
          <Text style={[styles.levelPillText, { color: level.color }]}>
            L{level.id} · {positionInLevel(taskIndex)}/{levelTaskCount(level.id)}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Encouragement card */}
        <LinearGradient colors={cheer.gradColors} style={styles.riskCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.decoCircle} />
          <View style={styles.riskIconWrap}>
            <Ionicons name={cheer.icon} size={48} color="#fff" />
          </View>
          <Text style={styles.riskLabel}>{t(cheer.label)}</Text>
          <Text style={styles.riskSubLabel}>{t(cheer.sublabel)}</Text>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard icon="refresh-outline" label={t("Tries")} value={String(retryCount + 1)} accent="#2563EB" bg="#EFF6FF" />
          <StatCard icon="text-outline" label={t("Word")} value={task.target_word} accent="#7C3AED" bg="#F5F3FF" />
        </View>

        <View style={{ height: 20 }} />

        {isLowQuality && (
          <TouchableOpacity style={styles.reRecordBtn} onPress={() => navigation.replace("SpeechRecording", { taskIndex, practice })} activeOpacity={0.8}>
            <Ionicons name="mic-outline" size={18} color="#64748B" />
            <Text style={styles.reRecordBtnText}>{t("Try Again")}</Text>
          </TouchableOpacity>
        )}

        <LinearGradient colors={["#3B72F6", "#2563EB"]} style={styles.nextBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <TouchableOpacity style={styles.nextBtnInner} onPress={handleNext} activeOpacity={0.88}>
            <Text style={styles.nextBtnText}>
              {practice
                ? (practice.remaining.length ? t("Next Practice") : t("Finish Practice"))
                : isLevelEnd ? t("Finish Level {n}", { n: level.id }) : t("Next Activity")}
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

  statsRow: { flexDirection: "row", gap: 10, width: "100%", marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: "#fff", borderWidth: 1, borderRadius: 16,
    padding: 14, alignItems: "center", gap: 6,
    shadowColor: "#94A3B8", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  statIconWrap: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 14, fontFamily: theme.fonts.bold },
  statLabel: { fontSize: 10, fontFamily: theme.fonts.regular, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5 },

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
