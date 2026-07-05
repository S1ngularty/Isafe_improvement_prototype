import { useEffect, useRef } from "react";
import { supabase } from "../services/supabase.js";

const DEFAULT_FALLBACK_MS = 60000;
const DEBOUNCE_MS = 700;

/**
 * Mobile equivalent of the web useRealtimeRefresh hook. Subscribes to Supabase
 * Realtime postgres_changes on a table and triggers a debounced refresh on any
 * matching event, with a low-frequency polling fallback.
 *
 * Guards against the React Native "cannot add postgres_changes callbacks after
 * subscribe()" crash by removing any pre-existing channel with the same name.
 *
 * @param {Object|null} config - { table, event, filter, channelName }. Pass null/empty to disable.
 * @param {Function} refresh - callback invoked (debounced) on change and on the fallback interval.
 * @param {Object} [options] - { fallbackMs }
 */
export default function useRealtimeRefresh(config, refresh, options = {}) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const { fallbackMs = DEFAULT_FALLBACK_MS } = options;
  const table = config?.table;
  const event = config?.event || "*";
  const filter = config?.filter;
  const channelName = config?.channelName;

  useEffect(() => {
    if (!table || !channelName) return;

    let cancelled = false;
    let debounceTimer = null;

    const runRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!cancelled) Promise.resolve(refreshRef.current?.()).catch(() => {});
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
      .on("postgres_changes", changeConfig, runRefresh);

    channel.subscribe((status, err) => {
      if (err) {
        console.warn("[useRealtimeRefresh] Realtime not configured:", err);
      }
    });

    const fallbackId = setInterval(() => {
      if (!cancelled) Promise.resolve(refreshRef.current?.()).catch(() => {});
    }, fallbackMs);

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      clearInterval(fallbackId);
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [table, event, filter, channelName, fallbackMs]);
}
