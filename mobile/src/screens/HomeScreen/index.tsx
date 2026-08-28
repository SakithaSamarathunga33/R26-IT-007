import React, { useCallback, useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CompositeNavigationProp, useFocusEffect } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { doc, getDoc } from "firebase/firestore";
import { RootStackParamList, TabParamList } from "../../navigation/AppNavigator";
import { auth, db } from "../../config/firebase";
import { getOrCreateSession, SessionProgress } from "../../services/sessionService";
import { ActiveTherapyPlan, fetchActiveTherapyPlan } from "../../services/therapySessionService";
import ScreenContainer from "../../components/common/ScreenContainer";
import ModuleTile from "../../components/common/ModuleTile";
import ProgressRing from "../../components/common/ProgressRing";
import ClayCard from "../../components/common/ClayCard";
import { colors, moduleColors } from "../../theme/colors";
import { fonts } from "../../theme/typography";
import { clayRaised } from "../../theme/shadows";

type Props = {
  navigation: CompositeNavigationProp<
    BottomTabNavigationProp<TabParamList, "Home">,
    NativeStackNavigationProp<RootStackParamList>
  >;
};

function formatToday() {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}

function ageFromDob(dob?: string | null) {
  if (!dob) return null;
  const [y, m, d] = dob.split("-").map(Number);
  if (!y || !m || !d) return null;
  const birth = new Date(y, m - 1, d);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

export default function HomeScreen({ navigation }: Props) {
  const user = auth.currentUser;
  const firstName = user?.displayName?.split(" ")[0] ?? "there";

  const [session, setSession] = useState<SessionProgress>({
    speechDone: false,
    handwritingDone: false,
    behaviourDone: false,
    status: "in_progress",
  });
  const [therapyPlan, setTherapyPlan] = useState<ActiveTherapyPlan | null>(null);
  const [childAge, setChildAge] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user?.uid) return;
      getOrCreateSession(user.uid).then(setSession).catch(() => {});
      fetchActiveTherapyPlan(user.uid).then(setTherapyPlan).catch(() => setTherapyPlan(null));
      getDoc(doc(db, "users", user.uid))
        .then((snap) => setChildAge(ageFromDob(snap.data()?.dateOfBirth)))
        .catch(() => {});
    }, [user?.uid])
  );

  const modulesLocked = !!therapyPlan?.blocking;
  const completedCount = [session.speechDone, session.handwritingDone, session.behaviourDone].filter(Boolean).length;
  const progress = completedCount / 3;

  const speechStatus = modulesLocked ? "locked" : session.speechDone ? "done" : "play";
  const writingStatus = modulesLocked ? "locked" : session.handwritingDone ? "done" : "play";
  const behaviourStatus = modulesLocked ? "locked" : session.behaviourDone ? "done" : "play";

  return (
    <ScreenContainer edges={["top", "left", "right"]} padded={false}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hello}>
          <View>
            <Text style={styles.date}>{formatToday()}</Text>
            <Text style={styles.hi}>Hi, {firstName}</Text>
          </View>
          <View style={[styles.avatar, clayRaised("sm")]}>
            <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
          </View>
        </View>

        <ClayCard style={styles.progressCard} radius={26}>
          <ProgressRing progress={progress} />
          <View style={styles.progressCopy}>
            <Text style={styles.childName}>
              {firstName}
              {childAge != null ? `, ${childAge}` : ""}
            </Text>
            <Text style={styles.progressSub}>
              Screening round · {completedCount} of 3 games complete
            </Text>
            <View style={styles.pills}>
              <View style={styles.pillBlue}>
                <Text style={styles.pillBlueText}>{modulesLocked ? "Practice first" : "Today"}</Text>
              </View>
              <View style={styles.pillMint}>
                <Text style={styles.pillMintText}>{completedCount * 12} stars</Text>
              </View>
            </View>
          </View>
        </ClayCard>

        {therapyPlan?.blocking && (
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.plan, clayRaised("md")]}
            onPress={() =>
              navigation.navigate("FusionTherapy", {
                response: therapyPlan.response,
                reportId: therapyPlan.reportId,
              })
            }
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.planTitle}>Your practice plan</Text>
              <Text style={styles.planSub} numberOfLines={2}>{therapyPlan.primaryFocus}</Text>
            </View>
            <Text style={styles.planCount}>
              {therapyPlan.doneCount}/{therapyPlan.target}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.section}>Today's screening</Text>
        <View style={styles.tiles}>
          <ModuleTile
            title="Say it with Lexi"
            subtitle={session.speechDone ? "Speech · complete" : "Speech · about 3 min"}
            icon="mic"
            gradient={moduleColors.speech.gradient}
            status={speechStatus}
            onPress={() => navigation.navigate("SpeechIntro")}
          />
          <ModuleTile
            title="Trace with Lexi"
            subtitle={session.handwritingDone ? "Handwriting · complete" : "Handwriting · about 4 min"}
            icon="pencil"
            gradient={moduleColors.handwriting.gradient}
            status={writingStatus}
            onPress={() => navigation.navigate("HandwritingIntro")}
          />
          <ModuleTile
            title="Sort with Lexi"
            subtitle={
              modulesLocked
                ? "Behaviour · finish practice first"
                : session.behaviourDone
                  ? "Behaviour · complete"
                  : "Behaviour · about 2 min"
            }
            icon="grid"
            gradient={moduleColors.behaviour.gradient}
            status={behaviourStatus}
            onPress={() => navigation.navigate("BehaviorIntro")}
          />
        </View>

        <TouchableOpacity
          activeOpacity={completedCount === 3 ? 0.88 : 1}
          disabled={completedCount < 3}
          onPress={() => completedCount === 3 && navigation.navigate("FusionProgress")}
          style={[styles.report, completedCount < 3 && styles.reportWait]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.reportTitle}>Combined report</Text>
            <Text style={styles.reportSub}>
              {completedCount === 3 ? "All three games are done. Run the analysis." : "Ready once all three games are done today."}
            </Text>
          </View>
          <View style={styles.reportArrow}>
            <Ionicons name={completedCount === 3 ? "chevron-forward" : "lock-closed"} size={16} color="#fff" />
          </View>
        </TouchableOpacity>
        <View style={{ height: 24 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 8, gap: 16 },
  hello: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  date: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textMuted },
  hi: { fontFamily: fonts.extraBold, fontSize: 25, letterSpacing: -0.4, color: colors.text },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: colors.bgSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fonts.extraBold, fontSize: 18, color: colors.brand },
  progressCard: { flexDirection: "row", alignItems: "center", gap: 16, padding: 18 },
  progressCopy: { flex: 1 },
  childName: { fontFamily: fonts.extraBold, fontSize: 17, color: colors.text },
  progressSub: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary, marginTop: 3, lineHeight: 18 },
  pills: { flexDirection: "row", gap: 5, marginTop: 9, flexWrap: "wrap" },
  pillBlue: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, backgroundColor: colors.brandTint },
  pillBlueText: { fontFamily: fonts.bold, fontSize: 10.5, color: colors.brandText },
  pillMint: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, backgroundColor: colors.mintTint },
  pillMintText: { fontFamily: fonts.bold, fontSize: 10.5, color: colors.mint },
  plan: {
    backgroundColor: colors.bgSoft,
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  planTitle: { fontFamily: fonts.extraBold, fontSize: 16, color: colors.text },
  planSub: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary, marginTop: 3 },
  planCount: { fontFamily: fonts.extraBold, fontSize: 18, color: colors.brand },
  section: { fontFamily: fonts.extraBold, fontSize: 15, color: colors.text },
  tiles: { gap: 11 },
  report: {
    backgroundColor: colors.navyMid,
    borderRadius: 24,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  reportWait: { opacity: 0.92 },
  reportTitle: { fontFamily: fonts.extraBold, fontSize: 16, color: "#fff" },
  reportSub: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.navyText, marginTop: 3, lineHeight: 18 },
  reportArrow: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
});
