import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import {
  HANDWRITING_TASKS,
  getHandwritingLevel,
  handwritingLevelTaskCount,
  handwritingPositionInLevel,
} from "../../config/handwritingTasks";
import { speak, stopSpeaking, stretchWord } from "../../services/ttsService";
import ScreenContainer from "../../components/common/ScreenContainer";
import ActivityProgressHeader from "../../components/common/ActivityProgressHeader";
import StarProgress from "../../components/common/StarProgress";
import ClayCard from "../../components/common/ClayCard";
import TTSButton from "../../components/common/TTSButton";
import PrimaryButton from "../../components/common/PrimaryButton";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";
import { clayRaised } from "../../theme/shadows";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "HandwritingTask">;
  route: RouteProp<RootStackParamList, "HandwritingTask">;
};

type InputMode = "canvas" | "photo";

const HW_ACCENT: [string, string] = ["#FF9A8D", "#FF7A6B"];

const HEADLINE: Record<string, string> = {
  letter_trace: "Trace this letter",
  letter_copy: "Copy this letter",
  word_copy: "Copy this word",
  write_from_memory: "Remember this word",
  simple_dictation: "Listen, then write",
};

export default function HandwritingTaskScreen({ navigation, route }: Props) {
  const taskIndex = route.params?.taskIndex ?? 0;
  const practice = route.params?.practice;
  const task = HANDWRITING_TASKS[taskIndex];
  const level = getHandwritingLevel(task.level);
  // Progress is scoped to the current level, not the whole 21-task set.
  const total = handwritingLevelTaskCount(task.level);
  const position = handwritingPositionInLevel(taskIndex);
  const [inputMode, setInputMode] = useState<InputMode>("canvas");

  const isMemoryTask = task.task_type === "write_from_memory";
  const isDictation = task.task_type === "simple_dictation";
  const isLetter = task.task_type === "letter_trace" || task.task_type === "letter_copy";
  const isWordTarget = task.target_text.length > 1;

  const [speaking, setSpeaking] = useState(false);
  const autoSpokeRef = useRef(false);

  const speakWord = (rate: "normal" | "slow" = "normal") => {
    speak(rate === "slow" ? stretchWord(task.target_text) : task.target_text, {
      rate,
      onStart: () => setSpeaking(true),
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  // Dictation is a listening task — say the word on arrival so the child has
  // something to hear. Other task types show the target instead.
  useEffect(() => {
    if (!isDictation || autoSpokeRef.current) return;
    autoSpokeRef.current = true;
    const t = setTimeout(() => speakWord("normal"), 500);
    return () => clearTimeout(t);
  }, [taskIndex, isDictation]);

  useEffect(() => () => stopSpeaking(), []);

  const handleStart = () => {
    stopSpeaking();
    setSpeaking(false);
    navigation.navigate("HandwritingCanvas", { taskIndex, inputMode, taskStartTs: Date.now(), practice });
  };

  const hearLabel = isLetter ? "Hear the letter" : "Hear the word";
  const startLabel = inputMode === "photo"
    ? "Open Camera"
    : task.task_type === "letter_trace"
      ? "Start tracing"
      : "Start writing";

  return (
    <ScreenContainer>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <LinearGradient colors={["#FDEAE6", colors.bg]} style={StyleSheet.absoluteFill} />

      <ActivityProgressHeader
        current={position}
        total={total}
        onBack={() => navigation.goBack()}
        accent={HW_ACCENT}
      />
      <View style={styles.stars}>
        <StarProgress total={3} filled={Math.min(3, Math.max(1, Math.round((position / total) * 3)))} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>{HEADLINE[task.task_type] ?? "Write this"}</Text>

        <ClayCard style={styles.targetCard} radius={32}>
          <View style={styles.linedPaper}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[styles.line, { top: 52 * (i + 1) }]} />
            ))}
            {isDictation ? (
              <TouchableOpacity
                style={styles.dictationPrompt}
                activeOpacity={0.85}
                onPress={() => (speaking ? (stopSpeaking(), setSpeaking(false)) : speakWord("normal"))}
                accessibilityRole="button"
                accessibilityLabel={speaking ? "Stop" : "Tap to hear"}
              >
                <Ionicons name={speaking ? "volume-high" : "play-circle"} size={40} color="#FF6B57" />
                <Text style={styles.dictationWord}>{speaking ? "Listening…" : "Tap to hear"}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.ghostLetter, isWordTarget && styles.ghostWord]}>{task.target_text}</Text>
            )}
          </View>
        </ClayCard>

        {!isDictation && (
          <TTSButton
            label={speaking ? "Stop" : hearLabel}
            color="#FF6B57"
            onPress={() => (speaking ? (stopSpeaking(), setSpeaking(false)) : speakWord("normal"))}
          />
        )}

        {isDictation && (
          <View style={styles.dictationHelpers}>
            <TouchableOpacity
              style={[styles.helperChip, clayRaised("sm")]}
              activeOpacity={0.8}
              onPress={() => speakWord("normal")}
              disabled={speaking}
              accessibilityRole="button"
              accessibilityLabel="Hear again"
            >
              <Ionicons name="refresh" size={14} color={colors.textSecondary} />
              <Text style={styles.helperText}>Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.helperChip, clayRaised("sm")]}
              activeOpacity={0.8}
              onPress={() => speakWord("slow")}
              disabled={speaking}
              accessibilityRole="button"
              accessibilityLabel="Hear slowly"
            >
              <Ionicons name="hourglass-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.helperText}>Slowly</Text>
            </TouchableOpacity>
          </View>
        )}

        {isMemoryTask && (
          <Text style={styles.memoryHint}>The word will be hidden when you start writing.</Text>
        )}

        <Text style={styles.sectionLabel}>Choose writing mode</Text>
        <View style={styles.modeRow}>
          {(["canvas", "photo"] as InputMode[]).map((mode) => {
            const active = inputMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                style={[styles.modeCard, clayRaised("sm"), active && styles.modeCardActive]}
                onPress={() => setInputMode(mode)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={mode === "canvas" ? "Draw on screen" : "Take a photo"}
              >
                <Ionicons
                  name={mode === "canvas" ? "brush-outline" : "camera-outline"}
                  size={24}
                  color={active ? "#FF6B57" : colors.textMuted}
                />
                <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>
                  {mode === "canvas" ? "Draw on screen" : "Take a photo"}
                </Text>
                <Text style={[styles.modeDesc, active && styles.modeLabelActive]}>
                  {mode === "canvas" ? "Use finger or stylus" : "Write on paper first"}
                </Text>
                {active && (
                  <View style={styles.modeCheck}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.hint}>{task.instruction}</Text>
        <Text style={styles.levelNote}>{level.subtitle} · {level.title}</Text>

        <PrimaryButton
          label={startLabel}
          onPress={handleStart}
          colors={HW_ACCENT}
          style={styles.cta}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  stars: { alignItems: "center", marginTop: 16 },
  content: { alignItems: "center", paddingTop: 16, paddingBottom: 28 },
  headline: { fontFamily: fonts.extraBold, fontSize: 22, color: colors.text, textAlign: "center" },
  targetCard: { width: "100%", padding: 24, marginTop: 20, marginBottom: 22 },
  linedPaper: {
    width: "100%",
    height: 220,
    borderRadius: 22,
    backgroundColor: "#FBFCFE",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  line: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "rgba(45,142,255,0.16)",
  },
  ghostLetter: {
    fontFamily: fonts.regular,
    fontSize: 160,
    color: "#E2E9F3",
    lineHeight: 170,
    includeFontPadding: false,
  },
  ghostWord: { fontSize: 64, lineHeight: 72, letterSpacing: 2 },
  dictationPrompt: { alignItems: "center", gap: 10, paddingHorizontal: 20 },
  dictationWord: { fontFamily: fonts.bold, fontSize: 18, color: "#FF6B57" },
  dictationHelpers: { flexDirection: "row", gap: 10, marginBottom: 8 },
  helperChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.bgSoft,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
  },
  helperText: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textSecondary },
  memoryHint: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 12,
  },
  sectionLabel: {
    alignSelf: "flex-start",
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginTop: 22,
    marginBottom: 12,
  },
  modeRow: { flexDirection: "row", gap: 12, width: "100%" },
  modeCard: {
    flex: 1,
    backgroundColor: colors.bgSoft,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    gap: 6,
    minHeight: 108,
  },
  modeCardActive: { backgroundColor: colors.coralTint },
  modeLabel: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.text, textAlign: "center" },
  modeLabelActive: { color: "#FF6B57" },
  modeDesc: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, textAlign: "center" },
  modeCheck: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FF6B57",
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    fontFamily: fonts.bold,
    fontSize: 14.5,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 28,
  },
  levelNote: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
    marginBottom: 8,
  },
  cta: { width: "100%", marginTop: 16 },
});
