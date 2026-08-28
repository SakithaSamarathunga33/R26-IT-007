import React from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import ScreenContainer from "./ScreenContainer";
import ActivityHeader from "./ActivityHeader";
import MascotGuide from "./MascotGuide";
import ClayCard from "./ClayCard";
import PrimaryButton from "./PrimaryButton";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Step = { title: string };

type Props = {
  title: string;
  headline: string;
  subtitle: string;
  steps: Step[];
  cta: string;
  mascot?: React.ComponentProps<typeof MascotGuide>["state"];
  tint?: string;
  gradient?: [string, string];
  accent?: [string, string];
  onBack: () => void;
  onClose: () => void;
  onContinue: () => void;
};

export default function IntroLayout({
  title,
  headline,
  subtitle,
  steps,
  cta,
  mascot = "waving",
  tint = "#D3E3F9",
  gradient = ["#E4EEFC", colors.bg],
  accent,
  onBack,
  onClose,
  onContinue,
}: Props) {
  return (
    <LinearGradient colors={gradient} style={styles.flex}>
      <ScreenContainer backgroundColor="transparent" contentStyle={styles.content}>
        <StatusBar barStyle="dark-content" />
        <ActivityHeader title={title} onBack={onBack} onClose={onClose} />
        <View style={styles.hero}>
          <MascotGuide state={mascot} tint={tint} />
          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.sub}>{subtitle}</Text>
        </View>
        <View style={styles.steps}>
          {steps.map((step, i) => (
            <ClayCard key={step.title} style={styles.step} radius={20}>
              <View style={styles.num}>
                <Text style={styles.numText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step.title}</Text>
            </ClayCard>
          ))}
        </View>
        <PrimaryButton label={cta} onPress={onContinue} colors={accent} style={styles.cta} />
      </ScreenContainer>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: 8, paddingBottom: 12 },
  hero: { alignItems: "center", paddingTop: 26 },
  headline: { marginTop: 28, fontFamily: fonts.extraBold, fontSize: 29, letterSpacing: -0.5, color: colors.text, textAlign: "center" },
  sub: { marginTop: 8, fontFamily: fonts.medium, fontSize: 15, color: colors.textSecondary, textAlign: "center" },
  steps: { marginTop: 26, gap: 11 },
  step: { flexDirection: "row", alignItems: "center", gap: 13, padding: 15 },
  num: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
  },
  numText: { fontFamily: fonts.extraBold, fontSize: 15, color: colors.brand },
  stepText: { flex: 1, fontFamily: fonts.semiBold, fontSize: 14, color: colors.textBody, lineHeight: 20 },
  cta: { marginTop: "auto", marginBottom: 8 },
});
