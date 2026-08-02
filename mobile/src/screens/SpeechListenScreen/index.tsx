import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { theme } from "../../theme";
import { SPEECH_TASKS, getLevel, levelTaskCount, positionInLevel } from "../../config/speechTasks";
import { speak, stopSpeaking, stretchWord } from "../../services/ttsService";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "SpeechListen">;
  route: RouteProp<RootStackParamList, "SpeechListen">;
};

export default function SpeechListenScreen({ navigation, route }: Props) {
  const taskIndex = route.params?.taskIndex ?? 0;
  const practice = route.params?.practice;
  const task = SPEECH_TASKS[taskIndex];
  const level = getLevel(task.level);

  const [speaking, setSpeaking] = useState(false);
  const [heardCount, setHeardCount] = useState(0);
  const waveAnim = useRef(new Animated.Value(0)).current;
  const waveLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const autoPlayedRef = useRef(false);

  // Animate the speaker while TTS is talking.
  useEffect(() => {
    if (speaking) {
      waveLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, { toValue: 1, duration: 550, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(waveAnim, { toValue: 0, duration: 550, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      );
      waveLoopRef.current.start();
    } else {
      waveLoopRef.current?.stop();
      waveAnim.setValue(0);
    }
  }, [speaking]);

  const playWord = (rate: "normal" | "slow" = "normal") => {
    const text = rate === "slow" ? stretchWord(task.target_word) : task.listen_prompt;
    speak(text, {
      rate,
      onStart: () => setSpeaking(true),
      onDone: () => {
        setSpeaking(false);
        setHeardCount((c) => c + 1);
      },
      onError: () => setSpeaking(false),
    });
  };

  // Speak the prompt once on arrival so the child hears the word without tapping.
  useEffect(() => {
    if (autoPlayedRef.current) return;
    autoPlayedRef.current = true;
    const t = setTimeout(() => playWord("normal"), 450);
    return () => clearTimeout(t);
  }, []);

  // Never leave audio playing behind us.
  useEffect(() => () => stopSpeaking(), []);

  const goRecord = () => {
    stopSpeaking();
    setSpeaking(false);
    navigation.navigate("SpeechRecording", { taskIndex, practice });
  };

  const waveScale = waveAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });
  const waveOpacity = waveAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.05] });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => { stopSpeaking(); navigation.goBack(); }}
        >
          <Ionicons name="arrow-back" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Listen First</Text>
        <View style={[styles.levelPill, { backgroundColor: level.bg }]}>
          <Text style={[styles.levelPillText, { color: level.color }]}>
            L{level.id} · {positionInLevel(taskIndex)}/{levelTaskCount(level.id)}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Step hint */}
        <View style={styles.stepHint}>
          <Ionicons name="ear-outline" size={14} color="#2563EB" />
          <Text style={styles.stepHintText}>Step 1 — the app says the word</Text>
        </View>

        {/* Word card */}
        <View style={styles.wordCard}>
          <Text style={styles.wordLabel}>Listen to this word</Text>
          <Text style={styles.wordText}>{task.target_word}</Text>
          <View style={styles.phonemeRow}>
            {task.target_phoneme_seq.split(" ").map((p, i) => (
              <View key={i} style={styles.phonemePill}>
                <Text style={styles.phonemeText}>{p}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Speaker */}
        <TouchableOpacity
          style={styles.speakerArea}
          activeOpacity={0.85}
          onPress={() => (speaking ? (stopSpeaking(), setSpeaking(false)) : playWord("normal"))}
        >
          {speaking && (
            <Animated.View
              style={[styles.speakerRing, { transform: [{ scale: waveScale }], opacity: waveOpacity }]}
            />
          )}
          <LinearGradient
            colors={speaking ? ["#F59E0B", "#D97706"] : ["#3B72F6", "#2563EB"]}
            style={styles.speakerBtn}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Ionicons name={speaking ? "volume-high" : "play"} size={44} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.speakerStatus}>
          {speaking ? "Listening… shh!" : heardCount === 0 ? "Tap to hear the word" : "Tap to hear it again"}
        </Text>

        {/* Helper buttons */}
        <View style={styles.helperRow}>
          <TouchableOpacity
            style={styles.helperBtn}
            activeOpacity={0.8}
            onPress={() => playWord("normal")}
            disabled={speaking}
          >
            <Ionicons name="refresh" size={16} color="#2563EB" />
            <Text style={styles.helperBtnText}>Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.helperBtn}
            activeOpacity={0.8}
            onPress={() => playWord("slow")}
            disabled={speaking}
          >
            <Ionicons name="hourglass-outline" size={16} color="#7C3AED" />
            <Text style={[styles.helperBtnText, { color: "#7C3AED" }]}>Slowly</Text>
          </TouchableOpacity>
        </View>

        {/* What to say */}
        <View style={styles.sayCard}>
          <View style={styles.sayIconWrap}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sayLabel}>Now you say</Text>
            <Text style={styles.sayValue}>{task.say_hint}</Text>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        {/* Continue */}
        <LinearGradient colors={["#3B72F6", "#2563EB"]} style={styles.nextBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <TouchableOpacity style={styles.nextBtnInner} activeOpacity={0.88} onPress={goRecord}>
            <Ionicons name="mic" size={20} color="#fff" />
            <Text style={styles.nextBtnText}>My Turn to Speak</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

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
  headerTitle: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: "#1E293B" },
  levelPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  levelPillText: { fontSize: 11, fontFamily: theme.fonts.semiBold },

  content: { flex: 1, paddingHorizontal: 20, alignItems: "center", paddingTop: 8 },

  stepHint: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 18,
  },
  stepHintText: { fontSize: 11, fontFamily: theme.fonts.semiBold, color: "#2563EB" },

  wordCard: {
    width: "100%", backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 24, padding: 24, alignItems: "center", gap: 10, marginBottom: 20,
    shadowColor: "#2563EB", shadowOpacity: 0.08, shadowOffset: { width: 0, height: 4 }, shadowRadius: 16, elevation: 4,
  },
  wordLabel: { fontSize: 11, fontFamily: theme.fonts.semiBold, color: "#94A3B8", letterSpacing: 1.2, textTransform: "uppercase" },
  wordText: { fontSize: 46, fontFamily: theme.fonts.extraBold, color: "#1E293B", letterSpacing: 1 },
  phonemeRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "center" },
  phonemePill: {
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  phonemeText: { fontSize: 12, fontFamily: theme.fonts.medium, color: "#2563EB" },

  speakerArea: { width: 150, height: 150, alignItems: "center", justifyContent: "center" },
  speakerRing: {
    position: "absolute", width: 150, height: 150, borderRadius: 75,
    backgroundColor: "#F59E0B",
  },
  speakerBtn: {
    width: 116, height: 116, borderRadius: 58, alignItems: "center", justifyContent: "center",
    shadowColor: "#2563EB", shadowOpacity: 0.35, shadowOffset: { width: 0, height: 10 }, shadowRadius: 22, elevation: 12,
  },

  speakerStatus: { fontSize: 14, fontFamily: theme.fonts.medium, color: "#64748B", marginTop: 14, marginBottom: 16 },

  helperRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  helperBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E2E8F0",
    borderRadius: 50, paddingHorizontal: 18, paddingVertical: 11,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  helperBtnText: { fontSize: 13, fontFamily: theme.fonts.semiBold, color: "#2563EB" },

  sayCard: {
    width: "100%", flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#BBF7D0",
    borderRadius: 16, padding: 14,
  },
  sayIconWrap: {
    width: 34, height: 34, borderRadius: 11, backgroundColor: "#D1FAE5",
    alignItems: "center", justifyContent: "center",
  },
  sayLabel: { fontSize: 11, fontFamily: theme.fonts.semiBold, color: "#059669", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 },
  sayValue: { fontSize: 16, fontFamily: theme.fonts.bold, color: "#065F46" },

  nextBtn: {
    width: "100%", borderRadius: 50,
    shadowColor: "#2563EB", shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  nextBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18 },
  nextBtnText: { fontSize: 16, fontFamily: theme.fonts.bold, color: "#fff" },
});
