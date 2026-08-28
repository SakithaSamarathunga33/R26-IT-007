import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, StatusBar, ScrollView, ActivityIndicator } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import {
  SPEECH_LEVELS,
  SPEECH_TASKS,
  TASK_TYPE_LABELS,
  LevelId,
  SpeechLevel,
  levelTaskCount,
  TaskType,
} from "../../config/speechTasks";
import { auth } from "../../config/firebase";
import { markModuleDone } from "../../services/sessionService";
import { fetchModuleSummary, ModuleSummary, RiskLevel, SummaryRow } from "../../services/summaryService";
import { SpeechLevelProgress, fetchLevelProgress } from "../../services/speechLevelService";
import ScreenContainer from "../../components/common/ScreenContainer";
import ActivityHeader from "../../components/common/ActivityHeader";
import ClayCard from "../../components/common/ClayCard";
import PrimaryButton from "../../components/common/PrimaryButton";
import ProgressRing from "../../components/common/ProgressRing";
import ProgressTrack from "../../components/common/ProgressTrack";
import RiskBadge from "../../components/common/RiskBadge";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "SpeechSummary">;
};

const OVERALL_CONFIG = {
  low: { label: "Low Risk Indicators", sublabel: "Speech patterns are generally within typical range." },
  medium: { label: "Watch closely", sublabel: "Clear on single sounds. Consonant blends and multi-syllable words are less consistent." },
  high: { label: "Elevated Indicators", sublabel: "Multiple patterns noted. Specialist evaluation recommended." },
  requires_review: { label: "Review Required", sublabel: "Some activities had low quality. Please re-run." },
};

const BREAKDOWN_GROUPS: { label: string; types: TaskType[] }[] = [
  { label: "Single sounds", types: ["word_repetition", "initial_sound_matching", "final_sound_matching"] },
  { label: "Syllable count", types: ["syllable_segmentation"] },
  { label: "Consonant blends", types: ["sound_blending"] },
  { label: "Rhythm & pacing", types: ["rhyme_identification", "nonword_repetition"] },
];

function barColors(score: number): [string, string] {
  if (score >= 70) return ["#4ED9AC", colors.mint];
  if (score >= 50) return [colors.gold, "#B0791A"];
  return [colors.coralLight, "#F2573F"];
}

function barValueColor(score: number) {
  if (score >= 70) return colors.mint;
  if (score >= 50) return "#B0791A";
  return "#C6493A";
}

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
      <ScreenContainer>
        <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
        <ActivityHeader title="Speech summary" onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.brand} />
          ) : (
            <Text style={styles.empty}>No results found for this session.</Text>
          )}
        </View>
      </ScreenContainer>
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
  const clarity = Math.round((1 - Math.min(1, Math.max(0, avgProb))) * 100);
  const breakdown = BREAKDOWN_GROUPS.map((g) => {
    const subset = rows.filter((r) => g.types.includes(r.features?.task_type));
    if (!subset.length) return null;
    const avg = subset.reduce((s, r) => s + r.risk_probability, 0) / subset.length;
    return { label: g.label, score: Math.round((1 - avg) * 100) };
  }).filter((x): x is { label: string; score: number } => x != null);

  return (
    <ScreenContainer>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <ActivityHeader
        title="Speech summary"
        subtitle={`${groups.length} of ${SPEECH_LEVELS.length} levels · ${count} tasks`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ClayCard style={styles.hero} radius={26}>
          <ProgressRing progress={clarity / 100} size={92} stroke={10} value={`${clarity}`} label="clarity" />
          <View style={styles.heroCopy}>
            {overallLevel === "medium" ? (
              <View style={styles.watchPill}>
                <Text style={styles.watchPillText}>Watch closely</Text>
              </View>
            ) : overallLevel === "requires_review" ? (
              <View style={styles.reviewPill}>
                <Text style={styles.reviewPillText}>{config.label}</Text>
              </View>
            ) : (
              <RiskBadge level={overallLevel} />
            )}
            <Text style={styles.heroText}>{config.sublabel}</Text>
          </View>
        </ClayCard>

        {nextLevel && (
          <ClayCard inset style={styles.noteCard} radius={18}>
            <View style={styles.infoDot}><Text style={styles.infoMark}>i</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.noteTitle}>
                {remainingLevels.length} level{remainingLevels.length > 1 ? "s" : ""} still to go
              </Text>
              <Text style={styles.noteText}>
                These results cover the levels played so far. Finish Level {nextLevel.id} to complete the speech module.
              </Text>
            </View>
          </ClayCard>
        )}

        <View style={styles.statsRow}>
          <ClayCard style={styles.statCard} radius={20}>
            <Text style={[styles.statVal, { color: colors.brand }]}>{count}/{attemptedTaskTotal}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </ClayCard>
          <ClayCard style={styles.statCard} radius={20}>
            <Text style={[styles.statVal, { color: barValueColor(100 - Math.round(avgProb * 100)) }]}>
              {Math.round(avgProb * 100)}%
            </Text>
            <Text style={styles.statLabel}>Avg Risk</Text>
          </ClayCard>
          <ClayCard style={styles.statCard} radius={20}>
            <Text style={[styles.statVal, { color: colors.text }]}>{groups.length}/{SPEECH_LEVELS.length}</Text>
            <Text style={styles.statLabel}>Levels</Text>
          </ClayCard>
        </View>

        {breakdown.length > 0 && (
          <ClayCard style={styles.breakdownCard} radius={24}>
            <Text style={styles.sectionTitle}>Breakdown</Text>
            {breakdown.map((item) => (
              <View key={item.label} style={styles.barBlock}>
                <View style={styles.barLabelRow}>
                  <Text style={styles.barLabel}>{item.label}</Text>
                  <Text style={[styles.barVal, { color: barValueColor(item.score) }]}>{item.score}</Text>
                </View>
                <ProgressTrack progress={item.score / 100} colors={barColors(item.score)} />
              </View>
            ))}
          </ClayCard>
        )}

        <ClayCard inset style={styles.noteCard} radius={18}>
          <View style={[styles.infoDot, { backgroundColor: colors.textMuted }]}>
            <Text style={styles.infoMark}>i</Text>
          </View>
          <Text style={styles.noteText}>
            Indicative only. One module alone is not a diagnosis — the combined report weighs all three.
            These are screening indicators only — not a clinical diagnosis. Consult a qualified professional.
          </Text>
        </ClayCard>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Activity Breakdown</Text>
          <View style={styles.countChip}>
            <Text style={styles.countChipText}>{count} tasks</Text>
          </View>
        </View>

        {groups.map((group) => (
          <View key={group.level.id} style={styles.levelGroup}>
            <View style={styles.levelGroupHeader}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>{group.level.id}</Text>
              </View>
              <Text style={styles.levelGroupTitle}>{group.level.title}</Text>
              <Text style={styles.levelCount}>
                {group.items.length}/{levelTaskCount(group.level.id)}
              </Text>
            </View>

            {group.items.map(({ row, word, typeLabel, key }) => (
              <ClayCard key={key} style={styles.activityRow} radius={18}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityWord}>{word}</Text>
                  <Text style={styles.activityType}>{typeLabel}</Text>
                </View>
                <View style={styles.activityRight}>
                  {row.risk_level === "requires_review" ? (
                    <View style={styles.reviewPill}>
                      <Text style={styles.reviewPillText}>Review</Text>
                    </View>
                  ) : (
                    <RiskBadge level={row.risk_level} />
                  )}
                  <Text style={styles.activityProb}>{(row.risk_probability * 100).toFixed(0)}%</Text>
                </View>
              </ClayCard>
            ))}
          </View>
        ))}

        <ClayCard inset style={styles.noteCard} radius={18}>
          <View style={styles.infoDot}><Text style={styles.infoMark}>i</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.noteTitle}>Fusion Score Saved</Text>
            <Text style={styles.noteText}>Speech data forwarded to the full dyslexia risk assessment.</Text>
          </View>
        </ClayCard>

        <PrimaryButton
          label={nextLevel ? "Back to Levels" : "Next game: handwriting"}
          onPress={() => navigation.navigate("SpeechLevels")}
          style={{ marginTop: 8 }}
        />
        <View style={{ height: 28 }} />
      </ScrollView>
    </ScreenContainer>
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

