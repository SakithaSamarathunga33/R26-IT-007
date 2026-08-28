import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { auth, db } from "../../config/firebase";
import {
  BEHAVIOR_TASKS, BEHAVIOR_TASK_TYPE_LABELS,
  getBehaviorLevel, behaviorLevelTaskCount, behaviorPositionInLevel, maskedWord,
} from "../../config/behaviorTasks";
import {
  calculateBehaviorFeatures, getTimeOfDay, BehaviorRawEvents,
} from "../../utils/behaviorFeatures";
import { speak, stopSpeaking } from "../../services/ttsService";
import ScreenContainer from "../../components/common/ScreenContainer";
import ActivityProgressHeader from "../../components/common/ActivityProgressHeader";
import ClayCard from "../../components/common/ClayCard";
import ChoiceTile from "../../components/common/ChoiceTile";
import PrimaryButton from "../../components/common/PrimaryButton";
import TTSButton from "../../components/common/TTSButton";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";
import { clayRaised } from "../../theme/shadows";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "BehaviorActivity">;
  route: RouteProp<RootStackParamList, "BehaviorActivity">;
};

import { API_URLS } from "../../config/apiConfig";
const BEHAVIOR_API = API_URLS.behavior;

type ActivityState = "idle" | "active" | "submitting" | "done";

