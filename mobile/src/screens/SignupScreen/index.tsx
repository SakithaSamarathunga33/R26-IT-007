import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { auth, db } from "../../config/firebase";
import { RootStackParamList } from "../../navigation/AppNavigator";
import ScreenContainer from "../../components/common/ScreenContainer";
import ClayIconButton from "../../components/common/ClayIconButton";
import ClayInput from "../../components/common/ClayInput";
import PrimaryButton from "../../components/common/PrimaryButton";
import Toast from "../../components/Toast";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";
import { clayRaised } from "../../theme/shadows";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Signup">;
};

export default function SignupScreen({ navigation }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [toast, setToast] = useState({ visible: false, message: "", type: "error" as "error" | "success" | "warning" });

  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [dobPickerVisible, setDobPickerVisible] = useState(false);
  const [pickerDay, setPickerDay] = useState(1);
  const [pickerMonth, setPickerMonth] = useState(1);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear() - 6);

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 16 }, (_, i) => currentYear - 4 - i);
  const daysInMonth = new Date(pickerYear, pickerMonth, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const dobDisplay = dobDay ? `${dobDay} ${MONTHS[parseInt(dobMonth, 10) - 1]} ${dobYear}` : "";

  const showToast = (message: string, type: "error" | "success" | "warning" = "error") =>
    setToast({ visible: true, message, type });

  const handleSignup = async () => {
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      showToast("Please fill in all fields.");
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      setEmailError("Enter a complete email address");
      return;
    }
    setEmailError("");
    if (!dobDay || !dobMonth || !dobYear) {
      showToast("Please select the child's date of birth.");
      return;
    }
    if (password !== confirmPassword) {
      showToast("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      showToast("Password must be at least 6 characters.");
      return;
    }
    if (!consent) {
      showToast("Please confirm consent to continue.");
      return;
    }
    setLoading(true);
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      await updateProfile(newUser, { displayName: fullName });
      const dateOfBirth = `${dobYear}-${String(dobMonth).padStart(2, "0")}-${String(dobDay).padStart(2, "0")}`;
      await setDoc(doc(db, "users", newUser.uid), {
        uid: newUser.uid,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: fullName,
        email: email.trim(),
        dateOfBirth,
        createdAt: serverTimestamp(),
      });
      showToast("Account created successfully!", "success");
      setTimeout(() => navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] }), 1000);
    } catch (error: any) {
      const msg =
        error.code === "auth/email-already-in-use"
          ? "An account with this email already exists."
          : error.code === "auth/invalid-email"
            ? "Please enter a valid email address."
            : error.message;
      showToast(msg);
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
          <Text style={styles.title}>Set up your child</Text>

          <View style={styles.form}>
            <ClayInput label="Child's first name" placeholder="Aarav" autoCapitalize="words" value={firstName} onChangeText={setFirstName} />
            <ClayInput label="Last name" placeholder="Menon" autoCapitalize="words" value={lastName} onChangeText={setLastName} />

            <View>
              <Text style={styles.label}>Date of birth</Text>
              <TouchableOpacity
                style={[styles.dob, clayRaised("sm")]}
                onPress={() => setDobPickerVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Select date of birth"
              >
                <Text style={[styles.dobText, !dobDisplay && styles.placeholder]}>{dobDisplay || "Select date of birth"}</Text>
              </TouchableOpacity>
            </View>

            <ClayInput
              label="Email"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (emailError) setEmailError("");
              }}
              error={emailError}
            />
            <ClayInput
              label="Password"
              placeholder="At least 6 characters"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
              trailingLabel={showPassword ? "Hide" : "Show"}
              onTrailingPress={() => setShowPassword((v) => !v)}
            />
            <ClayInput
              label="Confirm password"
              placeholder="Repeat your password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <TouchableOpacity style={styles.consent} onPress={() => setConsent((v) => !v)} activeOpacity={0.8}>
              <View style={[styles.check, consent && styles.checkOn]}>
                {consent ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
              <Text style={styles.consentText}>
                I consent to LexiScan processing my child's speech and handwriting samples for screening. Results are indicative, not a diagnosis.
              </Text>
            </TouchableOpacity>
          </View>

          <PrimaryButton label="Create account" onPress={handleSignup} loading={loading} style={styles.cta} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={dobPickerVisible} transparent animationType="fade" onRequestClose={() => setDobPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setDobPickerVisible(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Child's date of birth</Text>
            <View style={styles.pickerRow}>
              <PickerCol label="Day" items={days.map((d) => String(d).padStart(2, "0"))} selected={String(pickerDay).padStart(2, "0")} onSelect={(v) => setPickerDay(Number(v))} />
              <PickerCol label="Month" items={MONTHS} selected={MONTHS[pickerMonth - 1]} onSelect={(v) => setPickerMonth(MONTHS.indexOf(v) + 1)} />
              <PickerCol label="Year" items={years.map(String)} selected={String(pickerYear)} onSelect={(v) => setPickerYear(Number(v))} />
            </View>
            <PrimaryButton
              label="Confirm date"
              onPress={() => {
                setDobDay(String(pickerDay));
                setDobMonth(String(pickerMonth));
                setDobYear(String(pickerYear));
                setDobPickerVisible(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function PickerCol({
  label,
  items,
  selected,
  onSelect,
}: {
  label: string;
  items: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.pickerCol}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
        {items.map((item) => (
          <TouchableOpacity key={item} onPress={() => onSelect(item)} style={[styles.pickerItem, selected === item && styles.pickerItemOn]}>
            <Text style={[styles.pickerText, selected === item && styles.pickerTextOn]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingTop: 8, paddingBottom: 28 },
  title: { fontFamily: fonts.extraBold, fontSize: 28, letterSpacing: -0.4, color: colors.text, marginTop: 22 },
  form: { marginTop: 22, gap: 13 },
  label: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.textLabel,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 7,
  },
  dob: {
    backgroundColor: colors.bgSoft,
    borderRadius: 18,
    minHeight: 56,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  dobText: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
  placeholder: { color: colors.textMuted },
  consent: { flexDirection: "row", gap: 12, alignItems: "flex-start", marginTop: 4 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: colors.bgSoft,
    alignItems: "center",
    justifyContent: "center",
    ...clayRaised("sm"),
  },
  checkOn: { backgroundColor: colors.brand },
  checkMark: { color: "#fff", fontFamily: fonts.extraBold, fontSize: 13 },
  consentText: { flex: 1, fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 19, color: colors.textSecondary },
  cta: { marginTop: 20 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(30,42,58,0.4)" },
  modalCard: {
    backgroundColor: colors.bgSoft,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 36,
  },
  modalTitle: { fontFamily: fonts.extraBold, fontSize: 18, color: colors.text, textAlign: "center", marginBottom: 18 },
  pickerRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  pickerCol: { flex: 1 },
  pickerLabel: { fontFamily: fonts.bold, fontSize: 11, color: colors.textMuted, textAlign: "center", marginBottom: 8 },
  pickerScroll: { maxHeight: 180 },
  pickerItem: { paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  pickerItemOn: { backgroundColor: colors.brandTint },
  pickerText: { fontFamily: fonts.medium, fontSize: 15, color: colors.textSecondary },
  pickerTextOn: { fontFamily: fonts.extraBold, color: colors.brand },
});
