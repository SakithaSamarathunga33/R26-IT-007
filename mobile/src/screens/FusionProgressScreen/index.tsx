import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { theme } from "../../theme";
import KidBackground from "../../components/KidBackground";
import { playNextSound } from "../../services/kidSounds";
import { auth } from "../../config/firebase";
import {
  buildSpeechSummary,
  buildHandwritingSummary,
  buildBehaviorSummary,
} from "../../services/fusionService";
import { SPEECH_LEVELS } from "../../config/speechTasks";
import { HANDWRITING_LEVELS } from "../../config/handwritingTasks";
import { BEHAVIOR_LEVELS } from "../../config/behaviorTasks";
import { fetchLevelProgress } from "../../services/speechLevelService";
import { fetchHandwritingLevelProgress } from "../../services/handwritingLevelService";
import { fetchBehaviorLevelProgress } from "../../services/behaviorLevelService";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "FusionProgress">;
};

type ModuleStatus = "loading" | "ready" | "missing" | "partial" | "low_quality";

interface ModuleState {
  status: ModuleStatus;
  risk_probability?: number;
  reliability?: string;
  /** Levels finished / total, so a partial module can say how far along it is. */
  levelsDone?: number;
  levelsTotal?: number;
}

const MODULE_CONFIG = [
  { key: "speech",      label: "Speech",      sublabel: "Phonological",  icon: "ear-outline" as const,    color: "#2563EB", bg: "#EFF6FF", iconBg: "#DBEAFE" },
  { key: "handwriting", label: "Writing",     sublabel: "Handwriting",   icon: "pencil-outline" as const, color: "#7C3AED", bg: "#F5F3FF", iconBg: "#EDE9FE" },
  { key: "behaviour",   label: "Behaviour",   sublabel: "Attention",     icon: "happy-outline" as const,  color: "#0891B2", bg: "#ECFEFF", iconBg: "#CFFAFE" },
];

