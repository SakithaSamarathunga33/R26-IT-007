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
  SPEECH_LEVELS,
  SPEECH_TASKS,
  TASK_TYPE_LABELS,
  LevelId,
  SpeechLevel,
  levelTaskCount,
} from "../../config/speechTasks";
import { auth } from "../../config/firebase";
import { markModuleDone } from "../../services/sessionService";
import { fetchModuleSummary, ModuleSummary, RiskLevel, SummaryRow } from "../../services/summaryService";
import { SpeechLevelProgress, fetchLevelProgress } from "../../services/speechLevelService";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "SpeechSummary">;
};

const RISK_COLORS = { low: "#059669", medium: "#D97706", high: "#EF4444", requires_review: "#64748B" };
const RISK_BG = { low: "#ECFDF5", medium: "#FFFBEB", high: "#FFF5F5", requires_review: "#F8FAFC" };

const OVERALL_CONFIG = {
  low: { label: "Low Risk Indicators", sublabel: "Speech patterns are generally within typical range.", icon: "checkmark-circle" as const, gradColors: ["#059669", "#047857"] as [string, string] },
  medium: { label: "Moderate Indicators", sublabel: "Some patterns noted. A specialist review may help.", icon: "alert-circle" as const, gradColors: ["#F59E0B", "#D97706"] as [string, string] },
  high: { label: "Elevated Indicators", sublabel: "Multiple patterns noted. Specialist evaluation recommended.", icon: "warning" as const, gradColors: ["#EF4444", "#DC2626"] as [string, string] },
  requires_review: { label: "Review Required", sublabel: "Some activities had low quality. Please re-run.", icon: "refresh-circle" as const, gradColors: ["#94A3B8", "#64748B"] as [string, string] },
};

