import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";

const { width } = Dimensions.get("window");
const COL = (width - 44 - 10) / 2;
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { theme } from "../../theme";
import { auth } from "../../config/firebase";
import { useFocusEffect } from "@react-navigation/native";
import { getOrCreateSession, SessionProgress } from "../../services/sessionService";
import { ActiveTherapyPlan, fetchActiveTherapyPlan } from "../../services/therapySessionService";


type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Home">;
};

const MODULES = [
  {
    key: "speech",
    icon: "ear-outline" as const,
    label: "Speech",
    sublabel: "Phonological",
    duration: "~5 min",
    color: "#fff",
    textColor: "#fff",
    subColor: "rgba(255,255,255,0.75)",
    gradColors: ["#2563EB", "#1D4ED8"] as [string, string],
    iconBg: "rgba(255,255,255,0.2)",
    badgeBg: "rgba(255,255,255,0.2)",
    badgeColor: "#fff",
    status: "active" as const,
    route: "SpeechIntro" as const,
  },
  {
    key: "handwriting",
    icon: "pencil-outline" as const,
    label: "Writing",
    sublabel: "Handwriting",
    duration: "~6 min",
    color: "#fff",
    textColor: "#fff",
    subColor: "rgba(255,255,255,0.75)",
    gradColors: ["#7C3AED", "#6D28D9"] as [string, string],
    iconBg: "rgba(255,255,255,0.2)",
    badgeBg: "rgba(255,255,255,0.2)",
    badgeColor: "#fff",
    status: "active" as const,
    route: "HandwritingIntro" as const,
  },
  {
    key: "behaviour",
    icon: "happy-outline" as const,
    label: "Behaviour",
    sublabel: "Attention",
    duration: "~4 min",
    color: "#fff",
    textColor: "#fff",
    subColor: "rgba(255,255,255,0.75)",
    gradColors: ["#0891B2", "#0E7490"] as [string, string],
    iconBg: "rgba(255,255,255,0.2)",
    badgeBg: "rgba(255,255,255,0.2)",
    badgeColor: "#fff",
    status: "active" as const,
    route: "BehaviorIntro" as const,
  },
];

