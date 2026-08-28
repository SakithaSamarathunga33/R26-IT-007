import React from "react";
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { SPEECH_TASKS, levelTaskCount, positionInLevel } from "../../config/speechTasks";
import ScreenContainer from "../../components/common/ScreenContainer";
import ActivityProgressHeader from "../../components/common/ActivityProgressHeader";
import StarProgress from "../../components/common/StarProgress";
import ClayCard from "../../components/common/ClayCard";
import TTSButton from "../../components/common/TTSButton";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";
import { clayBrand } from "../../theme/shadows";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "SpeechActivity">;
  route: RouteProp<RootStackParamList, "SpeechActivity">;
};

export default function SpeechActivityScreen({ navigation, route }: Props) {
  const taskIndex = route.params?.taskIndex ?? 0;
  const practice = route.params?.practice;
  const task = SPEECH_TASKS[taskIndex];
  const total = levelTaskCount(task.level);
  const position = positionInLevel(taskIndex);

  return (
    <ScreenContainer>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <ActivityProgressHeader
        current={position}
        total={total}
        onBack={() => navigation.goBack()}
      />
      <View style={styles.stars}>
        <StarProgress total={3} filled={Math.min(3, Math.max(1, Math.round((position / total) * 3)))} />
      </View>

      <View style={styles.body}>
        <ClayCard style={styles.word} radius={32}>
          <View style={styles.picture}>
            <Ionicons name="image-outline" size={28} color={colors.textMuted} />
            <Text style={styles.pictureLabel}>say · {task.target_word}</Text>
          </View>
          <Text style={styles.wordText}>{task.target_word}</Text>
          <Text style={styles.phonemes}>{task.target_phoneme_seq.replace(/ /g, " · ").toLowerCase()}</Text>
        </ClayCard>

        <TTSButton
          label="Hear it again"
          onPress={() => navigation.navigate("SpeechListen", { taskIndex, practice })}
        />

        <Text style={styles.hint}>Tap the mic and say the word</Text>
        <TouchableOpacity
          style={[styles.micBtn, clayBrand()]}
          activeOpacity={0.88}
          onPress={() => navigation.navigate("SpeechRecording", { taskIndex, practice })}
          accessibilityRole="button"
          accessibilityLabel="Start recording"
        >
          <LinearGradient colors={["#5AA6FF", colors.brand]} style={styles.micGrad}>
            <Ionicons name="mic" size={42} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  stars: { alignItems: "center", marginTop: 16 },
  body: { flex: 1, alignItems: "center", paddingTop: 14 },
  word: { width: "100%", alignItems: "center", padding: 22, marginBottom: 22 },
  picture: {
    width: "100%",
    height: 172,
    borderRadius: 24,
    backgroundColor: colors.bgDeep,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  pictureLabel: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.textMuted },
  wordText: { fontFamily: fonts.extraBold, fontSize: 40, color: colors.text, marginTop: 20, letterSpacing: -0.8 },
  phonemes: { fontFamily: fonts.bold, fontSize: 15, color: colors.textMuted, marginTop: 6 },
  hint: { fontFamily: fonts.bold, fontSize: 15, color: colors.textSecondary, marginTop: "auto" },
  micBtn: { width: 112, height: 112, borderRadius: 56, overflow: "hidden", marginTop: 18, marginBottom: 14 },
  micGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
});
