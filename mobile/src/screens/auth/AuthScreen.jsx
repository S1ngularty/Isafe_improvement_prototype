import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { signIn, signUp, verifyOtp, resendOtp } from "../../services/auth.js";
import { useToast } from "../../context/ToastContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { BARANGAY_OPTIONS } from "../../utils/barangayOptions";

export default function AuthScreen() {
  const { showToast } = useToast();
  const { refreshSession } = useAuth();
  const [mode, setMode] = useState("login"); // login | register | otp
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [barangay, setBarangay] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showBarangayPicker, setShowBarangayPicker] = useState(false);
  const [selectedBarangay, setSelectedBarangay] = useState(null);
  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!email.trim() || !password.trim()) {
      showToast("Please fill in all fields", "error");
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      showToast("Logged in successfully", "success");
      // Refresh session to update AuthContext and trigger navigation
      await refreshSession();
    } catch (error) {
      showToast(error.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  // In AuthScreen.jsx - Update the error handling

  const handleRegister = async () => {
    Keyboard.dismiss();
    if (!email.trim() || !password.trim() || !fullName.trim()) {
      showToast("Please fill in required fields", "error");
      return;
    }
    if (password !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }
    if (password.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }
    if (!selectedBarangay) {
      showToast("Please select your barangay", "error");
      return;
    }
    setLoading(true);
    try {
      const result = await signUp(email, password, {
        full_name: fullName,
        barangay_id: selectedBarangay.id,
        phone_number: phoneNumber,
        street_address: streetAddress,
        date_of_birth: dateOfBirth || null,
      });

      if (result.success) {
        showToast("📧 Verification code sent! Check your email.", "success");
        setMode("otp");
      }
    } catch (error) {
      // Handle different error types
      const errorMessage = error.message || "Registration failed";

      if (errorMessage.includes("already registered")) {
        showToast("This email is already registered. Please sign in.", "error");
        setMode("login");
      } else if (errorMessage.includes("Verification already sent")) {
        showToast(
          "A verification code was already sent. Check your email or request a new one.",
          "info",
        );
        setMode("otp");
      } else {
        showToast(errorMessage, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    Keyboard.dismiss();
    if (!otp.trim()) {
      showToast("Please enter the verification code", "error");
      return;
    }
    setLoading(true);
    try {
      const result = await verifyOtp(otp, "signup", email);

      if (result.success) {
        showToast("✅ Email verified! Please sign in.", "success");
        setMode("login");
        setOtp("");
        setFullName("");
        setPhoneNumber("");
        setStreetAddress("");
        setDateOfBirth("");
        setSelectedBarangay(null);
        setPassword("");
        setConfirmPassword("");
      }
    } catch (error) {
      const errorMessage = error.message || "Verification failed";

      if (errorMessage.includes("already registered")) {
        showToast("This email is already registered. Please sign in.", "error");
        setMode("login");
      } else if (errorMessage.includes("expired")) {
        showToast("Verification code expired. Request a new one.", "error");
      } else if (errorMessage.includes("Invalid verification code")) {
        showToast("Invalid code. Please check and try again.", "error");
      } else {
        showToast(errorMessage, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    Keyboard.dismiss();
    if (!email.trim()) {
      showToast("Please enter your email first", "error");
      return;
    }
    setLoading(true);
    try {
      await resendOtp(email);
      showToast("🔄 New verification code sent! Check your email.", "success");
    } catch (error) {
      showToast(error.message || "Failed to resend code", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.headerWrap}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>P</Text>
            </View>
            <Text style={styles.title}>
              {mode === "login"
                ? "Welcome Back"
                : mode === "register"
                  ? "Create Account"
                  : "Verify Email"}
            </Text>
            <Text style={styles.subtitle}>
              {mode === "login"
                ? "Sign in to your account"
                : mode === "register"
                  ? "Join us to stay safe"
                  : "Enter the OTP sent to your email"}
            </Text>
          </View>

          <View style={styles.formWrap}>
            {mode === "login" && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.passwordToggle}>
                    <MaterialIcons
                      name={showPassword ? "visibility" : "visibility-off"}
                      size={20}
                      color="#991b1b"
                    />
                  </Pressable>
                </View>
                <Pressable
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Sign In</Text>
                  )}
                </Pressable>

                <View style={styles.switchMode}>
                  <Text style={styles.switchText}>Don't have an account? </Text>
                  <Pressable
                    onPress={() => {
                      setMode("register");
                      setEmail("");
                      setPassword("");
                      setConfirmPassword("");
                    }}>
                    <Text style={styles.switchLink}>Sign Up</Text>
                  </Pressable>
                </View>
              </>
            )}

            {mode === "register" && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  value={fullName}
                  onChangeText={setFullName}
                  editable={!loading}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number (optional)"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Street Address (optional)"
                  value={streetAddress}
                  onChangeText={setStreetAddress}
                  editable={!loading}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Date of Birth (YYYY-MM-DD, optional)"
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  editable={!loading}
                />
                <Pressable
                  style={[styles.input, styles.barangaySelector]}
                  onPress={() => setShowBarangayPicker(true)}
                  disabled={loading}>
                  <Text
                    style={
                      selectedBarangay
                        ? styles.barangaySelectedText
                        : styles.barangayPlaceholder
                    }>
                    {selectedBarangay
                      ? selectedBarangay.name
                      : "Select Barangay (required)"}
                  </Text>
                  <MaterialIcons
                    name="arrow-drop-down"
                    size={24}
                    color={COLORS.gray400}
                  />
                </Pressable>

                <Modal
                  visible={showBarangayPicker}
                  transparent
                  animationType="fade">
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      <View style={styles.modalHeader}>
                        <Pressable onPress={() => setShowBarangayPicker(false)}>
                          <MaterialIcons
                            name="close"
                            size={24}
                            color={COLORS.shieldPrimary}
                          />
                        </Pressable>
                        <Text style={styles.modalTitle}>Select Barangay</Text>
                        <View style={{ width: 24 }} />
                      </View>
                      <ScrollView style={styles.modalBody}>
                        {BARANGAY_OPTIONS.map((b) => (
                          <Pressable
                            key={b.id}
                            style={[
                              styles.barangayOption,
                              selectedBarangay?.id === b.id &&
                                styles.barangayOptionSelected,
                            ]}
                            onPress={() => {
                              setSelectedBarangay({ id: b.id, name: b.label });
                              setShowBarangayPicker(false);
                            }}>
                            <Text
                              style={[
                                styles.barangayOptionText,
                                selectedBarangay?.id === b.id &&
                                  styles.barangayOptionTextSelected,
                              ]}>
                              {b.label}
                            </Text>
                            {selectedBarangay?.id === b.id && (
                              <MaterialIcons
                                name="check"
                                size={20}
                                color={COLORS.shieldPrimary}
                              />
                            )}
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                </Modal>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.passwordToggle}>
                    <MaterialIcons
                      name={showPassword ? "visibility" : "visibility-off"}
                      size={20}
                      color="#991b1b"
                    />
                  </Pressable>
                </View>
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    editable={!loading}
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.passwordToggle}>
                    <MaterialIcons
                      name={
                        showConfirmPassword ? "visibility" : "visibility-off"
                      }
                      size={20}
                      color="#991b1b"
                    />
                  </Pressable>
                </View>
                <Pressable
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleRegister}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Create Account</Text>
                  )}
                </Pressable>

                <View style={styles.switchMode}>
                  <Text style={styles.switchText}>
                    Already have an account?{" "}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setMode("login");
                      setEmail("");
                      setPassword("");
                      setConfirmPassword("");
                      setFullName("");
                      setPhoneNumber("");
                      setStreetAddress("");
                      setBarangay("");
                    }}>
                    <Text style={styles.switchLink}>Sign In</Text>
                  </Pressable>
                </View>
              </>
            )}

            {mode === "otp" && (
              <>
                <Text style={styles.otpInfo}>
                  We sent a verification code to {email}. Enter it below:
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!loading}
                />
                <Pressable
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Verify Code</Text>
                  )}
                </Pressable>

                <Pressable
                  style={[styles.button, styles.secondaryButton]}
                  onPress={handleResendCode}
                  disabled={loading}>
                  <Text style={styles.secondaryButtonText}>Resend Code</Text>
                </Pressable>

                <View style={styles.switchMode}>
                  <Text style={styles.switchText}>Already verified? </Text>
                  <Pressable
                    onPress={() => {
                      setMode("login");
                      setOtp("");
                      setPassword("");
                      setConfirmPassword("");
                    }}>
                    <Text style={styles.switchLink}>Sign In</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  headerWrap: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: COLORS.shieldPrimary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.white,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.shieldDark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray500,
    textAlign: "center",
  },
  formWrap: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: COLORS.white,
    color: COLORS.gray900,
  },
  passwordInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    paddingRight: 8,
    marginTop: 0,
  },
  passwordToggle: {
    padding: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.gray900,
  },
  button: {
    backgroundColor: COLORS.shieldPrimary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: COLORS.gray200,
  },
  secondaryButtonText: {
    color: COLORS.shieldPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  switchMode: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  switchText: {
    color: COLORS.gray500,
    fontSize: 14,
  },
  switchLink: {
    color: COLORS.shieldPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  otpInfo: {
    fontSize: 14,
    color: COLORS.gray500,
    marginBottom: 16,
    lineHeight: 20,
  },
  barangaySelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  barangayPlaceholder: {
    color: COLORS.gray400,
    fontSize: 16,
    flex: 1,
  },
  barangaySelectedText: {
    color: COLORS.gray900,
    fontSize: 16,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    width: "85%",
    maxHeight: "70%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.gray900,
  },
  modalBody: {
    maxHeight: 400,
  },
  barangayOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  barangayOptionSelected: {
    backgroundColor: COLORS.gray100,
  },
  barangayOptionText: {
    fontSize: 16,
    color: COLORS.gray900,
  },
  barangayOptionTextSelected: {
    color: COLORS.shieldPrimary,
    fontWeight: "600",
  },
});
