import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  PanResponder, GestureResponderEvent, Alert, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import ViewShot, { captureRef } from "react-native-view-shot";
import Svg, { Path } from "react-native-svg";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { speak, stopSpeaking } from "../../services/ttsService";
import {
  HANDWRITING_TASKS,
  handwritingLevelTaskCount,
  handwritingPositionInLevel,
} from "../../config/handwritingTasks";
import ScreenContainer from "../../components/common/ScreenContainer";
import ActivityProgressHeader from "../../components/common/ActivityProgressHeader";
import PrimaryButton from "../../components/common/PrimaryButton";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";
import { clayRaised } from "../../theme/shadows";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "HandwritingCanvas">;
  route: RouteProp<RootStackParamList, "HandwritingCanvas">;
};

type Point = { x: number; y: number };
type Stroke = Point[];

const HW_ACCENT: [string, string] = ["#FF9A8D", "#FF7A6B"];

export default function HandwritingCanvasScreen({ navigation, route }: Props) {
  const { taskIndex, inputMode, taskStartTs, practice } = route.params;
  const task = HANDWRITING_TASKS[taskIndex];
  const total = handwritingLevelTaskCount(task.level);
  const position = handwritingPositionInLevel(taskIndex);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [pickingImage, setPickingImage] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const viewShotRef = useRef<ViewShot>(null);
  const canvasInnerRef = useRef<View>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke>([]);
  const isDrawingRef = useRef<boolean>(false);

  // Clear canvas whenever the task changes (e.g. navigating to next task)
  useEffect(() => {
    strokesRef.current = [];
    currentStrokeRef.current = [];
    setStrokes([]);
    setCurrentStroke([]);
    setPhotoUri(null);
    setRetryCount(0);
  }, [taskIndex]);

  const isMemory = task.task_type === "write_from_memory";
  const isDictation = task.task_type === "simple_dictation";
  const [speaking, setSpeaking] = useState(false);
  // Never leave the app talking once the child moves on.
  useEffect(() => () => stopSpeaking(), []);
  const showTarget = !isMemory && !isDictation && inputMode === "canvas";

  const hasContent = inputMode === "canvas" ? strokes.length > 0 : photoUri !== null;

  // ── PanResponder ──────────────────────────────────────────────────────────

  const finishStroke = () => {
    if (currentStrokeRef.current.length > 1) {
      strokesRef.current = [...strokesRef.current, currentStrokeRef.current];
      setStrokes([...strokesRef.current]);
    }
    currentStrokeRef.current = [];
    setCurrentStroke([]);
    isDrawingRef.current = false;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => inputMode === "canvas",
      onStartShouldSetPanResponderCapture: () => inputMode === "canvas",
      onMoveShouldSetPanResponder: () => inputMode === "canvas",
      onMoveShouldSetPanResponderCapture: () => inputMode === "canvas",
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        isDrawingRef.current = true;
        currentStrokeRef.current = [{ x: locationX, y: locationY }];
        setCurrentStroke([{ x: locationX, y: locationY }]);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        if (!isDrawingRef.current) return;
        const { locationX, locationY } = evt.nativeEvent;
        const last = currentStrokeRef.current[currentStrokeRef.current.length - 1];
        if (last && Math.abs(last.x - locationX) < 1 && Math.abs(last.y - locationY) < 1) return;
        currentStrokeRef.current = [...currentStrokeRef.current, { x: locationX, y: locationY }];
        setCurrentStroke([...currentStrokeRef.current]);
      },
      onPanResponderRelease: finishStroke,
      onPanResponderTerminate: finishStroke,
    })
  ).current;

  const handleClear = () => {
    strokesRef.current = [];
    setStrokes([]);
    setCurrentStroke([]);
    setRetryCount((c) => c + 1);
  };

  const handleUndo = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current = strokesRef.current.slice(0, -1);
    setStrokes([...strokesRef.current]);
  };

  // ── Photo capture ─────────────────────────────────────────────────────────

  const handlePickPhoto = useCallback(async () => {
    setPickingImage(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        const { status: gs } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (gs !== "granted") {
          Alert.alert("Permission needed", "Camera or gallery permission is required.");
          return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.9 });
        if (!res.canceled && res.assets[0]) { setPhotoUri(res.assets[0].uri); setRetryCount((c) => c + 1); }
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.9 });
      if (!res.canceled && res.assets[0]) setPhotoUri(res.assets[0].uri);
    } finally {
      setPickingImage(false);
    }
  }, []);

  const handleRetakePhoto = () => {
    setPhotoUri(null);
    setRetryCount((c) => c + 1);
    handlePickPhoto();
  };

  // ── Submit: capture canvas → navigate to Review ───────────────────────────

  const handleSubmit = async () => {
    const durationSec = Math.round((Date.now() - taskStartTs) / 1000);

    if (inputMode === "photo") {
      navigation.navigate("HandwritingReview", {
        practice,
        taskIndex, inputMode,
        capturedUri: photoUri,
        strokesJson: null,
        retryCount, durationSec, taskStartTs,
      });
      return;
    }

    // Canvas mode — capture the ViewShot as a PNG
    setCapturing(true);
    try {
      const uri = await captureRef(viewShotRef, { format: "png", quality: 1.0, result: "tmpfile" });
      navigation.navigate("HandwritingReview", {
        practice,
        taskIndex, inputMode,
        capturedUri: uri,
        strokesJson: JSON.stringify(strokesRef.current),
        retryCount, durationSec, taskStartTs,
      });
    } catch (e: any) {
      Alert.alert("Capture failed", "Could not save the canvas image. Please try again.");
      console.warn("[ViewShot] capture error:", e.message);
    } finally {
      setCapturing(false);
    }
  };

  // ── Render strokes ────────────────────────────────────────────────────────

  const strokeToPath = (stroke: Stroke): string => {
    if (stroke.length === 0) return "";
    if (stroke.length === 1) {
      const p = stroke[0];
      return `M ${p.x} ${p.y} L ${p.x + 0.01} ${p.y + 0.01}`;
    }
    let d = `M ${stroke[0].x} ${stroke[0].y}`;
    for (let i = 1; i < stroke.length - 1; i++) {
      const midX = (stroke[i].x + stroke[i + 1].x) / 2;
      const midY = (stroke[i].y + stroke[i + 1].y) / 2;
      d += ` Q ${stroke[i].x} ${stroke[i].y} ${midX} ${midY}`;
    }
    const last = stroke[stroke.length - 1];
    d += ` L ${last.x} ${last.y}`;
    return d;
  };

  const renderStrokes = (allStrokes: Stroke[], current: Stroke) => (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      {[...allStrokes, current].map((stroke, si) =>
        stroke.length > 0 ? (
          <Path
            key={si}
            d={strokeToPath(stroke)}
            stroke="#FF6B57"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ) : null
      )}
    </Svg>
  );

  const promptTitle = task.task_type === "letter_trace"
    ? "Trace the "
    : isDictation
      ? "Write what you heard"
      : isMemory
        ? "Write from memory"
        : "Write ";

  return (
    <ScreenContainer>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <ActivityProgressHeader
        current={position}
        total={total}
        onBack={() => navigation.goBack()}
        accent={HW_ACCENT}
      />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>
            {showTarget ? (
              <>
                {promptTitle}
                <Text style={styles.titleAccent}>{task.target_text}</Text>
              </>
            ) : (
              promptTitle
            )}
          </Text>
          {inputMode === "canvas" && (
            <View style={styles.strokeBadge}>
              <Text style={styles.strokeBadgeText}>
                {strokes.length} stroke{strokes.length !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>

        {(isMemory || isDictation) && (
          <View style={styles.hiddenRow}>
            <Ionicons name="bulb-outline" size={14} color={colors.textMuted} />
            <Text style={styles.hiddenHint}>
              {isMemory ? "Target hidden — write from memory" : "Write what you heard"}
            </Text>
            {/* Dictation only: the word is never shown here, so replaying the
                audio is the child's only way back to the prompt. */}
            {isDictation && (
              <TouchableOpacity
                style={styles.replayBtn}
                activeOpacity={0.8}
                onPress={() =>
                  speak(task.target_text, {
                    onStart: () => setSpeaking(true),
                    onDone: () => setSpeaking(false),
                    onError: () => setSpeaking(false),
                  })
                }
                accessibilityRole="button"
                accessibilityLabel="Hear again"
              >
                <Ionicons name={speaking ? "volume-high" : "volume-medium-outline"} size={14} color="#FF6B57" />
                <Text style={styles.replayBtnText}>Hear again</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Canvas */}
        {inputMode === "canvas" && (
          <View style={styles.canvasWrapper}>
            {/* ViewShot wraps only the white drawing area so the capture has a clean white background */}
            <ViewShot ref={viewShotRef} style={styles.canvas} options={{ format: "png", quality: 1.0 }}>
              <View
                ref={canvasInnerRef}
                style={StyleSheet.absoluteFill}
                collapsable={false}
                pointerEvents="box-only"
                {...panResponder.panHandlers}
              >
                {/* Faint trace letter for letter_trace tasks */}
                {task.task_type === "letter_trace" && (
                  <View style={styles.traceLetterWrap} pointerEvents="none">
                    <Text style={styles.traceLetter}>{task.target_text}</Text>
                    <Text style={styles.traceHint}>Trace over this letter</Text>
                  </View>
                )}

                {strokes.length === 0 && currentStroke.length === 0 && task.task_type !== "letter_trace" && (
                  <View style={styles.placeholderWrap}>
                    <Ionicons name="pencil-outline" size={28} color="#CBD5E1" />
                    <Text style={styles.placeholderText}>Write here with your finger or stylus</Text>
                  </View>
                )}

                {renderStrokes(strokes, currentStroke)}
              </View>
            </ViewShot>
            <View pointerEvents="none" style={styles.lineOverlay}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={[styles.guideLine, { top: 62 * (i + 1) }]} />
              ))}
            </View>
          </View>
        )}

        {/* Photo */}
        {inputMode === "photo" && (
          <View style={styles.photoWrapper}>
            {!photoUri ? (
              <TouchableOpacity
                style={[styles.photoPlaceholder, clayRaised("md")]}
                onPress={handlePickPhoto}
                activeOpacity={0.8}
                disabled={pickingImage}
                accessibilityRole="button"
                accessibilityLabel="Capture handwriting"
              >
                {pickingImage ? <ActivityIndicator color="#FF6B57" /> : (
                  <>
                    <View style={styles.photoIconWrap}>
                      <Ionicons name="camera-outline" size={36} color="#FF6B57" />
                    </View>
                    <Text style={styles.photoPromptTitle}>Capture handwriting</Text>
                    <Text style={styles.photoPromptSub}>Write on paper first, then take a photo or choose from gallery</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.photoPreviewWrap}>
                <View style={[styles.photoPreviewBox, clayRaised("md")]}>
                  <Ionicons name="image-outline" size={48} color="#FF6B57" />
                  <Text style={styles.photoCapturedLabel}>Photo captured</Text>
                  <Text style={styles.photoUriText} numberOfLines={1}>{photoUri.split("/").pop()}</Text>
                </View>
                <TouchableOpacity style={[styles.retakeBtn, clayRaised("sm")]} onPress={handleRetakePhoto}>
                  <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.retakeBtnText}>Retake</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {retryCount > 0 && (
          <Text style={styles.retryText}>Rewrite #{retryCount}</Text>
        )}

        <View style={styles.tools}>
          {inputMode === "canvas" && (
            <>
              <TouchableOpacity
                style={[styles.toolSq, clayRaised("sm")]}
                onPress={handleUndo}
                disabled={strokes.length === 0}
                accessibilityRole="button"
                accessibilityLabel="Undo"
              >
                <Text style={[styles.toolLabel, strokes.length === 0 && styles.toolDisabled]}>Undo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toolSq, clayRaised("sm")]}
                onPress={handleClear}
                disabled={strokes.length === 0}
                accessibilityRole="button"
                accessibilityLabel="Clear"
              >
                <Text style={[styles.toolLabel, strokes.length === 0 && styles.toolDisabled]}>Clear</Text>
              </TouchableOpacity>
            </>
          )}

          {!hasContent ? (
            inputMode === "photo" ? (
              <PrimaryButton
                label="Open Camera"
                onPress={handlePickPhoto}
                disabled={pickingImage}
                loading={pickingImage}
                colors={HW_ACCENT}
                style={styles.doneBtn}
              />
            ) : (
              <PrimaryButton
                label="Done"
                onPress={handleSubmit}
                disabled
                colors={HW_ACCENT}
                style={styles.doneBtn}
              />
            )
          ) : (
            <PrimaryButton
              label="Done"
              onPress={handleSubmit}
              loading={capturing}
              disabled={capturing}
              colors={HW_ACCENT}
              style={styles.doneBtn}
            />
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingTop: 14 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingBottom: 12,
    gap: 10,
  },
  title: { fontFamily: fonts.extraBold, fontSize: 17, color: colors.text, flex: 1 },
  titleAccent: { color: "#FF6B57" },
  strokeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 11,
    backgroundColor: "#FDE3DF",
  },
  strokeBadgeText: { fontFamily: fonts.extraBold, fontSize: 11.5, color: "#C6493A" },
  hiddenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  hiddenHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, flexShrink: 1 },
  replayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.coralTint,
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 32,
  },
  replayBtnText: { fontFamily: fonts.semiBold, fontSize: 11, color: "#FF6B57" },

  canvasWrapper: {
    flex: 1,
    borderRadius: 30,
    backgroundColor: "#FBFCFE",
    overflow: "hidden",
  },
  canvas: {
    flex: 1,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  lineOverlay: { ...StyleSheet.absoluteFillObject },
  guideLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "rgba(45,142,255,0.1)",
  },
  placeholderWrap: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center", justifyContent: "center", gap: 8,
  },
  placeholderText: { fontSize: 13, fontFamily: fonts.regular, color: "#CBD5E1", textAlign: "center" },

  traceLetterWrap: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center", justifyContent: "center", gap: 4,
  },
  traceLetter: {
    fontSize: 180, fontFamily: fonts.extraBold,
    color: "rgba(226, 233, 243, 0.95)",
    includeFontPadding: false, lineHeight: 180,
  },
  traceHint: {
    fontSize: 12, fontFamily: fonts.regular,
    color: "rgba(255, 107, 87, 0.45)",
    letterSpacing: 0.5,
  },

  photoWrapper: { flex: 1 },
  photoPlaceholder: {
    flex: 1,
    backgroundColor: colors.bgSoft,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
  },
  photoIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.coralTint,
    alignItems: "center", justifyContent: "center",
  },
  photoPromptTitle: { fontSize: 16, fontFamily: fonts.semiBold, color: colors.text },
  photoPromptSub: {
    fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted,
    textAlign: "center", paddingHorizontal: 20,
  },
  photoPreviewWrap: { flex: 1, gap: 12 },
  photoPreviewBox: {
    flex: 1, backgroundColor: colors.bgSoft, borderRadius: 30,
    alignItems: "center", justifyContent: "center", gap: 10,
  },
  photoUriText: { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted, paddingHorizontal: 20 },
  photoCapturedLabel: { fontSize: 14, fontFamily: fonts.semiBold, color: "#FF6B57" },
  retakeBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center",
    backgroundColor: colors.bgSoft, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, minHeight: 44,
  },
  retakeBtnText: { fontSize: 13, fontFamily: fonts.medium, color: colors.textSecondary },

  retryText: {
    fontFamily: fonts.medium, fontSize: 11, color: "#B0791A",
    textAlign: "center", marginTop: 8,
  },
  tools: { flexDirection: "row", alignItems: "center", gap: 11, paddingTop: 16, paddingBottom: 8 },
  toolSq: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.bgSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  toolLabel: { fontFamily: fonts.extraBold, fontSize: 12, color: colors.textSecondary },
  toolDisabled: { color: "#CBD5E1" },
  doneBtn: { flex: 1 },
});
