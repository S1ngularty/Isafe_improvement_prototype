import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Alert } from "react-native";
import NetInfo from "@react-native-community/netinfo";

const NetworkContext = createContext({
  isOnline: true,
  isConnected: true,
  isOffline: false,
});

export const NetworkProvider = ({ children }) => {
  const [connectionState, setConnectionState] = useState({
    isConnected: true,
    isInternetReachable: true,
  });

  useEffect(() => {
    let isMounted = true;

    const updateConnectionState = (state) => {
      if (!isMounted) return;
      // Alert.alert("Network Changed", `Online: ${state.isInternetReachable}`);
      const connected = state?.isConnected ?? false;
      const reachable = state?.isInternetReachable ?? true;

      setConnectionState({
        isConnected: connected,
        isInternetReachable: reachable,
      });
    };

    NetInfo.fetch()
      .then(updateConnectionState)
      .catch(() => {
        updateConnectionState({
          isConnected: false,
          isInternetReachable: false,
        });
      });

    const unsubscribe = NetInfo.addEventListener(updateConnectionState);

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  const value = useMemo(() => {
    const isConnected = connectionState.isConnected ?? false;
    const isOnline =
      isConnected && (connectionState.isInternetReachable ?? true);

    return {
      isConnected,
      isOnline,
      isOffline: !isConnected || !isOnline,
    };
  }, [connectionState.isConnected, connectionState.isInternetReachable]);

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
