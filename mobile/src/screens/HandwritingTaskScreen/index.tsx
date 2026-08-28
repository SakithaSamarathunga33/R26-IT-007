import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { theme } from "../../theme";
import KidBackground from "../../components/KidBackground";
import { playNextSound, playTapSound } from "../../services/kidSounds";
import {
  HANDWRITING_TASKS, HANDWRITING_TASK_TYPE_LABELS,
  HANDWRITING_TASK_TYPE_ICONS, HANDWRITING_TASK_COLORS,
  getHandwritingLevel, handwritingLevelTaskCount, handwritingPositionInLevel,
} from "../../config/handwritingTasks";
import { speak, stopSpeaking, stretchWord } from "../../services/ttsService";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "HandwritingTask">;
  route: RouteProp<RootStackParamList, "HandwritingTask">;
};

type InputMode = "canvas" | "photo";

const DIFFICULTY_CONFIG = {
  easy:   { color: "#059669", bg: "#ECFDF5", label: "Easy" },
  medium: { color: "#D97706", bg: "#FFFBEB", label: "Medium" },
  hard:   { color: "#EF4444", bg: "#FFF5F5", label: "Hard" },
};

export default function HandwritingTaskScreen({ navigation, route }: Props) {
  const taskIndex = route.params?.taskIndex ?? 0;
  const practice = route.params?.practice;
  const task = HANDWRITING_TASKS[taskIndex];
  const level = getHandwritingLevel(task.level);
  // Progress is scoped to the current level, not the whole 21-task set.
  const total = handwritingLevelTaskCount(task.level);
  const position = handwritingPositionInLevel(taskIndex);
  const progress = position / total;
  const diff = DIFFICULTY_CONFIG[task.difficulty_level];
  const taskColors = HANDWRITING_TASK_COLORS[task.task_type];
  const [inputMode, setInputMode] = useState<InputMode>("canvas");

  const isMemoryTask = task.task_type === "write_from_memory";
  const isDictation = task.task_type === "simple_dictation";

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
    playNextSound();
    navigation.navigate("HandwritingCanvas", { taskIndex, inputMode, taskStartTs: Date.now(), practice });
  };

  return (
    <View style={styles.container}>
      <KidBackground variant="handwriting" />
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Task {position} of {total}</Text>
        <View style={[styles.diffBadge, { backgroundColor: diff.bg }]}>
          <View style={[styles.diffDot, { backgroundColor: diff.color }]} />
          <Text style={[styles.diffText, { color: diff.color }]}>{diff.label}</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <LinearGradient
          colors={level.gradColors}
          style={[styles.progressFill, { width: `${progress * 100}%` as any }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.badgeRow}>
          <View style={[styles.levelBadge, { backgroundColor: level.bg, borderColor: level.bg }]}>
            <Ionicons name={level.icon as any} size={13} color={level.color} />
            <Text style={[styles.levelBadgeText, { color: level.color }]}>
              {level.subtitle} · {level.title}
            </Text>
          </View>
          <View style={styles.typeBadge}>
            <Ionicons name={HANDWRITING_TASK_TYPE_ICONS[task.task_type] as any} size={13} color={taskColors.color} />
            <Text style={[styles.typeBadgeText, { color: taskColors.color }]}>
              {HANDWRITING_TASK_TYPE_LABELS[task.task_type]}
            </Text>
          </View>
        </View>

        {/* Target display card */}
        <View style={[styles.targetCard, { borderColor: taskColors.border }]}>
          <Text style={styles.targetLabel}>
            {isDictation ? "Listen carefully, then write:" : isMemoryTask ? "Remember this, then write:" : "Your target:"}
          </Text>
          {!isDictation && (
            <Text style={[styles.targetText, { color: taskColors.color }]}>{task.target_text}</Text>
          )}
          {isDictation && (
            <>
              {/* The word is deliberately NOT shown — dictation tests sound to
                  writing, so printing it would turn the task into copying. */}
              <TouchableOpacity
                style={[styles.dictationPrompt, { backgroundColor: taskColors.bg, borderColor: taskColors.color }]}
                activeOpacity={0.85}
                onPress={() => (speaking ? (stopSpeaking(), setSpeaking(false)) : speakWord("normal"))}
              >
                <Ionicons
                  name={speaking ? "volume-high" : "play-circle"}
                  size={34}
                  color={taskColors.color}
                />
                <Text style={[styles.dictationWord, { color: taskColors.color }]}>
                  {speaking ? "Listening…" : "Tap to hear"}
                </Text>
              </TouchableOpacity>

              <View style={styles.dictationHelpers}>
                <TouchableOpacity
                  style={styles.dictationHelperBtn}
                  activeOpacity={0.8}
                  onPress={() => speakWord("normal")}
                  disabled={speaking}
                >
                  <Ionicons name="refresh" size={14} color="#475569" />
                  <Text style={styles.dictationHelperText}>Again</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dictationHelperBtn}
                  activeOpacity={0.8}
                  onPress={() => speakWord("slow")}
                  disabled={speaking}
                >
                  <Ionicons name="hourglass-outline" size={14} color="#475569" />
                  <Text style={styles.dictationHelperText}>Slowly</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          {isMemoryTask && (
            <>
              <TouchableOpacity
                style={styles.hearWordBtn}
                activeOpacity={0.8}
                onPress={() => (speaking ? (stopSpeaking(), setSpeaking(false)) : speakWord("normal"))}
              >
                <Ionicons name={speaking ? "stop" : "volume-high"} size={15} color="#475569" />
                <Text style={styles.hearWordText}>{speaking ? "Stop" : "Hear the word"}</Text>
              </TouchableOpacity>
              <Text style={styles.memoryHint}>The word will be hidden when you start writing.</Text>
            </>
          )}
        </View>

        {/* Instruction card */}
        <View style={styles.instructionCard}>
          <View style={styles.instructionIconWrap}>
            <Ionicons name="reader-outline" size={18} color="#64748B" />
          </View>
          <Text style={styles.instructionText}>{task.instruction}</Text>
        </View>

        {/* Input mode selector */}
        <Text style={styles.sectionLabel}>Choose writing mode</Text>
        <View style={styles.modeRow}>
          {(["canvas", "photo"] as InputMode[]).map((mode) => {
            const active = inputMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                style={[styles.modeCard, active && { borderColor: taskColors.color, backgroundColor: taskColors.bg }]}
                onPress={() => { playTapSound(); setInputMode(mode); }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={mode === "canvas" ? "brush-outline" : "camera-outline"}
                  size={24}
                  color={active ? taskColors.color : "#94A3B8"}
                />
                <Text style={[styles.modeLabel, active && { color: taskColors.color }]}>
                  {mode === "canvas" ? "Draw on screen" : "Take a photo"}
                </Text>
                <Text style={[styles.modeDesc, active && { color: taskColors.color }]}>
                  {mode === "canvas" ? "Use finger or stylus" : "Write on paper first"}
                </Text>
                {active && (
                  <View style={[styles.modeCheck, { backgroundColor: taskColors.color }]}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 20 }} />

        <LinearGradient colors={[taskColors.color, taskColors.color]} style={styles.startBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <TouchableOpacity style={styles.startBtnInner} activeOpacity={0.88} onPress={handleStart}>
            <Ionicons name="pencil-outline" size={20} color="#fff" />
            <Text style={styles.startBtnText}>
              {inputMode === "canvas" ? "Open Canvas" : "Open Camera"}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
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
  headerTitle: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: "#1E293B" },
  diffBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  diffDot: { width: 6, height: 6, borderRadius: 3 },
  diffText: { fontSize: 11, fontFamily: theme.fonts.semiBold },

  progressTrack: { height: 5, backgroundColor: "#E2E8F0", marginHorizontal: 20, borderRadius: 3, marginBottom: 20, overflow: "hidden" },
  progressFill: { height: 5, borderRadius: 3 },

  content: { paddingHorizontal: 20 },

  badgeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 16 },
  levelBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  levelBadgeText: { fontSize: 12, fontFamily: theme.fonts.semiBold },
  typeBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    shadowColor: "#94A3B8", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2,
  },
  typeBadgeText: { fontSize: 12, fontFamily: theme.fonts.semiBold },

  targetCard: {
    backgroundColor: "#fff", borderWidth: 1.5, borderRadius: 24, padding: 24, marginBottom: 14,
    alignItems: "center", gap: 10,
    shadowColor: "#94A3B8", shadowOpacity: 0.08, shadowOffset: { width: 0, height: 4 }, shadowRadius: 16, elevation: 4,
  },
  targetLabel: { fontSize: 12, fontFamily: theme.fonts.semiBold, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1.1 },
  targetText: { fontSize: 56, fontFamily: theme.fonts.extraBold, letterSpacing: 4 },
  dictationPrompt: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderWidth: 2, borderRadius: 16, paddingHorizontal: 28, paddingVertical: 18,
  },
  dictationWord: { fontSize: 20, fontFamily: theme.fonts.bold, letterSpacing: 0.5 },
  dictationHelpers: { flexDirection: "row", gap: 10, marginTop: 12 },
  dictationHelperBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E2E8F0",
    borderRadius: 50, paddingHorizontal: 14, paddingVertical: 8,
  },
  dictationHelperText: { fontSize: 12, fontFamily: theme.fonts.semiBold, color: "#475569" },

  hearWordBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E2E8F0",
    borderRadius: 50, paddingHorizontal: 14, paddingVertical: 8, marginTop: 4,
  },
  hearWordText: { fontSize: 12, fontFamily: theme.fonts.semiBold, color: "#475569" },

  memoryHint: { fontSize: 12, fontFamily: theme.fonts.regular, color: "#94A3B8", textAlign: "center" },

  instructionCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 16, padding: 14, marginBottom: 24,
  },
  instructionIconWrap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: "#F1F5F9",
    alignItems: "center", justifyContent: "center",
  },
  instructionText: { flex: 1, fontSize: 14, fontFamily: theme.fonts.medium, color: "#1E293B", lineHeight: 20 },

  sectionLabel: { fontSize: 11, fontFamily: theme.fonts.semiBold, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 },

  modeRow: { flexDirection: "row", gap: 12 },
  modeCard: {
    flex: 1, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E8EDF5",
    borderRadius: 20, padding: 16, alignItems: "center", gap: 6, position: "relative",
    shadowColor: "#94A3B8", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  modeLabel: { fontSize: 13, fontFamily: theme.fonts.semiBold, color: "#1E293B", textAlign: "center" },
  modeDesc:  { fontSize: 11, fontFamily: theme.fonts.regular, color: "#94A3B8", textAlign: "center" },
  modeCheck: {
    position: "absolute", top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center",
  },

  startBtn: {
    borderRadius: 50,
    shadowColor: "#2563EB", shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  startBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18 },
  startBtnText: { fontSize: 16, fontFamily: theme.fonts.bold, color: "#fff" },
});
