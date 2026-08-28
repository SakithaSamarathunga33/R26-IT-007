import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { theme } from "../../theme";
import KidBackground from "../../components/KidBackground";
import { playNextSound } from "../../services/kidSounds";
import {
  HANDWRITING_TASKS, HANDWRITING_TASK_TYPE_LABELS, HANDWRITING_TASK_COLORS,
  HANDWRITING_LEVELS, HandwritingLevel, HandwritingLevelId,
  HandwritingTaskType, handwritingLevelTaskCount,
} from "../../config/handwritingTasks";
import { auth } from "../../config/firebase";
import { markModuleDone } from "../../services/sessionService";
import { fetchModuleSummary, ModuleSummary, RiskLevel, SummaryRow } from "../../services/summaryService";
import { HandwritingLevelProgress, fetchHandwritingLevelProgress } from "../../services/handwritingLevelService";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "HandwritingSummary">;
};

const RISK_COLORS = { low: "#059669", medium: "#D97706", high: "#EF4444", requires_review: "#64748B" };
const RISK_BG     = { low: "#ECFDF5", medium: "#FFFBEB", high: "#FFF5F5", requires_review: "#F8FAFC" };
const RISK_BORDER = { low: "#BBF7D0", medium: "#FDE68A", high: "#FECACA", requires_review: "#E2E8F0" };

const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const OVERALL_CONFIG = {
  low:             { label: "Low Risk Indicators",   sublabel: "Handwriting patterns within typical range.",                   icon: "checkmark-circle" as const, gradColors: ["#059669", "#047857"] as [string,string] },
  medium:          { label: "Moderate Indicators",   sublabel: "Some handwriting patterns noted. A review may help.",          icon: "alert-circle" as const,    gradColors: ["#F59E0B", "#D97706"] as [string,string] },
  high:            { label: "Elevated Indicators",   sublabel: "Multiple patterns noted. Specialist evaluation recommended.",  icon: "warning" as const,          gradColors: ["#EF4444", "#DC2626"] as [string,string] },
  requires_review: { label: "Review Required",       sublabel: "Some activities had incomplete data.",                         icon: "refresh-circle" as const,   gradColors: ["#94A3B8", "#64748B"] as [string,string] },
};

type BreakdownItem = {
  row: SummaryRow;
  text: string | null;
  typeLabel: string;
  taskType: HandwritingTaskType | null;
  key: string;
};
type LevelGroup = { level: HandwritingLevel; items: BreakdownItem[] };

/**
 * Buckets prediction rows into their levels. Rows written by the current app
 * carry `level`/`target_text` directly; older rows only have their arrival
 * order, so those fall back to positional mapping onto HANDWRITING_TASKS.
 */
function groupRowsByLevel(rows: SummaryRow[]): LevelGroup[] {
  const buckets = new Map<HandwritingLevelId, BreakdownItem[]>();

  rows.forEach((row, i) => {
    const f = row.features ?? {};
    const fallback = HANDWRITING_TASKS[i];
    const levelId = (HANDWRITING_LEVELS.some((l) => l.id === f.level)
      ? f.level
      : fallback?.level ?? 1) as HandwritingLevelId;
    const taskType = (f.task_type ?? fallback?.task_type ?? null) as HandwritingTaskType | null;

    const item: BreakdownItem = {
      row,
      text: f.target_text ?? fallback?.target_text ?? null,
      typeLabel: taskType ? HANDWRITING_TASK_TYPE_LABELS[taskType] ?? "Writing task" : `Task ${i + 1}`,
      taskType,
      key: `${f.task_id ?? i}-${i}`,
    };

    buckets.set(levelId, [...(buckets.get(levelId) ?? []), item]);
  });

  return HANDWRITING_LEVELS.filter((l) => buckets.has(l.id)).map((level) => ({
    level,
    items: buckets.get(level.id)!,
  }));
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={{ flex: 1, height: 4, backgroundColor: "#E2E8F0", borderRadius: 2, overflow: "hidden" }}>
      <View style={{ width: `${Math.round(value * 100)}%` as any, height: 4, backgroundColor: color, borderRadius: 2 }} />
    </View>
  );
}

