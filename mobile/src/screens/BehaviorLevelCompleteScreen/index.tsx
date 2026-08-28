import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, StatusBar, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { auth } from "../../config/firebase";
import {
  BehaviorLevelId,
  BEHAVIOR_LEVELS,
  getBehaviorLevel,
  behaviorLevelTaskCount,
  behaviorTaskIndicesForLevel,
} from "../../config/behaviorTasks";
import {
  clearBehaviorLevelPredictions,
  markBehaviorLevelComplete,
} from "../../services/behaviorLevelService";
import { stopSpeaking } from "../../services/ttsService";
import { speakFeedback } from "../../services/kidFeedback";
import ScreenContainer from "../../components/common/ScreenContainer";
import MascotGuide from "../../components/common/MascotGuide";
import StarProgress from "../../components/common/StarProgress";
import { fonts } from "../../theme/typography";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "BehaviorLevelComplete">;
  route: RouteProp<RootStackParamList, "BehaviorLevelComplete">;
};

export default function BehaviorLevelCompleteScreen({ navigation, route }: Props) {
  const level = route.params.level;
  const config = getBehaviorLevel(level);
  const nextLevel = BEHAVIOR_LEVELS.find((l) => l.id === ((level + 1) as BehaviorLevelId));
  const isFinalLevel = !nextLevel;

  const [saving, setSaving] = useState(true);
  const [saveFailed, setSaveFailed] = useState(false);
  const float = useRef(new Animated.Value(0)).current;
  const praisedRef = useRef(false);

  // Persist the unlock before the child moves on. If this fails the level would
  // silently re-lock on the next login, so surface it and offer a retry.
  const saveProgress = useCallback(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setSaving(false); return; }
    setSaving(true);
    setSaveFailed(false);
    markBehaviorLevelComplete(uid, level)
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
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [float]);

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

  return (
    <ScreenContainer backgroundColor="#0C9B70" padded>
      <StatusBar barStyle="light-content" backgroundColor="#0C9B70" />
      <LinearGradient colors={["#2ED09B", "#0C9B70"]} style={StyleSheet.absoluteFill} />
      <View style={styles.body}>
        <Animated.View style={{ transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }] }}>
          <MascotGuide state="celebrating" size={172} tint="rgba(255,255,255,0.16)" label="mascot · high five" />
        </Animated.View>
        <Text style={styles.title}>Level {level} done!</Text>
        <Text style={styles.sub}>{config.title} · {behaviorLevelTaskCount(level)} of {behaviorLevelTaskCount(level)} played</Text>
        <View style={styles.stars}>
          <StarProgress total={3} filled={3} size={40} emptyColor="rgba(255,255,255,0.3)" />
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{behaviorLevelTaskCount(level)}</Text>
            <Text style={styles.statLabel}>activities</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{isFinalLevel ? "All" : `L${level + 1}`}</Text>
            <Text style={styles.statLabel}>{isFinalLevel ? "levels done" : "unlocked"}</Text>
          </View>
        </View>
        {saveFailed ? (
          <Text style={styles.saveFail} onPress={saveProgress}>Progress not saved — tap to retry</Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Text
          style={[styles.continue, saving && { opacity: 0.55 }]}
          onPress={() => {
            if (saving) return;
            if (isFinalLevel) go(() => navigation.replace("BehaviorSummary"));
            else startNextLevel();
          }}
        >
          {isFinalLevel ? "See what Lexi found" : `Start Level ${nextLevel!.id}`}
        </Text>
        {!isFinalLevel ? (
          <Text
            style={styles.finish}
            onPress={() => { if (!saving) go(() => navigation.replace("BehaviorSummary")); }}
          >
            See results so far
          </Text>
        ) : null}
        <Text
          style={styles.finish}
          onPress={() => { if (!saving) go(() => navigation.replace("BehaviorLevels")); }}
        >
          Back to levels
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  title: { fontFamily: fonts.extraBold, fontSize: 34, color: "#fff", marginTop: 34, letterSpacing: -0.6, textAlign: "center" },
  sub: { fontFamily: fonts.bold, fontSize: 16, color: "#CBF1E3", marginTop: 10, textAlign: "center" },
  stars: { marginTop: 30 },
  stats: { flexDirection: "row", gap: 12, width: "100%", marginTop: 34 },
  stat: { flex: 1, backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 20, padding: 16, alignItems: "center" },
  statValue: { fontFamily: fonts.extraBold, fontSize: 22, color: "#fff" },
  statLabel: { fontFamily: fonts.bold, fontSize: 11, color: "#CBF1E3", marginTop: 2 },
  saveFail: { fontFamily: fonts.bold, fontSize: 13, color: "#FFE0DC", marginTop: 18 },
  actions: { gap: 8, marginBottom: 10 },
  continue: {
    paddingVertical: 20,
    borderRadius: 24,
    backgroundColor: "#fff",
    color: "#0C9B70",
    fontFamily: fonts.extraBold,
    fontSize: 17,
    textAlign: "center",
    overflow: "hidden",
  },
  finish: { fontFamily: fonts.extraBold, fontSize: 14.5, color: "#CBF1E3", textAlign: "center", paddingVertical: 16 },
});
