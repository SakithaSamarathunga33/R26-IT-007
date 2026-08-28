import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { AudioPlayer, createAudioPlayer } from "expo-audio";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { SPEECH_TASKS } from "../../config/speechTasks";
import { auth, db } from "../../config/firebase";
import { API_URLS } from "../../config/apiConfig";
import ScreenContainer from "../../components/common/ScreenContainer";
import ClayCard from "../../components/common/ClayCard";
import MascotGuide from "../../components/common/MascotGuide";
import PrimaryButton from "../../components/common/PrimaryButton";
import SecondaryButton from "../../components/common/SecondaryButton";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";
import { clayBrand } from "../../theme/shadows";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "SpeechReview">;
  route: RouteProp<RootStackParamList, "SpeechReview">;
};

const SPEECH_API = API_URLS.speech;
type SubmitStep = "idle" | "saving" | "analysing" | "done";

function getTimeOfDay(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function formatClock(seconds: number) {
  return `0:${String(Math.max(0, Math.round(seconds))).padStart(2, "0")}`;
}

export default function SpeechReviewScreen({ navigation, route }: Props) {
  const { taskIndex, elapsed, retryCount, audioUri, practice } = route.params;
  const task = SPEECH_TASKS[taskIndex];
  const isPractice = !!practice;
  const [submitStep, setSubmitStep] = useState<SubmitStep>("idle");
  const [playing, setPlaying] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; _destroyPlayer(); }, []);

  const _destroyPlayer = () => {
    const p = playerRef.current;
    if (!p) return;
    playerRef.current = null;
    try { p.pause(); } catch {}
    try { p.remove(); } catch {}
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
    } catch (err: any) {
      setPlaying(false);
      Alert.alert("Playback Error", err.message);
    }
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
      attempt_id: attemptId, child_id: uid, session_id: `session_${uid}`,
      task_index: taskIndex, task_id: task.id, level: task.level,
      target_word: task.target_word, task_type: task.task_type,
      validation: result.validation ?? null, quality: result.quality ?? null,
      features: result.features ?? null, risk_probability: result.prediction?.risk_probability ?? null,
      risk_level: result.prediction?.risk_level ?? null, risk_label_binary: result.prediction?.risk_label_binary ?? null,
      saved_at: serverTimestamp(),
    });
  };

  const handleSubmit = async () => {
    if (!audioUri) { Alert.alert("No recording", "Please go back and record first."); return; }
    if (elapsed < 0.5) { Alert.alert("Too short", "Please record for at least 0.5 seconds."); return; }
    try {
      setSubmitStep("analysing");
      let result: any = null;
      let apiError: string | undefined;
      if (isPractice) {
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
    } catch (err: any) {
      setSubmitStep("idle");
      Alert.alert("Submit Failed", err.message);
    }
  };

  const isSubmitting = submitStep !== "idle" && submitStep !== "done";
  const bars = [30, 55, 82, 96, 64, 40, 72, 88, 52, 26, 44, 18];

  return (
    <ScreenContainer>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <View style={styles.body}>
        <MascotGuide state="happy" size={120} label="mascot · happy" />
        <Text style={styles.title}>Nice try! Listen back?</Text>

        <ClayCard style={styles.playCard} radius={28}>
          <View style={styles.playRow}>
            <TouchableOpacity
              onPress={playing ? handleStopPlayback : handlePlay}
              disabled={isSubmitting}
              style={[styles.playBtn, clayBrand()]}
              accessibilityRole="button"
              accessibilityLabel={playing ? "Stop playback" : "Play recording"}
            >
              <LinearGradient colors={["#5AA6FF", colors.brand]} style={styles.playGrad}>
                {playing ? <Ionicons name="stop" size={22} color="#fff" /> : <View style={styles.playTriangle} />}
              </LinearGradient>
            </TouchableOpacity>
            <View style={styles.waveRow}>
              {bars.map((h, i) => (
                <View key={i} style={[styles.waveBar, { height: `${h}%`, backgroundColor: i >= 2 && i <= 4 ? colors.brand : "#B4CEEA" }]} />
              ))}
            </View>
          </View>
          <View style={styles.times}>
            <Text style={styles.time}>0:01</Text>
            <Text style={styles.time}>{formatClock(elapsed)}</Text>
          </View>
        </ClayCard>

        {isSubmitting ? (
          <View style={styles.step}>
            <ActivityIndicator color={colors.brand} />
            <Text style={styles.stepText}>{submitStep === "saving" ? "Saving…" : "Sending to Lexi…"}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <PrimaryButton
            label="Send to Lexi"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
          />
          <SecondaryButton
            label="Record again"
            onPress={() => navigation.replace("SpeechRecording", { taskIndex, practice, retryCount: retryCount + 1 })}
            disabled={isSubmitting}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: "center", paddingTop: 34 },
  title: { fontFamily: fonts.extraBold, fontSize: 27, color: colors.text, marginTop: 24, letterSpacing: -0.4, textAlign: "center" },
  playCard: { width: "100%", padding: 22, marginTop: 26 },
  playRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  playBtn: { width: 58, height: 58, borderRadius: 29, overflow: "hidden" },
  playGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  playTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 16,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: "#fff",
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    marginLeft: 4,
  },
  waveRow: { flex: 1, flexDirection: "row", alignItems: "center", height: 52, gap: 3 },
  waveBar: { flex: 1, borderRadius: 2 },
  times: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  time: { fontFamily: fonts.bold, fontSize: 12, color: colors.textMuted },
  step: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 18 },
  stepText: { fontFamily: fonts.bold, fontSize: 14, color: colors.brand },
  actions: { width: "100%", gap: 12, marginTop: "auto", marginBottom: 10 },
});
