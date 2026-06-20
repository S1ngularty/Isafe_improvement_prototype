import React, { useState, useEffect } from "react";
import { View, StyleSheet, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { updateProfile } from "../../services/auth.js";

const COLORS = {
  shieldDark: "#5c1010",
  shieldPrimary: "#991b1b",
  alert: "#b91c1c",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray700: "#374151",
  gray900: "#111827",
  white: "#fff",
};

export default function ProfileScreen({ navigation }) {
  const { profile, session, logout, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [barangay, setBarangay] = useState(profile?.barangay || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setBarangay(profile.barangay || "");
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      showToast("Name is required", "error");
      return;
    }
    setLoading(true);
    try {
      await updateProfile({ full_name: fullName, barangay });
      await refreshProfile();
      showToast("Profile updated successfully", "success");
      setIsEditing(false);
    } catch (error) {
      showToast(error.message || "Failed to update profile", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Logout",
        onPress: async () => {
          try {
            await logout();
            showToast("Logged out successfully", "success");
            // Navigation happens automatically when session becomes null
          } catch (error) {
            showToast(error.message || "Logout failed", "error");
          }
        },
        style: "destructive",
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.shieldPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <Pressable onPress={() => setIsEditing(!isEditing)}>
          <MaterialIcons name={isEditing ? "close" : "edit"} size={24} color={COLORS.shieldPrimary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(fullName[0] || session?.user?.email?.[0] || "U").toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{fullName || "User"}</Text>
          <Text style={styles.email}>{session?.user?.email}</Text>
        </View>

        {/* Profile Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                editable={!loading}
                placeholder="Enter your name"
              />
            ) : (
              <Text style={styles.value}>{fullName || "—"}</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Barangay</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={barangay}
                onChangeText={setBarangay}
                editable={!loading}
                placeholder="Enter your barangay"
              />
            ) : (
              <Text style={styles.value}>{barangay || "Not set"}</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{session?.user?.email}</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Account Status</Text>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, profile?.is_active && styles.statusDotActive]} />
              <Text style={styles.statusText}>{profile?.is_active ? "Active" : "Inactive"}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {isEditing && (
          <View style={styles.section}>
            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSaveProfile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.buttonText}>Save Changes</Text>
              )}
            </Pressable>
          </View>
        )}

        {/* Logout Button */}
        <View style={styles.section}>
          <Pressable style={[styles.button, styles.dangerButton]} onPress={handleLogout}>
            <MaterialIcons name="logout" size={20} color={COLORS.alert} />
            <Text style={styles.dangerButtonText}>Logout</Text>
          </Pressable>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.gray900,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.shieldPrimary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.white,
  },
  name: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.gray900,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.gray900,
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  label: {
    fontSize: 12,
    color: COLORS.gray500,
    marginBottom: 4,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  value: {
    fontSize: 16,
    color: COLORS.gray900,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: COLORS.gray50,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  statusDotActive: {
    backgroundColor: "#10b981",
  },
  statusText: {
    fontSize: 14,
    color: COLORS.gray900,
    fontWeight: "500",
  },
  button: {
    flexDirection: "row",
    backgroundColor: COLORS.shieldPrimary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  dangerButton: {
    backgroundColor: COLORS.errorBg,
    justifyContent: "flex-start",
    paddingHorizontal: 16,
  },
  dangerButtonText: {
    color: COLORS.alert,
    fontSize: 16,
    fontWeight: "600",
  },
  errorBg: "#fee2e2",
});
