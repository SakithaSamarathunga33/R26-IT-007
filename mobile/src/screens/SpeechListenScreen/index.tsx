import React, { useEffect, useRef, useState } from "react";
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { SPEECH_TASKS, levelTaskCount, positionInLevel } from "../../config/speechTasks";
import { speak, stopSpeaking } from "../../services/ttsService";
import ScreenContainer from "../../components/common/ScreenContainer";
import ActivityProgressHeader from "../../components/common/ActivityProgressHeader";
import PulseRings from "../../components/common/PulseRings";
import AudioWaveform from "../../components/common/AudioWaveform";
import SecondaryButton from "../../components/common/SecondaryButton";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";
import { clayBrand } from "../../theme/shadows";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "SpeechListen">;
  route: RouteProp<RootStackParamList, "SpeechListen">;
};

export default function SpeechListenScreen({ navigation, route }: Props) {
  const taskIndex = route.params?.taskIndex ?? 0;
  const practice = route.params?.practice;
  const task = SPEECH_TASKS[taskIndex];
  const [speaking, setSpeaking] = useState(false);
  const autoPlayedRef = useRef(false);

  const playWord = () => {
    speak(task.listen_prompt, {
      onStart: () => setSpeaking(true),
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  useEffect(() => {
    if (autoPlayedRef.current) return;
    autoPlayedRef.current = true;
    const t = setTimeout(playWord, 450);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => () => stopSpeaking(), []);

  const goRecord = () => {
    stopSpeaking();
    setSpeaking(false);
    navigation.navigate("SpeechRecording", { taskIndex, practice });
  };

  return (
    <ScreenContainer>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <ActivityProgressHeader
        current={positionInLevel(taskIndex)}
        total={levelTaskCount(task.level)}
        onBack={() => { stopSpeaking(); navigation.goBack(); }}
      />

      <View style={styles.body}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => (speaking ? (stopSpeaking(), setSpeaking(false)) : playWord())}
          accessibilityRole="button"
          accessibilityLabel={speaking ? "Stop playback" : "Play the word"}
        >
          <PulseRings active={speaking} size={220}>
            <View style={[styles.speaker, clayBrand()]}>
              <LinearGradient colors={["#5AA6FF", colors.brand]} style={styles.speakerGrad}>
                <Ionicons name="volume-high" size={46} color="#fff" />
              </LinearGradient>
            </View>
          </PulseRings>
        </TouchableOpacity>

        <Text style={styles.title}>Listen carefully</Text>
        <Text style={styles.sub}>
          Lexi is saying <Text style={styles.word}>{task.target_word}</Text>
        </Text>
        <AudioWaveform active={speaking} bars={7} height={44} barWidth={6} />
      </View>

      <SecondaryButton label="I'm ready" onPress={goRecord} style={styles.cta} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: "center", justifyContent: "center" },
  speaker: { width: 140, height: 140, borderRadius: 70, overflow: "hidden" },
  speakerGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.extraBold, fontSize: 27, color: colors.text, marginTop: 42, letterSpacing: -0.4 },
  sub: { fontFamily: fonts.bold, fontSize: 16, color: colors.textBody, marginTop: 10, marginBottom: 26 },
  word: { color: colors.brand },
  cta: { marginBottom: 10 },
});
