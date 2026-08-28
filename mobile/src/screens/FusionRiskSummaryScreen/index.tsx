import React from "react";
import {
  View, Text, StyleSheet, StatusBar, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/AppNavigator";
import ScreenContainer from "../../components/common/ScreenContainer";
import ActivityHeader from "../../components/common/ActivityHeader";
import ClayCard from "../../components/common/ClayCard";
import PrimaryButton from "../../components/common/PrimaryButton";
import SecondaryButton from "../../components/common/SecondaryButton";
import ProgressRing from "../../components/common/ProgressRing";
import ProgressTrack from "../../components/common/ProgressTrack";
import RiskBadge from "../../components/common/RiskBadge";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "FusionRiskSummary">;
  route: RouteProp<RootStackParamList, "FusionRiskSummary">;
};

const RISK_CONFIG = {
  low: {
    title: "Low Screening Risk",
    message:
      "The completed activities show low overall dyslexia-risk indicators. Continue normal learning support and monitor progress.",
    accentColor: colors.mint,
    bar: ["#4ED9AC", colors.mint] as [string, string],
  },
  medium: {
    title: "Moderate Screening Risk",
    message:
      "Some activities showed learning-risk indicators. Continue the recommended practice plan and consider teacher or specialist review.",
    accentColor: colors.gold,
    bar: [colors.gold, "#B0791A"] as [string, string],
  },
  high: {
    title: "High Screening Risk",
    message:
      "Several activities showed stronger learning-risk indicators. This result should be reviewed with a qualified teacher, therapist, or specialist.",
    accentColor: colors.coral,
    bar: [colors.coralLight, "#F2573F"] as [string, string],
  },
};

