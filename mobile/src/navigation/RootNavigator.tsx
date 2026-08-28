import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import WelcomeScreen from "../screens/WelcomeScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import MainTabNavigator from "./MainTabNavigator";
import { SpeechScreens } from "./SpeechNavigator";
import { HandwritingScreens } from "./HandwritingNavigator";
import { BehaviourScreens } from "./BehaviourNavigator";
import { FusionScreens } from "./FusionNavigator";
import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Welcome">
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        {SpeechScreens()}
        {HandwritingScreens()}
        {BehaviourScreens()}
        {FusionScreens()}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
