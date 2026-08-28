import React from "react";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import IntroLayout from "../../components/common/IntroLayout";
import { SPEECH_LEVELS, SPEECH_TASKS } from "../../config/speechTasks";
import { moduleColors } from "../../theme/colors";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "SpeechIntro">;
};

export default function SpeechIntroScreen({ navigation }: Props) {
  return (
    <IntroLayout
      title="Speech"
      headline="Say it with Lexi"
      subtitle={`${SPEECH_LEVELS.length} short levels · ${SPEECH_TASKS.length} activities`}
      mascot="waving"
      tint="#D3E3F9"
      gradient={moduleColors.speech.introBg}
      steps={[
        { title: "Lexi says a word out loud" },
        { title: "Your child repeats it into the mic" },
        { title: "Find a quiet spot and keep headphones off" },
      ]}
      cta="Let's play"
      onBack={() => navigation.goBack()}
      onClose={() => navigation.navigate("MainTabs")}
      onContinue={() => navigation.navigate("SpeechLevels")}
    />
  );
}
