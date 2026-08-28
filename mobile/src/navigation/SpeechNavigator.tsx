import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SpeechIntroScreen from "../screens/SpeechIntroScreen";
import SpeechLevelsScreen from "../screens/SpeechLevelsScreen";
import SpeechActivityScreen from "../screens/SpeechActivityScreen";
import SpeechListenScreen from "../screens/SpeechListenScreen";
import SpeechRecordingScreen from "../screens/SpeechRecordingScreen";
import SpeechReviewScreen from "../screens/SpeechReviewScreen";
import SpeechResultScreen from "../screens/SpeechResultScreen";
import SpeechLevelCompleteScreen from "../screens/SpeechLevelCompleteScreen";
import SpeechSummaryScreen from "../screens/SpeechSummaryScreen";
import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Registered on the root stack so child activities hide the bottom tabs. */
export function SpeechScreens() {
  return (
    <>
      <Stack.Screen name="SpeechIntro" component={SpeechIntroScreen} />
      <Stack.Screen name="SpeechLevels" component={SpeechLevelsScreen} />
      <Stack.Screen name="SpeechActivity" component={SpeechActivityScreen} />
      <Stack.Screen name="SpeechListen" component={SpeechListenScreen} />
      <Stack.Screen name="SpeechRecording" component={SpeechRecordingScreen} />
      <Stack.Screen name="SpeechReview" component={SpeechReviewScreen} />
      <Stack.Screen name="SpeechResult" component={SpeechResultScreen} />
      <Stack.Screen name="SpeechLevelComplete" component={SpeechLevelCompleteScreen} />
      <Stack.Screen name="SpeechSummary" component={SpeechSummaryScreen} />
    </>
  );
}
