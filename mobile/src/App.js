import React, { useEffect, useState, useRef, useCallback } from "react";
import { View, StyleSheet, ActivityIndicator, Platform, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useFonts } from "expo-font";
import { MaterialIcons } from "@expo/vector-icons";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { ToastProvider, useToast } from "./context/ToastContext.jsx";
import AuthScreen from "./screens/auth/AuthScreen";
import WelcomeScreen from "./screens/welcome/WelcomeScreen.jsx";
import DashboardScreen from "./screens/dashboard/DashboardScreen";
import FirstAidInstructions from "./screens/resources/FirstAidInstructions.jsx";
import EmergencyGuidance from "./screens/resources/EmergencyGuidance.jsx";
import EmergencyChecklist from "./screens/resources/EmergencyChecklist.jsx";
import EmergencyCall from "./screens/resources/EmergencyCall.jsx";
import EvacuationCentersScreen from "./screens/resources/EvacuationCentersScreen.jsx";
import MapsScreen from "./screens/maps/MapsScreen.jsx";
import ProfileScreen from "./screens/profile/ProfileScreen";
import EmergencyHistoryScreen from "./screens/emergency/EmergencyHistoryScreen";
import FamilyScreen from "./screens/family/FamilyScreen";
import MessagesScreen from "./screens/messages/MessagesScreen.jsx";
import ChatScreen from "./screens/messages/ChatScreen.jsx";
import ToastNotification from "./components/ToastNotification.jsx";
import SOSButton from "./components/SOSButton.jsx";
import { updateStatus } from "./services/location.js";
import * as Notifications from "expo-notifications";
import { registerForPushNotificationsAsync } from "./services/notification.js";
import { supabase } from "./services/supabase.js";
import ChecklistDetail from "./screens/resources/ChecklistDetailScreen.jsx";
import FirstAidDetail from "./screens/resources/FirstAidDetail.jsx";
import EvacuationMapScreen from "./screens/resources/EvacuationMap.jsx";
import FloodHazardScreen from "./screens/resources/FloodHazardScreen.jsx";
import RainViewerScreen from "./screens/maps/RainViewerScreen.jsx";
import EmergencyContactsScreen from "./screens/profile/EmergencyContactsScreen.jsx";
import SettingsScreen from "./screens/profile/SettingsScreen.jsx";
import ChatbotWidget from "./components/ChatbotWidget.jsx";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const COLORS = {
  shieldPrimary: "#991b1b",
  gray300: "#d1d5db",
};
const STARTUP_TIMEOUT_MS = 8000;

function withStartupTimeout(promise, label, timeoutMs = STARTUP_TIMEOUT_MS) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    }),
  ]);
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  componentDidCatch(error, errorInfo) { console.error("App Crash:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={{fontSize: 18, fontWeight: 'bold', color: COLORS.shieldPrimary, marginBottom: 10}}>Something went wrong.</Text>
          <Text style={{color: '#6b7280', textAlign: 'center', marginHorizontal: 20}}>Please restart the app. If you need immediate help, call emergency services.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={AuthScreen} />
    </Stack.Navigator>
  );
}

function MessagesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MessagesMain" component={MessagesScreen} />
      <Stack.Screen name="ChatScreen" component={ChatScreen} />
    </Stack.Navigator>
  );
}

