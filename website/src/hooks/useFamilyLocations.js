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
      console.log("[useFamilyLocations] getMyFamily result:", fam);
      setFamily(fam);
      if (!fam) {
        setMembers([]);
        return;
      }
      setLoading(true);
      const data = await getFamilyMembers();
      console.log("[useFamilyLocations] getFamilyMembers result:", data);
      setMembers(data);
    } catch (err) {
      console.error("[useFamilyLocations] refresh error:", err);
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

    async function setupRealtime() {
      const channel = supabase
        .channel(`family-${family.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "profiles", filter: `family_id=eq.${family.id}` },
          () => {
            getFamilyMembers().then((data) => { if (!cancelled) setMembers(data); }).catch(() => {});
          }
        );

      try {
        await channel.subscribe();
      } catch (err) {
        console.warn("[useFamilyLocations] Realtime not configured — enable realtime for profiles table in Supabase dashboard");
      }

      return channel;
    }

    let channelRef = null;
    setupRealtime().then((ch) => { channelRef = ch; });

    return () => {
      cancelled = true;
      if (channelRef) supabase.removeChannel(channelRef).catch(() => {});
    };
  }, [family?.id]);

  return { members, family, loading, refresh };
}
