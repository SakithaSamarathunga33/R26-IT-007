import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, StatusBar, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { speakFeedback, stopSpeaking } from "../../services/kidFeedback";
import { auth } from "../../config/firebase";
import {
  HandwritingLevelId,
  HANDWRITING_LEVELS,
  getHandwritingLevel,
  handwritingLevelTaskCount,
  handwritingTaskIndicesForLevel,
} from "../../config/handwritingTasks";
import {
  clearHandwritingLevelPredictions,
  markHandwritingLevelComplete,
} from "../../services/handwritingLevelService";
import ScreenContainer from "../../components/common/ScreenContainer";
import MascotGuide from "../../components/common/MascotGuide";
import StarProgress from "../../components/common/StarProgress";
import { fonts } from "../../theme/typography";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "HandwritingLevelComplete">;
  route: RouteProp<RootStackParamList, "HandwritingLevelComplete">;
};

export default function HandwritingLevelCompleteScreen({ navigation, route }: Props) {
  const level = route.params.level;
  const config = getHandwritingLevel(level);
  const nextLevel = HANDWRITING_LEVELS.find((l) => l.id === ((level + 1) as HandwritingLevelId));
  const isFinalLevel = !nextLevel;

  const [saving, setSaving] = useState(true);
  const [saveFailed, setSaveFailed] = useState(false);
  const float = useRef(new Animated.Value(0)).current;

  // Persist the unlock before the child moves on. If this fails the level would
  // silently re-lock on the next login, so surface it and offer a retry.
  const saveProgress = useCallback(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setSaving(false); return; }
    setSaving(true);
    setSaveFailed(false);
    markHandwritingLevelComplete(uid, level)
      .then(() => setSaveFailed(false))
      .catch((err) => {
        console.warn("[HandwritingLevels] could not save unlock:", err?.message);
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
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [float]);

  const startNextLevel = async () => {
    if (!nextLevel) return;
    const uid = auth.currentUser?.uid;
    // Drop any rows this level left behind on an earlier run so a replay doesn't
    // stack duplicates in the summary.
    if (uid) await clearHandwritingLevelPredictions(uid, nextLevel.id).catch(() => {});
    navigation.replace("HandwritingTask", { taskIndex: handwritingTaskIndicesForLevel(nextLevel.id)[0] });
  };

  return (
    <ScreenContainer backgroundColor="#E2503B" padded>
      <StatusBar barStyle="light-content" backgroundColor="#E2503B" />
      <LinearGradient colors={["#FF8B79", "#E2503B"]} style={StyleSheet.absoluteFill} />
      <View style={styles.body}>
        <Animated.View style={{ transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }] }}>
          <MascotGuide state="celebrating" size={172} tint="rgba(255,255,255,0.16)" label="mascot · celebrating" />
        </Animated.View>
        <Text style={styles.title}>Level {level} done!</Text>
        <Text style={styles.sub}>
          {config.title} · {handwritingLevelTaskCount(level)} of {handwritingLevelTaskCount(level)} traced
        </Text>
        <View style={styles.stars}>
          <StarProgress total={3} filled={3} size={40} emptyColor="rgba(255,255,255,0.3)" />
        </View>

        {nextLevel ? (
          <View style={styles.unlock}>
            <View style={styles.unlockBadge}>
              <Text style={styles.unlockNum}>{nextLevel.id}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.unlockTitle}>{nextLevel.title} unlocked</Text>
              <Text style={styles.unlockSub}>{nextLevel.description}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.unlock}>
            <View style={styles.unlockBadge}>
              <Text style={styles.unlockNum}>✓</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.unlockTitle}>All levels complete!</Text>
              <Text style={styles.unlockSub}>You finished every writing task. Time to see the results.</Text>
            </View>
          </View>
        )}

        {saveFailed ? (
          <Text style={styles.saveFail} onPress={saveProgress}>Progress not saved — tap to retry</Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Text
          style={[styles.continue, saving && { opacity: 0.55 }]}
          onPress={() => {
            if (saving) return;
            if (isFinalLevel) navigation.replace("HandwritingSummary");
            else startNextLevel();
          }}
        >
          Continue
        </Text>
        {!isFinalLevel && (
          <Text
            style={styles.finish}
            onPress={() => {
              if (saving) return;
              navigation.replace("HandwritingSummary");
            }}
          >
            See results so far
          </Text>
        )}
        <Text
          style={styles.finish}
          onPress={() => {
            if (saving) return;
            navigation.replace("HandwritingLevels");
          }}
        >
          Finish for today
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  title: { fontFamily: fonts.extraBold, fontSize: 36, color: "#fff", marginTop: 34, letterSpacing: -0.7, textAlign: "center" },
  sub: { fontFamily: fonts.bold, fontSize: 16, color: "#FFDCD5", marginTop: 10, textAlign: "center" },
  stars: { marginTop: 30 },
  unlock: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 22,
    padding: 18,
    marginTop: 32,
  },
  unlockBadge: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.24)",
    alignItems: "center",
    justifyContent: "center",
  },
  unlockNum: { fontFamily: fonts.extraBold, fontSize: 19, color: "#fff" },
  unlockTitle: { fontFamily: fonts.extraBold, fontSize: 15, color: "#fff" },
  unlockSub: { fontFamily: fonts.bold, fontSize: 12, color: "#FFDCD5", marginTop: 2 },
  saveFail: { fontFamily: fonts.bold, fontSize: 13, color: "#FFE0DC", marginTop: 18 },
  actions: { gap: 8, marginBottom: 10 },
  continue: {
    paddingVertical: 20,
    borderRadius: 24,
    backgroundColor: "#fff",
    color: "#E2503B",
    fontFamily: fonts.extraBold,
    fontSize: 17,
    textAlign: "center",
    overflow: "hidden",
  },
  finish: { fontFamily: fonts.extraBold, fontSize: 14.5, color: "#FFDCD5", textAlign: "center", paddingVertical: 16 },
});
