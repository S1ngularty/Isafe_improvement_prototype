// hooks/useOfflineSync.js
import { useEffect, useRef } from "react";
import { useNetwork } from "../context/NetworkContext.jsx";
import offlineMapService from "../services/offlineMap.js";

export function useOfflineSync() {
  const { isOnline, isOffline } = useNetwork();
  const initialized = useRef(false);

  // Initialize offline storage on first mount
  useEffect(() => {
    if (!initialized.current) {
      offlineMapService.initialize().catch((err) => {
        console.log("Offline storage init error:", err.message);
      });
      initialized.current = true;
    }
  }, []);

  // Sync network status with offline service whenever it changes
  useEffect(() => {
    offlineMapService.updateNetworkStatus(isOnline);
  }, [isOnline]);

  return {
    isOnline,
    isOffline,
  };
}
