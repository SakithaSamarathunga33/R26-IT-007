import React from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import ScreenContainer from "../../components/common/ScreenContainer";
import PrimaryButton from "../../components/common/PrimaryButton";
import SecondaryButton from "../../components/common/SecondaryButton";
import MascotGuide from "../../components/common/MascotGuide";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Welcome">;
};

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <ScreenContainer contentStyle={styles.content}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <View style={styles.hero}>
        <MascotGuide state="waving" size={186} tint="#E4EEFC" />
        <Text style={styles.title}>Three short games.{"\n"}One clear picture.</Text>
        <Text style={styles.sub}>
          LexiScan looks at speech, handwriting and attention to flag early learning difficulties.
        </Text>
      </View>
      <View style={styles.actions}>
        <PrimaryButton label="Get started" onPress={() => navigation.navigate("Onboarding")} />
        <SecondaryButton label="I already have an account" onPress={() => navigation.navigate("Login")} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 34, paddingBottom: 16 },
  hero: { flex: 1, alignItems: "center", paddingTop: 12 },
  title: {
    marginTop: 36,
    fontFamily: fonts.extraBold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.6,
    color: colors.text,
    textAlign: "center",
  },
  sub: {
    marginTop: 14,
    maxWidth: 290,
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: "center",
  },
  actions: { gap: 14, paddingBottom: 8 },
});
