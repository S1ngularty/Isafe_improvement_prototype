import { useState, useEffect, useRef } from "react";
import { fetchCurrent, fetchHourly } from "../services/weather.jsx";

export default function useWeather(lat, lng) {
  const [current, setCurrent] = useState(null);
  const [hourly, setHourly] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cacheRef = useRef({ key: "", time: 0, current: null, hourly: [] });

  useEffect(() => {
    if (lat == null || lng == null) {
      setCurrent(null);
      setHourly([]);
      return;
    }

    const coordKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    const now = Date.now();
    if (cacheRef.current.key === coordKey && now - cacheRef.current.time < 600000) {
      setCurrent(cacheRef.current.current);
      setHourly(cacheRef.current.hourly);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([fetchCurrent(lat, lng), fetchHourly(lat, lng)])
      .then(([c, h]) => {
        cacheRef.current = { key: coordKey, time: now, current: c, hourly: h };
        setCurrent(c);
        setHourly(h);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [lat, lng]);

  return { current, hourly, loading, error };
}
