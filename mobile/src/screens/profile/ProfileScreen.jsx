// screens/ProfileScreen.jsx
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
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { BARANGAY_OPTIONS } from "../../utils/barangayOptions";
import { updateProfile, sendPhoneOtp, verifyPhoneOtp, removePhone } from "../../services/profile.js";
import * as ImagePicker from "expo-image-picker";
import { uploadAvatar, getDefaultAvatar } from "../../services/profile.js";
import {
  ALL_GROUPS,
  encodeSpecialNeeds,
  decodeSpecialNeeds,
  formatSpecialNeeds,
} from "../../utils/medicalOptions";

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

// Simple Skeleton component
const Skeleton = ({ width, height }) => (
  <View
    style={{
      width: width || 120,
      height: height || 16,
      backgroundColor: COLORS.gray200,
      borderRadius: 4,
      opacity: 0.7,
    }}
  />
);

export default function ProfileScreen({ navigation }) {
  const {
    profile,
    session,
    logout,
    refreshProfile,
    loading: authLoading,
  } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [dateOfBirth, setDateOfBirth] = useState(profile?.date_of_birth || "");
  const [gender, setGender] = useState(profile?.gender || "");
  const [residentialAddress, setResidentialAddress] = useState(
    profile?.barangay_id != null ? String(profile.barangay_id) : "",
  );
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || "");
  const [bloodType, setBloodType] = useState(profile?.blood_type || "");
  const [medicalNotes, setMedicalNotes] = useState(
    profile?.medical_notes || "",
  );
  const [householdSize, setHouseholdSize] = useState(
    profile?.household_size?.toString() || "",
  );
  const [selectedNeeds, setSelectedNeeds] = useState([]);
  const [needsOther, setNeedsOther] = useState("");
  const [streetAddress, setStreetAddress] = useState(
    profile?.street_address || "",
  );

  const [needsTempSelected, setNeedsTempSelected] = useState([]);
  const [needsTempOther, setNeedsTempOther] = useState("");
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [phoneOtpCode, setPhoneOtpCode] = useState("");
  const [phoneVerifyStep, setPhoneVerifyStep] = useState("idle"); // idle | otp-sent | verified
  const [phoneVerifying, setPhoneVerifying] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setDateOfBirth(profile.date_of_birth || "");
      setGender(profile.gender || "");
      setResidentialAddress(
        profile.barangay_id != null ? String(profile.barangay_id) : "",
      );
      setPhoneNumber(profile.phone_number || "");
      setBloodType(profile.blood_type || "");
      setMedicalNotes(profile.medical_notes || "");
      setHouseholdSize(profile.household_size?.toString() || "");
      const { selected, other } = decodeSpecialNeeds(
        profile.special_needs || "",
      );
      setSelectedNeeds(selected);
      setNeedsOther(other);
      setStreetAddress(profile.street_address || "");
    }
  }, [profile]);

  const handleEditField = (field, currentValue) => {
    setEditingField(field);

    // For special needs, we don't need tempValue since we use needsTempSelected/needsTempOther
    if (field === "specialNeeds") {
      setTempValue(""); // Set empty since we're not using it
      setNeedsTempSelected([...selectedNeeds]);
      setNeedsTempOther(needsOther);
    } else {
      setTempValue(currentValue || "");
    }
  };

  const handleSaveField = async () => {
    // Skip empty validation for special needs since it's a multi-select
    // Skip for gender since it can be empty
    if (
      editingField !== "gender" &&
      editingField !== "specialNeeds" &&
      !tempValue.trim()
    ) {
      showToast("Field cannot be empty", "error");
      return;
    }

    const previousState = {
      fullName,
      dateOfBirth,
      gender,
      residentialAddress,
      phoneNumber,
      bloodType,
      medicalNotes,
      householdSize,
      selectedNeeds,
      needsOther,
      streetAddress,
    };

    setLoading(true);
    try {
      const updateData = {};

      switch (editingField) {
        case "fullName":
          if (!tempValue.trim()) {
            showToast("Full name cannot be empty", "error");
            setLoading(false);
            return;
          }
          updateData.full_name = tempValue.trim();
          setFullName(tempValue.trim());
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
          if (!tempValue) {
            showToast("Please select a barangay", "error");
            setLoading(false);
            return;
          }
          updateData.barangay_id = Number(tempValue);
          setResidentialAddress(tempValue);
          break;
        case "streetAddress":
          if (!tempValue.trim()) {
            showToast("Street address cannot be empty", "error");
            setLoading(false);
            return;
          }
          updateData.street_address = tempValue.trim();
          setStreetAddress(tempValue.trim());
          break;
        case "phoneNumber":
          updateData.phone_number = tempValue.trim();
          if (tempValue.trim() !== (profile?.phone_number || "")) {
            updateData.phone_verified = false;
          }
          setPhoneNumber(tempValue.trim());
          break;
        case "bloodType":
          updateData.blood_type = tempValue;
          setBloodType(tempValue);
          break;
        case "medicalNotes":
          updateData.medical_notes = tempValue.trim();
          setMedicalNotes(tempValue.trim());
          break;
        case "specialNeeds":
          // Special needs doesn't require tempValue validation
          // It uses needsTempSelected and needsTempOther
          const encoded = encodeSpecialNeeds(needsTempSelected, needsTempOther);
          updateData.special_needs = encoded;
          setSelectedNeeds(needsTempSelected);
          setNeedsOther(needsTempOther);
          break;
        case "householdSize":
          if (!tempValue.trim()) {
            showToast("Household size cannot be empty", "error");
            setLoading(false);
            return;
          }
          const size = parseInt(tempValue, 10);
          if (isNaN(size) || size < 1) {
            showToast(
              "Please enter a valid household size (minimum 1)",
              "error",
            );
            setLoading(false);
            return;
          }
          updateData.household_size = size;
          setHouseholdSize(tempValue);
          break;
        default:
          break;
      }

      // Update profile
      const updatedProfile = await updateProfile(updateData);
      await refreshProfile();
      showToast("Profile updated successfully", "success");
      setEditingField(null);
    } catch (error) {
      // Rollback on error
      setFullName(previousState.fullName);
      setDateOfBirth(previousState.dateOfBirth);
      setGender(previousState.gender);
      setResidentialAddress(previousState.residentialAddress);
      setPhoneNumber(previousState.phoneNumber);
      setBloodType(previousState.bloodType);
      setMedicalNotes(previousState.medicalNotes);
      setHouseholdSize(previousState.householdSize);
      setSelectedNeeds(previousState.selectedNeeds);
      setNeedsOther(previousState.needsOther);
      setStreetAddress(previousState.streetAddress);

      console.error("Update error:", error);
      showToast(error.message || "Failed to update profile", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.phone_verified) {
      setPhoneVerifyStep("verified");
    } else if (profile?.phone_number) {
      setPhoneVerifyStep("idle");
    } else {
      setPhoneVerifyStep("idle");
    }
  }, [profile?.phone_verified, profile?.phone_number]);

  const handleSendPhoneOtp = async () => {
    if (!phoneNumber || !/^\+63\d{10}$/.test(phoneNumber)) {
      showToast("Please enter a valid phone number (+639...)", "error");
      return;
    }
    setPhoneVerifying(true);
    try {
      await sendPhoneOtp(phoneNumber.trim());
      setPhoneVerifyStep("otp-sent");
      setPhoneOtpCode("");
      showToast("Verification code sent to your phone!", "success");
    } catch (err) {
      showToast(err.message || "Failed to send code", "error");
    } finally {
      setPhoneVerifying(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtpCode || phoneOtpCode.length !== 6) {
      showToast("Please enter a valid 6-digit code.", "error");
      return;
    }
    setPhoneVerifying(true);
    try {
      await verifyPhoneOtp(phoneOtpCode);
      setPhoneVerifyStep("verified");
      setPhoneOtpCode("");
      await refreshProfile();
      showToast("Phone number verified!", "success");
    } catch (err) {
      showToast(err.message || "Verification failed", "error");
    } finally {
      setPhoneVerifying(false);
    }
  };

  const handleRemovePhone = async () => {
    setPhoneVerifying(true);
    try {
      await removePhone();
      setPhoneNumber("");
      setPhoneVerifyStep("idle");
      setPhoneOtpCode("");
      await refreshProfile();
      showToast("Phone number removed.", "info");
    } catch (err) {
      showToast(err.message || "Failed to remove phone", "error");
    } finally {
      setPhoneVerifying(false);
    }
  };

  const handleUpdateAvatar = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showToast(
          "Sorry, we need camera roll permissions to make this work!",
          "error",
        );
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setLoading(true);
        await uploadAvatar(result.assets[0].uri);
        await refreshProfile();
        showToast("Avatar updated successfully", "success");
      }
    } catch (error) {
      console.error("Avatar upload error:", error);
      showToast(error.message || "Failed to update avatar", "error");
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
        title = "Edit Barangay";
        icon = "location-city";
        break;
      case "streetAddress":
        title = "Edit Street Address";
        icon = "home";
        break;
      case "phoneNumber":
        title = "Edit Phone Number";
        icon = "phone";
        break;
      case "bloodType":
        title = "Edit Blood Type";
        icon = "bloodtype";
        break;
      case "medicalNotes":
        title = "Edit Medical Notes";
        icon = "medical-services";
        break;
      case "specialNeeds":
        title = "Edit Special Needs";
        icon = "accessible";
        break;
      case "householdSize":
        title = "Edit Household Size";
        icon = "family-restroom";
        break;
      default:
        return null;
    }

    if (editingField === "gender") {
      return (
        <Modal visible={!!editingField} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setEditingField(null)}>
                  <MaterialIcons
                    name="close"
                    size={24}
                    color={COLORS.shieldPrimary}
                  />
                </Pressable>
                <Text style={styles.modalTitle}>{title}</Text>
                <View style={{ width: 24 }} />
              </View>

              <View style={styles.genderOptions}>
                {["Male", "Female", "Other", "Prefer not to say"].map(
                  (option) => (
                    <Pressable
                      key={option}
                      style={[
                        styles.genderOption,
                        tempValue === option && styles.genderOptionSelected,
                      ]}
                      onPress={() => setTempValue(option)}>
                      <Text
                        style={[
                          styles.genderOptionText,
                          tempValue === option &&
                            styles.genderOptionTextSelected,
                        ]}>
                        {option}
                      </Text>
                    </Pressable>
                  ),
                )}
              </View>

              <Pressable
                style={[styles.modalButton, loading && styles.buttonDisabled]}
                onPress={handleSaveField}
                disabled={loading}>
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

    if (editingField === "specialNeeds") {
      return (
        <Modal visible={!!editingField} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: "80%" }]}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setEditingField(null)}>
                  <MaterialIcons
                    name="close"
                    size={24}
                    color={COLORS.shieldPrimary}
                  />
                </Pressable>
                <Text style={styles.modalTitle}>{title}</Text>
                <Pressable onPress={() => setEditingField(null)}>
                  <Text
                    style={{
                      color: COLORS.shieldPrimary,
                      fontWeight: "600",
                      fontSize: 14,
                    }}>
                    Done
                  </Text>
                </Pressable>
              </View>

              <ScrollView style={styles.modalBody}>
                {ALL_GROUPS.map(({ heading, options }) => (
                  <View key={heading} style={{ marginBottom: 12 }}>
                    <Text style={styles.needsGroupHeading}>{heading}</Text>
                    {options.map((opt) => {
                      const checked = needsTempSelected.includes(opt.id);
                      return (
                        <Pressable
                          key={opt.id}
                          style={styles.needsOptionRow}
                          onPress={() => {
                            setNeedsTempSelected((prev) =>
                              checked
                                ? prev.filter((id) => id !== opt.id)
                                : [...prev, opt.id],
                            );
                          }}>
                          <View
                            style={[
                              styles.checkbox,
                              checked && styles.checkboxChecked,
                            ]}>
                            {checked && (
                              <MaterialIcons
                                name="check"
                                size={14}
                                color={COLORS.white}
                              />
                            )}
                          </View>
                          <Text style={styles.needsOptionLabel}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: COLORS.gray200,
                    paddingTop: 12,
                    marginTop: 4,
                  }}>
                  <Text style={styles.needsGroupHeading}>Other</Text>
                  <TextInput
                    style={[styles.modalInput, { marginTop: 6 }]}
                    value={needsTempOther}
                    onChangeText={setNeedsTempOther}
                    placeholder="Please specify any other needs..."
                  />
                </View>
              </ScrollView>

              <Pressable
                style={[styles.modalButton, loading && styles.buttonDisabled]}
                onPress={handleSaveField}
                disabled={loading}>
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

    if (editingField === "residentialAddress") {
      return (
        <Modal visible={!!editingField} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setEditingField(null)}>
                  <MaterialIcons
                    name="close"
                    size={24}
                    color={COLORS.shieldPrimary}
                  />
                </Pressable>
                <Text style={styles.modalTitle}>{title}</Text>
                <View style={{ width: 24 }} />
              </View>

              <ScrollView style={styles.modalBody}>
                {BARANGAY_OPTIONS.map((b) => (
                  <Pressable
                    key={b.id}
                    style={[
                      styles.barangayOptionRow,
                      tempValue === String(b.id) &&
                        styles.barangayOptionSelected,
                    ]}
                    onPress={() => setTempValue(String(b.id))}>
                    <Text
                      style={[
                        styles.barangayOptionText,
                        tempValue === String(b.id) &&
                          styles.barangayOptionTextSelected,
                      ]}>
                      {b.label}
                    </Text>
                    {tempValue === String(b.id) && (
                      <MaterialIcons
                        name="check"
                        size={20}
                        color={COLORS.shieldPrimary}
                      />
                    )}
                  </Pressable>
                ))}
              </ScrollView>

              <Pressable
                style={[styles.modalButton, loading && styles.buttonDisabled]}
                onPress={handleSaveField}
                disabled={loading}>
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

    // For text/input fields
    return (
      <Modal visible={!!editingField} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setEditingField(null)}>
                <MaterialIcons
                  name="close"
                  size={24}
                  color={COLORS.shieldPrimary}
                />
              </Pressable>
              <Text style={styles.modalTitle}>{title}</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <MaterialIcons
                  name={icon}
                  size={24}
                  color={COLORS.shieldPrimary}
                />
                <TextInput
                  style={styles.modalInput}
                  value={tempValue}
                  onChangeText={setTempValue}
                  placeholder={`Enter ${title.toLowerCase()}`}
                  editable={!loading}
                  multiline={
                    editingField === "medicalNotes" ||
                    editingField === "streetAddress"
                  }
                  numberOfLines={
                    editingField === "medicalNotes" ||
                    editingField === "streetAddress"
                      ? 3
                      : 1
                  }
                  keyboardType={
                    editingField === "phoneNumber"
                      ? "phone-pad"
                      : editingField === "householdSize"
                        ? "number-pad"
                        : "default"
                  }
                  autoCapitalize={
                    editingField === "fullName" ? "words" : "sentences"
                  }
                />
              </View>
            </View>

            <Pressable
              style={[styles.modalButton, loading && styles.buttonDisabled]}
              onPress={handleSaveField}
              disabled={loading}>
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

  const renderFieldValue = (value, fallback) => {
    if (authLoading) return <Skeleton width={120} height={16} />;
    if (value && value.trim())
      return <Text style={styles.fieldValue}>{value}</Text>;
    return (
      <Text style={[styles.fieldValue, { color: COLORS.gray400 }]}>
        {fallback}
      </Text>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={COLORS.shieldPrimary}
          />
        </Pressable>
        <Text style={styles.headerTitle}>My Profile</Text>
        <Pressable onPress={() => navigation.navigate("Settings")}>
          <MaterialIcons
            name="settings"
            size={24}
            color={COLORS.shieldPrimary}
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Profile Picture Section */}
        <View style={styles.profilePictureSection}>
          <Pressable
            onPress={handleUpdateAvatar}
            style={styles.profileAvatarContainer}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.profileAvatarImage}
              />
            ) : (
              <Image
                source={{ uri: getDefaultAvatar(fullName) }}
                style={styles.profileAvatarImage}
              />
            )}
            <View style={styles.editAvatarBadge}>
              <MaterialIcons name="edit" size={16} color={COLORS.white} />
            </View>
          </Pressable>
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
              <MaterialIcons
                name="person"
                size={24}
                color={COLORS.shieldPrimary}
              />
              <View style={styles.fieldTextContainer}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                {renderFieldValue(fullName, "Add name")}
              </View>
            </View>
            <Pressable
              onPress={() => handleEditField("fullName", fullName)}
              style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          </View>

          {/* Date of Birth Field */}
          <View style={styles.fieldItem}>
            <View style={styles.fieldContent}>
              <MaterialIcons
                name="cake"
                size={24}
                color={COLORS.shieldPrimary}
              />
              <View style={styles.fieldTextContainer}>
                <Text style={styles.fieldLabel}>Date of Birth</Text>
                {renderFieldValue(dateOfBirth, "MM/DD/YYYY")}
              </View>
            </View>
            <Pressable
              onPress={() => handleEditField("dateOfBirth", dateOfBirth)}
              style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          </View>

          {/* Gender Field */}
          <View style={styles.fieldItem}>
            <View style={styles.fieldContent}>
              <MaterialIcons name="wc" size={24} color={COLORS.shieldPrimary} />
              <View style={styles.fieldTextContainer}>
                <Text style={styles.fieldLabel}>Gender</Text>
                {renderFieldValue(gender, "Select gender")}
              </View>
            </View>
            <Pressable
              onPress={() => handleEditField("gender", gender)}
              style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          </View>

          {/* Barangay Field */}
          <View style={styles.fieldItem}>
            <View style={styles.fieldContent}>
              <MaterialIcons
                name="location-city"
                size={24}
                color={COLORS.shieldPrimary}
              />
              <View style={styles.fieldTextContainer}>
                <Text style={styles.fieldLabel}>Barangay</Text>
                {residentialAddress ? (
                  <Text style={styles.fieldValue}>
                    {BARANGAY_OPTIONS.find(
                      (b) => String(b.id) === residentialAddress,
                    )?.label || residentialAddress}
                  </Text>
                ) : (
                  <Text style={[styles.fieldValue, { color: COLORS.gray400 }]}>
                    Add barangay
                  </Text>
                )}
              </View>
            </View>
            <Pressable
              onPress={() =>
                handleEditField("residentialAddress", residentialAddress)
              }
              style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          </View>

          {/* Street Address Field */}
          <View style={styles.fieldItem}>
            <View style={styles.fieldContent}>
              <MaterialIcons
                name="home"
                size={24}
                color={COLORS.shieldPrimary}
              />
              <View style={styles.fieldTextContainer}>
                <Text style={styles.fieldLabel}>Street Address</Text>
                {renderFieldValue(streetAddress, "Add street address")}
              </View>
            </View>
            <Pressable
              onPress={() => handleEditField("streetAddress", streetAddress)}
              style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          </View>

          {/* Phone Number Field */}
          <View style={styles.fieldItem}>
            <View style={styles.fieldContent}>
              <MaterialIcons
                name="phone"
                size={24}
                color={COLORS.shieldPrimary}
              />
              <View style={styles.fieldTextContainer}>
                <Text style={styles.fieldLabel}>Phone Number</Text>
                {renderFieldValue(phoneNumber, "Add phone number")}
                {phoneVerifyStep === "verified" && phoneNumber ? (
                  <View style={styles.verifiedBadge}>
                    <MaterialIcons name="check-circle" size={14} color="#16a34a" />
                    <Text style={styles.verifiedBadgeText}>Verified</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <Pressable
              onPress={() => handleEditField("phoneNumber", phoneNumber)}
              style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          </View>
          {phoneNumber && phoneVerifyStep !== "verified" && phoneVerifyStep !== "otp-sent" && (
            <Pressable
              onPress={handleSendPhoneOtp}
              disabled={phoneVerifying}
              style={styles.phoneVerifyLink}>
              <MaterialIcons name="sms" size={16} color={COLORS.shieldPrimary} />
              <Text style={styles.phoneVerifyLinkText}>
                {phoneVerifying ? "Sending..." : "Verify Phone via SMS"}
              </Text>
            </Pressable>
          )}
          {phoneVerifyStep === "otp-sent" && (
            <View style={styles.phoneOtpRow}>
              <TextInput
                style={styles.phoneOtpInput}
                maxLength={6}
                keyboardType="number-pad"
                placeholder="000000"
                placeholderTextColor={COLORS.gray400}
                value={phoneOtpCode}
                onChangeText={(t) => setPhoneOtpCode(t.replace(/\D/g, ""))}
              />
              <Pressable
                onPress={handleVerifyPhoneOtp}
                disabled={phoneVerifying}
                style={[styles.phoneOtpButton, phoneVerifying && { opacity: 0.6 }]}>
                {phoneVerifying ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.phoneOtpButtonText}>Confirm</Text>
                )}
              </Pressable>
              <Pressable
                onPress={handleSendPhoneOtp}
                disabled={phoneVerifying}
                style={styles.phoneOtpResend}>
                <Text style={styles.phoneOtpResendText}>Resend</Text>
              </Pressable>
            </View>
          )}
          {phoneVerifyStep === "verified" && phoneNumber && (
            <Pressable
              onPress={handleRemovePhone}
              disabled={phoneVerifying}
              style={styles.phoneRemoveLink}>
              <MaterialIcons name="delete-outline" size={16} color={COLORS.alert} />
              <Text style={styles.phoneRemoveLinkText}>Remove Phone</Text>
            </Pressable>
          )}

          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
            MEDICAL & HOUSEHOLD INFO
          </Text>

          {/* Blood Type Field */}
          <View style={styles.fieldItem}>
            <View style={styles.fieldContent}>
              <MaterialIcons
                name="bloodtype"
                size={24}
                color={COLORS.shieldPrimary}
              />
              <View style={styles.fieldTextContainer}>
                <Text style={styles.fieldLabel}>Blood Type</Text>
                {renderFieldValue(bloodType, "Add blood type")}
              </View>
            </View>
            <Pressable
              onPress={() => handleEditField("bloodType", bloodType)}
              style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          </View>

          {/* Medical Notes Field */}
          <View style={styles.fieldItem}>
            <View style={styles.fieldContent}>
              <MaterialIcons
                name="medical-services"
                size={24}
                color={COLORS.shieldPrimary}
              />
              <View style={styles.fieldTextContainer}>
                <Text style={styles.fieldLabel}>Medical Notes</Text>
                {renderFieldValue(medicalNotes, "Add medical notes")}
              </View>
            </View>
            <Pressable
              onPress={() => handleEditField("medicalNotes", medicalNotes)}
              style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          </View>

          {/* Special Needs Field */}
          <View style={styles.fieldItem}>
            <View style={styles.fieldContent}>
              <MaterialIcons
                name="accessible"
                size={24}
                color={COLORS.shieldPrimary}
              />
              <View style={styles.fieldTextContainer}>
                <Text style={styles.fieldLabel}>Special Needs</Text>
                {selectedNeeds.length > 0 || needsOther ? (
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 4,
                      marginTop: 4,
                    }}>
                    {formatSpecialNeeds(
                      encodeSpecialNeeds(selectedNeeds, needsOther),
                    ).map((label, i) => (
                      <View
                        key={i}
                        style={{
                          backgroundColor: "#fef3c7",
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                        }}>
                        <Text
                          style={{
                            fontSize: 10,
                            color: "#92400e",
                            fontWeight: "600",
                          }}>
                          {label}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.fieldValue, { color: COLORS.gray400 }]}>
                    Add special needs
                  </Text>
                )}
              </View>
            </View>
            <Pressable
              onPress={() => handleEditField("specialNeeds", "")}
              style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          </View>

          {/* Household Size Field */}
          <View style={styles.fieldItem}>
            <View style={styles.fieldContent}>
              <MaterialIcons
                name="family-restroom"
                size={24}
                color={COLORS.shieldPrimary}
              />
              <View style={styles.fieldTextContainer}>
                <Text style={styles.fieldLabel}>Household Size</Text>
                {renderFieldValue(householdSize, "Add household size")}
              </View>
            </View>
            <Pressable
              onPress={() => handleEditField("householdSize", householdSize)}
              style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          </View>
        </View>

        {/* Emergency Contacts */}
        <Pressable
          style={styles.emergencyContactsCard}
          onPress={() => navigation.navigate("EmergencyContacts")}>
          <View style={styles.emergencyContactsLeft}>
            <View style={styles.emergencyContactsIcon}>
              <MaterialIcons
                name="contact-phone"
                size={22}
                color={COLORS.shieldPrimary}
              />
            </View>
            <View>
              <Text style={styles.emergencyContactsTitle}>
                Emergency Contacts
              </Text>
              <Text style={styles.emergencyContactsSubtitle}>
                Manage up to 5 trusted contacts
              </Text>
            </View>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={COLORS.gray400}
          />
        </Pressable>

        {/* Security Message */}
        <View style={styles.securityMessage}>
          <MaterialIcons
            name="security"
            size={24}
            color={COLORS.shieldPrimary}
          />
          <View style={styles.securityTextContainer}>
            <Text style={styles.securityTitle}>
              Your information is secure.
            </Text>
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
  profileAvatarContainer: {
    marginBottom: 12,
    position: "relative",
  },
  profileAvatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.shieldPrimary,
  },
  editAvatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.shieldPrimary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: COLORS.white,
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
  emergencyContactsCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.gray50,
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  emergencyContactsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emergencyContactsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(153, 27, 27, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  emergencyContactsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.gray900,
    marginBottom: 2,
  },
  emergencyContactsSubtitle: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  needsGroupHeading: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.gray500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  needsOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  needsOptionLabel: {
    fontSize: 14,
    color: COLORS.gray700,
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.gray400,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: COLORS.shieldPrimary,
    borderColor: COLORS.shieldPrimary,
  },
  barangayOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  barangayOptionSelected: {
    backgroundColor: COLORS.gray100,
    borderRadius: 8,
  },
  barangayOptionText: {
    fontSize: 16,
    color: COLORS.gray900,
    flex: 1,
  },
  barangayOptionTextSelected: {
    color: COLORS.shieldPrimary,
    fontWeight: "600",
  },

  // Phone Verification
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  verifiedBadgeText: {
    fontSize: 11,
    color: "#16a34a",
    fontWeight: "600",
  },
  phoneVerifyLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: -4,
    marginBottom: 8,
  },
  phoneVerifyLinkText: {
    fontSize: 13,
    color: COLORS.shieldPrimary,
    fontWeight: "600",
  },
  phoneOtpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: -4,
    marginBottom: 8,
  },
  phoneOtpInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 18,
    letterSpacing: 4,
    textAlign: "center",
    color: COLORS.gray900,
    backgroundColor: COLORS.white,
  },
  phoneOtpButton: {
    backgroundColor: COLORS.shieldPrimary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  phoneOtpButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  phoneOtpResend: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  phoneOtpResendText: {
    fontSize: 13,
    color: COLORS.shieldPrimary,
    fontWeight: "600",
  },
  phoneRemoveLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: -4,
    marginBottom: 8,
  },
  phoneRemoveLinkText: {
    fontSize: 13,
    color: COLORS.alert,
    fontWeight: "600",
  },
});
