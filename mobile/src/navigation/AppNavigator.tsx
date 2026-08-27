import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import WelcomeScreen from "../screens/WelcomeScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import HomeScreen from "../screens/HomeScreen";
import HistoryScreen from "../screens/HistoryScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SpeechIntroScreen from "../screens/SpeechIntroScreen";
import SpeechLevelsScreen from "../screens/SpeechLevelsScreen";
import SpeechActivityScreen from "../screens/SpeechActivityScreen";
import SpeechListenScreen from "../screens/SpeechListenScreen";
import SpeechRecordingScreen from "../screens/SpeechRecordingScreen";
import SpeechLevelCompleteScreen from "../screens/SpeechLevelCompleteScreen";
import SpeechReviewScreen from "../screens/SpeechReviewScreen";
import SpeechResultScreen from "../screens/SpeechResultScreen";
import SpeechSummaryScreen from "../screens/SpeechSummaryScreen";
import BehaviorIntroScreen from "../screens/BehaviorIntroScreen";
import BehaviorLevelsScreen from "../screens/BehaviorLevelsScreen";
import BehaviorActivityScreen from "../screens/BehaviorActivityScreen";
import BehaviorLevelCompleteScreen from "../screens/BehaviorLevelCompleteScreen";
import BehaviorResultScreen from "../screens/BehaviorResultScreen";
import BehaviorSummaryScreen from "../screens/BehaviorSummaryScreen";
import HandwritingIntroScreen from "../screens/HandwritingIntroScreen";
import HandwritingLevelsScreen from "../screens/HandwritingLevelsScreen";
import HandwritingTaskScreen from "../screens/HandwritingTaskScreen";
import HandwritingLevelCompleteScreen from "../screens/HandwritingLevelCompleteScreen";
import HandwritingCanvasScreen from "../screens/HandwritingCanvasScreen";
import HandwritingReviewScreen from "../screens/HandwritingReviewScreen";
import HandwritingResultScreen from "../screens/HandwritingResultScreen";
import HandwritingSummaryScreen from "../screens/HandwritingSummaryScreen";
import FusionProgressScreen from "../screens/FusionProgressScreen";
import FusionLoadingScreen from "../screens/FusionLoadingScreen";
import FusionRiskSummaryScreen from "../screens/FusionRiskSummaryScreen";
import FusionDifficultyScreen from "../screens/FusionDifficultyScreen";
import FusionTherapyScreen from "../screens/FusionTherapyScreen";
import FusionReportScreen from "../screens/FusionReportScreen";
import { theme } from "../theme";
import { LevelId } from "../config/speechTasks";
import { HandwritingLevelId } from "../config/handwritingTasks";
import { BehaviorLevelId } from "../config/behaviorTasks";

// ── Param lists ───────────────────────────────────────────────────────────────

export type TabParamList = {
  Home: undefined;
  History: undefined;
  Profile: undefined;
};

/**
 * Present when a module screen was opened from a therapy plan rather than a
 * screening run. Screens carrying this must not write predictions, must not
 * unlock levels, and must return to the therapy plan when finished — otherwise
 * practice would contaminate the very risk score that produced the plan.
 */
export type PracticeParams = {
  /** Backend therapy activity id, e.g. "SPEECH_002". */
  activityId: string;
  /** History doc id of the report this plan came from. */
  reportId: string | null;
  /** Remaining task indices to practise after this one. */
  remaining: number[];
  /** Passed back to the therapy screen so it can re-render the same plan. */
  response: any;
};

export type RootStackParamList = {
  Welcome: undefined;
  Onboarding: undefined;
  Login: undefined;
  Signup: undefined;
  MainTabs: undefined;
  SpeechIntro: undefined;
  SpeechLevels: undefined;
  SpeechActivity: { taskIndex: number; practice?: PracticeParams };
  SpeechListen: { taskIndex: number; practice?: PracticeParams };
  SpeechRecording: { taskIndex: number; practice?: PracticeParams };
  SpeechLevelComplete: { level: LevelId };
  SpeechReview: {
    taskIndex: number; elapsed: number; retryCount: number; audioUri: string;
    practice?: PracticeParams;
  };
  SpeechResult: {
    taskIndex: number;
    retryCount: number;
    result: any | null;
    error?: string;
    practice?: PracticeParams;
  };
  SpeechSummary: undefined;
  BehaviorIntro: undefined;
  BehaviorLevels: undefined;
  BehaviorActivity: { taskIndex: number; practice?: PracticeParams };
  BehaviorLevelComplete: { level: BehaviorLevelId };
  BehaviorResult: {
    taskIndex: number;
    isCorrect: boolean;
    selectedOption: string | null;
    elapsed: number;
    attemptCount: number;
    hintCount: number;
    features: any | null;
    result: any | null;
    error?: string;
    practice?: PracticeParams;
  };
  BehaviorSummary: undefined;
  HandwritingIntro: undefined;
  HandwritingLevels: undefined;
  HandwritingTask: { taskIndex: number; practice?: PracticeParams };
  HandwritingLevelComplete: { level: HandwritingLevelId };
  HandwritingCanvas: {
    taskIndex: number; inputMode: "canvas" | "photo"; taskStartTs: number;
    practice?: PracticeParams;
  };
  HandwritingReview: {
    taskIndex: number;
    inputMode: "canvas" | "photo";
    capturedUri: string | null;
    strokesJson: string | null;
    retryCount: number;
    durationSec: number;
    taskStartTs: number;
    practice?: PracticeParams;
  };
  HandwritingResult: {
    taskIndex: number;
    retryCount: number;
    durationSec: number;
    result: any | null;
    error?: string;
    practice?: PracticeParams;
  };
  HandwritingSummary: undefined;
  FusionProgress: undefined;
  FusionLoading: undefined;
  FusionRiskSummary: { response: any };
  FusionDifficulty: { response: any };
  /**
   * `reportId` is the assessment_history doc id — it identifies which plan the
   * practice progress belongs to. Absent right after an analysis, when the
   * screen falls back to looking up the newest report itself.
   * `completedActivityId` is set when returning from a finished practice run.
   */
  FusionTherapy: { response: any; reportId?: string; completedActivityId?: string };
  FusionReport: { response: any };
};

