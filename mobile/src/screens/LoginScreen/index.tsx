import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { auth } from "../../config/firebase";
import { RootStackParamList } from "../../navigation/AppNavigator";
import ScreenContainer from "../../components/common/ScreenContainer";
import ClayIconButton from "../../components/common/ClayIconButton";
import ClayInput from "../../components/common/ClayInput";
import PrimaryButton from "../../components/common/PrimaryButton";
import Toast from "../../components/Toast";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Login">;
};

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "error" as "error" | "success" | "warning" });

  const showToast = (message: string, type: "error" | "success" | "warning" = "error") =>
    setToast({ visible: true, message, type });

  const handleLogin = async () => {
    if (!email || !password) {
      showToast("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
    } catch (error: any) {
      if (error.code === "auth/too-many-requests") {
        showToast("Too many attempts. Please try again later.", "warning");
      } else {
        const msg =
          error.code === "auth/invalid-credential" || error.code === "auth/wrong-password"
            ? "Incorrect email or password."
            : error.code === "auth/user-not-found"
              ? "No account found with this email."
              : error.message;
        showToast(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer contentStyle={styles.flex}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast((t) => ({ ...t, visible: false }))} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <ClayIconButton glyph="‹" onPress={() => navigation.goBack()} accessibilityLabel="Go back" />
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.sub}>Sign in to see your child's reports.</Text>

          <View style={styles.form}>
            <ClayInput
              label="Email"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <ClayInput
              label="Password"
              placeholder="Your password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
              trailingLabel={showPassword ? "Hide" : "Show"}
              onTrailingPress={() => setShowPassword((v) => !v)}
            />
            <TouchableOpacity style={styles.forgot} accessibilityRole="button">
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
            <PrimaryButton label="Log in" onPress={handleLogin} loading={loading} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>New here? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
              <Text style={styles.footerLink}>Create an account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingTop: 8, paddingBottom: 24 },
  title: { fontFamily: fonts.extraBold, fontSize: 28, letterSpacing: -0.4, color: colors.text, marginTop: 26 },
  sub: { fontFamily: fonts.medium, fontSize: 14, color: colors.textSecondary, marginTop: 6 },
  form: { marginTop: 28, gap: 14 },
  forgot: { alignSelf: "flex-end" },
  forgotText: { fontFamily: fonts.bold, fontSize: 13, color: colors.brand },
  footer: { marginTop: "auto", paddingTop: 24, flexDirection: "row", justifyContent: "center" },
  footerText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textSecondary },
  footerLink: { fontFamily: fonts.bold, fontSize: 14, color: colors.brand },
});
