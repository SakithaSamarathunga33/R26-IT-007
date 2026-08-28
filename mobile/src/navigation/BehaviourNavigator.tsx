import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BehaviorIntroScreen from "../screens/BehaviorIntroScreen";
import BehaviorLevelsScreen from "../screens/BehaviorLevelsScreen";
import BehaviorActivityScreen from "../screens/BehaviorActivityScreen";
import BehaviorLevelCompleteScreen from "../screens/BehaviorLevelCompleteScreen";
import BehaviorResultScreen from "../screens/BehaviorResultScreen";
import BehaviorSummaryScreen from "../screens/BehaviorSummaryScreen";
import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function BehaviourScreens() {
  return (
    <>
      <Stack.Screen name="BehaviorIntro" component={BehaviorIntroScreen} />
      <Stack.Screen name="BehaviorLevels" component={BehaviorLevelsScreen} />
      <Stack.Screen name="BehaviorActivity" component={BehaviorActivityScreen} />
      <Stack.Screen name="BehaviorLevelComplete" component={BehaviorLevelCompleteScreen} />
      <Stack.Screen name="BehaviorResult" component={BehaviorResultScreen} />
      <Stack.Screen name="BehaviorSummary" component={BehaviorSummaryScreen} />
    </>
  );
}
