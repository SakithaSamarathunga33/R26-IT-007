import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../config/firebase";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Toast from "../../components/Toast";
import { theme } from "../../theme";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Login">;
};

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "error" as "error" | "success" | "warning" });

  const showToast = (message: string, type: "error" | "success" | "warning" = "error") =>
    setToast({ visible: true, message, type });

  const handleLogin = async () => {
    if (!email || !password) { showToast("Please enter your email and password."); return; }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
    } catch (error: any) {
      if (error.code === "auth/too-many-requests") {
        showToast("Too many attempts. Please try again later.", "warning");
      } else {
        const msg = error.code === "auth/invalid-credential" || error.code === "auth/wrong-password"
          ? "Incorrect email or password."
          : error.code === "auth/user-not-found"
          ? "No account found with this email."
          : error.message;
        showToast(msg);
      }
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast((t) => ({ ...t, visible: false }))} />

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={20} color="#1E293B" />
      </TouchableOpacity>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Hero badge */}
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={13} color="#2563EB" />
            <Text style={styles.heroBadgeText}>LexiScan</Text>
          </View>

          <Text style={styles.title}>Welcome{"\n"}Back 👋</Text>
          <Text style={styles.subtitle}>Sign in to continue your screening journey</Text>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={[styles.inputWrapper, focusedField === "email" && styles.inputFocused]}>
                <View style={styles.inputIcon}>
                  <Ionicons name="mail-outline" size={18} color={focusedField === "email" ? "#2563EB" : "#94A3B8"} />
                </View>
                <TextInput
                  style={styles.inputInner}
                  placeholder="you@example.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputWrapper, focusedField === "password" && styles.inputFocused]}>
                <View style={styles.inputIcon}>
                  <Ionicons name="lock-closed-outline" size={18} color={focusedField === "password" ? "#2563EB" : "#94A3B8"} />
                </View>
                <TextInput
                  style={styles.inputInner}
                  placeholder="Your password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.forgotRow}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <LinearGradient colors={["#3B72F6", "#2563EB"]} style={styles.primaryButton} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <TouchableOpacity style={styles.primaryButtonInner} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Text style={styles.primaryButtonText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FF" },
  flex: { flex: 1 },
  backBtn: {
    position: "absolute", top: 54, left: 20, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
    shadowColor: "#94A3B8", shadowOpacity: 0.12, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 3,
  },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 120, paddingBottom: 48 },

  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE",
    alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, marginBottom: 20,
  },
  heroBadgeText: { fontSize: 12, fontFamily: theme.fonts.semiBold, color: "#2563EB" },

  title: { fontSize: 34, fontFamily: theme.fonts.extraBold, color: "#1E293B", lineHeight: 44, marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#64748B", fontFamily: theme.fonts.regular, marginBottom: 36, lineHeight: 22 },

  form: { gap: 18 },
  fieldGroup: { gap: 8 },
  label: { fontSize: 13, fontFamily: theme.fonts.semiBold, color: "#374151" },

  inputWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 16,
    borderWidth: 1.5, borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    shadowColor: "#94A3B8", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  inputIcon: { marginRight: 10 },
  inputInner: { flex: 1, paddingVertical: 15, fontSize: 15, color: "#1E293B", fontFamily: theme.fonts.regular },
  eyeBtn: { paddingLeft: 8, paddingVertical: 4 },
  inputFocused: { borderColor: "#2563EB", backgroundColor: "#FAFCFF" },

  forgotRow: { alignItems: "flex-end", marginTop: -4 },
  forgotText: { color: "#2563EB", fontSize: 13, fontFamily: theme.fonts.medium },

  primaryButton: {
    borderRadius: 50, marginTop: 4,
    shadowColor: "#2563EB", shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  primaryButtonInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18 },
  primaryButtonText: { color: "#fff", fontSize: 16, fontFamily: theme.fonts.semiBold },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 28 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E2E8F0" },
  dividerText: { fontSize: 13, fontFamily: theme.fonts.regular, color: "#94A3B8" },

  footerRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  footerText: { color: "#64748B", fontSize: 14, fontFamily: theme.fonts.regular },
  footerLink: { color: "#2563EB", fontSize: 14, fontFamily: theme.fonts.semiBold },
});
