import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { theme } from "../../theme";
import {
  BEHAVIOR_TASKS, BEHAVIOR_TASK_TYPE_LABELS,
  getBehaviorLevel, behaviorLevelTaskCount,
  behaviorNextIndexInLevel, behaviorPositionInLevel,
} from "../../config/behaviorTasks";
import { practiceNext } from "../../utils/practiceFlow";
import { speakFeedback, stopSpeaking } from "../../services/kidFeedback";
import { BehaviorFeatures } from "../../utils/behaviorFeatures";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "BehaviorResult">;
  route: RouteProp<RootStackParamList, "BehaviorResult">;
};

const RISK_CONFIG = {
  low:             { label: "Low Indicator",    sublabel: "Response looks good — keep it up!",          color: "#059669", gradColors: ["#059669", "#047857"] as [string, string], icon: "checkmark-circle" as const },
  medium:          { label: "Moderate Indicator", sublabel: "Some patterns noted — a review may help.", color: "#D97706", gradColors: ["#F59E0B", "#D97706"] as [string, string], icon: "alert-circle" as const },
  high:            { label: "High Indicator",   sublabel: "A specialist review is recommended.",        color: "#EF4444", gradColors: ["#EF4444", "#DC2626"] as [string, string], icon: "warning" as const },
  requires_review: { label: "Needs Review",     sublabel: "Could not analyse — data may be incomplete.", color: "#64748B", gradColors: ["#94A3B8", "#64748B"] as [string, string], icon: "refresh-circle" as const },
};

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={scoreBarStyles.row}>
      <Text style={scoreBarStyles.label}>{label}</Text>
      <View style={scoreBarStyles.track}>
        <View style={[scoreBarStyles.fill, { width: `${Math.round(value * 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={[scoreBarStyles.value, { color }]}>{Math.round(value * 100)}%</Text>
    </View>
  );
}

const scoreBarStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  label: { fontSize: 12, fontFamily: theme.fonts.medium, color: "#64748B", width: 80 },
  track: { flex: 1, height: 6, backgroundColor: "#E2E8F0", borderRadius: 3, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3 },
  value: { fontSize: 12, fontFamily: theme.fonts.bold, width: 36, textAlign: "right" },
});

export default function BehaviorResultScreen({ navigation, route }: Props) {
  const { taskIndex, isCorrect, selectedOption, elapsed, attemptCount, hintCount, features, result, error, practice } = route.params;
  const task = BEHAVIOR_TASKS[taskIndex];
  const level = getBehaviorLevel(task.level);
  const nextIndex = behaviorNextIndexInLevel(taskIndex);
  // "Last" now means last within this level — the level-complete screen handles
  // unlocking the next one (or sending the child to the full summary).
  const isLevelEnd = nextIndex === null;

  const riskLevel: keyof typeof RISK_CONFIG =
    !result ? "requires_review"
    : result?.prediction?.risk_level ?? "requires_review";
  const config = RISK_CONFIG[riskLevel];
  const probability: number | null = result?.prediction?.risk_probability ?? null;

  // Same "Done!" as the speech and writing modules — the spoken line marks the
  // end of an activity, not the outcome. Right or wrong is shown visually by
  // the emoji and card colour, so the voice stays identical everywhere.
  const spokenRef = useRef(false);
  useEffect(() => {
    if (spokenRef.current) return;
    spokenRef.current = true;
    const t = setTimeout(() => speakFeedback("done", { seed: taskIndex }), 400);
    return () => clearTimeout(t);
  }, [taskIndex]);

  useEffect(() => () => stopSpeaking(), []);

  // A springy pop on the answer card so the outcome feels like an event, not a
  // form field — this is the moment a child actually looks at.
  const popAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    popAnim.setValue(0);
    Animated.spring(popAnim, { toValue: 1, useNativeDriver: true, friction: 4, tension: 70 }).start();
  }, [taskIndex]);
  const popScale = popAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });

  const handleNext = () => {
    stopSpeaking();
    // Practice runs belong to a therapy plan: step through that activity's own
    // task list, then hand back to the plan instead of unlocking a level.
    if (practice) {
      const step = practiceNext(practice);
      if (step.kind === "next-task") {
        navigation.replace("BehaviorActivity", { taskIndex: step.taskIndex, practice: step.practice });
      } else {
        navigation.replace("FusionTherapy", {
          response: step.response,
          reportId: practice.reportId ?? undefined,
          completedActivityId: step.activityId,
        });
      }
      return;
    }
    if (isLevelEnd) {
      navigation.replace("BehaviorLevelComplete", { level: task.level });
    } else {
      navigation.replace("BehaviorActivity", { taskIndex: nextIndex! });
    }
  };

  const f = features as BehaviorFeatures | null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />

      <View style={styles.header}>
        <View style={{ width: 62 }} />
        <Text style={styles.headerTitle}>Activity Result</Text>
        <View style={[styles.levelPill, { backgroundColor: level.bg }]}>
          <Text style={[styles.levelPillText, { color: level.color }]}>
            L{level.id} · {behaviorPositionInLevel(taskIndex)}/{behaviorLevelTaskCount(level.id)}
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
          <Text style={styles.riskSub}>{config.sublabel}</Text>
          {probability !== null && (
            <View style={styles.probBadge}>
              <Text style={styles.probText}>Risk score: {Math.round(probability * 100)}%</Text>
            </View>
          )}
        </LinearGradient>

        {/* Answer result — the part a child actually reacts to */}
        <Animated.View style={{ width: "100%", transform: [{ scale: popScale }] }}>
          <View style={[styles.answerCard, { borderColor: isCorrect ? "#86EFAC" : "#FDBA74", backgroundColor: isCorrect ? "#ECFDF5" : "#FFF7ED" }]}>
            <Text style={styles.answerEmoji}>{isCorrect ? "🎉" : "💪"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.answerTitle, { color: isCorrect ? "#059669" : "#C2410C" }]}>
                {/* "Good try" rather than "Incorrect": this is a screening, so a
                    struggling child sees this often and must not feel scolded. */}
                {isCorrect ? "Correct!" : "Good try!"}
              </Text>
              {selectedOption && (
                <Text style={styles.answerSub}>
                  You chose: <Text style={{ fontFamily: theme.fonts.semiBold }}>{selectedOption}</Text>
                  {!isCorrect && ` · Answer: ${task.correct_answer}`}
                </Text>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Stats card */}
        <View style={styles.statsCard}>
          <Text style={styles.sectionLabel}>Activity Stats</Text>
          {[
            { icon: "text-outline" as const, iconColor: "#2563EB", iconBg: "#EFF6FF", label: "Task", value: BEHAVIOR_TASK_TYPE_LABELS[task.task_type] },
            { icon: "time-outline" as const, iconColor: "#D97706", iconBg: "#FFFBEB", label: "Duration", value: `${elapsed}s` },
            { icon: "repeat-outline" as const, iconColor: "#7C3AED", iconBg: "#F5F3FF", label: "Attempts", value: `${attemptCount}` },
            { icon: "bulb-outline" as const, iconColor: "#0891B2", iconBg: "#ECFEFF", label: "Hints used", value: `${hintCount}`, last: true },
          ].map((row, i) => (
            <View key={i} style={[styles.statsRow, row.last ? {} : styles.statsRowBorder]}>
              <View style={[styles.statsIcon, { backgroundColor: row.iconBg }]}>
                <Ionicons name={row.icon} size={15} color={row.iconColor} />
              </View>
              <Text style={styles.statsLabel}>{row.label}</Text>
              <Text style={styles.statsValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Score bars */}
        {f && (
          <View style={styles.scoresCard}>
            <Text style={styles.sectionLabel}>Behaviour Scores</Text>
            <ScoreBar label="Attention" value={f.attention_score} color="#0891B2" />
            <ScoreBar label="Engagement" value={f.engagement_score} color="#7C3AED" />
            <ScoreBar label="Consistency" value={f.interaction_consistency_score} color="#059669" />
            <ScoreBar label="Frustration" value={1 - f.frustration_indicator_score} color="#D97706" />
          </View>
        )}

        {error && error !== "Skipped" && (
          <View style={styles.errorCard}>
            <Ionicons name="warning-outline" size={16} color="#D97706" />
            <Text style={styles.errorText}>Analysis unavailable: {error}</Text>
          </View>
        )}

        <View style={{ height: 20 }} />

        <LinearGradient colors={["#0891B2", "#0E7490"]} style={styles.nextBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
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
  headerTitle: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: "#1E293B" },
  levelPill: { minWidth: 62, alignItems: "center", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  levelPillText: { fontSize: 11, fontFamily: theme.fonts.semiBold },
  content: { paddingHorizontal: 20 },

  riskCard: {
    borderRadius: 24, padding: 28, alignItems: "center", marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.15, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 10,
  },
  decoCircle: { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.08)", top: -50, right: -40 },
  riskIconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 3, borderColor: "rgba(255,255,255,0.35)", alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  riskLabel: { fontSize: 22, fontFamily: theme.fonts.extraBold, color: "#fff", marginBottom: 4 },
  riskSub: { fontSize: 13, fontFamily: theme.fonts.regular, color: "rgba(255,255,255,0.8)", textAlign: "center", marginBottom: 14 },
  probBadge: {
    backgroundColor: "rgba(255,255,255,0.2)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
  },
  probText: { fontSize: 13, fontFamily: theme.fonts.semiBold, color: "#fff" },

  answerCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderWidth: 2.5, borderRadius: 22, padding: 18, marginBottom: 14,
  },
  answerEmoji: { fontSize: 38 },
  answerTitle: { fontSize: 22, fontFamily: theme.fonts.extraBold, marginBottom: 3 },
  answerSub: { fontSize: 13, fontFamily: theme.fonts.regular, color: "#64748B" },

  statsCard: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 20, marginBottom: 14, overflow: "hidden",
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  sectionLabel: { fontSize: 11, fontFamily: theme.fonts.semiBold, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1.2, padding: 16, paddingBottom: 8 },
  statsRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingHorizontal: 16, gap: 12 },
  statsRowBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  statsIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statsLabel: { flex: 1, fontSize: 14, fontFamily: theme.fonts.medium, color: "#1E293B" },
  statsValue: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: "#64748B" },

  scoresCard: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 20, padding: 16, marginBottom: 14,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },

  errorCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FEF3C7",
    borderRadius: 14, padding: 12, marginBottom: 14,
  },
  errorText: { flex: 1, fontSize: 12, fontFamily: theme.fonts.regular, color: "#92400E" },

  nextBtn: {
    borderRadius: 50,
    shadowColor: "#0891B2", shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  nextBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18 },
  nextBtnText: { fontSize: 15, fontFamily: theme.fonts.bold, color: "#fff" },
});
