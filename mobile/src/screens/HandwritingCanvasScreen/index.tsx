// Handwriting Canvas screen.
// The child writes the task answer here, either by drawing with a finger/stylus
// or by taking/choosing a photo of paper writing.
// Comes from: HandwritingTaskScreen (the "Open Canvas / Open Camera" button).
// Goes to: HandwritingReview (with the canvas image or photo) when "Review & Submit"
// is pressed; the back button returns to the task screen.
// Uses: HANDWRITING_TASKS config (the task), ttsService (read the hint / word aloud),
// LETTER_START util (where-to-start hint), ImagePicker + ViewShot (photo and canvas capture).
// It makes no backend call itself - the Review screen sends the image for analysis.
import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  PanResponder, GestureResponderEvent, Alert, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import ViewShot, { captureRef, ViewShotRef } from "react-native-view-shot";
import Svg, { Path } from "react-native-svg";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { theme } from "../../theme";
import KidBackground from "../../components/KidBackground";
import { speak, stopSpeaking } from "../../services/ttsService";
import {
  HANDWRITING_TASKS, HANDWRITING_TASK_TYPE_LABELS,
  HANDWRITING_TASK_TYPE_ICONS, HANDWRITING_TASK_COLORS,
} from "../../config/handwritingTasks";
import { LETTER_START } from "../../utils/letterStart";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "HandwritingCanvas">;
  route: RouteProp<RootStackParamList, "HandwritingCanvas">;
};

// One touch position, and one stroke = the list of points from finger down to finger up.
type Point = { x: number; y: number };
type Stroke = Point[];

