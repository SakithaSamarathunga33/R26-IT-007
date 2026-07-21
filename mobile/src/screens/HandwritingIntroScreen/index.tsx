import React from "react";
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { theme } from "../../theme";
import {
  HANDWRITING_TASKS, HANDWRITING_LEVELS, handwritingLevelTaskCount,
} from "../../config/handwritingTasks";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "HandwritingIntro">;
};

const STEPS = [
  { icon: "eye-outline" as const,    title: "See the Task",       desc: "A letter or word is shown on screen as the target.",          color: "#2563EB", bg: "#EFF6FF" },
  { icon: "pencil-outline" as const, title: "Write It",           desc: "Use the canvas to write, or take a photo of paper writing.",   color: "#7C3AED", bg: "#F5F3FF" },
  { icon: "analytics-outline" as const, title: "AI Analyses",     desc: "Your handwriting is checked for patterns and formation.",      color: "#059669", bg: "#ECFDF5" },
];

const CHIPS = [
  { icon: "layers-outline" as const, label: `${HANDWRITING_LEVELS.length} levels` },
  { icon: "list-outline" as const,   label: `${HANDWRITING_TASKS.length} activities` },
  { icon: "pencil-outline" as const, label: "Canvas or photo" },
];

export default function HandwritingIntroScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Handwriting Screening</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <LinearGradient colors={["#2563EB", "#1D4ED8"]} style={styles.heroCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.decoCircle1} />
          <View style={styles.decoCircle2} />
          <View style={styles.heroIconWrap}>
            <Ionicons name="create-outline" size={48} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>Handwriting{"\n"}Pattern Analysis</Text>
          <Text style={styles.heroSub}>AI-powered handwriting screening for dyslexia indicators</Text>
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
          We'll show letters and words for your child to copy or write, split into three levels that get harder as you go. The app analyses letter formation, spacing, and consistency — no pressure, just write naturally!
        </Text>

        {/* Levels overview */}
        <Text style={styles.sectionLabel}>Three levels</Text>
        <View style={styles.levelsCard}>
          {HANDWRITING_LEVELS.map((lvl, i) => (
            <View key={lvl.id} style={[styles.levelRow, i < HANDWRITING_LEVELS.length - 1 && styles.levelRowBorder]}>
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
                <Text style={[styles.levelCountText, { color: lvl.color }]}>{handwritingLevelTaskCount(lvl.id)}</Text>
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
            <Ionicons name="information-circle-outline" size={20} color="#2563EB" />
          </View>
          <Text style={styles.noticeText}>
            This is a screening tool, not a diagnosis. Results are indicators only and should be reviewed by a qualified professional.
          </Text>
        </View>

        <LinearGradient colors={["#2563EB", "#1D4ED8"]} style={styles.startBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <TouchableOpacity
            style={styles.startBtnInner}
            activeOpacity={0.88}
            onPress={() => navigation.navigate("HandwritingLevels")}
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
    shadowColor: "#2563EB", shadowOpacity: 0.28, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 10,
  },
  decoCircle1: { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.07)", top: -50, right: -40 },
  decoCircle2: { position: "absolute", width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(255,255,255,0.05)", bottom: -20, left: 10 },
  heroIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 3, borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  heroTitle: { fontSize: 24, fontFamily: theme.fonts.extraBold, color: "#fff", textAlign: "center", lineHeight: 32, marginBottom: 6 },
  heroSub: { fontSize: 13, fontFamily: theme.fonts.regular, color: "rgba(255,255,255,0.75)", marginBottom: 20, textAlign: "center" },
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
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE",
    borderRadius: 16, padding: 14, marginBottom: 24,
  },
  noticeIconWrap: { marginTop: 1 },
  noticeText: { flex: 1, fontSize: 13, fontFamily: theme.fonts.regular, color: "#1D4ED8", lineHeight: 19 },

  startBtn: {
    borderRadius: 50,
    shadowColor: "#2563EB", shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  startBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18 },
  startBtnText: { fontSize: 16, fontFamily: theme.fonts.bold, color: "#fff" },
});
