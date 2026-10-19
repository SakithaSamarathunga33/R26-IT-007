// HandwritingLevelCompleteScreen
// Celebration screen shown when a child finishes all tasks in one handwriting level.
// It checks the level score, unlocks the next level if the child passed, and offers the next step.
// Comes from: HandwritingResultScreen (after the last task of a level).
// Goes to: HandwritingTask (start next level or retry this one), HandwritingSummary (final level / "See results so far"),
// or HandwritingLevels ("Back to levels").
// Uses: handwritingLevelService (Firestore: level score, mastery, unlock saving, clearing old results),
// kidFeedback (spoken praise), handwritingTasks config, firebase auth, i18n, ConfettiBurst, StatChipRow, KidBackground.
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
import { speakFeedback, stopSpeaking } from "../../services/kidFeedback";
import { auth } from "../../config/firebase";
import { useT } from "../../i18n";
import {
  HandwritingLevelId,
  HANDWRITING_LEVELS,
  getHandwritingLevel,
  handwritingLevelTaskCount,
  handwritingTaskIndicesForLevel,
} from "../../config/handwritingTasks";
import {
  HandwritingLevelResult,
  MAX_UNMASTERED_PASSES,
  clearHandwritingLevelPredictions,
  countUnmasteredPass,
  fetchHandwritingLevelResult,
  markHandwritingLevelComplete,
  setHandwritingSupplement,
} from "../../services/handwritingLevelService";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "HandwritingLevelComplete">;
  route: RouteProp<RootStackParamList, "HandwritingLevelComplete">;
};

