import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, StatusBar, ScrollView } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import {
  BEHAVIOR_TASKS, BEHAVIOR_TASK_TYPE_LABELS,
  getBehaviorLevel, behaviorLevelTaskCount,
  behaviorNextIndexInLevel, behaviorPositionInLevel,
} from "../../config/behaviorTasks";
import { practiceNext } from "../../utils/practiceFlow";
import { speakFeedback, stopSpeaking } from "../../services/kidFeedback";
import { BehaviorFeatures } from "../../utils/behaviorFeatures";
import ScreenContainer from "../../components/common/ScreenContainer";
import StarProgress from "../../components/common/StarProgress";
import ClayCard from "../../components/common/ClayCard";
import PrimaryButton from "../../components/common/PrimaryButton";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "BehaviorResult">;
  route: RouteProp<RootStackParamList, "BehaviorResult">;
};

export default function BehaviorResultScreen({ navigation, route }: Props) {
  const { taskIndex, isCorrect, selectedOption, elapsed, attemptCount, hintCount, features, error, practice } = route.params;
  const task = BEHAVIOR_TASKS[taskIndex];
  const level = getBehaviorLevel(task.level);
  const nextIndex = behaviorNextIndexInLevel(taskIndex);
  // "Last" now means last within this level — the level-complete screen handles
  // unlocking the next one (or sending the child to the full summary).
  const isLevelEnd = nextIndex === null;
  const position = behaviorPositionInLevel(taskIndex);
  const total = behaviorLevelTaskCount(level.id);

  const f = features as BehaviorFeatures | null;
  const stars = isCorrect ? (attemptCount <= 1 && hintCount === 0 ? 3 : 2) : 1;

  // Same "Done!" as the speech and writing modules — the spoken line marks the
  // end of an activity, not the outcome. Right or wrong is shown visually by
  // the stars and copy, so the voice stays identical everywhere.
  const spokenRef = useRef(false);
  useEffect(() => {
    if (spokenRef.current) return;
    spokenRef.current = true;
    const t = setTimeout(() => speakFeedback("done", { seed: taskIndex }), 400);
    return () => clearTimeout(t);
  }, [taskIndex]);

  useEffect(() => () => stopSpeaking(), []);

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

  const nextLabel = practice
    ? (practice.remaining.length ? "Next Practice" : "Finish Practice")
    : isLevelEnd ? `Finish Level ${level.id}` : "Next";

  const scoreBars = f ? [
    { label: "Attention", value: f.attention_score },
    { label: "Engagement", value: f.engagement_score },
    { label: "Consistency", value: f.interaction_consistency_score },
    { label: "Focus", value: 1 - f.frustration_indicator_score },
  ] : [];

  return (
    <ScreenContainer backgroundColor="#EAEFF7">
      <StatusBar barStyle="dark-content" backgroundColor="#EAEFF7" />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <StarProgress total={3} filled={stars} size={stars === 2 ? 40 : 34} />
        <Text style={styles.title}>
          {isCorrect ? "Correct!" : "Good try!"}
        </Text>
        <Text style={styles.sub}>
          {isCorrect
            ? `${position} of ${total} in ${level.title}`
            : selectedOption
              ? `You chose ${selectedOption} · Answer: ${task.correct_answer}`
              : `${position} of ${total} in ${level.title}`}
        </Text>

        <ClayCard style={styles.card} radius={26}>
          <View style={styles.statGrid}>
            <View style={styles.statTile}>
              <Text style={[styles.statValue, { color: "#0F8D68" }]}>{elapsed}s</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={[styles.statValue, { color: "#B0791A" }]}>{attemptCount}</Text>
              <Text style={styles.statLabel}>Attempts</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={[styles.statValue, { color: "#0F8D68" }]}>
                {f ? `${Math.round(f.attention_score * 100)}%` : "—"}
              </Text>
              <Text style={styles.statLabel}>Attention</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={[styles.statValue, { color: colors.text }]}>{hintCount}</Text>
              <Text style={styles.statLabel}>Hints used</Text>
            </View>
          </View>

          {scoreBars.length > 0 && (
            <View style={styles.chart}>
              <View style={styles.chartHead}>
                <Text style={styles.chartTitle}>Attention across this activity</Text>
                <Text style={styles.chartMeta}>{BEHAVIOR_TASK_TYPE_LABELS[task.task_type]}</Text>
              </View>
              <View style={styles.bars}>
                {scoreBars.map((bar) => (
                  <View key={bar.label} style={styles.barCol}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${Math.max(8, Math.round(bar.value * 100))}%`,
                            backgroundColor: bar.value >= 0.6 ? "#12B583" : "#F5B32E",
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barCaption}>{bar.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ClayCard>

        {error && error !== "Skipped" && (
          <ClayCard style={styles.errorCard} radius={18}>
            <Text style={styles.errorText}>Analysis unavailable: {error}</Text>
          </ClayCard>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <PrimaryButton label={nextLabel} onPress={handleNext} colors={["#4ED6A8", "#1FB88A"]} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: "center", paddingTop: 28, paddingBottom: 16 },
  title: { fontFamily: fonts.extraBold, fontSize: 28, color: colors.text, marginTop: 20, letterSpacing: -0.5, textAlign: "center" },
  sub: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.textSecondary, marginTop: 8, textAlign: "center" },
  card: { width: "100%", padding: 20, marginTop: 24 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 11 },
  statTile: {
    width: "47%", flexGrow: 1, backgroundColor: colors.bgInset,
    borderRadius: 16, padding: 14,
  },
  statValue: { fontFamily: fonts.extraBold, fontSize: 21 },
  statLabel: { fontFamily: fonts.bold, fontSize: 11, color: colors.textLabel, marginTop: 2 },
  chart: { marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: "rgba(160,174,199,0.28)" },
  chartHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  chartTitle: { fontFamily: fonts.extraBold, fontSize: 12.5, color: colors.textBody },
  chartMeta: { fontFamily: fonts.bold, fontSize: 12, color: colors.textMuted },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 8, height: 72, marginBottom: 16 },
  barCol: { flex: 1, alignItems: "center", height: "100%" },
  barTrack: { flex: 1, width: "100%", justifyContent: "flex-end" },
  barFill: { width: "100%", borderRadius: 4 },
  barCaption: { fontFamily: fonts.bold, fontSize: 9, color: colors.textMuted, marginTop: 6, textAlign: "center" },
  errorCard: { width: "100%", marginTop: 14, backgroundColor: "#FFF4D6" },
  errorText: { fontFamily: fonts.regular, fontSize: 12, color: "#92400E" },
  actions: { marginBottom: 10 },
});
