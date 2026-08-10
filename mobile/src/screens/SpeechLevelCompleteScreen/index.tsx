import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { theme } from "../../theme";
import { speakFeedback, stopSpeaking } from "../../services/kidFeedback";
import { auth } from "../../config/firebase";
import { LevelId, SPEECH_LEVELS, getLevel, levelTaskCount, taskIndicesForLevel } from "../../config/speechTasks";
import { clearLevelPredictions, markLevelComplete } from "../../services/speechLevelService";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "SpeechLevelComplete">;
  route: RouteProp<RootStackParamList, "SpeechLevelComplete">;
};

export default function SpeechLevelCompleteScreen({ navigation, route }: Props) {
  const level = route.params.level;
  const config = getLevel(level);
  const nextLevel = SPEECH_LEVELS.find((l) => l.id === ((level + 1) as LevelId));
  const isFinalLevel = !nextLevel;

  const [saving, setSaving] = useState(true);
  const [saveFailed, setSaveFailed] = useState(false);
  const popAnim = useRef(new Animated.Value(0)).current;

  // Persist the unlock before the child moves on. If this fails the level would
  // silently re-lock on the next login, so surface it and offer a retry.
  const saveProgress = useCallback(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setSaving(false); return; }
    setSaving(true);
    setSaveFailed(false);
    markLevelComplete(uid, level)
      .then(() => setSaveFailed(false))
      .catch((err) => {
        console.warn("[SpeechLevels] could not save unlock:", err?.message);
        setSaveFailed(true);
      })
      .finally(() => setSaving(false));
  }, [level]);

  useEffect(() => { saveProgress(); }, [saveProgress]);

  // Spoken celebration — the level-complete moment is the main reward, and
  // a pre-reader needs to hear it, not read it.
  const praisedRef = useRef(false);
  useEffect(() => {
    if (praisedRef.current) return;
    praisedRef.current = true;
    const t = setTimeout(
      () => speakFeedback("levelDone", {
        seed: level,
        extra: isFinalLevel ? "All levels done!" : `Level ${level + 1} unlocked.`,
      }),
      500
    );
    return () => clearTimeout(t);
  }, [level, isFinalLevel]);

  useEffect(() => () => stopSpeaking(), []);

  useEffect(() => {
    Animated.spring(popAnim, { toValue: 1, useNativeDriver: true, friction: 5, tension: 60 }).start();
  }, []);

  const scale = popAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  const startNextLevel = async () => {
    if (!nextLevel) return;
    const uid = auth.currentUser?.uid;
    // Drop any rows this level left behind on an earlier run so a replay doesn't
    // stack duplicates in the summary.
    if (uid) await clearLevelPredictions(uid, nextLevel.id).catch(() => {});
    navigation.replace("SpeechActivity", { taskIndex: taskIndicesForLevel(nextLevel.id)[0] });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />

      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Level Complete</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Celebration hero */}
        <Animated.View style={{ width: "100%", transform: [{ scale }] }}>
          <LinearGradient
            colors={config.gradColors}
            style={styles.heroCard}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <View style={styles.decoCircle1} />
            <View style={styles.decoCircle2} />
            <View style={styles.heroIconWrap}>
              <Ionicons name="trophy" size={52} color="#fff" />
            </View>
            <Text style={styles.heroKicker}>Level {level} finished!</Text>
            <Text style={styles.heroTitle}>{config.title}</Text>
            <Text style={styles.heroSub}>
              You completed all {levelTaskCount(level)} activities. Great speaking!
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Unlock notice */}
        {nextLevel ? (
          <View style={styles.unlockCard}>
            <LinearGradient
              colors={nextLevel.gradColors}
              style={styles.unlockBadge}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Ionicons name="lock-open" size={20} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.unlockTitle}>Level {nextLevel.id} unlocked — {nextLevel.title}</Text>
              <Text style={styles.unlockSub}>{nextLevel.description}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.unlockCard}>
            <View style={[styles.unlockBadge, { backgroundColor: "#ECFDF5" }]}>
              <Ionicons name="checkmark-done" size={20} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.unlockTitle}>All levels complete!</Text>
              <Text style={styles.unlockSub}>You finished every speech activity. Time to see the results.</Text>
            </View>
          </View>
        )}

        {/* Progress could not be saved — without this the level re-locks on next login */}
        {saveFailed && (
          <TouchableOpacity style={styles.saveFailCard} activeOpacity={0.8} onPress={saveProgress}>
            <Ionicons name="cloud-offline-outline" size={18} color="#EF4444" />
            <View style={{ flex: 1 }}>
              <Text style={styles.saveFailTitle}>Progress not saved</Text>
              <Text style={styles.saveFailSub}>
                This level may be locked again next time you log in. Tap to try again.
              </Text>
            </View>
            <Ionicons name="refresh" size={18} color="#EF4444" />
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }} />

        {/* Primary action */}
        {isFinalLevel ? (
          <LinearGradient colors={["#3B72F6", "#2563EB"]} style={styles.primaryBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <TouchableOpacity
              style={styles.primaryBtnInner}
              activeOpacity={0.88}
              onPress={() => navigation.replace("SpeechSummary")}
              disabled={saving}
            >
              <Text style={styles.primaryBtnText}>View Full Summary</Text>
              <Ionicons name="bar-chart-outline" size={18} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>
        ) : (
          <LinearGradient colors={nextLevel!.gradColors} style={styles.primaryBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <TouchableOpacity
              style={styles.primaryBtnInner}
              activeOpacity={0.88}
              onPress={startNextLevel}
              disabled={saving}
            >
              <Text style={styles.primaryBtnText}>Start Level {nextLevel!.id}</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>
        )}

        {/* Secondary actions */}
        {!isFinalLevel && (
          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.8}
            onPress={() => navigation.replace("SpeechSummary")}
            disabled={saving}
          >
            <Ionicons name="stats-chart-outline" size={18} color="#64748B" />
            <Text style={styles.secondaryBtnText}>See results so far</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.linkBtn}
          activeOpacity={0.7}
          onPress={() => navigation.replace("SpeechLevels")}
          disabled={saving}
        >
          <Text style={styles.linkBtnText}>Back to levels</Text>
        </TouchableOpacity>

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
  headerTitle: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: "#1E293B" },

  content: { flex: 1, paddingHorizontal: 20, paddingTop: 8, alignItems: "center" },

  heroCard: {
    borderRadius: 24, padding: 28, alignItems: "center", marginBottom: 18, overflow: "hidden",
    shadowOpacity: 0.28, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 10,
  },
  decoCircle1: { position: "absolute", width: 170, height: 170, borderRadius: 85, backgroundColor: "rgba(255,255,255,0.08)", top: -55, right: -45 },
  decoCircle2: { position: "absolute", width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(255,255,255,0.06)", bottom: -25, left: 8 },
  heroIconWrap: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 3, borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  heroKicker: { fontSize: 12, fontFamily: theme.fonts.semiBold, color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 },
  heroTitle: { fontSize: 24, fontFamily: theme.fonts.extraBold, color: "#fff", marginBottom: 8, textAlign: "center" },
  heroSub: { fontSize: 13, fontFamily: theme.fonts.regular, color: "rgba(255,255,255,0.85)", textAlign: "center", lineHeight: 19 },

  unlockCard: {
    width: "100%", flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 20, padding: 16,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  unlockBadge: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  unlockTitle: { fontSize: 14, fontFamily: theme.fonts.bold, color: "#1E293B", marginBottom: 3 },
  unlockSub: { fontSize: 12, fontFamily: theme.fonts.regular, color: "#64748B", lineHeight: 17 },

  saveFailCard: {
    width: "100%", flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#FFF5F5", borderWidth: 1, borderColor: "#FECACA",
    borderRadius: 16, padding: 14, marginTop: 14,
  },
  saveFailTitle: { fontSize: 13, fontFamily: theme.fonts.semiBold, color: "#EF4444", marginBottom: 2 },
  saveFailSub: { fontSize: 11, fontFamily: theme.fonts.regular, color: "#DC2626", lineHeight: 16 },

  primaryBtn: {
    width: "100%", borderRadius: 50, marginBottom: 12,
    shadowColor: "#2563EB", shadowOpacity: 0.3, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  primaryBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18 },
  primaryBtnText: { fontSize: 16, fontFamily: theme.fonts.bold, color: "#fff" },

  secondaryBtn: {
    width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 16, borderRadius: 50,
    backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E2E8F0", marginBottom: 8,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  secondaryBtnText: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: "#64748B" },

  linkBtn: { paddingVertical: 10 },
  linkBtnText: { fontSize: 13, fontFamily: theme.fonts.medium, color: "#94A3B8", textDecorationLine: "underline" },
});