// Main component: shows the level result, unlock message and next-step buttons.
export default function HandwritingLevelCompleteScreen({ navigation, route }: Props) {
  const { t } = useT();
  const level = route.params.level;
  const config = getHandwritingLevel(level);
  const nextLevel = HANDWRITING_LEVELS.find((l) => l.id === ((level + 1) as HandwritingLevelId));
  const isFinalLevel = !nextLevel;

  const [saving, setSaving] = useState(true);
  const [saveFailed, setSaveFailed] = useState(false);
  // Score + 4-of-5 mastery from the original attempts only (supplementary ones never count).
  const [levelResult, setLevelResult] = useState<HandwritingLevelResult | null>(null);
  // Mastered, or allowed on after MAX_UNMASTERED_PASSES tries so the screening can still finish.
  const [canProceed, setCanProceed] = useState(false);
  const passProceedRef = useRef<boolean | null>(null);
  const popAnim = useRef(new Animated.Value(0)).current;

  // Persist the unlock before the child moves on — only once the level is
  // mastered. If this fails the level would silently re-lock on the next
  // login, so surface it and offer a retry.
  const saveProgress = useCallback(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setSaving(false); return; }
    setSaving(true);
    setSaveFailed(false);
    fetchHandwritingLevelResult(uid, level)
      .then(async (r) => {
        setLevelResult(r);
        // the save-retry card re-runs this; count the pass once and reuse the decision
        if (!r.mastered && passProceedRef.current === null) {
          passProceedRef.current = countUnmasteredPass(level) >= MAX_UNMASTERED_PASSES;
        }
        const proceed = r.mastered || !!passProceedRef.current;
        setCanProceed(proceed);
        if (proceed) await markHandwritingLevelComplete(uid, level);
      })
      .then(() => setSaveFailed(false))
      .catch((err) => {
        console.warn("[HandwritingLevels] could not save unlock:", err?.message);
        setSaveFailed(true);
      })
      .finally(() => setSaving(false));
  }, [level]);

  // Run the save/check once when the screen opens.
  useEffect(() => { saveProgress(); }, [saveProgress]);

  // Spoken celebration — the level-complete moment is the main reward, and
  // a pre-reader needs to hear it, not read it.
  const praisedRef = useRef(false);
  useEffect(() => {
    if (saving || !levelResult || praisedRef.current) return;
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
  }, [level, isFinalLevel, saving, canProceed, levelResult]);

  // Stop any speech when leaving the screen.
  useEffect(() => () => stopSpeaking(), []);

  // Pop-in animation for the hero card when the screen opens.
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

  // "Start Level n": clears old results for the next level and opens its first task.
  const startNextLevel = async () => {
    if (!nextLevel) return;
    stopSpeaking();
    const uid = auth.currentUser?.uid;
    // Drop any rows this level left behind on an earlier run so a replay doesn't
    // stack duplicates in the summary.
    if (uid) await clearHandwritingLevelPredictions(uid, nextLevel.id).catch(() => {});
    setHandwritingSupplement(null);
    navigation.replace("HandwritingTask", { taskIndex: handwritingTaskIndicesForLevel(nextLevel.id)[0] });
  };

  // Not mastered: replay this level from a clean slate so the new run is scored on its own.
  const retryLevel = async () => {
    stopSpeaking();
    const uid = auth.currentUser?.uid;
    if (uid) await clearHandwritingLevelPredictions(uid, level).catch(() => {});
    setHandwritingSupplement(null);
    navigation.replace("HandwritingTask", { taskIndex: handwritingTaskIndicesForLevel(level)[0] });
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
              {t("You completed all {n} tasks. Great writing!", { n: handwritingLevelTaskCount(level) })}
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Stat chips — score, tasks done, level number */}
        {levelResult && (
          <StatChipRow
            chips={[
              { icon: "star", label: t("Score"), value: `${levelResult.score}`, color: "#2563EB", bg: "#EFF6FF", border: "#DBEAFE" },
              { icon: "checkmark-circle", label: t("Correct"), value: `${levelResult.correct}/${levelResult.total}`, color: "#059669", bg: "#ECFDF5", border: "#BBF7D0" },
              { icon: "flag", label: t("Level"), value: `${level}`, color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
            ]}
          />
        )}

        {/* Unlock notice — or, when not yet mastered, a gentle invitation to practise */}
        {saving || !levelResult ? null : !canProceed ? (
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
              <Text style={styles.unlockSub}>{t("You finished every writing task. Time to see the results.")}</Text>
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
        {!levelResult ? null : !canProceed ? (
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
          <LinearGradient colors={["#3B72F6", "#2563EB"]} style={styles.primaryBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <TouchableOpacity
              style={styles.primaryBtnInner}
              activeOpacity={0.88}
              onPress={() => { stopSpeaking(); navigation.replace("HandwritingSummary"); }}
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
            onPress={() => navigation.replace("HandwritingSummary")}
            disabled={saving}
          >
            <Ionicons name="stats-chart-outline" size={18} color="#64748B" />
            <Text style={styles.secondaryBtnText}>{t("See results so far")}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.linkBtn}
          activeOpacity={0.7}
          onPress={() => navigation.replace("HandwritingLevels")}
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
  // --- Screen layout ---
  // Colours: light blue-grey page background (#F5F7FF)
  container: { flex: 1, backgroundColor: "#F5F7FF" },

  // --- Header --- dark slate title
  header: {
    paddingTop: 58, paddingHorizontal: 20, paddingBottom: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  headerTitle: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: "#1E293B" },

  content: { flex: 1, paddingHorizontal: 20, paddingTop: 8, alignItems: "center" },

  // --- Hero card (trophy + "Level n finished!") ---
  // Colours: gradient from the level colours, white text, see-through white circles for decoration
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

  // --- Unlock / practise notice card ---
  // Colours: white card, light border, dark title, grey subtext, badge colour from the level
  unlockCard: {
    width: "100%", flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 20, padding: 16,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  unlockBadge: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  unlockTitle: { fontSize: 14, fontFamily: theme.fonts.bold, color: "#1E293B", marginBottom: 3 },
  unlockSub: { fontSize: 12, fontFamily: theme.fonts.regular, color: "#64748B", lineHeight: 17 },

  // --- "Progress not saved" retry card ---
  // Colours: light red background, red border and text
  saveFailCard: {
    width: "100%", flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#FFF5F5", borderWidth: 1, borderColor: "#FECACA",
    borderRadius: 16, padding: 14, marginTop: 14,
  },
  saveFailTitle: { fontSize: 13, fontFamily: theme.fonts.semiBold, color: "#EF4444", marginBottom: 2 },
  saveFailSub: { fontSize: 11, fontFamily: theme.fonts.regular, color: "#DC2626", lineHeight: 16 },

  // --- Main action button ---
  // Colours: gradient set in JSX (level colour or blue), blue glow shadow, white text
  primaryBtn: {
    width: "100%", borderRadius: 50, marginBottom: 12,
    shadowColor: "#2563EB", shadowOpacity: 0.3, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  primaryBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18 },
  primaryBtnText: { fontSize: 16, fontFamily: theme.fonts.bold, color: "#fff" },

  // --- Secondary button ("See results so far") ---
  // Colours: white button, light grey border, grey text
  secondaryBtn: {
    width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 16, borderRadius: 50,
    backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E2E8F0", marginBottom: 8,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  secondaryBtnText: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: "#64748B" },

  // --- Text link ("Back to levels") --- light grey underlined text
  linkBtn: { paddingVertical: 10 },
  linkBtnText: { fontSize: 13, fontFamily: theme.fonts.medium, color: "#94A3B8", textDecorationLine: "underline" },
});
