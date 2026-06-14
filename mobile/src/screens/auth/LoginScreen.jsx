import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  rightAction,
}) {
  return (
    <View style={styles.fieldWrap}>
      <View style={styles.inputRow}>
        <Text style={styles.leadingIcon}>{label}</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#a9a0a3"
          secureTextEntry={secureTextEntry}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {rightAction ? (
          <Pressable onPress={rightAction.onPress} hitSlop={10}>
            {rightAction.content}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function Skyline() {
  const buildings = [
    { height: 44, width: 10 },
    { height: 24, width: 8 },
    { height: 62, width: 14 },
    { height: 34, width: 8 },
    { height: 54, width: 12 },
    { height: 80, width: 16 },
    { height: 26, width: 9 },
    { height: 58, width: 13 },
    { height: 40, width: 10 },
    { height: 70, width: 15 },
    { height: 30, width: 8 },
  ];

  return (
    <View style={styles.skylineWrap}>
      <View style={styles.skylineWaveLeft} />
      <View style={styles.skylineWaveRight} />
      <View style={styles.skyline}>
        {buildings.map((building, index) => (
          <View
            key={`${building.height}-${index}`}
            style={[
              styles.building,
              {
                height: building.height,
                width: building.width,
                opacity: 0.4 + index * 0.035,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [hidePassword, setHidePassword] = useState(true);
  const { width } = useWindowDimensions();
  const formMaxWidth = Math.min(360, width - 40);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ExpoStatusBar style="dark" />
      <StatusBar barStyle="dark-content" backgroundColor="#fff7f7" />
      <View style={styles.screen}>
        <View style={styles.topDecoration}>
          <View style={styles.topBlobLarge} />
          <View style={styles.topBlobSmall} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back!</Text>
            <Text style={styles.subtitle}>Log in to continue</Text>
          </View>

          <View style={[styles.form, { maxWidth: formMaxWidth }]}>
            <InputField
              label="👤"
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
            />
            <InputField
              label="🔒"
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry={hidePassword}
              rightAction={{
                onPress: () => setHidePassword((current) => !current),
                content: (
                  <Text style={styles.eyeIcon}>{hidePassword ? "◔" : "◑"}</Text>
                ),
              }}
            />

            <Pressable style={styles.button} onPress={() => {}}>
              <Text style={styles.buttonText}>LOG IN</Text>
            </Pressable>

            <Pressable onPress={() => {}} hitSlop={10}>
              <Text style={styles.forgotPassword}>Forgot Password?</Text>
            </Pressable>
          </View>

          <Skyline />
        </ScrollView>

        <View style={styles.bottomWaveBack} />
        <View style={styles.bottomWaveFront} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff7f7",
  },
  screen: {
    flex: 1,
    backgroundColor: "#fff7f7",
  },
  topDecoration: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  topBlobLarge: {
    position: "absolute",
    top: -82,
    left: -78,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#efd0d4",
  },
  topBlobSmall: {
    position: "absolute",
    top: -52,
    right: -68,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "#f8e4e6",
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 106,
    paddingBottom: 24,
  },
  header: {
    alignItems: "center",
    marginTop: 18,
    marginBottom: 28,
  },
  title: {
    color: "#a1181f",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 6,
    color: "#8c7f82",
    fontSize: 15,
  },
  form: {
    width: "100%",
    alignSelf: "center",
  },
  fieldWrap: {
    marginBottom: 14,
  },
  inputRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5d8d9",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    shadowColor: "#a35a5f",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  leadingIcon: {
    width: 24,
    marginRight: 10,
    color: "#b12229",
    fontSize: 18,
    textAlign: "center",
  },
  input: {
    flex: 1,
    color: "#3f2f31",
    fontSize: 16,
    paddingVertical: 0,
  },
  eyeIcon: {
    marginLeft: 10,
    color: "#8d7b7e",
    fontSize: 18,
  },
  button: {
    height: 50,
    borderRadius: 8,
    backgroundColor: "#a50f18",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#8f0d15",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  forgotPassword: {
    marginTop: 14,
    color: "#b12a30",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  skylineWrap: {
    flex: 1,
    minHeight: 200,
    justifyContent: "flex-end",
    marginTop: 24,
    paddingBottom: 88,
  },
  skylineWaveLeft: {
    position: "absolute",
    left: -40,
    bottom: 86,
    width: 180,
    height: 60,
    borderRadius: 90,
    backgroundColor: "rgba(188, 112, 118, 0.14)",
  },
  skylineWaveRight: {
    position: "absolute",
    right: -58,
    bottom: 74,
    width: 210,
    height: 72,
    borderRadius: 999,
    backgroundColor: "rgba(168, 54, 58, 0.14)",
  },
  skyline: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 90,
  },
  building: {
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: "#d8a9ae",
  },
  bottomWaveBack: {
    position: "absolute",
    left: -30,
    right: -30,
    bottom: 0,
    height: 72,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    backgroundColor: "#bf3941",
    opacity: 0.86,
    transform: [{ scaleX: 1.25 }],
  },
  bottomWaveFront: {
    position: "absolute",
    left: -12,
    right: -12,
    bottom: -12,
    height: 54,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    backgroundColor: "#9f0e16",
    transform: [{ scaleX: 1.12 }],
  },
});
