import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { AudioPlayer, createAudioPlayer } from "expo-audio";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { theme } from "../../theme";
import KidBackground from "../../components/KidBackground";
import { playNextSound } from "../../services/kidSounds";
import { SPEECH_TASKS, TASK_TYPE_LABELS } from "../../config/speechTasks";
import { auth, db } from "../../config/firebase";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "SpeechReview">;
  route: RouteProp<RootStackParamList, "SpeechReview">;
};

import { API_URLS } from "../../config/apiConfig";
const SPEECH_API = API_URLS.speech;
type SubmitStep = "idle" | "saving" | "analysing" | "done";

function getTimeOfDay(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const STEP_LABELS: Record<SubmitStep, string> = {
  idle: "Submit for Analysis", saving: "Saving to database…", analysing: "Analysing with AI…", done: "Done!",
};

export default function SpeechReviewScreen({ navigation, route }: Props) {
  const { taskIndex, elapsed, retryCount, audioUri, practice } = route.params;
  const task = SPEECH_TASKS[taskIndex];
  // Practice runs come from a therapy plan — they must never write predictions,
  // or rehearsing would move the risk score the plan was based on.
  const isPractice = !!practice;
  const [submitStep, setSubmitStep] = useState<SubmitStep>("idle");
  const [playing, setPlaying] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => { return () => { mountedRef.current = false; _destroyPlayer(); }; }, []);

  const _destroyPlayer = () => {
    const p = playerRef.current;
    if (!p) return;
    playerRef.current = null;
    try { p.pause(); } catch {} try { p.remove(); } catch {}
  };

  const handlePlay = async () => {
    if (!audioUri) return;
    _destroyPlayer();
    try {
      const player = createAudioPlayer({ uri: audioUri });
      playerRef.current = player;
      player.addListener("playbackStatusUpdate", (status: any) => {
        if (!mountedRef.current) return;
        if (status.didJustFinish) { setPlaying(false); _destroyPlayer(); }
      });
      player.play();
      if (mountedRef.current) setPlaying(true);
    } catch (err: any) { setPlaying(false); Alert.alert("Playback Error", err.message); }
  };

  const handleStopPlayback = () => { _destroyPlayer(); setPlaying(false); };

  const saveAttemptToFirestore = async (): Promise<string> => {
    const uid = auth.currentUser?.uid ?? "anonymous";
    const docRef = await addDoc(collection(db, "speech_attempts"), {
      user_id: uid, task_id: task.id, level: task.level,
      task_type: task.task_type, target_word: task.target_word,
      target_phoneme_seq: task.target_phoneme_seq, difficulty_level: task.difficulty_level,
      linguistic_focus: task.linguistic_focus, elapsed_sec: elapsed,
      retry_count: retryCount, time_of_day: getTimeOfDay(), submitted_at: serverTimestamp(),
    });
    return docRef.id;
  };

  const callApi = async () => {
    const formData = new FormData();
    const audioExt = audioUri.split(".").pop() ?? "m4a";
    const audioPayload = { uri: audioUri, name: `response.${audioExt}`, type: audioExt === "wav" ? "audio/wav" : "audio/m4a" };
    formData.append("audio", audioPayload as any);
    formData.append("task_type", task.task_type); formData.append("target_word", task.target_word);
    formData.append("target_phoneme_seq", task.target_phoneme_seq); formData.append("difficulty_level", task.difficulty_level);
    formData.append("linguistic_focus", task.linguistic_focus); formData.append("age", "6");
    formData.append("gender", "M"); formData.append("native_language", "Sinhala");
    formData.append("assessment_language", "English"); formData.append("recording_device_type", "mobile_mic");
    formData.append("environment_noise_level", "0.12"); formData.append("time_of_day", getTimeOfDay());

    const response = await fetch(SPEECH_API, { method: "POST", body: formData });
    const responseText = await response.text();

    if (!response.ok) throw new Error(`Server error: ${response.status} — ${responseText}`);
    return JSON.parse(responseText);
  };

  const savePredictionToFirestore = async (attemptId: string, result: any) => {
    const uid = auth.currentUser?.uid ?? "anonymous";
    await addDoc(collection(db, "speech_predictions"), {
      attempt_id: attemptId,
      child_id: uid,
      session_id: `session_${uid}`,
      // Task identity is denormalised onto the prediction so summaries can label
      // rows without assuming the child played every task in array order.
      task_index: taskIndex,
      task_id: task.id,
      level: task.level,
      target_word: task.target_word,
      task_type: task.task_type,
      validation: result.validation ?? null, quality: result.quality ?? null,
      features: result.features ?? null, risk_probability: result.prediction?.risk_probability ?? null,
      risk_level: result.prediction?.risk_level ?? null, risk_label_binary: result.prediction?.risk_label_binary ?? null,
      saved_at: serverTimestamp(),
    });
  };

  const handleSubmit = async () => {
    if (!audioUri) { Alert.alert("No recording", "Please go back and record first."); return; }
    if (elapsed < 0.5) { Alert.alert("Too short", "Please record for at least 0.5 seconds."); return; }
    playNextSound();
    try {
      setSubmitStep("analysing");
      let result: any = null; let apiError: string | undefined;

      if (isPractice) {
        // Score the audio so the child still gets feedback, but persist nothing.
        try { result = await callApi(); } catch (apiErr: any) { apiError = apiErr.message; }
      } else {
        setSubmitStep("saving");
        const attemptId = await saveAttemptToFirestore();
        setSubmitStep("analysing");
        try { result = await callApi(); await savePredictionToFirestore(attemptId, result); } catch (apiErr: any) { apiError = apiErr.message; }
      }

      setSubmitStep("done");
      _destroyPlayer();
      navigation.replace("SpeechResult", { taskIndex, retryCount, result, error: apiError, practice });
    } catch (err: any) { setSubmitStep("idle"); Alert.alert("Submit Failed", err.message); }
  };

  const isSubmitting = submitStep !== "idle" && submitStep !== "done";

  return (
    <View style={styles.container}>
      <KidBackground variant="speech" />
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} disabled={isSubmitting}>
          <Ionicons name="arrow-back" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Recording</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Success hero */}
        <LinearGradient colors={["#059669", "#047857"]} style={styles.successCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.decoCircle1} />
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark" size={44} color="#fff" />
          </View>
          <Text style={styles.successTitle}>Recording Saved</Text>
          <Text style={styles.successSub}>Listen back before submitting. You can still retry.</Text>
        </LinearGradient>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <SummaryRow icon="text-outline" iconColor="#2563EB" iconBg="#EFF6FF" label="Word" value={task.target_word} />
          <SummaryRow icon="layers-outline" iconColor="#7C3AED" iconBg="#F5F3FF" label="Task Type" value={TASK_TYPE_LABELS[task.task_type]} />
          <SummaryRow icon="time-outline" iconColor="#D97706" iconBg="#FFFBEB" label="Duration" value={`${elapsed}s`} />
          <SummaryRow icon="refresh-outline" iconColor="#0891B2" iconBg="#ECFEFF" label="Retries" value={`${retryCount}`} last />
        </View>

        {/* Playback card */}
        <TouchableOpacity
          style={[styles.playCard, playing && styles.playCardActive]}
          onPress={playing ? handleStopPlayback : handlePlay}
          activeOpacity={0.8} disabled={isSubmitting}
        >
          <LinearGradient
            colors={playing ? ["#EF4444", "#DC2626"] : ["#3B72F6", "#2563EB"]}
            style={styles.playIconGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Ionicons name={playing ? "stop" : "play"} size={24} color="#fff" />
          </LinearGradient>
          <View style={styles.playInfo}>
            <Text style={styles.playLabel}>{playing ? "Playing…" : "Play Recording"}</Text>
            <Text style={styles.playDuration}>{elapsed}s · WAV</Text>
          </View>
          <View style={styles.playBars}>
            {[0.6, 1, 0.4, 0.8, 0.5, 0.9, 0.3].map((h, i) => (
              <View key={i} style={[styles.playBar, { height: 4 + h * 20, backgroundColor: playing ? "#2563EB" : "#CBD5E1" }]} />
            ))}
          </View>
        </TouchableOpacity>

        {/* Step indicator */}
        {(submitStep === "saving" || submitStep === "analysing") && (
          <View style={styles.stepCard}>
            <ActivityIndicator color="#2563EB" size="small" />
            <Text style={styles.stepLabel}>{STEP_LABELS[submitStep]}</Text>
          </View>
        )}

        {submitStep === "idle" && (
          <View style={styles.qualityNotice}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#2563EB" />
            <Text style={styles.qualityText}>
              Recording will be saved to the database and sent directly for AI analysis.
            </Text>
          </View>
        )}

        <View style={{ height: 20 }} />

        {/* Re-record */}
        <TouchableOpacity style={[styles.retryBtn, isSubmitting && styles.disabled]} onPress={() => navigation.goBack()} disabled={isSubmitting} activeOpacity={0.8}>
          <Ionicons name="refresh" size={18} color="#64748B" />
          <Text style={styles.retryBtnText}>Re-record</Text>
        </TouchableOpacity>

        {/* Submit */}
        <LinearGradient
          colors={isSubmitting ? ["#94A3B8", "#94A3B8"] : ["#3B72F6", "#2563EB"]}
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity style={styles.submitBtnInner} onPress={handleSubmit} disabled={isSubmitting} activeOpacity={0.88}>
            {isSubmitting ? (
              <><ActivityIndicator color="#fff" size="small" /><Text style={styles.submitBtnText}>{STEP_LABELS[submitStep]}</Text></>
            ) : (
              <><Text style={styles.submitBtnText}>Submit for Analysis</Text><Ionicons name="arrow-forward" size={18} color="#fff" /></>
            )}
          </TouchableOpacity>
        </LinearGradient>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function SummaryRow({ icon, iconColor, iconBg, label, value, last }: { icon: any; iconColor: string; iconBg: string; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.summaryRow, last && styles.summaryRowLast]}>
      <View style={[styles.summaryIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  content: { paddingHorizontal: 20, paddingTop: 8 },

  successCard: {
    borderRadius: 24, padding: 28, alignItems: "center", marginBottom: 20,
    overflow: "hidden", shadowColor: "#059669", shadowOpacity: 0.28, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 10,
  },
  decoCircle1: { position: "absolute", width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(255,255,255,0.07)", top: -40, right: -30 },
  successIconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 3, borderColor: "rgba(255,255,255,0.35)", alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  successTitle: { fontSize: 22, fontFamily: theme.fonts.extraBold, color: "#fff", marginBottom: 6 },
  successSub: { fontSize: 13, fontFamily: theme.fonts.regular, color: "rgba(255,255,255,0.8)", textAlign: "center", lineHeight: 19 },

  summaryCard: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 20, marginBottom: 14, overflow: "hidden",
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  summaryRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: "#F1F5F9", gap: 12,
  },
  summaryRowLast: { borderBottomWidth: 0 },
  summaryIconWrap: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  summaryLabel: { flex: 1, fontSize: 14, fontFamily: theme.fonts.medium, color: "#1E293B" },
  summaryValue: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: "#64748B" },

  playCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 20, padding: 16, gap: 14, marginBottom: 14,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  playCardActive: { borderColor: "#DBEAFE", backgroundColor: "#FAFCFF" },
  playIconGrad: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  playInfo: { flex: 1 },
  playLabel: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: "#1E293B", marginBottom: 2 },
  playDuration: { fontSize: 12, fontFamily: theme.fonts.regular, color: "#94A3B8" },
  playBars: { flexDirection: "row", alignItems: "center", gap: 3 },
  playBar: { width: 4, borderRadius: 2 },

  stepCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE",
    borderRadius: 16, padding: 14, marginBottom: 12,
  },
  stepLabel: { fontSize: 14, fontFamily: theme.fonts.medium, color: "#2563EB" },

  qualityNotice: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE",
    borderRadius: 16, padding: 14, marginBottom: 4,
  },
  qualityText: { flex: 1, fontSize: 12, fontFamily: theme.fonts.regular, color: "#3B72F6", lineHeight: 18 },

  retryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 16, borderRadius: 50,
    backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E2E8F0", marginBottom: 12,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  retryBtnText: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: "#64748B" },

  submitBtn: {
    borderRadius: 50,
    shadowColor: "#2563EB", shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18 },
  submitBtnText: { fontSize: 15, fontFamily: theme.fonts.bold, color: "#fff" },
  disabled: { opacity: 0.4 },
});
