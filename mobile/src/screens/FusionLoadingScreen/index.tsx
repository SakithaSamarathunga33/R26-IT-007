/**
 * FusionLoadingScreen
 * Waiting screen that runs the final "fusion" analysis, which combines the speech, handwriting and behaviour results.
 * Flow: FusionProgress ("Run Final Analysis") -> FusionLoading -> FusionRiskSummary (via navigation.replace when done).
 * Uses services/fusionService (build each module summary, call the multi_modal_risk backend at POST /predict/fusion,
 * save the results), services/sessionService (save to history, reset the session), services/childProfile (age), Firebase auth and i18n.
 * If anything fails, an error message is shown on this screen instead.
 */
import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, StatusBar, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { theme } from "../../theme";
import KidBackground from "../../components/KidBackground";
import { useT } from "../../i18n";
import { auth } from "../../config/firebase";
import {
  buildSpeechSummary,
  buildHandwritingSummary,
  buildBehaviorSummary,
  callFusionAPI,
  saveFusionResults,
} from "../../services/fusionService";
import { saveAssessmentToHistory, resetSession, getSessionId } from "../../services/sessionService";
import { getChildAge } from "../../services/childProfile";

// Only needs navigation (no route params).
type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "FusionLoading">;
};

// The progress messages shown to the user, in the order they happen.
const STEPS = [
  "Gathering speech module results…",
  "Gathering handwriting module results…",
  "Gathering behaviour module results…",
  "Building fusion payload…",
  "Running final screening analysis…",
  "Saving results to your profile…",
  "Almost done…",
];

// Main screen: runs the fusion analysis on open and shows a spinner with step-by-step progress.
export default function FusionLoadingScreen({ navigation }: Props) {
  const { t } = useT();
  const childId = auth.currentUser?.uid ?? "unknown";
  // Module predictions and the assessment_sessions doc are keyed by the
  // persistent session id; each fusion run gets its own id for the backend/record.
  const sessionId = getSessionId(childId);

  // step = which progress message is active; error = message to show if the analysis fails.
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Animation values: spin = rotating ring, pulse = growing/shrinking icon.
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  // On open: start both animations and begin the analysis.
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

  // Collects the three module summaries, sends them to the fusion backend, saves the result, then opens the risk summary.
  async function runFusion() {
    try {
      setStep(0);
      const speech = await buildSpeechSummary(childId, sessionId);
      setStep(1);
      const handwriting = await buildHandwritingSummary(childId, sessionId);
      setStep(2);
      const behavior = await buildBehaviorSummary(childId, sessionId);
      setStep(3);

      // Missing modules are omitted, not zero-filled — a 0 would read as "no risk".
      const payload = {
        child_id: childId,
        session_id: `${childId}_${Date.now()}`,
        metadata: {
          age: await getChildAge(),
          native_language: "Sinhala",
          assessment_language: "English",
          school_type: "urban_public",
          support_level: "none",
          device_type: "mobile",
          environment_noise_level: 0.12,
          time_of_day: new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening",
        },
        ...(speech ? { speech } : {}),
        ...(handwriting ? { handwriting } : {}),
        ...(behavior ? { behavior } : {}),
      };

      setStep(4);
      const response = await callFusionAPI(payload);
      setStep(5);
      // Persist the fusion result + history, THEN reset the session. Fusion has
      // already read the module predictions into `payload` above, so clearing
      // them now is safe and guarantees the next screening starts clean —
      // regardless of whether the user later taps "Go Home".
      // Save failures don't block the results, but the results screen says so.
      let saveFailed = false;
      await saveFusionResults(sessionId, response)
        .then((r) => { saveFailed = r.failed; })
        .catch((e) => { saveFailed = true; console.warn("[FusionDB] save error:", e?.message); });
      await saveAssessmentToHistory(childId, response).catch((e) => {
        saveFailed = true;
        console.warn("[History] save error:", e?.message);
      });
      // Keep the module data when evidence was insufficient: the child is told to complete more activities, not start over.
      if (response?.review_status !== "insufficient_evidence") {
        await resetSession(childId).catch((e) =>
          console.warn("[Session] reset failed (non-fatal):", e?.message)
        );
      }
      setStep(6);

      setTimeout(() => {
        navigation.replace("FusionRiskSummary", { response, saveFailed });
      }, 600);
    } catch (e: any) {
      setError(e?.message ?? t("Something went wrong. Please try again."));
    }
  }

  // Turns the spin value (0..1) into a rotation angle for the ring.
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  // Error view: shown instead of the progress view when the analysis fails.
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
            <Text style={styles.errorTitle}>{t("Analysis Failed")}</Text>
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

          <Text style={styles.title}>{t("Analysing Results")}</Text>
          <Text style={styles.subtitle}>{t("Preparing your final screening summary")}</Text>

          {/* Step progress */}
          <View style={styles.stepsWrap}>
            {STEPS.map((s, i) => (
              <View key={i} style={[styles.stepRow, i > step && styles.stepRowFuture]}>
                <View style={[styles.stepDot, i < step && styles.stepDotDone, i === step && styles.stepDotActive]} />
                <Text style={[styles.stepText, i === step && styles.stepTextActive, i < step && styles.stepTextDone]}>
                  {t(s)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  /* Layout: full-screen blue-to-dark gradient background (set in the JSX) */
  container: { flex: 1 },
  fill: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },

  /* Decoration: very faint white circles */
  decoCircleLg: { position: "absolute", width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(255,255,255,0.04)", top: -80, right: -80 },
  decoCircleSm: { position: "absolute", width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.04)", bottom: 60, left: -40 },

  /* Spinning ring and pulsing icon circle: see-through white on the blue background */
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

  /* Title: white; subtitle: soft white */
  title: { fontSize: 24, fontFamily: theme.fonts.extraBold, color: "#fff", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: theme.fonts.regular, color: "rgba(255,255,255,0.7)", marginBottom: 36, textAlign: "center" },

  /* Step list: dots are faint white, green when done, bright white when active; future steps are dimmed */
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

  /* Error view: red icon on a faint red circle, white title, soft white message (on a dark slate gradient) */
  errorWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  errorIconWrap: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(239,68,68,0.15)",
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  errorTitle: { fontSize: 22, fontFamily: theme.fonts.extraBold, color: "#fff", marginBottom: 10 },
  errorMsg: { fontSize: 14, fontFamily: theme.fonts.regular, color: "rgba(255,255,255,0.7)", textAlign: "center", lineHeight: 22 },
});
