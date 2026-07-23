import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { theme } from "../../theme";
import { auth, db } from "../../config/firebase";
import {
  BEHAVIOR_TASKS, BEHAVIOR_TASK_TYPE_LABELS, BEHAVIOR_TASK_TYPE_ICONS, BEHAVIOR_TASK_COLORS,
  getBehaviorLevel, behaviorLevelTaskCount, behaviorPositionInLevel, maskedWord,
} from "../../config/behaviorTasks";
import {
  calculateBehaviorFeatures, getTimeOfDay, BehaviorRawEvents,
} from "../../utils/behaviorFeatures";
import { speak, stopSpeaking } from "../../services/ttsService";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "BehaviorActivity">;
  route: RouteProp<RootStackParamList, "BehaviorActivity">;
};

import { API_URLS } from "../../config/apiConfig";
const BEHAVIOR_API = API_URLS.behavior;

const DIFFICULTY_CONFIG = {
  easy:   { color: "#059669", bg: "#ECFDF5", label: "Easy" },
  medium: { color: "#D97706", bg: "#FFFBEB", label: "Medium" },
  hard:   { color: "#EF4444", bg: "#FFF5F5", label: "Hard" },
};

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
  const progress = position / total;
  const diff = DIFFICULTY_CONFIG[task.difficulty_level];
  const taskColors = BEHAVIOR_TASK_COLORS[task.task_type];
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
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => { stopSpeaking(); navigation.goBack(); }}>
          <Ionicons name="arrow-back" size={20} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Activity {position} of {total}</Text>
          <Text style={[styles.headerSub, { color: level.color }]}>{level.subtitle} · {level.title}</Text>
        </View>
        <View style={[styles.diffBadge, { backgroundColor: diff.bg }]}>
          <View style={[styles.diffDot, { backgroundColor: diff.color }]} />
          <Text style={[styles.diffText, { color: diff.color }]}>{diff.label}</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <LinearGradient
          colors={level.gradColors}
          style={[styles.progressFill, { width: `${progress * 100}%` }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.typeBadge}>
          <Ionicons name={BEHAVIOR_TASK_TYPE_ICONS[task.task_type] as any} size={14} color={taskColors.color} />
          <Text style={[styles.typeBadgeText, { color: taskColors.color }]}>
            {BEHAVIOR_TASK_TYPE_LABELS[task.task_type]}
          </Text>
          <View style={styles.timerBadge}>
            <Ionicons name="time-outline" size={12} color="#94A3B8" />
            <Text style={styles.timerText}>{elapsed}s</Text>
          </View>
        </View>

        {/* Question card */}
        <View style={[styles.questionCard, { borderColor: taskColors.border }]}>
          <View style={styles.questionHeaderRow}>
            <Text style={styles.questionLabel}>Question</Text>
            {speaking && (
              <View style={styles.speakingChip}>
                <Ionicons name="volume-high" size={11} color={taskColors.color} />
                <Text style={[styles.speakingChipText, { color: taskColors.color }]}>Speaking…</Text>
              </View>
            )}
          </View>
          <Text style={styles.questionText}>{task.instruction}</Text>

          {/* Missing-letter word: the word with a gap where the letter belongs */}
          {isMissingLetter && task.word && (
            <View style={[styles.wordBox, { backgroundColor: taskColors.bg, borderColor: taskColors.border }]}>
              <Text style={[styles.maskedWordText, { color: taskColors.color }]}>{maskedWord(task)}</Text>
              <Text style={styles.wordHintText}>the word is “{task.word}”</Text>
            </View>
          )}
        </View>

        {/* Listen controls — the app guides the question by voice */}
        <View style={styles.listenRow}>
          <TouchableOpacity
            style={styles.listenBtn}
            onPress={() => (speaking ? (stopSpeaking(), setSpeaking(false)) : speakQuestion("normal"))}
            activeOpacity={0.8}
            disabled={submitting}
          >
            <Ionicons name={speaking ? "stop" : "volume-high"} size={16} color="#475569" />
            <Text style={styles.listenBtnText}>
              {speaking ? "Stop" : "Hear again"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.listenBtn}
            onPress={() => speakQuestion("slow")}
            activeOpacity={0.8}
            disabled={submitting || speaking}
          >
            <Ionicons name="hourglass-outline" size={16} color="#475569" />
            <Text style={styles.listenBtnText}>Slowly</Text>
          </TouchableOpacity>
        </View>

        {/* Hint */}
        {hintVisible ? (
          <View style={[styles.hintCard, { backgroundColor: taskColors.bg, borderColor: taskColors.border }]}>
            <Ionicons name="bulb" size={16} color={taskColors.color} />
            <Text style={[styles.hintText, { color: taskColors.color }]}>{task.hint}</Text>
            <TouchableOpacity onPress={handleDismissHint}>
              <Ionicons name="close-circle" size={18} color={taskColors.color} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.hintBtn, { borderColor: taskColors.border, backgroundColor: taskColors.bg }]}
            onPress={handleShowHint}
          >
            <Ionicons name="bulb-outline" size={15} color={taskColors.color} />
            <Text style={[styles.hintBtnText, { color: taskColors.color }]}>Show hint</Text>
          </TouchableOpacity>
        )}

        {/* Options */}
        {isMissingLetter ? (
          <View style={styles.letterPromptRow}>
            <View style={styles.letterPromptIcon}>
              <Ionicons name="hand-left-outline" size={14} color="#64748B" />
            </View>
            <Text style={styles.letterPromptText}>Tap the missing letter</Text>
          </View>
        ) : (
          <Text style={styles.optionsLabel}>Choose your answer</Text>
        )}
        <View style={isMissingLetter ? styles.letterGrid : styles.optionsGrid}>
          {task.options.map((option, i) => {
            const isSelected = selectedOption === option;
            const isCorrectOption = option === task.correct_answer;
            const showResult = selectedOption !== null;

            let cardStyle = isMissingLetter ? styles.letterCard : styles.optionCard;
            // Tiles stay neutral so colour only appears where it carries meaning
            // — the child's selection, and right/wrong feedback.
            let bgColor = "#fff";
            let borderColor = "#E2E8F0";
            let textColor = "#1E293B";

            if (showResult && isSelected && isCorrectOption) {
              bgColor = "#ECFDF5"; borderColor = "#059669"; textColor = "#059669";
            } else if (showResult && isSelected && !isCorrectOption) {
              bgColor = "#FFF5F5"; borderColor = "#EF4444"; textColor = "#EF4444";
            } else if (isSelected) {
              bgColor = taskColors.bg; borderColor = taskColors.color; textColor = taskColors.color;
            }

            return (
              <TouchableOpacity
                key={i}
                style={[cardStyle, { backgroundColor: bgColor, borderColor }]}
                onPress={() => handleOptionTap(option)}
                activeOpacity={0.75}
                disabled={submitting}
              >
                {isMissingLetter ? (
                  <>
                    <Text style={[styles.letterCardText, { color: textColor }]}>{option}</Text>
                    {showResult && isSelected && (
                      <Ionicons
                        name={isCorrectOption ? "checkmark-circle" : "close-circle"}
                        size={15}
                        color={isCorrectOption ? "#059669" : "#EF4444"}
                        style={styles.letterCardBadge}
                      />
                    )}
                  </>
                ) : (
                  <>
                    <Text style={[styles.optionLetter, { color: borderColor }]}>
                      {String.fromCharCode(65 + i)}
                    </Text>
                    <Text style={[styles.optionText, { color: textColor }]}>{option}</Text>
                    {showResult && isSelected && (
                      <Ionicons
                        name={isCorrectOption ? "checkmark-circle" : "close-circle"}
                        size={20}
                        color={isCorrectOption ? "#059669" : "#EF4444"}
                      />
                    )}
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 20 }} />

        {/* Action row */}
        <LinearGradient
          colors={!selectedOption || submitting ? ["#E2E8F0", "#E2E8F0"] : [taskColors.color, taskColors.color]}
          style={styles.submitBtn}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity
            style={styles.submitBtnInner}
            onPress={handleSubmit}
            disabled={!selectedOption || submitting}
            activeOpacity={0.88}
          >
            {submitting ? (
              <><ActivityIndicator color="#fff" size="small" /><Text style={styles.submitBtnText}>Analysing…</Text></>
            ) : (
              <>
                <Text style={[styles.submitBtnText, !selectedOption && styles.submitBtnTextDisabled]}>
                  {selectedOption ? "Confirm & Continue" : "Select an answer"}
                </Text>
                <Ionicons name="arrow-forward" size={18} color={selectedOption ? "#fff" : "#94A3B8"} />
              </>
            )}
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
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#94A3B8", shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 3,
  },
  headerCenter: { alignItems: "center", flex: 1 },
  headerTitle: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: "#1E293B" },
  headerSub: { fontSize: 10, fontFamily: theme.fonts.medium, marginTop: 2 },
  diffBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  diffDot: { width: 6, height: 6, borderRadius: 3 },
  diffText: { fontSize: 11, fontFamily: theme.fonts.semiBold },

  progressTrack: { height: 5, backgroundColor: "#E2E8F0", marginHorizontal: 20, borderRadius: 3, marginBottom: 20, overflow: "hidden" },
  progressFill: { height: 5, borderRadius: 3 },

  content: { paddingHorizontal: 20 },

  typeBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start",
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginBottom: 16,
    shadowColor: "#94A3B8", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2,
  },
  typeBadgeText: { fontSize: 12, fontFamily: theme.fonts.semiBold, flex: 1 },
  timerBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  timerText: { fontSize: 11, fontFamily: theme.fonts.medium, color: "#94A3B8" },

  questionCard: {
    width: "100%", backgroundColor: "#fff", borderWidth: 1.5,
    borderRadius: 24, padding: 24, marginBottom: 12, gap: 10,
    shadowColor: "#94A3B8", shadowOpacity: 0.08, shadowOffset: { width: 0, height: 4 }, shadowRadius: 16, elevation: 4,
  },
  questionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  questionLabel: { fontSize: 11, fontFamily: theme.fonts.semiBold, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1.2 },
  questionText: { fontSize: 20, fontFamily: theme.fonts.bold, color: "#1E293B", lineHeight: 28 },
  speakingChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  speakingChipText: { fontSize: 10, fontFamily: theme.fonts.semiBold },

  /* Missing-letter word with a gap, e.g. "_ m b r e l l a" */
  wordBox: {
    borderWidth: 1.5, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 16,
    alignItems: "center", gap: 6, marginTop: 4,
  },
  maskedWordText: { fontSize: 34, fontFamily: theme.fonts.extraBold, letterSpacing: 2, textAlign: "center" },
  wordHintText: { fontSize: 12, fontFamily: theme.fonts.regular, color: "#94A3B8" },

  /* Listen controls */
  listenRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  listenBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E2E8F0",
    borderRadius: 50, paddingHorizontal: 16, paddingVertical: 10,
    shadowColor: "#94A3B8", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2,
  },
  listenBtnText: { fontSize: 13, fontFamily: theme.fonts.semiBold, color: "#475569" },

  /* Single-letter answer tiles — one row of four, no wrapping */
  letterPromptRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  letterPromptIcon: {
    width: 26, height: 26, borderRadius: 9, backgroundColor: "#F1F5F9",
    alignItems: "center", justifyContent: "center",
  },
  letterPromptText: { fontSize: 14, fontFamily: theme.fonts.bold, color: "#1E293B" },

  letterGrid: { flexDirection: "row", gap: 8 },
  letterCard: {
    // flexBasis 0 + grow splits the row into four equal tiles minus the gaps, so
    // no percentage-vs-gap rounding can push a tile onto its own line.
    flexGrow: 1, flexBasis: 0,
    // Slightly taller than wide so the tiles read as blocks, not thin buttons.
    aspectRatio: 0.85,
    borderWidth: 2, borderRadius: 18,
    // Explicit column direction — the shared optionCard style is a row, and
    // inheriting that would swap the centring axes.
    flexDirection: "column",
    alignItems: "center", justifyContent: "center", position: "relative",
    shadowColor: "#94A3B8", shadowOpacity: 0.1, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 3,
  },
  letterCardText: {
    fontSize: 34, fontFamily: theme.fonts.extraBold,
    // Outfit ExtraBold (unitsPerEm 1000, ascent 1000, descent -260) needs
    // 1.26 × fontSize of line height — 42.8px here. A lineHeight below that
    // squeezes the box and the glyph spills past the baseline, which reads as
    // the letter sitting low in the tile.
    lineHeight: 43,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  letterCardBadge: { position: "absolute", top: 6, right: 6 },

  hintCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 16,
  },
  hintText: { flex: 1, fontSize: 13, fontFamily: theme.fonts.regular, lineHeight: 18 },
  hintBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start",
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginBottom: 16,
  },
  hintBtnText: { fontSize: 12, fontFamily: theme.fonts.medium },

  optionsLabel: { fontSize: 11, fontFamily: theme.fonts.semiBold, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 },
  optionsGrid: { gap: 10 },
  optionCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#fff", borderWidth: 1.5, borderRadius: 18,
    padding: 16,
    shadowColor: "#94A3B8", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  optionLetter: { fontSize: 13, fontFamily: theme.fonts.bold, width: 22, textAlign: "center" },
  optionText: { flex: 1, fontSize: 16, fontFamily: theme.fonts.semiBold, color: "#1E293B" },

  submitBtn: {
    borderRadius: 50,
    shadowColor: "#0891B2", shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  submitBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18 },
  submitBtnText: { fontSize: 15, fontFamily: theme.fonts.bold, color: "#fff" },
  submitBtnTextDisabled: { color: "#94A3B8" },
});
