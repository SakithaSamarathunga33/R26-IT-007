import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, StatusBar, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { theme } from "../../theme";
import KidBackground from "../../components/KidBackground";
import { auth } from "../../config/firebase";
import {
  buildSpeechSummary,
  buildHandwritingSummary,
  buildBehaviorSummary,
  callFusionAPI,
  saveFusionResults,
} from "../../services/fusionService";
import { saveAssessmentToHistory, resetSession } from "../../services/sessionService";

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

      const user = auth.currentUser;
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
      <View style={styles.container}>
        <KidBackground variant="therapy" />
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={["#1E293B", "#0F172A"]} style={styles.fill}>
          <View style={styles.errorWrap}>
            <View style={styles.errorIconWrap}>
              <Ionicons name="alert-circle" size={48} color="#EF4444" />
            </View>
            <Text style={styles.errorTitle}>Analysis Failed</Text>
            <Text style={styles.errorMsg}>{error}</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KidBackground variant="therapy" />
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#1D4ED8", "#1E293B"]} style={styles.fill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>

        <View style={styles.decoCircleLg} />
        <View style={styles.decoCircleSm} />

        <View style={styles.center}>
          {/* Spinning ring */}
          <Animated.View style={[styles.spinRing, { transform: [{ rotate }] }]}>
            <LinearGradient
              colors={["rgba(255,255,255,0.6)", "rgba(255,255,255,0.0)"]}
              style={styles.spinRingInner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>

          {/* Pulsing icon */}
          <Animated.View style={[styles.iconWrap, { transform: [{ scale: pulse }] }]}>
            <Ionicons name="git-merge" size={44} color="#fff" />
          </Animated.View>

          <Text style={styles.title}>Analysing Results</Text>
          <Text style={styles.subtitle}>Preparing your final screening summary</Text>

          {/* Step progress */}
          <View style={styles.stepsWrap}>
            {STEPS.map((s, i) => (
              <View key={i} style={[styles.stepRow, i > step && styles.stepRowFuture]}>
                <View style={[styles.stepDot, i < step && styles.stepDotDone, i === step && styles.stepDotActive]} />
                <Text style={[styles.stepText, i === step && styles.stepTextActive, i < step && styles.stepTextDone]}>
                  {s}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fill: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },

  decoCircleLg: { position: "absolute", width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(255,255,255,0.04)", top: -80, right: -80 },
  decoCircleSm: { position: "absolute", width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.04)", bottom: 60, left: -40 },

  spinRing: {
    position: "absolute",
    width: 140, height: 140, borderRadius: 70,
    borderWidth: 3, borderColor: "rgba(255,255,255,0.18)",
  },
  spinRingInner: { flex: 1, borderRadius: 70 },

  iconWrap: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center", marginBottom: 28,
  },

  title: { fontSize: 24, fontFamily: theme.fonts.extraBold, color: "#fff", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: theme.fonts.regular, color: "rgba(255,255,255,0.7)", marginBottom: 36, textAlign: "center" },

  stepsWrap: { width: "100%", gap: 10 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10, opacity: 1 },
  stepRowFuture: { opacity: 0.35 },
  stepDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  stepDotDone: { backgroundColor: "#4ADE80" },
  stepDotActive: { backgroundColor: "#fff", shadowColor: "#fff", shadowOpacity: 0.6, shadowRadius: 4 },
  stepText: { fontSize: 13, fontFamily: theme.fonts.regular, color: "rgba(255,255,255,0.55)" },
  stepTextActive: { color: "#fff", fontFamily: theme.fonts.semiBold },
  stepTextDone: { color: "rgba(255,255,255,0.4)" },

  errorWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  errorIconWrap: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(239,68,68,0.15)",
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  errorTitle: { fontSize: 22, fontFamily: theme.fonts.extraBold, color: "#fff", marginBottom: 10 },
  errorMsg: { fontSize: 14, fontFamily: theme.fonts.regular, color: "rgba(255,255,255,0.7)", textAlign: "center", lineHeight: 22 },
});
