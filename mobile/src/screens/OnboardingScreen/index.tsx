import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  StatusBar,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Onboarding">;
};

const { width, height } = Dimensions.get("window");

const SLIDES = [
  {
    key: "speech",
    icon: "ear-outline",
    color: "#2563EB",
    bg: "#EFF6FF",
    iconBg: "#DBEAFE",
    title: "Speech Analysis",
    description:
      "Record your child speaking and let our AI detect phonological patterns that may indicate early signs of dyslexia.",
  },
  {
    key: "handwriting",
    icon: "pencil-outline",
    color: "#7C3AED",
    bg: "#F5F3FF",
    iconBg: "#EDE9FE",
    title: "Handwriting Detection",
    description:
      "Upload handwriting samples and our model analyzes letter reversals, spacing, and formation to flag potential indicators.",
  },
  {
    key: "behavior",
    icon: "happy-outline",
    color: "#0891B2",
    bg: "#ECFEFF",
    iconBg: "#CFFAFE",
    title: "Behavior Screening",
    description:
      "Answer a short questionnaire about your child's reading and learning behaviors for a comprehensive behavioral assessment.",
  },
  {
    key: "report",
    icon: "bar-chart-outline",
    color: "#D97706",
    bg: "#FFFBEB",
    iconBg: "#FEF3C7",
    title: "Risk Reports",
    description:
      "Get a detailed AI-generated risk report with a clear risk score and actionable next steps tailored to your child.",
  },
  {
    key: "therapy",
    icon: "heart-outline",
    color: "#059669",
    bg: "#ECFDF5",
    iconBg: "#D1FAE5",
    title: "Therapy Guidance",
    description:
      "Access personalized therapy exercises and resources recommended based on your child's unique screening results.",
  },
] as const;

export default function OnboardingScreen({ navigation }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const isLast = activeIndex === SLIDES.length - 1;

  const goNext = () => {
    if (isLast) {
      navigation.navigate("Signup");
      return;
    }
    const next = activeIndex + 1;
    flatListRef.current?.scrollToIndex({ index: next, animated: true });
    setActiveIndex(next);
  };

  const skip = () => navigation.navigate("Signup");

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Skip */}
      <View style={styles.topRow}>
        <TouchableOpacity onPress={skip} activeOpacity={0.7} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            {/* Illustration area */}
            <View style={[styles.illustrationBox, { backgroundColor: item.bg }]}>
              <View style={[styles.iconCircleOuter, { backgroundColor: item.iconBg }]}>
                <View style={[styles.iconCircleInner, { backgroundColor: item.color + "22" }]}>
                  <Ionicons name={item.icon as any} size={64} color={item.color} />
                </View>
              </View>
              {/* Decorative dots */}
              <View style={[styles.decoDot, styles.decoDotTL, { backgroundColor: item.color + "33" }]} />
              <View style={[styles.decoDot, styles.decoDotBR, { backgroundColor: item.color + "22" }]} />
              <View style={[styles.decoDot, styles.decoDotTR, { backgroundColor: item.color + "18" }]} />
            </View>

            {/* Text */}
            <View style={styles.textBlock}>
              <Text style={[styles.slideTitle, { color: item.color }]}>{item.title}</Text>
              <Text style={styles.slideDesc}>{item.description}</Text>
            </View>
          </View>
        )}
      />

      {/* Bottom area */}
      <View style={styles.bottom}>
        {/* Dot indicators */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: "clamp",
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: "clamp",
            });
            const color = SLIDES[activeIndex].color;
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, opacity, backgroundColor: color }]}
              />
            );
          })}
        </View>

        {/* Next / Get Started button */}
        <TouchableOpacity onPress={goNext} activeOpacity={0.88} style={styles.nextBtnWrapper}>
          <LinearGradient
            colors={[SLIDES[activeIndex].color, SLIDES[activeIndex].color + "CC"]}
            style={styles.nextBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.nextBtnText}>
              {isLast ? "Get Started" : "Next"}
            </Text>
            <Ionicons
              name={isLast ? "checkmark" : "arrow-forward"}
              size={18}
              color="#fff"
              style={styles.nextBtnIcon}
            />
          </LinearGradient>
        </TouchableOpacity>

        {/* Sign in link */}
        <View style={styles.signinRow}>
          <Text style={styles.signinText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")} activeOpacity={0.75}>
            <Text style={[styles.signinLink, { color: SLIDES[activeIndex].color }]}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  /* Top */
  topRow: {
    paddingTop: 58,
    paddingHorizontal: 24,
    alignItems: "flex-end",
  },
  skipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
  },
  skipText: {
    fontSize: 13,
    fontFamily: "Outfit_600SemiBold",
    color: "#6B7280",
  },

  /* Slide */
  slide: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 28,
  },
  illustrationBox: {
    width: width - 56,
    height: height * 0.36,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 36,
    overflow: "hidden",
    position: "relative",
  },
  iconCircleOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  decoDot: {
    position: "absolute",
    borderRadius: 999,
  },
  decoDotTL: {
    width: 80,
    height: 80,
    top: -20,
    left: -20,
  },
  decoDotBR: {
    width: 100,
    height: 100,
    bottom: -30,
    right: -30,
  },
  decoDotTR: {
    width: 50,
    height: 50,
    top: 20,
    right: 20,
  },

  /* Text */
  textBlock: {
    alignItems: "center",
    gap: 12,
  },
  slideTitle: {
    fontSize: 26,
    fontFamily: "Outfit_800ExtraBold",
    textAlign: "center",
  },
  slideDesc: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },

  /* Bottom */
  bottom: {
    paddingHorizontal: 28,
    paddingBottom: 44,
    gap: 20,
    alignItems: "center",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtnWrapper: {
    width: "100%",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 50,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
    gap: 8,
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Outfit_600SemiBold",
  },
  nextBtnIcon: {},
  signinRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  signinText: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    color: "#6B7280",
  },
  signinLink: {
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
  },
});