export default function FusionProgressScreen({ navigation }: Props) {
  const childId = auth.currentUser?.uid ?? "unknown";
  const sessionId = `session_${childId}`;

  const [modules, setModules] = useState<Record<string, ModuleState>>({
    speech: { status: "loading" },
    handwriting: { status: "loading" },
    behaviour: { status: "loading" },
  });
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkModules();
  }, []);

  async function checkModules() {
    setChecking(true);
    const [speech, handwriting, behavior, speechLv, handwritingLv, behaviorLv] =
      await Promise.allSettled([
        buildSpeechSummary(childId, sessionId),
        buildHandwritingSummary(childId, sessionId),
        buildBehaviorSummary(childId, sessionId),
        fetchLevelProgress(childId),
        fetchHandwritingLevelProgress(childId),
        fetchBehaviorLevelProgress(childId),
      ]);

    /**
     * A module is only ready when EVERY level has been completed. The summary
     * builders return data as soon as a single prediction exists, so relying on
     * them alone would mark a module ready after one level and let the fusion
     * analysis run on partial data.
     */
    const toState = (
      res: PromiseSettledResult<any>,
      lv: PromiseSettledResult<any>,
      totalLevels: number
    ): ModuleState => {
      const levelsDone = lv.status === "fulfilled" ? (lv.value?.completed?.length ?? 0) : 0;
      const base = { levelsDone, levelsTotal: totalLevels };

      if (res.status === "rejected" || !res.value) return { status: "missing", ...base };

      const v = res.value;
      const rel = v.quality?.prediction_reliability ?? "medium";

      if (levelsDone < totalLevels) {
        return { status: "partial", risk_probability: v.risk_probability, reliability: rel, ...base };
      }
      return {
        status: rel === "low" ? "low_quality" : "ready",
        risk_probability: v.risk_probability,
        reliability: rel,
        ...base,
      };
    };

    setModules({
      speech: toState(speech, speechLv, SPEECH_LEVELS.length),
      handwriting: toState(handwriting, handwritingLv, HANDWRITING_LEVELS.length),
      behaviour: toState(behavior, behaviorLv, BEHAVIOR_LEVELS.length),
    });
    setChecking(false);
  }

  const allReady = Object.values(modules).every(
    (m) => m.status === "ready" || m.status === "low_quality"
  );
  const anyMissing = Object.values(modules).some((m) => m.status === "missing");
  const anyPartial = Object.values(modules).some((m) => m.status === "partial");

  function statusIcon(status: ModuleStatus) {
    if (status === "loading") return <ActivityIndicator size="small" color="#94A3B8" />;
    if (status === "ready")   return <Ionicons name="checkmark-circle" size={22} color="#059669" />;
    if (status === "low_quality") return <Ionicons name="alert-circle" size={22} color="#D97706" />;
    if (status === "partial") return <Ionicons name="time" size={22} color="#D97706" />;
    return <Ionicons name="close-circle" size={22} color="#EF4444" />;
  }

  function statusLabel(state: ModuleState) {
    if (state.status === "loading")     return "Checking…";
    if (state.status === "ready")       return "Ready";
    if (state.status === "low_quality") return "Low quality";
    if (state.status === "partial")
      return `${state.levelsDone}/${state.levelsTotal} levels`;
    return "Not started";
  }

  function statusColor(status: ModuleStatus) {
    if (status === "ready")       return "#059669";
    if (status === "low_quality") return "#D97706";
    if (status === "partial")     return "#D97706";
    if (status === "missing")     return "#EF4444";
    return "#94A3B8";
  }

  return (
    <View style={styles.container}>
      <KidBackground variant="therapy" />
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Final Assessment</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={checkModules}>
          <Ionicons name="refresh" size={18} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <LinearGradient colors={["#1D4ED8", "#2563EB"]} style={styles.heroCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.decoCircleLg} />
          <View style={styles.decoCircleSm} />
          <View style={styles.heroIconWrap}>
            <Ionicons name="git-merge-outline" size={34} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>Multi-Modal Fusion</Text>
          <Text style={styles.heroSub}>
            All three modules — and every level inside them — must be completed before the final dyslexia risk analysis can run.
          </Text>
        </LinearGradient>

        {/* Module status cards */}
        <Text style={styles.sectionLabel}>Module Completion Status</Text>

        {MODULE_CONFIG.map((mod) => {
          const state = modules[mod.key];
          return (
            <View key={mod.key} style={styles.moduleCard}>
              <View style={[styles.moduleIconWrap, { backgroundColor: mod.iconBg }]}>
                <Ionicons name={mod.icon} size={20} color={mod.color} />
              </View>
              <View style={styles.moduleInfo}>
                <Text style={styles.moduleName}>{mod.label}</Text>
                <Text style={styles.moduleSub}>{mod.sublabel}</Text>
                {/* Only show a risk figure once the module is complete — a
                    percentage from one level would read as a trustworthy score. */}
                {state.risk_probability !== undefined && state.status !== "partial" && (
                  <Text style={[styles.moduleProb, { color: mod.color }]}>
                    Risk: {Math.round(state.risk_probability * 100)}%
                    {state.reliability ? `  ·  ${state.reliability} reliability` : ""}
                  </Text>
                )}
                {state.status === "partial" && (
                  <Text style={styles.moduleProbPartial}>
                    {state.levelsTotal! - state.levelsDone!} more level
                    {state.levelsTotal! - state.levelsDone! > 1 ? "s" : ""} to finish
                  </Text>
                )}
              </View>
              <View style={styles.moduleStatusWrap}>
                {statusIcon(state.status)}
                <Text style={[styles.moduleStatusText, { color: statusColor(state.status) }]}>
                  {statusLabel(state)}
                </Text>
              </View>
            </View>
          );
        })}

        {/* Warning for missing / partially finished modules */}
        {!checking && (anyMissing || anyPartial) && (
          <View style={styles.warningCard}>
            <Ionicons name="warning-outline" size={18} color="#D97706" />
            <Text style={styles.warningText}>
              {anyPartial && !anyMissing
                ? "Some modules have levels still to go. Every level must be completed before the final analysis can run."
                : "One or more modules are incomplete. Please finish all levels in every module before running the final analysis."}
            </Text>
          </View>
        )}

        {/* Low quality warning */}
        {!checking && !anyMissing && !anyPartial && Object.values(modules).some((m) => m.status === "low_quality") && (
          <View style={styles.cautionCard}>
            <Ionicons name="alert-circle-outline" size={18} color="#D97706" />
            <Text style={styles.cautionText}>
              Some modules have low prediction reliability. You may repeat those activities for a more accurate result, or continue with a reliability warning saved.
            </Text>
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
          <Text style={styles.disclaimerText}>
            This screening combines speech, handwriting, and behaviour results. It is{" "}
            <Text style={styles.disclaimerBold}>not a clinical diagnosis</Text>. Always consult a qualified professional.
          </Text>
        </View>

        <View style={{ height: 20 }} />

        {/* CTA */}
        {checking ? (
          <View style={styles.checkingRow}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.checkingText}>Verifying module outputs…</Text>
          </View>
        ) : (
          <LinearGradient
            colors={allReady ? ["#1D4ED8", "#2563EB"] : ["#E2E8F0", "#E2E8F0"]}
            style={styles.ctaBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <TouchableOpacity
              style={styles.ctaBtnInner}
              activeOpacity={allReady ? 0.85 : 1}
              disabled={!allReady}
              onPress={() => { playNextSound(); navigation.navigate("FusionLoading"); }}
            >
              <Ionicons
                name={allReady ? "analytics" : "lock-closed"}
                size={20}
                color={allReady ? "#fff" : "#94A3B8"}
              />
              <Text style={[styles.ctaBtnText, !allReady && styles.ctaBtnTextDisabled]}>
                {allReady ? "Run Final Analysis" : "Complete All Levels First"}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
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
  refreshBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#EFF6FF",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: "#1E293B" },
  content: { paddingHorizontal: 20, paddingTop: 8 },

  heroCard: {
    borderRadius: 24, padding: 28, alignItems: "center", marginBottom: 24,
    overflow: "hidden",
    shadowColor: "#2563EB", shadowOpacity: 0.3, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 10,
  },
  decoCircleLg: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.06)", top: -60, right: -40 },
  decoCircleSm: { position: "absolute", width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(255,255,255,0.05)", bottom: -30, left: 10 },
  heroIconWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  heroTitle: { fontSize: 22, fontFamily: theme.fonts.extraBold, color: "#fff", marginBottom: 8 },
  heroSub: { fontSize: 13, fontFamily: theme.fonts.regular, color: "rgba(255,255,255,0.8)", textAlign: "center", lineHeight: 20 },

  sectionLabel: { fontSize: 11, fontFamily: theme.fonts.semiBold, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10 },

  moduleCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 18, padding: 16, marginBottom: 10, gap: 14,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 2,
  },
  moduleIconWrap: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  moduleInfo: { flex: 1, gap: 2 },
  moduleName: { fontSize: 15, fontFamily: theme.fonts.semiBold, color: "#1E293B" },
  moduleSub: { fontSize: 11, fontFamily: theme.fonts.regular, color: "#94A3B8" },
  moduleProb: { fontSize: 11, fontFamily: theme.fonts.medium, marginTop: 2 },
  moduleProbPartial: { fontSize: 11, fontFamily: theme.fonts.medium, color: "#D97706", marginTop: 2 },
  moduleStatusWrap: { alignItems: "center", gap: 4 },
  moduleStatusText: { fontSize: 10, fontFamily: theme.fonts.semiBold, textTransform: "uppercase", letterSpacing: 0.4 },

  warningCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A",
    borderRadius: 16, padding: 14, marginBottom: 14,
  },
  warningText: { flex: 1, fontSize: 12, fontFamily: theme.fonts.regular, color: "#92400E", lineHeight: 18 },

  cautionCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FEF3C7",
    borderRadius: 16, padding: 14, marginBottom: 14,
  },
  cautionText: { flex: 1, fontSize: 12, fontFamily: theme.fonts.regular, color: "#92400E", lineHeight: 18 },

  disclaimerCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE",
    borderRadius: 16, padding: 14, marginBottom: 20,
  },
  disclaimerText: { flex: 1, fontSize: 12, fontFamily: theme.fonts.regular, color: "#3B72F6", lineHeight: 18 },
  disclaimerBold: { fontFamily: theme.fonts.semiBold, color: "#1E40AF" },

  checkingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18 },
  checkingText: { fontSize: 14, fontFamily: theme.fonts.medium, color: "#64748B" },

  ctaBtn: {
    borderRadius: 50,
    shadowColor: "#2563EB", shadowOpacity: 0.3, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  ctaBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18 },
  ctaBtnText: { fontSize: 16, fontFamily: theme.fonts.bold, color: "#fff" },
  ctaBtnTextDisabled: { color: "#94A3B8" },
});
