import { useEffect, useRef } from "react";
import { supabase } from "../services/supabase.js";

const DEFAULT_FALLBACK_MS = 60000;
const DEBOUNCE_MS = 700;

/**
 * Subscribes to Supabase Realtime postgres_changes on a table and triggers a
 * debounced refresh on any matching event. Also runs a low-frequency polling
 * fallback for dropped connections / misconfigured publications.
 *
 * @param {Object|null} config - { table, event, filter, channelName }. Pass null to disable.
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

    let debounceTimer = null;
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

    const fallbackId = setInterval(() => {
      Promise.resolve(refreshRef.current?.()).catch(() => {});
    }, fallbackMs);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      clearInterval(fallbackId);
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [table, event, filter, channelName, fallbackMs]);
}
