import React from "react";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import IntroLayout from "../../components/common/IntroLayout";
import { HANDWRITING_LEVELS, HANDWRITING_TASKS } from "../../config/handwritingTasks";
import { moduleColors } from "../../theme/colors";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "HandwritingIntro">;
};

export default function HandwritingIntroScreen({ navigation }: Props) {
  return (
    <IntroLayout
      title="Writing"
      headline="Trace with Lexi"
      subtitle={`${HANDWRITING_LEVELS.length} levels · ${HANDWRITING_TASKS.length} activities`}
      mascot="crayon"
      tint="#FDEAE6"
      gradient={moduleColors.handwriting.introBg}
      accent={moduleColors.handwriting.gradient}
      steps={[
        { title: "See the letter or word on screen" },
        { title: "Trace or write it on the big canvas" },
        { title: "A photo of paper writing works too" },
      ]}
      cta="Let's play"
      onBack={() => navigation.goBack()}
      onClose={() => navigation.navigate("MainTabs")}
      onContinue={() => navigation.navigate("HandwritingLevels")}
    />
  );
}
