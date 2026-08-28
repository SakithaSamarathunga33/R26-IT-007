import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { auth } from "../../config/firebase";
import { resolveTherapyActivity } from "../../config/therapyActivityMap";
import {
  TherapyProgress,
  abandonTherapyPlan,
  fetchActiveTherapyPlan,
  fetchTherapyProgress,
  recordTherapySession,
  sessionsFor,
} from "../../services/therapySessionService";
import ScreenContainer from "../../components/common/ScreenContainer";
import ActivityHeader from "../../components/common/ActivityHeader";
import ClayCard from "../../components/common/ClayCard";
import PrimaryButton from "../../components/common/PrimaryButton";
import SecondaryButton from "../../components/common/SecondaryButton";
import ProgressTrack from "../../components/common/ProgressTrack";
import { colors, moduleColors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "FusionTherapy">;
  route: RouteProp<RootStackParamList, "FusionTherapy">;
};

const INTENSITY_CONFIG = {
  light:     { label: "Light",     color: colors.mint, bg: colors.mintTint },
  moderate:  { label: "Moderate",  color: "#C98910", bg: "#FFF4D6" },
  intensive: { label: "Intensive", color: colors.coralText, bg: colors.coralTint },
};

const DIFFICULTY_COLORS: Record<string, { color: string; tint: string; icon: keyof typeof Ionicons.glyphMap }> = {
  phonological_processing: { color: colors.brand, tint: moduleColors.speech.tint, icon: "ear-outline" },
  handwriting:             { color: colors.coral, tint: moduleColors.handwriting.tint, icon: "pencil-outline" },
  attention_behavior:      { color: colors.mint,  tint: moduleColors.behaviour.tint, icon: "happy-outline" },
};

