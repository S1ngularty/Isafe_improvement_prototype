import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable, Text, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { signIn, signUp } from "../../services/auth";
import { useToast } from "../../context/ToastContext";

export default function AuthScreen({ onAuthSuccess }) {
  const { showToast } = useToast();
  const [mode, setMode] = useState("login"); // login | register | otp
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [barangay, setBarangay] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showToast("Please fill in all fields", "error");
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      showToast("Logged in successfully", "success");
      onAuthSuccess?.();
    } catch (error) {
      showToast(error.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
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
    setLoading(true);
    try {
      await signUp(email, password, { full_name: fullName, barangay });
      showToast("Account created! Please verify your email.", "success");
      setMode("otp");
    } catch (error) {
      showToast(error.message || "Registration failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerWrap}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>P</Text>
          </View>
          <Text style={styles.title}>
            {mode === "login" ? "Welcome Back" : mode === "register" ? "Create Account" : "Verify Email"}
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
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
              />
              <Pressable
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Sign In</Text>
                )}
              </Pressable>

              <View style={styles.switchMode}>
                <Text style={styles.switchText}>Don't have an account? </Text>
                <Pressable onPress={() => { setMode("register"); setEmail(""); setPassword(""); }}>
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
                placeholder="Barangay (optional)"
                value={barangay}
                onChangeText={setBarangay}
                editable={!loading}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                editable={!loading}
              />
              <Pressable
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </Pressable>

              <View style={styles.switchMode}>
                <Text style={styles.switchText}>Already have an account? </Text>
                <Pressable onPress={() => { setMode("login"); setEmail(""); setPassword(""); setFullName(""); }}>
                  <Text style={styles.switchLink}>Sign In</Text>
                </Pressable>
              </View>
            </>
          )}

          {mode === "otp" && (
            <>
              <Text style={styles.otpInfo}>
                We sent a verification link to {email}. Check your email or enter the code below:
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Enter verification code"
                value={otp}
                onChangeText={setOtp}
                editable={!loading}
              />
              <Pressable style={[styles.button, styles.secondaryButton]}>
                <Text style={styles.secondaryButtonText}>Resend Code</Text>
              </Pressable>
              <Pressable
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={() => {
                  showToast("Email verification link sent. Please check your inbox.", "success");
                  setMode("login");
                }}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Verified, Sign In</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
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
});
