import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { auth } from "../../config/firebase";
import { AssessmentRecord, getAssessmentHistory } from "../../services/sessionService";
import ScreenContainer from "../../components/common/ScreenContainer";
import ClayCard from "../../components/common/ClayCard";
import RiskBadge from "../../components/common/RiskBadge";
import PrimaryButton from "../../components/common/PrimaryButton";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";
import { clayRaised } from "../../theme/shadows";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "MainTabs">;
};

const FILTERS = ["All", "Speech", "Writing", "Behaviour"] as const;
type Filter = (typeof FILTERS)[number];

const DIFFICULTY_LABELS: Record<string, string> = {
  phonological_processing: "Phonological processing",
  handwriting: "Handwriting",
  attention_behavior: "Attention & behaviour",
};

export default function HistoryScreen({ navigation }: Props) {
  const user = auth.currentUser;
  const [history, setHistory] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AssessmentRecord | null>(null);
  const [filter, setFilter] = useState<Filter>("All");

  useFocusEffect(
    useCallback(() => {
      if (!user?.uid) return;
      setLoading(true);
      getAssessmentHistory(user.uid)
        .then(setHistory)
        .catch(() => setHistory([]))
        .finally(() => setLoading(false));
    }, [user?.uid])
  );

  const visible = useMemo(() => {
    if (filter === "All") return history;
    return history.filter((record) => {
      const label = record.primaryDifficulty ?? "";
      if (filter === "Speech") return label.includes("phon");
      if (filter === "Writing") return label.includes("hand");
      return label.includes("attention") || label.includes("behavior");
    });
  }, [filter, history]);

  return (
    <ScreenContainer padded={false}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <View style={styles.page}>
        <Text style={styles.title}>History</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((item) => {
            const on = filter === item;
            return (
              <TouchableOpacity
                key={item}
                onPress={() => setFilter(item)}
                style={[styles.chip, on ? styles.chipOn : clayRaised("sm")]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.brand} />
            <Text style={styles.muted}>Loading history…</Text>
          </View>
        ) : visible.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyTitle}>No assessments yet</Text>
            <Text style={styles.emptySub}>Complete all three games and run the combined analysis to see reports here.</Text>
            <PrimaryButton label="Go to screening" onPress={() => navigation.navigate("FusionProgress")} style={{ alignSelf: "stretch" }} />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {visible.map((record) => {
              const level = record.riskLevel ?? "low";
              const score = Math.round((record.overallScore ?? 0) * 100);
              const dateStr = record.completedAt?.toDate
                ? record.completedAt.toDate().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                : "—";
              const diff = DIFFICULTY_LABELS[record.primaryDifficulty] ?? record.primaryDifficulty ?? "Full screening";
              return (
                <TouchableOpacity key={record.id} activeOpacity={0.85} onPress={() => setSelected(record)}>
                  <ClayCard style={styles.card} radius={22}>
                    <View style={styles.cardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>Full screening</Text>
                        <Text style={styles.cardSub}>{diff} · {dateStr}</Text>
                      </View>
                      <RiskBadge level={level} />
                    </View>
                    <Text style={styles.score}>{score}% overall risk</Text>
                  </ClayCard>
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 16 }} />
          </ScrollView>
        )}
      </View>

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setSelected(null)} />
          {selected && (
            <View style={styles.sheet}>
              <View style={styles.handle} />
              <View style={styles.sheetHead}>
                <Text style={styles.sheetTitle}>Full report</Text>
                <TouchableOpacity onPress={() => setSelected(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.sheetRisk}>
                  {(selected.riskLevel ?? "low").toString()} risk · {Math.round((selected.overallScore ?? 0) * 100)}%
                </Text>
                <Text style={styles.sheetBody}>
                  Primary difficulty: {DIFFICULTY_LABELS[selected.primaryDifficulty] ?? selected.primaryDifficulty ?? "—"}
                </Text>
                <PrimaryButton
                  label="Open combined report"
                  onPress={() => {
                    const response = selected.fullReport;
                    setSelected(null);
                    if (response) navigation.navigate("FusionReport", { response });
                  }}
                  style={{ marginTop: 16 }}
                />
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 22, paddingTop: 8 },
  title: { fontFamily: fonts.extraBold, fontSize: 25, letterSpacing: -0.4, color: colors.text, marginBottom: 14 },
  filters: { gap: 8, paddingBottom: 14 },
  chip: { paddingHorizontal: 15, paddingVertical: 9, borderRadius: 14, backgroundColor: colors.bgSoft },
  chipOn: { backgroundColor: colors.brand },
  chipText: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.textSecondary },
  chipTextOn: { color: "#fff" },
  list: { gap: 12, paddingBottom: 20 },
  card: { padding: 16 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardTitle: { fontFamily: fonts.extraBold, fontSize: 15, color: colors.text },
  cardSub: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  score: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.brand, marginTop: 10 },
  centered: { flex: 1, justifyContent: "center", gap: 12, paddingBottom: 40 },
  muted: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted, textAlign: "center" },
  emptyTitle: { fontFamily: fonts.extraBold, fontSize: 20, color: colors.text, textAlign: "center" },
  emptySub: { fontFamily: fonts.medium, fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20 },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(30,42,58,0.4)" },
  sheet: {
    backgroundColor: colors.bgSoft,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 36,
    maxHeight: "70%",
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.bgDeep, alignSelf: "center", marginBottom: 14 },
  sheetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sheetTitle: { fontFamily: fonts.extraBold, fontSize: 18, color: colors.text },
  sheetRisk: { fontFamily: fonts.extraBold, fontSize: 16, color: colors.text, textTransform: "capitalize" },
  sheetBody: { fontFamily: fonts.medium, fontSize: 14, color: colors.textSecondary, marginTop: 8 },
});