export default function FusionRiskSummaryScreen({ navigation, route }: Props) {
  const { response } = route.params;
  const fp = response.final_prediction;
  const quality = response.quality;

  const level = (fp.final_dyslexia_risk_level as keyof typeof RISK_CONFIG) ?? "low";
  const config = RISK_CONFIG[level] ?? RISK_CONFIG.low;
  const score = Math.round((fp.overall_risk_score ?? 0) * 100);
  const reliability = quality?.fusion_reliability ?? "medium";

  const modules = [
    { label: "Speech",      value: response.fusion_features?.speech_score, color: colors.brand },
    { label: "Handwriting", value: response.fusion_features?.handwriting_score, color: colors.coral },
    { label: "Behaviour",   value: response.fusion_features?.behavior_score, color: colors.mint },
  ];

  return (
    <ScreenContainer>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <ActivityHeader
        title="Screening result"
        subtitle="Final risk summary"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ClayCard style={styles.resultCard} radius={30}>
          <ProgressRing progress={score / 100} size={92} stroke={10} value={`${score}`} label="risk" />
          <RiskBadge level={level} />
          <Text style={styles.resultTitle}>{config.title}</Text>
          <Text style={styles.resultMsg}>{config.message}</Text>
          <View style={styles.scoreRow}>
            <View style={styles.scoreStat}>
              <Text style={styles.scoreVal}>{score}%</Text>
              <Text style={styles.scoreLabel}>Risk Score</Text>
            </View>
            <View style={styles.scoreStat}>
              <Text style={styles.scoreVal}>{level.charAt(0).toUpperCase() + level.slice(1)}</Text>
              <Text style={styles.scoreLabel}>Risk Level</Text>
            </View>
            <View style={styles.scoreStat}>
              <Text style={styles.scoreVal}>{reliability.charAt(0).toUpperCase() + reliability.slice(1)}</Text>
              <Text style={styles.scoreLabel}>Reliability</Text>
            </View>
          </View>
        </ClayCard>

        <View style={styles.miniRow}>
          {modules.map((m) => (
            <ClayCard key={m.label} style={styles.miniCard} radius={20}>
              <Text style={[styles.miniVal, { color: m.color }]}>{Math.round((m.value ?? 0) * 100)}</Text>
              <Text style={styles.miniLabel}>{m.label === "Handwriting" ? "Writing" : m.label}</Text>
            </ClayCard>
          ))}
        </View>

        <ClayCard style={styles.block} radius={22}>
          <View style={styles.probHeader}>
            <Text style={styles.blockTitle}>Overall Dyslexia Risk Score</Text>
            <Text style={[styles.probValue, { color: config.accentColor }]}>{score}%</Text>
          </View>
          <ProgressTrack progress={score / 100} colors={config.bar} />
          <Text style={styles.meta}>Decision threshold: 35%</Text>
        </ClayCard>

        <Text style={styles.sectionLabel}>Module Contributions</Text>
        <ClayCard style={styles.block} radius={22}>
          {modules.map((m) => (
            <View key={m.label} style={styles.moduleRow}>
              <Text style={styles.moduleName}>{m.label}</Text>
              <View style={styles.moduleBarWrap}>
                <ProgressTrack
                  progress={m.value ?? 0}
                  colors={[m.color, m.color]}
                />
                <Text style={[styles.moduleVal, { color: m.color }]}>
                  {Math.round((m.value ?? 0) * 100)}%
                </Text>
              </View>
            </View>
          ))}
          <Text style={styles.meta}>
            Weights: Speech {Math.round((fp.weights?.speech_weight ?? 0.4) * 100)}%  ·  Writing {Math.round((fp.weights?.handwriting_weight ?? 0.35) * 100)}%  ·  Behaviour {Math.round((fp.weights?.behavior_weight ?? 0.25) * 100)}%
          </Text>
        </ClayCard>

        {reliability === "low" && (
          <ClayCard inset style={styles.noteCard} radius={18}>
            <Ionicons name="warning-outline" size={18} color={"#B0791A"} />
            <Text style={styles.noteText}>
              Fusion reliability is low due to one or more module outputs having low quality. Consider repeating the affected modules for a more accurate result.
            </Text>
          </ClayCard>
        )}

        {quality?.warnings?.length > 0 && (
          <ClayCard inset style={styles.warnList} radius={18}>
            {quality.warnings.map((w: string, i: number) => (
              <View key={i} style={styles.warnRow}>
                <Ionicons name="alert-circle-outline" size={14} color={"#B0791A"} />
                <Text style={styles.noteText}>{w}</Text>
              </View>
            ))}
          </ClayCard>
        )}

        <ClayCard inset style={styles.noteCard} radius={18}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.brand} />
          <Text style={styles.noteText}>
            This is a <Text style={styles.noteBold}>screening risk indicator only</Text> — not a clinical diagnosis. The result combines speech, handwriting, and behaviour modules. Please consult a qualified professional for a full evaluation.
          </Text>
        </ClayCard>

        <PrimaryButton
          label="View Difficulty Breakdown"
          onPress={() => navigation.navigate("FusionDifficulty", { response })}
        />
        <SecondaryButton
          label="View Therapy Plan"
          onPress={() => navigation.navigate("FusionTherapy", { response })}
        />
        <View style={{ height: 28 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 16, paddingBottom: 8, gap: 14 },
  resultCard: { alignItems: "center", padding: 24, gap: 12 },
  resultTitle: { fontFamily: fonts.extraBold, fontSize: 20, color: colors.text, textAlign: "center" },
  resultMsg: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textBody, textAlign: "center", lineHeight: 20 },
  scoreRow: { flexDirection: "row", width: "100%", backgroundColor: colors.bgInset, borderRadius: 16, paddingVertical: 12, marginTop: 4 },
  scoreStat: { flex: 1, alignItems: "center" },
  scoreVal: { fontFamily: fonts.extraBold, fontSize: 16, color: colors.text },
  scoreLabel: { fontFamily: fonts.semiBold, fontSize: 10, color: colors.textMuted, textTransform: "uppercase", marginTop: 2 },

  miniRow: { flexDirection: "row", gap: 11 },
  miniCard: { flex: 1, padding: 15 },
  miniVal: { fontFamily: fonts.extraBold, fontSize: 21 },
  miniLabel: { fontFamily: fonts.bold, fontSize: 11, color: colors.textLabel, marginTop: 2 },

  block: { padding: 16, gap: 10 },
  blockTitle: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text },
  probHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  probValue: { fontFamily: fonts.extraBold, fontSize: 20 },
  meta: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },

  sectionLabel: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.2 },
  moduleRow: { gap: 8 },
  moduleName: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.text },
  moduleBarWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  moduleVal: { fontFamily: fonts.bold, fontSize: 13, width: 36, textAlign: "right" },

  noteCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14 },
  warnList: { padding: 14, gap: 6 },
  warnRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  noteText: { flex: 1, fontFamily: fonts.semiBold, fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  noteBold: { fontFamily: fonts.bold, color: colors.text },
});
