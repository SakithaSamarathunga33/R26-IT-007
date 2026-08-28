import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { signOut, updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { auth, db } from "../../config/firebase";
import { getAssessmentHistory } from "../../services/sessionService";
import ScreenContainer from "../../components/common/ScreenContainer";
import ClayCard from "../../components/common/ClayCard";
import ClayInput from "../../components/common/ClayInput";
import PrimaryButton from "../../components/common/PrimaryButton";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/typography";
import { clayRaised } from "../../theme/shadows";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "MainTabs">;
};

export default function ProfileScreen({ navigation }: Props) {
  const user = auth.currentUser;
  const getFirstName = () => user?.displayName?.split(" ")[0] ?? "";
  const getLastName = () => user?.displayName?.split(" ").slice(1).join(" ") ?? "";

  const [editVisible, setEditVisible] = useState(false);
  const [firstName, setFirstName] = useState(getFirstName);
  const [lastName, setLastName] = useState(getLastName);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "LexiScan User");
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [reportCount, setReportCount] = useState<number | null>(null);
  const [readAloud, setReadAloud] = useState(true);
  const [slowPace, setSlowPace] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        if (snap.exists()) setDateOfBirth(snap.data().dateOfBirth ?? null);
      })
      .catch(() => {});
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.uid) return;
      getAssessmentHistory(user.uid)
        .then((records) => setReportCount(records.length))
        .catch(() => setReportCount(0));
    }, [user?.uid])
  );

  const formatDob = (dob: string | null) => {
    if (!dob) return "Not set";
    const [y, m, d] = dob.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
  };

  const handleSave = async () => {
    const trimFirst = firstName.trim();
    const trimLast = lastName.trim();
    if (!trimFirst || !trimLast) {
      Alert.alert("Error", "First name and last name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      const fullName = `${trimFirst} ${trimLast}`;
      await updateProfile(user!, { displayName: fullName });
      await updateDoc(doc(db, "users", user!.uid), {
        firstName: trimFirst,
        lastName: trimLast,
        displayName: fullName,
      });
      setDisplayName(fullName);
      setEditVisible(false);
    } catch (error: any) {
      Alert.alert("Update Failed", error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigation.reset({ index: 0, routes: [{ name: "Welcome" }] });
  };

  return (
    <ScreenContainer padded={false}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profile</Text>

        <ClayCard style={styles.hero} radius={24}>
          <View style={[styles.avatar, clayRaised("sm")]}>
            <Text style={styles.initials}>{displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email}>Parent · {user?.email}</Text>
          </View>
          <TouchableOpacity style={styles.edit} onPress={() => { setFirstName(getFirstName()); setLastName(getLastName()); setEditVisible(true); }}>
            <Text style={styles.editText}>Edit details</Text>
          </TouchableOpacity>
        </ClayCard>

        <ClayCard>
          <Row title="Child profile" value={`${displayName.split(" ")[0]}, ${formatDob(dateOfBirth)}`} />
          <Row title="Voice & sound" value={readAloud ? "Read-aloud on" : "Read-aloud off"} last={!true} />
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Read-aloud</Text>
            <Switch value={readAloud} onValueChange={setReadAloud} trackColor={{ true: colors.brand, false: colors.bgDeep }} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Slow pace</Text>
            <Switch value={slowPace} onValueChange={setSlowPace} trackColor={{ true: colors.brand, false: colors.bgDeep }} />
          </View>
        </ClayCard>

        <ClayCard>
          <Row title="Reports saved" value={reportCount === null ? "…" : String(reportCount)} />
          <Row title="Language" value="English" />
          <Row title="Version" value="v1.1.0" last />
        </ClayCard>

        <TouchableOpacity style={[styles.logout, clayRaised("sm")]} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setEditVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Edit details</Text>
              <ClayInput label="First name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
              <View style={{ height: 12 }} />
              <ClayInput label="Last name" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
              <PrimaryButton label={saving ? "Saving…" : "Save changes"} onPress={handleSave} loading={saving} style={{ marginTop: 18 }} />
              {saving ? <ActivityIndicator color={colors.brand} style={{ marginTop: 8 }} /> : null}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function Row({ title, value, last }: { title: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, last && { marginBottom: 0 }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 28, gap: 14 },
  title: { fontFamily: fonts.extraBold, fontSize: 25, letterSpacing: -0.4, color: colors.text },
  hero: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { fontFamily: fonts.extraBold, fontSize: 18, color: colors.brand },
  name: { fontFamily: fonts.extraBold, fontSize: 17, color: colors.text },
  email: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  edit: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 13, backgroundColor: colors.bgInset },
  editText: { fontFamily: fonts.bold, fontSize: 12, color: colors.brand },
  row: { marginBottom: 14 },
  rowTitle: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.text },
  rowValue: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  toggleLabel: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text },
  logout: { backgroundColor: colors.coralTint, borderRadius: 20, paddingVertical: 16, alignItems: "center" },
  logoutText: { fontFamily: fonts.bold, fontSize: 15, color: colors.coralText },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(30,42,58,0.4)" },
  sheet: {
    backgroundColor: colors.bgSoft,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 36,
  },
  sheetTitle: { fontFamily: fonts.extraBold, fontSize: 18, color: colors.text, marginBottom: 16 },
});
