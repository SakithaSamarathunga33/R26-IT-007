import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import FusionProgressScreen from "../screens/FusionProgressScreen";
import FusionLoadingScreen from "../screens/FusionLoadingScreen";
import FusionRiskSummaryScreen from "../screens/FusionRiskSummaryScreen";
import FusionDifficultyScreen from "../screens/FusionDifficultyScreen";
import FusionTherapyScreen from "../screens/FusionTherapyScreen";
import FusionReportScreen from "../screens/FusionReportScreen";
import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function FusionScreens() {
  return (
    <>
      <Stack.Screen name="FusionProgress" component={FusionProgressScreen} />
      <Stack.Screen name="FusionLoading" component={FusionLoadingScreen} />
      <Stack.Screen name="FusionRiskSummary" component={FusionRiskSummaryScreen} />
      <Stack.Screen name="FusionDifficulty" component={FusionDifficultyScreen} />
      <Stack.Screen name="FusionTherapy" component={FusionTherapyScreen} />
      <Stack.Screen name="FusionReport" component={FusionReportScreen} />
    </>
  );
}
