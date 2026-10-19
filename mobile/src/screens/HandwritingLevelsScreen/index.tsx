// Handwriting Levels screen.
// Lets the child pick one of the three handwriting levels. Shows overall progress,
// locks a level until the one before it is finished, and a "See results so far" button.
// Comes from: HandwritingIntro ("Choose a Level"), or HandwritingLevelComplete.
// Goes to: HandwritingTask (first task of the chosen level), or HandwritingSummary
// (results so far).
// Uses: handwritingTasks config (levels, task counts), handwritingLevelService
// (saved progress, unlock rule, supplement reset), sessionService (clear old
// predictions in the database), Firebase auth (current user id), i18n useT.
import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { theme } from "../../theme";
import KidBackground from "../../components/KidBackground";
import { auth } from "../../config/firebase";
import { useT } from "../../i18n";
import {
  HANDWRITING_LEVELS,
  HandwritingLevel,
  handwritingLevelTaskCount,
  handwritingTaskIndicesForLevel,
} from "../../config/handwritingTasks";
import { clearModulePredictions } from "../../services/sessionService";
import {
  HandwritingLevelProgress,
  clearHandwritingLevelPredictions,
  fetchHandwritingLevelProgress,
  isHandwritingLevelUnlocked,
  setHandwritingSupplement,
} from "../../services/handwritingLevelService";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "HandwritingLevels">;
};

