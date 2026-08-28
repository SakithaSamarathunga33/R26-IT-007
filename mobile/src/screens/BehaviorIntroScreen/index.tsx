import React from "react";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import IntroLayout from "../../components/common/IntroLayout";
import { BEHAVIOR_LEVELS, BEHAVIOR_TASKS } from "../../config/behaviorTasks";
import { moduleColors } from "../../theme/colors";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "BehaviorIntro">;
};

export default function BehaviorIntroScreen({ navigation }: Props) {
  return (
    <IntroLayout
      title="Behaviour"
      headline="Sort with Lexi"
      subtitle={`${BEHAVIOR_LEVELS.length} levels · ${BEHAVIOR_TASKS.length} activities`}
      mascot="sorting"
      tint="#DCF5EC"
      gradient={moduleColors.behaviour.introBg}
      accent={moduleColors.behaviour.gradient}
      steps={[
        { title: "Lexi reads the question out loud" },
        { title: "Your child taps the matching picture or word" },
        { title: "Hints are there if they need a nudge" },
      ]}
      cta="Let's play"
      onBack={() => navigation.goBack()}
      onClose={() => navigation.navigate("MainTabs")}
      onContinue={() => navigation.navigate("BehaviorLevels")}
    />
  );
}
