import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, StatusBar, ScrollView, ActivityIndicator } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import {
  BEHAVIOR_TASKS, BEHAVIOR_TASK_TYPE_LABELS,
  BEHAVIOR_LEVELS, BehaviorLevel, BehaviorLevelId,
  BehaviorTaskType, behaviorLevelTaskCount,
} from "../../config/behaviorTasks";
import { auth } from "../../config/firebase";
import { markModuleDone } from "../../services/sessionService";
import { fetchModuleSummary, ModuleSummary, RiskLevel, SummaryRow } from "../../services/summaryService";
import { BehaviorLevelProgress, fetchBehaviorLevelProgress } from "../../services/behaviorLevelService";
import ScreenContainer from "../../components/common/ScreenContainer";
import ActivityHeader from "../../components/common/ActivityHeader";
import ClayCard from "../../components/common/ClayCard";
import PrimaryButton from "../../components/common/PrimaryButton";
import SecondaryButton from "../../components/common/SecondaryButton";
import ProgressTrack from "../../components/common/ProgressTrack";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "BehaviorSummary">;
};

const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const OVERALL_COPY = {
  low:             { label: "On track",        sublabel: "Sustained focus was good across the activities played." },
  medium:          { label: "Keep an eye",     sublabel: "Some dips showed up. A specialist review may help." },
  high:            { label: "Needs a look",    sublabel: "Several patterns showed up. Evaluation is recommended." },
  requires_review: { label: "Needs review",    sublabel: "Some activities had incomplete data." },
};

type BreakdownItem = {
  row: SummaryRow;
  typeLabel: string;
  detail: string;
  taskType: BehaviorTaskType | null;
  key: string;
};
type LevelGroup = { level: BehaviorLevel; items: BreakdownItem[] };

/**
 * Buckets prediction rows into their levels. Rows written by the current app
 * carry `level`/`task_id` directly; older rows only have their arrival order, so
 * those fall back to positional mapping onto BEHAVIOR_TASKS.
 */
function groupRowsByLevel(rows: SummaryRow[]): LevelGroup[] {
  const buckets = new Map<BehaviorLevelId, BreakdownItem[]>();

  rows.forEach((row, i) => {
    const f = row.features ?? {};
    const byId = f.task_id ? BEHAVIOR_TASKS.find((t) => t.id === f.task_id) : undefined;
    const task = byId ?? BEHAVIOR_TASKS[i];
    const levelId = (BEHAVIOR_LEVELS.some((l) => l.id === f.level)
      ? f.level
      : task?.level ?? 1) as BehaviorLevelId;
    const taskType = (f.task_type ?? task?.task_type ?? null) as BehaviorTaskType | null;

    const item: BreakdownItem = {
      row,
      typeLabel: taskType ? BEHAVIOR_TASK_TYPE_LABELS[taskType] ?? "Activity" : `Activity ${i + 1}`,
      // Missing-letter rows read better as the word than as the generic prompt.
      detail: task?.word
        ? `“${task.word}” — missing letter`
        : task
          ? `${task.instruction.replace(/\n/g, " ").slice(0, 30)}…`
          : "Behaviour activity",
      taskType,
      key: `${f.task_id ?? i}-${i}`,
    };

    buckets.set(levelId, [...(buckets.get(levelId) ?? []), item]);
  });

  return BEHAVIOR_LEVELS.filter((l) => buckets.has(l.id)).map((level) => ({
    level,
    items: buckets.get(level.id)!,
  }));
}

