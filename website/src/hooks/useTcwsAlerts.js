import { useState, useEffect, useRef } from "react";
import { supabase } from "../services/supabase.js";
import { fetchActiveAlerts } from "../services/tcws.js";

const POLL_INTERVAL = 15000;

function hashAlerts(alerts) {
  return JSON.stringify(alerts.map((a) => a.id + a.updated_at));
}

export default function useTcwsAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [changed, setChanged] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const prevRef = useRef(null);
  const channelRef = useRef(null);

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

    async function setupRealtime() {
      const channel = supabase
        .channel("tcws-alerts")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "tcws_alerts" },
          () => refresh()
        );

      try {
        await channel.subscribe();
      } catch (err) {
        console.warn("[useTcwsAlerts] Realtime subscription failed — ensure tcws.sql is run in Supabase SQL Editor");
      }

      return channel;
    }

    refresh();

    setupRealtime().then((ch) => { channelRef.current = ch; });

    const pollId = setInterval(refresh, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(pollId);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current).catch(() => {});
        channelRef.current = null;
      }
    };
  }, []);

  function dismiss() {
    setChanged(false);
    setDismissed(true);
  }

  return { alerts, changed, dismissed, dismiss };
}
