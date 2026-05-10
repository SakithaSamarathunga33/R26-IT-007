import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Welcome">;
};

const { width, height } = Dimensions.get("window");

const LANGUAGES = ["EN", "SI", "TA"] as const;
type Language = typeof LANGUAGES[number];

export default function WelcomeScreen({ navigation }: Props) {
  const [lang, setLang] = useState<Language>("EN");

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Full screen hero image */}
      <Image
        source={require("../../assets/hero-child.jpg")}
        style={styles.heroImage}
        resizeMode="cover"
      />

      {/* Full screen dark gradient overlay — transparent top, dark bottom */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.92)"]}
        style={styles.overlay}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0.2, 0.55, 1]}
      />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.appNameRow}>
          <Text style={styles.appName}>Lex</Text>
          <Image
            source={require("../../assets/child_icon.png")}
            style={styles.appNameChildIcon}
            resizeMode="contain"
          />
          <Text style={styles.appName}>
            <Text style={styles.appNameAccent}>Scan</Text>
          </Text>
        </View>

        <View style={styles.langSwitcher}>
          {LANGUAGES.map((l) => (
            <TouchableOpacity key={l} onPress={() => setLang(l)} activeOpacity={0.75}>
              <View style={[styles.langPill, lang === l && styles.langPillActive]}>
                <Text style={[styles.langOption, lang === l && styles.langOptionActive]}>
                  {l}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Bottom content */}
      <View style={styles.bottomContent}>
        {/* Badge */}
        <View style={styles.badge}>
          <Ionicons name="sparkles" size={12} color="#93C5FD" />
          <Text style={styles.badgeText}>AI-Powered Dyslexia Screening</Text>
        </View>

        <Text style={styles.headline}>
          Every Child{"\n"}Deserves to{"\n"}
          <Text style={styles.headlineAccent}>Thrive</Text>
        </Text>

        <Text style={styles.subtext}>
          Detect dyslexia early and support every child's learning journey with AI.
        </Text>

        {/* CTA button */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate("Onboarding")}
          activeOpacity={0.88}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>

        {/* Sign in row */}
        <View style={styles.signinRow}>
          <Text style={styles.signinText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")} activeOpacity={0.75}>
            <Text style={styles.signinLink}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.appVersion}>LexiScan v1.1.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  heroImage: {
    position: "absolute",
    width,
    height,
  },

  overlay: {
    position: "absolute",
    width,
    height,
  },

  /* Top bar */
  topBar: {
    position: "absolute",
    top: 58,
    left: 24,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  appNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  appName: {
    fontSize: 26,
    fontFamily: "Outfit_700Bold",
    color: "#fff",
    letterSpacing: 0.3,
  },
  appNameAccent: {
    color: "#fff",
  },
  appNameChildIcon: {
    width: 22,
    height: 28,
    marginHorizontal: 1,
    tintColor: "#fff",
  },
  langSwitcher: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  langPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 14,
  },
  langPillActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  langOption: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontFamily: "Outfit_600SemiBold",
  },
  langOptionActive: {
    color: "#fff",
  },

  /* Bottom content */
  bottomContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    paddingBottom: 52,
    gap: 14,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 4,
  },
  badgeText: {
    color: "#93C5FD",
    fontSize: 12,
    fontFamily: "Outfit_500Medium",
  },

  headline: {
    fontSize: 44,
    fontFamily: "Outfit_800ExtraBold",
    color: "#fff",
    lineHeight: 54,
  },
  headlineAccent: {
    color: "#60A5FA",
    fontFamily: "Outfit_800ExtraBold",
  },

  subtext: {
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 22,
    fontFamily: "Outfit_400Regular",
    marginBottom: 6,
  },

  primaryButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#3B82F6",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Outfit_700Bold",
  },

  signinRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signinText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
  },
  signinLink: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
  },

  appVersion: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 11,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
  },
});