function HomeStack({ currentStatus, onStatusChange }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard">
        {(props) => (
          <DashboardScreen {...props} currentStatus={currentStatus} onStatusChange={onStatusChange} />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="FirstAidInstructions"
        component={FirstAidInstructions}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="EmergencyGuidance"
        component={EmergencyGuidance}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="EmergencyChecklist"
        component={EmergencyChecklist}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="ChecklistDetail"
        component={ChecklistDetail}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="FirstAidDetail"
        component={FirstAidDetail}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="EmergencyCall"
        component={EmergencyCall}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="Evacuation"
        component={EvacuationCentersScreen}
      />
      <Stack.Screen name="EvacuationMap" component={EvacuationMapScreen} />
      <Stack.Screen
        name="FloodHazard"
        component={FloodHazardScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="RainViewer"
        component={RainViewerScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="EmergencyContacts"
        component={EmergencyContactsScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ animationEnabled: true }}
      />
    </Stack.Navigator>
  );
}

function AppTabs() {
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [currentStatus, setCurrentStatus] = useState(profile?.status || "safe");

  useEffect(() => {
    if (profile?.status) setCurrentStatus(profile.status);
  }, [profile?.status]);

  const handleStatusChange = useCallback(
    async (newStatus) => {
      setCurrentStatus(newStatus);
      try {
        await updateStatus(newStatus);
        const emoji =
          newStatus === "safe"
            ? "Success"
            : newStatus === "help"
              ? "Alert"
              : "Emergency";
        const message =
          newStatus === "safe"
            ? "Marked as safe"
            : newStatus === "help"
              ? "Help request sent"
              : "Emergency alert sent";
        showToast(`${emoji} ${message}`, "success");
        refreshProfile().catch((e) => console.error("refreshProfile:", e));
      } catch (error) {
        setCurrentStatus(profile?.status || "safe");
        showToast(error.message || "Failed to update status", "error");
        throw error;
      }
    },
    [showToast, refreshProfile, profile?.status],
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        tabBarItemStyle: {
          justifyContent: "center",
          alignItems: "center",
        },
        tabBarIcon: ({ focused }) => {
          if (route.name === "SOS") {
            return (
              <SOSButton
                currentStatus={currentStatus}
                onStatusChange={handleStatusChange}
              />
            );
          }

          const icons = {
            Home: "home",
            Alert: "notifications",
            Messages: "mail",
            Family: "people",
            Maps: "map",
            Profile: "person",
          };

          return (
            <MaterialIcons
              name={icons[route.name] || "home"}
              size={28}
              color={focused ? COLORS.shieldPrimary : COLORS.gray300}
            />
          );
        },
        tabBarActiveTintColor: COLORS.shieldPrimary,
        tabBarInactiveTintColor: COLORS.gray300,
      })}>
      <Tab.Screen name="Home" options={{ title: "Home" }}>
        {(props) => <HomeStack {...props} currentStatus={currentStatus} onStatusChange={handleStatusChange} />}
      </Tab.Screen>
      <Tab.Screen
        name="Alert"
        component={EmergencyHistoryScreen}
        options={{ title: "Alerts" }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesStack}
        options={{ title: "Messages" }}
      />
      <Tab.Screen
        name="SOS"
        component={DummyScreen}
        options={{ title: "SOS" }}
        listeners={{ tabPress: (e) => e.preventDefault() }}
      />
      <Tab.Screen
        name="Family"
        component={FamilyScreen}
        options={{ title: "Family" }}
      />
      <Tab.Screen
        name="Maps"
        component={MapsScreen}
        options={{ title: "Maps" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Profile" }}
      />
    </Tab.Navigator>
  );
}

function DummyScreen() {
  return null;
}

function RootNavigator() {
  const { session, loading } = useAuth();
  const { toasts } = useToast();
  const [pushToken, setPushToken] = useState(null);
  const storedTokenRef = useRef(null);
  const platform = Platform.OS;

  useEffect(() => {
    let notificationListener;
    let responseListener;
    let cancelled = false;

    const initNotifications = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        console.log("Expo Push Token:", token);

        if (!cancelled && token) {
          setPushToken(token);
        }
      } catch (error) {
        console.error("init notifications:", error);
      }
    };

    initNotifications();

    notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Notification received:", notification);
      },
    );

    responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log("Notification tapped:", response);
      },
    );

    return () => {
      cancelled = true;
      notificationListener?.remove();
      responseListener?.remove();
    };
  }, []);

  const [welcomeShown, setWelcomeShown] = useState(null); // null = checking, true = shown, false = not shown

  useEffect(() => {
    const storeToken = async () => {
      const userId = session?.user?.id;

      if (!userId || !pushToken) return;

      const storageKey = `${userId}:${platform}:${pushToken}`;

      if (storedTokenRef.current === storageKey) return;

      try {
        const { error: deleteError } = await supabase
          .from("notification")
          .delete()
          .eq("user_id", userId)
          .eq("platform_type", platform);

        if (deleteError) throw deleteError;

        const { error: insertError } = await supabase
          .from("notification")
          .upsert({
            user_id: userId,
            platform_type: platform,
            push_token: pushToken,
          });

        if (insertError) throw insertError;

        storedTokenRef.current = storageKey;
      } catch (error) {
        console.error("store push token:", error);
      }
    };

    storeToken();
  }, [pushToken, session?.user?.id, platform]);

  // Check if welcome was already shown on this device
  useEffect(() => {
    const checkWelcomeStatus = async () => {
      try {
        const wasWelcomeShown = await withStartupTimeout(
          AsyncStorage.getItem("welcome_seen"),
          "Checking welcome status",
        );
        setWelcomeShown(wasWelcomeShown === "true");
      } catch (error) {
        console.error("Error checking welcome status:", error);
        setWelcomeShown(false);
      }
    };

    checkWelcomeStatus();
  }, []);

  // Handle when user completes welcome screen
  const handleWelcomeComplete = async () => {
    try {
      await AsyncStorage.setItem("welcome_seen", "true");
      setWelcomeShown(true);
    } catch (error) {
      console.error("Error saving welcome status:", error);
    }
  };

  if (loading || welcomeShown === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.shieldPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!welcomeShown ? (
            <Stack.Screen
              name="WelcomeFlow"
              options={{ animationEnabled: true }}>
              {(props) => (
                <WelcomeScreen {...props} onComplete={handleWelcomeComplete} />
              )}
            </Stack.Screen>
          ) : session ? (
            <Stack.Screen name="AppTabs" component={AppTabs} />
          ) : (
            <Stack.Screen name="AuthStack" component={AuthStack} />
          )}
        </Stack.Navigator>
      </NavigationContainer>

      <ChatbotWidget />

      <View style={styles.toastContainer}>
        {toasts.map((toast) => (
          <ToastNotification
            key={toast.id}
            message={toast.message}
            type={toast.type}
            visible={true}
          />
        ))}
      </View>
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ ...MaterialIcons.font });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.shieldPrimary} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <RootNavigator />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  toastContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 16,
    pointerEvents: "none",
  },
});