export default function SpeechSummaryScreen({ navigation }: Props) {
  const markedRef = useRef(false);
  const [summary, setSummary] = useState<ModuleSummary | null>(null);
  const [levelProgress, setLevelProgress] = useState<SpeechLevelProgress>({ completed: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }

    Promise.all([
      fetchModuleSummary("speech_predictions", uid, `session_${uid}`, "features"),
      fetchLevelProgress(uid),
    ])
      .then(([sum, prog]) => {
        setSummary(sum);
        setLevelProgress(prog);
        // The speech module only counts as done for the dashboard/fusion gate
        // once every level has been played — this screen is also reachable
        // mid-run via "see results so far".
        const allLevelsDone = SPEECH_LEVELS.every((l) => prog.completed.includes(l.id));
        if (allLevelsDone && !markedRef.current) {
          markedRef.current = true;
          markModuleDone(uid, "speechDone").catch(() => {});
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
  const config = OVERALL_CONFIG[overallLevel];
  const groups = groupRowsByLevel(rows);
  // Only count levels the child actually has results for, so a single-level run
  // reads "3/3" rather than "3/10".
  const attemptedTaskTotal = groups.reduce((s, g) => s + levelTaskCount(g.level.id), 0) || SPEECH_TASKS.length;
  const remainingLevels = SPEECH_LEVELS.filter((l) => !levelProgress.completed.includes(l.id));
  const nextLevel = remainingLevels[0];

  return (
    <View style={styles.container}>
      <KidBackground variant="speech" />
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Speech Summary</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Overall result card */}
        <LinearGradient colors={config.gradColors} style={styles.overallCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.decoCircle} />
          <View style={styles.overallIconWrap}>
            <Ionicons name={config.icon} size={44} color="#fff" />
          </View>
          <Text style={styles.overallLabel}>{config.label}</Text>
          <Text style={styles.overallSub}>{config.sublabel}</Text>
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
                These results cover the levels played so far. Finish Level {nextLevel.id} to complete the speech module.
              </Text>
            </View>
          </View>
        )}

        {/* Stats row */}
        <View style={styles.statsCard}>
          <StatBox value={`${count}/${attemptedTaskTotal}`} label="Completed" accent="#2563EB" bg="#EFF6FF" />
          <View style={styles.statDivider} />
          <StatBox value={`${(avgProb * 100).toFixed(0)}%`} label="Avg Risk" accent={RISK_COLORS[overallLevel]} bg={RISK_BG[overallLevel]} />
          <View style={styles.statDivider} />
          <StatBox value={`${groups.length}/${SPEECH_LEVELS.length}`} label="Levels" accent="#7C3AED" bg="#F5F3FF" />
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
          <Text style={styles.disclaimerText}>
            These are <Text style={styles.disclaimerBold}>screening indicators only</Text> — not a clinical diagnosis. Consult a qualified professional.
          </Text>
        </View>

        {/* Activity breakdown, grouped by level */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Activity Breakdown</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{count} tasks</Text>
          </View>
        </View>

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
                  {group.items.length}/{levelTaskCount(group.level.id)}
                </Text>
              </View>
            </View>

            {group.items.map(({ row, word, typeLabel, key }, i) => (
              <View key={key} style={styles.activityRow}>
                <View style={[styles.activityIndex, { backgroundColor: RISK_BG[row.risk_level] }]}>
                  <Text style={[styles.activityIndexText, { color: RISK_COLORS[row.risk_level] }]}>{i + 1}</Text>
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityWord}>{word}</Text>
                  <Text style={styles.activityType}>{typeLabel}</Text>
                </View>
                <View style={styles.activityRight}>
                  <View style={[styles.riskPill, { backgroundColor: RISK_BG[row.risk_level] }]}>
                    <View style={[styles.riskDot, { backgroundColor: RISK_COLORS[row.risk_level] }]} />
                    <Text style={[styles.riskPillText, { color: RISK_COLORS[row.risk_level] }]}>{row.risk_level}</Text>
                  </View>
                  <Text style={styles.activityProb}>{(row.risk_probability * 100).toFixed(0)}%</Text>
                </View>
              </View>
            ))}
          </View>
        ))}

        {/* Fusion card */}
        <View style={styles.fusionCard}>
          <View style={styles.fusionIconWrap}>
            <Ionicons name="git-merge-outline" size={18} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fusionTitle}>Fusion Score Saved</Text>
            <Text style={styles.fusionSub}>Speech data forwarded to the full dyslexia risk assessment.</Text>
          </View>
        </View>

        <View style={{ height: 20 }} />

        <LinearGradient colors={["#3B72F6", "#2563EB"]} style={styles.doneBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <TouchableOpacity style={styles.doneBtnInner} activeOpacity={0.88} onPress={() => { playNextSound(); navigation.navigate("SpeechLevels"); }}>
            <Ionicons name="layers-outline" size={18} color="#fff" />
            <Text style={styles.doneBtnText}>Back to Levels</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

type BreakdownItem = { row: SummaryRow; word: string; typeLabel: string; key: string };
type LevelGroup = { level: SpeechLevel; items: BreakdownItem[] };

/**
 * Buckets prediction rows into their levels. Rows written by the current app
 * carry `level`/`target_word` directly; older rows only have their arrival
 * order, so those fall back to positional mapping onto SPEECH_TASKS.
 */
function groupRowsByLevel(rows: SummaryRow[]): LevelGroup[] {
  const buckets = new Map<LevelId, BreakdownItem[]>();

  rows.forEach((row, i) => {
    const f = row.features ?? {};
    const fallback = SPEECH_TASKS[i];
    const levelId = (SPEECH_LEVELS.some((l) => l.id === f.level) ? f.level : fallback?.level ?? 1) as LevelId;
    const taskType = f.task_type ?? fallback?.task_type;

    const item: BreakdownItem = {
      row,
      word: f.target_word ?? fallback?.target_word ?? `Activity ${i + 1}`,
      typeLabel: taskType ? TASK_TYPE_LABELS[taskType as keyof typeof TASK_TYPE_LABELS] ?? "Speech task" : "Speech task",
      key: `${f.task_id ?? i}-${i}`,
    };

    buckets.set(levelId, [...(buckets.get(levelId) ?? []), item]);
  });

  return SPEECH_LEVELS.filter((l) => buckets.has(l.id)).map((level) => ({
    level,
    items: buckets.get(level.id)!,
  }));
}

function StatBox({ value, label, accent, bg }: { value: string; label: string; accent: string; bg: string }) {
  return (
    <View style={styles.statBox}>
      <View style={[styles.statIconWrap, { backgroundColor: bg }]}>
        <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
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

  overallCard: {
    borderRadius: 24, padding: 28, alignItems: "center", marginBottom: 16,
    overflow: "hidden", shadowOpacity: 0.28, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 10,
  },
  decoCircle: { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.07)", top: -50, right: -40 },
  overallIconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 3, borderColor: "rgba(255,255,255,0.35)", alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  overallLabel: { fontSize: 20, fontFamily: theme.fonts.extraBold, color: "#fff", marginBottom: 6, textAlign: "center" },
  overallSub: { fontSize: 13, fontFamily: theme.fonts.regular, color: "rgba(255,255,255,0.82)", textAlign: "center", lineHeight: 19 },

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

  statsCard: {
    flexDirection: "row", backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 20, paddingVertical: 16, marginBottom: 14,
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  statBox: { flex: 1, alignItems: "center", gap: 6 },
  statIconWrap: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statValue: { fontSize: 16, fontFamily: theme.fonts.extraBold },
  statLabel: { fontSize: 10, fontFamily: theme.fonts.regular, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.4 },
  statDivider: { width: 1, backgroundColor: "#F1F5F9", marginVertical: 4 },

  disclaimerCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE",
    borderRadius: 16, padding: 14, marginBottom: 22,
  },
  disclaimerText: { flex: 1, fontSize: 12, fontFamily: theme.fonts.regular, color: "#3B72F6", lineHeight: 18 },
  disclaimerBold: { fontFamily: theme.fonts.semiBold, color: "#1E40AF" },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontFamily: theme.fonts.bold, color: "#1E293B" },
  sectionBadge: { backgroundColor: "#EFF6FF", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  sectionBadgeText: { fontSize: 10, fontFamily: theme.fonts.semiBold, color: "#2563EB" },

  levelGroup: { marginBottom: 10 },
  levelGroupHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, marginTop: 6 },
  levelGroupBadge: { width: 26, height: 26, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  levelGroupBadgeText: { fontSize: 13, fontFamily: theme.fonts.extraBold, color: "#fff" },
  levelGroupTitle: { flex: 1, fontSize: 13, fontFamily: theme.fonts.bold, color: "#1E293B" },
  levelGroupChip: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  levelGroupChipText: { fontSize: 10, fontFamily: theme.fonts.semiBold },

  activityRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 16, padding: 14, marginBottom: 8, gap: 12,
    shadowColor: "#94A3B8", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  activityIndex: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  activityIndexText: { fontSize: 14, fontFamily: theme.fonts.bold },
  activityInfo: { flex: 1 },
  activityWord: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: "#1E293B", textTransform: "capitalize", marginBottom: 2 },
  activityType: { fontSize: 11, fontFamily: theme.fonts.regular, color: "#94A3B8" },
  activityRight: { alignItems: "flex-end", gap: 4 },
  riskPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  riskDot: { width: 6, height: 6, borderRadius: 3 },
  riskPillText: { fontSize: 11, fontFamily: theme.fonts.semiBold, textTransform: "capitalize" },
  activityProb: { fontSize: 11, fontFamily: theme.fonts.medium, color: "#94A3B8" },

  fusionCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE",
    borderRadius: 16, padding: 16, marginTop: 6, marginBottom: 8,
  },
  fusionIconWrap: { width: 36, height: 36, borderRadius: 11, backgroundColor: "#DBEAFE", alignItems: "center", justifyContent: "center" },
  fusionTitle: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: "#1E40AF", marginBottom: 2 },
  fusionSub: { fontSize: 12, fontFamily: theme.fonts.regular, color: "#3B72F6", lineHeight: 17 },

  doneBtn: {
    borderRadius: 50,
    shadowColor: "#2563EB", shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  doneBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18 },
  doneBtnText: { fontSize: 16, fontFamily: theme.fonts.bold, color: "#fff" },
});
