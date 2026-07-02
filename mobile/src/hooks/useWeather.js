import { useState, useEffect, useRef } from "react";
import { fetchCurrent, fetchHourly } from "../services/weather.js";

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export function useWeather(lat, lng) {
  const [current, setCurrent] = useState(null);
  const [hourly, setHourly] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cacheRef = useRef({});

  useEffect(() => {
    if (!lat || !lng) {
      setCurrent(null);
      setHourly(null);
      return;
    }

    // Create cache key based on coordinates (rounded to 2 decimals)
    const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;

    // Check cache
    if (cacheRef.current[cacheKey]) {
      const cached = cacheRef.current[cacheKey];
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        setCurrent(cached.current);
        setHourly(cached.hourly);
        return;
      }
    }

    let isMounted = true;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const [currentData, hourlyData] = await Promise.all([
          fetchCurrent(lat, lng),
          fetchHourly(lat, lng),
        ]);

        if (isMounted) {
          // Update cache with LRU eviction
          const keys = Object.keys(cacheRef.current);
          if (keys.length >= 5) {
            let oldestKey = keys[0];
            let oldestTime = cacheRef.current[oldestKey].timestamp;
            for (let i = 1; i < keys.length; i++) {
              if (cacheRef.current[keys[i]].timestamp < oldestTime) {
                oldestTime = cacheRef.current[keys[i]].timestamp;
                oldestKey = keys[i];
              }
            }
            delete cacheRef.current[oldestKey];
          }

          cacheRef.current[cacheKey] = {
            current: currentData,
            hourly: hourlyData,
            timestamp: Date.now(),
          };

          setCurrent(currentData);
          setHourly(hourlyData);
        }
      } catch (err) {
        if (isMounted) {
          const errorMsg = err.message || "Failed to fetch weather";
          setError(errorMsg);
          console.error("[useWeather] Error:", errorMsg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [lat, lng]);

  return { current, hourly, loading, error };
}
