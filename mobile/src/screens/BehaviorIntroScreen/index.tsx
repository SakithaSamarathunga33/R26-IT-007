import React from "react";
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { theme } from "../../theme";
import {
  BEHAVIOR_TASKS, BEHAVIOR_LEVELS, behaviorLevelTaskCount,
} from "../../config/behaviorTasks";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "BehaviorIntro">;
};

const STEPS = [
  { icon: "volume-high-outline" as const, title: "Listen to the Question", desc: "The app reads every question out loud — tap to hear it again.", color: "#0891B2", bg: "#ECFEFF" },
  { icon: "finger-print-outline" as const, title: "Tap Your Answer", desc: "Tap the option you think is correct. Hints are there if you need them.", color: "#7C3AED", bg: "#F5F3FF" },
  { icon: "analytics-outline" as const, title: "AI Analyses", desc: "Your attention and engagement are measured.", color: "#059669", bg: "#ECFDF5" },
];

const CHIPS = [
  { icon: "layers-outline" as const, label: `${BEHAVIOR_LEVELS.length} levels` },
  { icon: "list-outline" as const, label: `${BEHAVIOR_TASKS.length} activities` },
  { icon: "volume-high-outline" as const, label: "Read aloud" },
];

export default function BehaviorIntroScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Behaviour Screening</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <LinearGradient colors={["#0891B2", "#0E7490"]} style={styles.heroCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.decoCircle1} />
          <View style={styles.decoCircle2} />
          <View style={styles.heroIconWrap}>
            <Ionicons name="happy-outline" size={48} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>Behaviour &{"\n"}Attention Activity</Text>
          <Text style={styles.heroSub}>AI-powered attention & engagement screening</Text>
          <View style={styles.chipsRow}>
            {CHIPS.map((c, i) => (
              <View key={i} style={styles.chip}>
                <Ionicons name={c.icon} size={12} color="#fff" />
                <Text style={styles.chipText}>{c.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <Text style={styles.descText}>
          We'll present short tasks to observe how your child focuses and responds, split into three levels that get harder as you go. Every question is read out loud. There's no pressure — just tap what feels right!
        </Text>

        {/* Levels overview */}
        <Text style={styles.sectionLabel}>Three levels</Text>
        <View style={styles.levelsCard}>
          {BEHAVIOR_LEVELS.map((lvl, i) => (
            <View key={lvl.id} style={[styles.levelRow, i < BEHAVIOR_LEVELS.length - 1 && styles.levelRowBorder]}>
              <LinearGradient
                colors={lvl.gradColors}
                style={styles.levelNumWrap}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <Text style={styles.levelNumText}>{lvl.id}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.levelRowTitle}>{lvl.title}</Text>
                <Text style={styles.levelRowDesc}>{lvl.description}</Text>
              </View>
              <View style={[styles.levelCountChip, { backgroundColor: lvl.bg }]}>
                <Text style={[styles.levelCountText, { color: lvl.color }]}>{behaviorLevelTaskCount(lvl.id)}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>How it works</Text>
        <View style={styles.stepsCard}>
          {STEPS.map((step, i) => (
            <View key={i} style={[styles.stepRow, i < STEPS.length - 1 && styles.stepRowBorder]}>
              <View style={[styles.stepIconWrap, { backgroundColor: step.bg }]}>
                <Ionicons name={step.icon} size={20} color={step.color} />
              </View>
              <View style={styles.stepText}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
              <View style={[styles.stepNum, { backgroundColor: step.bg }]}>
                <Text style={[styles.stepNumText, { color: step.color }]}>{i + 1}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.noticeCard}>
          <View style={styles.noticeIconWrap}>
            <Ionicons name="information-circle-outline" size={20} color="#0891B2" />
          </View>
          <Text style={styles.noticeText}>
            This is a screening tool, not a diagnosis. Results are indicators only and should be reviewed by a professional.
          </Text>
        </View>

        <LinearGradient colors={["#0891B2", "#0E7490"]} style={styles.startBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <TouchableOpacity
            style={styles.startBtnInner}
            activeOpacity={0.88}
            onPress={() => navigation.navigate("BehaviorLevels")}
          >
            <Ionicons name="layers" size={20} color="#fff" />
            <Text style={styles.startBtnText}>Choose a Level</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        <View style={{ height: 40 }} />
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

  heroCard: {
    borderRadius: 24, padding: 28, alignItems: "center", marginBottom: 24,
    overflow: "hidden",
    shadowColor: "#0891B2", shadowOpacity: 0.28, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 10,
  },
  decoCircle1: { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.07)", top: -50, right: -40 },
  decoCircle2: { position: "absolute", width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(255,255,255,0.05)", bottom: -20, left: 10 },
  heroIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 3, borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  heroTitle: { fontSize: 24, fontFamily: theme.fonts.extraBold, color: "#fff", textAlign: "center", lineHeight: 32, marginBottom: 6 },
  heroSub: { fontSize: 13, fontFamily: theme.fonts.regular, color: "rgba(255,255,255,0.75)", marginBottom: 20 },
  chipsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  chipText: { fontSize: 11, fontFamily: theme.fonts.medium, color: "#fff" },

  descText: { fontSize: 14, fontFamily: theme.fonts.regular, color: "#64748B", lineHeight: 22, marginBottom: 24, textAlign: "center" },
  sectionLabel: { fontSize: 11, fontFamily: theme.fonts.semiBold, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 },

  levelsCard: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 20, marginBottom: 24, overflow: "hidden",
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  levelRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  levelRowBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  levelNumWrap: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  levelNumText: { fontSize: 17, fontFamily: theme.fonts.extraBold, color: "#fff" },
  levelRowTitle: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: "#1E293B", marginBottom: 2 },
  levelRowDesc: { fontSize: 12, fontFamily: theme.fonts.regular, color: "#64748B", lineHeight: 17 },
  levelCountChip: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  levelCountText: { fontSize: 13, fontFamily: theme.fonts.bold },

  stepsCard: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 20, marginBottom: 16, overflow: "hidden",
    shadowColor: "#94A3B8", shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  stepRow: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  stepRowBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  stepIconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  stepText: { flex: 1 },
  stepTitle: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: "#1E293B", marginBottom: 2 },
  stepDesc: { fontSize: 12, fontFamily: theme.fonts.regular, color: "#64748B", lineHeight: 17 },
  stepNum: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  stepNumText: { fontSize: 12, fontFamily: theme.fonts.bold },

  noticeCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: "#ECFEFF", borderWidth: 1, borderColor: "#CFFAFE",
    borderRadius: 16, padding: 14, marginBottom: 24,
  },
  noticeIconWrap: { marginTop: 1 },
  noticeText: { flex: 1, fontSize: 13, fontFamily: theme.fonts.regular, color: "#0E7490", lineHeight: 19 },

  startBtn: {
    borderRadius: 50,
    shadowColor: "#0891B2", shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  startBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18 },
  startBtnText: { fontSize: 16, fontFamily: theme.fonts.bold, color: "#fff" },
});
