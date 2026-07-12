import { useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabase.js";

const MAX_READINGS = 100;
const CHANNEL_NAME = "realtime-water-level";

export default function useRealtimeWaterLevel() {
  const [readings, setReadings] = useState([]);
  const [error, setError] = useState(null);
  const readingsRef = useRef([]);

  useEffect(() => {
    const existing = supabase
      .getChannels()
      .find((ch) => ch.topic === `realtime:${CHANNEL_NAME}`);
    if (existing) {
      supabase.removeChannel(existing).catch(() => {});
    }

    const channel = supabase
      .channel(CHANNEL_NAME)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "water_level_readings" },
        (payload) => {
          const newReading = {
            id: payload.new.id,
            sensor_id: payload.new.sensor_id,
            water_level_cm: payload.new.water_level_cm,
            status: payload.new.status,
            recorded_at: payload.new.recorded_at,
            float_switch_1m: payload.new.float_switch_1m,
            float_switch_2m: payload.new.float_switch_2m,
          };
          readingsRef.current = [newReading, ...readingsRef.current].slice(
            0,
            MAX_READINGS,
          );
          setReadings(readingsRef.current);
        },
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "SUBSCRIBED_ERROR") {
          setError(
            err?.message || "Failed to subscribe to water level updates",
          );
        }
      });

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, []);

  const latestBySensor = readings.reduce((acc, r) => {
    acc[r.sensor_id] = { water_level_cm: r.water_level_cm, status: r.status, recorded_at: r.recorded_at };
    return acc;
  }, {});

  return { readings, latestBySensor, error };
}
