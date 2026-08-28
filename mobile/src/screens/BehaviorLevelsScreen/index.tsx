import React, { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { auth } from "../../config/firebase";
import { BEHAVIOR_LEVELS, BehaviorLevel, behaviorLevelTaskCount, behaviorTaskIndicesForLevel } from "../../config/behaviorTasks";
import { clearModulePredictions } from "../../services/sessionService";
import { BehaviorLevelProgress, clearBehaviorLevelPredictions, fetchBehaviorLevelProgress, isBehaviorLevelUnlocked } from "../../services/behaviorLevelService";
import ScreenContainer from "../../components/common/ScreenContainer";
import ActivityHeader from "../../components/common/ActivityHeader";
import LevelCard from "../../components/common/LevelCard";
import SecondaryButton from "../../components/common/SecondaryButton";
import { colors, moduleColors } from "../../theme/colors";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "BehaviorLevels">;
};

export default function BehaviorLevelsScreen({ navigation }: Props) {
  const [progress, setProgress] = useState<BehaviorLevelProgress>({ completed: [] });
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const uid = auth.currentUser?.uid;
      if (!uid) { setLoading(false); return; }
      setLoading(true);
      fetchBehaviorLevelProgress(uid)
        .then((p) => { if (active) setProgress(p); })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [])
  );

  const startLevel = async (level: BehaviorLevel) => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      if (level.id === 1) await clearModulePredictions(uid, "behavior").catch(() => {});
      else await clearBehaviorLevelPredictions(uid, level.id).catch(() => {});
    }
    navigation.navigate("BehaviorActivity", { taskIndex: behaviorTaskIndicesForLevel(level.id)[0] });
  };

  return (
    <ScreenContainer>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <ActivityHeader
        title="Behaviour levels"
        subtitle={`${progress.completed.length} of ${BEHAVIOR_LEVELS.length} complete`}
        onBack={() => navigation.goBack()}
        onClose={() => navigation.navigate("MainTabs")}
      />
      {loading ? (
        <ActivityIndicator color={colors.mint} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {BEHAVIOR_LEVELS.map((level) => {
            const unlocked = isBehaviorLevelUnlocked(level.id, progress);
            const done = progress.completed.includes(level.id);
            const state = done ? "done" : unlocked ? "current" : "locked";
            return (
              <LevelCard
                key={level.id}
                index={level.id}
                title={level.title}
                subtitle={`${behaviorLevelTaskCount(level.id)} activities · ${level.description}`}
                stars={done ? 3 : 0}
                state={state}
                accent={moduleColors.behaviour.gradient}
                onPress={() => startLevel(level)}
              />
            );
          })}
          <SecondaryButton label="See behaviour summary" onPress={() => navigation.navigate("BehaviorSummary")} textColor={colors.mint} style={{ marginTop: 8 }} />
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 20, paddingBottom: 24, gap: 13 },
});
