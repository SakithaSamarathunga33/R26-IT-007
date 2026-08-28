import React, { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { auth } from "../../config/firebase";
import { SPEECH_LEVELS, SpeechLevel, levelTaskCount, taskIndicesForLevel } from "../../config/speechTasks";
import { clearModulePredictions } from "../../services/sessionService";
import { SpeechLevelProgress, clearLevelPredictions, fetchLevelProgress, isLevelUnlocked } from "../../services/speechLevelService";
import ScreenContainer from "../../components/common/ScreenContainer";
import ActivityHeader from "../../components/common/ActivityHeader";
import LevelCard from "../../components/common/LevelCard";
import SecondaryButton from "../../components/common/SecondaryButton";
import { colors } from "../../theme/colors";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "SpeechLevels">;
};

export default function SpeechLevelsScreen({ navigation }: Props) {
  const [progress, setProgress] = useState<SpeechLevelProgress>({ completed: [] });
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setLoading(false);
        return;
      }
      setLoading(true);
      fetchLevelProgress(uid)
        .then((p) => { if (active) setProgress(p); })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [])
  );

  const startLevel = async (level: SpeechLevel) => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      if (level.id === 1) await clearModulePredictions(uid, "speech").catch(() => {});
      else await clearLevelPredictions(uid, level.id).catch(() => {});
    }
    navigation.navigate("SpeechActivity", { taskIndex: taskIndicesForLevel(level.id)[0] });
  };

  const firstLocked = SPEECH_LEVELS.find((l) => !isLevelUnlocked(l.id, progress) && !progress.completed.includes(l.id));
  const current = SPEECH_LEVELS.find((l) => isLevelUnlocked(l.id, progress) && !progress.completed.includes(l.id)) ?? firstLocked;

  return (
    <ScreenContainer>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <ActivityHeader
        title="Speech levels"
        subtitle={`${progress.completed.length} of ${SPEECH_LEVELS.length} complete`}
        onBack={() => navigation.goBack()}
        onClose={() => navigation.navigate("MainTabs")}
      />
      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {SPEECH_LEVELS.map((level) => {
            const unlocked = isLevelUnlocked(level.id, progress);
            const done = progress.completed.includes(level.id);
            const state = done ? "done" : current?.id === level.id && unlocked ? "current" : unlocked ? "current" : "locked";
            return (
              <LevelCard
                key={level.id}
                index={level.id}
                title={level.title}
                subtitle={`${levelTaskCount(level.id)} activities · ${level.description}`}
                stars={done ? 3 : 0}
                state={state}
                onPress={() => startLevel(level)}
              />
            );
          })}
          <SecondaryButton label="See speech summary" onPress={() => navigation.navigate("SpeechSummary")} style={{ marginTop: 8 }} />
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 20, paddingBottom: 24, gap: 13 },
});
