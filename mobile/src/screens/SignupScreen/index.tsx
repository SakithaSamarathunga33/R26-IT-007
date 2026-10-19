// SignupScreen: lets a parent create an account (name, child's date of birth, email, password).
// Reached from: OnboardingScreen (after the last slide or Skip) or LoginScreen ("Sign Up" link).
// Goes to: "MainTabs" after the account is created, or back to "Login" via the footer link. Defined in AppNavigator.
// Uses: firebase auth (create user) and firestore (saves a "users" document), Toast component, theme fonts, i18n (useT).
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, Modal,
} from "react-native";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Toast from "../../components/Toast";
import { theme } from "../../theme";
import { useT } from "../../i18n";

// Navigation props: lets this screen go back, open Login, or reset to MainTabs.
type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Signup">;
};

// Main signup screen component.
export default function SignupScreen({ navigation }: Props) {
  const { t } = useT();
  // Form values and UI flags (loading spinner, focused field, show/hide password boxes).
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  // Small pop-up message state used for errors and success notes.
  const [toast, setToast] = useState({ visible: false, message: "", type: "error" as "error" | "success" | "warning" });

  // DOB picker state: the saved date, whether the picker is open, and the values being chosen inside it.
  // DOB picker state
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [dobPickerVisible, setDobPickerVisible] = useState(false);
  const [pickerDay, setPickerDay] = useState(1);
  const [pickerMonth, setPickerMonth] = useState(1);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear() - 6);

  // Lists used by the date picker: month names, selectable years (child aged 4 to 19) and days of the chosen month.
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 16 }, (_, i) => currentYear - 4 - i); // 4 to 19 years old
  const daysInMonth = new Date(pickerYear, pickerMonth, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Text shown in the date box, e.g. "5 Mar 2018". Empty until a date is chosen.
  const dobDisplay = dobDay ? `${dobDay} ${t(MONTHS[parseInt(dobMonth) - 1])} ${dobYear}` : "";

  // Save the day/month/year picked in the picker and close it.
  const confirmDob = () => {
    setDobDay(String(pickerDay));
    setDobMonth(String(pickerMonth));
    setDobYear(String(pickerYear));
    setDobPickerVisible(false);
  };

  // Show a toast message on screen (red error by default).
  const showToast = (message: string, type: "error" | "success" | "warning" = "error") =>
    setToast({ visible: true, message, type });

  // Check the form, create the Firebase account, save the profile in Firestore, then open the main tabs.
  const handleSignup = async () => {
    if (!firstName || !lastName || !email || !password || !confirmPassword) { showToast(t("Please fill in all fields.")); return; }
    if (!dobDay || !dobMonth || !dobYear) { showToast(t("Please select the child's date of birth.")); return; }
    if (password !== confirmPassword) { showToast(t("Passwords do not match.")); return; }
    if (password.length < 6) { showToast(t("Password must be at least 6 characters.")); return; }
    setLoading(true);
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      await updateProfile(newUser, { displayName: fullName });
      const dateOfBirth = `${dobYear}-${String(dobMonth).padStart(2, "0")}-${String(dobDay).padStart(2, "0")}`;
      await setDoc(doc(db, "users", newUser.uid), {
        uid: newUser.uid, firstName: firstName.trim(), lastName: lastName.trim(),
        displayName: fullName, email: email.trim(), dateOfBirth, createdAt: serverTimestamp(),
      });
      showToast(t("Account created successfully!"), "success");
      setTimeout(() => navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] }), 1000);
    } catch (error: any) {
      const msg = error.code === "auth/email-already-in-use" ? t("An account with this email already exists.")
        : error.code === "auth/invalid-email" ? t("Please enter a valid email address.")
        : error.message;
      showToast(msg);
    } finally { setLoading(false); }
  };

  // True if the given field is the one currently being typed in (used to highlight it).
  const isFocused = (f: string) => focusedField === f;

  // ---- Screen layout ----
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast((t) => ({ ...t, visible: false }))} />

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={20} color="#1E293B" />
      </TouchableOpacity>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={13} color="#2563EB" />
            <Text style={styles.heroBadgeText}>LexiScan</Text>
          </View>

          <Text style={styles.title}>{t("Create Account")} 🎉</Text>
          <Text style={styles.subtitle}>{t("Sign up to start your child's screening journey")}</Text>

          <View style={styles.form}>
            {/* Name row */}
            <View style={styles.nameRow}>
              <View style={[styles.fieldGroup, styles.nameField]}>
                <Text style={styles.label}>{t("First Name")}</Text>
                <View style={[styles.inputWrapper, isFocused("firstName") && styles.inputFocused]}>
                  <TextInput
                    style={styles.inputInner}
                    placeholder={t("First")}
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="words"
                    value={firstName}
                    onChangeText={setFirstName}
                    onFocus={() => setFocusedField("firstName")}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>
              <View style={[styles.fieldGroup, styles.nameField]}>
                <Text style={styles.label}>{t("Last Name")}</Text>
                <View style={[styles.inputWrapper, isFocused("lastName") && styles.inputFocused]}>
                  <TextInput
                    style={styles.inputInner}
                    placeholder={t("Last")}
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="words"
                    value={lastName}
                    onChangeText={setLastName}
                    onFocus={() => setFocusedField("lastName")}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>
            </View>

            {/* Date of Birth */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t("Child's Date of Birth")}</Text>
              <TouchableOpacity
                style={[styles.inputWrapper, isFocused("dob") && styles.inputFocused]}
                onPress={() => { setDobPickerVisible(true); setFocusedField("dob"); }}
                activeOpacity={0.8}
              >
                <View style={styles.inputIcon}>
                  <Ionicons name="calendar-outline" size={18} color={isFocused("dob") ? "#2563EB" : "#94A3B8"} />
                </View>
                <Text style={[styles.inputInner, { paddingVertical: 14 }, !dobDisplay && { color: "#9CA3AF" }]}>
                  {dobDisplay || t("Select date of birth")}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#94A3B8" style={{ paddingRight: 4 }} />
              </TouchableOpacity>
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t("Email Address")}</Text>
              <View style={[styles.inputWrapper, isFocused("email") && styles.inputFocused]}>
                <View style={styles.inputIcon}>
                  <Ionicons name="mail-outline" size={18} color={isFocused("email") ? "#2563EB" : "#94A3B8"} />
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

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t("Password")}</Text>
              <View style={[styles.inputWrapper, isFocused("password") && styles.inputFocused]}>
                <View style={styles.inputIcon}>
                  <Ionicons name="lock-closed-outline" size={18} color={isFocused("password") ? "#2563EB" : "#94A3B8"} />
                </View>
                <TextInput
                  style={styles.inputInner}
                  placeholder={t("Create a password")}
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

            {/* Confirm Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t("Confirm Password")}</Text>
              <View style={[styles.inputWrapper, isFocused("confirm") && styles.inputFocused]}>
                <View style={styles.inputIcon}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={isFocused("confirm") ? "#2563EB" : "#94A3B8"} />
                </View>
                <TextInput
                  style={styles.inputInner}
                  placeholder={t("Repeat your password")}
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedField("confirm")}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                  <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            <LinearGradient colors={["#3B72F6", "#2563EB"]} style={styles.primaryButton} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <TouchableOpacity style={styles.primaryButtonInner} onPress={handleSignup} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Text style={styles.primaryButtonText}>{t("Create Account")}</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </LinearGradient>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>{t("Already have an account?")} </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.footerLink}>{t("Sign In")}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* DOB Picker Modal */}
      <Modal visible={dobPickerVisible} transparent animationType="fade" onRequestClose={() => setDobPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setDobPickerVisible(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t("Child's Date of Birth")}</Text>

            {/* Row selectors */}
            <View style={styles.pickerRow}>
              {/* Day */}
              <View style={styles.pickerCol}>
                <Text style={styles.pickerColLabel}>{t("Day")}</Text>
                <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                  {days.map((d) => (
                    <TouchableOpacity key={d} onPress={() => setPickerDay(d)}
                      style={[styles.pickerItem, pickerDay === d && styles.pickerItemActive]}>
                      <Text style={[styles.pickerItemText, pickerDay === d && styles.pickerItemTextActive]}>
                        {String(d).padStart(2, "0")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              {/* Month */}
              <View style={styles.pickerCol}>
                <Text style={styles.pickerColLabel}>{t("Month")}</Text>
                <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                  {MONTHS.map((m, i) => (
                    <TouchableOpacity key={m} onPress={() => setPickerMonth(i + 1)}
                      style={[styles.pickerItem, pickerMonth === i + 1 && styles.pickerItemActive]}>
                      <Text style={[styles.pickerItemText, pickerMonth === i + 1 && styles.pickerItemTextActive]}>
                        {t(m)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              {/* Year */}
              <View style={styles.pickerCol}>
                <Text style={styles.pickerColLabel}>{t("Year")}</Text>
                <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                  {years.map((y) => (
                    <TouchableOpacity key={y} onPress={() => setPickerYear(y)}
                      style={[styles.pickerItem, pickerYear === y && styles.pickerItemActive]}>
                      <Text style={[styles.pickerItemText, pickerYear === y && styles.pickerItemTextActive]}>
                        {y}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <TouchableOpacity style={styles.confirmBtn} onPress={confirmDob} activeOpacity={0.85}>
              <LinearGradient colors={["#3B72F6", "#2563EB"]} style={styles.confirmBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.confirmBtnText}>{t("Confirm Date")}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Colours used on this screen:
//   page background  #F5F7FF (soft light blue)
//   main blue        #2563EB / #3B72F6 (buttons, links, focused input border, selected picker item text)
//   dark text        #1E293B (titles), #374151 (labels), #64748B (subtitles, footer)
//   grey             #94A3B8 / #E2E8F0 (icons, input borders, picker labels)
//   white            #fff (back button, input boxes, date picker sheet, button text)
//   dark see-through blue-black behind the date picker pop-up
const styles = StyleSheet.create({
  // Page background and back button
  container: { flex: 1, backgroundColor: "#F5F7FF" },
  flex: { flex: 1 },
  backBtn: {
    position: "absolute", top: 54, left: 20, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
    shadowColor: "#94A3B8", shadowOpacity: 0.12, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 3,
  },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 110, paddingBottom: 48 },

  // Small "LexiScan" badge at the top (light blue pill)
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE",
    alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, marginBottom: 20,
  },
  heroBadgeText: { fontSize: 12, fontFamily: theme.fonts.semiBold, color: "#2563EB" },

  // Title and subtitle text
  title: { fontSize: 34, fontFamily: theme.fonts.extraBold, color: "#1E293B", lineHeight: 44, marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#64748B", fontFamily: theme.fonts.regular, marginBottom: 32, lineHeight: 22 },

  // Form fields: name row, labels, white input boxes, blue border when focused
  form: { gap: 16 },
  nameRow: { flexDirection: "row", gap: 12 },
  nameField: { flex: 1 },
  fieldGroup: { gap: 8 },
  label: { fontSize: 13, fontFamily: theme.fonts.semiBold, color: "#374151" },

  inputWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 16,
    borderWidth: 1.5, borderColor: "#E2E8F0", paddingHorizontal: 14,
    shadowColor: "#94A3B8", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  inputIcon: { marginRight: 10 },
  inputInner: { flex: 1, paddingVertical: 14, fontSize: 15, color: "#1E293B", fontFamily: theme.fonts.regular },
  eyeBtn: { paddingLeft: 8, paddingVertical: 4 },
  inputFocused: { borderColor: "#2563EB", backgroundColor: "#FAFCFF" },

  // Create Account button (blue gradient with blue glow, white text)
  primaryButton: {
    borderRadius: 50, marginTop: 8,
    shadowColor: "#2563EB", shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6,
  },
  primaryButtonInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18 },
  primaryButtonText: { color: "#fff", fontSize: 16, fontFamily: theme.fonts.semiBold },

  // Footer "Already have an account? Sign In" row
  footerRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 28 },
  footerText: { color: "#64748B", fontSize: 14, fontFamily: theme.fonts.regular },
  footerLink: { color: "#2563EB", fontSize: 14, fontFamily: theme.fonts.semiBold },

  // Date of birth picker pop-up (dark overlay, white bottom sheet)
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.45)" },
  modalCard: {
    backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12,
    shadowColor: "#000", shadowOpacity: 0.15, shadowOffset: { width: 0, height: -4 }, shadowRadius: 20, elevation: 20,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E2E8F0", alignSelf: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: theme.fonts.bold, color: "#1E293B", textAlign: "center", marginBottom: 20 },
  // Day / month / year columns inside the picker (selected item has a light blue background)
  pickerRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  pickerCol: { flex: 1, alignItems: "center" },
  pickerColLabel: { fontSize: 11, fontFamily: theme.fonts.semiBold, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  pickerScroll: { maxHeight: 180, width: "100%" },
  pickerItem: { paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12, alignItems: "center", marginVertical: 2 },
  pickerItemActive: { backgroundColor: "#EFF6FF", borderWidth: 1.5, borderColor: "#DBEAFE" },
  pickerItemText: { fontSize: 15, fontFamily: theme.fonts.regular, color: "#64748B" },
  pickerItemTextActive: { fontFamily: theme.fonts.bold, color: "#2563EB" },
  // Confirm Date button
  confirmBtn: { borderRadius: 50, overflow: "hidden" },
  confirmBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  confirmBtnText: { color: "#fff", fontSize: 15, fontFamily: theme.fonts.semiBold },
});
