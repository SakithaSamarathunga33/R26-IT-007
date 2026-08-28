import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Animated, Easing, Alert } from "react-native";
import Toast from "../../components/Toast";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAudioRecorder, AudioModule, IOSOutputFormat, AudioQuality } from "expo-audio";

const WAV_RECORDING_OPTIONS = {
  extension: ".wav", sampleRate: 16000, numberOfChannels: 1, bitRate: 128000,
  ios: { outputFormat: IOSOutputFormat.LINEARPCM, audioQuality: AudioQuality.HIGH, linearPCMBitDepth: 16 as const, linearPCMIsBigEndian: false, linearPCMIsFloat: false },
  android: { extension: ".m4a", outputFormat: "mpeg4", audioEncoder: "aac" },
  web: { mimeType: "audio/wav" },
};

import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { theme } from "../../theme";
import KidBackground from "../../components/KidBackground";
import { playNextSound, playTapSound } from "../../services/kidSounds";
import { SPEECH_TASKS, getLevel, levelTaskCount, positionInLevel } from "../../config/speechTasks";
import { speak, stopSpeaking } from "../../services/ttsService";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "SpeechRecording">;
  route: RouteProp<RootStackParamList, "SpeechRecording">;
};

const MAX_SECONDS = 8;
type RecordState = "idle" | "recording" | "done";

