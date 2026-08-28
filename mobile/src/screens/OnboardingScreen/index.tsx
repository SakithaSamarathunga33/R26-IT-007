import React, { useRef, useState } from "react";
import { FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View, ViewToken, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import ScreenContainer from "../../components/common/ScreenContainer";
import PrimaryButton from "../../components/common/PrimaryButton";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";
import { clayRaised } from "../../theme/shadows";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Onboarding">;
};

const SLIDES = [
  {
    key: "play",
    icon: "game-controller-outline" as const,
    title: "Play, don't test",
    body: "Each game takes two to four minutes. Your child hears a prompt, responds, and Lexi cheers them on. No scores are shown to them.",
  },
  {
    key: "speech",
    icon: "mic-outline" as const,
    title: "Say it with Lexi",
    body: "Short speech games listen for how sounds are made. Your child just repeats words — nothing to study beforehand.",
  },
  {
    key: "write",
    icon: "pencil-outline" as const,
    title: "Trace with Lexi",
    body: "A large canvas captures letter shape, speed and reversals. Fingers or a stylus both work.",
  },
  {
    key: "focus",
    icon: "grid-outline" as const,
    title: "Sort with Lexi",
    body: "Quick matching games look at attention and persistence, not whether the child already knows the answer.",
  },
  {
    key: "report",
    icon: "document-text-outline" as const,
    title: "A parent-only report",
    body: "When all three games are done, LexiScan combines them into a risk summary and a practice plan you can start the same day.",
  },
];

export default function OnboardingScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<(typeof SLIDES)[number]>>(null);
  const slideWidth = Math.min(width, 560);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) setIndex(viewableItems[0].index);
  }).current;

  const goNext = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
      return;
    }
    navigation.navigate("Signup");
  };

  return (
    <ScreenContainer padded={false} contentStyle={styles.content}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <View style={styles.top}>
        <View style={{ width: 44 }} />
        <TouchableOpacity onPress={() => navigation.navigate("Signup")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: slideWidth }]}>
            <View style={[styles.art, clayRaised("md")]}>
              <Ionicons name={item.icon} size={64} color={colors.brand} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <PrimaryButton label={index === SLIDES.length - 1 ? "Create account" : "Next"} onPress={goNext} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 16 },
  top: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 26, paddingTop: 8 },
  skip: { fontFamily: fonts.bold, fontSize: 14, color: colors.textMuted },
  slide: { paddingHorizontal: 26, alignItems: "center" },
  art: {
    width: "100%",
    height: 220,
    borderRadius: 32,
    backgroundColor: colors.bgSoft,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  title: {
    marginTop: 34,
    fontFamily: fonts.extraBold,
    fontSize: 27,
    letterSpacing: -0.4,
    color: colors.text,
    textAlign: "center",
  },
  body: {
    marginTop: 12,
    maxWidth: 300,
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 23,
    color: colors.textSecondary,
    textAlign: "center",
  },
  footer: { paddingHorizontal: 26, gap: 18, paddingBottom: 8 },
  dots: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.bgDeep },
  dotActive: { width: 26, backgroundColor: colors.brand },
});
