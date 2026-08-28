import { LevelId } from "../config/speechTasks";
import { HandwritingLevelId } from "../config/handwritingTasks";
import { BehaviorLevelId } from "../config/behaviorTasks";

export type TabParamList = {
  Home: undefined;
  History: undefined;
  Profile: undefined;
};

export type PracticeParams = {
  activityId: string;
  reportId: string | null;
  remaining: number[];
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
  SpeechRecording: { taskIndex: number; practice?: PracticeParams; retryCount?: number };
  SpeechLevelComplete: { level: LevelId };
  SpeechReview: {
    taskIndex: number;
    elapsed: number;
    retryCount: number;
    audioUri: string;
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
    taskIndex: number;
    inputMode: "canvas" | "photo";
    taskStartTs: number;
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
  FusionTherapy: { response: any; reportId?: string; completedActivityId?: string };
  FusionReport: { response: any };
};
