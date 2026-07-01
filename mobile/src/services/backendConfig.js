import Constants from "expo-constants";
import { Platform } from "react-native";

const BACKEND_PORT = "8000";

function getExpoHost() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.platform?.hostUri ||
    Constants.manifest?.debuggerHost ||
    Constants.manifest2?.extra?.expoClient?.hostUri;

  if (!hostUri) return null;

  return hostUri.replace(/^https?:\/\//, "").split(":")[0];
}

export function getBackendUrl() {
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }

  if (__DEV__) {
    const expoHost = getExpoHost();
    if (expoHost && expoHost !== "localhost" && expoHost !== "127.0.0.1") {
      return `http://${expoHost}:${BACKEND_PORT}`;
    }

    if (Platform.OS === "android") {
      return `http://10.0.2.2:${BACKEND_PORT}`;
    }
  }

  return `http://localhost:${BACKEND_PORT}`;
}

