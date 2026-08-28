import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, StatusBar, Animated, Easing, ScrollView } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { auth } from "../../config/firebase";
import {
  buildSpeechSummary,
  buildHandwritingSummary,
  buildBehaviorSummary,
  callFusionAPI,
  saveFusionResults,
} from "../../services/fusionService";
import { saveAssessmentToHistory, resetSession } from "../../services/sessionService";
import ScreenContainer from "../../components/common/ScreenContainer";
import ClayCard from "../../components/common/ClayCard";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "FusionLoading">;
};

const STEPS = [
  "Gathering speech module results…",
  "Gathering handwriting module results…",
  "Gathering behaviour module results…",
  "Building fusion payload…",
  "Running final dyslexia risk analysis…",
  "Saving results to your profile…",
  "Almost done…",
];

export default function FusionLoadingScreen({ navigation }: Props) {
  const childId = auth.currentUser?.uid ?? "unknown";
  const sessionId = `session_${childId}`;

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    runFusion();
  }, []);

  async function runFusion() {
    try {
      setStep(0);
      const speech = await buildSpeechSummary(childId, sessionId);
      setStep(1);
      const handwriting = await buildHandwritingSummary(childId, sessionId);
      setStep(2);
      const behavior = await buildBehaviorSummary(childId, sessionId);
      setStep(3);

      const payload = {
        child_id: childId,
        session_id: sessionId,
        metadata: {
          age: 6,
          native_language: "Sinhala",
          assessment_language: "English",
          school_type: "urban_public",
          support_level: "none",
          device_type: "mobile",
          environment_noise_level: 0.12,
          time_of_day: new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening",
        },
        speech: speech ?? { risk_probability: 0, features: {}, quality: { prediction_reliability: "low" } },
        handwriting: handwriting ?? { risk_probability: 0, features: {}, quality: { prediction_reliability: "low" } },
        behavior: behavior ?? { risk_probability: 0, features: {}, quality: { prediction_reliability: "low" } },
      };

      setStep(4);
      const response = await callFusionAPI(payload);
      setStep(5);
      // Persist the fusion result + history, THEN reset the session. Fusion has
      // already read the module predictions into `payload` above, so clearing
      // them now is safe and guarantees the next screening starts clean —
      // regardless of whether the user later taps "Go Home".
      await saveFusionResults(sessionId, response).catch((e) =>
        console.warn("[FusionDB] Non-fatal save error:", e?.message)
      );
      await saveAssessmentToHistory(childId, response).catch((e) =>
        console.warn("[History] Non-fatal save error:", e?.message)
      );
      await resetSession(childId).catch((e) =>
        console.warn("[Session] reset failed (non-fatal):", e?.message)
      );
      setStep(6);

      setTimeout(() => {
        navigation.replace("FusionRiskSummary", { response });
      }, 600);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong. Please try again.");
    }
  }

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  if (error) {
    return (
      <ScreenContainer>
        <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
        <View style={styles.center}>
          <ClayCard style={styles.errorCard} radius={26}>
            <View style={styles.errorIcon}>
              <Text style={styles.errorBang}>!</Text>
            </View>
            <Text style={styles.errorTitle}>Analysis Failed</Text>
            <Text style={styles.errorMsg}>{error}</Text>
          </ClayCard>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <ScrollView contentContainerStyle={styles.center} showsVerticalScrollIndicator={false}>
        <View style={styles.spinnerWrap}>
          <Animated.View style={[styles.spinRing, { transform: [{ rotate }] }]} />
          <Animated.View style={[styles.spinCore, { transform: [{ scale: pulse }] }]} />
        </View>

        <Text style={styles.title}>Putting it together</Text>
        <Text style={styles.subtitle}>This usually takes under a minute.</Text>
        <Text style={styles.liveStep}>{STEPS[step]}</Text>

        <View style={styles.stepsWrap}>
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <ClayCard
                key={i}
                inset={!done && !active}
                style={{ ...styles.stepRow, ...(!done && !active ? styles.stepFuture : null) }}
                radius={18}
              >
                {done ? (
                  <View style={[styles.stepDot, styles.stepDotDone]}>
                    <Text style={styles.stepCheck}>✓</Text>
                  </View>
                ) : active ? (
                  <Animated.View style={[styles.stepSpin, { transform: [{ rotate }] }]} />
                ) : (
                  <View style={styles.stepDot} />
                )}
                <Text style={[styles.stepText, active && styles.stepTextActive, done && styles.stepTextDone]}>
                  {s}
                </Text>
              </ClayCard>
            );
          })}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingVertical: 24 },
  spinnerWrap: { width: 96, height: 96, alignItems: "center", justifyContent: "center" },
  spinRing: {
    position: "absolute",
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 6,
    borderColor: colors.bgDeep,
    borderTopColor: colors.brandSoft,
  },
  spinCore: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.bgSoft,
  },
  title: { fontFamily: fonts.extraBold, fontSize: 26, color: colors.text, marginTop: 28, letterSpacing: -0.4, textAlign: "center" },
  subtitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.textMuted, marginTop: 8, textAlign: "center" },
  liveStep: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.brand, marginTop: 10, textAlign: "center" },

  stepsWrap: { width: "100%", gap: 10, marginTop: 28 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  stepFuture: { opacity: 0.55 },
  stepDot: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2.5, borderColor: "rgba(160,174,199,0.45)",
    backgroundColor: colors.bgSoft,
  },
  stepDotDone: { backgroundColor: colors.mint, borderColor: colors.mint, alignItems: "center", justifyContent: "center" },
  stepCheck: { fontFamily: fonts.extraBold, fontSize: 11, color: "#fff" },
  stepSpin: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2.5, borderColor: "rgba(45,142,255,0.2)", borderTopColor: colors.brandSoft,
  },
  stepText: { flex: 1, fontFamily: fonts.semiBold, fontSize: 13, color: colors.textMuted },
  stepTextActive: { color: colors.text, fontFamily: fonts.bold },
  stepTextDone: { color: colors.textBody },

  errorCard: { alignItems: "center", padding: 28, width: "100%" },
  errorIcon: {
    width: 72, height: 72, borderRadius: 24, backgroundColor: colors.coralTint,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  errorBang: { fontFamily: fonts.extraBold, fontSize: 32, color: colors.coralText },
  errorTitle: { fontFamily: fonts.extraBold, fontSize: 22, color: colors.text, marginBottom: 8 },
  errorMsg: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 22 },
});
