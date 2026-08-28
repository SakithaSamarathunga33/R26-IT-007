import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { theme } from "../../theme";
import KidBackground from "../../components/KidBackground";
import { playNextSound } from "../../services/kidSounds";
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

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "FusionTherapy">;
  route: RouteProp<RootStackParamList, "FusionTherapy">;
};

const INTENSITY_CONFIG = {
  light:     { label: "Light",     color: "#059669", bg: "#ECFDF5", border: "#BBF7D0" },
  moderate:  { label: "Moderate",  color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  intensive: { label: "Intensive", color: "#EF4444", bg: "#FFF5F5", border: "#FECACA" },
};

const DIFFICULTY_COLORS: Record<string, { color: string; bg: string; iconBg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  phonological_processing: { color: "#2563EB", bg: "#EFF6FF", iconBg: "#DBEAFE", icon: "ear-outline" },
  handwriting:             { color: "#7C3AED", bg: "#F5F3FF", iconBg: "#EDE9FE", icon: "pencil-outline" },
  attention_behavior:      { color: "#0891B2", bg: "#ECFEFF", iconBg: "#CFFAFE", icon: "happy-outline" },
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
    playNextSound();
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
    <View style={styles.container}>
      <KidBackground variant="therapy" />
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Therapy Plan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Plan overview */}
        <LinearGradient colors={["#1D4ED8", "#2563EB"]} style={styles.planCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.decoCircleLg} />
          <View style={styles.decoCircleSm} />
          <View style={styles.planIconWrap}>
            <Ionicons name="fitness-outline" size={32} color="#fff" />
          </View>
          <Text style={styles.planTitle}>Personalised Practice Plan</Text>
          <Text style={styles.planFocus}>{therapy.primary_focus}</Text>

          <View style={styles.planStatsRow}>
            <View style={[styles.planStat, styles.planStatBorder]}>
              <Text style={styles.planStatVal}>{therapy.recommended_sessions_per_week}</Text>
              <Text style={styles.planStatLabel}>Sessions{"\n"}/ Week</Text>
            </View>
            <View style={[styles.planStat, styles.planStatBorder]}>
              <Text style={styles.planStatVal}>{(therapy.recommended_activities ?? []).length}</Text>
              <Text style={styles.planStatLabel}>Activities</Text>
            </View>
            <View style={styles.planStat}>
              <View style={[styles.intensityBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                <Text style={styles.intensityBadgeText}>{intensityCfg.label}</Text>
              </View>
              <Text style={styles.planStatLabel}>Intensity</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Primary focus badge */}
        <View style={[styles.focusBadgeCard, { backgroundColor: primaryDifficultyCfg.bg, borderColor: primaryDifficultyCfg.iconBg }]}>
          <View style={[styles.focusBadgeIcon, { backgroundColor: primaryDifficultyCfg.iconBg }]}>
            <Ionicons name={primaryDifficultyCfg.icon} size={18} color={primaryDifficultyCfg.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.focusBadgeLabel, { color: primaryDifficultyCfg.color }]}>Primary Focus Area</Text>
            <Text style={styles.focusBadgeText}>{therapy.primary_focus}</Text>
          </View>
          <View style={[styles.intensityPill, { backgroundColor: intensityCfg.bg, borderColor: intensityCfg.border }]}>
            <Text style={[styles.intensityPillText, { color: intensityCfg.color }]}>{intensityCfg.label}</Text>
          </View>
        </View>

        {/* Practice progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressTop}>
            <View style={[styles.progressIconWrap, { backgroundColor: planComplete ? "#ECFDF5" : primaryDifficultyCfg.iconBg }]}>
              <Ionicons
                name={planComplete ? "checkmark-done" : "barbell-outline"}
                size={18}
                color={planComplete ? "#059669" : primaryDifficultyCfg.color}
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
              <Text style={[styles.progressPct, { color: planComplete ? "#059669" : primaryDifficultyCfg.color }]}>
                {Math.round((doneCount / target) * 100)}%
              </Text>
            ) : (
              <ActivityIndicator size="small" color="#94A3B8" />
            )}
          </View>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={planComplete ? ["#10B981", "#059669"] : ["#3B72F6", "#2563EB"]}
              style={[styles.progressFill, { width: `${Math.min(100, (doneCount / target) * 100)}%` }]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            />
          </View>
        </View>

        {/* Activity list */}
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
              style={styles.activityCard}
              onPress={() => setExpandedActivity(isExpanded ? null : i)}
            >
              <View style={styles.activityHeader}>
                <View style={[styles.activityNum, { backgroundColor: primaryDifficultyCfg.iconBg }]}>
                  <Text style={[styles.activityNumText, { color: primaryDifficultyCfg.color }]}>{i + 1}</Text>
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>{act.title}</Text>
                  <View style={styles.activityMeta}>
                    <View style={styles.activityMetaItem}>
                      <Ionicons name="time-outline" size={12} color="#94A3B8" />
                      <Text style={styles.activityMetaText}>{act.duration_minutes} min</Text>
                    </View>
                    <View style={styles.activityMetaDot} />
                    <Text style={styles.activitySkill}>{(act.target_skill ?? "").replace(/_/g, " ")}</Text>
                  </View>
                </View>
                {done > 0 && (
                  <View style={styles.doneCountChip}>
                    <Ionicons name="checkmark" size={11} color="#059669" />
                    <Text style={styles.doneCountText}>{done}×</Text>
                  </View>
                )}
                <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color="#94A3B8" />
              </View>

              {isExpanded && (
                <View style={styles.activityBody}>
                  <Text style={styles.activityDesc}>{act.description}</Text>
                  {playable ? (
                    <TouchableOpacity
                      style={[styles.startActivityBtn, { backgroundColor: primaryDifficultyCfg.bg }]}
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
                      <Ionicons name="home-outline" size={14} color="#64748B" />
                      <Text style={styles.offlineActivityText}>Practise this one together offline.</Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Secondary recommendation */}
        {secondaryActivity && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 24, marginBottom: 12 }]}>Secondary Support</Text>
            {(() => {
              const secCfg = DIFFICULTY_COLORS[secondaryActivity.difficulty_label] ?? DIFFICULTY_COLORS.phonological_processing;
              const secAct = secondaryActivity.suggested_activity;
              return (
                <View style={[styles.secondaryCard, { borderColor: secCfg.color + "30" }]}>
                  <View style={[styles.secondaryIconWrap, { backgroundColor: secCfg.iconBg }]}>
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
                </View>
              );
            })()}
          </>
        )}

        {/* Safety note */}
        {therapy.safety_note && (
          <View style={styles.safetyCard}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#059669" />
            <Text style={styles.safetyText}>{therapy.safety_note}</Text>
          </View>
        )}

        <View style={{ height: 16 }} />

        <LinearGradient colors={["#1D4ED8", "#2563EB"]} style={styles.reportBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <TouchableOpacity
            style={styles.reportBtnInner}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("FusionReport", { response })}
          >
            <Ionicons name="document-text-outline" size={20} color="#fff" />
            <Text style={styles.reportBtnText}>View Full Report</Text>
          </TouchableOpacity>
        </LinearGradient>

        <TouchableOpacity
          style={styles.homeBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("MainTabs")}
        >
          <Ionicons name="home-outline" size={18} color="#64748B" />
          <Text style={styles.homeBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>

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
  content: { paddingHorizontal: 20, paddingTop: 8 },

  planCard: {
    borderRadius: 24, padding: 24, alignItems: "center", marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#2563EB", shadowOpacity: 0.3, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 10,
  },
  decoCircleLg: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.06)", top: -60, right: -40 },
  decoCircleSm: { position: "absolute", width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(255,255,255,0.04)", bottom: -30, left: 10 },
  planIconWrap: {
    width: 66, height: 66, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  planTitle: { fontSize: 20, fontFamily: theme.fonts.extraBold, color: "#fff", marginBottom: 4 },
  planFocus: { fontSize: 13, fontFamily: theme.fonts.regular, color: "rgba(255,255,255,0.8)", marginBottom: 18, textAlign: "center" },
  planStatsRow: {
    flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", width: "100%",
  },
  planStat: { flex: 1, alignItems: "center", paddingVertical: 12 },
  planStatBorder: { borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.2)" },
  planStatVal: { fontSize: 22, fontFamily: theme.fonts.extraBold, color: "#fff" },
  planStatLabel: { fontSize: 10, fontFamily: theme.fonts.medium, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: 0.4, textAlign: "center", marginTop: 2 },
  intensityBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  intensityBadgeText: { fontSize: 12, fontFamily: theme.fonts.semiBold, color: "#fff" },

  focusBadgeCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 20,
  },
  focusBadgeIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  focusBadgeLabel: { fontSize: 10, fontFamily: theme.fonts.semiBold, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  focusBadgeText: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: "#1E293B" },
  intensityPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  intensityPillText: { fontSize: 11, fontFamily: theme.fonts.semiBold },

  progressCard: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 18, padding: 16, marginBottom: 20,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 2,
  },
  progressTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  progressIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  progressTitle: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: "#1E293B", marginBottom: 2 },
  progressSub: { fontSize: 12, fontFamily: theme.fonts.regular, color: "#94A3B8" },
  progressPct: { fontSize: 18, fontFamily: theme.fonts.extraBold },
  progressTrack: { height: 6, backgroundColor: "#E2E8F0", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },

  doneCountChip: {
    flexDirection: "row", alignItems: "center", gap: 2,
    backgroundColor: "#ECFDF5", borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3,
  },
  doneCountText: { fontSize: 10, fontFamily: theme.fonts.bold, color: "#059669" },

  offlineActivityNote: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#F8FAFC", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12,
  },
  offlineActivityText: { fontSize: 12, fontFamily: theme.fonts.medium, color: "#64748B" },

  abandonBtn: { paddingVertical: 14, alignItems: "center" },
  abandonBtnText: { fontSize: 13, fontFamily: theme.fonts.medium, color: "#94A3B8", textDecorationLine: "underline" },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontFamily: theme.fonts.semiBold, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1.2 },
  sectionBadge: { backgroundColor: "#EFF6FF", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  sectionBadgeText: { fontSize: 10, fontFamily: theme.fonts.semiBold, color: "#2563EB" },

  activityCard: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 18, marginBottom: 10, overflow: "hidden",
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 2,
  },
  activityHeader: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  activityNum: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  activityNumText: { fontSize: 14, fontFamily: theme.fonts.bold },
  activityInfo: { flex: 1 },
  activityTitle: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: "#1E293B", marginBottom: 4 },
  activityMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  activityMetaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  activityMetaText: { fontSize: 11, fontFamily: theme.fonts.regular, color: "#94A3B8" },
  activityMetaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#CBD5E1" },
  activitySkill: { fontSize: 11, fontFamily: theme.fonts.medium, color: "#64748B", textTransform: "capitalize" },
  activityBody: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 12 },
  activityDesc: { fontSize: 13, fontFamily: theme.fonts.regular, color: "#64748B", lineHeight: 20, marginBottom: 12 },
  startActivityBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderRadius: 12, paddingVertical: 10,
  },
  startActivityBtnText: { fontSize: 13, fontFamily: theme.fonts.semiBold },

  secondaryCard: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#fff", borderWidth: 1.5, borderRadius: 18, padding: 20, marginBottom: 24, gap: 14,
    shadowColor: "#94A3B8", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 2,
  },
  secondaryIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  secondaryInfo: { flex: 1 },
  secondaryFocus: { fontSize: 11, fontFamily: theme.fonts.semiBold, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  secondaryActTitle: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: "#1E293B", marginBottom: 8 },
  secondaryActDesc: { fontSize: 13, fontFamily: theme.fonts.regular, color: "#64748B", lineHeight: 20 },

  safetyCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#BBF7D0",
    borderRadius: 16, padding: 14, marginBottom: 20, marginTop: 4,
  },
  safetyText: { flex: 1, fontSize: 12, fontFamily: theme.fonts.regular, color: "#065F46", lineHeight: 18 },

  reportBtn: {
    borderRadius: 50, marginBottom: 12,
    shadowColor: "#2563EB", shadowOpacity: 0.3, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  reportBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18 },
  reportBtnText: { fontSize: 16, fontFamily: theme.fonts.bold, color: "#fff" },

  homeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 16, borderRadius: 50,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E2E8F0",
    shadowColor: "#94A3B8", shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  homeBtnText: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: "#64748B" },
});