export default function BehaviorSummaryScreen({ navigation }: Props) {
  const markedRef = useRef(false);
  const [summary, setSummary] = useState<ModuleSummary | null>(null);
  const [levelProgress, setLevelProgress] = useState<BehaviorLevelProgress>({ completed: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }

    Promise.all([
      // behaviour stores attention/engagement at the top level of the doc
      fetchModuleSummary("behavior_predictions", uid, `session_${uid}`, "features"),
      fetchBehaviorLevelProgress(uid),
    ])
      .then(([sum, prog]) => {
        setSummary(sum);
        setLevelProgress(prog);
        // The module only counts as done for the dashboard/fusion gate once
        // every level has been played — this screen is also reachable mid-run
        // via "see results so far".
        const allLevelsDone = BEHAVIOR_LEVELS.every((l) => prog.completed.includes(l.id));
        if (allLevelsDone && !markedRef.current) {
          markedRef.current = true;
          markModuleDone(uid, "behaviourDone").catch(() => {});
        }
      })
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !summary) {
    return (
      <ScreenContainer backgroundColor="#EAEFF7">
        <StatusBar barStyle="dark-content" backgroundColor="#EAEFF7" />
        <View style={styles.center}>
          {loading ? (
            <ActivityIndicator size="large" color="#12B583" />
          ) : (
            <Text style={styles.empty}>No results found for this session.</Text>
          )}
        </View>
      </ScreenContainer>
    );
  }

  const { rows, count, avgProb } = summary;
  const overallLevel: RiskLevel = summary.overallLevel;
  const groups = groupRowsByLevel(rows);
  const remainingLevels = BEHAVIOR_LEVELS.filter((l) => !levelProgress.completed.includes(l.id));
  const nextLevel = remainingLevels[0];
  const avgAttention  = count ? rows.reduce((s, r) => s + num(r.features.attention_score), 0) / count : 0;
  const avgEngagement = count ? rows.reduce((s, r) => s + num(r.features.engagement_score), 0) / count : 0;
  const avgConsistency = count ? rows.reduce((s, r) => s + num(r.features.interaction_consistency_score), 0) / count : 0;
  const avgPersistence = count ? rows.reduce((s, r) => s + (1 - num(r.features.frustration_indicator_score)), 0) / count : 0;
  const copy = OVERALL_COPY[overallLevel];
  const completedLevel = groups[groups.length - 1]?.level;

  const bars = [
    { label: "Sustained attention", value: avgAttention, colors: ["#4ED9AC", "#0F8D68"] as [string, string], tint: "#0F8D68" },
    { label: "Engagement", value: avgEngagement, colors: ["#3FDCA8", "#12B583"] as [string, string], tint: "#0F8D68" },
    { label: "Consistency", value: avgConsistency, colors: avgConsistency >= 0.65 ? ["#4ED6A8", "#1FB88A"] as [string, string] : ["#F5B32E", "#B0791A"] as [string, string], tint: avgConsistency >= 0.65 ? "#0F8D68" : "#B0791A" },
    { label: "Task persistence", value: avgPersistence, colors: ["#4ED6A8", "#1FB88A"] as [string, string], tint: "#0F8D68" },
  ];

  return (
    <ScreenContainer backgroundColor="#EAEFF7">
      <StatusBar barStyle="dark-content" backgroundColor="#EAEFF7" />
      <ActivityHeader
        title="Behaviour summary"
        subtitle={completedLevel ? `Level ${completedLevel.id} · ${count} activities` : `${count} activities`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ClayCard style={styles.hero} radius={26}>
          <View style={styles.heroRing}>
            <Text style={styles.heroScore}>{Math.round(avgAttention * 100)}</Text>
            <Text style={styles.heroScoreLabel}>attention</Text>
          </View>
          <View style={styles.heroCopy}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{copy.label}</Text>
            </View>
            <Text style={styles.heroSub}>{copy.sublabel}</Text>
          </View>
        </ClayCard>

        {nextLevel && (
          <ClayCard style={styles.partial} radius={20}>
            <Text style={styles.partialTitle}>
              {remainingLevels.length} level{remainingLevels.length > 1 ? "s" : ""} still to go
            </Text>
            <Text style={styles.partialSub}>
              These results cover the levels played so far. Finish Level {nextLevel.id} to complete the behaviour module.
            </Text>
          </ClayCard>
        )}

        <ClayCard style={styles.breakdown} radius={24}>
          <Text style={styles.sectionTitle}>Breakdown</Text>
          {bars.map((bar) => (
            <View key={bar.label} style={styles.barBlock}>
              <View style={styles.barHead}>
                <Text style={styles.barLabel}>{bar.label}</Text>
                <Text style={[styles.barValue, { color: bar.tint }]}>{Math.round(bar.value * 100)}</Text>
              </View>
              <ProgressTrack progress={bar.value} colors={bar.colors} />
            </View>
          ))}
          <Text style={styles.probNote}>Overall risk score {Math.round(avgProb * 100)}% · {count} activities</Text>
        </ClayCard>

        <Text style={styles.sectionTitle}>Activity breakdown</Text>
        {groups.map((group) => (
          <ClayCard key={group.level.id} style={styles.levelCard} radius={22}>
            <View style={styles.levelHead}>
              <Text style={styles.levelTitle}>{group.level.title}</Text>
              <Text style={styles.levelCount}>{group.items.length}/{behaviorLevelTaskCount(group.level.id)}</Text>
            </View>
            {group.items.map(({ row, typeLabel, detail, key }) => {
              const attention = num(row.features.attention_score);
              return (
                <View key={key} style={styles.row}>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTask}>{typeLabel}</Text>
                    <Text style={styles.rowDetail} numberOfLines={1}>{detail}</Text>
                    <ProgressTrack
                      progress={attention}
                      colors={attention >= 0.65 ? ["#4ED9AC", "#0F8D68"] : ["#F5B32E", "#B0791A"]}
                    />
                  </View>
                  <Text style={[styles.rowScore, { color: attention >= 0.65 ? "#0F8D68" : "#B0791A" }]}>
                    {Math.round(attention * 100)}
                  </Text>
                </View>
              );
            })}
          </ClayCard>
        ))}

        <ClayCard style={styles.disclaimer} radius={20}>
          <Text style={styles.disclaimerText}>
            These results are screening indicators only. They are not a diagnosis. Please consult a qualified professional for a full evaluation.
          </Text>
        </ClayCard>

        {nextLevel && (
          <PrimaryButton
            label={`Continue to Level ${nextLevel.id}`}
            onPress={() => navigation.navigate("BehaviorLevels")}
            colors={["#4ED6A8", "#1FB88A"]}
            style={{ marginBottom: 12 }}
          />
        )}
        <SecondaryButton
          label="Back to Dashboard"
          textColor="#12B583"
          onPress={() => navigation.navigate("MainTabs")}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { fontFamily: fonts.regular, color: colors.textSecondary },
  content: { paddingTop: 18, paddingBottom: 40, gap: 14 },
  hero: { flexDirection: "row", alignItems: "center", gap: 18, padding: 20 },
  heroRing: {
    width: 92, height: 92, borderRadius: 46, backgroundColor: "#DDF6EE",
    alignItems: "center", justifyContent: "center",
  },
  heroScore: { fontFamily: fonts.extraBold, fontSize: 24, color: colors.text, lineHeight: 28 },
  heroScoreLabel: { fontFamily: fonts.bold, fontSize: 9, color: colors.textMuted },
  heroCopy: { flex: 1 },
  badge: {
    alignSelf: "flex-start", paddingHorizontal: 11, paddingVertical: 6,
    borderRadius: 10, backgroundColor: "#DDF6EE",
  },
  badgeText: { fontFamily: fonts.extraBold, fontSize: 10.5, color: "#0F8D68" },
  heroSub: { fontFamily: fonts.semiBold, fontSize: 13, color: "#5B6B82", marginTop: 8, lineHeight: 19 },
  partial: { padding: 16, backgroundColor: "#FFF4D6" },
  partialTitle: { fontFamily: fonts.extraBold, fontSize: 14, color: "#92400E", marginBottom: 4 },
  partialSub: { fontFamily: fonts.regular, fontSize: 12, color: "#B45309", lineHeight: 17 },
  breakdown: { padding: 20 },
  sectionTitle: { fontFamily: fonts.extraBold, fontSize: 14.5, color: colors.text, marginBottom: 4 },
  barBlock: { marginTop: 14 },
  barHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 7 },
  barLabel: { fontFamily: fonts.extraBold, fontSize: 12.5, color: colors.textBody },
  barValue: { fontFamily: fonts.extraBold, fontSize: 12.5 },
  probNote: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, marginTop: 14 },
  levelCard: { padding: 16, gap: 14 },
  levelHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  levelTitle: { fontFamily: fonts.extraBold, fontSize: 14, color: colors.text },
  levelCount: { fontFamily: fonts.bold, fontSize: 12, color: "#0F8D68" },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowInfo: { flex: 1, gap: 6 },
  rowTask: { fontFamily: fonts.extraBold, fontSize: 13, color: colors.text },
  rowDetail: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  rowScore: { fontFamily: fonts.extraBold, fontSize: 16, width: 36, textAlign: "right" },
  disclaimer: { padding: 14, backgroundColor: "#DDF6EE" },
  disclaimerText: { fontFamily: fonts.regular, fontSize: 12, color: "#0F8D68", lineHeight: 18 },
});
