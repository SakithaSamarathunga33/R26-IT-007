import React from "react";
import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { theme } from "../../theme";
import {
  SPEECH_TASKS,
  TASK_TYPE_LABELS,
  TASK_TYPE_ICONS,
  getLevel,
  levelTaskCount,
  positionInLevel,
} from "../../config/speechTasks";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "SpeechActivity">;
  route: RouteProp<RootStackParamList, "SpeechActivity">;
};

const DIFFICULTY_CONFIG = {
  easy:   { color: "#059669", bg: "#ECFDF5", label: "Easy" },
  medium: { color: "#D97706", bg: "#FFFBEB", label: "Medium" },
  hard:   { color: "#EF4444", bg: "#FFF5F5", label: "Hard" },
};

export default function SpeechActivityScreen({ navigation, route }: Props) {
  const taskIndex = route.params?.taskIndex ?? 0;
  const practice = route.params?.practice;
  const task = SPEECH_TASKS[taskIndex];
  const level = getLevel(task.level);
  // Progress is scoped to the current level, not the whole 10-task set.
  const total = levelTaskCount(task.level);
  const position = positionInLevel(taskIndex);
  const progress = position / total;
  const diff = DIFFICULTY_CONFIG[task.difficulty_level];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity {position} of {total}</Text>
        <View style={[styles.diffBadge, { backgroundColor: diff.bg }]}>
          <View style={[styles.diffDot, { backgroundColor: diff.color }]} />
          <Text style={[styles.diffText, { color: diff.color }]}>{diff.label}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <LinearGradient
          colors={level.gradColors}
          style={[styles.progressFill, { width: `${progress * 100}%` }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        />
      </View>

      <View style={styles.content}>
        {/* Level + task type badges */}
        <View style={styles.badgeRow}>
          <View style={[styles.levelBadge, { backgroundColor: level.bg, borderColor: level.bg }]}>
            <Ionicons name={level.icon as any} size={13} color={level.color} />
            <Text style={[styles.levelBadgeText, { color: level.color }]}>
              {level.subtitle} · {level.title}
            </Text>
          </View>
          <View style={styles.typeBadge}>
            <Ionicons name={TASK_TYPE_ICONS[task.task_type] as any} size={13} color="#2563EB" />
            <Text style={styles.typeBadgeText}>{TASK_TYPE_LABELS[task.task_type]}</Text>
          </View>
        </View>

        {/* Word card */}
        <View style={styles.wordCard}>
          <Text style={styles.wordLabel}>Target Word</Text>
          <Text style={styles.wordText}>{task.target_word}</Text>
          <View style={styles.phonemeRow}>
            {task.target_phoneme_seq.split(" ").map((p, i) => (
              <View key={i} style={styles.phonemePill}>
                <Text style={styles.phonemeText}>{p}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Instruction */}
        <View style={styles.instructionCard}>
          <View style={styles.instructionIcon}>
            <Ionicons name="bulb-outline" size={18} color="#D97706" />
          </View>
          <Text style={styles.instructionText}>{task.instruction}</Text>
        </View>

        {/* Hint for nonword tasks */}
        {task.task_type === "nonword_repetition" && (
          <View style={styles.hintCard}>
            <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
            <Text style={styles.hintText}>
              This word is made-up! It is okay — just try your best to repeat what you hear.
            </Text>
          </View>
        )}

        <View style={{ flex: 1 }} />

        {/* Listen first — the app says the word before the child records */}
        <LinearGradient colors={["#3B72F6", "#2563EB"]} style={styles.recordBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <TouchableOpacity
            style={styles.recordBtnInner}
            activeOpacity={0.88}
            onPress={() => navigation.navigate("SpeechListen", { taskIndex, practice })}
          >
            <Ionicons name="volume-high" size={22} color="#fff" />
            <Text style={styles.recordBtnText}>Listen to the Word</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={{ height: 40 }} />
      </View>
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

  progressTrack: {
    height: 5, backgroundColor: "#E2E8F0", marginHorizontal: 20,
    borderRadius: 3, marginBottom: 24, overflow: "hidden",
  },
  progressFill: { height: 5, borderRadius: 3 },

  content: { flex: 1, paddingHorizontal: 20, alignItems: "center" },

  badgeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 20 },
  levelBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  levelBadgeText: { fontSize: 12, fontFamily: theme.fonts.semiBold },
  typeBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE",
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  typeBadgeText: { fontSize: 12, fontFamily: theme.fonts.semiBold, color: "#2563EB" },

  wordCard: {
    width: "100%", backgroundColor: "#fff",
    borderWidth: 1, borderColor: "#E8EDF5", borderRadius: 24,
    padding: 28, alignItems: "center", gap: 12, marginBottom: 16,
    shadowColor: "#2563EB", shadowOpacity: 0.08, shadowOffset: { width: 0, height: 4 }, shadowRadius: 16, elevation: 4,
  },
  wordLabel: { fontSize: 11, fontFamily: theme.fonts.semiBold, color: "#94A3B8", letterSpacing: 1.2, textTransform: "uppercase" },
  wordText: { fontSize: 54, fontFamily: theme.fonts.extraBold, color: "#1E293B", letterSpacing: 1 },
  phonemeRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "center" },
  phonemePill: {
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  phonemeText: { fontSize: 12, fontFamily: theme.fonts.medium, color: "#2563EB" },

  instructionCard: {
    width: "100%", flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FEF3C7",
    borderRadius: 16, padding: 14, marginBottom: 10,
  },
  instructionIcon: { marginTop: 1 },
  instructionText: { flex: 1, fontSize: 14, fontFamily: theme.fonts.medium, color: "#92400E", lineHeight: 20 },

  hintCard: {
    width: "100%", flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE",
    borderRadius: 16, padding: 12, marginBottom: 10,
  },
  hintText: { flex: 1, fontSize: 12, fontFamily: theme.fonts.regular, color: "#3B72F6", lineHeight: 18 },

  recordBtn: {
    width: "100%", borderRadius: 50,
    shadowColor: "#2563EB", shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  recordBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18 },
  recordBtnText: { fontSize: 16, fontFamily: theme.fonts.bold, color: "#fff" },
});