// Main screen component: loads level progress and lists the level cards.
export default function HandwritingLevelsScreen({ navigation }: Props) {
  const { t } = useT();
  const [progress, setProgress] = useState<HandwritingLevelProgress>({ completed: [] });
  const [loading, setLoading] = useState(true);

  // Loads the saved progress (which levels are done) each time the screen is shown.
  // Re-read on focus so a level finished deeper in the flow shows as unlocked
  // the moment the child comes back here.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setLoading(false);
        return;
      }
      setLoading(true);
      fetchHandwritingLevelProgress(uid)
        .then((p) => { if (active) setProgress(p); })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [])
  );

  // Tapped on a level card: clears old results for that level, then opens its first task.
  const startLevel = async (level: HandwritingLevel) => {
    const uid = auth.currentUser?.uid;
    // Clear before the first task so an in-flight delete can't eat the new
    // attempts. Level 1 restarts the whole run and wipes every level; Levels 2
    // and 3 only refresh their own rows, keeping earlier levels in the summary.
    if (uid) {
      if (level.id === 1) {
        await clearModulePredictions(uid, "handwriting").catch(() => {});
      } else {
        await clearHandwritingLevelPredictions(uid, level.id).catch(() => {});
      }
    }
    setHandwritingSupplement(null); // drop any supplement left by an abandoned run
    const firstIndex = handwritingTaskIndicesForLevel(level.id)[0];
    navigation.navigate("HandwritingTask", { taskIndex: firstIndex });
  };

  const completedCount = progress.completed.length;

  return (
    <View style={styles.container}>
      <KidBackground variant="handwriting" />
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("Choose a Level")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Overall progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressTop}>
            <View style={styles.progressIconWrap}>
              <Ionicons name="trophy-outline" size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.progressTitle}>{t("Your Progress")}</Text>
              <Text style={styles.progressSub}>
                {t("{done} of {total} levels complete", { done: completedCount, total: HANDWRITING_LEVELS.length })}
              </Text>
            </View>
            <Text style={styles.progressPct}>
              {Math.round((completedCount / HANDWRITING_LEVELS.length) * 100)}%
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={["#3B72F6", "#2563EB"]}
              style={[styles.progressFill, { width: `${(completedCount / HANDWRITING_LEVELS.length) * 100}%` }]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            />
          </View>
        </View>

        {/* Finished levels keep their results until the screening resets, so they stay viewable after leaving the module. */}
        {!loading && completedCount > 0 && (
          <TouchableOpacity style={styles.resultsBtn} activeOpacity={0.85} onPress={() => navigation.navigate("HandwritingSummary")}>
            <Ionicons name="stats-chart-outline" size={16} color="#2563EB" />
            <Text style={styles.resultsBtnText}>{t("See results so far")}</Text>
          </TouchableOpacity>
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
        ) : (
          HANDWRITING_LEVELS.map((level) => {
            const unlocked = isHandwritingLevelUnlocked(level.id, progress);
            const done = progress.completed.includes(level.id);
            const count = handwritingLevelTaskCount(level.id);

            return (
              <TouchableOpacity
                key={level.id}
                style={[styles.levelCard, !unlocked && styles.levelCardLocked]}
                activeOpacity={unlocked ? 0.85 : 1}
                disabled={!unlocked}
                onPress={() => startLevel(level)}
              >
                {/* Level badge */}
                {unlocked ? (
                  <LinearGradient
                    colors={level.gradColors}
                    style={styles.levelBadge}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.levelBadgeNum}>{level.id}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.levelBadge, styles.levelBadgeLocked]}>
                    <Ionicons name="lock-closed" size={20} color="#94A3B8" />
                  </View>
                )}

                <View style={styles.levelInfo}>
                  <View style={styles.levelTitleRow}>
                    <Text style={[styles.levelTitle, !unlocked && styles.textMuted]}>{t(level.title)}</Text>
                    {done && (
                      <View style={styles.doneChip}>
                        <Ionicons name="checkmark" size={11} color="#059669" />
                        <Text style={styles.doneChipText}>{t("Done")}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.levelDesc, !unlocked && styles.textMuted]}>
                    {unlocked ? t(level.description) : t("Finish Level {n} to unlock this.", { n: level.id - 1 })}
                  </Text>

                  <View style={styles.metaRow}>
                    <View style={[styles.metaChip, { backgroundColor: unlocked ? level.bg : "#F1F5F9" }]}>
                      <Ionicons
                        name={level.icon as any}
                        size={11}
                        color={unlocked ? level.color : "#94A3B8"}
                      />
                      <Text style={[styles.metaChipText, { color: unlocked ? level.color : "#94A3B8" }]}>
                        {t("Level {n}", { n: level.id })}
                      </Text>
                    </View>
                    <View style={styles.metaChipPlain}>
                      <Ionicons name="list-outline" size={11} color="#94A3B8" />
                      <Text style={styles.metaChipPlainText}>{t("{n} tasks", { n: count })}</Text>
                    </View>
                  </View>
                </View>

                {unlocked && (
                  <View style={styles.starCol}>
                    {/* Stars read as progress for a child who can't yet read "Done". */}
                    <View style={styles.starRow}>
                      {HANDWRITING_LEVELS.map((s) => (
                        <Ionicons
                          key={s.id}
                          name={progress.completed.includes(s.id) ? "star" : "star-outline"}
                          size={11}
                          color={progress.completed.includes(s.id) ? "#F59E0B" : "#CBD5E1"}
                        />
                      ))}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}

        {/* Note */}
        <View style={styles.noteCard}>
          <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
          <Text style={styles.noteText}>
            {t("Levels get harder as you go — from tracing single letters up to writing whole words from memory.")}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// Colours used below: light blue-grey page background (#F5F7FF), white cards with a pale
// border, dark slate titles (#1E293B), grey secondary text (#64748B / #94A3B8), blue
// (#2563EB) for progress and the results button, green for "Done", amber for stars,
// and washed-out greys for locked levels.
const styles = StyleSheet.create({
  // Page and header (back button + title)
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
  headerTitle: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: "#1E293B" },

  // Scroll content and the pale blue "See results so far" button
  content: { paddingHorizontal: 20, paddingTop: 8 },
  resultsBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 16, paddingVertical: 14, marginBottom: 16,
    borderWidth: 1.5, borderColor: "#BFDBFE", backgroundColor: "#EFF6FF",
  },
  resultsBtnText: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: "#2563EB" },

  // Overall progress card: white card with a blue progress bar
  progressCard: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 20, padding: 16, marginBottom: 20,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  progressTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  progressIconWrap: {
    width: 40, height: 40, borderRadius: 13, backgroundColor: "#EFF6FF",
    alignItems: "center", justifyContent: "center",
  },
  progressTitle: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: "#1E293B", marginBottom: 2 },
  progressSub: { fontSize: 12, fontFamily: theme.fonts.regular, color: "#94A3B8" },
  progressPct: { fontSize: 18, fontFamily: theme.fonts.extraBold, color: "#2563EB" },
  progressTrack: { height: 6, backgroundColor: "#E2E8F0", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },

  // Level cards: white when open, faded grey when locked
  levelCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 20, padding: 16, marginBottom: 12,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  levelCardLocked: { backgroundColor: "#FBFCFE", borderColor: "#F1F5F9", shadowOpacity: 0, elevation: 0 },

  levelBadge: { width: 52, height: 52, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  levelBadgeLocked: { backgroundColor: "#F1F5F9" },
  levelBadgeNum: { fontSize: 22, fontFamily: theme.fonts.extraBold, color: "#fff" },

  levelInfo: { flex: 1 },
  levelTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  levelTitle: { fontSize: 15, fontFamily: theme.fonts.bold, color: "#1E293B" },
  levelDesc: { fontSize: 12, fontFamily: theme.fonts.regular, color: "#64748B", lineHeight: 17, marginBottom: 8 },
  textMuted: { color: "#94A3B8" },

  // Green "Done" chip
  doneChip: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#ECFDF5", borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2,
  },
  doneChipText: { fontSize: 10, fontFamily: theme.fonts.semiBold, color: "#059669" },

  // Small info chips (level number, task count) and the star row
  metaRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  metaChipText: { fontSize: 10, fontFamily: theme.fonts.semiBold },
  metaChipPlain: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#F8FAFC", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4,
  },
  metaChipPlainText: { fontSize: 10, fontFamily: theme.fonts.medium, color: "#94A3B8" },

  starCol: { alignItems: "center", gap: 4 },
  starRow: { flexDirection: "row", gap: 1 },

  // Pale blue note box at the bottom
  noteCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE",
    borderRadius: 16, padding: 14, marginTop: 8,
  },
  noteText: { flex: 1, fontSize: 12, fontFamily: theme.fonts.regular, color: "#3B72F6", lineHeight: 18 },
});
