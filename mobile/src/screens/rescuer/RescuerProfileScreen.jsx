import React, { useState, useEffect } from "react";
import {
  View, StyleSheet, Text, Pressable, ActivityIndicator,
  ScrollView, TextInput, Image, StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import {
  fetchRescuerProfile,
  updateRescuerProfile,
} from "../../services/rescue.js";
import { getDefaultAvatar } from "../../services/profile.js";

const C = {
  red: "#991b1b",
  red700: "#b91c1c",
  white: "#fff",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray700: "#374151",
  gray800: "#1f2937",
  gray900: "#111827",
  green: "#15803d",
  greenBg: "#dcfce7",
  blue: "#2563eb",
};

const RESCUER_TYPES = [
  { value: "general", label: "General" },
  { value: "medical", label: "Medical" },
  { value: "fire", label: "Fire" },
  { value: "search_rescue", label: "Search & Rescue" },
  { value: "logistics", label: "Logistics" },
];

const AVAILABILITY_OPTIONS = [
  { value: "available", label: "Available", icon: "check-circle", color: C.green },
  { value: "on_duty", label: "On Duty", icon: "work", color: C.blue },
  { value: "off_duty", label: "Off Duty", icon: "cancel", color: C.gray500 },
];

export default function RescuerProfileScreen({ navigation }) {
  const { session, role, logout, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    phone_number: "",
    organization: "",
    rescuer_type: "general",
    availability: "off_duty",
    certification: "",
    contact_number: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchRescuerProfile();
        setProfile(data);
        setForm({
          full_name: data?.full_name || "",
          phone_number: data?.phone_number || "",
          organization: data?.organization || "",
          rescuer_type: data?.rescuer_type || "general",
          availability: data?.availability || "off_duty",
          certification: data?.certification || "",
          contact_number: data?.contact_number || "",
        });
      } catch (err) {
        showToast(err.message || "Failed to load profile", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateRescuerProfile(form);
      setProfile(updated);
      setEditing(false);
      refreshProfile().catch(() => {});
      showToast("Profile updated", "success");
    } catch (err) {
      showToast(err.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAvailabilityChange = async (value) => {
    setForm((f) => ({ ...f, availability: value }));
    if (!editing) {
      try {
        await updateRescuerProfile({ availability: value });
        setProfile((p) => ({ ...p, availability: value }));
        showToast(`Availability: ${value.replace("_", " ")}`, "success");
      } catch (err) {
        showToast(err.message || "Failed to update", "error");
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loading}><ActivityIndicator size="large" color={C.red} /></View>
      </SafeAreaView>
    );
  }

  const avail = AVAILABILITY_OPTIONS.find((a) => a.value === form.availability) || AVAILABILITY_OPTIONS[2];

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={C.red} />
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={C.white} />
        </Pressable>
        <Text style={s.headerTitle}>RESCUER PROFILE</Text>
        <Pressable onPress={() => setEditing((v) => !v)}>
          <MaterialIcons name={editing ? "close" : "edit"} size={22} color={C.white} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Avatar & Role */}
        <View style={s.avatarSection}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={s.avatar} />
          ) : (
            <Image source={{ uri: getDefaultAvatar(profile?.full_name) }} style={s.avatar} />
          )}
          <View style={s.roleBadge}>
            <MaterialIcons name="medical-services" size={14} color={C.white} />
            <Text style={s.roleText}>RESCUER</Text>
          </View>
        </View>

        {/* Availability Toggle */}
        <View style={s.availSection}>
          <Text style={s.sectionLabel}>Availability</Text>
          <View style={s.availOptions}>
            {AVAILABILITY_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[s.availBtn, form.availability === opt.value && { backgroundColor: opt.color, borderColor: opt.color }]}
                onPress={() => handleAvailabilityChange(opt.value)}
              >
                <MaterialIcons
                  name={opt.icon}
                  size={18}
                  color={form.availability === opt.value ? C.white : opt.color}
                />
                <Text style={[s.availBtnText, form.availability === opt.value && { color: C.white }]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Profile Fields */}
        <View style={s.fieldsSection}>
          {editing ? (
            <>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Full Name</Text>
                <TextInput
                  style={s.input}
                  value={form.full_name}
                  onChangeText={(v) => setForm((f) => ({ ...f, full_name: v }))}
                  placeholder="Full name"
                />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Phone Number</Text>
                <TextInput
                  style={s.input}
                  value={form.phone_number}
                  onChangeText={(v) => setForm((f) => ({ ...f, phone_number: v }))}
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Contact Number (Rescuer)</Text>
                <TextInput
                  style={s.input}
                  value={form.contact_number}
                  onChangeText={(v) => setForm((f) => ({ ...f, contact_number: v }))}
                  placeholder="Rescuer contact number"
                  keyboardType="phone-pad"
                />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Organization</Text>
                <TextInput
                  style={s.input}
                  value={form.organization}
                  onChangeText={(v) => setForm((f) => ({ ...f, organization: v }))}
                  placeholder="e.g. Red Cross, BFP"
                />
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Rescuer Type</Text>
                <View style={s.typeOptions}>
                  {RESCUER_TYPES.map((t) => (
                    <Pressable
                      key={t.value}
                      style={[s.typeBtn, form.rescuer_type === t.value && s.typeBtnSelected]}
                      onPress={() => setForm((f) => ({ ...f, rescuer_type: t.value }))}
                    >
                      <Text style={[s.typeBtnText, form.rescuer_type === t.value && s.typeBtnTextSelected]}>
                        {t.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Certification</Text>
                <TextInput
                  style={s.input}
                  value={form.certification}
                  onChangeText={(v) => setForm((f) => ({ ...f, certification: v }))}
                  placeholder="e.g. BLS, WFR, EMT"
                />
              </View>
              <Pressable style={s.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={C.white} />
                ) : (
                  <Text style={s.saveBtnText}>SAVE CHANGES</Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Full Name</Text>
                <Text style={s.fieldValue}>{profile?.full_name || "—"}</Text>
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Email</Text>
                <Text style={s.fieldValue}>{profile?.email || "—"}</Text>
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Phone</Text>
                <Text style={s.fieldValue}>{profile?.phone_number || "—"}</Text>
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Contact Number</Text>
                <Text style={s.fieldValue}>{profile?.contact_number || "—"}</Text>
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Organization</Text>
                <Text style={s.fieldValue}>{profile?.organization || "—"}</Text>
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Rescuer Type</Text>
                <Text style={s.fieldValue}>
                  {(profile?.rescuer_type || "general").replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </Text>
              </View>
              <View style={s.field}>
                <Text style={s.fieldLabel}>Certification</Text>
                <Text style={s.fieldValue}>{profile?.certification || "—"}</Text>
              </View>
            </>
          )}
        </View>

        {/* Logout */}
        <Pressable style={s.logoutBtn} onPress={async () => { try { await logout(); } catch (_) {} }}>
          <MaterialIcons name="logout" size={18} color={C.red} />
          <Text style={s.logoutText}>Logout</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: C.red,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: C.white, fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },
  scroll: { paddingBottom: 20 },
  avatarSection: { alignItems: "center", paddingVertical: 24, backgroundColor: C.white, gap: 8 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.gray100 },
  roleBadge: {
    flexDirection: "row", alignItems: "center", backgroundColor: C.red,
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, gap: 4,
  },
  roleText: { color: C.white, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  availSection: { backgroundColor: C.white, marginTop: 8, paddingHorizontal: 16, paddingVertical: 12 },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: C.gray600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.3 },
  availOptions: { flexDirection: "row", gap: 8 },
  availBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: C.gray200, gap: 6,
  },
  availBtnText: { fontSize: 12, fontWeight: "600", color: C.gray700 },
  fieldsSection: { backgroundColor: C.white, marginTop: 8, paddingHorizontal: 16, paddingVertical: 16, gap: 16 },
  field: { gap: 4 },
  fieldLabel: { fontSize: 11, fontWeight: "600", color: C.gray500, textTransform: "uppercase", letterSpacing: 0.3 },
  fieldValue: { fontSize: 15, color: C.gray900, fontWeight: "500" },
  input: {
    backgroundColor: C.gray50, borderWidth: 1, borderColor: C.gray200, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.gray900,
  },
  typeOptions: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  typeBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: C.gray200, backgroundColor: C.gray50,
  },
  typeBtnSelected: { backgroundColor: C.red, borderColor: C.red },
  typeBtnText: { fontSize: 12, fontWeight: "600", color: C.gray700 },
  typeBtnTextSelected: { color: C.white },
  saveBtn: {
    backgroundColor: C.red, paddingVertical: 14, borderRadius: 12,
    alignItems: "center", marginTop: 8,
  },
  saveBtnText: { color: C.white, fontWeight: "700", fontSize: 14, letterSpacing: 0.5 },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    marginTop: 24, gap: 8,
  },
  logoutText: { color: C.red, fontSize: 14, fontWeight: "600" },
});