// Main screen component: holds the drawn strokes / photo and handles submit.
export default function HandwritingCanvasScreen({ navigation, route }: Props) {
  const { taskIndex, inputMode, taskStartTs, practice } = route.params;
  const task = HANDWRITING_TASKS[taskIndex];
  const taskColors = HANDWRITING_TASK_COLORS[task.task_type];

  // strokes = finished lines, currentStroke = the line being drawn right now,
  // photoUri = chosen photo, retryCount = how many times the child cleared/retook.
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [pickingImage, setPickingImage] = useState(false);
  const [capturing, setCapturing] = useState(false);

  // Refs hold the latest values so the touch handlers (created once) never read stale state.
  const viewShotRef = useRef<ViewShotRef>(null);
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
  // Single letters get a "where to start" cue; the review screen checks the first stroke against it.
  const startCue = showTarget && (task.task_type === "letter_trace" || task.task_type === "letter_copy")
    ? LETTER_START[task.target_text]?.cue : undefined;

  const hasContent = inputMode === "canvas" ? strokes.length > 0 : photoUri !== null;

  // ── PanResponder ──────────────────────────────────────────────────────────

  // Called when the finger lifts: saves the current line (if it has more than one point).
  const finishStroke = () => {
    if (currentStrokeRef.current.length > 1) {
      strokesRef.current = [...strokesRef.current, currentStrokeRef.current];
      setStrokes([...strokesRef.current]);
    }
    currentStrokeRef.current = [];
    setCurrentStroke([]);
    isDrawingRef.current = false;
  };

  // Touch handler for drawing: start a line on touch, add points while moving,
  // finish it on release. Only active in "canvas" mode.
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

  // Clear button: wipes all strokes and counts it as a rewrite.
  const handleClear = () => {
    strokesRef.current = [];
    setStrokes([]);
    setCurrentStroke([]);
    setRetryCount((c) => c + 1);
  };

  // Undo button: removes only the last stroke.
  const handleUndo = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current = strokesRef.current.slice(0, -1);
    setStrokes([...strokesRef.current]);
  };

  // ── Photo capture ─────────────────────────────────────────────────────────

  // Asks for camera permission and opens the camera; if camera is denied it falls back
  // to the photo gallery, and shows an alert if neither is allowed.
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

  // Retake button: drops the current photo and opens the camera again.
  const handleRetakePhoto = () => {
    setPhotoUri(null);
    setRetryCount((c) => c + 1);
    handlePickPhoto();
  };

  // ── Submit: capture canvas → navigate to Review ───────────────────────────

  // Works out how long the task took, saves the canvas as a PNG (or uses the photo),
  // then opens the Review screen with the image, strokes and timing.
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

  // Turns a list of points into an SVG path string (smoothed with curves) so it can be drawn.
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

  // Draws every finished stroke plus the one in progress as dark lines over the canvas.
  const renderStrokes = (allStrokes: Stroke[], current: Stroke) => (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      {[...allStrokes, current].map((stroke, si) =>
        stroke.length > 0 ? (
          <Path
            key={si}
            d={strokeToPath(stroke)}
            stroke="#1E293B"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ) : null
      )}
    </Svg>
  );

  return (
    <View style={styles.container}>
      <KidBackground variant="handwriting" />
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name={HANDWRITING_TASK_TYPE_ICONS[task.task_type] as any} size={14} color={taskColors.color} />
          <Text style={styles.headerTitle}>{HANDWRITING_TASK_TYPE_LABELS[task.task_type]}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>

        {showTarget && (
          <View style={[styles.targetReminder, { borderColor: taskColors.border, backgroundColor: taskColors.bg }]}>
            <Text style={styles.targetReminderLabel}>Write:</Text>
            <Text style={[styles.targetReminderText, { color: taskColors.color }]}>{task.target_text}</Text>
          </View>
        )}
        {startCue && (
          <TouchableOpacity
            style={[styles.targetReminder, { borderColor: "#BBF7D0", backgroundColor: "#ECFDF5" }]}
            activeOpacity={0.8}
            onPress={() => speak(startCue)}
            accessibilityRole="button"
            accessibilityLabel={startCue}
          >
            <Ionicons name="play-circle" size={16} color="#059669" />
            <Text style={[styles.hiddenHint, { color: "#047857" }]}>{startCue}</Text>
            <Ionicons name="volume-medium-outline" size={14} color="#059669" />
          </TouchableOpacity>
        )}
        {(isMemory || isDictation) && (
          <View style={[styles.targetReminder, { borderColor: "#E8EDF5", backgroundColor: "#F8FAFC" }]}>
            <Ionicons name="bulb-outline" size={14} color="#94A3B8" />
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
              >
                <Ionicons name={speaking ? "volume-high" : "volume-medium-outline"} size={14} color="#2563EB" />
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

            <View style={styles.canvasTools}>
              <TouchableOpacity style={styles.toolBtn} onPress={handleUndo} disabled={strokes.length === 0}>
                <Ionicons name="arrow-undo-outline" size={18} color={strokes.length > 0 ? "#64748B" : "#CBD5E1"} />
                <Text style={[styles.toolLabel, strokes.length === 0 && { color: "#CBD5E1" }]}>Undo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolBtn} onPress={handleClear} disabled={strokes.length === 0}>
                <Ionicons name="trash-outline" size={18} color={strokes.length > 0 ? "#EF4444" : "#CBD5E1"} />
                <Text style={[styles.toolLabel, { color: strokes.length > 0 ? "#EF4444" : "#CBD5E1" }]}>Clear</Text>
              </TouchableOpacity>
              {retryCount > 0 && (
                <View style={styles.retryBadge}>
                  <Text style={styles.retryText}>Rewrite #{retryCount}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Photo */}
        {inputMode === "photo" && (
          <View style={styles.photoWrapper}>
            {!photoUri ? (
              <TouchableOpacity style={styles.photoPlaceholder} onPress={handlePickPhoto} activeOpacity={0.8} disabled={pickingImage}>
                {pickingImage ? <ActivityIndicator color="#2563EB" /> : (
                  <>
                    <View style={styles.photoIconWrap}>
                      <Ionicons name="camera-outline" size={36} color="#2563EB" />
                    </View>
                    <Text style={styles.photoPromptTitle}>Capture handwriting</Text>
                    <Text style={styles.photoPromptSub}>Write on paper first, then take a photo or choose from gallery</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.photoPreviewWrap}>
                <View style={styles.photoPreviewBox}>
                  <Ionicons name="image-outline" size={48} color="#2563EB" />
                  <Text style={styles.photoCapturedLabel}>Photo captured</Text>
                  <Text style={styles.photoUriText} numberOfLines={1}>{photoUri.split("/").pop()}</Text>
                </View>
                <TouchableOpacity style={styles.retakeBtn} onPress={handleRetakePhoto}>
                  <Ionicons name="refresh-outline" size={16} color="#64748B" />
                  <Text style={styles.retakeBtnText}>Retake</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Action */}
        <View style={styles.actionArea}>
          {!hasContent && inputMode === "photo" ? (
            <LinearGradient colors={["#2563EB", "#1D4ED8"]} style={styles.submitBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <TouchableOpacity style={styles.submitBtnInner} onPress={handlePickPhoto} activeOpacity={0.88} disabled={pickingImage}>
                <Ionicons name="camera-outline" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>Open Camera</Text>
              </TouchableOpacity>
            </LinearGradient>
          ) : (
            <LinearGradient
              colors={hasContent ? [taskColors.color, taskColors.color] : ["#CBD5E1", "#CBD5E1"]}
              style={styles.submitBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <TouchableOpacity style={styles.submitBtnInner} onPress={handleSubmit} activeOpacity={0.88} disabled={!hasContent || capturing}>
                {capturing ? (
                  <><ActivityIndicator color="#fff" size="small" /><Text style={styles.submitBtnText}>Preparing…</Text></>
                ) : (
                  <><Ionicons name="eye-outline" size={20} color="#fff" /><Text style={styles.submitBtnText}>Review & Submit</Text><Ionicons name="arrow-forward" size={18} color="#fff" /></>
                )}
              </TouchableOpacity>
            </LinearGradient>
          )}
        </View>
      </View>
    </View>
  );
}

// Colours used below: page background light blue-grey (#F5F7FF), white cards/buttons,
// dark slate text (#1E293B), grey-blue secondary text (#64748B / #94A3B8),
// blue (#2563EB) for the main action and photo area, red (#EF4444) for Clear,
// amber (#FEF3C7 / #D97706) for the rewrite badge, faint purple for the trace letter.
const styles = StyleSheet.create({
  // Page and header (back button + title)
  container: { flex: 1, backgroundColor: "#F5F7FF" },
  header: {
    paddingTop: 58, paddingHorizontal: 20, paddingBottom: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#94A3B8", shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 3,
  },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: "#1E293B" },

  body: { flex: 1, paddingHorizontal: 20, gap: 14 },

  // Small reminder strip above the canvas (target letter, hints, "Hear again" button)
  targetReminder: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, alignSelf: "center",
  },
  targetReminderLabel: { fontSize: 12, fontFamily: theme.fonts.medium, color: "#64748B" },
  targetReminderText: { fontSize: 28, fontFamily: theme.fonts.extraBold, letterSpacing: 3 },
  replayBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE",
    borderRadius: 50, paddingHorizontal: 10, paddingVertical: 5,
  },
  replayBtnText: { fontSize: 11, fontFamily: theme.fonts.semiBold, color: "#2563EB" },
  hiddenHint: { fontSize: 12, fontFamily: theme.fonts.regular, color: "#94A3B8" },

  // Drawing area: white paper with a soft border and shadow, plus empty-state placeholder
  canvasWrapper: { flex: 1, gap: 10 },
  canvas: {
    flex: 1, backgroundColor: "#fff",
    borderRadius: 20, borderWidth: 1.5, borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#94A3B8", shadowOpacity: 0.08, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
  },
  placeholderWrap: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center", justifyContent: "center", gap: 8,
  },
  placeholderText: { fontSize: 13, fontFamily: theme.fonts.regular, color: "#CBD5E1", textAlign: "center" },

  // Faint purple letter shown behind the strokes for tracing tasks
  traceLetterWrap: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center", justifyContent: "center", gap: 4,
  },
  traceLetter: {
    fontSize: 180, fontFamily: theme.fonts.extraBold,
    color: "rgba(124, 58, 237, 0.12)",
    includeFontPadding: false, lineHeight: 180,
  },
  traceHint: {
    fontSize: 12, fontFamily: theme.fonts.regular,
    color: "rgba(124, 58, 237, 0.35)",
    letterSpacing: 0.5,
  },

  // Undo / Clear buttons (white pills) and the amber "Rewrite #" badge
  canvasTools: { flexDirection: "row", alignItems: "center", gap: 12 },
  toolBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingVertical: 6, paddingHorizontal: 12, backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#E8EDF5",
  },
  toolLabel: { fontSize: 12, fontFamily: theme.fonts.medium, color: "#64748B" },
  retryBadge: { marginLeft: "auto" as any, backgroundColor: "#FEF3C7", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  retryText: { fontSize: 11, fontFamily: theme.fonts.medium, color: "#D97706" },

  // Photo mode: dashed "take a photo" box, then a preview box with blue accents and a Retake button
  photoWrapper: { flex: 1 },
  photoPlaceholder: {
    flex: 1, backgroundColor: "#fff", borderRadius: 20, borderWidth: 1.5, borderColor: "#E2E8F0",
    borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 10,
  },
  photoIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  photoPromptTitle: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: "#1E293B" },
  photoPromptSub: { fontSize: 12, fontFamily: theme.fonts.regular, color: "#94A3B8", textAlign: "center", paddingHorizontal: 30 },
  photoPreviewWrap: { flex: 1, gap: 12 },
  photoPreviewBox: {
    flex: 1, backgroundColor: "#fff", borderRadius: 20, borderWidth: 1.5, borderColor: "#DBEAFE",
    alignItems: "center", justifyContent: "center", gap: 10,
  },
  photoUriText: { fontSize: 11, fontFamily: theme.fonts.regular, color: "#94A3B8", paddingHorizontal: 20 },
  photoCapturedLabel: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: "#2563EB" },
  retakeBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center",
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
  },
  retakeBtnText: { fontSize: 13, fontFamily: theme.fonts.medium, color: "#64748B" },

  // Bottom action button: blue gradient pill with white text (grey when nothing is drawn yet)
  actionArea: { paddingBottom: 30 },
  submitBtn: {
    borderRadius: 50,
    shadowColor: "#2563EB", shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  submitBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18 },
  submitBtnText: { fontSize: 16, fontFamily: theme.fonts.bold, color: "#fff" },
});
