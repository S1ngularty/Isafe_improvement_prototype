import React, { useEffect, useState, useRef, useCallback } from "react";
import { View, StyleSheet, ActivityIndicator, Platform } from "react-native";
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
import MapsScreen from "./screens/maps/MapsScreen.jsx";
import ProfileScreen from "./screens/profile/ProfileScreen";
import EmergencyHistoryScreen from "./screens/emergency/EmergencyHistoryScreen";
import FamilyScreen from "./screens/family/FamilyScreen";
import MessagesScreen from "./screens/messages/MessagesScreen.jsx";
import ToastNotification from "./components/ToastNotification.jsx";
import SOSButton from "./components/SOSButton.jsx";
import { updateStatus } from "./services/location.js";
import * as Notifications from "expo-notifications";
import { registerForPushNotificationsAsync } from "./services/notification.js";
import { supabase } from "./services/supabase.js";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const COLORS = {
  shieldPrimary: "#991b1b",
  gray300: "#d1d5db",
};

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={AuthScreen} />
    </Stack.Navigator>
  );
}

function HomeStack({ currentStatus }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard">
        {(props) => (
          <DashboardScreen {...props} currentStatus={currentStatus} />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="FirstAidInstructions"
        component={FirstAidInstructions}
        options={{
          animationEnabled: true,
        }}
      />
      <Stack.Screen
        name="EmergencyGuidance"
        component={EmergencyGuidance}
        options={{
          animationEnabled: true,
        }}
      />
      <Stack.Screen
        name="EmergencyChecklist"
        component={EmergencyChecklist}
        options={{
          animationEnabled: true,
        }}
      />
      <Stack.Screen
        name="EmergencyCall"
        component={EmergencyCall}
        options={{
          animationEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
}

function AppTabs() {
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [currentStatus, setCurrentStatus] = useState(profile?.status || "safe");

  // Sync when profile loads from server
  useEffect(() => {
    if (profile?.status) setCurrentStatus(profile.status);
  }, [profile?.status]);

  // Returns a promise so SOSButton can catch failures,
  // but SOSButton no longer awaits it before allowing next tap.
  const handleStatusChange = useCallback(
    async (newStatus) => {
      // Optimistic local update — already done in SOSButton, mirror here for Dashboard card
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
        // Revert the optimistic update on failure
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
            Home:     "home",
            Alert:    "notifications",
            Messages: "mail",
            Family:   "people",
            Maps:     "map",
            Profile:  "person",
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
        {(props) => <HomeStack {...props} currentStatus={currentStatus} />}
      </Tab.Screen>
      <Tab.Screen
        name="Alert"
        component={EmergencyHistoryScreen}
        options={{ title: "Alerts" }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
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
      <Tab.Screen name="Maps" component={MapsScreen} options={{ title: "Maps" }} />
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
      const token = await registerForPushNotificationsAsync();
      console.log("Expo Push Token:", token);

      if (!cancelled && token) {
        setPushToken(token);
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
        const wasWelcomeShown = await AsyncStorage.getItem("welcome_seen");
        setWelcomeShown(wasWelcomeShown === "true");
      } catch (error) {
        console.error("Error checking welcome status:", error);
        setWelcomeShown(false); // Default to showing welcome if there's an error
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
        {!welcomeShown ? (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen
              name="WelcomeFlow"
              options={{
                animationEnabled: true,
              }}>
              {(props) => (
                <WelcomeScreen {...props} onComplete={handleWelcomeComplete} />
              )}
            </Stack.Screen>
          </Stack.Navigator>
        ) : session ? (
          <AppTabs />
        ) : (
          <AuthStack />
        )}
      </NavigationContainer>

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
    <AuthProvider>
      <ToastProvider>
        <RootNavigator />
      </ToastProvider>
    </AuthProvider>
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
