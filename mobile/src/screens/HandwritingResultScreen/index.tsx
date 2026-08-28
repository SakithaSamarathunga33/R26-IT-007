import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, StatusBar, ScrollView } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import {
  HANDWRITING_TASKS,
  getHandwritingLevel,
  handwritingNextIndexInLevel,
} from "../../config/handwritingTasks";
import { practiceNext } from "../../utils/practiceFlow";
import { speakFeedback, stopSpeaking } from "../../services/kidFeedback";
import ScreenContainer from "../../components/common/ScreenContainer";
import StarProgress from "../../components/common/StarProgress";
import ClayCard from "../../components/common/ClayCard";
import PrimaryButton from "../../components/common/PrimaryButton";
import ProgressTrack from "../../components/common/ProgressTrack";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "HandwritingResult">;
  route: RouteProp<RootStackParamList, "HandwritingResult">;
};

const HW_ACCENT: [string, string] = ["#FF9A8D", "#FF7A6B"];
const STAR_COPY = ["Keep going", "One star for that one", "Two stars for that one", "All three stars!"];

export default function HandwritingResultScreen({ navigation, route }: Props) {
  const { taskIndex, retryCount, durationSec, result, error, practice } = route.params;
  const task = HANDWRITING_TASKS[taskIndex];
  const level = getHandwritingLevel(task.level);
  const nextIndex = handwritingNextIndexInLevel(taskIndex);
  // "Last" now means last within this level — the level-complete screen handles
  // unlocking the next one (or sending the child to the full summary).
  const isLevelEnd = nextIndex === null;

  const riskLevel =
    error === "Skipped" || !result ? "requires_review"
    : result?.prediction?.risk_level ?? "requires_review";

  const probability: number | null = result?.prediction?.risk_probability ?? null;
  const features = result?.features ?? null;
  const validation = result?.validation ?? null;
  const quality = result?.quality ?? null;

  const reliabilityLow = quality?.prediction_reliability === "low";
  const validationWarnings: string[] = validation?.warnings ?? [];
  const ocrMismatch = validation?.ocr_target_match === false && validation?.ocr_available === true;

  const accuracyRaw = features?.shape_similarity_score ?? features?.writing_quality_score
    ?? (probability !== null ? 1 - Math.min(1, Math.max(0, probability)) : null);
  const accuracy = accuracyRaw !== null && accuracyRaw !== undefined ? Math.round(Number(accuracyRaw) * 100) : null;
  const stars = riskLevel === "low" ? 3 : riskLevel === "medium" ? 2 : 1;
  const accColor = accuracy === null
    ? colors.textMuted
    : accuracy >= 70 ? colors.mint : accuracy >= 50 ? "#B0791A" : "#C6493A";
  const accTrack: [string, string] = accuracy === null
    ? HW_ACCENT
    : accuracy >= 70 ? ["#4ED9AC", "#0F8D68"]
    : accuracy >= 50 ? ["#F5B32E", "#B0791A"]
    : ["#FF9A8D", "#F2573F"];

  const alignment = features?.alignment_score !== undefined ? Math.round(features.alignment_score * 100) : null;
  const writingQuality = features?.writing_quality_score !== undefined ? Math.round(features.writing_quality_score * 100) : null;
  const reversal = features?.reversal_flag === 1;

  // Encouragement on arrival. These screens are reached only after the
  // response is submitted, so speaking the outcome cannot change it.
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
        navigation.replace("HandwritingTask", { taskIndex: step.taskIndex, practice: step.practice });
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
      navigation.replace("HandwritingLevelComplete", { level: task.level });
    } else {
      navigation.replace("HandwritingTask", { taskIndex: nextIndex! });
    }
  };

  const nextLabel = practice
    ? (practice.remaining.length ? "Next letter" : "Finish practice")
    : isLevelEnd ? `Finish ${level.title}` : "Next letter";

  return (
    <ScreenContainer>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <StarProgress total={3} filled={stars} size={stars === 2 ? 40 : 34} />
        <Text style={styles.title}>{STAR_COPY[stars]}</Text>
        <Text style={styles.sub}>
          That <Text style={styles.word}>{task.target_text}</Text>
          {riskLevel === "low" ? " was well formed" : riskLevel === "medium" ? " was a good try" : " — let's keep going"}
        </Text>

        <ClayCard style={styles.card} radius={26}>
          <View style={styles.accRow}>
            <Text style={styles.accLabel}>Letter accuracy</Text>
            <Text style={[styles.accValue, { color: accColor }]}>
              {accuracy !== null ? `${accuracy}%` : "—"}
            </Text>
          </View>
          <ProgressTrack progress={accuracy !== null ? accuracy / 100 : 0} colors={accTrack} />

          <View style={styles.grid}>
            <View style={styles.tile}>
              <Text style={[styles.tileValue, { color: writingQuality !== null && writingQuality >= 70 ? colors.mint : "#B0791A" }]}>
                {writingQuality !== null ? (writingQuality >= 70 ? "Good" : "Uneven") : "—"}
              </Text>
              <Text style={styles.tileLabel}>Writing quality</Text>
            </View>
            <View style={styles.tile}>
              <Text style={[styles.tileValue, { color: alignment !== null && alignment >= 70 ? colors.mint : "#B0791A" }]}>
                {alignment !== null ? `${alignment}%` : "—"}
              </Text>
              <Text style={styles.tileLabel}>Alignment</Text>
            </View>
            <View style={styles.tile}>
              <Text style={[styles.tileValue, { color: reversal ? "#C6493A" : colors.mint }]}>
                {reversal ? "Yes" : "0"}
              </Text>
              <Text style={styles.tileLabel}>Reversals</Text>
            </View>
            <View style={styles.tile}>
              <Text style={styles.tileValue}>{durationSec}s</Text>
              <Text style={styles.tileLabel}>Time taken</Text>
            </View>
          </View>

          {(reliabilityLow || ocrMismatch || validationWarnings.length > 0 || (error && error !== "Skipped") || retryCount > 0) && (
            <View style={styles.note}>
              <View style={styles.infoDot}><Text style={styles.infoMark}>i</Text></View>
              <Text style={styles.noteText}>
                {error && error !== "Skipped"
                  ? `Analysis unavailable: ${error}`
                  : reliabilityLow
                    ? "The handwriting image was not clear enough for a reliable result. Please retake or rewrite if possible."
                    : ocrMismatch
                      ? "The system could not confidently read the target text. This is common with children's handwriting."
                      : validationWarnings[0]
                        ?? (retryCount > 0 ? `${retryCount} rewrite${retryCount !== 1 ? "s" : ""} on this letter.` : "This is a screening indicator only, not a diagnosis.")}
              </Text>
            </View>
          )}
        </ClayCard>
      </ScrollView>

      <View style={styles.actions}>
        <PrimaryButton label={nextLabel} onPress={handleNext} colors={HW_ACCENT} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: "center", paddingTop: 28, paddingBottom: 16 },
  title: { fontFamily: fonts.extraBold, fontSize: 29, color: colors.text, marginTop: 20, letterSpacing: -0.5, textAlign: "center" },
  sub: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.textSecondary, marginTop: 8, textAlign: "center" },
  word: { color: colors.text },
  card: { width: "100%", padding: 20, marginTop: 24 },
  accRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 },
  accLabel: { fontFamily: fonts.extraBold, fontSize: 14, color: colors.text },
  accValue: { fontFamily: fonts.extraBold, fontSize: 22 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 11, marginTop: 18 },
  tile: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: colors.bgInset,
    borderRadius: 16,
    padding: 13,
  },
  tileValue: { fontFamily: fonts.extraBold, fontSize: 19, color: colors.text },
  tileLabel: { fontFamily: fonts.bold, fontSize: 11, color: colors.textLabel, marginTop: 2 },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(160,174,199,0.28)",
  },
  infoDot: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "#FF6B57",
    alignItems: "center", justifyContent: "center", marginTop: 1,
  },
  infoMark: { fontFamily: fonts.extraBold, fontSize: 11, color: "#fff" },
  noteText: { flex: 1, fontFamily: fonts.semiBold, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  actions: { gap: 12, marginBottom: 10 },
});
