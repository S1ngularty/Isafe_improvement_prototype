import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from "react-native";
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

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [dateOfBirth, setDateOfBirth] = useState(profile?.date_of_birth || "");
  const [gender, setGender] = useState(profile?.gender || "");
  const [residentialAddress, setResidentialAddress] = useState(
    profile?.barangay || ""
  );
  const [emergencyContacts, setEmergencyContacts] = useState(
    profile?.emergency_contacts || ""
  );

  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setDateOfBirth(profile.date_of_birth || "");
      setGender(profile.gender || "");
      setResidentialAddress(profile.barangay || "");
      setEmergencyContacts(profile.emergency_contacts || "");
    }
  }, [profile]);

  const handleEditField = (field, currentValue) => {
    setEditingField(field);
    setTempValue(currentValue || "");
  };

  const handleSaveField = async () => {
    if (!tempValue.trim() && editingField !== "gender") {
      showToast("Field cannot be empty", "error");
      return;
    }

    setLoading(true);
    try {
      const updateData = {};
      switch (editingField) {
        case "fullName":
          updateData.full_name = tempValue;
          setFullName(tempValue);
          break;
        case "dateOfBirth":
          updateData.date_of_birth = tempValue;
          setDateOfBirth(tempValue);
          break;
        case "gender":
          updateData.gender = tempValue;
          setGender(tempValue);
          break;
        case "residentialAddress":
          updateData.barangay = tempValue;
          setResidentialAddress(tempValue);
          break;
        case "emergencyContacts":
          updateData.emergency_contacts = tempValue;
          setEmergencyContacts(tempValue);
          break;
      }

      await updateProfile(updateData);
      await refreshProfile();
      showToast("Profile updated successfully", "success");
      setEditingField(null);
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
          } catch (error) {
            showToast(error.message || "Logout failed", "error");
          }
        },
        style: "destructive",
      },
    ]);
  };

  const renderEditModal = () => {
    let title = "";
    let icon = "";

    switch (editingField) {
      case "fullName":
        title = "Edit Full Name";
        icon = "person";
        break;
      case "dateOfBirth":
        title = "Edit Date of Birth";
        icon = "cake";
        break;
      case "gender":
        title = "Select Gender";
        icon = "wc";
        break;
      case "residentialAddress":
        title = "Edit Residential Address";
        icon = "location-on";
        break;
      case "emergencyContacts":
        title = "Manage Emergency Contacts";
        icon = "phone";
        break;
      default:
        return null;
    }

    if (editingField === "gender") {
      return (
        <Modal visible={!!editingField} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setEditingField(null)}>
                  <MaterialIcons name="close" size={24} color={COLORS.shieldPrimary} />
                </Pressable>
                <Text style={styles.modalTitle}>{title}</Text>
                <View style={{ width: 24 }} />
              </View>

              <View style={styles.genderOptions}>
                {["Male", "Female", "Other", "Prefer not to say"].map((option) => (
                  <Pressable
                    key={option}
                    style={[
                      styles.genderOption,
                      tempValue === option && styles.genderOptionSelected,
                    ]}
                    onPress={() => setTempValue(option)}
                  >
                    <Text
                      style={[
                        styles.genderOptionText,
                        tempValue === option && styles.genderOptionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                style={[styles.modalButton, loading && styles.buttonDisabled]}
                onPress={handleSaveField}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.modalButtonText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </Modal>
      );
    }

    return (
      <Modal visible={!!editingField} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setEditingField(null)}>
                <MaterialIcons name="close" size={24} color={COLORS.shieldPrimary} />
              </Pressable>
              <Text style={styles.modalTitle}>{title}</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <MaterialIcons name={icon} size={24} color={COLORS.shieldPrimary} />
                <TextInput
                  style={styles.modalInput}
                  value={tempValue}
                  onChangeText={setTempValue}
                  placeholder={`Enter ${title.toLowerCase()}`}
                  editable={!loading}
                  multiline={editingField === "emergencyContacts"}
                  numberOfLines={editingField === "emergencyContacts" ? 4 : 1}
                />
              </View>
            </View>

            <Pressable
              style={[styles.modalButton, loading && styles.buttonDisabled]}
              onPress={handleSaveField}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.modalButtonText}>Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.shieldPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Picture Section */}
        <View style={styles.profilePictureSection}>
          <View style={styles.profileAvatar}>
            <MaterialIcons
              name="person"
              size={48}
              color={COLORS.white}
            />
          </View>
          <Text style={styles.profileName}>{fullName || "User"}</Text>
          <Text style={styles.profileEmail}>{session?.user?.email}</Text>
        </View>

        {/* Update Personal Information Section */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>UPDATE PERSONAL INFORMATION</Text>
          <Text style={styles.sectionDescription}>
            Keep your information up to date for better communication and safety
          </Text>

          {/* Full Name Field */}
          <View style={styles.fieldItem}>
            <View style={styles.fieldContent}>
              <MaterialIcons name="person" size={24} color={COLORS.shieldPrimary} />
              <View style={styles.fieldTextContainer}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <Text style={styles.fieldValue}>{fullName || "Add name"}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => handleEditField("fullName", fullName)}
              style={styles.editButton}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          </View>

          {/* Date of Birth Field */}
          <View style={styles.fieldItem}>
            <View style={styles.fieldContent}>
              <MaterialIcons name="cake" size={24} color={COLORS.shieldPrimary} />
              <View style={styles.fieldTextContainer}>
                <Text style={styles.fieldLabel}>Date of Birth</Text>
                <Text style={styles.fieldValue}>{dateOfBirth || "MM/DD/YYYY"}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => handleEditField("dateOfBirth", dateOfBirth)}
              style={styles.editButton}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          </View>

          {/* Gender Field */}
          <View style={styles.fieldItem}>
            <View style={styles.fieldContent}>
              <MaterialIcons name="wc" size={24} color={COLORS.shieldPrimary} />
              <View style={styles.fieldTextContainer}>
                <Text style={styles.fieldLabel}>Gender</Text>
                <Text style={styles.fieldValue}>{gender || "Select gender"}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => handleEditField("gender", gender)}
              style={styles.editButton}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          </View>

          {/* Residential Address Field */}
          <View style={styles.fieldItem}>
            <View style={styles.fieldContent}>
              <MaterialIcons name="location-on" size={24} color={COLORS.shieldPrimary} />
              <View style={styles.fieldTextContainer}>
                <Text style={styles.fieldLabel}>Residential Address</Text>
                <Text style={styles.fieldValue}>{residentialAddress || "Add address"}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => handleEditField("residentialAddress", residentialAddress)}
              style={styles.editButton}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          </View>

          {/* Emergency Contacts Field */}
          <View style={styles.fieldItem}>
            <View style={styles.fieldContent}>
              <MaterialIcons name="phone" size={24} color={COLORS.shieldPrimary} />
              <View style={styles.fieldTextContainer}>
                <Text style={styles.fieldLabel}>Emergency Contacts</Text>
                <Text style={styles.fieldValue}>
                  {emergencyContacts ? `${emergencyContacts.split(",").length} contact(s)` : "Add contacts"}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => handleEditField("emergencyContacts", emergencyContacts)}
              style={styles.manageButton}
            >
              <Text style={styles.manageButtonText}>Manage</Text>
            </Pressable>
          </View>
        </View>

        {/* Security Message */}
        <View style={styles.securityMessage}>
          <MaterialIcons name="security" size={24} color={COLORS.shieldPrimary} />
          <View style={styles.securityTextContainer}>
            <Text style={styles.securityTitle}>Your information is secure.</Text>
            <Text style={styles.securityDescription}>
              We value your privacy and will only use it for safety features
            </Text>
          </View>
        </View>

        {/* Logout Button */}
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color={COLORS.alert} />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>
      </ScrollView>

      {/* Edit Modal */}
      {renderEditModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 40,
  },

  // Profile Picture Section
  profilePictureSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.shieldPrimary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.gray900,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: COLORS.gray500,
  },

  // Info Section
  infoSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.shieldPrimary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  sectionDescription: {
    fontSize: 13,
    color: COLORS.gray500,
    marginBottom: 16,
    lineHeight: 18,
  },

  // Field Item
  fieldItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.gray50,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  fieldContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  fieldTextContainer: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    color: COLORS.gray500,
    fontWeight: "600",
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 14,
    color: COLORS.gray900,
    fontWeight: "500",
  },
  editButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.shieldPrimary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 50,
    alignItems: "center",
  },
  editButtonText: {
    fontSize: 12,
    color: COLORS.shieldPrimary,
    fontWeight: "600",
  },
  manageButton: {
    backgroundColor: COLORS.shieldPrimary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 60,
    alignItems: "center",
  },
  manageButtonText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: "600",
  },

  // Security Message
  securityMessage: {
    flexDirection: "row",
    backgroundColor: COLORS.gray50,
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    gap: 12,
  },
  securityTextContainer: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.shieldPrimary,
    marginBottom: 2,
  },
  securityDescription: {
    fontSize: 12,
    color: COLORS.gray600,
    lineHeight: 16,
  },

  // Logout Button
  logoutButton: {
    flexDirection: "row",
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fecaca",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutButtonText: {
    color: COLORS.alert,
    fontSize: 16,
    fontWeight: "600",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.gray900,
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.gray50,
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 12,
    marginBottom: 16,
  },
  modalInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.gray900,
  },
  modalButton: {
    backgroundColor: COLORS.shieldPrimary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 8,
  },
  modalButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Gender Options
  genderOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  genderOption: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: COLORS.gray200,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  genderOptionSelected: {
    borderColor: COLORS.shieldPrimary,
    backgroundColor: "rgba(153, 27, 27, 0.05)",
  },
  genderOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.gray600,
  },
  genderOptionTextSelected: {
    color: COLORS.shieldPrimary,
  },
});