export default function HomeScreen({ navigation }: Props) {
  const user = auth.currentUser;
  const firstName = user?.displayName?.split(" ")[0] ?? "there";

  const [session, setSession] = useState<SessionProgress>({
    speechDone: false, handwritingDone: false, behaviourDone: false, status: "in_progress",
  });

  const [therapyPlan, setTherapyPlan] = useState<ActiveTherapyPlan | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user?.uid) return;
      getOrCreateSession(user.uid).then(setSession).catch(() => {});
      // Re-read on focus so finishing a practice session updates the card.
      fetchActiveTherapyPlan(user.uid).then(setTherapyPlan).catch(() => setTherapyPlan(null));
    }, [user?.uid])
  );

  // Modules stay locked while a therapy plan is unfinished, so the screening
  // cycle runs screen → practise → re-screen rather than back-to-back screenings.
  const modulesLocked = !!therapyPlan?.blocking;

  const moduleDone: Record<string, boolean> = {
    speech: session.speechDone,
    handwriting: session.handwritingDone,
    behaviour: session.behaviourDone,
  };
  const completedCount = Object.values(moduleDone).filter(Boolean).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <View style={styles.avatarWrap}>
            <LinearGradient
              colors={["#2563EB", "#3B72F6"]}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {firstName.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          </View>
          <View style={styles.topBarRight}>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="search-outline" size={20} color="#1E293B" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="notifications-outline" size={20} color="#1E293B" />
              <View style={styles.notifDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Hero title ── */}
        <View style={styles.heroWrap}>
          <Text style={styles.heroLine1}>Your Screening</Text>
          <View style={styles.heroLine2Row}>
            <Text style={styles.heroLine2Bold}>Dashboard</Text>
            <View style={styles.heroBadge}>
              <Ionicons name="sparkles" size={13} color="#2563EB" />
            </View>
          </View>
          <Text style={styles.heroSub}>
            Hi {firstName}, track your child's dyslexia screening progress.
          </Text>
        </View>

        {/* ── Progress card (blue, full width) ── */}
        <LinearGradient
          colors={["#3B72F6", "#2563EB"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.progressCard}
        >
          {/* bg decorations */}
          <View style={styles.decoCircleLg} />
          <View style={styles.decoCircleSm} />

          <View style={styles.progressTop}>
            <View>
              <Text style={styles.progressLabel}>Overall Progress</Text>
              <Text style={styles.progressName}>{firstName}</Text>
            </View>
            <TouchableOpacity style={styles.progressCalBtn}>
              <Ionicons name="calendar-outline" size={16} color="#2563EB" />
            </TouchableOpacity>
          </View>

          <View style={styles.progressGrid}>
            {[
              { label: "Completed", value: `${completedCount}`, sub: "modules" },
              { label: "Remaining", value: `${3 - completedCount}`, sub: "modules" },
              { label: "Progress", value: `${Math.round((completedCount / 3) * 100)}%`, sub: "done" },
            ].map((item, i) => (
              <View key={i} style={styles.progressGridItem}>
                <Text style={styles.progressGridVal}>{item.value}</Text>
                <Text style={styles.progressGridLabel}>{item.label}</Text>
                <Text style={styles.progressGridSub}>{item.sub}</Text>
              </View>
            ))}
          </View>

          {/* Progress bar */}
          <View style={styles.barBg}>
            <View
              style={[
                styles.barFill,
                { width: `${Math.max((completedCount / 3) * 100, 4)}%` },
              ]}
            />
          </View>
        </LinearGradient>

        {/* ── Therapy plan card — hidden once the plan is over ──
             An ended or finished plan has nothing left to do, so the card would
             just be clutter competing with the modules the child should return
             to. It reappears when the next report creates a new plan. */}
        {therapyPlan?.blocking && (
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.therapyCard}
            onPress={() => navigation.navigate("FusionTherapy", {
              response: therapyPlan.response,
              reportId: therapyPlan.reportId,
            })}
          >
            <LinearGradient
              colors={["#7C3AED", "#6D28D9"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.therapyGrad}
            >
              <View style={styles.tcDeco} />
              <View style={styles.tcTop}>
                <View style={styles.tcIconWrap}>
                  <Ionicons name="barbell-outline" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tcTitle}>Your Practice Plan</Text>
                  <Text style={styles.tcSub} numberOfLines={1}>
                    {therapyPlan.primaryFocus}
                  </Text>
                </View>
                <Text style={styles.tcCount}>
                  {therapyPlan.doneCount}/{therapyPlan.target}
                </Text>
              </View>
              <View style={styles.tcTrack}>
                <View
                  style={[
                    styles.tcFill,
                    { width: `${Math.min(100, (therapyPlan.doneCount / therapyPlan.target) * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.tcHint}>
                {therapyPlan.target - therapyPlan.doneCount} sessions left · tap to practise
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── Modules grid ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Assessment Modules</Text>
          <View style={styles.sectionPill}>
            <Text style={styles.sectionPillText}>{modulesLocked ? "Locked" : "3 total"}</Text>
          </View>
        </View>

        {modulesLocked && (
          <View style={styles.lockNotice}>
            <Ionicons name="lock-closed" size={16} color="#7C3AED" />
            <Text style={styles.lockNoticeText}>
              Finish your practice plan before screening again.
            </Text>
          </View>
        )}

        <View style={styles.moduleGrid}>
          {MODULES.map((mod, idx) => {
            const isActive = mod.status === "active" && !modulesLocked;
            const isDone = isActive && moduleDone[mod.key];
            const isWide = idx === 2;
            return (
              <TouchableOpacity
                key={mod.key}
                activeOpacity={isActive ? 0.82 : 1}
                disabled={!isActive}
                style={[styles.moduleCard, isWide && styles.moduleCardWide, modulesLocked && styles.moduleCardLocked]}
                onPress={() => isActive && mod.route && navigation.navigate(mod.route as any)}
              >
                <LinearGradient
                  colors={modulesLocked ? ["#CBD5E1", "#94A3B8"] : mod.gradColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.moduleCardGrad, isWide && styles.moduleCardGradWide]}
                >
                  {/* Subtle deco circle */}
                  <View style={styles.mcDeco} />

                  {/* Top row: icon + status badge */}
                  <View style={styles.mcTop}>
                    <View style={[styles.mcIconWrap, { backgroundColor: mod.iconBg }]}>
                      <Ionicons
                        name={modulesLocked ? "lock-closed" : isDone ? "checkmark" : mod.icon}
                        size={20}
                        color="#fff"
                      />
                    </View>
                    {isDone ? (
                      <View style={styles.mcDoneBadge}>
                        <Ionicons name="checkmark-circle" size={11} color="#4ADE80" />
                        <Text style={styles.mcDoneText}>Done</Text>
                      </View>
                    ) : (
                      <View style={[styles.mcActiveBadge, { backgroundColor: mod.badgeBg }]}>
                        <View style={styles.mcDot} />
                        <Text style={[styles.mcActiveText, { color: mod.badgeColor }]}>Active</Text>
                      </View>
                    )}
                  </View>

                  {/* Label */}
                  <Text style={[styles.mcLabel, { color: mod.textColor }]}>{mod.label}</Text>
                  <Text style={[styles.mcSub, { color: mod.subColor }]}>{mod.sublabel}</Text>

                  {/* Bottom row: duration + arrow */}
                  <View style={styles.mcBottom}>
                    <View style={[styles.mcDurationPill, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                      <Ionicons name="time-outline" size={10} color="rgba(255,255,255,0.85)" />
                      <Text style={[styles.mcDuration, { color: "rgba(255,255,255,0.85)" }]}>
                        {mod.duration}
                      </Text>
                    </View>
                    <View style={[styles.mcArrow, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                      <Ionicons name="arrow-forward" size={12} color="#fff" />
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── AI Report card ── */}
        <Text style={styles.sectionTitle2}>AI Risk Report</Text>

        <View style={styles.reportCard}>
          <View style={styles.reportLeft}>
            <View style={styles.reportIconWrap}>
              <Ionicons name="analytics" size={24} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.reportTitle}>Dyslexia Risk{"\n"}Assessment</Text>
              <Text style={styles.reportDesc}>
                Complete all 3 modules to generate your personalised AI report.
              </Text>
            </View>
          </View>

          {/* Step dots */}
          <View style={styles.reportSteps}>
            {MODULES.map((m, i) => {
              const done = moduleDone[m.key];
              return (
                <React.Fragment key={m.key}>
                  <View style={styles.reportStep}>
                    <View
                      style={[
                        styles.reportStepCircle,
                        done && styles.reportStepCircleDone,
                      ]}
                    >
                      {done ? (
                        <Ionicons name="checkmark" size={10} color="#fff" />
                      ) : (
                        <Text style={styles.reportStepNum}>{i + 1}</Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.reportStepLabel,
                        done && styles.reportStepLabelDone,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </View>
                  {i < MODULES.length - 1 && (
                    <View
                      style={[
                        styles.reportLine,
                        done && styles.reportLineDone,
                      ]}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>

          {/* Unlock button — locked until all 3 modules are done */}
          <TouchableOpacity
            activeOpacity={completedCount === 3 ? 0.85 : 1}
            disabled={completedCount < 3}
            onPress={() => completedCount === 3 && navigation.navigate("FusionProgress")}
          >
            <LinearGradient
              colors={completedCount === 3 ? ["#3B72F6", "#2563EB"] : ["#E2E8F0", "#E2E8F0"]}
              style={styles.unlockBtn}
            >
              <Ionicons
                name={completedCount === 3 ? "analytics" : "lock-closed"}
                size={14}
                color={completedCount === 3 ? "#fff" : "#94A3B8"}
              />
              <Text style={[styles.unlockBtnText, completedCount === 3 && styles.unlockBtnTextActive]}>
                {completedCount === 3 ? "Run Final Analysis" : `${completedCount}/3 Modules Done`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FF",
  },
  scroll: {
    paddingHorizontal: 22,
  },

  /* Top bar */
  topBar: {
    paddingTop: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  avatarWrap: {
    shadowColor: "#2563EB",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 6,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: "#fff",
  },
  topBarRight: {
    flexDirection: "row",
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#94A3B8",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  notifDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#2563EB",
    borderWidth: 1.5,
    borderColor: "#fff",
  },

  /* Hero */
  heroWrap: {
    marginBottom: 24,
  },
  heroLine1: {
    fontSize: 34,
    fontFamily: theme.fonts.regular,
    color: "#1E293B",
    lineHeight: 42,
  },
  heroLine2Row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  heroLine2Bold: {
    fontSize: 34,
    fontFamily: theme.fonts.extraBold,
    color: "#1E293B",
    lineHeight: 42,
  },
  heroBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E8EFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  heroSub: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: "#64748B",
    marginTop: 8,
    lineHeight: 20,
  },

  /* Progress card */
  progressCard: {
    borderRadius: 26,
    padding: 22,
    marginBottom: 28,
    overflow: "hidden",
    shadowColor: "#2563EB",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 12,
  },
  decoCircleLg: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -60,
    right: -40,
  },
  decoCircleSm: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -30,
    left: 10,
  },
  progressTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    color: "rgba(255,255,255,0.65)",
    marginBottom: 2,
  },
  progressName: {
    fontSize: 20,
    fontFamily: theme.fonts.bold,
    color: "#fff",
  },
  progressCalBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  progressGrid: {
    flexDirection: "row",
    gap: 0,
    marginBottom: 18,
  },
  progressGridItem: {
    flex: 1,
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.15)",
  },
  progressGridVal: {
    fontSize: 26,
    fontFamily: theme.fonts.extraBold,
    color: "#fff",
    lineHeight: 30,
  },
  progressGridLabel: {
    fontSize: 10,
    fontFamily: theme.fonts.semiBold,
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  progressGridSub: {
    fontSize: 10,
    fontFamily: theme.fonts.regular,
    color: "rgba(255,255,255,0.45)",
  },
  barBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  barFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
    minWidth: 16,
  },

  /* Section header */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: "#1E293B",
  },
  sectionPill: {
    backgroundColor: "#E8EFFF",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sectionPillText: {
    fontSize: 10,
    fontFamily: theme.fonts.semiBold,
    color: "#2563EB",
  },

  /* Therapy plan card */
  therapyCard: {
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#7C3AED",
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 8,
  },
  therapyGrad: { padding: 18, overflow: "hidden" },
  tcDeco: {
    position: "absolute", width: 120, height: 120, borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.08)", top: -40, right: -25,
  },
  tcTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  tcIconWrap: {
    width: 40, height: 40, borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center",
  },
  tcTitle: { fontSize: 15, fontFamily: theme.fonts.bold, color: "#fff", marginBottom: 2 },
  tcSub: { fontSize: 12, fontFamily: theme.fonts.regular, color: "rgba(255,255,255,0.8)" },
  tcCount: { fontSize: 18, fontFamily: theme.fonts.extraBold, color: "#fff" },
  tcTrack: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.25)", marginBottom: 8 },
  tcFill: { height: 6, borderRadius: 3, backgroundColor: "#fff" },
  tcHint: { fontSize: 11, fontFamily: theme.fonts.medium, color: "rgba(255,255,255,0.85)" },

  lockNotice: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#F5F3FF", borderWidth: 1, borderColor: "#EDE9FE",
    borderRadius: 14, padding: 12, marginBottom: 12,
  },
  lockNoticeText: { flex: 1, fontSize: 12, fontFamily: theme.fonts.medium, color: "#6D28D9" },

  moduleCardLocked: { shadowOpacity: 0.05, elevation: 1 },

  /* Module grid */
  moduleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 28,
  },
  moduleCard: {
    width: COL,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#94A3B8",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  moduleCardWide: {
    width: "100%",
  },
  moduleCardGrad: {
    padding: 16,
    gap: 8,
    minHeight: 164,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  moduleCardGradWide: {
    minHeight: 112,
  },
  mcDeco: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.08)",
    bottom: -30,
    right: -20,
  },
  mcTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mcIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  mcDoneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(74,222,128,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  mcDoneText: {
    fontSize: 10,
    fontFamily: theme.fonts.semiBold,
    color: "#4ADE80",
  },
  mcActiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  mcDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#4ADE80",
  },
  mcActiveText: {
    fontSize: 10,
    fontFamily: theme.fonts.semiBold,
  },
  mcLabel: {
    fontSize: 17,
    fontFamily: theme.fonts.bold,
    marginTop: 4,
  },
  mcSub: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  mcBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  mcDurationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  mcDuration: {
    fontSize: 10,
    fontFamily: theme.fonts.medium,
  },
  mcArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Report card */
  sectionTitle2: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: "#1E293B",
    marginBottom: 14,
  },
  reportCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    gap: 16,
    shadowColor: "#94A3B8",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 4,
  },
  reportLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  reportIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#E8EFFF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  reportTitle: {
    fontSize: 17,
    fontFamily: theme.fonts.bold,
    color: "#1E293B",
    lineHeight: 24,
    marginBottom: 4,
  },
  reportDesc: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: "#64748B",
    lineHeight: 18,
  },
  reportSteps: {
    flexDirection: "row",
    alignItems: "center",
  },
  reportStep: {
    alignItems: "center",
    gap: 4,
  },
  reportStepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  reportStepCircleDone: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  reportStepNum: {
    fontSize: 10,
    fontFamily: theme.fonts.bold,
    color: "#94A3B8",
  },
  reportStepLabel: {
    fontSize: 9,
    fontFamily: theme.fonts.medium,
    color: "#94A3B8",
  },
  reportStepLabelDone: {
    color: "#2563EB",
  },
  reportLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: "#E2E8F0",
    marginBottom: 20,
  },
  reportLineDone: {
    backgroundColor: "#2563EB",
  },
  unlockBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    paddingVertical: 16,
  },
  unlockBtnText: {
    fontSize: 15,
    fontFamily: theme.fonts.semiBold,
    color: "#94A3B8",
  },
  unlockBtnTextActive: {
    color: "#fff",
  },
});
