import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { theme } from "../../theme";
import KidBackground from "../../components/KidBackground";
import StatChipRow from "../../components/StatChipRow";
import ConfettiBurst from "../../components/ConfettiBurst";
import { auth } from "../../config/firebase";
import { useT } from "../../i18n";
import {
  BehaviorLevelId,
  BEHAVIOR_LEVELS,
  getBehaviorLevel,
  behaviorLevelTaskCount,
  behaviorTaskIndicesForLevel,
} from "../../config/behaviorTasks";
import {
  clearBehaviorLevelPredictions,
  countBehaviorUnmasteredPass,
  markBehaviorLevelComplete,
} from "../../services/behaviorLevelService";
import { MASTERY_MIN_SCORE, MAX_UNMASTERED_PASSES } from "../../services/levelProgressService";
import { stopSpeaking } from "../../services/ttsService";
import { speakFeedback } from "../../services/kidFeedback";
import { LevelScore, fetchLevelScore } from "../../services/summaryService";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "BehaviorLevelComplete">;
  route: RouteProp<RootStackParamList, "BehaviorLevelComplete">;
};

export default function BehaviorLevelCompleteScreen({ navigation, route }: Props) {
  const { t } = useT();
  const level = route.params.level;
  const config = getBehaviorLevel(level);
  const nextLevel = BEHAVIOR_LEVELS.find((l) => l.id === ((level + 1) as BehaviorLevelId));
  const isFinalLevel = !nextLevel;

  const [saving, setSaving] = useState(true);
  const [saveFailed, setSaveFailed] = useState(false);
  const [levelScore, setLevelScore] = useState<LevelScore | null>(null);
  // Mastered (score >= MASTERY_MIN_SCORE), or allowed on after MAX_UNMASTERED_PASSES tries.
  const [canProceed, setCanProceed] = useState(false);
  const passProceedRef = useRef<boolean | null>(null);
  const popAnim = useRef(new Animated.Value(0)).current;
  const praisedRef = useRef(false);

  // Persist the unlock before the child moves on — only once the level is
  // mastered. If this fails the level would silently re-lock on the next
  // login, so surface it and offer a retry.
  const saveProgress = useCallback(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setSaving(false); return; }
    setSaving(true);
    setSaveFailed(false);
    fetchLevelScore("behavior_predictions", uid, level)
      .then(async (s) => {
        setLevelScore(s);
        const mastered = s.score >= MASTERY_MIN_SCORE;
        // the save-retry card re-runs this; count the pass once and reuse the decision
        if (!mastered && passProceedRef.current === null) {
          passProceedRef.current = countBehaviorUnmasteredPass(level) >= MAX_UNMASTERED_PASSES;
        }
        const proceed = mastered || !!passProceedRef.current;
        setCanProceed(proceed);
        if (proceed) await markBehaviorLevelComplete(uid, level);
      })
      .then(() => setSaveFailed(false))
      .catch((err) => {
        console.warn("[BehaviorLevels] could not save unlock:", err?.message);
        setSaveFailed(true);
      })
      .finally(() => setSaving(false));
  }, [level]);

  useEffect(() => { saveProgress(); }, [saveProgress]);

  // Spoken celebration — the level-complete moment is the main reward, and
  // a pre-reader needs to hear it, not read it.
  useEffect(() => {
    if (saving || !levelScore || praisedRef.current) return;
    praisedRef.current = true;
    const t = setTimeout(
      () => speakFeedback("levelDone", {
        seed: level,
        extra: !canProceed ? "Let's practise and try again!"
          : isFinalLevel ? "All levels done!" : `Level ${level + 1} unlocked.`,
      }),
      800
    );
    return () => clearTimeout(t);
  }, [level, isFinalLevel, saving, canProceed, levelScore]);

  useEffect(() => () => stopSpeaking(), []);

  useEffect(() => {
    Animated.spring(popAnim, { toValue: 1, useNativeDriver: true, friction: 5, tension: 60 }).start();
  }, []);

  const scale = popAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  // A gentle continuous bounce on the trophy so the hero card feels alive,
  // not just a one-time pop-in.
  const trophyBounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(trophyBounce, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(trophyBounce, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [trophyBounce]);
  const trophyTranslateY = trophyBounce.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });

  const go = (fn: () => void) => { stopSpeaking(); fn(); };

  const startNextLevel = async () => {
    if (!nextLevel) return;
    stopSpeaking();
    const uid = auth.currentUser?.uid;
    // Drop any rows this level left behind on an earlier run so a replay doesn't
    // stack duplicates in the summary.
    if (uid) await clearBehaviorLevelPredictions(uid, nextLevel.id).catch(() => {});
    navigation.replace("BehaviorActivity", { taskIndex: behaviorTaskIndicesForLevel(nextLevel.id)[0] });
  };

  // Not mastered: replay this level from a clean slate so the new run is scored on its own.
  const retryLevel = async () => {
    stopSpeaking();
    const uid = auth.currentUser?.uid;
    if (uid) await clearBehaviorLevelPredictions(uid, level).catch(() => {});
    navigation.replace("BehaviorActivity", { taskIndex: behaviorTaskIndicesForLevel(level)[0] });
  };

  return (
    <View style={styles.container}>
      <KidBackground variant="celebration" />
      <ConfettiBurst />
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />

      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>{t("Level Complete")}</Text>
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
            <Animated.View style={[styles.heroIconWrap, { transform: [{ translateY: trophyTranslateY }] }]}>
              <Ionicons name="trophy" size={52} color="#fff" />
            </Animated.View>
            <Text style={styles.heroKicker}>{t("Level {n} finished!", { n: level })}</Text>
            <Text style={styles.heroTitle}>{t(config.title)}</Text>
            <Text style={styles.heroSub}>
              {t("You completed all {n} activities. Great focus!", { n: behaviorLevelTaskCount(level) })}
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Stat chips — score, activities done, level number */}
        {levelScore && (
          <StatChipRow
            chips={[
              { icon: "star", label: t("Score"), value: `${levelScore.score}`, color: "#0891B2", bg: "#ECFEFF", border: "#CFFAFE" },
              { icon: "checkmark-circle", label: t("Done"), value: `${levelScore.lowRiskCount}/${levelScore.taskCount}`, color: "#059669", bg: "#ECFDF5", border: "#BBF7D0" },
              { icon: "flag", label: t("Level"), value: `${level}`, color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
            ]}
          />
        )}

        {/* Unlock notice — or, when not yet mastered, a gentle invitation to practise */}
        {saving || !levelScore ? null : !canProceed ? (
          <View style={styles.unlockCard}>
            <View style={[styles.unlockBadge, { backgroundColor: config.bg }]}>
              <Ionicons name="refresh" size={20} color={config.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.unlockTitle}>{t("Let's practise a little more!")}</Text>
              <Text style={styles.unlockSub}>
                {nextLevel ? t("Play Level {n} again to get even better and open Level {next}.", { n: level, next: nextLevel.id }) : t("Play Level {n} again to get even better.", { n: level })}
              </Text>
            </View>
          </View>
        ) : nextLevel ? (
          <View style={styles.unlockCard}>
            <LinearGradient
              colors={nextLevel.gradColors}
              style={styles.unlockBadge}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Ionicons name="lock-open" size={20} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.unlockTitle}>{t("Level {n} unlocked — {title}", { n: nextLevel.id, title: t(nextLevel.title) })}</Text>
              <Text style={styles.unlockSub}>{t(nextLevel.description)}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.unlockCard}>
            <View style={[styles.unlockBadge, { backgroundColor: "#ECFDF5" }]}>
              <Ionicons name="checkmark-done" size={20} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.unlockTitle}>{t("All levels complete!")}</Text>
              <Text style={styles.unlockSub}>{t("You finished every activity. Time to see the results.")}</Text>
            </View>
          </View>
        )}

        {/* Progress could not be saved — without this the level re-locks on next login */}
        {saveFailed && (
          <TouchableOpacity style={styles.saveFailCard} activeOpacity={0.8} onPress={saveProgress}>
            <Ionicons name="cloud-offline-outline" size={18} color="#EF4444" />
            <View style={{ flex: 1 }}>
              <Text style={styles.saveFailTitle}>{t("Progress not saved")}</Text>
              <Text style={styles.saveFailSub}>
                {t("This level may be locked again next time you log in. Tap to try again.")}
              </Text>
            </View>
            <Ionicons name="refresh" size={18} color="#EF4444" />
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }} />

        {/* Primary action */}
        {!levelScore ? null : !canProceed ? (
          <LinearGradient colors={config.gradColors} style={styles.primaryBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <TouchableOpacity
              style={styles.primaryBtnInner}
              activeOpacity={0.88}
              onPress={retryLevel}
              disabled={saving}
            >
              <Text style={styles.primaryBtnText}>{t("Try Level {n} Again", { n: level })}</Text>
              <Ionicons name="refresh" size={18} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>
        ) : isFinalLevel ? (
          <LinearGradient colors={["#0891B2", "#0E7490"]} style={styles.primaryBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <TouchableOpacity
              style={styles.primaryBtnInner}
              activeOpacity={0.88}
              onPress={() => go(() => navigation.replace("BehaviorSummary"))}
              disabled={saving}
            >
              <Text style={styles.primaryBtnText}>{t("View Full Summary")}</Text>
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
              <Text style={styles.primaryBtnText}>{t("Start Level {n}", { n: nextLevel!.id })}</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>
        )}

        {(!isFinalLevel || !canProceed) && (
          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.8}
            onPress={() => go(() => navigation.replace("BehaviorSummary"))}
            disabled={saving}
          >
            <Ionicons name="stats-chart-outline" size={18} color="#64748B" />
            <Text style={styles.secondaryBtnText}>{t("See results so far")}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.linkBtn}
          activeOpacity={0.7}
          onPress={() => go(() => navigation.replace("BehaviorLevels"))}
          disabled={saving}
        >
          <Text style={styles.linkBtnText}>{t("Back to levels")}</Text>
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
    shadowColor: "#0891B2", shadowOpacity: 0.3, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
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
