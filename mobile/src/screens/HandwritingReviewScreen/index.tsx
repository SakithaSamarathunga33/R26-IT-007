import React, { useState } from "react";
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  ScrollView, ActivityIndicator, Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { theme } from "../../theme";
import { auth, db } from "../../config/firebase";
import {
  HANDWRITING_TASKS, HANDWRITING_TASK_TYPE_LABELS,
  HANDWRITING_TASK_TYPE_ICONS, HANDWRITING_TASK_COLORS,
} from "../../config/handwritingTasks";
import { getTimeOfDay } from "../../utils/behaviorFeatures";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "HandwritingReview">;
  route: RouteProp<RootStackParamList, "HandwritingReview">;
};

import { API_URLS } from "../../config/apiConfig";
const HANDWRITING_API = API_URLS.handwriting;

export default function HandwritingReviewScreen({ navigation, route }: Props) {
  const { taskIndex, inputMode, capturedUri, strokesJson, retryCount, durationSec, practice } = route.params;
  // Practice runs come from a therapy plan — they must never write predictions,
  // or rehearsing would move the risk score the plan was based on.
  const isPractice = !!practice;
  const task = HANDWRITING_TASKS[taskIndex];
  const taskColors = HANDWRITING_TASK_COLORS[task.task_type];
  const [submitting, setSubmitting] = useState(false);

  const strokeCount = strokesJson ? (JSON.parse(strokesJson) as any[][]).length : 0;

  const handleRetake = () => navigation.goBack();

  const handleSubmit = async () => {
    setSubmitting(true);
    let result: any = null;
    let apiError: string | undefined;

    try {
      const uid = auth.currentUser?.uid ?? "anonymous";

      // Build multipart form
      const formData = new FormData();

      if (capturedUri) {
        const filename = capturedUri.split("/").pop() ?? "handwriting.png";
        const ext = filename.split(".").pop()?.toLowerCase() ?? "png";
        const mimeMap: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
        formData.append("image", { uri: capturedUri, name: filename, type: mimeMap[ext] ?? "image/png" } as any);

      } else {
        throw new Error("No image captured. Please rewrite and try again.");
      }

      formData.append("task_type", task.task_type);
      formData.append("target_text", task.target_text);
      formData.append("difficulty_level", task.difficulty_level);
      formData.append("age", "6");
      formData.append("native_language", "Sinhala");
      formData.append("assessment_language", "English");
      formData.append("school_type", "urban_public");
      formData.append("support_level", "none");
      formData.append("device_type", inputMode === "canvas" ? "tablet_finger" : "paper_camera");
      formData.append("environment_noise_level", "0.12");
      formData.append("time_of_day", getTimeOfDay());
      formData.append("writing_duration_sec", String(durationSec));
      formData.append("retry_count", String(retryCount));
      formData.append("task_completion_status", "1");
      formData.append("self_correction_flag", retryCount > 0 ? "1" : "0");
      formData.append("strict_target_match", "false");

      // Call API first — Firestore save is best-effort and must not block the result
      const response = await fetch(HANDWRITING_API, { method: "POST", body: formData });
      const responseText = await response.text();

      if (!response.ok) throw new Error(`Server error ${response.status}: ${responseText}`);
      result = JSON.parse(responseText);

      // Save to Firestore — wrapped independently so permissions errors don't surface to the user.
      // Skipped entirely for therapy practice so rehearsal can't move the risk score.
      if (!isPractice) try {
        const attemptRef = await addDoc(collection(db, "handwriting_attempts"), {
          user_id: uid,
          task_type: task.task_type,
          task_id: task.id,
          level: task.level,
          target_text: task.target_text,
          difficulty_level: task.difficulty_level,
          device_type: inputMode === "canvas" ? "tablet_finger" : "paper_camera",
          input_mode: inputMode,
          image_url: capturedUri ?? null,
          strokes_json: strokesJson ?? null,
          writing_duration_sec: durationSec,
          retry_count: retryCount,
          submitted_at: serverTimestamp(),
        });

        await addDoc(collection(db, "handwriting_predictions"), {
          attempt_id: attemptRef.id,
          child_id: uid,
          session_id: `session_${uid}`,
          // Task identity is denormalised onto the prediction so summaries can
          // label rows without assuming the child played every task in order.
          task_index: taskIndex,
          task_id: task.id,
          level: task.level,
          target_text: task.target_text,
          task_type: task.task_type,
          validation_json: result.validation ?? null,
          quality_json: result.quality ?? null,
          features_json: result.features ?? null,
          risk_probability: result.prediction?.risk_probability ?? null,
          risk_level: result.prediction?.risk_level ?? null,
          risk_label_binary: result.prediction?.handwriting_risk_label_binary ?? null,
          model_name: "logistic_regression",
          model_version: "1.0",
          saved_at: serverTimestamp(),
        });
      } catch (dbErr: any) {
        console.warn("[HandwritingDB] Save failed (non-fatal):", dbErr.message);
      }

    } catch (err: any) {
      apiError = err.message;
      console.warn("[HandwritingAPI] Error:", err.message);
    }

    setSubmitting(false);
    navigation.replace("HandwritingResult", {
      practice,
      taskIndex,
      retryCount,
      durationSec,
      result,
      error: apiError,
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleRetake} disabled={submitting}>
          <Ionicons name="arrow-back" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Writing</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Preview card */}
        <View style={[styles.previewCard, { borderColor: taskColors.border }]}>
          <View style={styles.previewHeader}>
            <Ionicons name={HANDWRITING_TASK_TYPE_ICONS[task.task_type] as any} size={16} color={taskColors.color} />
            <Text style={[styles.previewHeaderText, { color: taskColors.color }]}>
              {HANDWRITING_TASK_TYPE_LABELS[task.task_type]}
            </Text>
            <View style={[styles.targetPill, { backgroundColor: taskColors.bg }]}>
              <Text style={[styles.targetPillText, { color: taskColors.color }]}>{task.target_text}</Text>
            </View>
          </View>

          <View style={styles.previewCanvas}>
            {capturedUri ? (
              <>
                <Image
                  source={{ uri: capturedUri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                {inputMode === "canvas" && (
                  <View style={styles.strokeBadge}>
                    <Ionicons name="brush-outline" size={12} color="#7C3AED" />
                    <Text style={styles.strokeBadgeText}>
                      {strokeCount} stroke{strokeCount !== 1 ? "s" : ""}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.canvasPreviewInner}>
                <Ionicons name="brush-outline" size={32} color="#CBD5E1" />
                <Text style={styles.canvasPreviewText}>No image captured</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsCard}>
          {[
            { icon: "time-outline" as const, iconBg: "#FFFBEB", iconColor: "#D97706", label: "Duration", value: `${durationSec}s` },
            { icon: "refresh-outline" as const, iconBg: "#F5F3FF", iconColor: "#7C3AED", label: "Rewrites", value: `${retryCount}` },
            { icon: inputMode === "canvas" ? "brush-outline" as const : "camera-outline" as const, iconBg: "#EFF6FF", iconColor: "#2563EB", label: "Mode", value: inputMode === "canvas" ? "Canvas" : "Photo" },
          ].map((row, i) => (
            <View key={i} style={[styles.statItem, i < 2 && styles.statItemBorder]}>
              <View style={[styles.statIcon, { backgroundColor: row.iconBg }]}>
                <Ionicons name={row.icon} size={14} color={row.iconColor} />
              </View>
              <Text style={styles.statValue}>{row.value}</Text>
              <Text style={styles.statLabel}>{row.label}</Text>
            </View>
          ))}
        </View>

        {/* Warning notice */}
        <View style={styles.warningCard}>
          <Ionicons name="information-circle-outline" size={18} color="#D97706" />
          <Text style={styles.warningText}>
            Please check that the writing is clear before submitting. Unclear images may affect the result.
          </Text>
        </View>

        <View style={{ height: 12 }} />

        {/* Retake button */}
        <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake} disabled={submitting}>
          <Ionicons name="refresh-outline" size={18} color="#64748B" />
          <Text style={styles.retakeBtnText}>Retake / Rewrite</Text>
        </TouchableOpacity>

        <View style={{ height: 14 }} />

        {/* Submit button */}
        <LinearGradient
          colors={submitting ? ["#94A3B8", "#94A3B8"] : [taskColors.color, taskColors.color]}
          style={styles.submitBtn}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity style={styles.submitBtnInner} onPress={handleSubmit} disabled={submitting} activeOpacity={0.88}>
            {submitting ? (
              <><ActivityIndicator color="#fff" size="small" /><Text style={styles.submitBtnText}>Analysing…</Text></>
            ) : (
              <><Ionicons name="send-outline" size={20} color="#fff" /><Text style={styles.submitBtnText}>Submit for Analysis</Text><Ionicons name="arrow-forward" size={18} color="#fff" /></>
            )}
          </TouchableOpacity>
        </LinearGradient>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  headerTitle: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: "#1E293B" },
  content: { paddingHorizontal: 20 },

  previewCard: {
    backgroundColor: "#fff", borderWidth: 1.5, borderRadius: 24, overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#94A3B8", shadowOpacity: 0.08, shadowOffset: { width: 0, height: 4 }, shadowRadius: 16, elevation: 4,
  },
  previewHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
  },
  previewHeaderText: { fontSize: 13, fontFamily: theme.fonts.semiBold, flex: 1 },
  targetPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  targetPillText: { fontSize: 13, fontFamily: theme.fonts.bold },
  previewCanvas: { height: 300, alignItems: "center", justifyContent: "center" },
  previewImage: { width: "100%", height: 300 },
  strokeBadge: {
    position: "absolute", bottom: 8, right: 8,
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#F5F3FF", borderWidth: 1, borderColor: "#EDE9FE",
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  strokeBadgeText: { fontSize: 11, fontFamily: theme.fonts.semiBold, color: "#7C3AED" },
  canvasPreviewInner: { alignItems: "center", gap: 8 },
  canvasPreviewText: { fontSize: 13, fontFamily: theme.fonts.medium, color: "#94A3B8" },
  photoPreviewInner: { alignItems: "center", gap: 8 },
  photoPreviewText: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: "#2563EB" },

  statsCard: {
    flexDirection: "row", backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 20, marginBottom: 14,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 16, gap: 5 },
  statItemBorder: { borderRightWidth: 1, borderRightColor: "#F1F5F9" },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 16, fontFamily: theme.fonts.extraBold, color: "#1E293B" },
  statLabel: { fontSize: 10, fontFamily: theme.fonts.medium, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5 },

  warningCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FEF3C7",
    borderRadius: 16, padding: 14,
  },
  warningText: { flex: 1, fontSize: 13, fontFamily: theme.fonts.regular, color: "#92400E", lineHeight: 19 },

  retakeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 50, paddingVertical: 14,
    shadowColor: "#94A3B8", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  retakeBtnText: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: "#64748B" },

  submitBtn: {
    borderRadius: 50,
    shadowColor: "#2563EB", shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  submitBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18 },
  submitBtnText: { fontSize: 15, fontFamily: theme.fonts.bold, color: "#fff" },
});