export default function FusionTherapyScreen({ navigation, route }: Props) {
  const { response, reportId: reportIdParam, completedActivityId } = route.params;
  const therapy = response.therapy_recommendation ?? {};
  const [expandedActivity, setExpandedActivity] = useState<number | null>(null);

  const intensityCfg = INTENSITY_CONFIG[(therapy.recommendation_intensity as keyof typeof INTENSITY_CONFIG)] ?? INTENSITY_CONFIG.light;
  const primaryDifficultyCfg = DIFFICULTY_COLORS[therapy.recommended_primary_difficulty] ?? DIFFICULTY_COLORS.phonological_processing;
  const secondaryActivity = therapy.secondary_recommendation;

  const activities: any[] = therapy.recommended_activities ?? [];
  // The plan asks for each activity to be repeated `sessions_per_week` times.
  const target = sessionsFor(activities.length, Number(therapy.recommended_sessions_per_week) || 1);
  const [progress, setProgress] = useState<TherapyProgress | null>(null);
  // Resolved once: the history doc id this plan belongs to. Threaded onward so
  // practice runs return here with the same identity.
  const [reportId, setReportId] = useState<string | null>(reportIdParam ?? null);
  const [saving, setSaving] = useState(false);
  const recordedRef = useRef<string | null>(null);

  // Load progress, then bank the session the child just finished (once).
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setProgress({ reportId: null, completed: [], target, state: "in_progress" }); return; }

    let active = true;
    (async () => {
      // Arriving straight from the analysis, no id was passed — look up the
      // newest report, which is the one that just produced this plan.
      let id = reportIdParam ?? null;
      if (!id) {
        const plan = await fetchActiveTherapyPlan(uid);
        id = plan?.reportId ?? null;
      }
      if (!active) return;
      setReportId(id);

      const loaded = await fetchTherapyProgress(uid, id, target);
      if (!active) return;

      if (completedActivityId && recordedRef.current !== completedActivityId) {
        recordedRef.current = completedActivityId;
        try {
          const next = await recordTherapySession(uid, loaded, completedActivityId);
          if (active) setProgress(next);
          return;
        } catch (err: any) {
          console.warn("[Therapy] could not save session:", err?.message);
          Alert.alert("Not saved", "That practice session could not be saved. Please try again.");
        }
      }
      setProgress(loaded);
    })();
    return () => { active = false; };
  }, [completedActivityId, reportIdParam, target]);

  const doneCount = progress?.completed.length ?? 0;
  const planComplete = !!progress && doneCount >= target;

  /** How many times this specific activity has been practised. */
  const timesDone = (activityId: string) =>
    progress?.completed.filter((id) => id === activityId).length ?? 0;

  const startActivity = (activityId: string) => {
    const resolved = resolveTherapyActivity(activityId);
    if (!resolved) return;
    const [first, ...rest] = resolved.taskIndices;
    const practice = { activityId, remaining: rest, response, reportId };

    if (resolved.module === "speech") {
      navigation.navigate("SpeechActivity", { taskIndex: first, practice });
    } else if (resolved.module === "handwriting") {
      navigation.navigate("HandwritingTask", { taskIndex: first, practice });
    } else {
      navigation.navigate("BehaviorActivity", { taskIndex: first, practice });
    }
  };

  const handleAbandon = () => {
    Alert.alert(
      "Start a new screening?",
      `You have completed ${doneCount} of ${target} practice sessions. Starting a new screening will end this plan and your progress will be lost.`,
      [
        { text: "Keep practising", style: "cancel" },
        {
          text: "End plan",
          style: "destructive",
          onPress: async () => {
            const uid = auth.currentUser?.uid;
            if (!uid || !progress) return;
            setSaving(true);
            try {
              const next = await abandonTherapyPlan(uid, progress);
              setProgress(next);
              navigation.navigate("MainTabs");
            } catch (err: any) {
              Alert.alert("Could not end plan", err?.message ?? "Please try again.");
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <ActivityHeader
        title="Two-week plan"
        subtitle="Therapy plan"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ClayCard style={styles.planCard} radius={24}>
          <View style={[styles.planIcon, { backgroundColor: colors.brandTint }]}>
            <Ionicons name="fitness-outline" size={26} color={colors.brand} />
          </View>
          <Text style={styles.planTitle}>Personalised Practice Plan</Text>
          <Text style={styles.planFocus}>{therapy.primary_focus}</Text>
          <View style={styles.planStatsRow}>
            <View style={styles.planStat}>
              <Text style={styles.planStatVal}>{therapy.recommended_sessions_per_week}</Text>
              <Text style={styles.planStatLabel}>Sessions / Week</Text>
            </View>
            <View style={styles.planStat}>
              <Text style={styles.planStatVal}>{(therapy.recommended_activities ?? []).length}</Text>
              <Text style={styles.planStatLabel}>Activities</Text>
            </View>
            <View style={styles.planStat}>
              <View style={[styles.intensityBadge, { backgroundColor: intensityCfg.bg }]}>
                <Text style={[styles.intensityBadgeText, { color: intensityCfg.color }]}>{intensityCfg.label}</Text>
              </View>
              <Text style={styles.planStatLabel}>Intensity</Text>
            </View>
          </View>
        </ClayCard>

        <ClayCard style={styles.focusCard} radius={18}>
          <View style={[styles.focusIcon, { backgroundColor: primaryDifficultyCfg.tint }]}>
            <Ionicons name={primaryDifficultyCfg.icon} size={18} color={primaryDifficultyCfg.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.focusLabel, { color: primaryDifficultyCfg.color }]}>Primary Focus Area</Text>
            <Text style={styles.focusText}>{therapy.primary_focus}</Text>
          </View>
          <View style={[styles.intensityBadge, { backgroundColor: intensityCfg.bg }]}>
            <Text style={[styles.intensityBadgeText, { color: intensityCfg.color }]}>{intensityCfg.label}</Text>
          </View>
        </ClayCard>

        <ClayCard style={styles.progressCard} radius={18}>
          <View style={styles.progressTop}>
            <View style={[styles.progressIcon, { backgroundColor: planComplete ? colors.mintTint : primaryDifficultyCfg.tint }]}>
              <Ionicons
                name={planComplete ? "checkmark-done" : "barbell-outline"}
                size={18}
                color={planComplete ? colors.mint : primaryDifficultyCfg.color}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.progressTitle}>
                {planComplete ? "Plan complete!" : "Practice Progress"}
              </Text>
              <Text style={styles.progressSub}>
                {progress
                  ? planComplete
                    ? "You can start a new screening now."
                    : `${doneCount} of ${target} sessions done`
                  : "Loading…"}
              </Text>
            </View>
            {progress ? (
              <Text style={[styles.progressPct, { color: planComplete ? colors.mint : primaryDifficultyCfg.color }]}>
                {Math.round((doneCount / target) * 100)}%
              </Text>
            ) : (
              <ActivityIndicator size="small" color={colors.textMuted} />
            )}
          </View>
          <ProgressTrack
            progress={Math.min(1, doneCount / target)}
            colors={planComplete ? ["#4ED9AC", colors.mint] : [colors.brandSoft, colors.brand]}
          />
        </ClayCard>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Recommended Activities</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{activities.length} activities</Text>
          </View>
        </View>

        {activities.map((act: any, i: number) => {
          const isExpanded = expandedActivity === i;
          const activityId = act.activity_id ?? "";
          const playable = !!resolveTherapyActivity(activityId);
          const done = timesDone(activityId);
          return (
            <TouchableOpacity
              key={act.activity_id ?? i}
              activeOpacity={0.85}
              onPress={() => setExpandedActivity(isExpanded ? null : i)}
            >
              <ClayCard style={styles.activityCard} radius={22}>
                <View style={styles.activityHeader}>
                  <View style={[styles.activityNum, { backgroundColor: primaryDifficultyCfg.tint }]}>
                    <Text style={[styles.activityNumText, { color: primaryDifficultyCfg.color }]}>{i + 1}</Text>
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle}>{act.title}</Text>
                    <View style={styles.activityMeta}>
                      <View style={styles.activityMetaItem}>
                        <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                        <Text style={styles.activityMetaText}>{act.duration_minutes} min</Text>
                      </View>
                      <View style={styles.activityMetaDot} />
                      <Text style={styles.activitySkill}>{(act.target_skill ?? "").replace(/_/g, " ")}</Text>
                    </View>
                  </View>
                  {done > 0 && (
                    <View style={styles.doneCountChip}>
                      <Ionicons name="checkmark" size={11} color={colors.mint} />
                      <Text style={styles.doneCountText}>{done}×</Text>
                    </View>
                  )}
                  <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
                </View>

                {isExpanded && (
                  <View style={styles.activityBody}>
                    <Text style={styles.activityDesc}>{act.description}</Text>
                    {playable ? (
                      <TouchableOpacity
                        style={[styles.startActivityBtn, { backgroundColor: primaryDifficultyCfg.tint }]}
                        activeOpacity={0.85}
                        onPress={() => startActivity(activityId)}
                      >
                        <Ionicons name="play-circle-outline" size={16} color={primaryDifficultyCfg.color} />
                        <Text style={[styles.startActivityBtnText, { color: primaryDifficultyCfg.color }]}>
                          {done > 0 ? "Practise Again" : "Start Activity"}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      // No in-app equivalent for this activity id — say so rather
                      // than showing a button that goes nowhere.
                      <View style={styles.offlineActivityNote}>
                        <Ionicons name="home-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.offlineActivityText}>Practise this one together offline.</Text>
                      </View>
                    )}
                  </View>
                )}
              </ClayCard>
            </TouchableOpacity>
          );
        })}

        {secondaryActivity && (
          <>
            <Text style={styles.sectionLabel}>Secondary Support</Text>
            {(() => {
              const secCfg = DIFFICULTY_COLORS[secondaryActivity.difficulty_label] ?? DIFFICULTY_COLORS.phonological_processing;
              const secAct = secondaryActivity.suggested_activity;
              return (
                <ClayCard style={styles.secondaryCard} radius={18}>
                  <View style={[styles.focusIcon, { backgroundColor: secCfg.tint }]}>
                    <Ionicons name={secCfg.icon} size={18} color={secCfg.color} />
                  </View>
                  <View style={styles.secondaryInfo}>
                    <Text style={[styles.secondaryFocus, { color: secCfg.color }]}>{secondaryActivity.primary_focus}</Text>
                    {secAct && (
                      <>
                        <Text style={styles.secondaryActTitle}>{secAct.title}</Text>
                        <Text style={styles.secondaryActDesc}>{secAct.description}</Text>
                      </>
                    )}
                  </View>
                </ClayCard>
              );
            })()}
          </>
        )}

        {therapy.safety_note && (
          <ClayCard inset style={styles.safetyCard} radius={16}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.mint} />
            <Text style={styles.safetyText}>{therapy.safety_note}</Text>
          </ClayCard>
        )}

        <PrimaryButton
          label="View Full Report"
          onPress={() => navigation.navigate("FusionReport", { response })}
        />
        <SecondaryButton
          label="Back to Dashboard"
          textColor={colors.textSecondary}
          onPress={() => navigation.navigate("MainTabs")}
        />

        {/* Escape hatch — a family that abandons a plan must not be stuck for good */}
        {!planComplete && progress && (
          <TouchableOpacity
            style={styles.abandonBtn}
            activeOpacity={0.7}
            onPress={handleAbandon}
            disabled={saving}
          >
            <Text style={styles.abandonBtnText}>End plan and start a new screening</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 28 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 16, paddingBottom: 8, gap: 12 },

  planCard: { alignItems: "center", padding: 22 },
  planIcon: { width: 56, height: 56, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  planTitle: { fontFamily: fonts.extraBold, fontSize: 20, color: colors.text, marginBottom: 4 },
  planFocus: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, marginBottom: 16, textAlign: "center" },
  planStatsRow: { flexDirection: "row", width: "100%", backgroundColor: colors.bgInset, borderRadius: 16 },
  planStat: { flex: 1, alignItems: "center", paddingVertical: 12 },
  planStatVal: { fontFamily: fonts.extraBold, fontSize: 22, color: colors.text },
  planStatLabel: { fontFamily: fonts.medium, fontSize: 10, color: colors.textMuted, textTransform: "uppercase", textAlign: "center", marginTop: 2 },
  intensityBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  intensityBadgeText: { fontFamily: fonts.semiBold, fontSize: 12 },

  focusCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  focusIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  focusLabel: { fontFamily: fonts.semiBold, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  focusText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text },

  progressCard: { padding: 16, gap: 12 },
  progressTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  progressIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  progressTitle: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text, marginBottom: 2 },
  progressSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  progressPct: { fontFamily: fonts.extraBold, fontSize: 18 },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  sectionLabel: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.2 },
  sectionBadge: { backgroundColor: colors.brandTint, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  sectionBadgeText: { fontFamily: fonts.semiBold, fontSize: 10, color: colors.brand },

  activityCard: { padding: 0, overflow: "hidden" },
  activityHeader: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  activityNum: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  activityNumText: { fontFamily: fonts.bold, fontSize: 14 },
  activityInfo: { flex: 1 },
  activityTitle: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text, marginBottom: 4 },
  activityMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  activityMetaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  activityMetaText: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  activityMetaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.textInactive },
  activitySkill: { fontFamily: fonts.medium, fontSize: 11, color: colors.textSecondary, textTransform: "capitalize" },
  activityBody: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: colors.tabLine, paddingTop: 12 },
  activityDesc: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  startActivityBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderRadius: 12, paddingVertical: 10,
  },
  startActivityBtnText: { fontFamily: fonts.semiBold, fontSize: 13 },

  doneCountChip: {
    flexDirection: "row", alignItems: "center", gap: 2,
    backgroundColor: colors.mintTint, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3,
  },
  doneCountText: { fontFamily: fonts.bold, fontSize: 10, color: colors.mint },

  offlineActivityNote: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.bgInset, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12,
  },
  offlineActivityText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSecondary },

  secondaryCard: { flexDirection: "row", alignItems: "flex-start", gap: 14, padding: 20 },
  secondaryInfo: { flex: 1 },
  secondaryFocus: { fontFamily: fonts.semiBold, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  secondaryActTitle: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text, marginBottom: 8 },
  secondaryActDesc: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },

  safetyCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14 },
  safetyText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.textBody, lineHeight: 18 },

  abandonBtn: { paddingVertical: 14, alignItems: "center" },
  abandonBtnText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted, textDecorationLine: "underline" },
});
