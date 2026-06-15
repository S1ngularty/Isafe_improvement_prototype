import { useEffect, useState, useRef } from "react";
import * as Location from "expo-location";

export function useGeolocation({
  watch = true,
  highAccuracy = true,
  maxAge = 0,
  timeout = 20000,
  onLocationChange,
  onError,
} = {}) {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const watchId = useRef(null);

  useEffect(() => {
    if (!watch) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        // Request permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          const permError = "Location permission denied";
          if (isMounted) {
            setError(permError);
            setLoading(false);
          }
          onError?.(permError);
          return;
        }

        // Start watching position
        watchId.current = await Location.watchPositionAsync(
          {
            accuracy: highAccuracy
              ? Location.Accuracy.High
              : Location.Accuracy.Balanced,
            mayShowUserSettingsDialog: true,
            distanceInterval: 0, // Update on any movement
          },
          (loc) => {
            if (isMounted) {
              setLocation(loc);
              setError(null);
              setLoading(false);
              onLocationChange?.(loc);
            }
          }
        );
      } catch (err) {
        const errorMsg = err.message || "Failed to get location";
        if (isMounted) {
          setError(errorMsg);
          setLoading(false);
        }
        onError?.(errorMsg);
      }
    })();

    return () => {
      isMounted = false;
      if (watchId.current) {
        watchId.current.remove();
      }
    };
  }, [watch, highAccuracy, onLocationChange, onError]);

  return { location, error, loading };
}
