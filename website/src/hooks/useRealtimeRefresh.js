import { useEffect, useRef } from "react";
import { supabase } from "../services/supabase.js";

const DEBOUNCE_MS = 700;
const FALLBACK_INTERVAL_MS = 300000; // 5 min — safety net only

export default function useRealtimeRefresh(config, refresh, options = {}) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const { fallbackMs = FALLBACK_INTERVAL_MS } = options;
  const table = config?.table;
  const event = config?.event || "*";
  const filter = config?.filter;
  const channelName = config?.channelName;

  useEffect(() => {
    if (!table || !channelName) return;

    let debounceTimer = null;
    let fallbackTimer = null;

    const runRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        Promise.resolve(refreshRef.current?.()).catch(() => {});
      }, DEBOUNCE_MS);
    };

    const existing = supabase
      .getChannels()
      .find((ch) => ch.topic === `realtime:${channelName}`);
    if (existing) {
      supabase.removeChannel(existing).catch(() => {});
    }

    const changeConfig = { event, schema: "public", table };
    if (filter) changeConfig.filter = filter;

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", changeConfig, runRefresh)
      .subscribe();

    fallbackTimer = setInterval(runRefresh, fallbackMs);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      clearInterval(fallbackTimer);
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [table, event, filter, channelName, fallbackMs]);
}
