import { useState, useEffect, useRef } from "react";
import { supabase } from "../services/supabase.js";
import { fetchActiveAlerts } from "../services/tcws.js";

const POLL_INTERVAL = 15000;
const CHANNEL_NAME = "tcws-alerts";

function hashAlerts(alerts) {
  return JSON.stringify(alerts.map((a) => a.id + a.updated_at));
}

export default function useTcwsAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [changed, setChanged] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const prevRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const data = await fetchActiveAlerts();
        if (cancelled) return;

        const currentHash = hashAlerts(data);
        if (prevRef.current !== null && prevRef.current !== currentHash) {
          setChanged(true);
          setDismissed(false);
        }
        prevRef.current = currentHash;
        setAlerts(data);
      } catch {
        // Silently fail
      }
    }

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
        { event: "*", schema: "public", table: "tcws_alerts" },
        () => refresh()
      );

    channel.subscribe((status, err) => {
      if (err) {
        console.warn("[useTcwsAlerts] Realtime subscription failed — ensure tcws.sql is run in Supabase SQL Editor");
      }
    });

    refresh();

    const pollId = setInterval(refresh, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(pollId);
      supabase.removeChannel(channel).catch(() => {});
    };
  }, []);

  function dismiss() {
    setChanged(false);
    setDismissed(true);
  }

  return { alerts, changed, dismissed, dismiss };
}
