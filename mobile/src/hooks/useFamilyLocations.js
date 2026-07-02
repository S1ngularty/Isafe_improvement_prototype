import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase.js";
import { getFamilyMembers, getMyFamily } from "../services/family.js";

export default function useFamilyLocations() {
  const [members, setMembers] = useState([]);
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const fam = await getMyFamily();
      setFamily(fam);
      if (!fam) {
        setMembers([]);
        return;
      }
      setLoading(true);
      const data = await getFamilyMembers();
      setMembers(data);
    } catch {
      // Fail silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!family?.id) return;
    let cancelled = false;

    // Remove any pre-existing channel with the same name to avoid
    // "cannot add postgres_changes callbacks after subscribe()" crash.
    const channelName = `family-${family.id}`;
    const existing = supabase.getChannels().find((ch) => ch.topic === `realtime:${channelName}`);
    if (existing) {
      supabase.removeChannel(existing).catch(() => {});
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `family_id=eq.${family.id}` },
        () => {
          getFamilyMembers().then((data) => { if (!cancelled) setMembers(data); }).catch(() => {});
        }
      );

    channel.subscribe((status, err) => {
      if (err) {
        console.warn("[useFamilyLocations] Realtime not configured:", err);
      }
    });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [family?.id]);

  return { members, family, loading, refresh };
}