const styles = StyleSheet.create({
  content: { paddingTop: 16, paddingBottom: 8, gap: 14 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { fontFamily: fonts.regular, color: colors.textSecondary, textAlign: "center" },

  hero: { flexDirection: "row", alignItems: "center", gap: 18, padding: 20 },
  heroCopy: { flex: 1, gap: 8 },
  heroText: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textBody, lineHeight: 19 },

  watchPill: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF0D6",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
  },
  watchPillText: { fontFamily: fonts.extraBold, fontSize: 11, color: "#B0791A" },
  reviewPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.bgInset,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  reviewPillText: { fontFamily: fonts.bold, fontSize: 12, color: colors.textMuted },

  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, alignItems: "center", paddingVertical: 14, paddingHorizontal: 8 },
  statVal: { fontFamily: fonts.extraBold, fontSize: 16 },
  statLabel: { fontFamily: fonts.semiBold, fontSize: 10, color: colors.textMuted, marginTop: 4, textTransform: "uppercase" },

  breakdownCard: { padding: 20, gap: 14 },
  barBlock: { gap: 7 },
  barLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  barLabel: { fontFamily: fonts.bold, fontSize: 13, color: colors.textBody },
  barVal: { fontFamily: fonts.extraBold, fontSize: 13 },

  noteCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 15 },
  infoDot: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center", marginTop: 1,
  },
  infoMark: { fontFamily: fonts.extraBold, fontSize: 11, color: "#fff" },
  noteTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.text, marginBottom: 2 },
  noteText: { flex: 1, fontFamily: fonts.semiBold, fontSize: 12, color: colors.textSecondary, lineHeight: 18 },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  sectionTitle: { fontFamily: fonts.extraBold, fontSize: 15, color: colors.text },
  countChip: { backgroundColor: colors.brandTint, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  countChipText: { fontFamily: fonts.semiBold, fontSize: 10, color: colors.brand },

  levelGroup: { gap: 8 },
  levelGroupHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  levelBadge: {
    width: 26, height: 26, borderRadius: 9, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
  },
  levelBadgeText: { fontFamily: fonts.extraBold, fontSize: 13, color: "#fff" },
  levelGroupTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  levelCount: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.brand },

  activityRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  activityWord: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text, textTransform: "capitalize", marginBottom: 2 },
  activityType: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  activityRight: { alignItems: "flex-end", gap: 6 },
  activityProb: { fontFamily: fonts.medium, fontSize: 11, color: colors.textMuted },
});