export default function BehaviorActivityScreen({ navigation, route }: Props) {
  const taskIndex = route.params?.taskIndex ?? 0;
  const practice = route.params?.practice;
  // Practice runs come from a therapy plan — they must never write predictions,
  // or rehearsing would move the risk score the plan was based on.
  const isPractice = !!practice;
  const task = BEHAVIOR_TASKS[taskIndex];
  const level = getBehaviorLevel(task.level);
  // Progress is scoped to the current level, not the whole task set.
  const total = behaviorLevelTaskCount(task.level);
  const position = behaviorPositionInLevel(taskIndex);
  const isMissingLetter = task.task_type === "missing_letter";

  const [activityState, setActivityState] = useState<ActivityState>("idle");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [hintVisible, setHintVisible] = useState(false);
  const [hintCount, setHintCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const taskStartRef = useRef<number>(0);
  const firstTapRef = useRef<number | null>(null);
  const tapsRef = useRef<{ ts: number; correct: boolean }[]>([]);
  const pausesRef = useRef<{ start: number; end: number }[]>([]);
  const pauseStartRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const focusLossRef = useRef(0);
  // How many times the child replayed the spoken question — a genuine attention
  // signal, fed to the model as prompt_replay_count.
  const replayCountRef = useRef(0);
  const autoSpokeRef = useRef(false);

  useEffect(() => {
    taskStartRef.current = Date.now();
    firstTapRef.current = null;
    tapsRef.current = [];
    pausesRef.current = [];
    focusLossRef.current = 0;
    replayCountRef.current = 0;
    autoSpokeRef.current = false;
    setActivityState("active");
    timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [taskIndex]);

  /** Reads the question aloud. `isReplay` distinguishes the auto-read on arrival. */
  const speakQuestion = (rate: "normal" | "slow" = "normal", isReplay = true) => {
    if (isReplay) replayCountRef.current += 1;
    speak(task.spoken_prompt, {
      rate,
      onStart: () => setSpeaking(true),
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  // Read the question aloud on arrival so pre-readers aren't blocked by text.
  useEffect(() => {
    if (autoSpokeRef.current) return;
    autoSpokeRef.current = true;
    const t = setTimeout(() => speakQuestion("normal", false), 450);
    return () => clearTimeout(t);
  }, [taskIndex]);

  // Never leave the app talking after the child moves on.
  useEffect(() => () => stopSpeaking(), []);

  const handleOptionTap = (option: string) => {
    if (activityState !== "active" || submitting) return;
    const now = Date.now();
    if (!firstTapRef.current) firstTapRef.current = now;
    const isCorrect = option === task.correct_answer;
    tapsRef.current.push({ ts: now, correct: isCorrect });
    setAttemptCount((c) => c + 1);
    setSelectedOption(option);

    // Read the choice back so a pre-reader can confirm what they picked. No
    // praise here — the answer isn't committed until "Confirm & Continue", and
    // saying "Correct!" now would let them switch after hearing the outcome.
    speak(option, {
      onStart: () => setSpeaking(true),
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const handleShowHint = () => {
    setHintVisible(true);
    setHintCount((c) => c + 1);
    if (pauseStartRef.current === null) pauseStartRef.current = Date.now();
    speak(task.hint, {
      onStart: () => setSpeaking(true),
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const handleDismissHint = () => {
    setHintVisible(false);
    if (pauseStartRef.current !== null) {
      pausesRef.current.push({ start: pauseStartRef.current, end: Date.now() });
      pauseStartRef.current = null;
    }
  };

  const handleSubmit = async () => {
    if (!selectedOption || submitting) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    stopSpeaking();
    setSpeaking(false);
    setSubmitting(true);

    const taskEndTs = Date.now();
    const isCorrect = selectedOption === task.correct_answer;

    const rawEvents: BehaviorRawEvents = {
      task_start_ts: taskStartRef.current,
      task_end_ts: taskEndTs,
      first_tap_ts: firstTapRef.current,
      taps: tapsRef.current,
      pauses: pausesRef.current,
      hint_used: hintCount > 0,
      hint_count: hintCount,
      skipped: false,
      prompt_replays: replayCountRef.current,
      self_corrected: tapsRef.current.length > 1 && isCorrect,
      focus_losses: focusLossRef.current,
      off_task_events: 0,
      premature_taps: 0,
      random_taps: tapsRef.current.filter((t) => !t.correct).length,
      inactivity_periods: pausesRef.current.filter((p) => (p.end - p.start) > 3000).length,
    };

    const features = calculateBehaviorFeatures(rawEvents, isCorrect, attemptCount);

    const payload = {
      task_type: task.task_type,
      difficulty_level: task.difficulty_level,
      task_description: task.task_description,
      cognitive_focus: task.cognitive_focus,
      attention_load: task.attention_load,
      age: 6,
      gender: "M",
      native_language: "Sinhala",
      assessment_language: "English",
      device_type: "mobile_phone",
      school_type: "urban_public",
      environment_distraction_level: 0.15,
      time_of_day: getTimeOfDay(),
      observer_support_level: "low",
      ...features,
    };

    let result: any = null;
    let apiError: string | undefined;

    try {
      const uid = auth.currentUser?.uid ?? "anonymous";
      const attemptRef = isPractice
        ? null
        : await addDoc(collection(db, "behavior_attempts"), {
            user_id: uid,
            task_type: task.task_type,
            task_id: task.id,
            level: task.level,
            difficulty_level: task.difficulty_level,
            selected_answer: selectedOption,
            correct_answer: task.correct_answer,
            is_correct: isCorrect,
            raw_events: rawEvents,
            submitted_at: serverTimestamp(),
          });

      const response = await fetch(BEHAVIOR_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responseText = await response.text();

      if (!response.ok) throw new Error(`Server error: ${response.status} — ${responseText}`);
      result = JSON.parse(responseText);

      if (!isPractice) await addDoc(collection(db, "behavior_predictions"), {
        attempt_id: attemptRef!.id,
        child_id: uid,
        session_id: `session_${uid}`,
        // Task identity is denormalised onto the prediction so summaries can
        // label rows without assuming the child played every task in order.
        task_index: taskIndex,
        task_id: task.id,
        level: task.level,
        task_type: task.task_type,
        risk_probability: result.prediction?.risk_probability ?? null,
        risk_level: result.prediction?.risk_level ?? null,
        risk_label_binary: result.prediction?.risk_label_binary ?? null,
        attention_score: features.attention_score,
        engagement_score: features.engagement_score,
        saved_at: serverTimestamp(),
      });
    } catch (err: any) {
      apiError = err.message;
      console.warn("[BehaviorAPI] Error:", err.message);
    }

    setSubmitting(false);
    navigation.replace("BehaviorResult", {
      taskIndex,
      isCorrect,
      selectedOption,
      elapsed,
      attemptCount,
      hintCount,
      features,
      result,
      error: apiError,
      practice,
    });
  };

  return (
    <ScreenContainer backgroundColor="#EAEFF7">
      <StatusBar barStyle="dark-content" backgroundColor="#EAEFF7" />
      <ActivityProgressHeader
        current={position}
        total={total}
        accent={["#3FDCA8", "#12B583"]}
        onBack={() => { stopSpeaking(); navigation.goBack(); }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ClayCard style={styles.prompt} radius={26}>
          <View style={styles.promptRow}>
            <View style={styles.promptIcon}>
              <Ionicons name="grid-outline" size={22} color="#12B583" />
            </View>
            <View style={styles.promptCopy}>
              <Text style={styles.promptType}>{BEHAVIOR_TASK_TYPE_LABELS[task.task_type]} · {level.title}</Text>
              <Text style={styles.promptText}>{task.instruction}</Text>
            </View>
            <TouchableOpacity
              style={styles.speakerBtn}
              onPress={() => (speaking ? (stopSpeaking(), setSpeaking(false)) : speakQuestion("normal"))}
              accessibilityRole="button"
              accessibilityLabel={speaking ? "Stop speaking" : "Hear the question"}
            >
              <Ionicons name={speaking ? "stop" : "volume-high"} size={21} color="#12B583" />
            </TouchableOpacity>
          </View>

          {isMissingLetter && task.word && (
            <View style={styles.wordBox}>
              <Text style={styles.maskedWord}>{maskedWord(task)}</Text>
              <Text style={styles.wordHint}>the word is “{task.word}”</Text>
            </View>
          )}
        </ClayCard>

        <View style={styles.listenRow}>
          <TTSButton
            label="Play slowly"
            color="#12B583"
            onPress={() => speakQuestion("slow")}
          />
          <Text style={styles.timer}>{elapsed}s</Text>
        </View>

        {hintVisible ? (
          <ClayCard style={styles.hintCard} radius={18}>
            <Ionicons name="bulb" size={16} color="#12B583" />
            <Text style={styles.hintText}>{task.hint}</Text>
            <TouchableOpacity onPress={handleDismissHint} accessibilityRole="button" accessibilityLabel="Hide hint">
              <Ionicons name="close-circle" size={18} color="#12B583" />
            </TouchableOpacity>
          </ClayCard>
        ) : (
          <TouchableOpacity
            style={styles.hintChip}
            onPress={handleShowHint}
            accessibilityRole="button"
            accessibilityLabel="Show hint"
          >
            <Ionicons name="bulb-outline" size={15} color="#12B583" />
            <Text style={styles.hintChipText}>Show hint</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.chooseLabel}>
          {isMissingLetter ? "Tap the missing letter" : "Choose your answer"}
        </Text>

        <View style={styles.grid}>
          {task.options.map((option, i) => {
            const isSelected = selectedOption === option;
            if (isMissingLetter) {
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.letterTile, isSelected ? styles.tilePressed : clayRaised("sm")]}
                  onPress={() => handleOptionTap(option)}
                  activeOpacity={0.85}
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={option}
                >
                  <Text style={[styles.letterText, isSelected && styles.letterTextPressed]}>{option}</Text>
                </TouchableOpacity>
              );
            }
            return (
              <ChoiceTile
                key={i}
                label={option}
                selected={isSelected}
                onPress={() => handleOptionTap(option)}
                style={styles.choice}
              />
            );
          })}
        </View>

        <View style={{ height: 16 }} />

        <PrimaryButton
          label={submitting ? "Analysing…" : selectedOption ? "Confirm & Continue" : "Select an answer"}
          onPress={handleSubmit}
          disabled={!selectedOption || submitting}
          loading={submitting}
          colors={["#4ED6A8", "#1FB88A"]}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 18, paddingBottom: 36 },
  prompt: { padding: 18, marginBottom: 14 },
  promptRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  promptIcon: {
    width: 52, height: 52, borderRadius: 18, backgroundColor: "#DDF6EE",
    alignItems: "center", justifyContent: "center",
  },
  promptCopy: { flex: 1 },
  promptType: { fontFamily: fonts.bold, fontSize: 11, color: colors.textMuted, marginBottom: 4 },
  promptText: { fontFamily: fonts.extraBold, fontSize: 19, color: colors.text, lineHeight: 25 },
  speakerBtn: {
    width: 44, height: 44, borderRadius: 15, backgroundColor: "#DDF6EE",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  wordBox: {
    marginTop: 14, backgroundColor: "#DDF6EE", borderRadius: 18,
    paddingVertical: 16, paddingHorizontal: 14, alignItems: "center", gap: 6,
  },
  maskedWord: { fontFamily: fonts.extraBold, fontSize: 32, color: "#0F8D68", letterSpacing: 2, textAlign: "center" },
  wordHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  listenRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  timer: { fontFamily: fonts.extraBold, fontSize: 13, color: colors.textBody },
  hintCard: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14, padding: 12 },
  hintText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: "#0F8D68", lineHeight: 18 },
  hintChip: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginBottom: 14, paddingVertical: 8 },
  hintChipText: { fontFamily: fonts.medium, fontSize: 13, color: "#12B583" },
  chooseLabel: { fontFamily: fonts.extraBold, fontSize: 13, color: colors.textBody, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  choice: { flexBasis: "47%", flexGrow: 1, minHeight: 112 },
  letterTile: {
    flexBasis: "47%", flexGrow: 1, minHeight: 112, borderRadius: 26,
    backgroundColor: colors.bgSoft, alignItems: "center", justifyContent: "center",
  },
  tilePressed: {
    backgroundColor: "#E2E9F3",
    transform: [{ scale: 0.965 }],
    shadowOpacity: 0,
    elevation: 0,
  },
  letterText: {
    fontFamily: fonts.extraBold, fontSize: 34, lineHeight: 43, color: colors.text,
    textAlign: "center", includeFontPadding: false,
  },
  letterTextPressed: { color: colors.textBody },
});
