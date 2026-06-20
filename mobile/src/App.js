import React from "react";
import { View, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useFonts } from "expo-font";
import { MaterialIcons } from "@expo/vector-icons";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { ToastProvider, useToast } from "./context/ToastContext.jsx";
import AuthScreen from "./screens/auth/AuthScreen";
import DashboardScreen from "./screens/dashboard/DashboardScreen";
import MapsScreen from "./screens/maps/MapsScreen.jsx";
import ProfileScreen from "./screens/profile/ProfileScreen";
import EmergencyHistoryScreen from "./screens/emergency/EmergencyHistoryScreen";
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

function AppTabs() {
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [currentStatus, setCurrentStatus] = React.useState(
    profile?.status || "safe",
  );

  // Sync when profile loads from server
  React.useEffect(() => {
    if (profile?.status) setCurrentStatus(profile.status);
  }, [profile?.status]);

  // Returns a promise so SOSButton can catch failures,
  // but SOSButton no longer awaits it before allowing next tap.
  const handleStatusChange = React.useCallback(
    async (newStatus) => {
      // Optimistic local update — already done in SOSButton, mirror here for Dashboard card
      setCurrentStatus(newStatus);
      try {
        await updateStatus(newStatus);
        const emoji =
          newStatus === "safe" ? "✅" : newStatus === "help" ? "⚠️" : "🚨";
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
            Home: "home",
            Alert: "notifications",
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
        {(props) => (
          <DashboardScreen {...props} currentStatus={currentStatus} />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Alert"
        component={EmergencyHistoryScreen}
        options={{ title: "Alerts" }}
      />
      <Tab.Screen
        name="SOS"
        component={DummyScreen}
        options={{ title: "SOS" }}
        listeners={{ tabPress: (e) => e.preventDefault() }}
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
  const [pushToken, setPushToken] = React.useState(null);
  const storedTokenRef = React.useRef(null);
  const platform = Platform.OS;

  React.useEffect(() => {
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

  React.useEffect(() => {
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
          .insert({
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.shieldPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NavigationContainer>
        {session ? <AppTabs /> : <AuthStack />}
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