export default function SpeechRecordingScreen({ navigation, route }: Props) {
  const taskIndex = route.params?.taskIndex ?? 0;
  const practice = route.params?.practice;
  const task = SPEECH_TASKS[taskIndex];
  const level = getLevel(task.level);

  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [hearing, setHearing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "warning" as "error" | "success" | "warning" });

  const audioRecorder = useAudioRecorder(WAV_RECORDING_OPTIONS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  const stopPulse = () => { pulseLoopRef.current?.stop(); pulseAnim.setValue(1); };
  const startPulse = () => {
    pulseLoopRef.current = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.25, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
    ]));
    pulseLoopRef.current.start();
  };

  useEffect(() => { setRecordState("idle"); setElapsed(0); setRetryCount(0); setAudioUri(null); stopTimer(); stopPulse(); }, [taskIndex]);
  useEffect(() => {
    return () => {
      stopTimer();
      stopSpeaking();
      try { if (audioRecorder.isRecording) audioRecorder.stop().catch(() => {}); } catch {}
    };
  }, []);

  /** Replays the target word — only offered while idle so TTS never bleeds into the mic. */
  const handleHearAgain = () => {
    if (recordState !== "idle") return;
    if (hearing) { stopSpeaking(); setHearing(false); return; }
    speak(task.target_word, {
      onStart: () => setHearing(true),
      onDone: () => setHearing(false),
      onError: () => setHearing(false),
    });
  };

  const handleStartRecording = async () => {
    playTapSound();
    // Make sure the app's own voice is silent before the mic opens.
    stopSpeaking();
    setHearing(false);
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) { Alert.alert("Permission Required", "Microphone permission is needed."); return; }
      await AudioModule.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setRecordState("recording"); setElapsed(0); setAudioUri(null); startPulse();
      timerRef.current = setInterval(() => {
        setElapsed((prev) => { if (prev + 1 >= MAX_SECONDS) { handleStopRecording(); return MAX_SECONDS; } return prev + 1; });
      }, 1000);
    } catch (err: any) { Alert.alert("Recording Error", err.message); }
  };

  const handleStopRecording = async () => {
    playTapSound();
    stopTimer(); stopPulse();
    try {
      if (!audioRecorder.isRecording) return;
      await audioRecorder.stop();
      const uri = audioRecorder.uri ?? null;
      await AudioModule.setAudioModeAsync({ allowsRecording: false });
      setAudioUri(uri); setRecordState("done");
    } catch (err: any) { Alert.alert("Stop Error", err.message); }
  };

  const handleRetry = () => {
    if (retryCount >= 3) { setToast({ visible: true, message: "Maximum 3 retries allowed.", type: "warning" }); return; }
    setRetryCount((c) => c + 1); setElapsed(0); setAudioUri(null); setRecordState("idle");
  };

  const progressPct = Math.min((elapsed / MAX_SECONDS) * 100, 100);

  const micColors: [string, string] =
    recordState === "recording" ? ["#EF4444", "#DC2626"]
    : recordState === "done" ? ["#059669", "#047857"]
    : ["#3B72F6", "#2563EB"];

  return (
    <View style={styles.container}>
      <KidBackground variant="speech" />
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast((t) => ({ ...t, visible: false }))} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => { stopSpeaking(); navigation.goBack(); }}>
          <Ionicons name="arrow-back" size={20} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Recording</Text>
          <Text style={[styles.headerSub, { color: level.color }]}>
            {level.subtitle} · Activity {positionInLevel(taskIndex)}/{levelTaskCount(level.id)}
          </Text>
        </View>
        <View style={styles.retryBadge}>
          <Ionicons name="refresh" size={12} color="#2563EB" />
          <Text style={styles.retryBadgeText}>{retryCount}/3</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Word card */}
        <View style={styles.wordCard}>
          <Text style={styles.wordLabel}>Say this word</Text>
          <Text style={styles.wordText}>{task.target_word}</Text>
          <Text style={styles.wordHint}>{task.say_hint}</Text>
        </View>

        {/* Hear it again — hidden once the mic is live so audio can't overlap */}
        {recordState === "idle" && (
          <TouchableOpacity style={styles.hearBtn} activeOpacity={0.8} onPress={handleHearAgain}>
            <Ionicons name={hearing ? "stop" : "volume-high"} size={16} color="#2563EB" />
            <Text style={styles.hearBtnText}>{hearing ? "Stop" : "Hear it again"}</Text>
          </TouchableOpacity>
        )}

        {/* Timer bar */}
        <View style={styles.timerTrack}>
          <LinearGradient
            colors={recordState === "recording" ? ["#EF4444", "#DC2626"] : ["#3B72F6", "#2563EB"]}
            style={[styles.timerFill, { width: `${progressPct}%` }]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          />
        </View>
        <Text style={styles.timerText}>{elapsed}s / {MAX_SECONDS}s</Text>

        {/* Mic area */}
        <View style={styles.micArea}>
          {recordState === "recording" && (
            <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
          )}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={recordState === "idle" ? handleStartRecording : handleStopRecording}
            disabled={recordState === "done"}
          >
            <LinearGradient colors={micColors} style={styles.micBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons
                name={recordState === "done" ? "checkmark" : recordState === "recording" ? "stop" : "mic"}
                size={48} color="#fff"
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={styles.statusText}>
          {recordState === "idle" && "Tap the mic to start recording"}
          {recordState === "recording" && "Recording… tap to stop"}
          {recordState === "done" && "Recording complete!"}
        </Text>

        {/* Waveform */}
        {recordState === "recording" && (
          <View style={styles.waveRow}>
            {[0.4, 0.7, 1, 0.6, 0.5, 0.9, 0.6, 1, 0.4, 0.8].map((h, i) => (
              <LinearGradient key={i} colors={["#3B72F6", "#2563EB"]} style={[styles.waveBar, { height: 6 + h * 28 }]} />
            ))}
          </View>
        )}

        {recordState === "done" && (
          <View style={styles.doneMsg}>
            <Ionicons name="checkmark-circle" size={16} color="#059669" />
            <Text style={styles.doneMsgText}>Great! Ready to review.</Text>
          </View>
        )}

        <View style={{ flex: 1 }} />

        {recordState === "done" && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.retryBtn} onPress={() => { playTapSound(); handleRetry(); }} activeOpacity={0.8}>
              <Ionicons name="refresh" size={18} color="#64748B" />
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
            <LinearGradient colors={["#3B72F6", "#2563EB"]} style={styles.nextBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <TouchableOpacity
                style={styles.nextBtnInner}
                activeOpacity={0.88}
                onPress={() => {
                  playNextSound();
                  navigation.navigate("SpeechReview", { taskIndex, elapsed, retryCount, audioUri: audioUri ?? "", practice });
                }}
              >
                <Text style={styles.nextBtnText}>Review & Submit</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

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
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#94A3B8", shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 3,
  },
  headerCenter: { alignItems: "center" },
  headerTitle: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: "#1E293B" },
  headerSub: { fontSize: 11, fontFamily: theme.fonts.medium, marginTop: 2 },
  retryBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE",
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6,
  },
  retryBadgeText: { fontSize: 12, fontFamily: theme.fonts.semiBold, color: "#2563EB" },

  content: { flex: 1, paddingHorizontal: 20, alignItems: "center", paddingTop: 8 },

  wordCard: {
    width: "100%", backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 20, paddingVertical: 20, paddingHorizontal: 32, alignItems: "center", marginBottom: 24, gap: 4,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  wordLabel: { fontSize: 11, fontFamily: theme.fonts.semiBold, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1.2 },
  wordText: { fontSize: 36, fontFamily: theme.fonts.extraBold, color: "#1E293B" },
  wordHint: { fontSize: 13, fontFamily: theme.fonts.medium, color: "#64748B" },

  hearBtn: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#DBEAFE",
    borderRadius: 50, paddingHorizontal: 16, paddingVertical: 9, marginBottom: 16, marginTop: -12,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  hearBtnText: { fontSize: 13, fontFamily: theme.fonts.semiBold, color: "#2563EB" },

  timerTrack: { width: "100%", height: 6, backgroundColor: "#E2E8F0", borderRadius: 3, overflow: "hidden", marginBottom: 6 },
  timerFill: { height: 6, borderRadius: 3 },
  timerText: { fontSize: 12, fontFamily: theme.fonts.medium, color: "#94A3B8", marginBottom: 32 },

  micArea: { width: 180, height: 180, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  pulseRing: {
    position: "absolute", width: 180, height: 180, borderRadius: 90,
    backgroundColor: "rgba(239,68,68,0.15)",
  },
  micBtn: {
    width: 140, height: 140, borderRadius: 70, alignItems: "center", justifyContent: "center",
    shadowColor: "#2563EB", shadowOpacity: 0.35, shadowOffset: { width: 0, height: 10 }, shadowRadius: 24, elevation: 12,
  },

  statusText: { fontSize: 14, fontFamily: theme.fonts.medium, color: "#64748B", textAlign: "center", marginBottom: 16 },

  waveRow: { flexDirection: "row", alignItems: "center", gap: 4, height: 44 },
  waveBar: { width: 5, borderRadius: 3, opacity: 0.8 },

  doneMsg: { flexDirection: "row", alignItems: "center", gap: 6 },
  doneMsgText: { fontSize: 13, fontFamily: theme.fonts.semiBold, color: "#059669" },

  actionRow: { flexDirection: "row", gap: 12, width: "100%" },
  retryBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 16, borderRadius: 50,
    backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E2E8F0",
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  retryBtnText: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: "#64748B" },
  nextBtn: {
    flex: 2, borderRadius: 50,
    shadowColor: "#2563EB", shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  nextBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  nextBtnText: { fontSize: 15, fontFamily: theme.fonts.bold, color: "#fff" },
});
