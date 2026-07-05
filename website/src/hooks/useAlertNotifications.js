import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../services/supabase.js";

const LS_LAST_VIEWED = "alert_last_viewed_at";

function getLastViewed() {
  try {
    return localStorage.getItem(LS_LAST_VIEWED) || null;
  } catch {
    return null;
  }
}

function setLastViewed(ts) {
  try {
    localStorage.setItem(LS_LAST_VIEWED, ts);
  } catch {
    // localStorage unavailable
  }
}

export default function useAlertNotifications(familyId, currentUserId) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const countRef = useRef(0);

  useEffect(() => {
    if (!familyId || !currentUserId) return;

    const lastViewed = getLastViewed();
    if (lastViewed) {
      try {
        fetch(
          `${
            import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"
          }/api/family-alerts/history?since=${encodeURIComponent(lastViewed)}&user_id=${currentUserId}`
        )
          .then((r) => r.json())
          .then((body) => {
            if (body.data?.items) {
              const count = body.data.items.length;
              countRef.current = count;
              setUnreadCount(count);
            }
          })
          .catch(() => {});
      } catch {
        // fetch failed silently
      }
    }

    const channel = supabase
      .channel(`alert-notifications-${familyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "status_history",
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          const row = payload.new;
          if (!row || row.user_id === currentUserId) return;

          countRef.current += 1;
          setUnreadCount(countRef.current);

          const alertItem = {
            id: row.id,
            userId: row.user_id,
            previousStatus: row.previous_status,
            newStatus: row.new_status,
            createdAt: row.created_at,
          };

          setLiveAlerts((prev) => [alertItem, ...prev].slice(0, 3));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [familyId, currentUserId]);

  const clearUnread = useCallback(() => {
    countRef.current = 0;
    setUnreadCount(0);
    setLastViewed(new Date().toISOString());
  }, []);

  const dismissAlert = useCallback((alertId) => {
    setLiveAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  return {
    unreadCount,
    liveAlerts,
    clearUnread,
    dismissAlert,
  };
}
