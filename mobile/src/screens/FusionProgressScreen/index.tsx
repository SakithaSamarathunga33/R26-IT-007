import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, StatusBar, ScrollView, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
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
import ScreenContainer from "../../components/common/ScreenContainer";
import ActivityHeader from "../../components/common/ActivityHeader";
import ClayCard from "../../components/common/ClayCard";
import ClayIconButton from "../../components/common/ClayIconButton";
import PrimaryButton from "../../components/common/PrimaryButton";
import { colors, moduleColors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

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
  { key: "speech",      label: "Speech",      sublabel: "Phonological",  icon: "ear-outline" as const,    color: colors.brand, tint: moduleColors.speech.tint },
  { key: "handwriting", label: "Writing",     sublabel: "Handwriting",   icon: "pencil-outline" as const, color: colors.coral, tint: moduleColors.handwriting.tint },
  { key: "behaviour",   label: "Behaviour",   sublabel: "Attention",     icon: "happy-outline" as const,  color: colors.mint,  tint: moduleColors.behaviour.tint },
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

  function statusMark(status: ModuleStatus) {
    if (status === "loading") return <ActivityIndicator size="small" color={colors.textMuted} />;
    if (status === "ready") {
      return (
        <View style={[styles.check, { backgroundColor: colors.mint }]}>
          <Text style={styles.checkMark}>✓</Text>
        </View>
      );
    }
    if (status === "low_quality") {
      return (
        <View style={[styles.check, { backgroundColor: colors.gold }]}>
          <Ionicons name="alert" size={14} color="#fff" />
        </View>
      );
    }
    if (status === "partial") {
      return (
        <View style={[styles.check, { backgroundColor: colors.gold }]}>
          <Ionicons name="time" size={14} color="#fff" />
        </View>
      );
    }
    return (
      <View style={[styles.check, { backgroundColor: colors.coral }]}>
        <Ionicons name="close" size={14} color="#fff" />
      </View>
    );
  }

  function statusLabel(state: ModuleState) {
    if (state.status === "loading")     return "Checking…";
    if (state.status === "ready")       return "Ready";
    if (state.status === "low_quality") return "Low quality";
    if (state.status === "partial")
      return `${state.levelsDone}/${state.levelsTotal} levels`;
    return "Not started";
  }

  return (
    <ScreenContainer>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <ActivityHeader
        title="Combined report"
        subtitle="Final assessment"
        onBack={() => navigation.goBack()}
        right={
          <ClayIconButton
            icon="refresh"
            onPress={checkModules}
            accessibilityLabel="Refresh module status"
          />
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heroTitle}>
          {allReady ? "All three games are in" : "Finish every game first"}
        </Text>
        <Text style={styles.heroSub}>
          All three modules — and every level inside them — must be completed before the final dyslexia risk analysis can run. Lexi weighs the three signals together. One weak area alone rarely changes the outcome.
        </Text>

        {MODULE_CONFIG.map((mod) => {
          const state = modules[mod.key];
          return (
            <ClayCard key={mod.key} style={styles.moduleCard} radius={22}>
              <View style={[styles.moduleIcon, { backgroundColor: mod.tint }]}>
                <Ionicons name={mod.icon} size={21} color={mod.color} />
              </View>
              <View style={styles.moduleInfo}>
                <Text style={styles.moduleName}>{mod.label}</Text>
                <Text style={styles.moduleSub}>
                  {mod.sublabel}
                  {state.levelsDone != null && state.levelsTotal != null
                    ? ` · ${state.levelsDone}/${state.levelsTotal} levels`
                    : ""}
                </Text>
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
                <Text style={styles.statusCaption}>{statusLabel(state)}</Text>
              </View>
              {statusMark(state.status)}
            </ClayCard>
          );
        })}

        {!checking && (anyMissing || anyPartial) && (
          <ClayCard inset style={styles.noteCard} radius={20}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
            <Text style={styles.noteText}>
              {anyPartial && !anyMissing
                ? "Some modules have levels still to go. Every level must be completed before the final analysis can run."
                : "One or more modules are incomplete. Please finish all levels in every module before running the final analysis."}
            </Text>
          </ClayCard>
        )}

        {!checking && !anyMissing && !anyPartial && Object.values(modules).some((m) => m.status === "low_quality") && (
          <ClayCard inset style={styles.noteCard} radius={20}>
            <Ionicons name="alert-circle-outline" size={18} color={"#B0791A"} />
            <Text style={styles.noteText}>
              Some modules have low prediction reliability. You may repeat those activities for a more accurate result, or continue with a reliability warning saved.
            </Text>
          </ClayCard>
        )}

        <ClayCard inset style={styles.noteCard} radius={20}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <Text style={styles.noteText}>
            This screening combines speech, handwriting, and behaviour results. It is{" "}
            <Text style={styles.noteBold}>not a clinical diagnosis</Text>. Always consult a qualified professional. Reports are behind the parent gate. Your child will not see risk wording or scores.
          </Text>
        </ClayCard>

        {checking ? (
          <View style={styles.checkingRow}>
            <ActivityIndicator size="small" color={colors.brand} />
            <Text style={styles.checkingText}>Verifying module outputs…</Text>
          </View>
        ) : (
          <PrimaryButton
            label={allReady ? "Run Final Analysis" : "Complete All Levels First"}
            onPress={() => navigation.navigate("FusionLoading")}
            disabled={!allReady}
          />
        )}
        <View style={{ height: 28 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 18, paddingBottom: 8, gap: 12 },
  heroTitle: { fontFamily: fonts.extraBold, fontSize: 24, color: colors.text, letterSpacing: -0.4, lineHeight: 30 },
  heroSub: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginBottom: 4 },

  moduleCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  moduleIcon: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  moduleInfo: { flex: 1, gap: 2 },
  moduleName: { fontFamily: fonts.extraBold, fontSize: 15, color: colors.text },
  moduleSub: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.textMuted },
  moduleProb: { fontFamily: fonts.medium, fontSize: 11, marginTop: 2 },
  moduleProbPartial: { fontFamily: fonts.medium, fontSize: 11, color: "#B0791A", marginTop: 2 },
  statusCaption: { fontFamily: fonts.semiBold, fontSize: 10, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.4, marginTop: 2 },
  check: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  checkMark: { fontFamily: fonts.extraBold, fontSize: 13, color: "#fff" },

  noteCard: { flexDirection: "row", alignItems: "flex-start", gap: 11, padding: 16 },
  noteText: { flex: 1, fontFamily: fonts.semiBold, fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  noteBold: { fontFamily: fonts.bold, color: colors.text },

  checkingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18 },
  checkingText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textSecondary },
});
