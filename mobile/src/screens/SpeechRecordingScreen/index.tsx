import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAudioRecorder, AudioModule, IOSOutputFormat, AudioQuality } from "expo-audio";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { SPEECH_TASKS, levelTaskCount, positionInLevel } from "../../config/speechTasks";
import { stopSpeaking } from "../../services/ttsService";
import ScreenContainer from "../../components/common/ScreenContainer";
import ActivityProgressHeader from "../../components/common/ActivityProgressHeader";
import AudioWaveform from "../../components/common/AudioWaveform";
import { fonts } from "../../theme/typography";

const WAV_RECORDING_OPTIONS = {
  extension: ".wav", sampleRate: 16000, numberOfChannels: 1, bitRate: 128000,
  ios: { outputFormat: IOSOutputFormat.LINEARPCM, audioQuality: AudioQuality.HIGH, linearPCMBitDepth: 16 as const, linearPCMIsBigEndian: false, linearPCMIsFloat: false },
  android: { extension: ".m4a", outputFormat: "mpeg4", audioEncoder: "aac" },
  web: { mimeType: "audio/wav" },
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "SpeechRecording">;
  route: RouteProp<RootStackParamList, "SpeechRecording">;
};

const MAX_SECONDS = 8;
type RecordState = "idle" | "recording" | "done";

function formatClock(seconds: number) {
  return `0:${String(seconds).padStart(2, "0")}`;
}

export default function SpeechRecordingScreen({ navigation, route }: Props) {
  const taskIndex = route.params?.taskIndex ?? 0;
  const practice = route.params?.practice;
  const task = SPEECH_TASKS[taskIndex];

  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const retryCount = route.params?.retryCount ?? 0;

  const audioRecorder = useAudioRecorder(WAV_RECORDING_OPTIONS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const startedRef = useRef(false);

  const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  const stopPulse = () => { pulseLoopRef.current?.stop(); pulseAnim.setValue(1); };
  const startPulse = () => {
    pulseLoopRef.current = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
    ]));
    pulseLoopRef.current.start();
  };

  const handleStopRecording = async () => {
    stopTimer();
    stopPulse();
    try {
      if (!audioRecorder.isRecording) return;
      await audioRecorder.stop();
      const uri = audioRecorder.uri ?? "";
      await AudioModule.setAudioModeAsync({ allowsRecording: false });
      setRecordState("done");
      navigation.replace("SpeechReview", { taskIndex, elapsed, retryCount, audioUri: uri, practice });
    } catch (err: any) {
      Alert.alert("Stop Error", err.message);
    }
  };

  const handleStartRecording = async () => {
    stopSpeaking();
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) { Alert.alert("Permission Required", "Microphone permission is needed."); return; }
      await AudioModule.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setRecordState("recording");
      setElapsed(0);
      startPulse();
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev + 1 >= MAX_SECONDS) {
            handleStopRecording();
            return MAX_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      Alert.alert("Recording Error", err.message);
    }
  };

  useEffect(() => {
    setRecordState("idle");
    setElapsed(0);
    stopTimer();
    stopPulse();
    startedRef.current = false;
    const t = setTimeout(() => {
      if (!startedRef.current) {
        startedRef.current = true;
        handleStartRecording();
      }
    }, 350);
    return () => clearTimeout(t);
  }, [taskIndex]);

  useEffect(() => {
    return () => {
      stopTimer();
      stopSpeaking();
      try { if (audioRecorder.isRecording) audioRecorder.stop().catch(() => {}); } catch {}
    };
  }, []);

  return (
    <ScreenContainer backgroundColor="#1E2C42">
      <StatusBar barStyle="light-content" backgroundColor="#1E2C42" />
      <LinearGradient colors={["#1E2C42", "#26364F", "#2E3F5A"]} style={StyleSheet.absoluteFill} />
      <ActivityProgressHeader
        current={positionInLevel(taskIndex)}
        total={levelTaskCount(task.level)}
        onBack={() => {
          stopSpeaking();
          stopTimer();
          stopPulse();
          try { if (audioRecorder.isRecording) audioRecorder.stop().catch(() => {}); } catch {}
          navigation.goBack();
        }}
        dark
      />

      <View style={styles.body}>
        <View style={styles.badge}>
          <View style={styles.dot} />
          <Text style={styles.badgeText}>
            {recordState === "recording" ? `RECORDING · ${formatClock(elapsed)}` : "GET READY"}
          </Text>
        </View>

        <Text style={styles.word}>{task.target_word}</Text>
        <Text style={styles.hint}>{task.say_hint || "Say it out loud, nice and clear"}</Text>

        <AudioWaveform active={recordState === "recording"} bars={15} height={120} />

        <View style={{ flex: 1 }} />

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={recordState === "recording" ? handleStopRecording : handleStartRecording}
            style={styles.stopBtn}
            accessibilityRole="button"
            accessibilityLabel={recordState === "recording" ? "Stop recording" : "Start recording"}
          >
            <LinearGradient colors={["#FF8B79", "#F2573F"]} style={styles.stopGrad}>
              {recordState === "recording" ? (
                <View style={styles.stopSquare} />
              ) : (
                <View style={styles.micDot} />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: "center", paddingTop: 34 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 17,
    paddingVertical: 9,
    borderRadius: 15,
    backgroundColor: "rgba(255,122,107,0.18)",
  },
  dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: "#FF6B57" },
  badgeText: { fontFamily: fonts.extraBold, fontSize: 13, color: "#FFB3A8", letterSpacing: 0.5 },
  word: { fontFamily: fonts.extraBold, fontSize: 38, color: "#fff", marginTop: 34, letterSpacing: -0.7 },
  hint: { fontFamily: fonts.bold, fontSize: 14, color: "#93A8C4", marginTop: 8, marginBottom: 38 },
  stopBtn: {
    width: 124,
    height: 124,
    borderRadius: 62,
    marginBottom: 16,
    shadowColor: "#F2573F",
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 18,
    elevation: 14,
  },
  stopGrad: { flex: 1, borderRadius: 62, alignItems: "center", justifyContent: "center" },
  stopSquare: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#fff" },
  micDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#fff" },
});
