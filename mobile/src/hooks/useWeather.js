import { useState, useEffect, useRef } from "react";
import { fetchCurrent, fetchHourly } from "../services/weather.js";

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export function useWeather(lat, lng) {
  const [current, setCurrent] = useState(null);
  const [hourly, setHourly] = useState(null);
  const [daily, setDaily] = useState(null);
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
    const cacheKey = `${Number(lat).toFixed(2)},${Number(lng).toFixed(2)}`;

    // Check cache
    if (cacheRef.current[cacheKey]) {
      const cached = cacheRef.current[cacheKey];
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        setCurrent(cached.current);
        setHourly(cached.hourly);
        setDaily(cached.daily);
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
            hourly: hourlyData.hourly,
            daily: hourlyData.daily,
            timestamp: Date.now(),
          };

          setCurrent(currentData);
          setHourly(hourlyData.hourly);
          setDaily(hourlyData.daily);
        }
      } catch (err) {
        if (isMounted) {
          const errorMsg = err.message || "Failed to fetch weather";
          setError(errorMsg);
          console.warn("[useWeather] Warning:", errorMsg);
          
          // Cache the failure to prevent spam
          cacheRef.current[cacheKey] = {
            current: null,
            hourly: null,
            daily: null,
            timestamp: Date.now() - CACHE_DURATION + 60000, // 1 minute cooldown
          };
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

  return { current, hourly, daily, loading, error };
}
