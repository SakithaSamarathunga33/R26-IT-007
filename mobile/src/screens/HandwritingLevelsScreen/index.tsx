import React, { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { auth } from "../../config/firebase";
import { HANDWRITING_LEVELS, HandwritingLevel, handwritingLevelTaskCount, handwritingTaskIndicesForLevel } from "../../config/handwritingTasks";
import { clearModulePredictions } from "../../services/sessionService";
import { HandwritingLevelProgress, clearHandwritingLevelPredictions, fetchHandwritingLevelProgress, isHandwritingLevelUnlocked } from "../../services/handwritingLevelService";
import ScreenContainer from "../../components/common/ScreenContainer";
import ActivityHeader from "../../components/common/ActivityHeader";
import LevelCard from "../../components/common/LevelCard";
import SecondaryButton from "../../components/common/SecondaryButton";
import { colors, moduleColors } from "../../theme/colors";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "HandwritingLevels">;
};

export default function HandwritingLevelsScreen({ navigation }: Props) {
  const [progress, setProgress] = useState<HandwritingLevelProgress>({ completed: [] });
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const uid = auth.currentUser?.uid;
      if (!uid) { setLoading(false); return; }
      setLoading(true);
      fetchHandwritingLevelProgress(uid)
        .then((p) => { if (active) setProgress(p); })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [])
  );

  const startLevel = async (level: HandwritingLevel) => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      if (level.id === 1) await clearModulePredictions(uid, "handwriting").catch(() => {});
      else await clearHandwritingLevelPredictions(uid, level.id).catch(() => {});
    }
    navigation.navigate("HandwritingTask", { taskIndex: handwritingTaskIndicesForLevel(level.id)[0] });
  };

  return (
    <ScreenContainer>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <ActivityHeader
        title="Writing levels"
        subtitle={`${progress.completed.length} of ${HANDWRITING_LEVELS.length} complete`}
        onBack={() => navigation.goBack()}
        onClose={() => navigation.navigate("MainTabs")}
      />
      {loading ? (
        <ActivityIndicator color={colors.coral} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {HANDWRITING_LEVELS.map((level) => {
            const unlocked = isHandwritingLevelUnlocked(level.id, progress);
            const done = progress.completed.includes(level.id);
            const state = done ? "done" : unlocked ? "current" : "locked";
            return (
              <LevelCard
                key={level.id}
                index={level.id}
                title={level.title}
                subtitle={`${handwritingLevelTaskCount(level.id)} activities · ${level.description}`}
                stars={done ? 3 : 0}
                state={state}
                accent={moduleColors.handwriting.gradient}
                onPress={() => startLevel(level)}
              />
            );
          })}
          <SecondaryButton label="See writing summary" onPress={() => navigation.navigate("HandwritingSummary")} textColor={colors.coral} style={{ marginTop: 8 }} />
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 20, paddingBottom: 24, gap: 13 },
});