export default function HandwritingSummaryScreen({ navigation }: Props) {
  const markedRef = useRef(false);
  const [summary, setSummary] = useState<ModuleSummary | null>(null);
  const [levelProgress, setLevelProgress] = useState<HandwritingLevelProgress>({ completed: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }

    Promise.all([
      fetchModuleSummary("handwriting_predictions", uid, `session_${uid}`, "features_json"),
      fetchHandwritingLevelProgress(uid),
    ])
      .then(([sum, prog]) => {
        setSummary(sum);
        setLevelProgress(prog);
        // The module only counts as done for the dashboard/fusion gate once
        // every level has been played — this screen is also reachable mid-run
        // via "see results so far".
        const allLevelsDone = HANDWRITING_LEVELS.every((l) => prog.completed.includes(l.id));
        if (allLevelsDone && !markedRef.current) {
          markedRef.current = true;
          markModuleDone(uid, "handwritingDone").catch(() => {});
        }
      })
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !summary) {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />
        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" />
        ) : (
          <Text style={{ fontFamily: theme.fonts.regular, color: "#64748B" }}>No results found for this session.</Text>
        )}
      </View>
    );
  }

  const { rows, count, avgProb } = summary;
  const overallLevel: RiskLevel = summary.overallLevel;
  const completedCount = count;
  const groups = groupRowsByLevel(rows);
  // Only count levels the child actually has results for, so a single-level run
  // reads "7/7" rather than "7/21".
  const attemptedTaskTotal =
    groups.reduce((s, g) => s + handwritingLevelTaskCount(g.level.id), 0) || HANDWRITING_TASKS.length;
  const remainingLevels = HANDWRITING_LEVELS.filter((l) => !levelProgress.completed.includes(l.id));
  const nextLevel = remainingLevels[0];
  const avgQuality    = count ? rows.reduce((s, r) => s + num(r.features.writing_quality_score), 0) / count : 0;
  const avgSimilarity = count ? rows.reduce((s, r) => s + num(r.features.shape_similarity_score), 0) / count : 0;
  const totalReversals = rows.reduce((s, r) => s + (num(r.features.reversal_risk ?? r.features.reversal_count ?? r.features.reversal_flag) > 0 ? 1 : 0), 0);
  const config = OVERALL_CONFIG[overallLevel];

  return (
    <View style={styles.container}>
      <KidBackground variant="handwriting" />
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Handwriting Summary</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Overall card */}
        <LinearGradient colors={config.gradColors} style={styles.overallCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.decoCircle} />
          <View style={styles.overallIconWrap}>
            <Ionicons name={config.icon} size={44} color="#fff" />
          </View>
          <Text style={styles.overallLabel}>{config.label}</Text>
          <Text style={styles.overallSub}>{config.sublabel}</Text>
          <View style={styles.overallStatsRow}>
            {[
              { label: "Quality",    value: `${Math.round(avgQuality * 100)}%` },
              { label: "Shape",      value: `${Math.round(avgSimilarity * 100)}%` },
              { label: "Completed",  value: `${completedCount}/${attemptedTaskTotal}` },
            ].map((s, i) => (
              <View key={i} style={[styles.overallStat, i < 2 && styles.overallStatBorder]}>
                <Text style={styles.overallStatVal}>{s.value}</Text>
                <Text style={styles.overallStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Partial-run notice — the module isn't finished until every level is */}
        {nextLevel && (
          <View style={styles.partialCard}>
            <View style={styles.partialIconWrap}>
              <Ionicons name="hourglass-outline" size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.partialTitle}>
                {remainingLevels.length} level{remainingLevels.length > 1 ? "s" : ""} still to go
              </Text>
              <Text style={styles.partialSub}>
                These results cover the levels played so far. Finish Level {nextLevel.id} to complete the writing module.
              </Text>
            </View>
          </View>
        )}

        {/* Risk score bar */}
        <View style={styles.probCard}>
          <View style={styles.probHeader}>
            <Text style={styles.probTitle}>Overall Handwriting Risk Score</Text>
            <Text style={[styles.probValue, { color: RISK_COLORS[overallLevel] }]}>
              {Math.round(avgProb * 100)}%
            </Text>
          </View>
          <View style={styles.probTrack}>
            <LinearGradient
              colors={[RISK_COLORS[overallLevel], RISK_COLORS[overallLevel]]}
              style={[styles.probFill, { width: `${Math.round(avgProb * 100)}%` as any }]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            />
          </View>
          <Text style={styles.probNote}>Based on {completedCount} completed tasks</Text>
        </View>

        {/* Reversal indicator */}
        {totalReversals > 0 && (
          <View style={[styles.reversalCard, { backgroundColor: totalReversals >= 2 ? "#FFF5F5" : "#FFFBEB", borderColor: totalReversals >= 2 ? "#FECACA" : "#FEF3C7" }]}>
            <Ionicons name="swap-horizontal-outline" size={18} color={totalReversals >= 2 ? "#EF4444" : "#D97706"} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.reversalTitle, { color: totalReversals >= 2 ? "#991B1B" : "#92400E" }]}>
                Letter reversal detected in {totalReversals} task{totalReversals > 1 ? "s" : ""}
              </Text>
              <Text style={styles.reversalSub}>b/d/p/q confusion is a common early dyslexia indicator.</Text>
            </View>
          </View>
        )}

        {/* Task breakdown, grouped by level */}
        <Text style={styles.sectionLabel}>Task Breakdown</Text>
        {groups.map((group) => (
          <View key={group.level.id} style={styles.levelGroup}>
            <View style={styles.levelGroupHeader}>
              <LinearGradient
                colors={group.level.gradColors}
                style={styles.levelGroupBadge}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <Text style={styles.levelGroupBadgeText}>{group.level.id}</Text>
              </LinearGradient>
              <Text style={styles.levelGroupTitle}>{group.level.title}</Text>
              <View style={[styles.levelGroupChip, { backgroundColor: group.level.bg }]}>
                <Text style={[styles.levelGroupChipText, { color: group.level.color }]}>
                  {group.items.length}/{handwritingLevelTaskCount(group.level.id)}
                </Text>
              </View>
            </View>

            <View style={styles.breakdownCard}>
              {group.items.map(({ row, text, typeLabel, taskType, key }, i) => {
                const tc = taskType
                  ? HANDWRITING_TASK_COLORS[taskType]
                  : { bg: "#F1F5F9", color: "#64748B", border: "#E2E8F0" };
                const rc = RISK_COLORS[row.risk_level];
                const hasReversal = num(row.features.reversal_risk ?? row.features.reversal_count ?? row.features.reversal_flag) > 0;
                const quality = num(row.features.writing_quality_score);
                return (
                  <View key={key} style={[styles.breakdownRow, i < group.items.length - 1 && styles.breakdownBorder]}>
                    <View style={[styles.breakdownIcon, { backgroundColor: tc.bg }]}>
                      <Ionicons
                        name={hasReversal ? "swap-horizontal" : row.risk_level === "low" ? "checkmark" : "alert"}
                        size={13}
                        color={hasReversal ? "#EF4444" : rc}
                      />
                    </View>
                    <View style={styles.breakdownInfo}>
                      <Text style={styles.breakdownTask}>{typeLabel}</Text>
                      <Text style={styles.breakdownWord}>{text ? `"${text}"` : "Handwriting sample"}</Text>
                      <MiniBar value={quality} color={tc.color} />
                    </View>
                    <View style={[styles.riskPill, { backgroundColor: RISK_BG[row.risk_level], borderColor: RISK_BORDER[row.risk_level] }]}>
                      <Text style={[styles.riskPillText, { color: rc }]}>
                        {row.risk_level === "requires_review" ? "review" : row.risk_level}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#2563EB" />
          <Text style={styles.disclaimerText}>
            These results are screening indicators only. They are not a diagnosis. Please consult a qualified professional for a full evaluation. The handwriting result is one part of the multi-modal assessment.
          </Text>
        </View>

        <View style={{ height: 20 }} />

        {/* Mid-run: send the child back to finish the remaining levels */}
        {nextLevel && (
          <LinearGradient colors={nextLevel.gradColors} style={[styles.doneBtn, { marginBottom: 12 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <TouchableOpacity
              style={styles.doneBtnInner}
              activeOpacity={0.88}
              onPress={() => { playNextSound(); navigation.navigate("HandwritingLevels"); }}
            >
              <Ionicons name="layers-outline" size={20} color="#fff" />
              <Text style={styles.doneBtnText}>Continue to Level {nextLevel.id}</Text>
            </TouchableOpacity>
          </LinearGradient>
        )}

        <LinearGradient
          colors={nextLevel ? ["#94A3B8", "#64748B"] : ["#2563EB", "#1D4ED8"]}
          style={styles.doneBtn}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity
            style={styles.doneBtnInner}
            activeOpacity={0.88}
            onPress={() => { playNextSound(); navigation.navigate("MainTabs"); }}
          >
            <Ionicons name="home-outline" size={20} color="#fff" />
            <Text style={styles.doneBtnText}>Back to Dashboard</Text>
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

  overallCard: {
    borderRadius: 24, padding: 28, alignItems: "center", marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.15, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 10,
  },
  decoCircle: { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.08)", top: -50, right: -40 },
  overallIconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 3, borderColor: "rgba(255,255,255,0.35)", alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  overallLabel: { fontSize: 22, fontFamily: theme.fonts.extraBold, color: "#fff", marginBottom: 4 },
  overallSub: { fontSize: 13, fontFamily: theme.fonts.regular, color: "rgba(255,255,255,0.8)", textAlign: "center", marginBottom: 20 },
  overallStatsRow: {
    flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", width: "100%",
  },
  overallStat: { flex: 1, alignItems: "center", paddingVertical: 12 },
  overallStatBorder: { borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.2)" },
  overallStatVal: { fontSize: 20, fontFamily: theme.fonts.extraBold, color: "#fff" },
  overallStatLabel: { fontSize: 10, fontFamily: theme.fonts.medium, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: 0.5 },

  probCard: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 20, padding: 16, marginBottom: 14,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  probHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  probTitle: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: "#1E293B" },
  probValue: { fontSize: 18, fontFamily: theme.fonts.extraBold },
  probTrack: { height: 8, backgroundColor: "#E2E8F0", borderRadius: 4, overflow: "hidden", marginBottom: 8 },
  probFill: { height: 8, borderRadius: 4 },
  probNote: { fontSize: 11, fontFamily: theme.fonts.regular, color: "#94A3B8" },

  reversalCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 16,
  },
  reversalTitle: { fontSize: 13, fontFamily: theme.fonts.semiBold, marginBottom: 2 },
  reversalSub: { fontSize: 11, fontFamily: theme.fonts.regular, color: "#94A3B8" },

  sectionLabel: { fontSize: 11, fontFamily: theme.fonts.semiBold, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10 },

  partialCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A",
    borderRadius: 16, padding: 14, marginBottom: 14,
  },
  partialIconWrap: {
    width: 34, height: 34, borderRadius: 11, backgroundColor: "#FEF3C7",
    alignItems: "center", justifyContent: "center",
  },
  partialTitle: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: "#92400E", marginBottom: 2 },
  partialSub: { fontSize: 12, fontFamily: theme.fonts.regular, color: "#B45309", lineHeight: 17 },

  levelGroup: { marginBottom: 14 },
  levelGroupHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  levelGroupBadge: { width: 26, height: 26, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  levelGroupBadgeText: { fontSize: 13, fontFamily: theme.fonts.extraBold, color: "#fff" },
  levelGroupTitle: { flex: 1, fontSize: 13, fontFamily: theme.fonts.bold, color: "#1E293B" },
  levelGroupChip: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  levelGroupChipText: { fontSize: 10, fontFamily: theme.fonts.semiBold },

  breakdownCard: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 20, marginBottom: 16, overflow: "hidden",
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  breakdownRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  breakdownBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  breakdownIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  breakdownInfo: { flex: 1, gap: 4 },
  breakdownTask: { fontSize: 13, fontFamily: theme.fonts.semiBold, color: "#1E293B" },
  breakdownWord: { fontSize: 11, fontFamily: theme.fonts.regular, color: "#94A3B8" },
  riskPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  riskPillText: { fontSize: 11, fontFamily: theme.fonts.semiBold },

  disclaimerCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE",
    borderRadius: 16, padding: 14, marginBottom: 20,
  },
  disclaimerText: { flex: 1, fontSize: 12, fontFamily: theme.fonts.regular, color: "#1D4ED8", lineHeight: 18 },

  doneBtn: {
    borderRadius: 50,
    shadowColor: "#2563EB", shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  doneBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18 },
  doneBtnText: { fontSize: 15, fontFamily: theme.fonts.bold, color: "#fff" },
});
