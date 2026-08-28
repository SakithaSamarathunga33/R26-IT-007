import React, { useEffect, useRef } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { SPEECH_TASKS, getLevel, nextIndexInLevel } from "../../config/speechTasks";
import { practiceNext } from "../../utils/practiceFlow";
import { speakFeedback, stopSpeaking } from "../../services/kidFeedback";
import ScreenContainer from "../../components/common/ScreenContainer";
import StarProgress from "../../components/common/StarProgress";
import ClayCard from "../../components/common/ClayCard";
import PrimaryButton from "../../components/common/PrimaryButton";
import SecondaryButton from "../../components/common/SecondaryButton";
import ProgressTrack from "../../components/common/ProgressTrack";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "SpeechResult">;
  route: RouteProp<RootStackParamList, "SpeechResult">;
};

const STAR_COPY = ["Keep going", "One star for that one", "Two stars for that one", "Three stars!"];

export default function SpeechResultScreen({ navigation, route }: Props) {
  const { taskIndex, retryCount, result, error, practice } = route.params;
  const task = SPEECH_TASKS[taskIndex];
  const level = getLevel(task.level);
  const nextIndex = nextIndexInLevel(taskIndex);
  const isLevelEnd = nextIndex === null;

  const riskLevel = error || !result ? "requires_review" : result?.prediction?.risk_level ?? "requires_review";
  const probability: number = result?.prediction?.risk_probability ?? 0.5;
  const accuracy = Math.round((1 - Math.min(1, Math.max(0, probability))) * 100);
  const stars = riskLevel === "low" ? 3 : riskLevel === "medium" ? 2 : 1;
  const qualityWarnings: string[] = result?.quality?.warnings ?? [];
  const phonemes = task.target_phoneme_seq.split(" ").filter(Boolean);

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

  const nextLabel = practice
    ? (practice.remaining.length ? "Next word" : "Finish practice")
    : isLevelEnd ? `Finish ${level.title}` : "Next word";

  return (
    <ScreenContainer>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <StarProgress total={3} filled={stars} size={stars === 2 ? 40 : 34} />
        <Text style={styles.title}>{STAR_COPY[stars]}</Text>
        <Text style={styles.sub}>
          Lexi heard <Text style={styles.word}>{task.target_word}</Text>
          {riskLevel === "low" ? " clearly" : riskLevel === "medium" ? " pretty well" : " — let's try again later"}
        </Text>

        <ClayCard style={styles.card} radius={26}>
          <View style={styles.accRow}>
            <Text style={styles.accLabel}>Sound accuracy</Text>
            <Text style={[styles.accValue, { color: accuracy >= 70 ? colors.mint : accuracy >= 50 ? "#B0791A" : "#C6493A" }]}>
              {accuracy}%
            </Text>
          </View>
          <ProgressTrack
            progress={accuracy / 100}
            colors={accuracy >= 70 ? ["#4ED9AC", "#0F8D68"] : accuracy >= 50 ? ["#F5B32E", "#B0791A"] : ["#FF9A8D", "#F2573F"]}
          />
          <View style={styles.chips}>
            {phonemes.map((p, i) => {
              const ok = riskLevel === "low" || (riskLevel === "medium" && i < phonemes.length - 1);
              return (
                <View key={`${p}-${i}`} style={[styles.chip, { backgroundColor: ok ? colors.mintTint : colors.coralTint }]}>
                  <Text style={[styles.chipText, { color: ok ? colors.mint : "#C6493A" }]}>/{p}/ {ok ? "✓" : "✕"}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.note}>
            <View style={styles.infoDot}><Text style={styles.infoMark}>i</Text></View>
            <Text style={styles.noteText}>
              {error
                ? "Could not reach the analysis server. This attempt is marked for review."
                : qualityWarnings[0] ?? "This is a screening indicator only, not a diagnosis. The combined report weighs all three games."}
            </Text>
          </View>
        </ClayCard>
      </ScrollView>

      <View style={styles.actions}>
        <PrimaryButton label={nextLabel} onPress={handleNext} />
        <SecondaryButton
          label="Try this word again"
          onPress={() => navigation.replace("SpeechRecording", { taskIndex, practice, retryCount: retryCount + 1 })}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: "center", paddingTop: 28, paddingBottom: 16 },
  title: { fontFamily: fonts.extraBold, fontSize: 29, color: colors.text, marginTop: 20, letterSpacing: -0.5, textAlign: "center" },
  sub: { fontFamily: fonts.bold, fontSize: 15, color: colors.textSecondary, marginTop: 8, textAlign: "center" },
  word: { color: colors.text },
  card: { width: "100%", padding: 20, marginTop: 24 },
  accRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 },
  accLabel: { fontFamily: fonts.extraBold, fontSize: 14, color: colors.text },
  accValue: { fontFamily: fonts.extraBold, fontSize: 22 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 18 },
  chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 13 },
  chipText: { fontFamily: fonts.extraBold, fontSize: 13 },
  note: { flexDirection: "row", alignItems: "flex-start", gap: 9, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "rgba(160,174,199,0.28)" },
  infoDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", marginTop: 1 },
  infoMark: { fontFamily: fonts.extraBold, fontSize: 11, color: "#fff" },
  noteText: { flex: 1, fontFamily: fonts.semiBold, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  actions: { gap: 12, marginBottom: 10 },
});