// ── Tab config ────────────────────────────────────────────────────────────────

const TAB_ITEMS: {
  name: keyof TabParamList;
  label: string;
  icon: string;
  iconActive: string;
}[] = [
  { name: "Home",    label: "Home",    icon: "home-outline",   iconActive: "home" },
  { name: "History", label: "History", icon: "time-outline",   iconActive: "time" },
  { name: "Profile", label: "Profile", icon: "person-outline", iconActive: "person" },
];

// ── Custom bubble tab bar ─────────────────────────────────────────────────────

function BubbleTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarOuter, { paddingBottom: insets.bottom + 10 }]}>
      {/* Frosted glass pill */}
      <View style={styles.tabBarPill}>
        {Platform.OS === "ios" ? (
          <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.tabBarAndroidBg]} />
        )}

        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const tab = TAB_ITEMS[index];

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.8}
              style={styles.tabItem}
            >
              {/* Bubble highlight */}
              {focused && (
                <View style={styles.bubble}>
                  <View style={styles.bubbleInner} />
                </View>
              )}

              <View style={[styles.tabContent, focused && styles.tabContentActive]}>
                <Ionicons
                  name={(focused ? tab.iconActive : tab.icon) as any}
                  size={22}
                  color={focused ? "#fff" : theme.colors.whiteMid}
                />
                {focused && (
                  <Text style={styles.tabLabel}>{tab.label}</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Bottom Tab Navigator ──────────────────────────────────────────────────────

const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BubbleTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ── Root Stack Navigator ──────────────────────────────────────────────────────

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Welcome">
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="SpeechIntro" component={SpeechIntroScreen} />
        <Stack.Screen name="SpeechLevels" component={SpeechLevelsScreen} />
        <Stack.Screen name="SpeechActivity" component={SpeechActivityScreen} />
        <Stack.Screen name="SpeechListen" component={SpeechListenScreen} />
        <Stack.Screen name="SpeechRecording" component={SpeechRecordingScreen} />
        <Stack.Screen name="SpeechReview" component={SpeechReviewScreen} />
        <Stack.Screen name="SpeechResult" component={SpeechResultScreen} />
        <Stack.Screen name="SpeechLevelComplete" component={SpeechLevelCompleteScreen} />
        <Stack.Screen name="SpeechSummary" component={SpeechSummaryScreen} />
        <Stack.Screen name="BehaviorIntro" component={BehaviorIntroScreen} />
        <Stack.Screen name="BehaviorLevels" component={BehaviorLevelsScreen} />
        <Stack.Screen name="BehaviorActivity" component={BehaviorActivityScreen} />
        <Stack.Screen name="BehaviorLevelComplete" component={BehaviorLevelCompleteScreen} />
        <Stack.Screen name="BehaviorResult" component={BehaviorResultScreen} />
        <Stack.Screen name="BehaviorSummary" component={BehaviorSummaryScreen} />
        <Stack.Screen name="HandwritingIntro" component={HandwritingIntroScreen} />
        <Stack.Screen name="HandwritingLevels" component={HandwritingLevelsScreen} />
        <Stack.Screen name="HandwritingTask" component={HandwritingTaskScreen} />
        <Stack.Screen name="HandwritingLevelComplete" component={HandwritingLevelCompleteScreen} />
        <Stack.Screen name="HandwritingCanvas" component={HandwritingCanvasScreen} />
        <Stack.Screen name="HandwritingReview" component={HandwritingReviewScreen} />
        <Stack.Screen name="HandwritingResult" component={HandwritingResultScreen} />
        <Stack.Screen name="HandwritingSummary" component={HandwritingSummaryScreen} />
        <Stack.Screen name="FusionProgress" component={FusionProgressScreen} />
        <Stack.Screen name="FusionLoading" component={FusionLoadingScreen} />
        <Stack.Screen name="FusionRiskSummary" component={FusionRiskSummaryScreen} />
        <Stack.Screen name="FusionDifficulty" component={FusionDifficultyScreen} />
        <Stack.Screen name="FusionTherapy" component={FusionTherapyScreen} />
        <Stack.Screen name="FusionReport" component={FusionReportScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBarOuter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    // no background — screen content shows through
  },

  tabBarPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Platform.OS === "android" ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.55)",
    borderRadius: 40,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
    // shadow
    shadowColor: "#1E293B",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    overflow: Platform.OS === "ios" ? "hidden" : "visible",
  },

  tabBarAndroidBg: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 40,
  },

  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    minWidth: 60,
  },

  bubble: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleInner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.accent,
    borderRadius: 32,
  },

  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 32,
    zIndex: 1,
  },
  tabContentActive: {
    // no extra padding needed — bubble fills behind
  },

  tabLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.semiBold,
    color: "#fff",
  },
});
