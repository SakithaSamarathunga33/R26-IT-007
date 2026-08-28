import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, StatusBar, ScrollView, ActivityIndicator } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import {
  HANDWRITING_TASKS, HANDWRITING_TASK_TYPE_LABELS,
  HANDWRITING_LEVELS, HandwritingLevel, HandwritingLevelId,
  HandwritingTaskType, handwritingLevelTaskCount,
} from "../../config/handwritingTasks";
import { auth } from "../../config/firebase";
import { markModuleDone } from "../../services/sessionService";
import { fetchModuleSummary, ModuleSummary, RiskLevel, SummaryRow } from "../../services/summaryService";
import { HandwritingLevelProgress, fetchHandwritingLevelProgress } from "../../services/handwritingLevelService";
import ScreenContainer from "../../components/common/ScreenContainer";
import ActivityHeader from "../../components/common/ActivityHeader";
import ClayCard from "../../components/common/ClayCard";
import PrimaryButton from "../../components/common/PrimaryButton";
import SecondaryButton from "../../components/common/SecondaryButton";
import ProgressTrack from "../../components/common/ProgressTrack";
import RiskBadge from "../../components/common/RiskBadge";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "HandwritingSummary">;
};

const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const OVERALL_COPY: Record<RiskLevel, { label: string; sublabel: string }> = {
  low:             { label: "On track",          sublabel: "Letter shapes are age-appropriate. Grip pressure may still vary." },
  medium:          { label: "Needs a look",      sublabel: "Some handwriting patterns noted. A review may help." },
  high:            { label: "Needs support",     sublabel: "Multiple patterns noted. Specialist evaluation recommended." },
  requires_review: { label: "Review required",   sublabel: "Some activities had incomplete data." },
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

function BarRow({ label, value, color }: { label: string; value: number; color: [string, string] }) {
  return (
    <View style={barStyles.row}>
      <View style={barStyles.head}>
        <Text style={barStyles.label}>{label}</Text>
        <Text style={[barStyles.value, { color: color[1] }]}>{Math.round(value * 100)}</Text>
      </View>
      <ProgressTrack progress={value} colors={color} />
    </View>
  );
}

const barStyles = StyleSheet.create({
  row: { gap: 7, marginBottom: 14 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  label: { fontFamily: fonts.extraBold, fontSize: 12.5, color: colors.textBody },
  value: { fontFamily: fonts.extraBold, fontSize: 12.5 },
});

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
      <ScreenContainer>
        <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
        <ActivityHeader title="Writing summary" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          {loading ? (
            <ActivityIndicator size="large" color="#FF6B57" />
          ) : (
            <Text style={styles.empty}>No results found for this session.</Text>
          )}
        </View>
      </ScreenContainer>
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
  const avgAlignment  = count ? rows.reduce((s, r) => s + num(r.features.alignment_score), 0) / count : 0;
  const totalReversals = rows.reduce((s, r) => s + (num(r.features.reversal_risk ?? r.features.reversal_count ?? r.features.reversal_flag) > 0 ? 1 : 0), 0);
  const copy = OVERALL_COPY[overallLevel];
  const completedLevels = HANDWRITING_LEVELS.filter((l) => levelProgress.completed.includes(l.id));
  const subtitle = completedLevels.length
    ? `Levels ${completedLevels.map((l) => l.id).join("–")}`
    : `${completedCount} tasks`;

  const barColor = (v: number): [string, string] =>
    v >= 0.7 ? ["#4ED9AC", "#0F8D68"] : v >= 0.5 ? ["#F5B32E", "#B0791A"] : ["#FF9A8D", "#F2573F"];

  return (
    <ScreenContainer>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <ActivityHeader
        title="Writing summary"
        subtitle={subtitle}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ClayCard style={styles.hero} radius={26}>
          <RiskBadge level={overallLevel === "requires_review" ? "medium" : overallLevel} />
          <Text style={styles.heroTitle}>{copy.label}</Text>
          <Text style={styles.heroSub}>{copy.sublabel}</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{Math.round(avgQuality * 100)}</Text>
              <Text style={styles.heroStatLabel}>Quality</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{Math.round(avgSimilarity * 100)}</Text>
              <Text style={styles.heroStatLabel}>Shape</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{completedCount}/{attemptedTaskTotal}</Text>
              <Text style={styles.heroStatLabel}>Done</Text>
            </View>
          </View>
        </ClayCard>

        {nextLevel && (
          <ClayCard style={styles.partial} radius={18}>
            <Text style={styles.partialTitle}>
              {remainingLevels.length} level{remainingLevels.length > 1 ? "s" : ""} still to go
            </Text>
            <Text style={styles.partialSub}>
              These results cover the levels played so far. Finish Level {nextLevel.id} to complete the writing module.
            </Text>
          </ClayCard>
        )}

        <ClayCard style={styles.breakCard} radius={24}>
          <Text style={styles.breakTitle}>Breakdown</Text>
          <BarRow label="Letter formation" value={avgSimilarity} color={barColor(avgSimilarity)} />
          <BarRow label="Writing quality" value={avgQuality} color={barColor(avgQuality)} />
          <BarRow label="Spacing & alignment" value={avgAlignment} color={barColor(avgAlignment)} />
          <BarRow label="Overall risk score" value={avgProb} color={barColor(1 - avgProb)} />
          <View style={barStyles.row}>
            <View style={barStyles.head}>
              <Text style={barStyles.label}>Letter reversals</Text>
              <Text style={[barStyles.value, { color: totalReversals >= 2 ? "#C6493A" : colors.mint }]}>
                {totalReversals} of {completedCount || 0}
              </Text>
            </View>
            <ProgressTrack
              progress={completedCount ? totalReversals / completedCount : 0}
              colors={totalReversals >= 2 ? ["#FF9A8D", "#F2573F"] : ["#4ED9AC", "#0F8D68"]}
            />
          </View>
        </ClayCard>

        <View style={styles.note}>
          <View style={styles.infoDot}><Text style={styles.infoMark}>i</Text></View>
          <Text style={styles.noteText}>
            These results are screening indicators only. They are not a diagnosis. Occasional reversals are typical at this age and are weighted lightly in the combined score.
          </Text>
        </View>

        {groups.map((group) => (
          <ClayCard key={group.level.id} style={styles.levelCard} radius={22}>
            <View style={styles.levelHead}>
              <Text style={styles.levelTitle}>{group.level.title}</Text>
              <Text style={styles.levelCount}>
                {group.items.length}/{handwritingLevelTaskCount(group.level.id)}
              </Text>
            </View>
            {group.items.map(({ row, text, typeLabel, key }) => {
              const quality = num(row.features.writing_quality_score);
              return (
                <View key={key} style={styles.taskRow}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={styles.taskName}>{typeLabel}{text ? `  “${text}”` : ""}</Text>
                    <ProgressTrack progress={quality} colors={barColor(quality)} />
                  </View>
                  <RiskBadge level={row.risk_level === "requires_review" ? "medium" : row.risk_level} />
                </View>
              );
            })}
          </ClayCard>
        ))}
      </ScrollView>

      <View style={styles.actions}>
        {nextLevel ? (
          <PrimaryButton
            label={`Continue to Level ${nextLevel.id}`}
            onPress={() => navigation.navigate("HandwritingLevels")}
            colors={["#FF9A8D", "#FF7A6B"]}
          />
        ) : (
          <PrimaryButton
            label="Next game"
            onPress={() => navigation.navigate("MainTabs")}
            colors={["#3FDCA8", "#12B583"]}
          />
        )}
        {nextLevel && (
          <SecondaryButton
            label="Back to Dashboard"
            onPress={() => navigation.navigate("MainTabs")}
            textColor="#FF6B57"
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { fontFamily: fonts.regular, color: colors.textSecondary },
  content: { paddingTop: 20, paddingBottom: 16, gap: 14 },
  hero: { padding: 20 },
  heroTitle: { fontFamily: fonts.extraBold, fontSize: 22, color: colors.text, marginTop: 12 },
  heroSub: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textSecondary, marginTop: 8, lineHeight: 19 },
  heroStats: { flexDirection: "row", gap: 10, marginTop: 18 },
  heroStat: {
    flex: 1,
    backgroundColor: colors.bgInset,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  heroStatVal: { fontFamily: fonts.extraBold, fontSize: 20, color: colors.text },
  heroStatLabel: { fontFamily: fonts.bold, fontSize: 10, color: colors.textLabel, marginTop: 2, textTransform: "uppercase" },
  partial: { padding: 16, backgroundColor: "#FFF4D6" },
  partialTitle: { fontFamily: fonts.semiBold, fontSize: 14, color: "#92400E", marginBottom: 4 },
  partialSub: { fontFamily: fonts.regular, fontSize: 12, color: "#B45309", lineHeight: 17 },
  breakCard: { padding: 20 },
  breakTitle: { fontFamily: fonts.extraBold, fontSize: 14.5, color: colors.text, marginBottom: 16 },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 15,
    borderRadius: 18,
    backgroundColor: colors.bgInset,
  },
  infoDot: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.textMuted,
    alignItems: "center", justifyContent: "center", marginTop: 1,
  },
  infoMark: { fontFamily: fonts.extraBold, fontSize: 11, color: "#fff" },
  noteText: { flex: 1, fontFamily: fonts.semiBold, fontSize: 11.5, color: colors.textSecondary, lineHeight: 18 },
  levelCard: { padding: 16, gap: 12 },
  levelHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  levelTitle: { fontFamily: fonts.extraBold, fontSize: 14, color: colors.text },
  levelCount: { fontFamily: fonts.semiBold, fontSize: 12, color: colors.textMuted },
  taskRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  taskName: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.text },
  actions: { gap: 12, marginBottom: 10 },
});
