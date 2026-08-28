import React, { useState } from "react";
import {
  View, Text, StyleSheet, StatusBar, ScrollView, Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { auth, db } from "../../config/firebase";
import { HANDWRITING_TASKS } from "../../config/handwritingTasks";
import { getTimeOfDay } from "../../utils/behaviorFeatures";
import ScreenContainer from "../../components/common/ScreenContainer";
import ClayCard from "../../components/common/ClayCard";
import PrimaryButton from "../../components/common/PrimaryButton";
import SecondaryButton from "../../components/common/SecondaryButton";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "HandwritingReview">;
  route: RouteProp<RootStackParamList, "HandwritingReview">;
};

import { API_URLS } from "../../config/apiConfig";
const HANDWRITING_API = API_URLS.handwriting;
const HW_ACCENT: [string, string] = ["#FF9A8D", "#FF7A6B"];

export default function HandwritingReviewScreen({ navigation, route }: Props) {
  const { taskIndex, inputMode, capturedUri, strokesJson, retryCount, durationSec, practice } = route.params;
  // Practice runs come from a therapy plan — they must never write predictions,
  // or rehearsing would move the risk score the plan was based on.
  const isPractice = !!practice;
  const task = HANDWRITING_TASKS[taskIndex];
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
    <ScreenContainer>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>How did that look?</Text>

        <View style={styles.compare}>
          <ClayCard style={styles.compareCard} radius={24}>
            <Text style={styles.compareLabel}>Target</Text>
            <View style={styles.previewWell}>
              <Text style={styles.ghost}>{task.target_text}</Text>
            </View>
          </ClayCard>
          <ClayCard style={styles.compareCard} radius={24}>
            <Text style={[styles.compareLabel, styles.compareYou]}>You</Text>
            <View style={styles.previewWell}>
              {capturedUri ? (
                <Image source={{ uri: capturedUri }} style={styles.previewImage} resizeMode="contain" />
              ) : (
                <>
                  <Ionicons name="brush-outline" size={28} color={colors.textMuted} />
                  <Text style={styles.emptyText}>No image captured</Text>
                </>
              )}
            </View>
          </ClayCard>
        </View>

        <ClayCard style={styles.statRow} radius={18}>
          <View style={styles.checkDot}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
          <Text style={styles.statText}>
            {inputMode === "canvas"
              ? `${strokeCount} stroke${strokeCount !== 1 ? "s" : ""} · ${durationSec}s`
              : `Photo · ${durationSec}s`}
          </Text>
        </ClayCard>
        <ClayCard style={styles.statRow} radius={18}>
          <View style={[styles.checkDot, { backgroundColor: retryCount > 0 ? colors.gold : colors.mint }]}>
            <Text style={styles.checkMark}>{retryCount > 0 ? "~" : "✓"}</Text>
          </View>
          <Text style={styles.statText}>
            {retryCount > 0 ? `${retryCount} rewrite${retryCount !== 1 ? "s" : ""}` : "First try"}
          </Text>
        </ClayCard>
        <Text style={styles.warn}>
          Please check that the writing is clear before sending. Unclear images may affect the result.
        </Text>
      </ScrollView>

      <View style={styles.actions}>
        <PrimaryButton
          label="Send to Lexi"
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
          colors={HW_ACCENT}
        />
        <SecondaryButton
          label="Try again"
          onPress={handleRetake}
          disabled={submitting}
          textColor="#FF6B57"
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: "center", paddingTop: 18, paddingBottom: 16 },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 26,
    color: colors.text,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  compare: { flexDirection: "row", gap: 12, width: "100%", marginTop: 24 },
  compareCard: { flex: 1, padding: 16 },
  compareLabel: {
    fontFamily: fonts.extraBold,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 12,
    textAlign: "center",
  },
  compareYou: { color: "#FF6B57" },
  previewWell: {
    height: 150,
    borderRadius: 16,
    backgroundColor: "#FBFCFE",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  previewImage: { width: "100%", height: 150 },
  ghost: {
    fontFamily: fonts.regular,
    fontSize: 72,
    color: "#C3CDDC",
    lineHeight: 80,
  },
  emptyText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, marginTop: 6 },
  statRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 9,
  },
  checkDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: { fontFamily: fonts.extraBold, fontSize: 12, color: "#fff" },
  statText: { flex: 1, fontFamily: fonts.bold, fontSize: 13.5, color: colors.textBody, textAlign: "left" },
  warn: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 18,
  },
  actions: { width: "100%", gap: 12, marginBottom: 10 },
});
