import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { speakFeedback, stopSpeaking } from "../../services/kidFeedback";
import { auth } from "../../config/firebase";
import { LevelId, SPEECH_LEVELS, getLevel, levelTaskCount, taskIndicesForLevel } from "../../config/speechTasks";
import { clearLevelPredictions, markLevelComplete } from "../../services/speechLevelService";
import ScreenContainer from "../../components/common/ScreenContainer";
import MascotGuide from "../../components/common/MascotGuide";
import StarProgress from "../../components/common/StarProgress";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

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
  const float = useRef(new Animated.Value(0)).current;

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
    if (uid) await clearLevelPredictions(uid, nextLevel.id).catch(() => {});
    navigation.replace("SpeechActivity", { taskIndex: taskIndicesForLevel(nextLevel.id)[0] });
  };

  return (
    <ScreenContainer backgroundColor={colors.brand} padded>
      <StatusBar barStyle="light-content" backgroundColor={colors.brand} />
      <LinearGradient colors={["#2D8EFF", "#1B6FD6"]} style={StyleSheet.absoluteFill} />
      <View style={styles.body}>
        <Animated.View style={{ transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }] }}>
          <MascotGuide state="celebrating" size={172} tint="rgba(255,255,255,0.16)" label="mascot · celebrating" />
        </Animated.View>
        <Text style={styles.title}>Level {level} done!</Text>
        <Text style={styles.sub}>{config.subtitle} · {levelTaskCount(level)} of {levelTaskCount(level)} said</Text>
        <View style={styles.stars}><StarProgress total={3} filled={2} size={40} emptyColor="rgba(255,255,255,0.3)" /></View>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{levelTaskCount(level)}</Text>
            <Text style={styles.statLabel}>words today</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{isFinalLevel ? "All" : `L${(level + 1)}`}</Text>
            <Text style={styles.statLabel}>{isFinalLevel ? "levels done" : "unlocked"}</Text>
          </View>
        </View>
        {saveFailed ? (
          <Text style={styles.saveFail} onPress={saveProgress}>Progress not saved — tap to retry</Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          activeOpacity={0.88}
          disabled={saving}
          style={[styles.continue, saving && { opacity: 0.55 }]}
          onPress={() => {
            if (isFinalLevel) navigation.replace("SpeechSummary");
            else startNextLevel();
          }}
        >
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
        <Text style={styles.finish} onPress={() => navigation.replace("MainTabs")}>
          Finish for today
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  title: { fontFamily: fonts.extraBold, fontSize: 36, color: "#fff", marginTop: 34, letterSpacing: -0.7, textAlign: "center" },
  sub: { fontFamily: fonts.bold, fontSize: 16, color: "#CFE4FF", marginTop: 10, textAlign: "center" },
  stars: { marginTop: 30 },
  stats: { flexDirection: "row", gap: 12, width: "100%", marginTop: 34 },
  stat: { flex: 1, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, padding: 16, alignItems: "center" },
  statValue: { fontFamily: fonts.extraBold, fontSize: 25, color: "#fff" },
  statLabel: { fontFamily: fonts.bold, fontSize: 12, color: "#CFE4FF", marginTop: 2 },
  saveFail: { fontFamily: fonts.bold, fontSize: 13, color: "#FFE0DC", marginTop: 18 },
  actions: { gap: 8, marginBottom: 10 },
  continue: {
    paddingVertical: 20,
    borderRadius: 24,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  continueText: {
    color: colors.brand,
    fontFamily: fonts.extraBold,
    fontSize: 17,
  },
  finish: { fontFamily: fonts.extraBold, fontSize: 15, color: "#CFE4FF", textAlign: "center", paddingVertical: 16 },
});
