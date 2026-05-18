import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { signOut, updateProfile } from "firebase/auth";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import { theme } from "../../theme";
import { useFocusEffect } from "@react-navigation/native";
import { getAssessmentHistory } from "../../services/sessionService";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "MainTabs">;
};

export default function ProfileScreen({ navigation }: Props) {
  const user = auth.currentUser;

  const getFirstName = () => user?.displayName?.split(" ")[0] ?? "";
  const getLastName = () => user?.displayName?.split(" ").slice(1).join(" ") ?? "";
  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const [editVisible, setEditVisible] = useState(false);
  const [firstName, setFirstName] = useState(getFirstName);
  const [lastName, setLastName] = useState(getLastName);
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "LexiScan User");
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [reportCount, setReportCount] = useState<number | null>(null);

  const initials = getInitials(displayName);

  useEffect(() => {
    if (user?.uid) {
      getDoc(doc(db, "users", user.uid))
        .then((snap) => {
          if (snap.exists()) setDateOfBirth(snap.data().dateOfBirth ?? null);
        })
        .catch(() => {});
    }
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      if (user?.uid) {
        getAssessmentHistory(user.uid)
          .then((records) => setReportCount(records.length))
          .catch(() => setReportCount(0));
      }
    }, [user?.uid])
  );

  const formatDob = (dob: string | null) => {
    if (!dob) return "Not set";
    const [y, m, d] = dob.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
  };

  const openEdit = () => {
    setFirstName(getFirstName());
    setLastName(getLastName());
    setEditVisible(true);
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
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FF" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.editIconBtn} onPress={openEdit}>
          <Ionicons name="create-outline" size={19} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Avatar card */}
        <LinearGradient colors={["#3B72F6", "#2563EB"]} style={styles.avatarCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.decoCircle1} />
          <View style={styles.decoCircle2} />
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
            <View style={styles.onlineDot} />
          </View>
          <Text style={styles.avatarName}>{displayName}</Text>
          <Text style={styles.avatarEmail}>{user?.email}</Text>
          <TouchableOpacity style={styles.editNameBtn} onPress={openEdit} activeOpacity={0.8}>
            <Ionicons name="create-outline" size={13} color="#fff" />
            <Text style={styles.editNameText}>Edit Name</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsCard}>
          <StatItem value={reportCount === null ? "…" : String(reportCount)} label="Sessions" icon="clipboard-outline" color="#2563EB" bg="#EFF6FF" />
          <View style={styles.statsDivider} />
          <StatItem value={reportCount === null ? "…" : String(reportCount)} label="Reports" icon="bar-chart-outline" color="#7C3AED" bg="#F5F3FF" />
          <View style={styles.statsDivider} />
          <StatItem value="Active" label="Status" icon="checkmark-circle-outline" color="#059669" bg="#ECFDF5" />
        </View>

        {/* Account */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <SettingsRow icon="mail-outline" iconColor="#2563EB" iconBg="#EFF6FF" label="Email Address" value={user?.email ?? "—"} />
          <SettingsRow icon="calendar-outline" iconColor="#7C3AED" iconBg="#F5F3FF" label="Date of Birth" value={formatDob(dateOfBirth)} />
          <SettingsRow icon="shield-checkmark-outline" iconColor="#059669" iconBg="#ECFDF5" label="Account Status" value="Verified" />
          <SettingsRow icon="notifications-outline" iconColor="#D97706" iconBg="#FFFBEB" label="Notifications" value="On" last />
        </View>

        {/* App */}
        <Text style={styles.sectionLabel}>App</Text>
        <View style={styles.card}>
          <SettingsRow icon="language-outline" iconColor="#7C3AED" iconBg="#F5F3FF" label="Language" value="English" />
          <SettingsRow icon="color-palette-outline" iconColor="#0891B2" iconBg="#ECFEFF" label="Theme" value="Light" />
          <SettingsRow icon="information-circle-outline" iconColor="#94A3B8" iconBg="#F1F5F9" label="Version" value="v1.1.0" last />
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <View style={styles.logoutIconWrap}>
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          </View>
          <Text style={styles.logoutText}>Sign Out</Text>
          <Ionicons name="chevron-forward" size={15} color="#EF4444" style={{ marginLeft: "auto" }} />
        </TouchableOpacity>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setEditVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.modalCard}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Name</Text>
                <TouchableOpacity onPress={() => setEditVisible(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>
              <View style={styles.nameRow}>
                <View style={styles.nameField}>
                  <Text style={styles.inputLabel}>First Name</Text>
                  <TextInput
                    style={[styles.input, focusedField === "first" && styles.inputFocused]}
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    placeholder="First"
                    placeholderTextColor="#9CA3AF"
                    onFocus={() => setFocusedField("first")}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
                <View style={styles.nameField}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <TextInput
                    style={[styles.input, focusedField === "last" && styles.inputFocused]}
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    placeholder="Last"
                    placeholderTextColor="#9CA3AF"
                    onFocus={() => setFocusedField("last")}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

function StatItem({ value, label, icon, color, bg }: { value: string; label: string; icon: any; color: string; bg: string }) {
  return (
    <View style={styles.statItem}>
      <View style={[styles.statIconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SettingsRow({ icon, iconColor, iconBg, label, value, last }: { icon: any; iconColor: string; iconBg: string; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.settingsRow, last && styles.settingsRowLast]}>
      <View style={[styles.settingsIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <Text style={styles.settingsLabel}>{label}</Text>
      <Text style={styles.settingsValue}>{value}</Text>
      <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FF" },

  header: {
    paddingTop: 62,
    paddingHorizontal: 22,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 28, fontFamily: theme.fonts.extraBold, color: "#1E293B" },
  editIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#EFF6FF",
    borderWidth: 1, borderColor: "#DBEAFE",
    alignItems: "center", justifyContent: "center",
  },

  scroll: { paddingHorizontal: 20 },

  /* Avatar card */
  avatarCard: {
    borderRadius: 24, alignItems: "center",
    paddingTop: 32, paddingBottom: 24,
    marginBottom: 16, overflow: "hidden",
    shadowColor: "#2563EB", shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 10,
  },
  decoCircle1: {
    position: "absolute", width: 160, height: 160, borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.07)", top: -50, right: -40,
  },
  decoCircle2: {
    position: "absolute", width: 90, height: 90, borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.05)", bottom: -20, left: 10,
  },
  avatarWrapper: { position: "relative", width: 86, height: 86, marginBottom: 14 },
  avatarCircle: {
    width: 86, height: 86, borderRadius: 43,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 3, borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center", justifyContent: "center",
  },
  avatarInitials: { fontSize: 30, fontFamily: theme.fonts.extraBold, color: "#fff" },
  onlineDot: {
    position: "absolute", bottom: 2, right: 2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: "#4ADE80", borderWidth: 2.5, borderColor: "#2563EB",
  },
  avatarName: { fontSize: 20, fontFamily: theme.fonts.bold, color: "#fff", marginBottom: 4 },
  avatarEmail: { fontSize: 13, fontFamily: theme.fonts.regular, color: "rgba(255,255,255,0.75)", marginBottom: 16 },
  editNameBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
  },
  editNameText: { fontSize: 12, fontFamily: theme.fonts.semiBold, color: "#fff" },

  /* Stats */
  statsCard: {
    flexDirection: "row", backgroundColor: "#fff",
    borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 20, paddingVertical: 18, marginBottom: 24,
    shadowColor: "#94A3B8", shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  statItem: { flex: 1, alignItems: "center", gap: 5 },
  statIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  statValue: { fontSize: 15, fontFamily: theme.fonts.extraBold },
  statLabel: { fontSize: 10, fontFamily: theme.fonts.regular, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.4 },
  statsDivider: { width: 1, backgroundColor: "#F1F5F9", marginVertical: 6 },

  /* Section */
  sectionLabel: {
    fontSize: 11, fontFamily: theme.fonts.semiBold, color: "#94A3B8",
    textTransform: "uppercase", letterSpacing: 1.2,
    marginBottom: 10, marginLeft: 2,
  },
  card: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8EDF5",
    borderRadius: 20, marginBottom: 20, overflow: "hidden",
    shadowColor: "#94A3B8", shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 2,
  },
  settingsRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: "#F1F5F9", gap: 12,
  },
  settingsRowLast: { borderBottomWidth: 0 },
  settingsIconWrap: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  settingsLabel: { flex: 1, fontSize: 14, fontFamily: theme.fonts.medium, color: "#1E293B" },
  settingsValue: { fontSize: 13, fontFamily: theme.fonts.regular, color: "#94A3B8", marginRight: 4 },

  /* Logout */
  logoutBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#FFF5F5", borderWidth: 1, borderColor: "#FECACA",
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, marginBottom: 12,
    shadowColor: "#EF4444", shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 2,
  },
  logoutIconWrap: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" },
  logoutText: { fontSize: 14, fontFamily: theme.fonts.semiBold, color: "#EF4444" },

  /* Modal (shared) */
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.45)" },
  modalCard: {
    backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12,
    shadowColor: "#000", shadowOpacity: 0.15, shadowOffset: { width: 0, height: -4 }, shadowRadius: 20, elevation: 20,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E2E8F0", alignSelf: "center", marginBottom: 20 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  modalTitle: { fontSize: 18, fontFamily: theme.fonts.bold, color: "#1E293B" },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  nameField: { flex: 1 },
  inputLabel: { fontSize: 12, fontFamily: theme.fonts.semiBold, color: "#64748B", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    backgroundColor: "#F8FAFC", borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: "#1E293B",
    borderWidth: 1.5, borderColor: "#E2E8F0",
    fontFamily: theme.fonts.regular,
  },
  inputFocused: { borderColor: "#2563EB", backgroundColor: "#EFF6FF" },
  saveBtn: {
    backgroundColor: "#2563EB", paddingVertical: 16, borderRadius: 50,
    alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8,
    shadowColor: "#2563EB", shadowOpacity: 0.3, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 6,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: "#fff", fontSize: 15, fontFamily: theme.fonts.semiBold },
});
