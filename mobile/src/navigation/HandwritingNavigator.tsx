import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HandwritingIntroScreen from "../screens/HandwritingIntroScreen";
import HandwritingLevelsScreen from "../screens/HandwritingLevelsScreen";
import HandwritingTaskScreen from "../screens/HandwritingTaskScreen";
import HandwritingLevelCompleteScreen from "../screens/HandwritingLevelCompleteScreen";
import HandwritingCanvasScreen from "../screens/HandwritingCanvasScreen";
import HandwritingReviewScreen from "../screens/HandwritingReviewScreen";
import HandwritingResultScreen from "../screens/HandwritingResultScreen";
import HandwritingSummaryScreen from "../screens/HandwritingSummaryScreen";
import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function HandwritingScreens() {
  return (
    <>
      <Stack.Screen name="HandwritingIntro" component={HandwritingIntroScreen} />
      <Stack.Screen name="HandwritingLevels" component={HandwritingLevelsScreen} />
      <Stack.Screen name="HandwritingTask" component={HandwritingTaskScreen} />
      <Stack.Screen name="HandwritingLevelComplete" component={HandwritingLevelCompleteScreen} />
      <Stack.Screen name="HandwritingCanvas" component={HandwritingCanvasScreen} />
      <Stack.Screen name="HandwritingReview" component={HandwritingReviewScreen} />
      <Stack.Screen name="HandwritingResult" component={HandwritingResultScreen} />
      <Stack.Screen name="HandwritingSummary" component={HandwritingSummaryScreen} />
    </>
  );
}
